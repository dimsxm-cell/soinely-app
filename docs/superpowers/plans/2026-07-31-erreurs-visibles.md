# Rendre les erreurs de lecture visibles — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Qu'une lecture de données en échec cesse de ressembler à une absence de données — dans le journal serveur pour toutes, et à l'écran pour celles qui portent la tournée, les missions et les patients.

**Architecture:** Un module `lib/journal.ts` sans dépendance expose `journaliserEchec` et `echouer`. Les lectures critiques appellent `echouer`, qui journalise puis lève ; une frontière d'erreur `app/(app)/error.tsx` les recueille. Les lectures secondaires appellent `journaliserEchec` et gardent leur repli.

**Tech Stack:** Next.js 16.2.10 (App Router), React 19.2.4, TypeScript, Supabase, Vitest 4.

**Spec :** `docs/superpowers/specs/2026-07-31-erreurs-visibles-design.md`

## Global Constraints

- Tout le code visible — identifiants, commentaires, libellés — est en **français**.
- Tests colocalisés ; suite `npm test` (actuellement **301/301**), fichier seul `npx vitest run <chemin>`.
- Composants serveur partout, **sauf** `app/(app)/error.tsx` : Next impose `"use client"` sur toute frontière d'erreur. C'est la seule dérogation.
- **« Absent » n'est pas « en panne ».** Une donnée légitimement absente (pas de tournée aujourd'hui, patient introuvable) continue de rendre `null` ou `[]`. Seule une erreur Supabase lève. Remplacer un mensonge par un autre serait un échec de ce chantier.
- Aucune migration, aucun changement de schéma, aucun appel à une base réelle.
- **Commits** : messages en français, donc porteurs d'apostrophes qui cassent le quoting du shell. Écrire le message dans un fichier avec l'outil Write puis `git commit -F <ce fichier>`, terminé par `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. N'ajouter que les fichiers de la tâche : jamais `git add -A` ni `git add .`.

---

## File Structure

| Fichier | Responsabilité |
|---|---|
| `lib/journal.ts` *(créé)* | `journaliserEchec` et `echouer` |
| `lib/journal.test.ts` *(créé)* | Leurs tests |
| `lib/data/ma-journee.ts` *(modifié)* | Quatre lectures critiques + deux secondaires |
| `lib/data/generation-tournee.ts` *(modifié)* | Génération : lève au lieu de renoncer en silence |
| `lib/data/patients.ts` *(modifié)* | Trois lectures critiques |
| `app/(app)/error.tsx` *(créé)* | La frontière d'erreur |
| `lib/data/recherche.ts`, `dossierSoins.ts`, `dossier-patient.ts`, `ngap.ts`, `profil.ts`, `abonnement.ts`, `patients-actions.ts` *(modifiés)* | Journalisation seule, repli inchangé |

---

### Task 1 : Le module de journal

**Files:**
- Create: `lib/journal.ts`
- Test: `lib/journal.test.ts`

**Interfaces:**
- Consumes: rien
- Produces:
  - `journaliserEchec(contexte: string, erreur: unknown): void`
  - `echouer(contexte: string, erreur: unknown): never`

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `lib/journal.test.ts` :

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("journaliserEchec", () => {
  it("écrit sur la console d'erreur en portant le contexte et la cause", async () => {
    const espion = vi.spyOn(console, "error").mockImplementation(() => {});

    const { journaliserEchec } = await import("./journal");
    journaliserEchec("getMissionsDuJour", { message: "boom" });

    expect(espion).toHaveBeenCalledTimes(1);
    const [prefixe, contexte, cause] = espion.mock.calls[0];
    expect(prefixe).toContain("soinely");
    expect(contexte).toBe("getMissionsDuJour");
    expect(cause).toEqual({ message: "boom" });
  });
});

describe("echouer", () => {
  it("lève une erreur nommant la lecture concernée", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { echouer } = await import("./journal");

    expect(() => echouer("getPatients", { message: "boom" })).toThrow(/getPatients/);
  });

  it("conserve l'erreur d'origine en cause", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { echouer } = await import("./journal");
    const origine = { code: "PGRST200", message: "relation introuvable" };

    try {
      echouer("getMissionsTourneeVue", origine);
      expect.unreachable("echouer doit lever");
    } catch (erreur) {
      expect((erreur as Error).cause).toBe(origine);
    }
  });

  it("journalise avant de lever", async () => {
    const espion = vi.spyOn(console, "error").mockImplementation(() => {});

    const { echouer } = await import("./journal");

    expect(() => echouer("getPatient", { message: "boom" })).toThrow();
    expect(espion).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run lib/journal.test.ts`
