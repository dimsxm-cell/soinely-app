# Fiche patient v2 — transmission, absence, actions rapides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Étendre l'écran `/ma-journee/[missionId]` (déjà livré) avec une
transmission par visite (écriture + lecture de la dernière transmission du
même patient), l'âge du patient, des liens Appeler/SMS, et un statut
"absent" accessible uniquement depuis "à faire".

**Architecture:** Une migration ajoute trois colonnes (`missions_du_jour.transmission`,
`patients.date_naissance`, et élargit le check constraint de `statut`).
`getMissionDetail` (existant) est étendu pour renvoyer ces nouvelles
données. `updateMissionStatutAction` (existant) gagne un cas de
validation supplémentaire ; une nouvelle Server Action
`updateTransmissionAction` gère l'écriture de la transmission. L'écran
détail affiche tout et expose le nouveau bouton "Absence".

**Tech Stack:** Next.js 16 (App Router, Server Components), Supabase (RLS
existante, `SupabaseClient<Database>`), TypeScript strict, Vitest.

Spec complète : `docs/superpowers/specs/2026-07-16-fiche-patient-v2-design.md`.

## Global Constraints

- Aucune nouvelle policy RLS — les trois colonnes ajoutées vivent sur des
  tables déjà couvertes par `missions_du_jour_owner_all` et
  `patients_owner_all` (toutes deux `for all`).
- Le bouton "Absence" **réutilise `updateMissionStatutAction`** — aucune
  nouvelle Server Action pour le statut. Transition valide uniquement
  `a_faire → absent`, jamais depuis `en_cours` ou `terminee`.
- Aucune confirmation avant "Absence", cohérent avec "Terminer".
- Le bloc d'écriture de la transmission n'est visible que si
  `statut` est `en_cours` ou `terminee`.
- Le bouton "Absence" n'est visible que si `statut` est `a_faire`, et
  seulement sur `/ma-journee/[missionId]` — pas sur `CarteMission`.
- `SupabaseClient<Database>` partout, jamais de `SupabaseClient` non typé.
- `@typescript-eslint/no-explicit-any` est une erreur dans ce repo — tout
  cast sur un embed Supabase utilise `as unknown as { ... }` avec la forme
  exacte, même pattern que le reste de `lib/data/ma-journee.ts`.
- **`npm run build` est une étape obligatoire** dans chaque tâche.
- Pas de nouveau test e2e Playwright dédié — même écran déjà couvert.

---

### Task 1: Migration — transmission, statut élargi, date de naissance

**Files:**
- Create: `supabase/migrations/20260716000100_transmission_absence.sql`

**Interfaces:**
- Produces : `missions_du_jour.transmission` (text, nullable),
  `missions_du_jour.statut` acceptant désormais `'absent'`,
  `patients.date_naissance` (date, nullable) — consommés par la Tâche 2.

- [ ] **Step 1: Écrire la migration**

Créer `supabase/migrations/20260716000100_transmission_absence.sql` :

```sql
-- Transmission (texte) par visite.
alter table public.missions_du_jour
  add column transmission text;

-- Nouvelle branche de statut : "absent", accessible depuis a_faire.
alter table public.missions_du_jour
  drop constraint missions_du_jour_statut_check,
  add constraint missions_du_jour_statut_check
    check (statut in ('a_faire','en_cours','terminee','absent'));

-- Date de naissance, pour l'âge affiché sur la fiche patient.
alter table public.patients
  add column date_naissance date;
```

- [ ] **Step 2: Vérifier par relecture**

Relire le fichier créé et le comparer ligne à ligne au bloc SQL
ci-dessus. Confirmer que `missions_du_jour_statut_check` est bien le nom
de contrainte auto-généré par Postgres pour la colonne `statut` (contrainte
inline, non nommée, dans `supabase/migrations/20260714000000_core_schema.sql` —
Postgres nomme les contraintes `check` inline `<table>_<colonne>_check`
par défaut). Aucune commande à exécuter ici — migrations appliquées au
projet distant séparément, avec autorisation explicite du fondateur.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260716000100_transmission_absence.sql
git commit -m "feat(db): transmission, statut absent, date de naissance"
```

---

### Task 2: Types, couche données, corrections d'exhaustivité

**Files:**
- Modify: `lib/types/clinical.ts`
- Modify: `lib/types/database.types.ts`
- Modify: `lib/data/ma-journee.ts`
- Modify: `lib/data/ma-journee.test.ts`
- Modify: `components/ui/CarteMission.tsx`
- Modify: `components/ui/CarteMission.test.tsx`
- Modify: `app/ma-journee/[missionId]/page.tsx:9-13` (uniquement `STATUT_LABEL`)

**Interfaces:**
- Consomme : les colonnes de la Tâche 1.
- Produces : `StatutMission` incluant `"absent"` ; `Patient.dateNaissance`,
  `MissionDetail.transmission`, `MissionDetail.derniereTransmission`
  (`lib/types/clinical.ts`) ; `getMissionDetail` retournant ces nouveaux
  champs (`lib/data/ma-journee.ts`) — consommés par la Tâche 4.

`StatutMission` gagnant une 4ᵉ valeur, tout `Record<StatutMission, ...>`
non partiel ailleurs dans le repo cesse de compiler tant qu'il ne couvre
pas `"absent"` — c'est le cas de `CarteMission`'s `STATUT_LABEL`/
`STATUT_CLASSES` et de la constante `STATUT_LABEL` de
`app/ma-journee/[missionId]/page.tsx`. Ces corrections sont regroupées
ici (pas dans la Tâche 4) pour que `npm run build` reste vert dès cette
tâche — la Tâche 4 s'occupe du reste de l'écran (affichage de l'âge,
Appeler/SMS, blocs transmission, bouton Absence).

- [ ] **Step 1: Écrire les tests qui échouent d'abord**

Remplacer entièrement le contenu de `lib/data/ma-journee.test.ts` par :

```ts
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("getTourneeDuJour", () => {
  it("mappe les colonnes snake_case Supabase vers le type Tournee", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    id: "t1",
                    date: "2026-07-13",
                    nb_patients: 21,
                    nb_injections: 14,
                    nb_pansements: 8,
                    nb_glycemies: 6,
                    temps_estime_min: 435,
                  },
                  error: null,
                }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getTourneeDuJour } = await import("./ma-journee");
    const tournee = await getTourneeDuJour(fakeClient, "user-1");

    expect(tournee).toEqual({
      id: "t1",
      date: "2026-07-13",
      nbPatients: 21,
      nbInjections: 14,
      nbPansements: 8,
      nbGlycemies: 6,
      tempsEstimeMin: 435,
    });
  });
});

