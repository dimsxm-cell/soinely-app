# Annuler un statut de mission et motiver une absence — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre corrigible une mission validée ou marquée absente par erreur, et permettre de motiver une absence depuis la carte de tournée.

**Architecture:** La table des transitions passe d'un successeur unique à une liste, ce qui ouvre les deux retours vers « À faire » et absorbe le cas particulier de l'absence. Une colonne `motif_absence` et une action dédiée portent le motif ; la carte de tournée expose les deux.

**Tech Stack:** Next.js 16.2.10 (App Router, RSC), React 19.2.4, TypeScript, Tailwind CSS v4, Supabase, Vitest 4 + Testing Library.

**Spec :** `docs/superpowers/specs/2026-07-31-annulation-statut-mission-design.md`

## Global Constraints

- Tout le code visible — identifiants, commentaires, libellés — est en **français**.
- Tests colocalisés ; suite `npm test` (actuellement **316/316**), fichier seul `npx vitest run <chemin>`.
- Composants serveur : aucun `"use client"`, aucun `useState`, aucun gestionnaire d'événement. Les écritures passent par `<form action={…}>`, et deux formulaires voisins sont **frères**, jamais imbriqués — HTML l'interdit.
- **Aucune migration n'est appliquée sur une base réelle.** Le fichier SQL est écrit et relu ; la fondatrice décide du moment. Tous les tests sont unitaires sur un faux client Supabase.
- Les actions serveur **journalisent sans lever** (`journaliserEchec`) : une action qui lève éjecterait l'IDEL sur l'écran d'erreur en pleine saisie.
- **Aucun montant en euros** : hors sujet ici.
- **Commits** : messages en français, donc porteurs d'apostrophes qui cassent le quoting du shell. Écrire le message dans un fichier avec l'outil Write puis `git commit -F <ce fichier>`, terminé par `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. N'ajouter que les fichiers de la tâche : jamais `git add -A` ni `git add .`.

---

## File Structure

| Fichier | Responsabilité |
|---|---|
| `supabase/migrations/20260731000000_motif_absence.sql` *(créé)* | La colonne `motif_absence` |
| `lib/types/database.types.ts` *(modifié)* | Le type correspondant |
| `lib/data/ma-journee.ts` *(modifié)* | `motifAbsence` dans `MissionTourneeVue` |
| `lib/data/ma-journee-actions.ts` *(modifié)* | Transitions en liste, effacement du motif, action de motif |
| `components/ui/CarteMissionTournee.tsx` *(modifié)* | Boutons d'annulation et encart de motif |

---

### Task 1 : La colonne et sa lecture

**Files:**
- Create: `supabase/migrations/20260731000000_motif_absence.sql`
- Modify: `lib/types/database.types.ts`, `lib/data/ma-journee.ts`
- Test: `lib/data/ma-journee.test.ts`

**Interfaces:**
- Consumes: rien
- Produces: `MissionTourneeVue.motifAbsence: string | null`, attendu par la Task 4

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter au `describe("getMissionsTourneeVue", …)` existant de `lib/data/ma-journee.test.ts`. Le faux client de ce bloc s'appelle `fakeClientAvecMissions` et la fixture patient `patient` — les réutiliser tels quels.

```ts
  it("remonte le motif d'absence, à null quand la colonne est vide", async () => {
    const fakeClient = fakeClientAvecMissions([
      {
        id: "m1",
        patient_id: "p1",
        type_soin: "Toilette",
        heure_prevue: "08:00:00",
        statut: "absent",
        mission_clinique_id: null,
        motif_absence: "Hospitalisée depuis hier",
        patients: patient,
        missions_cliniques: null,
        actes_mission: [],
      },
      {
        id: "m2",
        patient_id: "p2",
        type_soin: "Pansement",
        heure_prevue: "10:00:00",
        statut: "a_faire",
        mission_clinique_id: null,
        motif_absence: null,
        patients: patient,
        missions_cliniques: null,
        actes_mission: [],
      },
    ]);

    const { getMissionsTourneeVue } = await import("./ma-journee");
    const missions = await getMissionsTourneeVue(fakeClient, "t1");

    expect(missions[0].motifAbsence).toBe("Hospitalisée depuis hier");
    expect(missions[1].motifAbsence).toBeNull();
  });
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run lib/data/ma-journee.test.ts -t "motif d'absence"`
Expected: FAIL — `motifAbsence` vaut `undefined`.

- [ ] **Step 3 : Écrire la migration**

Créer `supabase/migrations/20260731000000_motif_absence.sql` :

```sql
-- Motif facultatif d'une absence, saisi depuis la carte de tournée après avoir
-- marqué la mission absente. Revenir à « À faire » le remet à null : conservé,
-- il décrirait une absence qui n'existe plus.
alter table public.missions_du_jour
  add column motif_absence text;
