# Tableau de bord Patients — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à une IDEL de créer ses fiches patients complètes, de définir les soins à administrer à chacun (avec récurrence), et de voir la tournée du jour se générer automatiquement à partir de ces soins.

**Architecture:** Une nouvelle table `soins_prescrits` (récurrence détachée des missions concrètes) ; une couche données et des Server Actions dédiées (`lib/data/patients.ts`, `lib/data/patients-actions.ts`) ; un moteur de génération (`lib/data/generation-tournee.ts`) branché de façon transparente dans `getTourneeDuJour` existant ; trois nouvelles pages (`/patients`, `/patients/nouveau`, `/patients/[id]`) suivant le style utilitaire déjà établi (`rounded-card`, composant `Button`, pas de branding marketing).

**Tech Stack:** Next.js (App Router, Server Actions), Supabase (Postgres + RLS), Vitest.

Spec de référence : `docs/superpowers/specs/2026-07-18-tableau-de-bord-patients-design.md`.

## Global Constraints

- `jours_semaine` suit la convention `Date.getUTCDay()` de JavaScript : 0 = dimanche … 6 = samedi. Toujours calculer via `new Date(\`${date}T00:00:00Z\`).getUTCDay()`, jamais via `new Date(date).getDay()` (sensible au fuseau horaire local).
- `idel_id` est dupliqué sur `soins_prescrits` (pas de jointure via `patient_id` pour la policy RLS) — même convention que `patients.idel_id` et `tournees.idel_id`.
- Durée par mission générée : constante codée en dur `DUREE_PAR_MISSION_MIN = 20` (minutes). Pas de champ dédié pour cette v1.
- Comptage des statistiques (`nb_injections`, `nb_pansements`, `nb_glycemies`) : correspondance insensible à la casse d'un mot-clé (`"injection"`, `"pansement"`, `"glyc"`) dans `type_soin`. Un soin qui ne correspond à aucun mot-clé compte dans `nb_patients` uniquement.
- Les Server Actions de lecture/mise à jour (`updatePatientAction`, `arreterSoinPrescritAction`) ne vérifient pas l'authentification explicitement — comme `updateConsignesAction`/`updateMissionStatutAction` déjà dans `lib/data/ma-journee-actions.ts`, elles s'appuient sur RLS. Seules les Server Actions de **création** (`createPatientAction`, `createSoinPrescritAction`) appellent `supabase.auth.getUser()`, car elles doivent connaître `idel_id` pour l'insertion.
- Toute nouvelle page suit le style utilitaire déjà établi (`app/ma-journee/[missionId]/page.tsx`, `app/compte/page.tsx` avant sa refonte visuelle) : `mx-auto max-w-2xl flex flex-col gap-6 p-6`, sections `rounded-card border border-navy/10 bg-white p-6`, composant `Button` (`@/components/ui/Button`) — **pas** le traitement marketing (police display, pilules navy) utilisé sur `/abonnement`.
- `Patient` (type existant, utilisé par `MissionDetail.patient`) **n'est pas modifié**. Les nouveaux champs de fiche patient vivent sur un nouveau type `PatientComplet extends Patient`, pour ne rien casser sur `/ma-journee/[missionId]`.
- Aucune suppression de patient ni de soin prescrit dans ce chantier (voir spec, Hors scope).

---

### Task 1: Migration — fiche patient étendue + table `soins_prescrits`

**Files:**
- Create: `supabase/migrations/20260718000000_soins_prescrits.sql`
- Modify: `lib/types/database.types.ts`

**Interfaces:**
- Produces: table `public.soins_prescrits` (colonnes : `id`, `patient_id`, `idel_id`, `type_soin`, `frequence_type`, `jours_semaine`, `intervalle_jours`, `heures`, `date_debut`, `date_fin`, `actif`, `created_at`) ; colonnes ajoutées sur `public.patients` (`medecin_nom`, `medecin_telephone`, `contact_urgence_nom`, `contact_urgence_telephone`, `antecedents`, `traitements_en_cours`).

- [ ] **Step 1: Écrire la migration**

Créer `supabase/migrations/20260718000000_soins_prescrits.sql` :

```sql
-- Fiche patient complète.
alter table public.patients
  add column medecin_nom text,
  add column medecin_telephone text,
  add column contact_urgence_nom text,
  add column contact_urgence_telephone text,
  add column antecedents text,
  add column traitements_en_cours text;

-- Soins prescrits : récurrence détachée des missions concrètes.
create table public.soins_prescrits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  idel_id uuid not null references public.profiles(id) on delete cascade,
  type_soin text not null,
  frequence_type text not null check (frequence_type in ('jours_semaine', 'tous_les_x_jours', 'quotidien', 'ponctuel')),
  jours_semaine int[],
  intervalle_jours int,
  heures time[] not null,
  date_debut date not null default current_date,
  date_fin date,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  check (
    (frequence_type = 'jours_semaine' and jours_semaine is not null and intervalle_jours is null)
    or (frequence_type = 'tous_les_x_jours' and intervalle_jours is not null and jours_semaine is null)
    or (frequence_type in ('quotidien', 'ponctuel') and jours_semaine is null and intervalle_jours is null)
  )
);

alter table public.soins_prescrits enable row level security;

create policy "soins_prescrits_owner_all" on public.soins_prescrits
  for all using (auth.uid() = idel_id) with check (auth.uid() = idel_id);
```

- [ ] **Step 2: Mettre à jour les types générés (`lib/types/database.types.ts`)**

Dans le bloc `patients` (`Row`/`Insert`/`Update`), ajouter les 6 nouveaux champs, en ordre alphabétique :

