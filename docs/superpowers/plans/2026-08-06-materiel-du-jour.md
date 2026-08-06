# Matériel du jour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une carte "Matériel du jour" sur `/ma-journee`, listant le matériel infirmier déduit des actes planifiés aujourd'hui, avec deux boutons de validation indépendants (préparation, vérification).

**Architecture:** Une nouvelle table `materiel_ngap` porte la correspondance code NGAP → article de matériel. Une fonction d'agrégation lit les actes du jour et somme les quantités par article. L'état de validation (préparé/vérifié) vit sur deux nouvelles colonnes de `tournees`, écrites par une Server Action dédiée.

**Tech Stack:** Next.js App Router (Server Components + Server Actions), TypeScript, Supabase (Postgres), Tailwind, Vitest + Testing Library.

## Global Constraints

- Liste intelligente déduite des actes du jour, pas une checklist manuelle libre.
- Une seule liste agrégée par jour, jamais par patient.
- Validation en un seul geste par état (préparé / vérifié), pas de case à cocher par article.
- La correspondance acte → matériel est marquée `niveau_confiance: brouillon` — contenu à réviser par la fondatrice, pas encore validé.
- La carte ne s'affiche pas du tout si aucun article n'est nécessaire (liste vide) — pas de section vide.

---

### Task 1: Schéma, types et correspondance acte → matériel