```

Aucune autre modification de schéma : la contrainte de statut accepte déjà les quatre valeurs depuis `20260716000100_transmission_absence.sql`.

- [ ] **Step 4 : Mettre les types à jour**

Dans `lib/types/database.types.ts`, ajouter `motif_absence: string | null` aux trois formes (`Row`, `Insert`, `Update`) de `missions_du_jour`, sur le modèle des colonnes voisines — optionnel dans `Insert` et `Update`, requis dans `Row`.

- [ ] **Step 5 : Exposer le champ dans la vue**

Dans `lib/data/ma-journee.ts` :

a) `MissionTourneeVue` gagne, à la suite de ses champs existants :

```ts
  motifAbsence: string | null;
```

b) dans `getMissionsTourneeVue`, ajouter `motif_absence` à la chaîne du `select`, juste après `statut` ;

c) dans l'objet retourné par le `map`, ajouter :

```ts
      motifAbsence: row.motif_absence,
```

- [ ] **Step 6 : Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run lib/data/ma-journee.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: aucune erreur. `motifAbsence` étant requis, les fabriques de test qui construisent un `MissionTourneeVue` doivent le porter : ajouter `motifAbsence: null` à `creerMission` dans `components/ui/CarteMissionTournee.test.tsx`, `components/ui/EnTeteTournee.test.tsx` et `lib/tournee-vue.test.ts`. Vitest efface les types à l'exécution et ne le signalerait pas — c'est `tsc` qui le prouve.

- [ ] **Step 7 : Commit**

```bash
git add supabase/migrations/20260731000000_motif_absence.sql lib/types/database.types.ts lib/data/ma-journee.ts lib/data/ma-journee.test.ts components/ui/CarteMissionTournee.test.tsx components/ui/EnTeteTournee.test.tsx lib/tournee-vue.test.ts
git commit -F <fichier de message>
```

---

### Task 2 : Les transitions et l'annulation

**Files:**
- Modify: `lib/data/ma-journee-actions.ts:8-11` (la table) et `:27-37` (la condition et l'écriture)
- Test: `lib/data/ma-journee-actions.test.ts`

**Interfaces:**
- Consumes: la colonne `motif_absence` (Task 1)
- Produces: `updateMissionStatutAction` accepte `terminee → a_faire` et `absent → a_faire`, et efface le motif au passage

- [ ] **Step 1 : Écrire les tests qui échouent**

Ajouter au `describe("updateMissionStatutAction", …)` existant. Les mocks `eqSelectMock`, `updateMock`, `eqUpdateMock` sont déjà en tête de fichier et réinitialisés par le `beforeEach` — ne rien redéclarer.

```ts
  it("annule une validation en ramenant la mission à « à faire »", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "terminee" }, error: null });
    eqUpdateMock.mockResolvedValue({ error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "a_faire");

    await updateMissionStatutAction(formData);

    // Le motif part avec l'absence qu'il expliquait.
    expect(updateMock).toHaveBeenCalledWith({ statut: "a_faire", motif_absence: null });
  });

  it("annule une absence en ramenant la mission à « à faire »", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "absent" }, error: null });
    eqUpdateMock.mockResolvedValue({ error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "a_faire");

    await updateMissionStatutAction(formData);

    expect(updateMock).toHaveBeenCalledWith({ statut: "a_faire", motif_absence: null });
  });

  it("marque absente une mission à faire, sans toucher au motif", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "a_faire" }, error: null });
    eqUpdateMock.mockResolvedValue({ error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "absent");

    await updateMissionStatutAction(formData);

    expect(updateMock).toHaveBeenCalledWith({ statut: "absent" });
  });

  it("refuse de passer directement de « validé » à « absent »", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "terminee" }, error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "absent");

    await updateMissionStatutAction(formData);

    // La correction passe par « À faire » : deux gestes valent mieux qu'une
    // bascule déclenchée par mégarde.
    expect(updateMock).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run lib/data/ma-journee-actions.test.ts`
Expected: FAIL — les deux annulations n'écrivent rien, la table des transitions ne les connaît pas.

- [ ] **Step 3 : Implémenter**

Dans `lib/data/ma-journee-actions.ts`, remplacer la table :

```ts
// Chaque statut liste ses suites possibles. Les deux retours vers « à faire »
// rattrapent l'appui de trop sur « Valider » ou « Absent », geste fait à une
// main sur le pas d'une porte. Passer directement de « validé » à « absent »
// n'est volontairement pas offert.
const TRANSITIONS_VALIDES: Record<StatutMission, StatutMission[]> = {
  a_faire: ["en_cours", "absent"],
  en_cours: ["terminee"],
  terminee: ["a_faire"],
  absent: ["a_faire"],
};
```

puis, dans `updateMissionStatutAction`, remplacer la condition et l'écriture :

```ts
  const statutActuel = mission.statut as StatutMission;

  // L'accès optionnel protège d'un statut inattendu venu de la base : sans lui,
  // une valeur hors des quatre connues ferait planter l'action au lieu de la
  // refuser. TypeScript garantit les clés, pas la donnée lue.
  if (!TRANSITIONS_VALIDES[statutActuel]?.includes(nouveauStatut)) return;

  // Revenir à « à faire » efface le motif d'absence : conservé, il décrirait
  // une absence qui n'existe plus.
  const misAJour =
    nouveauStatut === "a_faire"
      ? { statut: nouveauStatut, motif_absence: null }
      : { statut: nouveauStatut };

  const { error } = await supabase
    .from("missions_du_jour")
    .update(misAJour)
    .eq("id", missionId);