Expected: FAIL — `Failed to resolve import "./journal"`.

- [ ] **Step 3 : Créer `lib/journal.ts`**

```ts
// Journal des échecs de lecture. Sans ce module, une erreur Supabase avalée
// par un `return []` est indiscernable d'une absence de données : c'est ce qui
// a coûté une session de diagnostic le 31 juillet 2026.
const PREFIXE = "[soinely]";

export function journaliserEchec(contexte: string, erreur: unknown): void {
  console.error(PREFIXE, contexte, erreur);
}

// Pour les lectures dont un vide serait trompeur à l'écran : journalise puis
// lève, afin que la frontière d'erreur de l'espace connecté prenne le relais.
// Le type de retour `never` indique au compilateur que rien ne suit.
export function echouer(contexte: string, erreur: unknown): never {
  journaliserEchec(contexte, erreur);
  throw new Error(`Lecture impossible : ${contexte}`, { cause: erreur });
}
```

Note : `new Error(message, { cause })` demande une cible ES2022. Si `npx tsc --noEmit` s'en plaint, ne pas contourner en retirant la cause — la remonter comme préoccupation dans le rapport, car elle porte le code d'erreur Supabase.

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run lib/journal.test.ts`
Expected: PASS — 4 tests. Puis `npm test` : 305/305, aucune régression.

- [ ] **Step 5 : Commit**

```bash
git add lib/journal.ts lib/journal.test.ts
git commit -F <fichier de message>
```

---

### Task 2 : Les lectures critiques de la tournée

**Files:**
- Modify: `lib/data/ma-journee.ts` — `lireTourneeDuJour` (~ligne 26), `getMissionsDuJour` (~63), `getMissionDetail` (~206), `getMissionsTourneeVue` (~333), `getMissionEnCoursHref`, `getPhotoUrl`
- Test: `lib/data/ma-journee.test.ts`

**Interfaces:**
- Consumes: `echouer`, `journaliserEchec` depuis `@/lib/journal` (Task 1)
- Produces: rien de nouveau — les signatures ne changent pas

- [ ] **Step 1 : Écrire les tests qui échouent**

a) Réécrire le test existant `lib/data/ma-journee.test.ts:199` (« retourne un tableau vide en cas d'erreur ») :

```ts
  it("lève en cas d'erreur de lecture", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: null, error: { message: "boom" } }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getMissionsDuJour } = await import("./ma-journee");

    await expect(getMissionsDuJour(fakeClient, "t1")).rejects.toThrow(/getMissionsDuJour/);
  });
```

b) Ajouter les paires « lève sur erreur / rend l'absence » pour les trois autres.
`getTourneeDuJour` passe par `lireTourneeDuJour` ; le cas d'absence légitime est
déjà couvert par le test « génère la tournée du jour si elle n'existe pas
encore » — ne pas y toucher.

```ts
describe("getTourneeDuJour — échecs", () => {
  it("lève quand la lecture de la tournée échoue", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: null, error: { message: "boom" } }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getTourneeDuJour } = await import("./ma-journee");

    await expect(getTourneeDuJour(fakeClient, "u1")).rejects.toThrow(/lireTourneeDuJour/);
  });
});

describe("getMissionDetail — échecs", () => {
  function fakeClientDetail(resultat: { data: unknown; error: unknown }) {
    return {
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: () => Promise.resolve(resultat) }),
        }),
      }),
    } as unknown as SupabaseClient;
  }

  it("lève quand la lecture échoue", async () => {
    const { getMissionDetail } = await import("./ma-journee");

    await expect(
      getMissionDetail(fakeClientDetail({ data: null, error: { message: "boom" } }), "m1")
    ).rejects.toThrow(/getMissionDetail/);
  });

  it("rend null quand la mission est simplement introuvable", async () => {
    const { getMissionDetail } = await import("./ma-journee");

    expect(await getMissionDetail(fakeClientDetail({ data: null, error: null }), "m1")).toBeNull();
  });
});

describe("getMissionsTourneeVue — échecs", () => {
  it("lève quand la lecture échoue", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: null, error: { message: "boom" } }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getMissionsTourneeVue } = await import("./ma-journee");

    await expect(getMissionsTourneeVue(fakeClient, "t1")).rejects.toThrow(
      /getMissionsTourneeVue/
    );
  });
});
```

Les tests de `getPhotoUrl` (« retourne null si Supabase Storage renvoie une
erreur ») restent **inchangés** : c'est une lecture secondaire.

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run lib/data/ma-journee.test.ts`
Expected: FAIL — les fonctions rendent encore `[]` ou `null` au lieu de lever.