```ts
      patients: {
        Row: {
          adresse: string
          allergies: string | null
          antecedents: string | null
          consignes: string | null
          contact_urgence_nom: string | null
          contact_urgence_telephone: string | null
          created_at: string
          date_naissance: string | null
          id: string
          idel_id: string
          medecin_nom: string | null
          medecin_telephone: string | null
          nom_complet: string
          telephone: string
          traitements_en_cours: string | null
        }
        Insert: {
          adresse: string
          allergies?: string | null
          antecedents?: string | null
          consignes?: string | null
          contact_urgence_nom?: string | null
          contact_urgence_telephone?: string | null
          created_at?: string
          date_naissance?: string | null
          id?: string
          idel_id: string
          medecin_nom?: string | null
          medecin_telephone?: string | null
          nom_complet: string
          telephone: string
          traitements_en_cours?: string | null
        }
        Update: {
          adresse?: string
          allergies?: string | null
          antecedents?: string | null
          consignes?: string | null
          contact_urgence_nom?: string | null
          contact_urgence_telephone?: string | null
          created_at?: string
          date_naissance?: string | null
          id?: string
          idel_id?: string
          medecin_nom?: string | null
          medecin_telephone?: string | null
          nom_complet?: string
          telephone?: string
          traitements_en_cours?: string | null
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

(Remplace le bloc `patients` existant à `lib/types/database.types.ts:212-255`.)

Puis, entre le bloc `situations_terrain` (qui se termine par `Relationships: []` puis `}` à la ligne 330) et le bloc `tournees` (ligne 331), insérer un nouveau bloc `soins_prescrits` (ordre alphabétique : `situations_terrain` < `soins_prescrits` < `tournees`) :

```ts
      soins_prescrits: {
        Row: {
          actif: boolean
          created_at: string
          date_debut: string
          date_fin: string | null
          frequence_type: string
          heures: string[]
          id: string
          idel_id: string
          intervalle_jours: number | null
          jours_semaine: number[] | null
          patient_id: string
          type_soin: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          date_debut?: string
          date_fin?: string | null
          frequence_type: string
          heures: string[]
          id?: string
          idel_id: string
          intervalle_jours?: number | null
          jours_semaine?: number[] | null
          patient_id: string
          type_soin: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          date_debut?: string
          date_fin?: string | null
          frequence_type?: string
          heures?: string[]
          id?: string
          idel_id?: string
          intervalle_jours?: number | null
          jours_semaine?: number[] | null
          patient_id?: string
          type_soin?: string
        }
        Relationships: [
          {
            foreignKeyName: "soins_prescrits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soins_prescrits_idel_id_fkey"
            columns: ["idel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
```

- [ ] **Step 3: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit`
Expected: aucune erreur (ce fichier n'est encore consommé par aucun code, donc aucune régression possible à ce stade).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260718000000_soins_prescrits.sql lib/types/database.types.ts
git commit -m "feat(patients): migration fiche patient étendue + table soins_prescrits"
```

---

### Task 2: Types (`lib/types/clinical.ts`)

**Files:**
- Modify: `lib/types/clinical.ts`

**Interfaces:**
- Consumes: rien de nouveau côté code (types purs).
- Produces: `PatientComplet`, `FrequenceSoin`, `SoinPrescrit` — utilisés par les tâches 3 à 12.

- [ ] **Step 1: Ajouter les nouveaux types**

Dans `lib/types/clinical.ts`, juste après l'interface `Patient` existante (ligne 37), ajouter :

```ts
export interface PatientComplet extends Patient {
  medecinNom: string | null;
  medecinTelephone: string | null;
  contactUrgenceNom: string | null;
  contactUrgenceTelephone: string | null;
  antecedents: string | null;
  traitementsEnCours: string | null;
}

export type FrequenceSoin = "jours_semaine" | "tous_les_x_jours" | "quotidien" | "ponctuel";

export interface SoinPrescrit {
  id: string;
  patientId: string;
  typeSoin: string;
  frequenceType: FrequenceSoin;
  joursSemaine: number[] | null;
  intervalleJours: number | null;
  heures: string[];
  dateDebut: string;
  dateFin: string | null;
  actif: boolean;
}
```

- [ ] **Step 2: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add lib/types/clinical.ts
git commit -m "feat(patients): types PatientComplet, FrequenceSoin, SoinPrescrit"
```

---

### Task 3: Couche données lecture (`lib/data/patients.ts`)

**Files:**
- Create: `lib/data/patients.ts`
- Create: `lib/data/patients.test.ts`

**Interfaces:**
- Consumes: `PatientComplet`, `SoinPrescrit` (Task 2).
- Produces: `getPatients(supabase, idelId): Promise<PatientComplet[]>`, `getPatient(supabase, patientId): Promise<PatientComplet | null>`, `getSoinsPrescrits(supabase, patientId): Promise<SoinPrescrit[]>` — consommées par les tâches 9, 11, 12.

- [ ] **Step 1: Écrire les tests**

Créer `lib/data/patients.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("getPatients", () => {
  it("mappe les patients triés par nom", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () =>
              Promise.resolve({
                data: [
                  {
                    id: "p1",
                    nom_complet: "Mme Dupont",
                    adresse: "12 rue des Lilas",
                    telephone: "0601020304",
                    allergies: null,
                    consignes: null,
                    date_naissance: null,
                    medecin_nom: null,
                    medecin_telephone: null,
                    contact_urgence_nom: null,
                    contact_urgence_telephone: null,
                    antecedents: null,
                    traitements_en_cours: null,
                  },
                ],
                error: null,
              }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getPatients } = await import("./patients");
    const patients = await getPatients(fakeClient, "u1");

    expect(patients).toEqual([
      {
        id: "p1",
        nomComplet: "Mme Dupont",
        adresse: "12 rue des Lilas",
        telephone: "0601020304",
        allergies: null,
        consignes: null,
        dateNaissance: null,
        medecinNom: null,
        medecinTelephone: null,
        contactUrgenceNom: null,
        contactUrgenceTelephone: null,
        antecedents: null,
        traitementsEnCours: null,
      },
    ]);
  });

  it("retourne un tableau vide si aucun patient", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: null, error: { message: "boom" } }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getPatients } = await import("./patients");
    const patients = await getPatients(fakeClient, "u1");

    expect(patients).toEqual([]);
  });
});

describe("getPatient", () => {
  it("mappe la fiche patient complète", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: {
                  id: "p1",
                  nom_complet: "Mme Dupont",
                  adresse: "12 rue des Lilas",
                  telephone: "0601020304",
                  allergies: "Pénicilline",
                  consignes: "Sonner au portail",
                  date_naissance: "1950-03-12",
                  medecin_nom: "Dr Martin",
                  medecin_telephone: "0102030405",
                  contact_urgence_nom: "M. Dupont",
                  contact_urgence_telephone: "0605040302",
                  antecedents: "Diabète type 2",
                  traitements_en_cours: "Metformine",
                },
                error: null,
              }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getPatient } = await import("./patients");
    const patient = await getPatient(fakeClient, "p1");

    expect(patient).toEqual({
      id: "p1",
      nomComplet: "Mme Dupont",
      adresse: "12 rue des Lilas",
      telephone: "0601020304",
      allergies: "Pénicilline",
      consignes: "Sonner au portail",
      dateNaissance: "1950-03-12",
      medecinNom: "Dr Martin",
      medecinTelephone: "0102030405",
      contactUrgenceNom: "M. Dupont",
      contactUrgenceTelephone: "0605040302",
      antecedents: "Diabète type 2",
      traitementsEnCours: "Metformine",
    });
  });

  it("retourne null si le patient n'existe pas", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getPatient } = await import("./patients");
    const patient = await getPatient(fakeClient, "inconnu");

    expect(patient).toBeNull();
  });
});

describe("getSoinsPrescrits", () => {
  it("mappe les soins prescrits, actifs et arrêtés", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () =>
              Promise.resolve({
                data: [
                  {
                    id: "s1",
                    patient_id: "p1",
                    type_soin: "Pansement",
                    frequence_type: "jours_semaine",
                    jours_semaine: [1, 3, 5],
                    intervalle_jours: null,
                    heures: ["10:00:00"],
                    date_debut: "2026-07-01",
                    date_fin: null,
                    actif: true,
                  },
                  {
                    id: "s2",
                    patient_id: "p1",
                    type_soin: "Injection",
                    frequence_type: "quotidien",
                    jours_semaine: null,
                    intervalle_jours: null,
                    heures: ["08:00:00"],
                    date_debut: "2026-06-01",
                    date_fin: "2026-06-30",
                    actif: false,
                  },
                ],
                error: null,
              }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getSoinsPrescrits } = await import("./patients");
    const soins = await getSoinsPrescrits(fakeClient, "p1");

    expect(soins).toEqual([
      {
        id: "s1",
        patientId: "p1",
        typeSoin: "Pansement",
        frequenceType: "jours_semaine",
        joursSemaine: [1, 3, 5],
        intervalleJours: null,
        heures: ["10:00:00"],
        dateDebut: "2026-07-01",
        dateFin: null,
        actif: true,
      },
      {
        id: "s2",
        patientId: "p1",
        typeSoin: "Injection",
        frequenceType: "quotidien",
        joursSemaine: null,
        intervalleJours: null,
        heures: ["08:00:00"],
        dateDebut: "2026-06-01",
        dateFin: "2026-06-30",
        actif: false,
      },
    ]);
  });
});
```

- [ ] **Step 2: Run pour confirmer l'échec**

Run: `npx vitest run lib/data/patients.test.ts`
Expected: FAIL — `Cannot find module './patients'`

- [ ] **Step 3: Implémenter `lib/data/patients.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import type { FrequenceSoin, PatientComplet, SoinPrescrit } from "@/lib/types/clinical";

const CHAMPS_PATIENT =
  "id, nom_complet, adresse, telephone, allergies, consignes, date_naissance, medecin_nom, medecin_telephone, contact_urgence_nom, contact_urgence_telephone, antecedents, traitements_en_cours";

type PatientRow = {
  id: string;
  nom_complet: string;
  adresse: string;
  telephone: string;
  allergies: string | null;
  consignes: string | null;
  date_naissance: string | null;
  medecin_nom: string | null;
  medecin_telephone: string | null;
  contact_urgence_nom: string | null;
  contact_urgence_telephone: string | null;
  antecedents: string | null;
  traitements_en_cours: string | null;
};

function mapPatientRow(row: PatientRow): PatientComplet {
  return {
    id: row.id,
    nomComplet: row.nom_complet,
    adresse: row.adresse,
    telephone: row.telephone,
    allergies: row.allergies,
    consignes: row.consignes,
    dateNaissance: row.date_naissance,
    medecinNom: row.medecin_nom,
    medecinTelephone: row.medecin_telephone,
    contactUrgenceNom: row.contact_urgence_nom,
    contactUrgenceTelephone: row.contact_urgence_telephone,
    antecedents: row.antecedents,
    traitementsEnCours: row.traitements_en_cours,
  };
}

export async function getPatients(
  supabase: SupabaseClient<Database>,
  idelId: string
): Promise<PatientComplet[]> {
  const { data, error } = await supabase
    .from("patients")
    .select(CHAMPS_PATIENT)
    .eq("idel_id", idelId)
    .order("nom_complet");

  if (error || !data) return [];

  return (data as PatientRow[]).map(mapPatientRow);
}

export async function getPatient(
  supabase: SupabaseClient<Database>,
  patientId: string
): Promise<PatientComplet | null> {
  const { data, error } = await supabase
    .from("patients")
    .select(CHAMPS_PATIENT)
    .eq("id", patientId)
    .maybeSingle();

  if (error || !data) return null;

  return mapPatientRow(data as PatientRow);
}

export async function getSoinsPrescrits(
  supabase: SupabaseClient<Database>,
  patientId: string
): Promise<SoinPrescrit[]> {
  const { data, error } = await supabase
    .from("soins_prescrits")
    .select(
      "id, patient_id, type_soin, frequence_type, jours_semaine, intervalle_jours, heures, date_debut, date_fin, actif"
    )
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    patientId: row.patient_id,
    typeSoin: row.type_soin,
    frequenceType: row.frequence_type as FrequenceSoin,
    joursSemaine: row.jours_semaine,
    intervalleJours: row.intervalle_jours,
    heures: row.heures,
    dateDebut: row.date_debut,
    dateFin: row.date_fin,
    actif: row.actif,
  }));
}
```

- [ ] **Step 4: Run pour confirmer le succès**

Run: `npx vitest run lib/data/patients.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/data/patients.ts lib/data/patients.test.ts
git commit -m "feat(patients): couche données lecture (getPatients, getPatient, getSoinsPrescrits)"
```

---

### Task 4: Server Actions patient (`lib/data/patients-actions.ts`)

**Files:**
- Create: `lib/data/patients-actions.ts`
- Create: `lib/data/patients-actions.test.ts`

**Interfaces:**
- Consumes: `createClient` (`@/lib/supabase/server`), `revalidatePath` (`next/cache`), `redirect` (`next/navigation`).
- Produces: `createPatientAction(formData): Promise<void>`, `updatePatientAction(formData): Promise<void>` — consommées par les tâches 10 et 11. Le fichier de test posé ici (mocks partagés) est complété à la Task 5.

- [ ] **Step 1: Écrire les tests**

Créer `lib/data/patients-actions.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const singleInsertMock = vi.fn();
const selectAfterInsertMock = vi.fn(() => ({ single: singleInsertMock }));
const insertMock = vi.fn(() => ({ select: selectAfterInsertMock }));
const eqUpdateMock = vi.fn();
const updateMock = vi.fn(() => ({ eq: eqUpdateMock }));
const fromMock = vi.fn(() => ({ insert: insertMock, update: updateMock }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const redirectMock = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createPatientAction", () => {
  it("crée le patient avec tous les champs et redirige vers sa fiche", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    singleInsertMock.mockResolvedValue({ data: { id: "p1" }, error: null });

    const { createPatientAction } = await import("./patients-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("nomComplet", "Mme Dupont");
    formData.set("adresse", "12 rue des Lilas");
    formData.set("telephone", "0601020304");
    formData.set("dateNaissance", "1950-03-12");
    formData.set("allergies", "Pénicilline");
    formData.set("medecinNom", "Dr Martin");

    await createPatientAction(formData);

    expect(fromMock).toHaveBeenCalledWith("patients");
    expect(insertMock).toHaveBeenCalledWith({
      idel_id: "u1",
      nom_complet: "Mme Dupont",
      adresse: "12 rue des Lilas",
      telephone: "0601020304",
      date_naissance: "1950-03-12",
      allergies: "Pénicilline",
      consignes: null,
      medecin_nom: "Dr Martin",
      medecin_telephone: null,
      contact_urgence_nom: null,
      contact_urgence_telephone: null,
      antecedents: null,
      traitements_en_cours: null,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/patients");
    expect(redirectMock).toHaveBeenCalledWith("/patients/p1");
  });

  it("ne fait rien si un champ obligatoire est manquant", async () => {
    const { createPatientAction } = await import("./patients-actions");

    const formData = new FormData();
    formData.set("nomComplet", "Mme Dupont");

    await createPatientAction(formData);

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("ne fait rien si l'utilisateur n'est pas authentifié", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const { createPatientAction } = await import("./patients-actions");

    const formData = new FormData();
    formData.set("nomComplet", "Mme Dupont");
    formData.set("adresse", "12 rue des Lilas");
    formData.set("telephone", "0601020304");

    await createPatientAction(formData);

    expect(insertMock).not.toHaveBeenCalled();
  });
});

describe("updatePatientAction", () => {
  it("met à jour tous les champs de la fiche patient et invalide le cache", async () => {
    eqUpdateMock.mockResolvedValue({ error: null });

    const { updatePatientAction } = await import("./patients-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("patientId", "p1");
    formData.set("nomComplet", "Mme Dupont");
    formData.set("adresse", "12 rue des Lilas");
    formData.set("telephone", "0601020304");
    formData.set("medecinNom", "Dr Martin");

    await updatePatientAction(formData);

    expect(fromMock).toHaveBeenCalledWith("patients");
    expect(updateMock).toHaveBeenCalledWith({
      nom_complet: "Mme Dupont",
      adresse: "12 rue des Lilas",
      telephone: "0601020304",
      date_naissance: null,
      allergies: null,
      consignes: null,
      medecin_nom: "Dr Martin",
      medecin_telephone: null,
      contact_urgence_nom: null,
      contact_urgence_telephone: null,
      antecedents: null,
      traitements_en_cours: null,
    });
    expect(eqUpdateMock).toHaveBeenCalledWith("id", "p1");
    expect(revalidatePath).toHaveBeenCalledWith("/patients/p1");
  });

  it("ne fait rien si un champ obligatoire est manquant", async () => {
    const { updatePatientAction } = await import("./patients-actions");

    const formData = new FormData();
    formData.set("patientId", "p1");
    formData.set("nomComplet", "Mme Dupont");

    await updatePatientAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run pour confirmer l'échec**

Run: `npx vitest run lib/data/patients-actions.test.ts`
Expected: FAIL — `Cannot find module './patients-actions'`

- [ ] **Step 3: Implémenter `lib/data/patients-actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function champTexteOuNull(formData: FormData, nom: string): string | null {
  const valeur = String(formData.get(nom) ?? "");
  return valeur || null;
}

export async function createPatientAction(formData: FormData): Promise<void> {
  const nomComplet = String(formData.get("nomComplet"));
  const adresse = String(formData.get("adresse"));
  const telephone = String(formData.get("telephone"));

  if (!nomComplet || !adresse || !telephone) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: patient, error } = await supabase
    .from("patients")
    .insert({
      idel_id: user.id,
      nom_complet: nomComplet,
      adresse,
      telephone,
      date_naissance: champTexteOuNull(formData, "dateNaissance"),
      allergies: champTexteOuNull(formData, "allergies"),
      consignes: champTexteOuNull(formData, "consignes"),
      medecin_nom: champTexteOuNull(formData, "medecinNom"),
      medecin_telephone: champTexteOuNull(formData, "medecinTelephone"),
      contact_urgence_nom: champTexteOuNull(formData, "contactUrgenceNom"),
      contact_urgence_telephone: champTexteOuNull(formData, "contactUrgenceTelephone"),
      antecedents: champTexteOuNull(formData, "antecedents"),
      traitements_en_cours: champTexteOuNull(formData, "traitementsEnCours"),
    })
    .select("id")
    .single();

  if (error || !patient) return;

  revalidatePath("/patients");
  redirect(`/patients/${patient.id}`);
}

export async function updatePatientAction(formData: FormData): Promise<void> {
  const patientId = String(formData.get("patientId"));
  const nomComplet = String(formData.get("nomComplet"));
  const adresse = String(formData.get("adresse"));
  const telephone = String(formData.get("telephone"));

  if (!nomComplet || !adresse || !telephone) return;

  const supabase = await createClient();

  await supabase
    .from("patients")
    .update({
      nom_complet: nomComplet,
      adresse,
      telephone,
      date_naissance: champTexteOuNull(formData, "dateNaissance"),
      allergies: champTexteOuNull(formData, "allergies"),
      consignes: champTexteOuNull(formData, "consignes"),
      medecin_nom: champTexteOuNull(formData, "medecinNom"),
      medecin_telephone: champTexteOuNull(formData, "medecinTelephone"),
      contact_urgence_nom: champTexteOuNull(formData, "contactUrgenceNom"),
      contact_urgence_telephone: champTexteOuNull(formData, "contactUrgenceTelephone"),
      antecedents: champTexteOuNull(formData, "antecedents"),
      traitements_en_cours: champTexteOuNull(formData, "traitementsEnCours"),
    })
    .eq("id", patientId);

  revalidatePath(`/patients/${patientId}`);
}
```

- [ ] **Step 4: Run pour confirmer le succès**

Run: `npx vitest run lib/data/patients-actions.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/data/patients-actions.ts lib/data/patients-actions.test.ts
git commit -m "feat(patients): Server Actions createPatientAction, updatePatientAction"
```

---

### Task 5: Server Actions soins prescrits (`lib/data/patients-actions.ts`, modifié)

**Files:**
- Modify: `lib/data/patients-actions.ts`
- Modify: `lib/data/patients-actions.test.ts`

**Interfaces:**
- Consumes: `FrequenceSoin` (Task 2), mocks déjà en place (Task 4).
- Produces: `createSoinPrescritAction(formData): Promise<void>`, `arreterSoinPrescritAction(formData): Promise<void>` — consommées par la Task 12.

- [ ] **Step 1: Ajouter les tests**

Ajouter à la fin de `lib/data/patients-actions.test.ts` :

```ts
describe("createSoinPrescritAction", () => {
  it("crée un soin quotidien avec plusieurs heures", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    singleInsertMock.mockResolvedValue({ data: { id: "s1" }, error: null });

    const { createSoinPrescritAction } = await import("./patients-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("patientId", "p1");
    formData.set("typeSoin", "Glycémie");
    formData.set("frequenceType", "quotidien");
    formData.set("heures", "07:00, 19:00");
    formData.set("dateDebut", "2026-07-15");

    await createSoinPrescritAction(formData);

    expect(fromMock).toHaveBeenCalledWith("soins_prescrits");
    expect(insertMock).toHaveBeenCalledWith({
      patient_id: "p1",
      idel_id: "u1",
      type_soin: "Glycémie",
      frequence_type: "quotidien",
      jours_semaine: null,
      intervalle_jours: null,
      heures: ["07:00", "19:00"],
      date_debut: "2026-07-15",
      date_fin: null,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/patients/p1");
  });

  it("crée un soin à jours de semaine précis avec les jours cochés", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    singleInsertMock.mockResolvedValue({ data: { id: "s2" }, error: null });

    const { createSoinPrescritAction } = await import("./patients-actions");

    const formData = new FormData();
    formData.set("patientId", "p1");
    formData.set("typeSoin", "Pansement");
    formData.set("frequenceType", "jours_semaine");
    formData.append("joursSemaine", "1");
    formData.append("joursSemaine", "3");
    formData.append("joursSemaine", "5");
    formData.set("heures", "10:00");
    formData.set("dateDebut", "2026-07-15");

    await createSoinPrescritAction(formData);

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ jours_semaine: [1, 3, 5], intervalle_jours: null })
    );
  });

  it("crée un soin tous les X jours avec l'intervalle", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    singleInsertMock.mockResolvedValue({ data: { id: "s3" }, error: null });

    const { createSoinPrescritAction } = await import("./patients-actions");

    const formData = new FormData();
    formData.set("patientId", "p1");
    formData.set("typeSoin", "Pansement");
    formData.set("frequenceType", "tous_les_x_jours");
    formData.set("intervalleJours", "2");
    formData.set("heures", "10:00");
    formData.set("dateDebut", "2026-07-15");

    await createSoinPrescritAction(formData);

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ intervalle_jours: 2, jours_semaine: null })
    );
  });

  it("crée un soin ponctuel", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    singleInsertMock.mockResolvedValue({ data: { id: "s4" }, error: null });

    const { createSoinPrescritAction } = await import("./patients-actions");

    const formData = new FormData();
    formData.set("patientId", "p1");
    formData.set("typeSoin", "Prise de sang");
    formData.set("frequenceType", "ponctuel");
    formData.set("heures", "08:30");
    formData.set("dateDebut", "2026-07-20");

    await createSoinPrescritAction(formData);

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ frequence_type: "ponctuel", date_debut: "2026-07-20" })
    );
  });

  it("rejette une date de fin antérieure à la date de début", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });

    const { createSoinPrescritAction } = await import("./patients-actions");

    const formData = new FormData();
    formData.set("patientId", "p1");
    formData.set("typeSoin", "Pansement");
    formData.set("frequenceType", "quotidien");
    formData.set("heures", "10:00");
    formData.set("dateDebut", "2026-07-15");
    formData.set("dateFin", "2026-07-01");

    await createSoinPrescritAction(formData);

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejette un soin jours_semaine sans aucun jour coché", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });

    const { createSoinPrescritAction } = await import("./patients-actions");

    const formData = new FormData();
    formData.set("patientId", "p1");
    formData.set("typeSoin", "Pansement");
    formData.set("frequenceType", "jours_semaine");
    formData.set("heures", "10:00");
    formData.set("dateDebut", "2026-07-15");

    await createSoinPrescritAction(formData);

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejette un format d'heure invalide", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });

    const { createSoinPrescritAction } = await import("./patients-actions");

    const formData = new FormData();
    formData.set("patientId", "p1");
    formData.set("typeSoin", "Pansement");
    formData.set("frequenceType", "quotidien");
    formData.set("heures", "pas une heure");
    formData.set("dateDebut", "2026-07-15");

    await createSoinPrescritAction(formData);

    expect(insertMock).not.toHaveBeenCalled();
  });
});

