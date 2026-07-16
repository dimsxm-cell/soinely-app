# Écran "Arrivée chez le patient" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner à une IDEL connectée un écran dédié par mission
(`/ma-journee/[missionId]`) qui affiche, sans recherche, nom, heure,
adresse, téléphone, acte prévu, allergie et consignes éditables du patient
— accessible en tapant sur le nom du patient depuis Ma Journée.

**Architecture:** Nouvelle table `patients` (persistante, propriétaire =
IDEL) remplace le `patient_label` texte libre de `missions_du_jour`. La
couche données existante (`lib/data/ma-journee.ts`) gagne une jointure sur
cette table et une nouvelle fonction `getMissionDetail`. Une nouvelle
Server Action (`updateConsignesAction`) permet l'édition des consignes ;
l'action de changement de statut existante (`updateMissionStatutAction`)
est réutilisée telle quelle pour le CTA "Commencer le soin".

**Tech Stack:** Next.js 16 (App Router, Server Components), Supabase (RLS,
types générés manuellement dans `lib/types/database.types.ts`), TypeScript
strict, Vitest.

Spec complète : `docs/superpowers/specs/2026-07-16-arrivee-patient-design.md`.

## Global Constraints

- **Aucune modification de `proxy.ts`** — `PROTECTED_PATHS` contient déjà
  `"/ma-journee"` (utilisé via `startsWith`) et `config.matcher` contient
  déjà `"/ma-journee/:path*"`, qui couvre le nouveau segment dynamique
  `/ma-journee/[missionId]`. Confirmé en lisant `proxy.ts` (2026-07-15).
- Utiliser le type `SupabaseClient<Database>` pour toute fonction de la
  couche données — jamais un `SupabaseClient` non typé.
- Ce repo traite `@typescript-eslint/no-explicit-any` comme une erreur —
  utiliser `as unknown as { ... }` avec la forme exacte attendue pour tout
  cast nécessaire sur un embed Supabase (même pattern que
  `getMissionEnCoursHref`, déjà dans `lib/data/ma-journee.ts`).
- **`npm run build` est une étape obligatoire** dans chaque tâche, pas
  seulement ESLint/Vitest — seul `next build` attrape certaines erreurs de
  type que ESLint ne détecte pas.
- Pas de nouveau test e2e Playwright dédié pour l'écran
  `/ma-journee/[missionId]` — déjà couvert par le matcher existant, et
  aucune autre page de ce repo (hors `app/page.tsx`) n'a de test dédié :
  cohérent avec le précédent établi.
- Le bouton "Commencer le soin" **réutilise exactement**
  `updateMissionStatutAction` (aucune nouvelle Server Action pour la
  transition de statut) — seul le libellé affiché change sur ce nouvel
  écran.