**Files:**
- Create: `supabase/migrations/20260806000000_materiel_ngap.sql`
- Modify: `lib/types/database.types.ts:284-319` (bloc `ngap_codes`, pour situer l'ajout du nouveau bloc `materiel_ngap` juste après) et `lib/types/database.types.ts:608-648` (bloc `tournees`)
- Modify: `lib/types/clinical.ts:140-148` (`Tournee`)
- Modify: `lib/data/ma-journee.ts:63-89` (`lireTourneeDuJour`)
- Test: `lib/data/ma-journee.test.ts` (tests existants de `getTourneeDuJour`, à adapter)

**Interfaces:**
- Produces: `Tournee.materielPrepare: boolean`, `Tournee.materielVerifie: boolean` — consommés par Task 4 (page `/ma-journee`).

- [ ] **Step 1: Écrire la migration**

```sql
-- Matériel du jour : correspondance code NGAP -> article de matériel, et
-- état de validation quotidien (préparation le matin, vérification le
-- soir) de la tournée.
--
-- Contenu de niveau_confiance 'brouillon' : composé à partir du catalogue
-- NGAP existant, faute de source de référence fournie à la conception —
-- à relire et corriger par la fondatrice, infirmière de métier.

create table public.materiel_ngap (
  id uuid primary key default gen_random_uuid(),
  ngap_code_id uuid not null references public.ngap_codes(id) on delete cascade,
  libelle text not null,
  quantite integer not null default 1,
  niveau_confiance text not null default 'brouillon'
    check (niveau_confiance in ('brouillon', 'relu', 'valide')),
  published boolean not null default true
);

comment on table public.materiel_ngap is
  'Matériel infirmier nécessaire par occurrence d''un acte NGAP, pour la liste "Matériel du jour" de /ma-journee. Contenu brouillon, à valider par la fondatrice.';

create index materiel_ngap_ngap_code_id_idx on public.materiel_ngap (ngap_code_id);

alter table public.materiel_ngap enable row level security;

-- Nomenclature publique, comme le catalogue ngap_codes : ne porte aucune
-- donnée de patient.
create policy "materiel_ngap_select_all" on public.materiel_ngap
  for select using (true);

-- ── Correspondance initiale ──────────────────────────────────────────────
-- AMI 1 — Injection sous-cutanée ou intramusculaire
insert into public.materiel_ngap (ngap_code_id, libelle, quantite)
select id, 'Seringue', 1 from public.ngap_codes where code = 'AMI 1'
union all
select id, 'Aiguille', 1 from public.ngap_codes where code = 'AMI 1'
union all
select id, 'Compresse antiseptique', 1 from public.ngap_codes where code = 'AMI 1'
union all
select id, 'Container DASRI', 1 from public.ngap_codes where code = 'AMI 1'
-- AMI 2 — Pansement simple
union all
select id, 'Compresses stériles', 4 from public.ngap_codes where code = 'AMI 2'
union all
select id, 'Sérum physiologique', 1 from public.ngap_codes where code = 'AMI 2'
union all
select id, 'Pansement adhésif', 1 from public.ngap_codes where code = 'AMI 2'
union all
select id, 'Gants à usage unique', 1 from public.ngap_codes where code = 'AMI 2'
-- AMI 4 — Pansement lourd et complexe
union all
select id, 'Compresses stériles', 6 from public.ngap_codes where code = 'AMI 4'
union all
select id, 'Sérum physiologique', 1 from public.ngap_codes where code = 'AMI 4'
union all
select id, 'Pansement absorbant', 1 from public.ngap_codes where code = 'AMI 4'
union all
select id, 'Gants à usage unique', 1 from public.ngap_codes where code = 'AMI 4'
union all
select id, 'Set de détersion', 1 from public.ngap_codes where code = 'AMI 4'
-- AMI 9 — Pose de perfusion courte
union all
select id, 'Nécessaire à perfusion', 1 from public.ngap_codes where code = 'AMI 9'
union all
select id, 'Cathéter court', 1 from public.ngap_codes where code = 'AMI 9'
union all
select id, 'Pansement transparent', 1 from public.ngap_codes where code = 'AMI 9'
union all
select id, 'Garrot', 1 from public.ngap_codes where code = 'AMI 9'
-- AMI 14 — Pose de perfusion longue
union all
select id, 'Nécessaire à perfusion', 1 from public.ngap_codes where code = 'AMI 14'
union all
select id, 'Cathéter', 1 from public.ngap_codes where code = 'AMI 14'
union all
select id, 'Pansement transparent', 1 from public.ngap_codes where code = 'AMI 14'
union all
select id, 'Garrot', 1 from public.ngap_codes where code = 'AMI 14'
union all
select id, 'Potence ou support', 1 from public.ngap_codes where code = 'AMI 14'
-- AIS 3 — Actes infirmiers de soins (toilette, habillage)
union all
select id, 'Gants à usage unique', 1 from public.ngap_codes where code = 'AIS 3'
union all
select id, 'Gant de toilette', 1 from public.ngap_codes where code = 'AIS 3'
union all
select id, 'Produit de toilette', 1 from public.ngap_codes where code = 'AIS 3';

-- ── État de validation quotidien de la tournée ───────────────────────────
alter table public.tournees
  add column if not exists materiel_prepare boolean not null default false,
  add column if not exists materiel_verifie boolean not null default false;

comment on column public.tournees.materiel_prepare is
  'Vrai si l''IDEL a confirmé avoir préparé le matériel du jour. Repart à faux à chaque nouvelle tournée (une ligne par jour).';

comment on column public.tournees.materiel_verifie is
  'Vrai si l''IDEL a confirmé avoir vérifié le matériel en fin de journée. Indépendant de materiel_prepare.';
```

- [ ] **Step 2: Mettre à jour les types Supabase générés**

Dans `lib/types/database.types.ts`, ajouter un nouveau bloc `materiel_ngap` juste après le bloc `ngap_codes` (qui se termine à la ligne 319 par `Relationships: []` puis `}`) :

```ts
      materiel_ngap: {
        Row: {
          id: string
          ngap_code_id: string
          libelle: string
          quantite: number
          niveau_confiance: string
          published: boolean
        }
        Insert: {
          id?: string
          ngap_code_id: string
          libelle: string
          quantite?: number
          niveau_confiance?: string
          published?: boolean
        }
        Update: {
          id?: string
          ngap_code_id?: string
          libelle?: string
          quantite?: number
          niveau_confiance?: string
          published?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "materiel_ngap_ngap_code_id_fkey"
            columns: ["ngap_code_id"]
            isOneToOne: false
            referencedRelation: "ngap_codes"
            referencedColumns: ["id"]
          },
        ]
      }
```

Dans le bloc `tournees` (lignes 608-648), ajouter `materiel_prepare` et `materiel_verifie` dans les trois sous-blocs, juste après `nb_patients`/`nb_patients?` et avant `temps_estime_min`/`temps_estime_min?` :

Avant (`Row`, lignes 609-618) :
```ts
        Row: {
          date: string
          id: string
          idel_id: string
          nb_glycemies: number
          nb_injections: number
          nb_pansements: number
          nb_patients: number
          temps_estime_min: number
        }
```

Après :
```ts
        Row: {
          date: string
          id: string
          idel_id: string
          materiel_prepare: boolean
          materiel_verifie: boolean
          nb_glycemies: number
          nb_injections: number
          nb_pansements: number
          nb_patients: number
          temps_estime_min: number
        }
```

Même ajout (`materiel_prepare?: boolean`, `materiel_verifie?: boolean`, insérés dans le même ordre alphabétique) dans les blocs `Insert` (lignes 619-628) et `Update` (lignes 629-638).

- [ ] **Step 3: Écrire les tests du champ Tournee (échouent pour l'instant)**

Dans `lib/data/ma-journee.test.ts`, repérer le describe `getTourneeDuJour` (premier test du fichier, autour des lignes 20-60). Remplacer entièrement le premier test :

Avant :
```ts
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

    const { genererTourneeDuJour } = await import("./generation-tournee");
    expect(genererTourneeDuJour).not.toHaveBeenCalled();
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
```

Après :
```ts
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
                    materiel_prepare: false,
                    materiel_verifie: false,
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

    const { genererTourneeDuJour } = await import("./generation-tournee");
    expect(genererTourneeDuJour).not.toHaveBeenCalled();
    expect(tournee).toEqual({
      id: "t1",
      date: "2026-07-13",
      nbPatients: 21,
      nbInjections: 14,
      nbPansements: 8,
      nbGlycemies: 6,
      tempsEstimeMin: 435,
      materielPrepare: false,
      materielVerifie: false,
    });
  });
```

Remplacer entièrement le second test du même describe :

Avant :
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
});
```

Après :
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
          materiel_prepare: true,
          materiel_verifie: false,
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
      materielPrepare: true,
      materielVerifie: false,
    });
  });
});
```