```

Le reste de la fonction — la journalisation et les trois `revalidatePath` — ne change pas.

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run lib/data/ma-journee-actions.test.ts`
Expected: PASS, y compris les tests existants des transitions déjà autorisées.

- [ ] **Step 5 : Commit**

```bash
git add lib/data/ma-journee-actions.ts lib/data/ma-journee-actions.test.ts
git commit -F <fichier de message>
```

---

### Task 3 : L'action de motif d'absence

**Files:**
- Modify: `lib/data/ma-journee-actions.ts` (nouvelle action après `updateMissionStatutAction`)
- Test: `lib/data/ma-journee-actions.test.ts`

**Interfaces:**
- Consumes: la colonne `motif_absence` (Task 1)
- Produces: `updateMotifAbsenceAction(formData: FormData): Promise<void>`, attendue par la Task 4. Champs lus : `missionId`, `motif`.

- [ ] **Step 1 : Écrire les tests qui échouent**

```ts
describe("updateMotifAbsenceAction", () => {
  it("enregistre le motif sur une mission absente", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "absent" }, error: null });
    eqUpdateMock.mockResolvedValue({ error: null });

    const { updateMotifAbsenceAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("motif", "Hospitalisée depuis hier");

    await updateMotifAbsenceAction(formData);

    expect(updateMock).toHaveBeenCalledWith({ motif_absence: "Hospitalisée depuis hier" });
    expect(eqUpdateMock).toHaveBeenCalledWith("id", "m1");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-tournee");
  });

  it("efface le motif quand le champ est vidé", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "absent" }, error: null });
    eqUpdateMock.mockResolvedValue({ error: null });

    const { updateMotifAbsenceAction } = await import("./ma-journee-actions");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("motif", "");

    await updateMotifAbsenceAction(formData);

    expect(updateMock).toHaveBeenCalledWith({ motif_absence: null });
  });

  it("n'écrit rien sur une mission qui n'est pas absente", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "terminee" }, error: null });

    const { updateMotifAbsenceAction } = await import("./ma-journee-actions");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("motif", "Hospitalisée");

    await updateMotifAbsenceAction(formData);

    // Un motif ailleurs que sur une absence serait une explication orpheline,
    // qu'aucun écran n'afficherait.
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("n'écrit rien quand la mission est introuvable", async () => {
    eqSelectMock.mockResolvedValue({ data: null, error: null });

    const { updateMotifAbsenceAction } = await import("./ma-journee-actions");

    const formData = new FormData();
    formData.set("missionId", "inconnue");
    formData.set("motif", "Hospitalisée");

    await updateMotifAbsenceAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run lib/data/ma-journee-actions.test.ts -t "updateMotifAbsenceAction"`
