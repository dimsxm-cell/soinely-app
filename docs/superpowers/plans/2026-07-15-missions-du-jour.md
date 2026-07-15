# Missions du jour (v1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher la liste des missions de la tournée du jour sur l'écran Ma Journée, en lecture seule, en réutilisant le composant `CarteMission` déjà construit mais jamais câblé.

**Architecture:** Aucune nouvelle table, aucune nouvelle policy RLS. Une fonction de lecture `getMissionsDuJour` ajoutée à `lib/data/ma-journee.ts` (fichier existant), affichée sur `/ma-journee` (fichier existant) sous la grille de statistiques.

**Tech Stack:** Next.js 16 (App Router, Server Components), Supabase (RLS existante, aucun changement de schéma), TypeScript strict, Vitest.

Spec complète : `docs/superpowers/specs/2026-07-15-missions-du-jour-design.md`.

## Global Constraints

- Lecture seule — aucune mutation, aucun Server Action, aucun changement de
  statut dans ce plan.
- Aucune nouvelle migration, aucune nouvelle policy RLS — la policy
  existante `missions_du_jour_owner_all` (scope via `tournee_id → idel_id`)
  couvre déjà ce chantier.
- Pattern couche données établi : mapping snake_case → camelCase explicite,
  tests avec un client Supabase simulé écrit à la main (voir
  `getTourneeDuJour`/`lib/data/ma-journee.test.ts` — pattern à reproduire
  exactement, pas de bibliothèque de mock).
- Aucune carte de mission cliquable — pas de nouvelle route, pas de lien
  vers un protocole clinique.
- Style Tailwind v4 : tokens `@theme` existants uniquement, grille
  d'espacement 8px. `CarteMission` existe déjà et n'est pas modifié par ce
  plan — seul son intégration change.
- Ce repo traite `@typescript-eslint/no-explicit-any` comme une erreur —
  suivre le mapping de `getTourneeDuJour` (jamais d'annotation `: any`
  explicite ; laisser l'inférence de type faire son travail comme le fait
  déjà cette fonction).

---

### Task 1: Couche données — getMissionsDuJour

**Files:**
- Modify: `lib/data/ma-journee.ts`
- Modify: `lib/data/ma-journee.test.ts`

**Interfaces:**
- Consomme : le type `MissionDuJour` (déjà défini dans
  `lib/types/clinical.ts`, aucun changement nécessaire).
- Produces : `getMissionsDuJour(supabase: SupabaseClient, tourneeId: string): Promise<MissionDuJour[]>`,
  consommée par la Tâche 2.