Ce second test vérifie, avec `materielPrepare: true` (une valeur non-par-défaut), que les champs sont bien transmis tels quels et non simplement câblés à `false` en dur.

- [ ] **Step 4: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run lib/data/ma-journee.test.ts`
Expected: FAIL — `lireTourneeDuJour` ne sélectionne/mappe pas encore `materiel_prepare`/`materiel_verifie`.

- [ ] **Step 5: Ajouter les champs au type métier et à la fonction de lecture**

Dans `lib/types/clinical.ts:140-148` :

Avant :
```ts
export interface Tournee {
  id: string;
  date: string;
  nbPatients: number;
  nbInjections: number;
  nbPansements: number;
  nbGlycemies: number;
  tempsEstimeMin: number;
}
```

Après :
```ts
export interface Tournee {
  id: string;
  date: string;
  nbPatients: number;
  nbInjections: number;
  nbPansements: number;
  nbGlycemies: number;
  tempsEstimeMin: number;
  materielPrepare: boolean;
  materielVerifie: boolean;
}
```

Dans `lib/data/ma-journee.ts:63-89` (`lireTourneeDuJour`) :

Avant :
```ts
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

  // L'absence de tournée est un fait métier — une journée sans patient. Seule
  // une erreur de lecture est une panne.
  if (error) echouer("lireTourneeDuJour", error);
  if (!data) return null;

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
```

Après :
```ts
async function lireTourneeDuJour(
  supabase: SupabaseClient<Database>,
  idelId: string,
  date: string
): Promise<Tournee | null> {
  const { data, error } = await supabase
    .from("tournees")
    .select(
      "id, date, nb_patients, nb_injections, nb_pansements, nb_glycemies, temps_estime_min, materiel_prepare, materiel_verifie"
    )
    .eq("idel_id", idelId)
    .eq("date", date)
    .maybeSingle();

  // L'absence de tournée est un fait métier — une journée sans patient. Seule
  // une erreur de lecture est une panne.
  if (error) echouer("lireTourneeDuJour", error);
  if (!data) return null;

  return {
    id: data.id,
    date: data.date,
    nbPatients: data.nb_patients,
    nbInjections: data.nb_injections,
    nbPansements: data.nb_pansements,
    nbGlycemies: data.nb_glycemies,
    tempsEstimeMin: data.temps_estime_min,
    materielPrepare: data.materiel_prepare,
    materielVerifie: data.materiel_verifie,
  };
}
```

- [ ] **Step 6: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run lib/data/ma-journee.test.ts`
Expected: PASS