- [ ] **Step 3 : Implémenter**

Ajouter l'import en tête de `lib/data/ma-journee.ts` :

```ts
import { echouer, journaliserEchec } from "@/lib/journal";
```

Puis, pour les **quatre lectures critiques**, séparer l'erreur de l'absence.

`lireTourneeDuJour` :

```ts
  // L'absence de tournée est un fait métier — une journée sans patient. Seule
  // une erreur de lecture est une panne.
  if (error) echouer("lireTourneeDuJour", error);
  if (!data) return null;
```

`getMissionsDuJour` :

```ts
  if (error) echouer("getMissionsDuJour", error);
  if (!data) return [];
```

`getMissionDetail` :

```ts
  if (error) echouer("getMissionDetail", error);
  if (!data) return null;
```

`getMissionsTourneeVue` :

```ts
  if (error) echouer("getMissionsTourneeVue", error);
  if (!data) return [];
```

Pour les **deux lectures secondaires** du même fichier, journaliser sans lever :

`getMissionEnCoursHref` — le lien de contexte clinique est un complément :

```ts
  if (error) journaliserEchec("getMissionEnCoursHref", error);
  if (error || !data || data.length === 0) return null;
```

`getPhotoUrl` :

```ts
  if (error) journaliserEchec("getPhotoUrl", error);
  if (error || !data) return null;
```

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run lib/data/ma-journee.test.ts`
Expected: PASS. Puis `npm test` — la suite entière, pour vérifier qu'aucune page ne dépendait du repli silencieux.

- [ ] **Step 5 : Commit**

```bash
git add lib/data/ma-journee.ts lib/data/ma-journee.test.ts
git commit -F <fichier de message>
```

---

### Task 3 : La génération de tournée

**Files:**
- Modify: `lib/data/generation-tournee.ts` — la lecture des soins (~ligne 66) et les trois annulations
- Test: `lib/data/generation-tournee.test.ts`

**Interfaces:**
- Consumes: `echouer` depuis `@/lib/journal` (Task 1)
- Produces: `genererTourneeDuJour` lève désormais au lieu de renoncer en silence

- [ ] **Step 1 : Adapter les quatre tests d'échec existants**

Chacun garde ses assertions actuelles — la tournée doit toujours être supprimée
— et gagne l'attente d'un rejet. L'annulation reste le comportement ; lever n'en
est que la trace.

```ts
  it("lève et n'insère aucune tournée si la lecture des soins échoue", async () => {
    const soinsOrderMock = vi.fn(() =>
      Promise.resolve({ data: null, error: { message: "boom" } })
    );
    const soinsEqActifMock = vi.fn(() => ({ order: soinsOrderMock }));
    const soinsEqIdelMock = vi.fn(() => ({ eq: soinsEqActifMock }));
    const soinsSelectMock = vi.fn(() => ({ eq: soinsEqIdelMock }));
    const tourneeInsertMock = vi.fn();
    const fromMock = vi.fn((table: string) => {
      if (table === "soins_prescrits") return { select: soinsSelectMock };
      if (table === "tournees") return { insert: tourneeInsertMock };
      throw new Error(`table inattendue : ${table}`);
    });
    const fakeClient = { from: fromMock } as unknown as SupabaseClient;

    const { genererTourneeDuJour } = await import("./generation-tournee");

    await expect(genererTourneeDuJour(fakeClient, "u1", "2026-07-15")).rejects.toThrow(
      /genererTourneeDuJour/
    );
    expect(tourneeInsertMock).not.toHaveBeenCalled();
  });
```

Pour les trois autres — « supprime la tournée si l'insertion des missions
échoue », « supprime la tournée si l'insertion des actes échoue », et le garde
de rattachement — envelopper l'appel de la même façon, en **conservant**
l'assertion sur `tourneeDeleteEqMock` :

```ts
    await expect(genererTourneeDuJour(fakeClient, "u1", "2026-07-15")).rejects.toThrow();

    expect(tourneeDeleteEqMock).toHaveBeenCalledWith("id", "t-nouvelle");
```

Les autres tests du fichier — ceux du chemin passant et de `estSoinDuAujourdhui`
— restent inchangés.

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run lib/data/generation-tournee.test.ts`
Expected: FAIL — la fonction retourne sans lever.

- [ ] **Step 3 : Implémenter**

Importer `echouer` puis remplacer les quatre renoncements silencieux.

Lecture des soins :