- [ ] **Step 1: Écrire les tests (échouent d'abord)**

Ajouter à `lib/data/ma-journee.test.ts`, après le `describe("getTourneeDuJour", ...)` existant :

```ts
describe("getMissionsDuJour", () => {
  it("mappe les colonnes snake_case Supabase vers MissionDuJour, triées par heure", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () =>
              Promise.resolve({
                data: [
                  {
                    id: "m1",
                    patient_label: "Mme Dupont",
                    type_soin: "Pansement",
                    heure_prevue: "08:30:00",
                    statut: "a_faire",
                    mission_clinique_id: null,
                  },
                  {
                    id: "m2",
                    patient_label: "M. Martin",
                    type_soin: "Injection",
                    heure_prevue: "09:15:00",
                    statut: "terminee",
                    mission_clinique_id: "mc1",
                  },
                ],
                error: null,
              }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getMissionsDuJour } = await import("./ma-journee");
    const missions = await getMissionsDuJour(fakeClient, "t1");

    expect(missions).toEqual([
      {
        id: "m1",
        patientLabel: "Mme Dupont",
        typeSoin: "Pansement",
        heurePrevue: "08:30:00",
        statut: "a_faire",
        missionCliniqueId: null,
      },
      {
        id: "m2",
        patientLabel: "M. Martin",
        typeSoin: "Injection",
        heurePrevue: "09:15:00",
        statut: "terminee",
        missionCliniqueId: "mc1",
      },
    ]);
  });

  it("retourne un tableau vide en cas d'erreur", async () => {
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
    const missions = await getMissionsDuJour(fakeClient, "t1");

    expect(missions).toEqual([]);
  });
});
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npx vitest run lib/data/ma-journee.test.ts`
Expected: FAIL — `getMissionsDuJour` n'existe pas encore dans `./ma-journee`.

- [ ] **Step 3: Implémenter**

Ajouter à `lib/data/ma-journee.ts`, après `getTourneeDuJour` :

```ts
export async function getMissionsDuJour(
  supabase: SupabaseClient,
  tourneeId: string
): Promise<MissionDuJour[]> {
  const { data, error } = await supabase
    .from("missions_du_jour")
    .select("id, patient_label, type_soin, heure_prevue, statut, mission_clinique_id")
    .eq("tournee_id", tourneeId)
    .order("heure_prevue");

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    patientLabel: row.patient_label,
    typeSoin: row.type_soin,
    heurePrevue: row.heure_prevue,
    statut: row.statut,
    missionCliniqueId: row.mission_clinique_id,
  }));
}
```

Ajouter `MissionDuJour` à l'import de types en haut du fichier :

```ts
import type { MissionDuJour, Tournee } from "@/lib/types/clinical";
```

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run lib/data/ma-journee.test.ts`
Expected: PASS (3 tests : le test existant de `getTourneeDuJour` + les 2 nouveaux)

- [ ] **Step 5: Vérifier le lint**

Run: `npx eslint lib/data/ma-journee.ts`
Expected: PASS (0 erreur — en particulier, aucun `any` explicite introduit)

- [ ] **Step 6: Commit**

```bash
git add lib/data/ma-journee.ts lib/data/ma-journee.test.ts
git commit -m "feat(ma-journee): getMissionsDuJour"
```

---

### Task 2: Test CarteMission + intégration sur Ma Journée

**Files:**
- Create: `components/ui/CarteMission.test.tsx`
- Modify: `app/ma-journee/page.tsx`

**Interfaces:**
- Consomme : `getMissionsDuJour` (Tâche 1), `CarteMission`
  (`components/ui/CarteMission.tsx`, déjà existant et inchangé par ce
  plan), `getTourneeDuJour` (déjà existant, inchangé).

`CarteMission` existe déjà et fonctionne — ce n'est pas du TDD classique où
le test échoue avant l'implémentation. Le test documente et verrouille le
comportement déjà en place ; il doit passer dès son écriture.

- [ ] **Step 1: Écrire le test de CarteMission**

Créer `components/ui/CarteMission.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CarteMission } from "./CarteMission";
import type { MissionDuJour } from "@/lib/types/clinical";

const mission: MissionDuJour = {
  id: "m1",
  patientLabel: "Mme Dupont",
  typeSoin: "Pansement",
  heurePrevue: "08:30:00",
  statut: "a_faire",
  missionCliniqueId: null,
};