- [ ] **Step 7: Typecheck et lint**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: aucune nouvelle erreur

Run: `npx eslint lib/types/clinical.ts lib/data/ma-journee.ts lib/data/ma-journee.test.ts`
Expected: aucune erreur

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260806000000_materiel_ngap.sql lib/types/database.types.ts lib/types/clinical.ts lib/data/ma-journee.ts lib/data/ma-journee.test.ts
git commit -m "feat(materiel): ajoute la table materiel_ngap et l'etat de validation quotidien"
```

---

### Task 2: Agrégation du matériel du jour

**Files:**
- Create: `lib/data/materiel.ts`
- Test: `lib/data/materiel.test.ts`

**Interfaces:**
- Produces: `export interface MaterielItem { libelle: string; quantite: number }` et `export async function getMaterielDuJour(supabase: SupabaseClient<Database>, tourneeId: string): Promise<MaterielItem[]>` — consommés par Task 4.

- [ ] **Step 1: Écrire les tests (échouent pour l'instant)**

Créer `lib/data/materiel.test.ts` :

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getMaterielDuJour", () => {
  it("agrège les quantités de plusieurs occurrences du même code", async () => {
    const inMock = vi.fn().mockResolvedValue({
      data: [
        { ngap_code_id: "code-ami2", libelle: "Compresses stériles", quantite: 4 },
        { ngap_code_id: "code-ami2", libelle: "Sérum physiologique", quantite: 1 },
      ],
      error: null,
    });

    const fakeClient = {
      from: (table: string) => {
        if (table === "missions_du_jour") {
          return {
            select: () => ({
              eq: () =>
                Promise.resolve({
                  data: [
                    { actes_mission: [{ ngap_code_id: "code-ami2" }] },
                    { actes_mission: [{ ngap_code_id: "code-ami2" }] },
                  ],
                  error: null,
                }),
            }),
          };
        }
        if (table === "materiel_ngap") {
          return { select: () => ({ in: inMock }) };
        }
        throw new Error(`Table non attendue dans ce test : ${table}`);
      },
    } as unknown as SupabaseClient;

    const { getMaterielDuJour } = await import("./materiel");
    const items = await getMaterielDuJour(fakeClient, "t1");

    expect(items).toEqual([
      { libelle: "Compresses stériles", quantite: 8 },
      { libelle: "Sérum physiologique", quantite: 2 },
    ]);
    // Un seul code distinct interrogé, malgré deux occurrences.
    expect(inMock).toHaveBeenCalledWith("ngap_code_id", ["code-ami2"]);
  });

  it("ignore les actes sans code NGAP", async () => {
    const fakeClient = {
      from: (table: string) => {
        if (table === "missions_du_jour") {
          return {
            select: () => ({
              eq: () =>
                Promise.resolve({
                  data: [{ actes_mission: [{ ngap_code_id: null }] }],
                  error: null,
                }),
            }),
          };
        }
        if (table === "materiel_ngap") {
          return { select: () => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
        }
        throw new Error(`Table non attendue dans ce test : ${table}`);
      },
    } as unknown as SupabaseClient;

    const { getMaterielDuJour } = await import("./materiel");
    expect(await getMaterielDuJour(fakeClient, "t1")).toEqual([]);
  });

  it("rend une liste vide sans acte du jour", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
      }),
    } as unknown as SupabaseClient;

    const { getMaterielDuJour } = await import("./materiel");
    expect(await getMaterielDuJour(fakeClient, "t1")).toEqual([]);
  });

  it("ignore un code NGAP sans matériel associé", async () => {
    const fakeClient = {
      from: (table: string) => {
        if (table === "missions_du_jour") {
          return {
            select: () => ({
              eq: () =>
                Promise.resolve({
                  data: [{ actes_mission: [{ ngap_code_id: "code-bsa" }] }],
                  error: null,
                }),
            }),
          };
        }
        if (table === "materiel_ngap") {
          return { select: () => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
        }
        throw new Error(`Table non attendue dans ce test : ${table}`);
      },
    } as unknown as SupabaseClient;

    const { getMaterielDuJour } = await import("./materiel");
    expect(await getMaterielDuJour(fakeClient, "t1")).toEqual([]);
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run lib/data/materiel.test.ts`
Expected: FAIL — le module `./materiel` n'existe pas encore.