Expected: FAIL — `updateMotifAbsenceAction is not a function`.

- [ ] **Step 3 : Implémenter**

Dans `lib/data/ma-journee-actions.ts`, juste après `updateMissionStatutAction` :

```ts
export async function updateMotifAbsenceAction(formData: FormData): Promise<void> {
  const missionId = String(formData.get("missionId"));
  const motif = String(formData.get("motif") ?? "") || null;

  const supabase = await createClient();

  const { data: mission } = await supabase
    .from("missions_du_jour")
    .select("statut")
    .eq("id", missionId)
    .maybeSingle();

  // Un motif n'a de sens que sur une absence : ailleurs, il resterait une
  // explication orpheline qu'aucun écran n'afficherait.
  if (!mission || mission.statut !== "absent") return;

  const { error } = await supabase
    .from("missions_du_jour")
    .update({ motif_absence: motif })
    .eq("id", missionId);

  if (error) journaliserEchec("updateMotifAbsenceAction", error);

  revalidatePath("/ma-journee");
  revalidatePath("/ma-tournee");
  revalidatePath(`/ma-journee/${missionId}`);
}
```

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run lib/data/ma-journee-actions.test.ts`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add lib/data/ma-journee-actions.ts lib/data/ma-journee-actions.test.ts
git commit -F <fichier de message>
```

---

### Task 4 : La carte de tournée

**Files:**
- Modify: `components/ui/CarteMissionTournee.tsx` — le bloc « Actions » et l'import des actions
- Test: `components/ui/CarteMissionTournee.test.tsx`

**Interfaces:**
- Consumes: `mission.motifAbsence` (Task 1), `updateMissionStatutAction` avec `nouveauStatut = "a_faire"` (Task 2), `updateMotifAbsenceAction` (Task 3)
- Produces: rien

- [ ] **Step 1 : Écrire les tests qui échouent**

Ajouter à `components/ui/CarteMissionTournee.test.tsx`. La fabrique `creerMission` porte déjà `motifAbsence: null` depuis la Task 1 ; le mock de `@/lib/data/ma-journee-actions` en tête de fichier doit exposer la nouvelle action :

```ts
vi.mock("@/lib/data/ma-journee-actions", () => ({
  updateMissionStatutAction: vi.fn(),
  updateMotifAbsenceAction: vi.fn(),
}));
```