describe("CarteMission", () => {
  it("affiche le patient, le type de soin, l'heure et le statut", () => {
    render(<CarteMission mission={mission} />);

    expect(screen.getByText("Mme Dupont")).toBeInTheDocument();
    expect(screen.getByText(/Pansement/)).toBeInTheDocument();
    expect(screen.getByText(/08:30:00/)).toBeInTheDocument();
    expect(screen.getByText("À faire")).toBeInTheDocument();
  });

  it("affiche le bon libellé pour le statut « en cours »", () => {
    render(<CarteMission mission={{ ...mission, statut: "en_cours" }} />);
    expect(screen.getByText("En cours")).toBeInTheDocument();
  });

  it("affiche le bon libellé pour le statut « terminée »", () => {
    render(<CarteMission mission={{ ...mission, statut: "terminee" }} />);
    expect(screen.getByText("Terminée")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Lancer le test et vérifier qu'il passe**

Run: `npx vitest run components/ui/CarteMission.test.tsx`
Expected: PASS (3 tests) — `CarteMission` existe déjà, ce test confirme
qu'il se comporte comme attendu, sans modification du composant.

- [ ] **Step 3: Intégrer sur Ma Journée**

Modifier `app/ma-journee/page.tsx` — remplacer le contenu du fichier par :

```tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMissionsDuJour, getTourneeDuJour } from "@/lib/data/ma-journee";
import { Button } from "@/components/ui/Button";
import { CarteInformation } from "@/components/ui/CarteInformation";
import { CarteMission } from "@/components/ui/CarteMission";

export default async function MaJourneePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tournee = user ? await getTourneeDuJour(supabase, user.id) : null;
  const missions = tournee ? await getMissionsDuJour(supabase, tournee.id) : [];

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-navy">Ma Journée</h1>
      <div className="flex gap-4">
        <Link href="/recherche">
          <Button variant="secondary">Rechercher</Button>
        </Link>
        <Link href="/copilote">
          <Button variant="secondary">Copilote</Button>
        </Link>
      </div>
      {tournee ? (
        <div className="grid grid-cols-2 gap-4">
          <CarteInformation label="Patients" value={tournee.nbPatients} />
          <CarteInformation label="Injections" value={tournee.nbInjections} />
          <CarteInformation label="Pansements" value={tournee.nbPansements} />
          <CarteInformation label="Glycémies" value={tournee.nbGlycemies} />
        </div>
      ) : (
        <p className="text-navy/60">Aucune tournée enregistrée pour aujourd&apos;hui.</p>
      )}
      {tournee &&
        (missions.length > 0 ? (
          <div className="flex flex-col gap-4">
            {missions.map((mission) => (
              <CarteMission key={mission.id} mission={mission} />
            ))}
          </div>
        ) : (
          <p className="text-navy/60">Aucune mission prévue pour aujourd&apos;hui.</p>
        ))}
    </main>
  );
}
```

- [ ] **Step 4: Vérifier la compilation et le lint**

Run: `npm run build`
Expected: PASS (0 erreur TypeScript)

Run: `npx eslint app/ma-journee/page.tsx`
Expected: PASS (0 erreur)

- [ ] **Step 5: Lancer la suite complète**

Run: `npm test` (ou la commande équivalente de ce projet)
Expected: PASS (tous les tests existants + les 3 nouveaux tests de
`CarteMission` + les 2 nouveaux tests de `getMissionsDuJour`, aucune
régression)

- [ ] **Step 6: Commit**

```bash
git add components/ui/CarteMission.test.tsx app/ma-journee/page.tsx
git commit -m "feat(ma-journee): afficher la liste des missions du jour"
```

- [ ] **Step 7: Vérification manuelle post-déploiement (contrôleur, avec autorisation)**

Aucune donnée `missions_du_jour` n'existe encore dans le projet Supabase
distant. Après fusion et déploiement, le contrôleur, avec autorisation
explicite :
1. Insère 2-3 missions de test réelles pour la tournée existante du compte
   `test-idel@soinely.dev` (via l'API Admin/REST, `service_role`).
2. Vérifie via le token du compte de test que `/ma-journee` afficherait
   ces missions triées par heure, avec les bons libellés de statut.
3. Vérifie le cas limite : une tournée sans mission affiche bien « Aucune
   mission prévue pour aujourd'hui. » (peut être vérifié directement en
   interrogeant `missions_du_jour` pour une tournée sans ligne).

---

## Résultat à la fin de ce plan

L'écran Ma Journée affiche désormais, sous les statistiques agrégées, la
liste chronologique des missions de la tournée du jour — patient, type de
soin, heure, statut — en réutilisant le composant `CarteMission` resté
inutilisé depuis le socle technique. Aucune mutation, aucune nouvelle
route. C'est le prérequis nécessaire pour qu'un futur Copilote contextuel
puisse un jour savoir quelle mission l'IDEL est en train de réaliser.