- [ ] **Step 3: Implémenter l'agrégation**

Créer `lib/data/materiel.ts` :

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { echouer } from "@/lib/journal";

export interface MaterielItem {
  libelle: string;
  quantite: number;
}

type MissionAvecActes = { actes_mission: { ngap_code_id: string | null }[] };
type MaterielRow = { ngap_code_id: string; libelle: string; quantite: number };

/**
 * Matériel nécessaire pour la tournée du jour, déduit des actes planifiés
 * et agrégé par article (quantités sommées sur toutes les occurrences).
 *
 * Les actes sans code NGAP, ou dont le code n'a pas de matériel associé
 * dans materiel_ngap, sont simplement absents du résultat — pas d'erreur.
 */
export async function getMaterielDuJour(
  supabase: SupabaseClient<Database>,
  tourneeId: string
): Promise<MaterielItem[]> {
  const { data, error } = await supabase
    .from("missions_du_jour")
    .select("actes_mission(ngap_code_id)")
    .eq("tournee_id", tourneeId);

  if (error) echouer("getMaterielDuJour", error);
  if (!data) return [];

  const codeIds = (data as MissionAvecActes[])
    .flatMap((mission) => mission.actes_mission)
    .map((acte) => acte.ngap_code_id)
    .filter((id): id is string => id !== null);

  if (codeIds.length === 0) return [];

  const { data: materiel, error: materielError } = await supabase
    .from("materiel_ngap")
    .select("ngap_code_id, libelle, quantite")
    .in("ngap_code_id", [...new Set(codeIds)]);

  if (materielError) echouer("getMaterielDuJour", materielError);
  if (!materiel) return [];

  const totaux = new Map<string, number>();
  for (const codeId of codeIds) {
    for (const item of materiel as MaterielRow[]) {
      if (item.ngap_code_id === codeId) {
        totaux.set(item.libelle, (totaux.get(item.libelle) ?? 0) + item.quantite);
      }
    }
  }

  return [...totaux.entries()]
    .map(([libelle, quantite]) => ({ libelle, quantite }))
    .sort((a, b) => a.libelle.localeCompare(b.libelle));
}
```

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run lib/data/materiel.test.ts`
Expected: PASS (4/4)

- [ ] **Step 5: Typecheck et lint**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: aucune nouvelle erreur

Run: `npx eslint lib/data/materiel.ts lib/data/materiel.test.ts`
Expected: aucune erreur

- [ ] **Step 6: Commit**

```bash
git add lib/data/materiel.ts lib/data/materiel.test.ts
git commit -m "feat(materiel): ajoute getMaterielDuJour, agregation par article"
```

---

### Task 3: Server Action de validation

**Files:**
- Create: `lib/data/materiel-actions.ts`
- Test: `lib/data/materiel-actions.test.ts`

**Interfaces:**
- Consumes: `ResultatEcriture` (`@/lib/data/ma-journee-actions`).
- Produces: `export async function updateMaterielAction(formData: FormData): Promise<ResultatEcriture>` — consommé par Task 4. Champs de formulaire attendus : `tourneeId`, `champ` (`"prepare"` ou `"verifie"`).