describe("arreterSoinPrescritAction", () => {
  it("passe le soin à inactif et invalide le cache", async () => {
    eqUpdateMock.mockResolvedValue({ error: null });

    const { arreterSoinPrescritAction } = await import("./patients-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("soinId", "s1");
    formData.set("patientId", "p1");

    await arreterSoinPrescritAction(formData);

    expect(fromMock).toHaveBeenCalledWith("soins_prescrits");
    expect(updateMock).toHaveBeenCalledWith({ actif: false });
    expect(eqUpdateMock).toHaveBeenCalledWith("id", "s1");
    expect(revalidatePath).toHaveBeenCalledWith("/patients/p1");
  });
});
```

- [ ] **Step 2: Run pour confirmer l'échec**

Run: `npx vitest run lib/data/patients-actions.test.ts`
Expected: FAIL — `createSoinPrescritAction`/`arreterSoinPrescritAction` non exportées.

- [ ] **Step 3: Ajouter les actions dans `lib/data/patients-actions.ts`**

Ajouter à la fin du fichier, avec l'import `FrequenceSoin` en tête de fichier :

```ts
import type { FrequenceSoin } from "@/lib/types/clinical";
```

```ts
export async function createSoinPrescritAction(formData: FormData): Promise<void> {
  const patientId = String(formData.get("patientId") ?? "");
  const typeSoin = String(formData.get("typeSoin") ?? "");
  const frequenceType = String(formData.get("frequenceType") ?? "") as FrequenceSoin;
  const heuresBrut = String(formData.get("heures") ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  const dateDebut = String(formData.get("dateDebut") ?? "");
  const dateFin = champTexteOuNull(formData, "dateFin");

  const heuresValides = heuresBrut.length > 0 && heuresBrut.every((h) => /^\d{2}:\d{2}$/.test(h));

  if (!patientId || !typeSoin || !frequenceType || !dateDebut || !heuresValides) return;
  if (dateFin && dateFin < dateDebut) return;

  let joursSemaine: number[] | null = null;
  let intervalleJours: number | null = null;

  if (frequenceType === "jours_semaine") {
    joursSemaine = formData.getAll("joursSemaine").map(Number);
    if (joursSemaine.length === 0) return;
  } else if (frequenceType === "tous_les_x_jours") {
    const valeur = Number(formData.get("intervalleJours"));
    if (!valeur || valeur < 1) return;
    intervalleJours = valeur;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("soins_prescrits")
    .insert({
      patient_id: patientId,
      idel_id: user.id,
      type_soin: typeSoin,
      frequence_type: frequenceType,
      jours_semaine: joursSemaine,
      intervalle_jours: intervalleJours,
      heures: heuresBrut,
      date_debut: dateDebut,
      date_fin: dateFin,
    })
    .select("id")
    .single();

  revalidatePath(`/patients/${patientId}`);
}

export async function arreterSoinPrescritAction(formData: FormData): Promise<void> {
  const soinId = String(formData.get("soinId"));
  const patientId = String(formData.get("patientId"));

  const supabase = await createClient();

  await supabase.from("soins_prescrits").update({ actif: false }).eq("id", soinId);

  revalidatePath(`/patients/${patientId}`);
}
```

- [ ] **Step 4: Run pour confirmer le succès**

Run: `npx vitest run lib/data/patients-actions.test.ts`
Expected: PASS (12 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/data/patients-actions.ts lib/data/patients-actions.test.ts
git commit -m "feat(patients): Server Actions createSoinPrescritAction, arreterSoinPrescritAction"
```

---

### Task 6: Moteur de récurrence — `estSoinDuAujourdhui` (`lib/data/generation-tournee.ts`)

**Files:**
- Create: `lib/data/generation-tournee.ts`
- Create: `lib/data/generation-tournee.test.ts`

**Interfaces:**
- Consumes: `FrequenceSoin` (Task 2).
- Produces: `SoinRecurrence` (type), `estSoinDuAujourdhui(soin, date): boolean` — consommée par la Task 7 (dans le même fichier).

- [ ] **Step 1: Écrire les tests**

Créer `lib/data/generation-tournee.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { estSoinDuAujourdhui } from "./generation-tournee";
import type { SoinRecurrence } from "./generation-tournee";

describe("estSoinDuAujourdhui", () => {
  it("soin ponctuel dû le jour exact", () => {
    const soin: SoinRecurrence = {
      frequenceType: "ponctuel",
      joursSemaine: null,
      intervalleJours: null,
      dateDebut: "2026-07-01",
      dateFin: null,
    };
    expect(estSoinDuAujourdhui(soin, "2026-07-01")).toBe(true);
  });

  it("soin ponctuel pas dû un autre jour", () => {
    const soin: SoinRecurrence = {
      frequenceType: "ponctuel",
      joursSemaine: null,
      intervalleJours: null,
      dateDebut: "2026-07-01",
      dateFin: null,
    };
    expect(estSoinDuAujourdhui(soin, "2026-07-02")).toBe(false);
  });

  it("soin quotidien dû tant qu'aucune date de fin n'est dépassée", () => {
    const soin: SoinRecurrence = {
      frequenceType: "quotidien",
      joursSemaine: null,
      intervalleJours: null,
      dateDebut: "2026-07-01",
      dateFin: null,
    };
    expect(estSoinDuAujourdhui(soin, "2026-07-15")).toBe(true);
  });

  it("soin quotidien pas dû après sa date de fin", () => {
    const soin: SoinRecurrence = {
      frequenceType: "quotidien",
      joursSemaine: null,
      intervalleJours: null,
      dateDebut: "2026-07-01",
      dateFin: "2026-07-10",
    };
    expect(estSoinDuAujourdhui(soin, "2026-07-13")).toBe(false);
  });

  it("soin à jours de semaine précis dû un jour correspondant (2026-07-08 est un mercredi, jour 3)", () => {
    const soin: SoinRecurrence = {
      frequenceType: "jours_semaine",
      joursSemaine: [1, 3, 5],
      intervalleJours: null,
      dateDebut: "2026-07-01",
      dateFin: null,
    };
    expect(estSoinDuAujourdhui(soin, "2026-07-08")).toBe(true);
  });

  it("soin à jours de semaine précis pas dû un jour ne correspondant pas (2026-07-02 est un jeudi, jour 4)", () => {
    const soin: SoinRecurrence = {
      frequenceType: "jours_semaine",
      joursSemaine: [1, 3, 5],
      intervalleJours: null,
      dateDebut: "2026-07-01",
      dateFin: null,
    };
    expect(estSoinDuAujourdhui(soin, "2026-07-02")).toBe(false);
  });

  it("soin tous les X jours dû quand l'écart est un multiple de l'intervalle", () => {
    const soin: SoinRecurrence = {
      frequenceType: "tous_les_x_jours",
      joursSemaine: null,
      intervalleJours: 2,
      dateDebut: "2026-07-01",
      dateFin: null,
    };
    expect(estSoinDuAujourdhui(soin, "2026-07-03")).toBe(true);
  });

  it("soin tous les X jours pas dû quand l'écart n'est pas un multiple", () => {
    const soin: SoinRecurrence = {
      frequenceType: "tous_les_x_jours",
      joursSemaine: null,
      intervalleJours: 2,
      dateDebut: "2026-07-01",
      dateFin: null,
    };
    expect(estSoinDuAujourdhui(soin, "2026-07-02")).toBe(false);
  });

  it("jamais dû avant sa date de début, quel que soit le type", () => {
    const soin: SoinRecurrence = {
      frequenceType: "quotidien",
      joursSemaine: null,
      intervalleJours: null,
      dateDebut: "2026-07-08",
      dateFin: null,
    };
    expect(estSoinDuAujourdhui(soin, "2026-07-01")).toBe(false);
  });
});
```

- [ ] **Step 2: Run pour confirmer l'échec**

Run: `npx vitest run lib/data/generation-tournee.test.ts`
Expected: FAIL — `Cannot find module './generation-tournee'`

- [ ] **Step 3: Implémenter la fonction de récurrence**

Créer `lib/data/generation-tournee.ts` :

```ts
import type { FrequenceSoin } from "@/lib/types/clinical";

export interface SoinRecurrence {
  frequenceType: FrequenceSoin;
  joursSemaine: number[] | null;
  intervalleJours: number | null;
  dateDebut: string;
  dateFin: string | null;
}

function jourSemaineUTC(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function joursEntre(dateDebut: string, date: string): number {
  const debut = new Date(`${dateDebut}T00:00:00Z`).getTime();
  const courante = new Date(`${date}T00:00:00Z`).getTime();
  return Math.round((courante - debut) / 86_400_000);
}

export function estSoinDuAujourdhui(soin: SoinRecurrence, date: string): boolean {
  if (date < soin.dateDebut) return false;
  if (soin.dateFin && date > soin.dateFin) return false;

  switch (soin.frequenceType) {
    case "ponctuel":
      return date === soin.dateDebut;
    case "quotidien":
      return true;
    case "jours_semaine":
      return (soin.joursSemaine ?? []).includes(jourSemaineUTC(date));
    case "tous_les_x_jours":
      return soin.intervalleJours ? joursEntre(soin.dateDebut, date) % soin.intervalleJours === 0 : false;
  }
}
```

- [ ] **Step 4: Run pour confirmer le succès**

Run: `npx vitest run lib/data/generation-tournee.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/data/generation-tournee.ts lib/data/generation-tournee.test.ts
git commit -m "feat(patients): moteur de récurrence estSoinDuAujourdhui"
```

---

### Task 7: Génération de la tournée — `genererTourneeDuJour` (`lib/data/generation-tournee.ts`, modifié)

**Files:**
- Modify: `lib/data/generation-tournee.ts`
- Modify: `lib/data/generation-tournee.test.ts`

**Interfaces:**
- Consumes: `estSoinDuAujourdhui`, `SoinRecurrence` (Task 6).
- Produces: `genererTourneeDuJour(supabase, idelId, date): Promise<void>` — consommée par la Task 8.

- [ ] **Step 1: Ajouter les tests**

Ajouter à la fin de `lib/data/generation-tournee.test.ts` (ajouter aussi `vi` à l'import de `vitest` en tête de fichier, et un import de `SupabaseClient`) :

```ts
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
```

(remplace la ligne d'import `vitest` existante à la Task 6)

```ts
describe("genererTourneeDuJour", () => {
  function buildFakeClient(soins: unknown[]) {
    const soinsEqActifMock = vi.fn(() => Promise.resolve({ data: soins, error: null }));
    const soinsEqIdelMock = vi.fn(() => ({ eq: soinsEqActifMock }));
    const soinsSelectMock = vi.fn(() => ({ eq: soinsEqIdelMock }));

    const tourneeInsertMock = vi.fn(() => ({
      select: () => ({
        single: () => Promise.resolve({ data: { id: "t-nouvelle" }, error: null }),
      }),
    }));
    const missionsInsertMock = vi.fn().mockResolvedValue({ error: null });
    const tourneeDeleteEqMock = vi.fn().mockResolvedValue({ error: null });
    const tourneeDeleteMock = vi.fn(() => ({ eq: tourneeDeleteEqMock }));

    const fromMock = vi.fn((table: string) => {
      if (table === "soins_prescrits") return { select: soinsSelectMock };
      if (table === "tournees") return { insert: tourneeInsertMock, delete: tourneeDeleteMock };
      if (table === "missions_du_jour") return { insert: missionsInsertMock };
      throw new Error(`table inattendue : ${table}`);
    });

    const fakeClient = { from: fromMock } as unknown as SupabaseClient;

    return {
      fakeClient,
      soinsEqIdelMock,
      soinsEqActifMock,
      tourneeInsertMock,
      missionsInsertMock,
      tourneeDeleteEqMock,
    };
  }

  it("filtre les soins par idel_id et par actif=true", async () => {
    const { fakeClient, soinsEqIdelMock, soinsEqActifMock } = buildFakeClient([]);

    const { genererTourneeDuJour } = await import("./generation-tournee");
    await genererTourneeDuJour(fakeClient, "u1", "2026-07-15");

    expect(soinsEqIdelMock).toHaveBeenCalledWith("idel_id", "u1");
    expect(soinsEqActifMock).toHaveBeenCalledWith("actif", true);
  });

  it("génère les missions des soins dus, triées par heure, avec les bonnes statistiques", async () => {
    const soins = [
      {
        patient_id: "p1",
        type_soin: "Pansement",
        frequence_type: "quotidien",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["10:00:00"],
        date_debut: "2026-07-01",
        date_fin: null,
      },
      {
        patient_id: "p2",
        type_soin: "Glycémie",
        frequence_type: "quotidien",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["07:00:00", "19:00:00"],
        date_debut: "2026-07-01",
        date_fin: null,
      },
      {
        patient_id: "p3",
        type_soin: "Prise de sang",
        frequence_type: "ponctuel",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["09:00:00"],
        date_debut: "2026-07-20",
        date_fin: null,
      },
    ];
    const { fakeClient, tourneeInsertMock, missionsInsertMock } = buildFakeClient(soins);

    const { genererTourneeDuJour } = await import("./generation-tournee");
    await genererTourneeDuJour(fakeClient, "u1", "2026-07-15");

    expect(tourneeInsertMock).toHaveBeenCalledWith({
      idel_id: "u1",
      date: "2026-07-15",
      nb_patients: 2,
      nb_injections: 0,
      nb_pansements: 1,
      nb_glycemies: 2,
      temps_estime_min: 60,
    });
    expect(missionsInsertMock).toHaveBeenCalledWith([
      {
        tournee_id: "t-nouvelle",
        patient_id: "p2",
        type_soin: "Glycémie",
        heure_prevue: "07:00:00",
        statut: "a_faire",
      },
      {
        tournee_id: "t-nouvelle",
        patient_id: "p1",
        type_soin: "Pansement",
        heure_prevue: "10:00:00",
        statut: "a_faire",
      },
      {
        tournee_id: "t-nouvelle",
        patient_id: "p2",
        type_soin: "Glycémie",
        heure_prevue: "19:00:00",
        statut: "a_faire",
      },
    ]);
  });

  it("compte 'Injection Lovenox' comme une injection", async () => {
    const soins = [
      {
        patient_id: "p4",
        type_soin: "Injection Lovenox",
        frequence_type: "quotidien",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["09:00:00"],
        date_debut: "2026-07-01",
        date_fin: null,
      },
    ];
    const { fakeClient, tourneeInsertMock } = buildFakeClient(soins);

    const { genererTourneeDuJour } = await import("./generation-tournee");
    await genererTourneeDuJour(fakeClient, "u1", "2026-07-15");

    expect(tourneeInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ nb_injections: 1, nb_patients: 1, temps_estime_min: 20 })
    );
  });

  it("un type de soin sans mot-clé connu ne compte que dans nb_patients", async () => {
    const soins = [
      {
        patient_id: "p5",
        type_soin: "Toilette",
        frequence_type: "quotidien",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["08:00:00"],
        date_debut: "2026-07-01",
        date_fin: null,
      },
    ];
    const { fakeClient, tourneeInsertMock } = buildFakeClient(soins);

    const { genererTourneeDuJour } = await import("./generation-tournee");
    await genererTourneeDuJour(fakeClient, "u1", "2026-07-15");

    expect(tourneeInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ nb_patients: 1, nb_injections: 0, nb_pansements: 0, nb_glycemies: 0 })
    );
  });

  it("aucun soin dû : crée une tournée à zéro sans insérer de mission", async () => {
    const soins = [
      {
        patient_id: "p1",
        type_soin: "Prise de sang",
        frequence_type: "ponctuel",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["09:00:00"],
        date_debut: "2026-07-20",
        date_fin: null,
      },
    ];
    const { fakeClient, tourneeInsertMock, missionsInsertMock } = buildFakeClient(soins);

    const { genererTourneeDuJour } = await import("./generation-tournee");
    await genererTourneeDuJour(fakeClient, "u1", "2026-07-15");

    expect(tourneeInsertMock).toHaveBeenCalledWith({
      idel_id: "u1",
      date: "2026-07-15",
      nb_patients: 0,
      nb_injections: 0,
      nb_pansements: 0,
      nb_glycemies: 0,
      temps_estime_min: 0,
    });
    expect(missionsInsertMock).not.toHaveBeenCalled();
  });

  it("n'insère aucune tournée si la lecture des soins échoue", async () => {
    const soinsEqActifMock = vi.fn(() => Promise.resolve({ data: null, error: { message: "boom" } }));
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
    await genererTourneeDuJour(fakeClient, "u1", "2026-07-15");

    expect(tourneeInsertMock).not.toHaveBeenCalled();
  });

  it("supprime la tournée si l'insertion des missions échoue", async () => {
    const soins = [
      {
        patient_id: "p1",
        type_soin: "Pansement",
        frequence_type: "quotidien",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["10:00:00"],
        date_debut: "2026-07-01",
        date_fin: null,
      },
    ];
    const { fakeClient, missionsInsertMock, tourneeDeleteEqMock } = buildFakeClient(soins);
    missionsInsertMock.mockResolvedValueOnce({ error: { message: "boom" } });

    const { genererTourneeDuJour } = await import("./generation-tournee");
    await genererTourneeDuJour(fakeClient, "u1", "2026-07-15");

    expect(tourneeDeleteEqMock).toHaveBeenCalledWith("id", "t-nouvelle");
  });
});
```

- [ ] **Step 2: Run pour confirmer l'échec**

Run: `npx vitest run lib/data/generation-tournee.test.ts`
Expected: FAIL — `genererTourneeDuJour` non exportée.

- [ ] **Step 3: Implémenter `genererTourneeDuJour`**

Ajouter à la fin de `lib/data/generation-tournee.ts`, avec les imports supplémentaires en tête de fichier :

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
```

```ts
const DUREE_PAR_MISSION_MIN = 20;

const MOTS_CLES_COMPTEUR: { cle: "nb_injections" | "nb_pansements" | "nb_glycemies"; motif: string }[] = [
  { cle: "nb_injections", motif: "injection" },
  { cle: "nb_pansements", motif: "pansement" },
  { cle: "nb_glycemies", motif: "glyc" },
];

interface MissionAGenerer {
  patient_id: string;
  type_soin: string;
  heure_prevue: string;
}

export async function genererTourneeDuJour(
  supabase: SupabaseClient<Database>,
  idelId: string,
  date: string
): Promise<void> {
  const { data: soins, error: soinsError } = await supabase
    .from("soins_prescrits")
    .select("patient_id, type_soin, frequence_type, jours_semaine, intervalle_jours, heures, date_debut, date_fin")
    .eq("idel_id", idelId)
    .eq("actif", true);

  if (soinsError) return;

  const missionsAGenerer: MissionAGenerer[] = [];
  const patientsDistincts = new Set<string>();

  for (const soin of soins ?? []) {
    const recurrence: SoinRecurrence = {
      frequenceType: soin.frequence_type as FrequenceSoin,
      joursSemaine: soin.jours_semaine,
      intervalleJours: soin.intervalle_jours,
      dateDebut: soin.date_debut,
      dateFin: soin.date_fin,
    };

    if (!estSoinDuAujourdhui(recurrence, date)) continue;

    patientsDistincts.add(soin.patient_id);
    for (const heure of soin.heures) {
      missionsAGenerer.push({ patient_id: soin.patient_id, type_soin: soin.type_soin, heure_prevue: heure });
    }
  }

  missionsAGenerer.sort((a, b) => a.heure_prevue.localeCompare(b.heure_prevue));

  const compteurs = { nb_injections: 0, nb_pansements: 0, nb_glycemies: 0 };
  for (const mission of missionsAGenerer) {
    const typeSoinMinuscule = mission.type_soin.toLowerCase();
    for (const { cle, motif } of MOTS_CLES_COMPTEUR) {
      if (typeSoinMinuscule.includes(motif)) compteurs[cle] += 1;
    }
  }

  const { data: tournee, error } = await supabase
    .from("tournees")
    .insert({
      idel_id: idelId,
      date,
      nb_patients: patientsDistincts.size,
      nb_injections: compteurs.nb_injections,
      nb_pansements: compteurs.nb_pansements,
      nb_glycemies: compteurs.nb_glycemies,
      temps_estime_min: missionsAGenerer.length * DUREE_PAR_MISSION_MIN,
    })
    .select("id")
    .single();

  if (error || !tournee) return;

  if (missionsAGenerer.length > 0) {
    const { error: missionsError } = await supabase.from("missions_du_jour").insert(
      missionsAGenerer.map((mission) => ({
        tournee_id: tournee.id,
        patient_id: mission.patient_id,
        type_soin: mission.type_soin,
        heure_prevue: mission.heure_prevue,
        statut: "a_faire",
      }))
    );

    if (missionsError) {
      await supabase.from("tournees").delete().eq("id", tournee.id);
    }
  }
}
```

- [ ] **Step 4: Run pour confirmer le succès**

Run: `npx vitest run lib/data/generation-tournee.test.ts`
Expected: PASS (16 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/data/generation-tournee.ts lib/data/generation-tournee.test.ts
git commit -m "feat(patients): génération automatique de la tournée (genererTourneeDuJour)"
```

---

### Task 8: Intégration dans `getTourneeDuJour` (`lib/data/ma-journee.ts`, modifié)

**Files:**
- Modify: `lib/data/ma-journee.ts`
- Modify: `lib/data/ma-journee.test.ts`

**Interfaces:**
- Consumes: `genererTourneeDuJour` (Task 7).
- Produces: `getTourneeDuJour` (signature inchangée : `(supabase, idelId): Promise<Tournee | null>`), consommée sans changement par `app/ma-journee/page.tsx`.

- [ ] **Step 1: Ajouter le test**

Dans `lib/data/ma-journee.test.ts`, ajouter en tête de fichier (après les imports existants) :

```ts
vi.mock("./generation-tournee", () => ({
  genererTourneeDuJour: vi.fn().mockResolvedValue(undefined),
}));
```

(Ajoute aussi `vi` à l'import `vitest` existant s'il n'y est pas déjà : `import { describe, expect, it, vi } from "vitest";`)

Modifier aussi le test existant `"mappe les colonnes snake_case Supabase vers le type Tournee"` (celui où la tournée est trouvée directement) pour vérifier qu'il ne régénère rien — ajouter ces deux lignes juste avant l'assertion finale `expect(tournee).toEqual(...)` :

```ts
    const { genererTourneeDuJour } = await import("./generation-tournee");
    expect(genererTourneeDuJour).not.toHaveBeenCalled();
```

Puis, dans le même `describe("getTourneeDuJour", ...)`, ajouter un second test après celui déjà présent :

```ts
  it("génère la tournée du jour si elle n'existe pas encore, puis la relit", async () => {
    const maybeSingleMock = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: {
          id: "t-nouvelle",
          date: "2026-07-15",
          nb_patients: 1,
          nb_injections: 0,
          nb_pansements: 1,
          nb_glycemies: 0,
          temps_estime_min: 20,
        },
        error: null,
      });

    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: maybeSingleMock,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { genererTourneeDuJour } = await import("./generation-tournee");
    const { getTourneeDuJour } = await import("./ma-journee");

    const tournee = await getTourneeDuJour(fakeClient, "user-1");

    expect(genererTourneeDuJour).toHaveBeenCalledWith(fakeClient, "user-1", expect.any(String));
    expect(maybeSingleMock).toHaveBeenCalledTimes(2);
    expect(tournee).toEqual({
      id: "t-nouvelle",
      date: "2026-07-15",
      nbPatients: 1,
      nbInjections: 0,
      nbPansements: 1,
      nbGlycemies: 0,
      tempsEstimeMin: 20,
    });
  });
```

- [ ] **Step 2: Run pour confirmer l'échec**

Run: `npx vitest run lib/data/ma-journee.test.ts`
Expected: FAIL — le nouveau test échoue (`genererTourneeDuJour` jamais appelée, `getTourneeDuJour` retourne `null` sans regénérer).

- [ ] **Step 3: Modifier `getTourneeDuJour` dans `lib/data/ma-journee.ts`**

Remplacer la fonction `getTourneeDuJour` existante (lignes 13-37) par :

```ts
import { genererTourneeDuJour } from "@/lib/data/generation-tournee";

async function lireTourneeDuJour(
  supabase: SupabaseClient<Database>,
  idelId: string,
  date: string
): Promise<Tournee | null> {
  const { data, error } = await supabase
    .from("tournees")
    .select("id, date, nb_patients, nb_injections, nb_pansements, nb_glycemies, temps_estime_min")
    .eq("idel_id", idelId)
    .eq("date", date)
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

export async function getTourneeDuJour(
  supabase: SupabaseClient<Database>,
  idelId: string
): Promise<Tournee | null> {
  const today = new Date().toISOString().slice(0, 10);

  const tournee = await lireTourneeDuJour(supabase, idelId, today);
  if (tournee) return tournee;

  await genererTourneeDuJour(supabase, idelId, today);

  return lireTourneeDuJour(supabase, idelId, today);
}
```

(L'import `genererTourneeDuJour` va avec les autres imports en tête de fichier, pas au milieu — placé ici dans les instructions uniquement pour le repérer facilement.)

- [ ] **Step 4: Run pour confirmer le succès**

Run: `npx vitest run lib/data/ma-journee.test.ts`
Expected: PASS (tous les tests existants + le nouveau)

- [ ] **Step 5: Vérifier l'ensemble de la suite**

Run: `npx vitest run`
Expected: tous les fichiers passent (aucune régression sur `/ma-journee/[missionId]` ni ailleurs).

- [ ] **Step 6: Commit**

```bash
git add lib/data/ma-journee.ts lib/data/ma-journee.test.ts
git commit -m "feat(patients): génère la tournée du jour à la volée si elle n'existe pas"
```

---

### Task 9: Page `/patients` (liste)

**Files:**
- Create: `components/ui/CartePatient.tsx`
- Create: `components/ui/CartePatient.test.tsx`
- Create: `app/patients/page.tsx`

**Interfaces:**
- Consumes: `getPatients` (Task 3), `PatientComplet` (Task 2).
- Produces: route `/patients`.

- [ ] **Step 1: Écrire le test du composant**

Créer `components/ui/CartePatient.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CartePatient } from "./CartePatient";
import type { PatientComplet } from "@/lib/types/clinical";

const patient: PatientComplet = {
  id: "p1",
  nomComplet: "Mme Dupont",
  adresse: "12 rue des Lilas",
  telephone: "0601020304",
  allergies: null,
  consignes: null,
  dateNaissance: null,
  medecinNom: null,
  medecinTelephone: null,
  contactUrgenceNom: null,
  contactUrgenceTelephone: null,
  antecedents: null,
  traitementsEnCours: null,
};

describe("CartePatient", () => {
  it("affiche le nom, l'adresse et un lien vers la fiche", () => {
    render(<CartePatient patient={patient} />);

    expect(screen.getByText("Mme Dupont")).toBeInTheDocument();
    expect(screen.getByText("12 rue des Lilas")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/patients/p1");
  });
});
```

- [ ] **Step 2: Run pour confirmer l'échec**

Run: `npx vitest run components/ui/CartePatient.test.tsx`
Expected: FAIL — `Cannot find module './CartePatient'`

- [ ] **Step 3: Implémenter `CartePatient`**

Créer `components/ui/CartePatient.tsx` :

```tsx
import Link from "next/link";
import type { PatientComplet } from "@/lib/types/clinical";

interface CartePatientProps {
  patient: PatientComplet;
}

export function CartePatient({ patient }: CartePatientProps) {
  return (
    <Link
      href={`/patients/${patient.id}`}
      className="block rounded-card border border-navy/10 bg-white p-6 hover:border-primary"
    >
      <h2 className="text-lg font-semibold text-navy">{patient.nomComplet}</h2>
      <p className="mt-1 text-sm text-navy/60">{patient.adresse}</p>
    </Link>
  );
}
```

- [ ] **Step 4: Run pour confirmer le succès**

Run: `npx vitest run components/ui/CartePatient.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: Créer la page `/patients`**

Créer `app/patients/page.tsx` :

```tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPatients } from "@/lib/data/patients";
import { CartePatient } from "@/components/ui/CartePatient";
import { Button } from "@/components/ui/Button";

export default async function PatientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const patients = user ? await getPatients(supabase, user.id) : [];

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/ma-journee" className="text-primary hover:underline">
            ‹ Ma journée
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-navy">Patients</h1>
        </div>
        <Link href="/patients/nouveau">
          <Button variant="primary">Ajouter un patient</Button>
        </Link>
      </div>

      {patients.length > 0 ? (
        <div className="flex flex-col gap-4">
          {patients.map((patient) => (
            <CartePatient key={patient.id} patient={patient} />
          ))}
        </div>
      ) : (
        <p className="text-navy/60">Aucun patient enregistré pour le moment.</p>
      )}
    </main>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add components/ui/CartePatient.tsx components/ui/CartePatient.test.tsx app/patients/page.tsx
git commit -m "feat(patients): page /patients (liste)"
```

---

### Task 10: Page `/patients/nouveau` (création)

**Files:**
- Create: `app/patients/nouveau/page.tsx`

**Interfaces:**
- Consumes: `createPatientAction` (Task 4).
- Produces: route `/patients/nouveau`.

- [ ] **Step 1: Créer la page**

Créer `app/patients/nouveau/page.tsx` :

```tsx
import Link from "next/link";
import { createPatientAction } from "@/lib/data/patients-actions";
import { Button } from "@/components/ui/Button";

export default function NouveauPatientPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <Link href="/patients" className="text-primary hover:underline">
          ‹ Patients
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-navy">Ajouter un patient</h1>
      </div>

      <form action={createPatientAction} className="flex flex-col gap-4 rounded-card border border-navy/10 bg-white p-6">
        <label className="flex flex-col gap-1 text-sm text-navy">
          Nom complet
          <input name="nomComplet" required className="rounded-card border border-navy/20 p-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-navy">
          Adresse
          <input name="adresse" required className="rounded-card border border-navy/20 p-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-navy">
          Téléphone
          <input name="telephone" required className="rounded-card border border-navy/20 p-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-navy">
          Date de naissance
          <input type="date" name="dateNaissance" className="rounded-card border border-navy/20 p-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-navy">
          Allergies
          <textarea name="allergies" rows={2} className="rounded-card border border-navy/20 p-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-navy">
          Consignes
          <textarea name="consignes" rows={2} className="rounded-card border border-navy/20 p-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-navy">
          Médecin traitant
          <input name="medecinNom" className="rounded-card border border-navy/20 p-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-navy">
          Téléphone du médecin traitant
          <input name="medecinTelephone" className="rounded-card border border-navy/20 p-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-navy">
          Contact d&apos;urgence
          <input name="contactUrgenceNom" className="rounded-card border border-navy/20 p-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-navy">
          Téléphone du contact d&apos;urgence
          <input name="contactUrgenceTelephone" className="rounded-card border border-navy/20 p-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-navy">
          Antécédents / pathologies
          <textarea name="antecedents" rows={2} className="rounded-card border border-navy/20 p-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-navy">
          Traitements en cours
          <textarea name="traitementsEnCours" rows={2} className="rounded-card border border-navy/20 p-2" />
        </label>
        <Button type="submit" variant="primary" className="self-start">
          Créer la fiche patient
        </Button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/patients/nouveau/page.tsx
git commit -m "feat(patients): page /patients/nouveau (création)"
```

---

### Task 11: Page `/patients/[id]` — fiche patient (affichage + édition)

**Files:**
- Create: `app/patients/[id]/page.tsx`

**Interfaces:**
- Consumes: `getPatient` (Task 3), `updatePatientAction` (Task 4).
- Produces: route `/patients/[id]` (section fiche uniquement — la section soins est ajoutée à la Task 12).

- [ ] **Step 1: Créer la page (fiche patient uniquement)**

Créer `app/patients/[id]/page.tsx` :

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPatient } from "@/lib/data/patients";
import { updatePatientAction } from "@/lib/data/patients-actions";
import { Button } from "@/components/ui/Button";

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const patient = await getPatient(supabase, id);

  if (!patient) notFound();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <Link href="/patients" className="text-primary hover:underline">
          ‹ Patients
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-navy">{patient.nomComplet}</h1>
      </div>

      <section className="rounded-card border border-navy/10 bg-white p-6">
        <p className="text-xs font-medium uppercase text-navy/60">Fiche patient</p>
        <form action={updatePatientAction} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="patientId" value={patient.id} />
          <label className="flex flex-col gap-1 text-sm text-navy">
            Nom complet
            <input
              name="nomComplet"
              defaultValue={patient.nomComplet}
              required
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Adresse
            <input
              name="adresse"
              defaultValue={patient.adresse}
              required
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Téléphone
            <input
              name="telephone"
              defaultValue={patient.telephone}
              required
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Date de naissance
            <input
              type="date"
              name="dateNaissance"
              defaultValue={patient.dateNaissance ?? ""}
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Allergies
            <textarea
              name="allergies"
              defaultValue={patient.allergies ?? ""}
              rows={2}
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Consignes
            <textarea
              name="consignes"
              defaultValue={patient.consignes ?? ""}
              rows={2}
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Médecin traitant
            <input
              name="medecinNom"
              defaultValue={patient.medecinNom ?? ""}
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Téléphone du médecin traitant
            <input
              name="medecinTelephone"
              defaultValue={patient.medecinTelephone ?? ""}
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Contact d&apos;urgence
            <input
              name="contactUrgenceNom"
              defaultValue={patient.contactUrgenceNom ?? ""}
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Téléphone du contact d&apos;urgence
            <input
              name="contactUrgenceTelephone"
              defaultValue={patient.contactUrgenceTelephone ?? ""}
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Antécédents / pathologies
            <textarea
              name="antecedents"
              defaultValue={patient.antecedents ?? ""}
              rows={2}
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Traitements en cours
            <textarea
              name="traitementsEnCours"
              defaultValue={patient.traitementsEnCours ?? ""}
              rows={2}
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <Button type="submit" variant="tertiary" className="self-start">
            Enregistrer
          </Button>
        </form>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/patients/[id]/page.tsx"
git commit -m "feat(patients): page /patients/[id] (fiche patient, affichage et édition)"
```

---

### Task 12: Page `/patients/[id]` — section soins prescrits (`app/patients/[id]/page.tsx`, modifié)

**Files:**
- Modify: `app/patients/[id]/page.tsx`

**Interfaces:**
- Consumes: `getSoinsPrescrits` (Task 3), `createSoinPrescritAction`, `arreterSoinPrescritAction` (Task 5).

- [ ] **Step 1: Ajouter la section soins**

Dans `app/patients/[id]/page.tsx` :

1. Ajouter aux imports :

```tsx
import { getSoinsPrescrits } from "@/lib/data/patients";
import { createSoinPrescritAction, arreterSoinPrescritAction, updatePatientAction } from "@/lib/data/patients-actions";
import type { SoinPrescrit } from "@/lib/types/clinical";
```

(remplace l'import existant `import { updatePatientAction } from "@/lib/data/patients-actions";` par la ligne combinée ci-dessus)

2. Ajouter avant `export default async function PatientPage`, les constantes et la fonction de description :

```tsx
const JOUR_LABEL = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function decrireRecurrence(soin: SoinPrescrit): string {
  if (soin.frequenceType === "ponctuel") return `Le ${soin.dateDebut}`;
  if (soin.frequenceType === "quotidien") return "Tous les jours";
  if (soin.frequenceType === "tous_les_x_jours") return `Tous les ${soin.intervalleJours} jours`;
  return (soin.joursSemaine ?? []).map((jour) => JOUR_LABEL[jour]).join(", ");
}
```

3. Dans le corps de `PatientPage`, après `if (!patient) notFound();`, ajouter :

```tsx
  const soins = await getSoinsPrescrits(supabase, id);
  const soinsActifs = soins.filter((soin) => soin.actif);
  const soinsArretes = soins.filter((soin) => !soin.actif);
```

4. Juste après la `</section>` qui ferme la section "Fiche patient" (avant `</main>`), ajouter :

```tsx
      <section className="rounded-card border border-navy/10 bg-white p-6">
        <p className="text-xs font-medium uppercase text-navy/60">Soins prescrits</p>

        {soinsActifs.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-3">
            {soinsActifs.map((soin) => (
              <li
                key={soin.id}
                className="flex items-center justify-between gap-3 rounded-card border border-navy/10 p-3"
              >
                <div>
                  <p className="text-navy">{soin.typeSoin}</p>
                  <p className="text-sm text-navy/60">
                    {decrireRecurrence(soin)} · {soin.heures.join(", ")}
                  </p>
                </div>
                <form action={arreterSoinPrescritAction}>
                  <input type="hidden" name="soinId" value={soin.id} />
                  <input type="hidden" name="patientId" value={patient.id} />
                  <Button type="submit" variant="secondary">
                    Arrêter
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-navy/60">Aucun soin actif.</p>
        )}

        {soinsArretes.length > 0 && (
          <>
            <p className="mt-4 text-xs font-medium uppercase text-navy/40">Soins arrêtés</p>
            <ul className="mt-2 flex flex-col gap-2">
              {soinsArretes.map((soin) => (
                <li key={soin.id} className="text-sm text-navy/40">
                  {soin.typeSoin} — {decrireRecurrence(soin)}
                </li>
              ))}
            </ul>
          </>
        )}

        <form
          action={createSoinPrescritAction}
          className="mt-5 flex flex-col gap-3 border-t border-navy/10 pt-4"
        >
          <input type="hidden" name="patientId" value={patient.id} />
          <label className="flex flex-col gap-1 text-sm text-navy">
            Type de soin
            <input name="typeSoin" required className="rounded-card border border-navy/20 p-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Récurrence
            <select name="frequenceType" required className="rounded-card border border-navy/20 p-2">
              <option value="quotidien">Quotidien</option>
              <option value="jours_semaine">Jours de semaine précis</option>
              <option value="tous_les_x_jours">Tous les X jours</option>
              <option value="ponctuel">Ponctuel</option>
            </select>
          </label>
          <fieldset className="flex flex-wrap gap-3 text-sm text-navy">
            <legend className="text-xs text-navy/60">
              Jours (si &laquo;&nbsp;Jours de semaine précis&nbsp;&raquo;)
            </legend>
            {JOUR_LABEL.map((label, index) => (
              <label key={label} className="flex items-center gap-1">
                <input type="checkbox" name="joursSemaine" value={index} />
                {label}
              </label>
            ))}
          </fieldset>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Intervalle en jours (si &laquo;&nbsp;Tous les X jours&nbsp;&raquo;)
            <input type="number" name="intervalleJours" min={1} className="rounded-card border border-navy/20 p-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Heure(s) du soin (ex. 08:00, ou 07:00, 19:00 pour plusieurs)
            <input
              name="heures"
              type="text"
              required
              placeholder="08:00"
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Date de début
            <input
              type="date"
              name="dateDebut"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Date de fin (optionnelle)
            <input type="date" name="dateFin" className="rounded-card border border-navy/20 p-2" />
          </label>
          <Button type="submit" variant="primary" className="self-start">
            Ajouter le soin
          </Button>
        </form>
      </section>
```

- [ ] **Step 2: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add "app/patients/[id]/page.tsx"
git commit -m "feat(patients): section soins prescrits sur /patients/[id]"
```

---

### Task 13: Navigation + garde d'accès (`app/ma-journee/page.tsx`, `proxy.ts`, `proxy.test.ts`)

**Files:**
- Modify: `app/ma-journee/page.tsx`
- Modify: `proxy.ts`
- Modify: `proxy.test.ts`

**Interfaces:**
- Consumes: rien de nouveau.
- Produces: route `/patients` protégée comme `/ma-journee` (connexion + abonnement requis), lien de navigation depuis `/ma-journee`.

- [ ] **Step 1: Ajouter le lien de navigation**

Dans `app/ma-journee/page.tsx`, ajouter un lien après celui vers `/compte` :

```tsx
        <Link href="/patients">
          <Button variant="secondary">Patients</Button>
        </Link>
```

(juste avant la fermeture de la `<div className="flex gap-4">` qui contient déjà Rechercher / Ely / Parcourir / Mon compte)

- [ ] **Step 2: Ajouter le test proxy**

Dans `proxy.test.ts`, ajouter après le test `"laisse passer sur /compte même sans abonnement essai/actif"` :

```ts
  it("redirige vers /abonnement si connecté sur /patients mais sans abonnement essai/actif", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    eqSelectMock.mockResolvedValue({ data: { statut: "impaye" }, error: null });

    const { proxy } = await import("./proxy");
    const request = new NextRequest("https://soinely.app/patients");

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/abonnement");
  });
```

- [ ] **Step 3: Run pour confirmer l'échec**

Run: `npx vitest run proxy.test.ts`
Expected: FAIL — `/patients` n'est pas encore une route protégée, la réponse est 200 au lieu de 307.

- [ ] **Step 4: Modifier `proxy.ts`**

```ts
const AUTH_REQUIRED_PATHS = ["/ma-journee", "/recherche", "/situations", "/ely", "/compte", "/patients"];

const SUBSCRIPTION_REQUIRED_PATHS = ["/ma-journee", "/recherche", "/situations", "/ely", "/patients"];
```

Et dans `export const config`, ajouter au tableau `matcher` :

```ts
    "/patients/:path*",
```

- [ ] **Step 5: Run pour confirmer le succès**

Run: `npx vitest run proxy.test.ts`
Expected: PASS (tous les tests)

- [ ] **Step 6: Vérifier l'ensemble de la suite, le typecheck, le lint et le build**

Run: `npx vitest run`
Expected: tous les fichiers passent.

Run: `npx tsc --noEmit`
Expected: aucune erreur.

Run: `npx eslint app/patients "app/patients/[id]" app/ma-journee/page.tsx proxy.ts lib/data/patients.ts lib/data/patients-actions.ts lib/data/generation-tournee.ts lib/data/ma-journee.ts components/ui/CartePatient.tsx`
Expected: aucune erreur (avertissements pré-existants dans d'autres fichiers non concernés acceptables).

Run: `npm run build`
Expected: build réussi, `/patients`, `/patients/nouveau`, `/patients/[id]` listées dans les routes.

- [ ] **Step 7: Commit**

```bash
git add app/ma-journee/page.tsx proxy.ts proxy.test.ts
git commit -m "feat(patients): lien de navigation et garde d'accès sur /patients"
```

---

## Vérification manuelle finale

Après le déploiement, avec autorisation explicite du fondateur : créer un patient de test via `/patients/nouveau`, lui ajouter un soin `quotidien` avec deux heures et un soin `jours_semaine`, ouvrir `/ma-journee` le jour concerné et confirmer que la tournée se génère avec les bonnes missions et les bonnes statistiques ; rouvrir la page et confirmer qu'aucun doublon n'apparaît ; arrêter un soin et confirmer qu'il n'est plus généré le lendemain ; vérifier que `/ma-journee/[missionId]` (écran existant) n'a subi aucune régression.
