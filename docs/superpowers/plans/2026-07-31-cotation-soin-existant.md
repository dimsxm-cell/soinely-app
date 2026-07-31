# Coter un soin prescrit existant — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pouvoir rattacher un code NGAP à un soin prescrit déjà enregistré, depuis la fiche patient, sans avoir à l'arrêter et le recréer.

**Architecture:** Une action serveur écrit `soins_prescrits.ngap_code_id` ; la liste des soins actifs de la fiche patient reçoit un sélecteur par soin, dans un formulaire frère de celui du bouton « Arrêter ». Aucune migration : le schéma du lot A1 suffit.

**Tech Stack:** Next.js 16.2.10 (App Router, React Server Components), React 19.2.4, TypeScript, Tailwind CSS v4, Supabase, Vitest 4.

**Spec :** `docs/superpowers/specs/2026-07-31-cotation-soin-existant-design.md`

## Global Constraints

- Tout le code visible — identifiants, commentaires, libellés — est en **français**.
- Tests colocalisés ; suite `npm test`, fichier seul `npx vitest run <chemin>`.
- Composants serveur : aucun `"use client"`, aucun `useState`, aucun gestionnaire d'événement. Les écritures passent par `<form action={...}>`.
- **Aucune migration** n'est écrite ni appliquée : le schéma existe déjà.
- **Aucun montant en euros** n'est affiché : le sélecteur montre `code — libellé`, jamais le tarif. Le calcul reste au lot A2.
- Une sélection vide écrit `null`, jamais `""` — une chaîne vide violerait la clé étrangère vers `ngap_codes`.
- **Commits** : messages en français, donc porteurs d'apostrophes qui cassent le quoting du shell. Écrire le message dans un fichier avec l'outil Write, puis `git commit -F <ce fichier>`, terminé par `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. N'ajouter que les fichiers de la tâche : jamais `git add -A` ni `git add .`.

---

## File Structure

| Fichier | Responsabilité |
|---|---|
| `lib/data/patients-actions.ts` *(modifié)* | L'action serveur `coterSoinPrescritAction` |
| `lib/data/patients-actions.test.ts` *(modifié)* | Ses quatre tests |
| `app/(app)/patients/[id]/page.tsx` *(modifié)* | Le sélecteur par soin et la mention de prise d'effet |

---

### Task 1 : L'action serveur de cotation

**Files:**
- Modify: `lib/data/patients-actions.ts` (après `arreterSoinPrescritAction`, ligne 157-166)
- Test: `lib/data/patients-actions.test.ts` (après le `describe("arreterSoinPrescritAction")`, ligne 412-430)

**Interfaces:**
- Consumes: `champTexteOuNull(formData, nom)` défini ligne 8 du même fichier ; `createClient` ; `revalidatePath`
- Produces: `coterSoinPrescritAction(formData: FormData): Promise<void>`, attendue par la Task 2. Champs lus dans le `FormData` : `soinId`, `patientId`, `ngapCodeId`.

- [ ] **Step 1 : Écrire les tests qui échouent**

Ajouter à la fin de `lib/data/patients-actions.test.ts`. Les mocks `fromMock`, `updateMock` et `eqUpdateMock` existent déjà en tête de fichier et sont réinitialisés par le `beforeEach` — ne rien redéclarer.

```ts
describe("coterSoinPrescritAction", () => {
  it("enregistre le code choisi sur le bon soin et invalide le cache", async () => {
    eqUpdateMock.mockResolvedValue({ error: null });

    const { coterSoinPrescritAction } = await import("./patients-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("soinId", "s1");
    formData.set("patientId", "p1");
    formData.set("ngapCodeId", "c-ais3");

    await coterSoinPrescritAction(formData);

    expect(fromMock).toHaveBeenCalledWith("soins_prescrits");
    expect(updateMock).toHaveBeenCalledWith({ ngap_code_id: "c-ais3" });
    expect(eqUpdateMock).toHaveBeenCalledWith("id", "s1");
    expect(revalidatePath).toHaveBeenCalledWith("/patients/p1");
  });

  it("décote le soin quand aucune cotation n'est choisie", async () => {
    eqUpdateMock.mockResolvedValue({ error: null });

    const { coterSoinPrescritAction } = await import("./patients-actions");

    const formData = new FormData();
    formData.set("soinId", "s1");
    formData.set("patientId", "p1");
    formData.set("ngapCodeId", "");

    await coterSoinPrescritAction(formData);

    // null et non "" : une chaîne vide violerait la clé étrangère vers ngap_codes.
    expect(updateMock).toHaveBeenCalledWith({ ngap_code_id: null });
  });

  it("n'écrit rien sans identifiant de soin", async () => {
    const { coterSoinPrescritAction } = await import("./patients-actions");

    const formData = new FormData();
    formData.set("patientId", "p1");
    formData.set("ngapCodeId", "c-ais3");

    await coterSoinPrescritAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("n'écrit rien sans identifiant de patient", async () => {
    const { coterSoinPrescritAction } = await import("./patients-actions");

    const formData = new FormData();
    formData.set("soinId", "s1");
    formData.set("ngapCodeId", "c-ais3");

    await coterSoinPrescritAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run lib/data/patients-actions.test.ts -t "coterSoinPrescritAction"`
Expected: FAIL — `coterSoinPrescritAction is not a function` : l'export n'existe pas encore.

- [ ] **Step 3 : Écrire l'action**

Dans `lib/data/patients-actions.ts`, juste après `arreterSoinPrescritAction` :

```ts
export async function coterSoinPrescritAction(formData: FormData): Promise<void> {
  const soinId = champTexteOuNull(formData, "soinId");
  const patientId = champTexteOuNull(formData, "patientId");

  if (!soinId || !patientId) return;

  // Cotation facultative : l'option vide décote le soin. Une chaîne vide
  // violerait la clé étrangère vers ngap_codes.
  const ngapCodeId = champTexteOuNull(formData, "ngapCodeId");

  const supabase = await createClient();

  // La propriété du soin est garantie par la politique RLS
  // soins_prescrits_owner_all : la redoubler ici laisserait croire que la
  // sécurité se joue dans ce fichier.
  await supabase.from("soins_prescrits").update({ ngap_code_id: ngapCodeId }).eq("id", soinId);

  revalidatePath(`/patients/${patientId}`);
}
```

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run lib/data/patients-actions.test.ts`
Expected: PASS — les quatre nouveaux tests et tous les existants.

- [ ] **Step 5 : Commit**

```bash
git add lib/data/patients-actions.ts lib/data/patients-actions.test.ts
git commit -F <fichier de message>
```

Message : une action pour coter un soin déjà enregistré, l'option vide le décotant.

---

### Task 2 : Le sélecteur dans la fiche patient

**Files:**
- Modify: `app/(app)/patients/[id]/page.tsx:4` (import), `:129` (mention), `:133-155` (la liste des soins actifs)

**Interfaces:**
- Consumes: `coterSoinPrescritAction` (Task 1) ; `codesNgap`, déjà chargé ligne 46-49 par `getCodesNgap(supabase)` ; `soin.ngapCodeId`, déjà exposé par `getSoinsPrescrits` depuis le lot A1
- Produces: rien — c'est la feuille de l'arbre

- [ ] **Step 1 : Importer l'action**

Ligne 4, ajouter `coterSoinPrescritAction` à l'import existant :

```tsx
import { createSoinPrescritAction, arreterSoinPrescritAction, coterSoinPrescritAction, updatePatientAction } from "@/lib/data/patients-actions";
```

- [ ] **Step 2 : Annoncer la prise d'effet**

Juste après le titre de section (ligne 129, `<p ...>Soins prescrits</p>`), ajouter :

```tsx
        <p className="mt-1 text-xs text-navy/50">
          Une cotation modifiée s&apos;applique aux tournées générées à partir du
          lendemain.
        </p>
```

Une seule fois pour la section — surtout pas répétée sous chaque soin.

- [ ] **Step 3 : Ajouter le sélecteur à chaque soin actif**

Dans le `soinsActifs.map`, la `<li>` passe en `flex-wrap` pour que le groupe de
formulaires descende à la ligne sur mobile au lieu de comprimer le libellé :

```tsx
              <li
                key={soin.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-navy/10 p-3"
              >
```

Le bloc `<div>` du libellé et de la récurrence reste inchangé. Le formulaire
« Arrêter » qui le suit est enveloppé, avec le nouveau formulaire de cotation,
dans un conteneur commun. Deux formulaires **frères** : HTML interdit d'imbriquer
un `<form>` dans un `<form>`.

Remplacer le formulaire « Arrêter » seul par :

```tsx
                <div className="flex flex-wrap items-center gap-2">
                  <form action={coterSoinPrescritAction} className="flex items-center gap-2">
                    <input type="hidden" name="soinId" value={soin.id} />
                    <input type="hidden" name="patientId" value={patient.id} />
                    <label className="sr-only" htmlFor={`cotation-${soin.id}`}>
                      Cotation NGAP de « {soin.typeSoin} »
                    </label>
                    <select
                      id={`cotation-${soin.id}`}
                      name="ngapCodeId"
                      defaultValue={soin.ngapCodeId ?? ""}
                      className="rounded-card border border-navy/20 p-2 text-sm"
                    >
                      <option value="">Aucune</option>
                      {codesNgap.map((code) => (
                        <option key={code.id} value={code.id}>
                          {code.code} — {code.libelle}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" variant="tertiary">
                      Enregistrer
                    </Button>
                  </form>
                  <form action={arreterSoinPrescritAction}>
                    <input type="hidden" name="soinId" value={soin.id} />
                    <input type="hidden" name="patientId" value={patient.id} />
                    <Button type="submit" variant="secondary">
                      Arrêter
                    </Button>
                  </form>
                </div>
```

Le `<label className="sr-only">` n'est pas décoratif : sans lui, le sélecteur
n'a aucun nom accessible, et un lecteur d'écran annoncerait autant de listes
identiques qu'il y a de soins. Le libellé du soin les distingue.

`defaultValue={soin.ngapCodeId ?? ""}` fait afficher au sélecteur le code
courant du soin, et non un champ vide qui laisserait croire qu'il n'est pas coté.

**La liste des soins arrêtés, plus bas dans la même section, ne reçoit rien** :
coter un soin qu'on ne pratique plus n'a pas de sens, et la génération de
tournée ignore les soins inactifs. Ne modifier que le `soinsActifs.map`.

- [ ] **Step 4 : Vérifier l'ensemble**

Run: `npm test`
Expected: toute la suite au vert.

Run: `npm run lint`
Expected: aucune erreur, aucun avertissement nouveau. Un avertissement préexistant sans rapport subsiste dans `lib/data/abonnement.test.ts` — ne pas y toucher.

Run: `npx tsc --noEmit`
Expected: aucune erreur.

Run: `npm run build`
Expected: build réussi.

- [ ] **Step 5 : Commit**

```bash
git add "app/(app)/patients/[id]/page.tsx"
git commit -F <fichier de message>
```

Message : le sélecteur de cotation dans la liste des soins, et la mention de prise d'effet.

---

## Vérification finale

- [ ] `npm test` — suite complète au vert
- [ ] `npm run lint` — propre
- [ ] `npm run build` — compile
- [ ] `git diff main --stat` — seuls les trois fichiers de la table File Structure apparaissent
- [ ] Relecture par la fondatrice : coter un soin depuis une fiche patient, recharger la fiche et constater que le sélecteur a retenu le code choisi

## Note d'exécution

Les deux tâches sont séquentielles : la Task 2 importe l'action écrite par la Task 1.