- [ ] **Step 1: Écrire les tests (échouent pour l'instant)**

Créer `lib/data/materiel-actions.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const updateMock = vi.fn();
const eqMock = vi.fn();
const fromMock = vi.fn(() => ({ update: updateMock }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({ from: fromMock }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  updateMock.mockReturnValue({ eq: eqMock });
  eqMock.mockResolvedValue({ error: null });
});

describe("updateMaterielAction", () => {
  it("coche materiel_prepare", async () => {
    const { updateMaterielAction } = await import("./materiel-actions");
    const formData = new FormData();
    formData.set("tourneeId", "t1");
    formData.set("champ", "prepare");

    const resultat = await updateMaterielAction(formData);

    expect(resultat).toEqual({ succes: true });
    expect(fromMock).toHaveBeenCalledWith("tournees");
    expect(updateMock).toHaveBeenCalledWith({ materiel_prepare: true });
    expect(eqMock).toHaveBeenCalledWith("id", "t1");
  });

  it("coche materiel_verifie indépendamment", async () => {
    const { updateMaterielAction } = await import("./materiel-actions");
    const formData = new FormData();
    formData.set("tourneeId", "t1");
    formData.set("champ", "verifie");

    await updateMaterielAction(formData);

    expect(updateMock).toHaveBeenCalledWith({ materiel_verifie: true });
  });

  it("refuse un champ invalide", async () => {
    const { updateMaterielAction } = await import("./materiel-actions");
    const formData = new FormData();
    formData.set("tourneeId", "t1");
    formData.set("champ", "autre_chose");

    const resultat = await updateMaterielAction(formData);

    expect(resultat.succes).toBe(false);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("signale un échec d'écriture", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    eqMock.mockResolvedValue({ error: { message: "boom" } });

    const { updateMaterielAction } = await import("./materiel-actions");
    const formData = new FormData();
    formData.set("tourneeId", "t1");
    formData.set("champ", "prepare");

    const resultat = await updateMaterielAction(formData);

    expect(resultat.succes).toBe(false);
    expect(resultat.erreur).toContain("boom");
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run lib/data/materiel-actions.test.ts`
Expected: FAIL — le module `./materiel-actions` n'existe pas encore.

- [ ] **Step 3: Implémenter l'action**

Créer `lib/data/materiel-actions.ts` :

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ResultatEcriture } from "@/lib/data/ma-journee-actions";
import { journaliserEchec } from "@/lib/journal";

/**
 * Coche l'un des deux états quotidiens du matériel (préparé / vérifié),
 * indépendamment l'un de l'autre. Repartent à faux le lendemain, avec la
 * nouvelle ligne de tournée du jour.
 */
export async function updateMaterielAction(formData: FormData): Promise<ResultatEcriture> {
  const tourneeId = String(formData.get("tourneeId"));
  const champ = String(formData.get("champ"));

  if (champ !== "prepare" && champ !== "verifie") {
    return { succes: false, erreur: "Champ invalide." };
  }

  const supabase = await createClient();
  const colonne = champ === "prepare" ? "materiel_prepare" : "materiel_verifie";

  const { error } = await supabase
    .from("tournees")
    .update({ [colonne]: true })
    .eq("id", tourneeId);

  if (error) {
    journaliserEchec("updateMaterielAction", error);
    return { succes: false, erreur: `Enregistrement impossible : ${error.message}` };
  }

  revalidatePath("/ma-journee");
  return { succes: true };
}
```

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run lib/data/materiel-actions.test.ts`
Expected: PASS (4/4)

- [ ] **Step 5: Typecheck et lint**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: aucune nouvelle erreur

Run: `npx eslint lib/data/materiel-actions.ts lib/data/materiel-actions.test.ts`
Expected: aucune erreur

- [ ] **Step 6: Commit**

```bash
git add lib/data/materiel-actions.ts lib/data/materiel-actions.test.ts
git commit -m "feat(materiel): ajoute updateMaterielAction"
```

---

### Task 4: Carte "Matériel du jour" sur /ma-journee

**Files:**
- Create: `components/ui/CarteMateriel.tsx`
- Test: `components/ui/CarteMateriel.test.tsx`
- Modify: `app/(app)/ma-journee/page.tsx`

**Interfaces:**
- Consumes: `MaterielItem` (Task 2, `@/lib/data/materiel`), `getMaterielDuJour` (Task 2), `updateMaterielAction` (Task 3), `Tournee.materielPrepare`/`materielVerifie` (Task 1).