```ts
describe("CarteMissionTournee — correction d'un statut", () => {
  it("propose d'annuler la validation d'une mission validée", () => {
    render(
      <CarteMissionTournee mission={creerMission({ statut: "terminee" })} estDerniere={false} />
    );

    expect(screen.getByRole("button", { name: "Annuler la validation" })).toBeInTheDocument();
  });

  it("propose d'annuler l'absence et de saisir un motif", () => {
    render(
      <CarteMissionTournee mission={creerMission({ statut: "absent" })} estDerniere={false} />
    );

    expect(screen.getByRole("button", { name: "Annuler l'absence" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Motif de l'absence/)).toBeInTheDocument();
  });

  it("affiche le motif déjà saisi, et le prérenseigne dans le champ", () => {
    render(
      <CarteMissionTournee
        mission={creerMission({ statut: "absent", motifAbsence: "Hospitalisée depuis hier" })}
        estDerniere={false}
      />
    );

    expect(screen.getByText("Hospitalisée depuis hier")).toBeInTheDocument();
    expect(screen.getByLabelText(/Motif de l'absence/)).toHaveValue("Hospitalisée depuis hier");
  });

  it("laisse le champ vide et n'affiche aucun encart quand l'absence n'a pas de motif", () => {
    render(
      <CarteMissionTournee mission={creerMission({ statut: "absent" })} estDerniere={false} />
    );

    expect(screen.getByLabelText(/Motif de l'absence/)).toHaveValue("");
    expect(screen.queryByText("⚠️")).not.toBeInTheDocument();
  });

  // Deux tests plutôt qu'un : deux `render` dans un même test s'empilent dans
  // le même conteneur — Testing Library ne nettoie qu'entre les tests — et la
  // requête porterait alors sur les deux cartes à la fois.
  it("ne propose aucune annulation sur une mission à faire", () => {
    render(<CarteMissionTournee mission={creerMission()} estDerniere={false} />);

    expect(screen.queryByRole("button", { name: /Annuler/ })).not.toBeInTheDocument();
  });

  it("ne propose aucune annulation sur une mission en cours", () => {
    render(
      <CarteMissionTournee mission={creerMission({ statut: "en_cours" })} estDerniere={false} />
    );

    expect(screen.queryByRole("button", { name: /Annuler/ })).not.toBeInTheDocument();
  });
});
```