- Le lien "Itinéraire" utilise le format exact :
  `` `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}` ``
  — lien universel Google Maps, pas de lien Waze direct (décision actée :
  fonctionne sans dépendre d'une app spécifique installée).
- Table `patients` : RLS `patients_owner_all` (`for all using/with check
  (auth.uid() = idel_id)`), même pattern que `tournees_owner_all`.

---

### Task 1: Migration — table `patients` + `missions_du_jour.patient_id`

**Files:**
- Create: `supabase/migrations/20260716000000_patients.sql`

**Interfaces:**
- Produces : table `public.patients` (id, idel_id, nom_complet, adresse,
  telephone, allergies, consignes, created_at) et
  `public.missions_du_jour.patient_id` (uuid not null, FK vers
  `patients.id`) — consommés par la Tâche 2 (types + couche données).

- [ ] **Step 1: Écrire la migration**

Créer `supabase/migrations/20260716000000_patients.sql` :

```sql
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  idel_id uuid not null references public.profiles(id) on delete cascade,
  nom_complet text not null,
  adresse text not null,
  telephone text not null,
  allergies text,
  consignes text,
  created_at timestamptz not null default now()
);

alter table public.patients enable row level security;

create policy "patients_owner_all" on public.patients
  for all using (auth.uid() = idel_id) with check (auth.uid() = idel_id);

-- Aucune fixture de test existante ne référence un patient réel (elle ne
-- porte que patient_label, en texte libre) — elles sont vidées ici plutôt
-- que de bloquer l'ajout d'une colonne not null sans défaut. Confirmé
-- disposable par précédent (chantiers "Missions du jour" et "Changement de
-- statut" : fixtures réinsérées manuellement à chaque vérification).
delete from public.missions_du_jour;

alter table public.missions_du_jour
  drop column patient_label,
  add column patient_id uuid not null references public.patients(id);
```

- [ ] **Step 2: Vérifier la syntaxe SQL par relecture**

Relire le fichier créé et le comparer ligne à ligne au bloc SQL ci-dessus
— aucune commande à exécuter ici (pas d'instance Supabase locale dans ce
repo ; les migrations sont appliquées au projet distant séparément, avec
autorisation explicite du fondateur, voir Vérification manuelle du spec).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260716000000_patients.sql
git commit -m "feat(db): table patients + missions_du_jour.patient_id"
```

---

### Task 2: Types + couche données (jointure patients) + `CarteMission`

**Files:**
- Modify: `lib/types/clinical.ts`
- Modify: `lib/types/database.types.ts`
- Modify: `lib/data/ma-journee.ts`
- Modify: `lib/data/ma-journee.test.ts`
- Modify: `components/ui/CarteMission.tsx`
- Modify: `components/ui/CarteMission.test.tsx`

**Interfaces:**
- Consomme : table `patients` et colonne `missions_du_jour.patient_id`
  (Tâche 1).
- Produces : type `Patient`, `MissionDuJour` (avec `patientId`/`patientNom`,
  remplace `patientLabel`), `MissionDetail` (`lib/types/clinical.ts`) ;
  `getMissionDetail(supabase: SupabaseClient<Database>, missionId: string): Promise<MissionDetail | null>`
  (`lib/data/ma-journee.ts`) — consommés par la Tâche 4 (nouvel écran).

Ce chantier remplace le champ `patient_label` (texte libre) par une
jointure sur la nouvelle table `patients`. Tous les fichiers qui
référencent `patientLabel`/`patient_label` doivent être mis à jour
ensemble pour que `npm run build` reste vert à la fin de cette tâche —
c'est pourquoi ces 6 fichiers sont dans une seule tâche.

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
  it("mappe la mission et le patient joint", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: {
                  id: "m1",
                  patient_id: "p1",
                  type_soin: "Injection Lovenox",
                  heure_prevue: "14:30:00",
                  statut: "a_faire",
                  mission_clinique_id: null,
                  patients: {
                    id: "p1",
                    nom_complet: "Mme Dupont",
                    adresse: "12 rue des Lilas, 75011 Paris",
                    telephone: "06 12 34 56 78",
                    allergies: "Allergie pénicilline",
                    consignes: "Sonner au portail.",
                  },
                },
                error: null,
              }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

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
      patient: {
        id: "p1",
        nomComplet: "Mme Dupont",
        adresse: "12 rue des Lilas, 75011 Paris",
        telephone: "06 12 34 56 78",
        allergies: "Allergie pénicilline",
        consignes: "Sonner au portail.",
      },
    });
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

Remplacer entièrement le contenu de `components/ui/CarteMission.test.tsx`
par :

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CarteMission } from "./CarteMission";
import type { MissionDuJour } from "@/lib/types/clinical";

vi.mock("@/lib/data/ma-journee-actions", () => ({
  updateMissionStatutAction: vi.fn(),
}));

const mission: MissionDuJour = {
  id: "m1",
  patientId: "p1",
  patientNom: "Mme Dupont",
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

  it("le nom du patient est un lien vers l'écran d'arrivée de la mission", () => {
    render(<CarteMission mission={mission} />);

    const lien = screen.getByRole("link", { name: /Mme Dupont/ });
    expect(lien).toHaveAttribute("href", "/ma-journee/m1");
  });

  it("affiche le bon libellé pour le statut « en cours »", () => {
    render(<CarteMission mission={{ ...mission, statut: "en_cours" }} />);
    expect(screen.getByText("En cours")).toBeInTheDocument();
  });

  it("affiche le bon libellé pour le statut « terminée »", () => {
    render(<CarteMission mission={{ ...mission, statut: "terminee" }} />);
    expect(screen.getByText("Terminée")).toBeInTheDocument();
  });

  it("affiche le bouton « Démarrer » pour une mission à faire", () => {
    render(<CarteMission mission={mission} />);

    expect(screen.getByRole("button", { name: "Démarrer" })).toBeInTheDocument();

    const champStatut = document.querySelector('input[name="nouveauStatut"]') as HTMLInputElement;
    expect(champStatut.value).toBe("en_cours");
  });

  it("affiche le bouton « Terminer » pour une mission en cours", () => {
    render(<CarteMission mission={{ ...mission, statut: "en_cours" }} />);

    expect(screen.getByRole("button", { name: "Terminer" })).toBeInTheDocument();

    const champStatut = document.querySelector('input[name="nouveauStatut"]') as HTMLInputElement;
    expect(champStatut.value).toBe("terminee");
  });

  it("n'affiche aucun bouton pour une mission terminée", () => {
    render(<CarteMission mission={{ ...mission, statut: "terminee" }} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("affiche un lien « Contexte clinique » quand contexteHref est fourni", () => {
    render(<CarteMission mission={{ ...mission, statut: "en_cours" }} contexteHref="/situations/s1" />);

    const lien = screen.getByRole("link", { name: "Contexte clinique" });
    expect(lien).toHaveAttribute("href", "/situations/s1");
  });

  it("n'affiche que le lien vers le patient quand contexteHref n'est pas fourni", () => {
    render(<CarteMission mission={{ ...mission, statut: "en_cours" }} />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npx vitest run lib/data/ma-journee.test.ts components/ui/CarteMission.test.tsx`
Expected: FAIL — `patientNom`/`patientId` n'existent pas encore sur
`MissionDuJour`, `getMissionDetail` n'existe pas encore, `CarteMission`
n'affiche pas encore de lien vers le patient.

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

export type StatutMission = "a_faire" | "en_cours" | "terminee";

export interface Patient {
  id: string;
  nomComplet: string;
  adresse: string;
  telephone: string;
  allergies: string | null;
  consignes: string | null;
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

Dans la section `public.Tables`, remplacer le bloc `missions_du_jour`
existant (actuellement lignes 80-124) par :

```ts
      missions_du_jour: {
        Row: {
          heure_prevue: string
          id: string
          mission_clinique_id: string | null
          patient_id: string
          statut: string
          tournee_id: string
          type_soin: string
        }
        Insert: {
          heure_prevue: string
          id?: string
          mission_clinique_id?: string | null
          patient_id: string
          statut?: string
          tournee_id: string
          type_soin: string
        }
        Update: {
          heure_prevue?: string
          id?: string
          mission_clinique_id?: string | null
          patient_id?: string
          statut?: string
          tournee_id?: string
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

Puis, juste après le bloc `ngap_codes` (qui se termine par
`Relationships: []` suivi de `}`) et juste avant le bloc `profiles`,
insérer ce nouveau bloc (ordre alphabétique des tables, cohérent avec le
reste du fichier) :

```ts
      patients: {
        Row: {
          adresse: string
          allergies: string | null
          consignes: string | null
          created_at: string
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

- [ ] **Step 5: Implémenter la jointure et `getMissionDetail` (`lib/data/ma-journee.ts`)**

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

export async function getMissionDetail(
  supabase: SupabaseClient<Database>,
  missionId: string
): Promise<MissionDetail | null> {
  const { data, error } = await supabase
    .from("missions_du_jour")
    .select(
      "id, patient_id, type_soin, heure_prevue, statut, mission_clinique_id, patients(id, nom_complet, adresse, telephone, allergies, consignes)"
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
  };
  const patientRow = Array.isArray(patientEmbed)
    ? (patientEmbed[0] as PatientRow)
    : (patientEmbed as PatientRow);

  return {
    id: data.id,
    patientId: data.patient_id,
    patientNom: patientRow.nom_complet,
    typeSoin: data.type_soin,
    heurePrevue: data.heure_prevue,
    statut: data.statut as StatutMission,
    missionCliniqueId: data.mission_clinique_id,
    patient: {
      id: patientRow.id,
      nomComplet: patientRow.nom_complet,
      adresse: patientRow.adresse,
      telephone: patientRow.telephone,
      allergies: patientRow.allergies,
      consignes: patientRow.consignes,
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

- [ ] **Step 6: Mettre à jour `CarteMission` (`components/ui/CarteMission.tsx`)**

Remplacer entièrement le contenu de `components/ui/CarteMission.tsx` par :

```tsx
import Link from "next/link";
import type { MissionDuJour, StatutMission } from "@/lib/types/clinical";
import { updateMissionStatutAction } from "@/lib/data/ma-journee-actions";
import { Button } from "@/components/ui/Button";

const STATUT_LABEL: Record<MissionDuJour["statut"], string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  terminee: "Terminée",
};

const STATUT_CLASSES: Record<MissionDuJour["statut"], string> = {
  a_faire: "bg-navy/5 text-navy",
  en_cours: "bg-warning text-navy",
  terminee: "bg-success text-navy",
};

const PROCHAIN_STATUT: Partial<Record<StatutMission, StatutMission>> = {
  a_faire: "en_cours",
  en_cours: "terminee",
};

const LIBELLE_ACTION: Partial<Record<StatutMission, string>> = {
  a_faire: "Démarrer",
  en_cours: "Terminer",
};

interface CarteMissionProps {
  mission: MissionDuJour;
  contexteHref?: string;
}

export function CarteMission({ mission, contexteHref }: CarteMissionProps) {
  const prochainStatut = PROCHAIN_STATUT[mission.statut];

  return (
    <div className="flex items-center justify-between rounded-card border border-navy/10 bg-white p-6">
      <Link href={`/ma-journee/${mission.id}`} className="hover:underline">
        <p className="font-medium text-navy">{mission.patientNom}</p>
        <p className="text-sm text-navy/60">
          {mission.typeSoin} · {mission.heurePrevue}
        </p>
      </Link>
      <div className="flex items-center gap-4">
        {contexteHref && (
          <Link href={contexteHref}>
            <Button variant="tertiary">Contexte clinique</Button>
          </Link>
        )}
        <span className={`rounded-full px-2 py-2 text-xs font-medium ${STATUT_CLASSES[mission.statut]}`}>
          {STATUT_LABEL[mission.statut]}
        </span>
        {prochainStatut && (
          <form action={updateMissionStatutAction}>
            <input type="hidden" name="missionId" value={mission.id} />
            <input type="hidden" name="nouveauStatut" value={prochainStatut} />
            <Button type="submit" variant="secondary">
              {LIBELLE_ACTION[mission.statut]}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run lib/data/ma-journee.test.ts components/ui/CarteMission.test.tsx`
Expected: PASS (tous les tests, existants et nouveaux)

- [ ] **Step 8: Vérifier la compilation et le lint**

Run: `npm run build`
Expected: PASS (0 erreur TypeScript)

Run: `npx eslint lib/types/clinical.ts lib/types/database.types.ts lib/data/ma-journee.ts components/ui/CarteMission.tsx`
Expected: PASS (0 erreur)

- [ ] **Step 9: Commit**

```bash
git add lib/types/clinical.ts lib/types/database.types.ts lib/data/ma-journee.ts lib/data/ma-journee.test.ts components/ui/CarteMission.tsx components/ui/CarteMission.test.tsx
git commit -m "feat(patients): jointure patients dans la couche données + getMissionDetail"
```

---

### Task 3: Server Actions — `updateConsignesAction` + revalidation du nouvel écran

**Files:**
- Modify: `lib/data/ma-journee-actions.ts`
- Modify: `lib/data/ma-journee-actions.test.ts`

**Interfaces:**
- Consomme : rien de nouveau (utilise `createClient` déjà importé).
- Produces :
  `updateConsignesAction(formData: FormData): Promise<void>` — consommée
  par la Tâche 4 (nouvel écran).

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
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npx vitest run lib/data/ma-journee-actions.test.ts`
Expected: FAIL — `updateConsignesAction` n'existe pas encore, et
`updateMissionStatutAction` n'appelle pas encore `revalidatePath` pour le
deuxième chemin.

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

  if (!mission || TRANSITIONS_VALIDES[mission.statut as StatutMission] !== nouveauStatut) {
    return;
  }

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
```

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run lib/data/ma-journee-actions.test.ts`
Expected: PASS (7 tests : 5 existants mis à jour + 2 nouveaux)

- [ ] **Step 5: Vérifier la compilation et le lint**

Run: `npm run build`
Expected: PASS (0 erreur TypeScript)

Run: `npx eslint lib/data/ma-journee-actions.ts`
Expected: PASS (0 erreur)

- [ ] **Step 6: Commit**

```bash
git add lib/data/ma-journee-actions.ts lib/data/ma-journee-actions.test.ts
git commit -m "feat(patients): updateConsignesAction + revalidation de l'écran détail"
```

---

### Task 4: Écran `/ma-journee/[missionId]`

**Files:**
- Create: `app/ma-journee/[missionId]/page.tsx`

**Interfaces:**
- Consomme : `getMissionDetail` (Tâche 2), `updateMissionStatutAction` +
  `updateConsignesAction` (Tâche 3), `createClient`
  (`lib/supabase/server.ts`, existant, inchangé), `Button`
  (`components/ui/Button.tsx`, existant, inchangé).

Ce fichier `app/ma-journee/[missionId]/page.tsx` coexiste avec
`app/ma-journee/page.tsx` (existant, inchangé après la Tâche 2) — Next.js
App Router supporte un `page.tsx` de niveau segment en plus d'un
sous-dossier dynamique `[missionId]/page.tsx` du même segment, sans
conflit (même pattern déjà utilisé pour `app/situations/page.tsx` et
`app/situations/[id]/page.tsx`).

- [ ] **Step 1: Créer l'écran**

Créer `app/ma-journee/[missionId]/page.tsx` :

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMissionDetail } from "@/lib/data/ma-journee";
import { updateConsignesAction, updateMissionStatutAction } from "@/lib/data/ma-journee-actions";
import { Button } from "@/components/ui/Button";
import type { StatutMission } from "@/lib/types/clinical";

const STATUT_LABEL: Record<StatutMission, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  terminee: "Terminée",
};

const PROCHAIN_STATUT: Partial<Record<StatutMission, StatutMission>> = {
  a_faire: "en_cours",
  en_cours: "terminee",
};

const LIBELLE_ACTION: Partial<Record<StatutMission, string>> = {
  a_faire: "Commencer le soin",
  en_cours: "Terminer",
};

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
        <h1 className="text-2xl font-semibold text-navy">{mission.patientNom}</h1>
        <p className="mt-1 text-navy/60">{mission.heurePrevue}</p>
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

      {prochainStatut && (
        <form action={updateMissionStatutAction}>
          <input type="hidden" name="missionId" value={mission.id} />
          <input type="hidden" name="nouveauStatut" value={prochainStatut} />
          <Button type="submit" variant="primary" className="w-full">
            {LIBELLE_ACTION[mission.statut]}
          </Button>
        </form>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Vérifier la compilation et le lint**

Run: `npm run build`
Expected: PASS (0 erreur TypeScript)

Run: `npx eslint app/ma-journee/[missionId]/page.tsx`
Expected: PASS (0 erreur)

- [ ] **Step 3: Lancer la suite complète**

Run: `npm test`
Expected: PASS (tous les tests existants + tous les nouveaux des tâches
précédentes, aucune régression)

- [ ] **Step 4: Commit**

```bash
git add "app/ma-journee/[missionId]/page.tsx"
git commit -m "feat(patients): écran /ma-journee/[missionId] (arrivée chez le patient)"
```

- [ ] **Step 5: Vérification manuelle post-déploiement (contrôleur, avec autorisation explicite du fondateur)**

Après fusion et déploiement, avec autorisation explicite du fondateur :
insérer un ou plusieurs patients de test (via API Admin/REST) puis des
missions de test pointant vers `patient_id`, pour le compte
`test-idel@soinely.dev` — toute fixture précédente référençant
`patient_label` a été supprimée par la migration de la Tâche 1. Vérifier
ensuite via une requête authentifiée : l'écran `/ma-journee/[missionId]`
affiche bien adresse/téléphone/allergie/consignes du patient de test ; le
bouton "Itinéraire" pointe vers l'URL Google Maps attendue ; l'édition des
consignes persiste en base et réapparaît après rechargement ; le bouton
"Commencer le soin" fait progresser le statut comme depuis Ma Journée.

---

## Résultat à la fin de ce plan

Une IDEL connectée peut taper sur le nom d'un patient depuis Ma Journée et
arriver sur un écran dédié affichant, sans recherche, adresse, téléphone,
acte prévu, allergie (si renseignée) et consignes éditables — avec un
bouton "Itinéraire" vers Google Maps et un CTA "Commencer le soin" qui
réutilise la transition de statut déjà en production.