- [ ] **Step 1: Écrire le test du composant (échoue pour l'instant)**

Créer `components/ui/CarteMateriel.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CarteMateriel } from "./CarteMateriel";

vi.mock("@/lib/data/materiel-actions", () => ({
  updateMaterielAction: vi.fn(),
}));

const items = [
  { libelle: "Compresses stériles", quantite: 8 },
  { libelle: "Seringue", quantite: 2 },
];

describe("CarteMateriel", () => {
  it("affiche les articles avec leurs quantités", () => {
    render(<CarteMateriel items={items} tourneeId="t1" prepare={false} verifie={false} />);

    expect(screen.getByText("Compresses stériles")).toBeInTheDocument();
    expect(screen.getByText("×8")).toBeInTheDocument();
    expect(screen.getByText("Seringue")).toBeInTheDocument();
    expect(screen.getByText("×2")).toBeInTheDocument();
  });

  it("affiche le bouton non coché quand prepare est faux", () => {
    render(<CarteMateriel items={items} tourneeId="t1" prepare={false} verifie={false} />);
    expect(screen.getByRole("button", { name: "J'ai tout préparé" })).toBeInTheDocument();
  });

  it("affiche le bouton coché quand prepare est vrai", () => {
    render(<CarteMateriel items={items} tourneeId="t1" prepare={true} verifie={false} />);
    expect(screen.getByRole("button", { name: "✓ Préparé" })).toBeInTheDocument();
  });

  it("les deux boutons basculent indépendamment", () => {
    render(<CarteMateriel items={items} tourneeId="t1" prepare={true} verifie={false} />);
    expect(screen.getByRole("button", { name: "✓ Préparé" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tout vérifié" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run components/ui/CarteMateriel.test.tsx`
Expected: FAIL — le module `./CarteMateriel` n'existe pas encore.

- [ ] **Step 3: Implémenter le composant**

Créer `components/ui/CarteMateriel.tsx` :

```tsx
import { FormulaireAvecRetour } from "@/components/ui/FormulaireAvecRetour";
import { updateMaterielAction } from "@/lib/data/materiel-actions";
import type { MaterielItem } from "@/lib/data/materiel";

interface CarteMaterielProps {
  items: MaterielItem[];
  tourneeId: string;
  prepare: boolean;
  verifie: boolean;
}

export function CarteMateriel({ items, tourneeId, prepare, verifie }: CarteMaterielProps) {
  return (
    <div className="mt-5 rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-navy/45">
        Matériel du jour
      </p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {items.map((item) => (
          <li
            key={item.libelle}
            className="flex items-center justify-between text-[13.5px] text-navy/75"
          >
            <span>{item.libelle}</span>
            <span className="font-semibold tabular-nums">×{item.quantite}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <FormulaireAvecRetour
          action={updateMaterielAction}
          messageSucces="Matériel préparé."
          className="flex-1"
        >
          <input type="hidden" name="tourneeId" value={tourneeId} />
          <input type="hidden" name="champ" value="prepare" />
          <button
            type="submit"
            className={`w-full rounded-[12px] px-3 py-2 text-[13px] font-semibold ${
              prepare ? "bg-teal/10 text-[#0E7E70]" : "bg-brand-violet/10 text-brand-violet"
            }`}
          >
            {prepare ? "✓ Préparé" : "J'ai tout préparé"}
          </button>
        </FormulaireAvecRetour>
        <FormulaireAvecRetour
          action={updateMaterielAction}
          messageSucces="Matériel vérifié."
          className="flex-1"
        >
          <input type="hidden" name="tourneeId" value={tourneeId} />
          <input type="hidden" name="champ" value="verifie" />
          <button
            type="submit"
            className={`w-full rounded-[12px] px-3 py-2 text-[13px] font-semibold ${
              verifie ? "bg-teal/10 text-[#0E7E70]" : "bg-brand-violet/10 text-brand-violet"
            }`}
          >
            {verifie ? "✓ Vérifié" : "Tout vérifié"}
          </button>
        </FormulaireAvecRetour>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

Run: `npx vitest run components/ui/CarteMateriel.test.tsx`
Expected: PASS (4/4)

- [ ] **Step 5: Wirer la carte dans `/ma-journee`**

Dans `app/(app)/ma-journee/page.tsx`, ajouter les imports (à côté des imports existants, lignes 4-8) :

```tsx
import { getMaterielDuJour } from "@/lib/data/materiel";
import { CarteMateriel } from "@/components/ui/CarteMateriel";
```

Charger le matériel du jour en parallèle des missions (lignes 38-43) :

Avant :
```tsx
  const tournee = user ? await getTourneeDuJour(supabase, user.id) : null;
  const [missions, contexte] = tournee
    ? await Promise.all([
        getMissionsDuJour(supabase, tournee.id),
        getMissionEnCoursHref(supabase, tournee.id),
      ])
    : [[], null];
```

Après :
```tsx
  const tournee = user ? await getTourneeDuJour(supabase, user.id) : null;
  const [missions, contexte, materiel] = tournee
    ? await Promise.all([
        getMissionsDuJour(supabase, tournee.id),
        getMissionEnCoursHref(supabase, tournee.id),
        getMaterielDuJour(supabase, tournee.id),
      ])
    : [[], null, []];
```

Insérer la carte juste après le bloc de statistiques et avant le bloc des missions (entre la ligne 108, qui ferme le `{tournee ? (...) : (...)}`, et la ligne 110, qui ouvre `{tournee && (<div className="mt-7">`) :

Avant :
```tsx
        {tournee ? (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <CarteInformation label="Patients" value={tournee.nbPatients} />
            <CarteInformation label="Injections" value={tournee.nbInjections} accentuee />
            <CarteInformation label="Pansements" value={tournee.nbPansements} accentuee />
            <CarteInformation label="Glycémies" value={tournee.nbGlycemies} accentuee />
          </div>
        ) : (
          <div className="mt-8 flex items-center gap-4">
            <Image
              src="/marketing/ely-nouveau-portrait.webp"
              alt=""
              width={379}
              height={231}
              className="h-16 w-16 shrink-0 object-contain"
            />
            <p className="text-navy/60">Aucune tournée enregistrée pour aujourd&apos;hui.</p>
          </div>
        )}

        {tournee && (
```

Après :
```tsx
        {tournee ? (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <CarteInformation label="Patients" value={tournee.nbPatients} />
            <CarteInformation label="Injections" value={tournee.nbInjections} accentuee />
            <CarteInformation label="Pansements" value={tournee.nbPansements} accentuee />
            <CarteInformation label="Glycémies" value={tournee.nbGlycemies} accentuee />
          </div>
        ) : (
          <div className="mt-8 flex items-center gap-4">
            <Image
              src="/marketing/ely-nouveau-portrait.webp"
              alt=""
              width={379}
              height={231}
              className="h-16 w-16 shrink-0 object-contain"
            />
            <p className="text-navy/60">Aucune tournée enregistrée pour aujourd&apos;hui.</p>
          </div>
        )}

        {tournee && materiel.length > 0 && (
          <CarteMateriel
            items={materiel}
            tourneeId={tournee.id}
            prepare={tournee.materielPrepare}
            verifie={tournee.materielVerifie}
          />
        )}

        {tournee && (
```

- [ ] **Step 6: Lancer la suite complète, typecheck, lint**

Run: `npx vitest run`
Expected: PASS (tous les fichiers)

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: aucune nouvelle erreur

Run: `npx eslint components/ui/CarteMateriel.tsx components/ui/CarteMateriel.test.tsx "app/(app)/ma-journee/page.tsx"`
Expected: aucune erreur

- [ ] **Step 7: Commit**

```bash
git add components/ui/CarteMateriel.tsx components/ui/CarteMateriel.test.tsx "app/(app)/ma-journee/page.tsx"
git commit -m "feat(materiel): carte Materiel du jour sur /ma-journee"
```

## Vérification manuelle (hors suite automatisée)

Sur `/ma-journee` (authentifié) avec une tournée du jour comportant des
actes de pansement/injection catalogués (AMI 1, AMI 2, AMI 4, AMI 9, AMI 14
ou AIS 3), confirmer que la carte "Matériel du jour" affiche une liste
cohérente avec les quantités sommées correctement, que les deux boutons
("J'ai tout préparé" / "Tout vérifié") basculent indépendamment leur
libellé et couleur au clic, et que l'état persiste après rechargement de
la page. Sur une tournée sans acte technique catalogué (uniquement
forfaits BSA/BSB/BSC ou téléconsultation), confirmer que la carte ne
s'affiche pas du tout.