Deux tests existants affirment qu'une mission validée ou absente n'affiche **aucun** bouton (« n'affiche aucune action pour une mission validée » et son équivalent pour l'absence). Ils deviennent faux : les réécrire pour affirmer ce qui reste vrai — l'absence des boutons **de soin** (`Valider le soin`, `Absent`, `GPS`, `Appeler`) — sans supprimer l'intention d'origine.

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run components/ui/CarteMissionTournee.test.tsx`
Expected: FAIL — aucun bouton d'annulation n'existe.

- [ ] **Step 3 : Implémenter**

Compléter l'import en tête de `components/ui/CarteMissionTournee.tsx` :

```tsx
import { updateMissionStatutAction, updateMotifAbsenceAction } from "@/lib/data/ma-journee-actions";
```

Puis, **après** le bloc `{(aFaire || enCours) && ( … )}` existant, qui n'est pas modifié, ajouter les deux blocs de correction :

```tsx
        {/* Correction d'un statut posé par erreur. La carte reste atténuée :
            l'annulation est offerte sans être mise en avant. */}
        {terminee && (
          <div className="border-t border-navy/[0.06] px-4 py-3">
            <form action={updateMissionStatutAction}>
              <input type="hidden" name="missionId" value={mission.id} />
              <input type="hidden" name="nouveauStatut" value="a_faire" />
              <button
                type="submit"
                className="rounded-[12px] border border-navy/12 bg-navy/[0.03] px-4 py-2.5 text-[13px] font-semibold text-navy/50 hover:bg-navy/[0.07]"
              >
                Annuler la validation
              </button>
            </form>
          </div>
        )}

        {absent && (
          <div className="border-t border-navy/[0.06] px-4 py-3">
            {mission.motifAbsence && (
              <div className="mb-2.5 flex items-start gap-2 rounded-[10px] bg-amber-50 px-3 py-2">
                <span className="mt-px shrink-0 text-[13px]" aria-hidden="true">
                  ⚠️
                </span>
                <p className="text-[12.5px] font-medium text-amber-700">
                  {mission.motifAbsence}
                </p>
              </div>
            )}

            {/* Deux formulaires frères : HTML interdit de les imbriquer. */}
            <form action={updateMotifAbsenceAction} className="flex min-w-0 gap-2">
              <input type="hidden" name="missionId" value={mission.id} />
              <label className="sr-only" htmlFor={`motif-${mission.id}`}>
                Motif de l&apos;absence de {nomFormate}
              </label>
              <input
                id={`motif-${mission.id}`}
                name="motif"
                type="text"
                defaultValue={mission.motifAbsence ?? ""}
                placeholder="Motif (facultatif)"
                className="min-w-0 flex-1 rounded-[12px] border border-navy/15 px-3 py-2 text-[13px] text-navy placeholder:text-navy/35"
              />
              <button
                type="submit"
                className="shrink-0 rounded-[12px] border border-navy/12 bg-navy/[0.03] px-3 py-2 text-[13px] font-semibold text-navy/60 hover:bg-navy/[0.07]"
              >
                Enregistrer
              </button>
            </form>

            <form action={updateMissionStatutAction} className="mt-2">
              <input type="hidden" name="missionId" value={mission.id} />
              <input type="hidden" name="nouveauStatut" value="a_faire" />
              <button
                type="submit"
                className="rounded-[12px] border border-navy/12 bg-navy/[0.03] px-4 py-2.5 text-[13px] font-semibold text-navy/50 hover:bg-navy/[0.07]"
              >
                Annuler l&apos;absence
              </button>
            </form>
          </div>
        )}
```

Le `min-w-0` sur le formulaire et sur le champ n'est pas décoratif : sans lui, un champ texte dans une rangée flex établit une largeur plancher et déborde de la carte sur un téléphone — le défaut relevé en revue sur le sélecteur de cotation.

Le `<label className="sr-only">` donne au champ un nom accessible distinct par mission ; sans lui, un lecteur d'écran annoncerait autant de champs identiques qu'il y a d'absences.

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run components/ui/CarteMissionTournee.test.tsx`
Expected: PASS.

- [ ] **Step 5 : Vérifier l'ensemble**

Run: `npm test` — toute la suite au vert.
Run: `npm run lint` — aucun avertissement nouveau ; celui de `lib/data/abonnement.test.ts` est préexistant et sans rapport.
Run: `npx tsc --noEmit` — aucune erreur.
Run: `npm run build` — build réussi.

- [ ] **Step 6 : Commit**

```bash
git add components/ui/CarteMissionTournee.tsx components/ui/CarteMissionTournee.test.tsx
git commit -F <fichier de message>
```

---

## Vérification finale

- [ ] `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` — propres
- [ ] `git diff main --stat` — seuls les fichiers de la table File Structure apparaissent
- [ ] **La migration n'a pas été appliquée.** Le rapport final doit le rappeler, avec la commande (`npx supabase db push`) et l'avertissement : depuis le chantier « erreurs visibles », déployer ce code avant la migration ne donnera plus une tournée vide mais **l'écran d'erreur**, `getMissionsTourneeVue` lisant une colonne qui n'existe pas encore.
- [ ] Relecture par la fondatrice : valider une mission, l'annuler, la marquer absente, saisir un motif, annuler l'absence, vérifier que le motif a disparu.

## Note d'exécution

Les tâches sont séquentielles : la 2 et la 3 écrivent dans le même fichier, la 4 dépend des trois précédentes. Ne jamais les paralléliser.