describe("getMissionsDuJour", () => {
  it("mappe les colonnes snake_case Supabase vers MissionDuJour, avec le nom du patient joint, triées par heure", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () =>
              Promise.resolve({
                data: [
                  {
                    id: "m1",
                    patient_id: "p1",
                    type_soin: "Pansement",
                    heure_prevue: "08:30:00",
                    statut: "a_faire",
                    mission_clinique_id: null,
                    patients: { nom_complet: "Mme Dupont" },
                  },
                  {
                    id: "m2",
                    patient_id: "p2",
                    type_soin: "Injection",
                    heure_prevue: "09:15:00",
                    statut: "terminee",
                    mission_clinique_id: "mc1",
                    patients: { nom_complet: "M. Martin" },
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
        patientId: "p1",
        patientNom: "Mme Dupont",
        typeSoin: "Pansement",
        heurePrevue: "08:30:00",
        statut: "a_faire",
        missionCliniqueId: null,
      },
      {
        id: "m2",
        patientId: "p2",
        patientNom: "M. Martin",
        typeSoin: "Injection",
        heurePrevue: "09:15:00",
        statut: "terminee",
        missionCliniqueId: "mc1",
      },
    ]);
  });

  it("gère un embed patients renvoyé sous forme de tableau", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () =>
              Promise.resolve({
                data: [
                  {
                    id: "m3",
                    patient_id: "p3",
                    type_soin: "Glycémie",
                    heure_prevue: "10:00:00",
                    statut: "a_faire",
                    mission_clinique_id: null,
                    patients: [{ nom_complet: "Mme Bernard" }],
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
        id: "m3",
        patientId: "p3",
        patientNom: "Mme Bernard",
        typeSoin: "Glycémie",
        heurePrevue: "10:00:00",
        statut: "a_faire",
        missionCliniqueId: null,
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

describe("getMissionDetail", () => {
  function fakeClientAvecCandidats(missionRow: unknown, candidats: unknown[]) {
    return {
      from: () => ({
        select: (colonnes: string) => {
          if (colonnes.includes("patients(")) {
            return {
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: missionRow, error: null }),
              }),
            };
          }
          return {
            eq: () => ({
              neq: () => ({
                not: () => Promise.resolve({ data: candidats, error: null }),
              }),
            }),
          };
        },
      }),
    } as unknown as SupabaseClient;
  }

  const missionRow = {
    id: "m1",
    patient_id: "p1",
    type_soin: "Injection Lovenox",
    heure_prevue: "14:30:00",
    statut: "a_faire",
    mission_clinique_id: null,
    transmission: "Vu ce jour, tout va bien.",
    patients: {
      id: "p1",
      nom_complet: "Mme Dupont",
      adresse: "12 rue des Lilas, 75011 Paris",
      telephone: "06 12 34 56 78",
      allergies: "Allergie pénicilline",
      consignes: "Sonner au portail.",
      date_naissance: "1948-03-14",
    },
  };

  it("mappe la mission et le patient joint, avec la dernière transmission la plus récente", async () => {
    const fakeClient = fakeClientAvecCandidats(missionRow, [
      { transmission: "Ancienne visite, RAS.", heure_prevue: "09:00:00", tournees: { date: "2026-07-01" } },
      { transmission: "Pansement refait, rougeur à surveiller.", heure_prevue: "10:00:00", tournees: { date: "2026-07-14" } },
    ]);

    const { getMissionDetail } = await import("./ma-journee");
    const detail = await getMissionDetail(fakeClient, "m1");

    expect(detail).toEqual({
      id: "m1",
      patientId: "p1",
      patientNom: "Mme Dupont",
      typeSoin: "Injection Lovenox",
      heurePrevue: "14:30:00",
      statut: "a_faire",
      missionCliniqueId: null,
      transmission: "Vu ce jour, tout va bien.",
      derniereTransmission: "Pansement refait, rougeur à surveiller.",
      patient: {
        id: "p1",
        nomComplet: "Mme Dupont",
        adresse: "12 rue des Lilas, 75011 Paris",
        telephone: "06 12 34 56 78",
        allergies: "Allergie pénicilline",
        consignes: "Sonner au portail.",
        dateNaissance: "1948-03-14",
      },
    });
  });

  it("retourne derniereTransmission à null si aucune visite précédente n'a de transmission", async () => {
    const fakeClient = fakeClientAvecCandidats(missionRow, []);

    const { getMissionDetail } = await import("./ma-journee");
    const detail = await getMissionDetail(fakeClient, "m1");

    expect(detail?.derniereTransmission).toBeNull();
  });

  it("retourne null si la mission n'existe pas", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getMissionDetail } = await import("./ma-journee");
    const detail = await getMissionDetail(fakeClient, "inconnue");

    expect(detail).toBeNull();
  });
});

describe("getMissionEnCoursHref", () => {
  it("retourne un lien direct vers la situation terrain si un protocole est lié", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              limit: () =>
                Promise.resolve({
                  data: [
                    {
                      id: "m1",
                      type_soin: "Glycémie",
                      mission_clinique_id: "mc1",
                      missions_cliniques: { situation_terrain_id: "s1" },
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getMissionEnCoursHref } = await import("./ma-journee");
    const contexte = await getMissionEnCoursHref(fakeClient, "t1");

    expect(contexte).toEqual({ missionId: "m1", href: "/situations/s1" });
  });

  it("retourne un lien de recherche pré-remplie si aucun protocole n'est lié", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              limit: () =>
                Promise.resolve({
                  data: [
                    {
                      id: "m2",
                      type_soin: "Pansement",
                      mission_clinique_id: null,
                      missions_cliniques: null,
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getMissionEnCoursHref } = await import("./ma-journee");
    const contexte = await getMissionEnCoursHref(fakeClient, "t1");

    expect(contexte).toEqual({ missionId: "m2", href: "/copilote?q=Pansement" });
  });

  it("retourne null si aucune mission n'est en cours", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getMissionEnCoursHref } = await import("./ma-journee");
    const contexte = await getMissionEnCoursHref(fakeClient, "t1");

    expect(contexte).toBeNull();
  });

  it("retourne un lien direct même si l'embed missions_cliniques est renvoyé sous forme de tableau", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              limit: () =>
                Promise.resolve({
                  data: [
                    {
                      id: "m3",
                      type_soin: "Injection",
                      mission_clinique_id: "mc3",
                      missions_cliniques: [{ situation_terrain_id: "s3" }],
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getMissionEnCoursHref } = await import("./ma-journee");
    const contexte = await getMissionEnCoursHref(fakeClient, "t1");

    expect(contexte).toEqual({ missionId: "m3", href: "/situations/s3" });
  });
});
```

Ajouter à `components/ui/CarteMission.test.tsx`, juste après le test
`"n'affiche aucun bouton pour une mission terminée"` (avant le test
`"affiche un lien « Contexte clinique »..."`) :

```ts
  it("affiche le bon libellé pour le statut « absente »", () => {
    render(<CarteMission mission={{ ...mission, statut: "absent" }} />);
    expect(screen.getByText("Absente")).toBeInTheDocument();
  });

  it("n'affiche aucun bouton pour une mission absente", () => {
    render(<CarteMission mission={{ ...mission, statut: "absent" }} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npx vitest run lib/data/ma-journee.test.ts components/ui/CarteMission.test.tsx`
Expected: FAIL — `getMissionDetail` ne renvoie pas encore `transmission`/
`derniereTransmission`/`dateNaissance`, le statut `"absent"` n'existe pas
encore sur `StatutMission`, `CarteMission` n'a pas encore de libellé pour
ce statut.

- [ ] **Step 3: Mettre à jour les types (`lib/types/clinical.ts`)**

Remplacer entièrement le contenu de `lib/types/clinical.ts` par :

```ts
export type NiveauConfiance = "brouillon" | "relu" | "valide";

export interface SituationTerrain {
  id: string;
  titre: string;
  observation: string;
  verifications: string[];
  causesPossibles: string[];
  conduiteATenir: string[];
  quandAvisMedical: string;
  sources: string[];
  specialite: string;
  niveauConfiance: NiveauConfiance;
  version: number;
  published: boolean;
}

export interface MissionClinique {
  id: string;
  titre: string;
  situationTerrainId: string | null;
  etapes: { titre: string; description: string }[];
  dureeEstimeeMin: number;
  published: boolean;
}

export type StatutMission = "a_faire" | "en_cours" | "terminee" | "absent";

export interface Patient {
  id: string;
  nomComplet: string;
  adresse: string;
  telephone: string;
  allergies: string | null;
  consignes: string | null;
  dateNaissance: string | null;
}

export interface MissionDuJour {
  id: string;
  patientId: string;
  patientNom: string;
  typeSoin: string;
  heurePrevue: string;
  statut: StatutMission;
  missionCliniqueId: string | null;
}

export interface MissionDetail extends MissionDuJour {
  patient: Patient;
  transmission: string | null;
  derniereTransmission: string | null;
}

export interface Tournee {
  id: string;
  date: string;
  nbPatients: number;
  nbInjections: number;
  nbPansements: number;
  nbGlycemies: number;
  tempsEstimeMin: number;
}

export interface SituationTerrainDetail extends SituationTerrain {
  missions: MissionClinique[];
}
```

- [ ] **Step 4: Mettre à jour les types générés (`lib/types/database.types.ts`)**

Dans le bloc `missions_du_jour` (`Row`/`Insert`/`Update`), ajouter
`transmission` (alphabétiquement entre `tournee_id` et `type_soin`) :

```ts
      missions_du_jour: {
        Row: {
          heure_prevue: string
          id: string
          mission_clinique_id: string | null
          patient_id: string
          statut: string
          tournee_id: string
          transmission: string | null
          type_soin: string
        }
        Insert: {
          heure_prevue: string
          id?: string
          mission_clinique_id?: string | null
          patient_id: string
          statut?: string
          tournee_id: string
          transmission?: string | null
          type_soin: string
        }
        Update: {
          heure_prevue?: string
          id?: string
          mission_clinique_id?: string | null
          patient_id?: string
          statut?: string
          tournee_id?: string
          transmission?: string | null
          type_soin?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_du_jour_mission_clinique_id_fkey"
            columns: ["mission_clinique_id"]
            isOneToOne: false
            referencedRelation: "missions_cliniques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_du_jour_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_du_jour_tournee_id_fkey"
            columns: ["tournee_id"]
            isOneToOne: false
            referencedRelation: "tournees"
            referencedColumns: ["id"]
          },
        ]
      }
```

Dans le bloc `patients` (`Row`/`Insert`/`Update`), ajouter
`date_naissance` (alphabétiquement entre `created_at` et `id`) :

```ts
      patients: {
        Row: {
          adresse: string
          allergies: string | null
          consignes: string | null
          created_at: string
          date_naissance: string | null
          id: string
          idel_id: string
          nom_complet: string
          telephone: string
        }
        Insert: {
          adresse: string
          allergies?: string | null
          consignes?: string | null
          created_at?: string
          date_naissance?: string | null
          id?: string
          idel_id: string
          nom_complet: string
          telephone: string
        }
        Update: {
          adresse?: string
          allergies?: string | null
          consignes?: string | null
          created_at?: string
          date_naissance?: string | null
          id?: string
          idel_id?: string
          nom_complet?: string
          telephone?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_idel_id_fkey"
            columns: ["idel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
```

- [ ] **Step 5: Étendre `getMissionDetail` (`lib/data/ma-journee.ts`)**

Remplacer entièrement le contenu de `lib/data/ma-journee.ts` par :

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import type { MissionDetail, MissionDuJour, StatutMission, Tournee } from "@/lib/types/clinical";

export async function getTourneeDuJour(
  supabase: SupabaseClient<Database>,
  idelId: string
): Promise<Tournee | null> {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("tournees")
    .select("id, date, nb_patients, nb_injections, nb_pansements, nb_glycemies, temps_estime_min")
    .eq("idel_id", idelId)
    .eq("date", today)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    date: data.date,
    nbPatients: data.nb_patients,
    nbInjections: data.nb_injections,
    nbPansements: data.nb_pansements,
    nbGlycemies: data.nb_glycemies,
    tempsEstimeMin: data.temps_estime_min,
  };
}

export async function getMissionsDuJour(
  supabase: SupabaseClient<Database>,
  tourneeId: string
): Promise<MissionDuJour[]> {
  const { data, error } = await supabase
    .from("missions_du_jour")
    .select("id, patient_id, type_soin, heure_prevue, statut, mission_clinique_id, patients(nom_complet)")
    .eq("tournee_id", tourneeId)
    .order("heure_prevue");

  if (error || !data) return [];

  return data.map((row) => {
    const patientEmbed = row.patients as unknown;
    const patient = Array.isArray(patientEmbed)
      ? (patientEmbed[0] as { nom_complet: string })
      : (patientEmbed as { nom_complet: string });

    return {
      id: row.id,
      patientId: row.patient_id,
      patientNom: patient.nom_complet,
      typeSoin: row.type_soin,
      heurePrevue: row.heure_prevue,
      statut: row.statut as StatutMission,
      missionCliniqueId: row.mission_clinique_id,
    };
  });
}

async function getDerniereTransmission(
  supabase: SupabaseClient<Database>,
  patientId: string,
  missionIdActuelle: string
): Promise<string | null> {
  const { data } = await supabase
    .from("missions_du_jour")
    .select("transmission, heure_prevue, tournees(date)")
    .eq("patient_id", patientId)
    .neq("id", missionIdActuelle)
    .not("transmission", "is", null);

  if (!data || data.length === 0) return null;

  type CandidatRow = { transmission: string | null; heure_prevue: string; tournees: unknown };
  const avecDate = (data as CandidatRow[]).map((row) => {
    const tourneeEmbed = row.tournees;
    const tournee = Array.isArray(tourneeEmbed)
      ? (tourneeEmbed[0] as { date: string } | undefined)
      : (tourneeEmbed as { date: string } | null);
    return { transmission: row.transmission, dateHeure: `${tournee?.date ?? ""}T${row.heure_prevue}` };
  });

  avecDate.sort((a, b) => b.dateHeure.localeCompare(a.dateHeure));

  return avecDate[0].transmission;
}

export async function getMissionDetail(
  supabase: SupabaseClient<Database>,
  missionId: string
): Promise<MissionDetail | null> {
  const { data, error } = await supabase
    .from("missions_du_jour")
    .select(
      "id, patient_id, type_soin, heure_prevue, statut, mission_clinique_id, transmission, patients(id, nom_complet, adresse, telephone, allergies, consignes, date_naissance)"
    )
    .eq("id", missionId)
    .maybeSingle();

  if (error || !data) return null;

  const patientEmbed = data.patients as unknown;
  type PatientRow = {
    id: string;
    nom_complet: string;
    adresse: string;
    telephone: string;
    allergies: string | null;
    consignes: string | null;
    date_naissance: string | null;
  };
  const patientRow = Array.isArray(patientEmbed)
    ? (patientEmbed[0] as PatientRow)
    : (patientEmbed as PatientRow);

  const derniereTransmission = await getDerniereTransmission(supabase, data.patient_id, missionId);

  return {
    id: data.id,
    patientId: data.patient_id,
    patientNom: patientRow.nom_complet,
    typeSoin: data.type_soin,
    heurePrevue: data.heure_prevue,
    statut: data.statut as StatutMission,
    missionCliniqueId: data.mission_clinique_id,
    transmission: data.transmission,
    derniereTransmission,
    patient: {
      id: patientRow.id,
      nomComplet: patientRow.nom_complet,
      adresse: patientRow.adresse,
      telephone: patientRow.telephone,
      allergies: patientRow.allergies,
      consignes: patientRow.consignes,
      dateNaissance: patientRow.date_naissance,
    },
  };
}

export async function getMissionEnCoursHref(
  supabase: SupabaseClient<Database>,
  tourneeId: string
): Promise<{ missionId: string; href: string } | null> {
  const { data, error } = await supabase
    .from("missions_du_jour")
    .select("id, type_soin, mission_clinique_id, missions_cliniques(situation_terrain_id)")
    .eq("tournee_id", tourneeId)
    .eq("statut", "en_cours")
    .limit(1);

  if (error || !data || data.length === 0) return null;

  const mission = data[0];
  const missionsCliniquesEmbed = mission.missions_cliniques as unknown;
  const missionClinique = Array.isArray(missionsCliniquesEmbed)
    ? (missionsCliniquesEmbed[0] as { situation_terrain_id: string | null } | undefined)
    : (missionsCliniquesEmbed as { situation_terrain_id: string | null } | null);
  const situationTerrainId = missionClinique?.situation_terrain_id;

  const href = situationTerrainId
    ? `/situations/${situationTerrainId}`
    : `/copilote?q=${encodeURIComponent(mission.type_soin)}`;

  return { missionId: mission.id, href };
}
```

- [ ] **Step 6: Étendre `CarteMission` (`components/ui/CarteMission.tsx`)**

Dans `components/ui/CarteMission.tsx`, remplacer les lignes 6-16 par :

```ts
const STATUT_LABEL: Record<MissionDuJour["statut"], string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  terminee: "Terminée",
  absent: "Absente",
};

const STATUT_CLASSES: Record<MissionDuJour["statut"], string> = {
  a_faire: "bg-navy/5 text-navy",
  en_cours: "bg-warning text-navy",
  terminee: "bg-success text-navy",
  absent: "bg-navy/10 text-navy/50",
};
```

Le reste du fichier (`PROCHAIN_STATUT`, `LIBELLE_ACTION`, le composant
`CarteMission`) reste inchangé — ces deux constantes restent
`Partial<Record<...>>` et n'ont besoin d'aucune entrée pour `absent`
(aucune transition n'en part).

- [ ] **Step 7: Corriger l'exhaustivité sur la fiche patient (`app/ma-journee/[missionId]/page.tsx:9-13`)**

Remplacer les lignes 9-13 par :

```ts
const STATUT_LABEL: Record<StatutMission, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  terminee: "Terminée",
  absent: "Absente",
};
```

Ne rien changer d'autre dans ce fichier pour cette tâche — le reste de
l'écran (âge, Appeler/SMS, blocs transmission, bouton Absence) est fait à
la Tâche 4.

- [ ] **Step 8: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run lib/data/ma-journee.test.ts components/ui/CarteMission.test.tsx`
Expected: PASS (tous les tests, existants et nouveaux)

- [ ] **Step 9: Vérifier la compilation et le lint**

Run: `npm run build`
Expected: PASS (0 erreur TypeScript)

Run: `npx eslint lib/types/clinical.ts lib/types/database.types.ts lib/data/ma-journee.ts components/ui/CarteMission.tsx "app/ma-journee/[missionId]/page.tsx"`
Expected: PASS (0 erreur)

- [ ] **Step 10: Commit**

```bash
git add lib/types/clinical.ts lib/types/database.types.ts lib/data/ma-journee.ts lib/data/ma-journee.test.ts components/ui/CarteMission.tsx components/ui/CarteMission.test.tsx "app/ma-journee/[missionId]/page.tsx"
git commit -m "feat(patients): transmission, dernière transmission, âge, statut absent (types + données)"
```

---

### Task 3: Server Actions — updateTransmissionAction + absence

**Files:**
- Modify: `lib/data/ma-journee-actions.ts`
- Modify: `lib/data/ma-journee-actions.test.ts`

**Interfaces:**
- Consomme : rien de nouveau (utilise `createClient` déjà importé).
- Produces :
  `updateTransmissionAction(formData: FormData): Promise<void>` — consommée
  par la Tâche 4. `updateMissionStatutAction` accepte désormais aussi la
  transition `a_faire → absent`.

- [ ] **Step 1: Écrire les tests qui échouent d'abord**

Remplacer entièrement le contenu de `lib/data/ma-journee-actions.test.ts`
par :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const eqSelectMock = vi.fn();
const selectMock = vi.fn(() => ({ eq: () => ({ maybeSingle: eqSelectMock }) }));
const eqUpdateMock = vi.fn();
const updateMock = vi.fn(() => ({ eq: eqUpdateMock }));
const fromMock = vi.fn(() => ({ select: selectMock, update: updateMock }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({ from: fromMock }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateMissionStatutAction", () => {
  it("applique une transition valide (a_faire vers en_cours) et invalide le cache des deux écrans", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "a_faire" }, error: null });
    eqUpdateMock.mockResolvedValue({ error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "en_cours");

    await updateMissionStatutAction(formData);

    expect(fromMock).toHaveBeenCalledWith("missions_du_jour");
    expect(updateMock).toHaveBeenCalledWith({ statut: "en_cours" });
    expect(eqUpdateMock).toHaveBeenCalledWith("id", "m1");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee/m1");
  });

  it("applique la transition a_faire vers absent et invalide le cache", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "a_faire" }, error: null });
    eqUpdateMock.mockResolvedValue({ error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "absent");

    await updateMissionStatutAction(formData);

    expect(updateMock).toHaveBeenCalledWith({ statut: "absent" });
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee/m1");
  });

  it("n'applique pas absent depuis en_cours", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "en_cours" }, error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "absent");

    await updateMissionStatutAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("n'applique pas absent depuis terminee", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "terminee" }, error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "absent");

    await updateMissionStatutAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("n'applique pas une transition invalide (terminee vers a_faire)", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "terminee" }, error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "a_faire");

    await updateMissionStatutAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("n'applique pas une transition invalide (a_faire directement vers terminee)", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "a_faire" }, error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "terminee");

    await updateMissionStatutAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("n'applique pas une transition invalide (en_cours vers a_faire)", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "en_cours" }, error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "a_faire");

    await updateMissionStatutAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("n'applique rien si la mission n'existe pas", async () => {
    eqSelectMock.mockResolvedValue({ data: null, error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "inconnue");
    formData.set("nouveauStatut", "en_cours");

    await updateMissionStatutAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateConsignesAction", () => {
  it("met à jour les consignes du patient lié à la mission et invalide le cache", async () => {
    eqSelectMock.mockResolvedValue({ data: { patient_id: "p1" }, error: null });
    eqUpdateMock.mockResolvedValue({ error: null });

    const { updateConsignesAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("consignes", "Sonner au portail.");

    await updateConsignesAction(formData);

    expect(fromMock).toHaveBeenCalledWith("missions_du_jour");
    expect(fromMock).toHaveBeenCalledWith("patients");
    expect(updateMock).toHaveBeenCalledWith({ consignes: "Sonner au portail." });
    expect(eqUpdateMock).toHaveBeenCalledWith("id", "p1");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee/m1");
  });

  it("ne fait rien si la mission n'existe pas", async () => {
    eqSelectMock.mockResolvedValue({ data: null, error: null });

    const { updateConsignesAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "inconnue");
    formData.set("consignes", "Peu importe");

    await updateConsignesAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateTransmissionAction", () => {
  it("met à jour la transmission de la mission et invalide le cache", async () => {
    eqSelectMock.mockResolvedValue({ data: { id: "m1" }, error: null });
    eqUpdateMock.mockResolvedValue({ error: null });

    const { updateTransmissionAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("transmission", "RAS, patient stable.");

    await updateTransmissionAction(formData);

    expect(updateMock).toHaveBeenCalledWith({ transmission: "RAS, patient stable." });
    expect(eqUpdateMock).toHaveBeenCalledWith("id", "m1");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee/m1");
  });

  it("ne fait rien si la mission n'existe pas", async () => {
    eqSelectMock.mockResolvedValue({ data: null, error: null });

    const { updateTransmissionAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "inconnue");
    formData.set("transmission", "Peu importe");

    await updateTransmissionAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npx vitest run lib/data/ma-journee-actions.test.ts`
Expected: FAIL — `updateTransmissionAction` n'existe pas encore,
`updateMissionStatutAction` rejette encore la transition `a_faire → absent`.

- [ ] **Step 3: Implémenter**

Remplacer entièrement le contenu de `lib/data/ma-journee-actions.ts` par :

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { StatutMission } from "@/lib/types/clinical";

const TRANSITIONS_VALIDES: Partial<Record<StatutMission, StatutMission>> = {
  a_faire: "en_cours",
  en_cours: "terminee",
};

export async function updateMissionStatutAction(formData: FormData): Promise<void> {
  const missionId = String(formData.get("missionId"));
  const nouveauStatut = String(formData.get("nouveauStatut")) as StatutMission;

  const supabase = await createClient();

  const { data: mission } = await supabase
    .from("missions_du_jour")
    .select("statut")
    .eq("id", missionId)
    .maybeSingle();

  if (!mission) return;

  const statutActuel = mission.statut as StatutMission;
  const transitionValide =
    TRANSITIONS_VALIDES[statutActuel] === nouveauStatut ||
    (statutActuel === "a_faire" && nouveauStatut === "absent");

  if (!transitionValide) return;

  await supabase.from("missions_du_jour").update({ statut: nouveauStatut }).eq("id", missionId);

  revalidatePath("/ma-journee");
  revalidatePath(`/ma-journee/${missionId}`);
}

export async function updateConsignesAction(formData: FormData): Promise<void> {
  const missionId = String(formData.get("missionId"));
  const consignes = String(formData.get("consignes"));

  const supabase = await createClient();

  const { data: mission } = await supabase
    .from("missions_du_jour")
    .select("patient_id")
    .eq("id", missionId)
    .maybeSingle();

  if (!mission) return;

  await supabase.from("patients").update({ consignes }).eq("id", mission.patient_id);

  revalidatePath(`/ma-journee/${missionId}`);
}

export async function updateTransmissionAction(formData: FormData): Promise<void> {
  const missionId = String(formData.get("missionId"));
  const transmission = String(formData.get("transmission"));

  const supabase = await createClient();

  const { data: mission } = await supabase
    .from("missions_du_jour")
    .select("id")
    .eq("id", missionId)
    .maybeSingle();

  if (!mission) return;

  await supabase.from("missions_du_jour").update({ transmission }).eq("id", missionId);

  revalidatePath(`/ma-journee/${missionId}`);
}
```

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run lib/data/ma-journee-actions.test.ts`
Expected: PASS (12 tests : 8 pour `updateMissionStatutAction` — 5
existants + 3 nouveaux pour `absent` — + 2 existants pour
`updateConsignesAction` + 2 nouveaux pour `updateTransmissionAction`)

- [ ] **Step 5: Vérifier la compilation et le lint**

Run: `npm run build`
Expected: PASS (0 erreur TypeScript)

Run: `npx eslint lib/data/ma-journee-actions.ts`
Expected: PASS (0 erreur)

- [ ] **Step 6: Commit**

```bash
git add lib/data/ma-journee-actions.ts lib/data/ma-journee-actions.test.ts
git commit -m "feat(patients): updateTransmissionAction + transition a_faire vers absent"
```

---

### Task 4: Écran — âge, Appeler/SMS, transmission, Absence

**Files:**
- Modify: `app/ma-journee/[missionId]/page.tsx`

**Interfaces:**
- Consomme : `getMissionDetail` étendu (Tâche 2 — `transmission`,
  `derniereTransmission`, `patient.dateNaissance`),
  `updateTransmissionAction` (Tâche 3), `updateMissionStatutAction` avec
  la transition `absent` (Tâche 3).

- [ ] **Step 1: Remplacer l'écran**

Remplacer entièrement le contenu de `app/ma-journee/[missionId]/page.tsx`
par :

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMissionDetail } from "@/lib/data/ma-journee";
import {
  updateConsignesAction,
  updateMissionStatutAction,
  updateTransmissionAction,
} from "@/lib/data/ma-journee-actions";
import { Button } from "@/components/ui/Button";
import type { StatutMission } from "@/lib/types/clinical";

const STATUT_LABEL: Record<StatutMission, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  terminee: "Terminée",
  absent: "Absente",
};

const PROCHAIN_STATUT: Partial<Record<StatutMission, StatutMission>> = {
  a_faire: "en_cours",
  en_cours: "terminee",
};

const LIBELLE_ACTION: Partial<Record<StatutMission, string>> = {
  a_faire: "Commencer le soin",
  en_cours: "Terminer",
};

function calculerAge(dateNaissance: string): number {
  const naissance = new Date(dateNaissance);
  const aujourdHui = new Date();
  let age = aujourdHui.getFullYear() - naissance.getFullYear();
  const anniversairePasse =
    aujourdHui.getMonth() > naissance.getMonth() ||
    (aujourdHui.getMonth() === naissance.getMonth() && aujourdHui.getDate() >= naissance.getDate());
  if (!anniversairePasse) age -= 1;
  return age;
}

export default async function ArriveePatientPage({
  params,
}: {
  params: Promise<{ missionId: string }>;
}) {
  const { missionId } = await params;
  const supabase = await createClient();
  const mission = await getMissionDetail(supabase, missionId);

  if (!mission) notFound();

  const prochainStatut = PROCHAIN_STATUT[mission.statut];
  const peutMarquerAbsent = mission.statut === "a_faire";
  const peutEcrireTransmission = mission.statut === "en_cours" || mission.statut === "terminee";
  const itineraireHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mission.patient.adresse)}`;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <Link href="/ma-journee" className="text-primary hover:underline">
          ‹ Ma journée
        </Link>
        <span className="rounded-full bg-navy/5 px-3 py-1 text-xs font-medium text-navy">
          {STATUT_LABEL[mission.statut]}
        </span>
      </div>

      <div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-semibold text-navy">{mission.patientNom}</h1>
          {mission.patient.dateNaissance && (
            <span className="text-sm text-navy/60">{calculerAge(mission.patient.dateNaissance)} ans</span>
          )}
        </div>
        <p className="mt-1 text-navy/60">{mission.heurePrevue}</p>
      </div>

      <div className="flex gap-3">
        <a href={`tel:${mission.patient.telephone}`} className="flex-1">
          <Button variant="secondary" className="w-full">
            Appeler
          </Button>
        </a>
        <a href={`sms:${mission.patient.telephone}`} className="flex-1">
          <Button variant="secondary" className="w-full">
            SMS
          </Button>
        </a>
      </div>

      <div className="rounded-card border border-navy/10 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase text-navy/60">Adresse</p>
            <p className="mt-1 text-navy">{mission.patient.adresse}</p>
          </div>
          <a href={itineraireHref} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary">Itinéraire</Button>
          </a>
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium uppercase text-navy/60">Téléphone</p>
          <p className="mt-1 text-navy">{mission.patient.telephone}</p>
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium uppercase text-navy/60">Acte prévu</p>
          <p className="mt-1 text-navy">{mission.typeSoin}</p>
        </div>
      </div>

      {mission.patient.allergies && (
        <section className="rounded-card border border-danger/30 bg-danger/5 p-6">
          <p className="text-xs font-medium uppercase text-danger">Allergie</p>
          <p className="mt-1 text-navy">{mission.patient.allergies}</p>
        </section>
      )}

      {mission.derniereTransmission && (
        <section className="rounded-card border border-navy/10 bg-navy/5 p-6">
          <p className="text-xs font-medium uppercase text-navy/60">Dernière transmission</p>
          <p className="mt-1 text-navy">{mission.derniereTransmission}</p>
        </section>
      )}

      <section className="rounded-card border border-navy/10 bg-white p-6">
        <p className="text-xs font-medium uppercase text-navy/60">Consignes</p>
        <form action={updateConsignesAction} className="mt-2 flex flex-col gap-3">
          <input type="hidden" name="missionId" value={mission.id} />
          <textarea
            name="consignes"
            defaultValue={mission.patient.consignes ?? ""}
            rows={3}
            className="rounded-card border border-navy/10 p-3 text-navy"
          />
          <Button type="submit" variant="tertiary" className="self-start">
            Enregistrer
          </Button>
        </form>
      </section>

      {peutEcrireTransmission && (
        <section className="rounded-card border border-navy/10 bg-white p-6">
          <p className="text-xs font-medium uppercase text-navy/60">Transmission de cette visite</p>
          <form action={updateTransmissionAction} className="mt-2 flex flex-col gap-3">
            <input type="hidden" name="missionId" value={mission.id} />
            <textarea
              name="transmission"
              defaultValue={mission.transmission ?? ""}
              rows={3}
              className="rounded-card border border-navy/10 p-3 text-navy"
            />
            <Button type="submit" variant="tertiary" className="self-start">
              Enregistrer
            </Button>
          </form>
        </section>
      )}

      {prochainStatut && (
        <div className="flex gap-3">
          {peutMarquerAbsent && (
            <form action={updateMissionStatutAction} className="flex-1">
              <input type="hidden" name="missionId" value={mission.id} />
              <input type="hidden" name="nouveauStatut" value="absent" />
              <Button type="submit" variant="secondary" className="w-full">
                Absence
              </Button>
            </form>
          )}
          <form action={updateMissionStatutAction} className="flex-1">
            <input type="hidden" name="missionId" value={mission.id} />
            <input type="hidden" name="nouveauStatut" value={prochainStatut} />
            <Button type="submit" variant="primary" className="w-full">
              {LIBELLE_ACTION[mission.statut]}
            </Button>
          </form>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Vérifier la compilation et le lint**

Run: `npm run build`
Expected: PASS (0 erreur TypeScript)

Run: `npx eslint "app/ma-journee/[missionId]/page.tsx"`
Expected: PASS (0 erreur)

- [ ] **Step 3: Lancer la suite complète**

Run: `npm test`
Expected: PASS (tous les tests existants + tous les nouveaux des tâches
précédentes, aucune régression)

- [ ] **Step 4: Commit**

```bash
git add "app/ma-journee/[missionId]/page.tsx"
git commit -m "feat(patients): écran fiche patient v2 (âge, appeler/sms, transmission, absence)"
```

- [ ] **Step 5: Vérification manuelle post-déploiement (contrôleur, avec autorisation explicite du fondateur)**

Après déploiement, avec autorisation explicite du fondateur : sur les
patients/missions de test déjà en place, écrire une transmission sur une
mission passée en `en_cours` ou `terminee` ; créer une seconde mission
pour le même patient et confirmer que "Dernière transmission" s'affiche
correctement ; tester la transition vers `absent` depuis `a_faire` et
confirmer son rejet depuis `en_cours` ; confirmer que les liens
Appeler/SMS pointent vers le bon numéro ; renseigner `date_naissance` sur
un patient de test et confirmer l'affichage de l'âge.

---

## Résultat à la fin de ce plan

Depuis la fiche patient, une IDEL peut appeler ou envoyer un SMS au
patient en un tap, voir l'âge du patient et la transmission de sa
dernière visite, écrire une transmission une fois le soin commencé, et
marquer un patient absent si personne ne répond — sans jamais toucher à
la logique de progression linéaire déjà en production.