```ts
  // Renoncer en silence ici produit une journée sans tournée, indiscernable
  // d'une journée sans patient — le faux vide du 31 juillet 2026.
  if (soinsError) echouer("genererTourneeDuJour", soinsError);
```

Échec d'insertion de la tournée :

```ts
  if (error || !tournee) echouer("genererTourneeDuJour — insertion de la tournée", error);
```

Échec de relecture des missions, **après** la suppression :

```ts
  if (missionsError || !missionsCreees) {
    await supabase.from("tournees").delete().eq("id", tournee.id);
    echouer("genererTourneeDuJour — insertion des missions", missionsError);
  }
```

Garde de rattachement, **après** la suppression :

```ts
    await supabase.from("tournees").delete().eq("id", tournee.id);
    echouer(
      "genererTourneeDuJour — rattachement des actes",
      new Error("un passage relu ne correspond à aucune mission")
    );
```

Échec d'insertion des actes, **après** la suppression :

```ts
  if (actesError) {
    await supabase.from("tournees").delete().eq("id", tournee.id);
    echouer("genererTourneeDuJour — insertion des actes", actesError);
  }
```

Dans chaque cas la suppression précède l'appel à `echouer` : la tournée
incomplète ne doit pas survivre à l'erreur qui remonte.

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run lib/data/generation-tournee.test.ts`
Expected: PASS. Puis `npm test`.

- [ ] **Step 5 : Commit**

```bash
git add lib/data/generation-tournee.ts lib/data/generation-tournee.test.ts
git commit -F <fichier de message>
```

---

### Task 4 : Les lectures critiques des patients

**Files:**
- Modify: `lib/data/patients.ts` — `getPatients` (~ligne 55), `getPatient` (~68), `getSoinsPrescrits` (~79)
- Test: `lib/data/patients.test.ts`

**Interfaces:**
- Consumes: `echouer` depuis `@/lib/journal` (Task 1)
- Produces: rien de nouveau — les signatures ne changent pas

- [ ] **Step 1 : Écrire les tests qui échouent**

Ajouter à `lib/data/patients.test.ts` :

```ts
describe("lectures patients — échecs", () => {
  function fakeClientListe(resultat: { data: unknown; error: unknown }) {
    return {
      from: () => ({
        select: () => ({ eq: () => ({ order: () => Promise.resolve(resultat) }) }),
      }),
    } as unknown as SupabaseClient;
  }

  function fakeClientFiche(resultat: { data: unknown; error: unknown }) {
    return {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(resultat) }) }),
      }),
    } as unknown as SupabaseClient;
  }

  it("getPatients lève quand la lecture échoue", async () => {
    const { getPatients } = await import("./patients");

    await expect(
      getPatients(fakeClientListe({ data: null, error: { message: "boom" } }), "u1")
    ).rejects.toThrow(/getPatients/);
  });

  it("getPatients rend une liste vide quand l'IDEL n'a aucun patient", async () => {
    const { getPatients } = await import("./patients");

    expect(await getPatients(fakeClientListe({ data: [], error: null }), "u1")).toEqual([]);
  });

  it("getPatient lève quand la lecture échoue", async () => {
    const { getPatient } = await import("./patients");

    await expect(
      getPatient(fakeClientFiche({ data: null, error: { message: "boom" } }), "p1")
    ).rejects.toThrow(/getPatient/);
  });

  it("getPatient rend null quand le patient est introuvable", async () => {
    const { getPatient } = await import("./patients");

    expect(await getPatient(fakeClientFiche({ data: null, error: null }), "p1")).toBeNull();
  });

  it("getSoinsPrescrits lève quand la lecture échoue", async () => {
    const { getSoinsPrescrits } = await import("./patients");

    await expect(
      getSoinsPrescrits(fakeClientListe({ data: null, error: { message: "boom" } }), "p1")
    ).rejects.toThrow(/getSoinsPrescrits/);
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run lib/data/patients.test.ts`
Expected: FAIL — les trois fonctions rendent encore `[]` ou `null`.

- [ ] **Step 3 : Implémenter**

Importer `echouer` depuis `@/lib/journal`, puis :

```ts
  // getPatients
  if (error) echouer("getPatients", error);
  if (!data) return [];
```

```ts
  // getPatient — un patient introuvable n'est pas une panne : la page
  // appelle notFound() sur ce null.
  if (error) echouer("getPatient", error);
  if (!data) return null;
```

```ts
  // getSoinsPrescrits
  if (error) echouer("getSoinsPrescrits", error);
  if (!data) return [];
```

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run lib/data/patients.test.ts`
Expected: PASS. Puis `npm test`.

- [ ] **Step 5 : Commit**

```bash
git add lib/data/patients.ts lib/data/patients.test.ts
git commit -F <fichier de message>
```

---

### Task 5 : La frontière d'erreur et les lectures secondaires

**Files:**
- Create: `app/(app)/error.tsx`
- Modify: `lib/data/recherche.ts`, `lib/data/dossierSoins.ts`, `lib/data/dossier-patient.ts`, `lib/data/ngap.ts`, `lib/data/profil.ts`, `lib/data/abonnement.ts`, `lib/data/patients-actions.ts`

**Interfaces:**
- Consumes: `journaliserEchec` depuis `@/lib/journal` (Task 1)
- Produces: rien

- [ ] **Step 1 : Créer la frontière d'erreur**

Créer `app/(app)/error.tsx`. Next impose `"use client"` sur toute frontière
d'erreur : c'est la seule dérogation à la règle des composants serveur.

```tsx
"use client";

export default function ErreurEspaceConnecte({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-[22px] font-bold text-navy/80">
        Impossible de charger ces données
      </h1>
      <p className="mx-auto mt-3 max-w-[340px] text-[14px] leading-relaxed text-navy/55">
        Le serveur n&apos;a pas répondu. Rien n&apos;est perdu : vos données sont
        intactes, seul l&apos;affichage a échoué.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-[14px] bg-gradient-to-r from-brand-violet to-brand-rose px-6 py-3 text-[14px] font-semibold text-white shadow-[0_4px_16px_rgba(124,58,237,0.32)]"
      >
        Réessayer
      </button>
    </main>
  );
}
```

La prop `error` est déclarée sans être lue : Next l'exige dans la signature.
Elle est déjà journalisée côté serveur par `echouer`.

- [ ] **Step 2 : Journaliser les lectures secondaires**

Dans chacun des sept fichiers listés, importer `journaliserEchec` depuis
`@/lib/journal` et l'appeler avant chaque repli existant, en nommant la fonction
appelante. Le repli lui-même **ne change pas** — ni la valeur rendue, ni la
condition.

Exemple, dans `lib/data/ngap.ts` :

```ts
  if (error) journaliserEchec("getCodesNgap", error);
  if (error || !data) return [];
```

Répéter pour chaque `if (error` de ces fichiers. `lib/data/ngap.ts` conserve par
ailleurs son garde-fou du lot précédent, qui masque le formulaire de cotation
quand le catalogue est vide.

Un cas à part : `lib/data/patients-actions.ts` ne porte pas des lectures mais
des **écritures** qui renoncent en silence (`if (error) return;`). Elles ne
lèvent pas — une action serveur qui lève renverrait l'IDEL sur l'écran d'erreur
en pleine saisie, et le lot suivant décidera de ce qu'il faut lui montrer. Elles
journalisent, ce qui suffit à ce chantier : une écriture perdue laissera
désormais une trace au lieu de disparaître.

- [ ] **Step 3 : Vérifier l'ensemble**

Run: `npm test`
Expected: toute la suite au vert. Les tests des lectures secondaires ne changent pas : leur repli est toujours le comportement attendu.

Run: `npm run lint`
Expected: aucune erreur, aucun avertissement nouveau. Un avertissement préexistant sans rapport subsiste dans `lib/data/abonnement.test.ts`.

Run: `npx tsc --noEmit`
Expected: aucune erreur.

Run: `npm run build`
Expected: build réussi.

- [ ] **Step 4 : Commit**

```bash
git add "app/(app)/error.tsx" lib/data/recherche.ts lib/data/dossierSoins.ts lib/data/dossier-patient.ts lib/data/ngap.ts lib/data/profil.ts lib/data/abonnement.ts lib/data/patients-actions.ts
git commit -F <fichier de message>
```

---

## Vérification finale

- [ ] `npm test` — suite complète au vert
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run build` — propres
- [ ] `git diff main --stat` — seuls les fichiers de la table File Structure apparaissent
- [ ] `grep -rn "if (error" lib/data | wc -l` comparé au nombre d'appels à `echouer` ou `journaliserEchec` : plus aucune erreur ne doit être avalée sans trace
- [ ] Relecture par la fondatrice : couper le réseau, ouvrir Ma tournée, constater l'écran d'erreur et non une tournée vide

## Note d'exécution

Les tâches 2 à 5 dépendent toutes de la Task 1. Les tâches 2, 3 et 4 sont indépendantes entre elles mais touchent des fichiers voisins : les exécuter dans l'ordre, jamais en parallèle.
