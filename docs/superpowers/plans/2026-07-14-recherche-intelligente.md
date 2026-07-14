# Recherche Intelligente Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à un IDEL connecté de rechercher une Situation Terrain (texte libre, tolérant les fautes de frappe) et de consulter son détail complet avec la Mission Clinique liée.

**Architecture:** Recherche plein-texte Postgres (`tsvector` + `websearch_to_tsquery`, config `french`) exposée via une fonction RPC, avec repli automatique en recherche trigram (`pg_trgm`) si la recherche plein-texte ne renvoie rien. Deux nouvelles routes protégées (`/recherche`, `/situations/[id]`) suivant exactement le pattern déjà en place pour `/ma-journee` (Server Components, `proxy.ts`, `lib/data/*.ts`).

**Tech Stack:** Next.js 16 (App Router, Server Components), Supabase (Postgres RPC + RLS existante), TypeScript strict, Vitest, Playwright.

Ce plan suppose le socle technique déjà en place et déployé (voir
`docs/superpowers/plans/2026-07-13-fondations-stack.md`) et la Tâche 10 de correctifs
déjà fusionnée — en particulier la policy `situations_terrain_select_published`
qui exige déjà `published = true and auth.role() = 'authenticated'`.

Spec complète : `docs/superpowers/specs/2026-07-14-recherche-intelligente-design.md`.

## Global Constraints

- Next.js 16 : `searchParams` et `params` sont des `Promise` dans les Server Components — toujours `await` avant utilisation (comme `cookies()` dans `lib/supabase/server.ts`).
- Client Supabase serveur : `await createClient()` (async, jamais l'ancienne forme synchrone).
- RLS : ne jamais ajouter de nouvelle policy sur `situations_terrain`/`missions_cliniques` — celles de la Tâche 10 (`published = true and auth.role() = 'authenticated'`) couvrent déjà ce chantier. Toute nouvelle fonction Postgres doit rester en sécurité "invoker" (pas de `security definer`) pour que ces policies s'appliquent.
- Style Tailwind v4 : tokens `@theme` existants uniquement (`bg-navy`, `text-navy`, `bg-primary`, `bg-danger`, `rounded-card`), pas de nouvelle couleur. Grille d'espacement stricte en multiples de 8px (`p-6`=24px, `gap-4`=16px, `px-4 py-2`=16/8px — jamais `p-3`/`gap-3`/`py-1`).
- Contraste WCAG 2.2 AA (4.5:1 texte normal, 3:1 grand texte/gras) : ne pas introduire de nouvelle combinaison texte/fond sans vérifier le ratio. Ce plan réutilise uniquement des combinaisons déjà validées (`text-navy` sur blanc/`bg-navy/10`).
- `lang="fr"` déjà en place — toutes les nouvelles pages sont en français (copie UI, messages d'état vide/erreur).
- Aucun usage de `service_role` dans le code applicatif (`app/`, `lib/`, `components/`).
- Workflow Supabase distant uniquement (pas de Docker local) : un implémenteur écrit un fichier de migration mais ne l'exécute jamais contre le projet distant (`supabase db push`) — c'est le contrôleur qui l'applique après revue, avec autorisation explicite.
- Pattern couche données établi (`lib/data/ma-journee.ts`) : fonctions qui mappent explicitement snake_case → camelCase, testées avec un client Supabase simulé (pas de mock de bibliothèque, un objet littéral qui imite la chaîne d'appels utilisée).

---

### Task 1: Migration — colonne de recherche + fonction RPC

**Files:**
- Create: `supabase/migrations/20260714000300_search_recherche.sql`

**Interfaces:**
- Produces: une fonction Postgres `public.search_situations_terrain(search_query text) returns setof public.situations_terrain`, appelable via `supabase.rpc("search_situations_terrain", { search_query })`. Consommée par la Tâche 2.
- Produces: colonne `situations_terrain.search_vector` (tsvector, maintenue par trigger — usage interne, jamais lue directement par l'app).

Aucun test automatisé n'est possible pour cette tâche : il n'y a pas d'instance
Postgres locale (pas de Docker sur cette machine, workflow 100% distant). Le rôle
de l'implémenteur est d'écrire un SQL syntaxiquement et sémantiquement correct ;
la vérification se fait par relecture (revue de tâche) puis application réelle
par le contrôleur après revue, avec autorisation explicite de l'utilisateur.

- [ ] **Step 1: Écrire la migration**

```sql
create extension if not exists "pg_trgm";

alter table public.situations_terrain
  add column search_vector tsvector;

-- Colonne maintenue par trigger (et non "generated always as ... stored") car
-- to_tsvector(regconfig, text) est STABLE, pas IMMUTABLE, et Postgres interdit
-- les expressions non-immutables dans une colonne générée.
create or replace function public.situations_terrain_search_vector_update()
returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('french', coalesce(new.titre, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(new.observation, '')), 'B') ||
    setweight(to_tsvector(
      'french',
      coalesce(new.causes_possibles::text, '') || ' ' || coalesce(new.conduite_a_tenir::text, '')
    ), 'C');
  return new;
end;
$$ language plpgsql set search_path = public;

create trigger situations_terrain_search_vector_trigger
  before insert or update on public.situations_terrain
  for each row execute function public.situations_terrain_search_vector_update();

-- Backfill : le trigger ne s'applique qu'aux futurs insert/update, il faut donc
-- forcer une passe sur les lignes du seed (Tâche 4 du socle) déjà en base.
update public.situations_terrain set updated_at = updated_at;

create index situations_terrain_search_vector_idx
  on public.situations_terrain using gin (search_vector);

create index situations_terrain_trigram_idx
  on public.situations_terrain using gin ((titre || ' ' || observation) gin_trgm_ops);

-- SECURITY INVOKER (par défaut, pas de "security definer") : la fonction
-- s'exécute avec les droits de l'appelant, donc la policy RLS
-- situations_terrain_select_published continue de filtrer chaque ligne renvoyée.
create or replace function public.search_situations_terrain(search_query text)
returns setof public.situations_terrain as $$
begin
  return query
    select s.*
    from public.situations_terrain s
    where s.published = true
      and s.search_vector @@ websearch_to_tsquery('french', search_query)
    order by ts_rank(s.search_vector, websearch_to_tsquery('french', search_query)) desc
    limit 10;

  if not found then
    return query
      select s.*
      from public.situations_terrain s
      where s.published = true
        and similarity(s.titre || ' ' || s.observation, search_query) > 0.2
      order by similarity(s.titre || ' ' || s.observation, search_query) desc
      limit 10;
  end if;
end;
$$ language plpgsql stable set search_path = public;

revoke execute on function public.search_situations_terrain(text) from public;
grant execute on function public.search_situations_terrain(text) to authenticated;
```

- [ ] **Step 2: Relire le fichier et vérifier**

Vérifier manuellement (lecture, pas d'exécution) :
- Les noms de colonnes (`titre`, `observation`, `causes_possibles`, `conduite_a_tenir`, `quand_avis_medical`) correspondent exactement à `supabase/migrations/20260714000000_core_schema.sql`.
- Le nom du fichier suit la convention de timestamp des migrations existantes (`20260714000000`, `20260714000100`, `20260714000200` → `20260714000300`).
- Pas de `security definer` sur la nouvelle fonction (elle doit rester invoker pour que RLS s'applique).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260714000300_search_recherche.sql
git commit -m "feat(recherche): search_vector + fonction RPC search_situations_terrain"
```

---

### Task 2: Couche données — recherche et détail

**Files:**
- Create: `lib/data/recherche.ts`
- Test: `lib/data/recherche.test.ts`
- Modify: `lib/types/clinical.ts`

**Interfaces:**
- Consomme : le type `SituationTerrain` et `MissionClinique` déjà définis dans `lib/types/clinical.ts` ; la fonction RPC `search_situations_terrain` produite par la Tâche 1.
- Produces :
  - `searchSituationsTerrain(supabase: SupabaseClient, query: string): Promise<SituationTerrain[]>`
  - `getSituationTerrainDetail(supabase: SupabaseClient, id: string): Promise<SituationTerrainDetail | null>`
  - Type `SituationTerrainDetail` (export de `lib/types/clinical.ts`), consommé par les Tâches 3 et 4.

- [ ] **Step 1: Ajouter le type `SituationTerrainDetail`**

Dans `lib/types/clinical.ts`, ajouter à la fin du fichier :

```ts
export interface SituationTerrainDetail extends SituationTerrain {
  missions: MissionClinique[];
}
```

- [ ] **Step 2: Écrire les tests (échouent d'abord)**

Créer `lib/data/recherche.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("searchSituationsTerrain", () => {
  it("retourne un tableau vide pour une recherche vide, sans appeler la RPC", async () => {
    const rpc = vi.fn();
    const fakeClient = { rpc } as unknown as SupabaseClient;

    const { searchSituationsTerrain } = await import("./recherche");
    const result = await searchSituationsTerrain(fakeClient, "   ");

    expect(result).toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("mappe les colonnes snake_case de la RPC vers SituationTerrain", async () => {
    const fakeClient = {
      rpc: (fn: string, args: Record<string, unknown>) => {
        expect(fn).toBe("search_situations_terrain");
        expect(args).toEqual({ search_query: "hypoglycémie" });
        return Promise.resolve({
          data: [
            {
              id: "s1",
              titre: "Hypoglycémie chez un patient diabétique",
              observation: "Sueurs, tremblements.",
              verifications: ["Mesurer la glycémie"],
              causes_possibles: ["Insuline surdosée"],
              conduite_a_tenir: ["Resucrage oral"],
              quand_avis_medical: "Si la glycémie reste basse.",
              sources: ["HAS"],
              specialite: "idel",
              niveau_confiance: "valide",
              version: 1,
              published: true,
            },
          ],
          error: null,
        });
      },
    } as unknown as SupabaseClient;

    const { searchSituationsTerrain } = await import("./recherche");
    const result = await searchSituationsTerrain(fakeClient, "hypoglycémie");

    expect(result).toEqual([
      {
        id: "s1",
        titre: "Hypoglycémie chez un patient diabétique",
        observation: "Sueurs, tremblements.",
        verifications: ["Mesurer la glycémie"],
        causesPossibles: ["Insuline surdosée"],
        conduiteATenir: ["Resucrage oral"],
        quandAvisMedical: "Si la glycémie reste basse.",
        sources: ["HAS"],
        specialite: "idel",
        niveauConfiance: "valide",
        version: 1,
        published: true,
      },
    ]);
  });

  it("retourne un tableau vide si la RPC renvoie une erreur", async () => {
    const fakeClient = {
      rpc: () => Promise.resolve({ data: null, error: { message: "boom" } }),
    } as unknown as SupabaseClient;

    const { searchSituationsTerrain } = await import("./recherche");
    const result = await searchSituationsTerrain(fakeClient, "test");

    expect(result).toEqual([]);
  });
});

describe("getSituationTerrainDetail", () => {
  it("retourne null si la situation n'existe pas ou n'est pas publiée", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getSituationTerrainDetail } = await import("./recherche");
    const result = await getSituationTerrainDetail(fakeClient, "unknown");

    expect(result).toBeNull();
  });

  it("mappe la situation et ses missions cliniques liées", async () => {
    const fakeClient = {
      from: (table: string) => {
        if (table === "situations_terrain") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () =>
                    Promise.resolve({
                      data: {
                        id: "s1",
                        titre: "Hypoglycémie chez un patient diabétique",
                        observation: "Sueurs, tremblements.",
                        verifications: ["Mesurer la glycémie"],
                        causes_possibles: ["Insuline surdosée"],
                        conduite_a_tenir: ["Resucrage oral"],
                        quand_avis_medical: "Si la glycémie reste basse.",
                        sources: ["HAS"],
                        specialite: "idel",
                        niveau_confiance: "valide",
                        version: 1,
                        published: true,
                      },
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              eq: () =>
                Promise.resolve({
                  data: [
                    {
                      id: "m1",
                      titre: "Prise en charge hypoglycémie",
                      situation_terrain_id: "s1",
                      etapes: [{ titre: "Évaluation", description: "Mesurer la glycémie" }],
                      duree_estimee_min: 20,
                      published: true,
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        };
      },
    } as unknown as SupabaseClient;

    const { getSituationTerrainDetail } = await import("./recherche");
    const result = await getSituationTerrainDetail(fakeClient, "s1");

    expect(result).toEqual({
      id: "s1",
      titre: "Hypoglycémie chez un patient diabétique",
      observation: "Sueurs, tremblements.",
      verifications: ["Mesurer la glycémie"],
      causesPossibles: ["Insuline surdosée"],
      conduiteATenir: ["Resucrage oral"],
      quandAvisMedical: "Si la glycémie reste basse.",
      sources: ["HAS"],
      specialite: "idel",
      niveauConfiance: "valide",
      version: 1,
      published: true,
      missions: [
        {
          id: "m1",
          titre: "Prise en charge hypoglycémie",
          situationTerrainId: "s1",
          etapes: [{ titre: "Évaluation", description: "Mesurer la glycémie" }],
          dureeEstimeeMin: 20,
          published: true,
        },
      ],
    });
  });
});
```

- [ ] **Step 3: Lancer les tests et vérifier qu'ils échouent**

Run: `npx vitest run lib/data/recherche.test.ts`
Expected: FAIL — `./recherche` n'existe pas encore.

- [ ] **Step 4: Implémenter**

Créer `lib/data/recherche.ts` :

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MissionClinique,
  SituationTerrain,
  SituationTerrainDetail,
} from "@/lib/types/clinical";

function mapSituationTerrain(row: any): SituationTerrain {
  return {
    id: row.id,
    titre: row.titre,
    observation: row.observation,
    verifications: row.verifications,
    causesPossibles: row.causes_possibles,
    conduiteATenir: row.conduite_a_tenir,
    quandAvisMedical: row.quand_avis_medical,
    sources: row.sources,
    specialite: row.specialite,
    niveauConfiance: row.niveau_confiance,
    version: row.version,
    published: row.published,
  };
}

function mapMissionClinique(row: any): MissionClinique {
  return {
    id: row.id,
    titre: row.titre,
    situationTerrainId: row.situation_terrain_id,
    etapes: row.etapes,
    dureeEstimeeMin: row.duree_estimee_min,
    published: row.published,
  };
}

export async function searchSituationsTerrain(
  supabase: SupabaseClient,
  query: string
): Promise<SituationTerrain[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data, error } = await supabase.rpc("search_situations_terrain", {
    search_query: trimmed,
  });

  if (error || !data) return [];

  return data.map(mapSituationTerrain);
}

export async function getSituationTerrainDetail(
  supabase: SupabaseClient,
  id: string
): Promise<SituationTerrainDetail | null> {
  const { data: situation, error: situationError } = await supabase
    .from("situations_terrain")
    .select("*")
    .eq("id", id)
    .eq("published", true)
    .maybeSingle();

  if (situationError || !situation) return null;

  const { data: missions, error: missionsError } = await supabase
    .from("missions_cliniques")
    .select("*")
    .eq("situation_terrain_id", id)
    .eq("published", true);

  return {
    ...mapSituationTerrain(situation),
    missions: missionsError || !missions ? [] : missions.map(mapMissionClinique),
  };
}
```

- [ ] **Step 5: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run lib/data/recherche.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/data/recherche.ts lib/data/recherche.test.ts lib/types/clinical.ts
git commit -m "feat(recherche): couche données searchSituationsTerrain + getSituationTerrainDetail"
```

---

### Task 3: Écran de recherche `/recherche`

**Files:**
- Create: `app/recherche/page.tsx`
- Create: `components/ui/CarteSituationTerrain.tsx`
- Test: `components/ui/CarteSituationTerrain.test.tsx`
- Modify: `proxy.ts`

**Interfaces:**
- Consomme : `searchSituationsTerrain` (Task 2), `createClient` (`lib/supabase/server.ts`), `Button` (`components/ui/Button.tsx`).
- Produces : composant `CarteSituationTerrain`, réutilisé nulle part ailleurs pour l'instant mais exporté pour cohérence avec `CarteInformation`/`CarteMission`.

- [ ] **Step 1: Écrire le test du composant (échoue d'abord)**

Créer `components/ui/CarteSituationTerrain.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CarteSituationTerrain } from "./CarteSituationTerrain";
import type { SituationTerrain } from "@/lib/types/clinical";

const situation: SituationTerrain = {
  id: "s1",
  titre: "Hypoglycémie chez un patient diabétique",
  observation: "Le patient présente des sueurs, des tremblements et une confusion légère.",
  verifications: [],
  causesPossibles: [],
  conduiteATenir: [],
  quandAvisMedical: "",
  sources: [],
  specialite: "idel",
  niveauConfiance: "valide",
  version: 1,
  published: true,
};

describe("CarteSituationTerrain", () => {
  it("affiche le titre, l'observation et un lien vers la page détail", () => {
    render(<CarteSituationTerrain situation={situation} />);

    expect(screen.getByText(situation.titre)).toBeInTheDocument();
    expect(screen.getByText(/sueurs, des tremblements/)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/situations/s1");
  });
});
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npx vitest run components/ui/CarteSituationTerrain.test.tsx`
Expected: FAIL — `./CarteSituationTerrain` n'existe pas encore.

- [ ] **Step 3: Implémenter le composant**

Créer `components/ui/CarteSituationTerrain.tsx` :

```tsx
import Link from "next/link";
import type { SituationTerrain } from "@/lib/types/clinical";

interface CarteSituationTerrainProps {
  situation: SituationTerrain;
}

export function CarteSituationTerrain({ situation }: CarteSituationTerrainProps) {
  return (
    <Link
      href={`/situations/${situation.id}`}
      className="block rounded-card border border-navy/10 bg-white p-6 hover:border-primary"
    >
      <div className="flex gap-4">
        <span className="rounded-full bg-navy/10 px-4 py-2 text-sm text-navy">
          {situation.specialite}
        </span>
        <span className="rounded-full bg-navy/10 px-4 py-2 text-sm text-navy">
          {situation.niveauConfiance}
        </span>
      </div>
      <h2 className="mt-4 text-xl font-semibold text-navy">{situation.titre}</h2>
      <p className="mt-2 line-clamp-2 text-navy/70">{situation.observation}</p>
    </Link>
  );
}
```

- [ ] **Step 4: Lancer le test et vérifier qu'il passe**

Run: `npx vitest run components/ui/CarteSituationTerrain.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: Créer la page de recherche**

Créer `app/recherche/page.tsx` :

```tsx
import { createClient } from "@/lib/supabase/server";
import { searchSituationsTerrain } from "@/lib/data/recherche";
import { CarteSituationTerrain } from "@/components/ui/CarteSituationTerrain";
import { Button } from "@/components/ui/Button";

export default async function RecherchePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q ?? "";

  const supabase = await createClient();
  const results = query.trim() ? await searchSituationsTerrain(supabase, query) : [];

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-navy">Recherche</h1>

      <form method="GET" className="flex gap-4">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Ex. : la perfusion ne passe plus"
          aria-label="Rechercher une situation terrain"
          className="min-h-[44px] flex-1 rounded-card border border-navy/20 px-4 py-2 text-navy"
        />
        <Button type="submit">Rechercher</Button>
      </form>

      {query.trim() && results.length === 0 && (
        <p className="text-navy/70">Aucun résultat pour « {query} ».</p>
      )}

      <div className="flex flex-col gap-4">
        {results.map((situation) => (
          <CarteSituationTerrain key={situation.id} situation={situation} />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Protéger la route dans `proxy.ts`**

Dans `proxy.ts`, modifier :

```ts
const PROTECTED_PATHS = ["/ma-journee", "/recherche"];
```

et :

```ts
export const config = {
  matcher: ["/ma-journee/:path*", "/recherche/:path*"],
};
```

- [ ] **Step 7: Vérifier la compilation**

Run: `npm run build`
Expected: PASS (0 erreur TypeScript)

- [ ] **Step 8: Commit**

```bash
git add app/recherche components/ui/CarteSituationTerrain.tsx components/ui/CarteSituationTerrain.test.tsx proxy.ts
git commit -m "feat(recherche): écran de recherche /recherche"
```

---

### Task 4: Page détail `/situations/[id]`

**Files:**
- Create: `app/situations/[id]/page.tsx`
- Modify: `proxy.ts`

**Interfaces:**
- Consomme : `getSituationTerrainDetail` (Task 2), `createClient` (`lib/supabase/server.ts`), `notFound` (`next/navigation`).

- [ ] **Step 1: Créer la page détail**

Créer `app/situations/[id]/page.tsx` :

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSituationTerrainDetail } from "@/lib/data/recherche";

export default async function SituationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const situation = await getSituationTerrainDetail(supabase, id);

  if (!situation) notFound();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <Link href="/recherche" className="text-primary hover:underline">
        ← Retour à la recherche
      </Link>

      <h1 className="text-2xl font-semibold text-navy">{situation.titre}</h1>

      <section>
        <h2 className="text-lg font-semibold text-navy">Observation</h2>
        <p className="mt-2 text-navy/80">{situation.observation}</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-navy">Vérifications</h2>
        <ul className="mt-2 list-disc pl-6 text-navy/80">
          {situation.verifications.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-navy">Causes possibles</h2>
        <ul className="mt-2 list-disc pl-6 text-navy/80">
          {situation.causesPossibles.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-navy">Conduite à tenir</h2>
        <ul className="mt-2 list-disc pl-6 text-navy/80">
          {situation.conduiteATenir.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-card border border-danger/30 bg-danger/5 p-6">
        <h2 className="text-lg font-semibold text-navy">Quand demander un avis médical</h2>
        <p className="mt-2 text-navy/80">{situation.quandAvisMedical}</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-navy">Sources</h2>
        <ul className="mt-2 list-disc pl-6 text-navy/80">
          {situation.sources.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      {situation.missions.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-navy">Mission clinique liée</h2>
          <div className="mt-2 flex flex-col gap-4">
            {situation.missions.map((mission) => (
              <div key={mission.id} className="rounded-card border border-navy/10 bg-white p-6">
                <p className="font-semibold text-navy">{mission.titre}</p>
                <p className="mt-2 text-sm text-navy/60">
                  Durée estimée : {mission.dureeEstimeeMin} min
                </p>
                <ol className="mt-4 list-decimal pl-6 text-navy/80">
                  {mission.etapes.map((etape) => (
                    <li key={etape.titre}>
                      <span className="font-medium text-navy">{etape.titre}</span> — {etape.description}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Protéger la route dans `proxy.ts`**

```ts
const PROTECTED_PATHS = ["/ma-journee", "/recherche", "/situations"];
```

et :

```ts
export const config = {
  matcher: ["/ma-journee/:path*", "/recherche/:path*", "/situations/:path*"],
};
```

- [ ] **Step 3: Vérifier la compilation**

Run: `npm run build`
Expected: PASS (0 erreur TypeScript)

- [ ] **Step 4: Commit**

```bash
git add app/situations proxy.ts
git commit -m "feat(recherche): page détail /situations/[id]"
```

---

### Task 5: Tests e2e + vérification manuelle

**Files:**
- Create: `e2e/recherche.spec.ts`

**Interfaces:**
- Consomme : les routes `/recherche` et `/situations/[id]` (Tâches 3 et 4), le pattern Playwright existant (`e2e/smoke.spec.ts`, `playwright.config.ts`).

Comme pour la Tâche 8 du socle, aucun compte de test n'est câblé en CI (pas de
secret de mot de passe de test dans GitHub Actions) — les tests e2e automatisés
couvrent le comportement non-authentifié (redirection), et la recherche
authentifiée réelle est vérifiée manuellement par le contrôleur après
déploiement, pas par un test Playwright avec identifiants en dur.

- [ ] **Step 1: Écrire les tests**

Créer `e2e/recherche.spec.ts` :

```ts
import { test, expect } from "@playwright/test";

test.describe("Recherche (non authentifié)", () => {
  test("redirige /recherche vers /login", async ({ page }) => {
    await page.goto("/recherche");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirige /situations/[id] vers /login", async ({ page }) => {
    await page.goto("/situations/00000000-0000-0000-0000-000000000000");
    await expect(page).toHaveURL(/\/login/);
  });
});
```

- [ ] **Step 2: Lancer les tests**

Run: `npx playwright test e2e/recherche.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 3: Commit**

```bash
git add e2e/recherche.spec.ts
git commit -m "test(e2e): redirection non-authentifiée pour /recherche et /situations"
```

- [ ] **Step 4: Vérification manuelle post-déploiement (contrôleur, avec autorisation)**

Après fusion et déploiement, le contrôleur se connecte avec un compte IDEL de
test (existant ou nouvellement créé via l'API Admin Supabase, comme pour la
Tâche 8) et vérifie dans l'application déployée :
- `/recherche?q=hypoglycémie` renvoie la Situation Terrain "Hypoglycémie chez un
  patient diabétique".
- Cliquer sur le résultat ouvre `/situations/[id]` avec l'observation, la
  conduite à tenir, et la Mission Clinique liée ("Prise en charge
  hypoglycémie").
- `/recherche?q=pansement` renvoie "Pansement qui saigne de façon inhabituelle"
  **sans** section Mission Clinique (aucune mission liée dans le seed — vérifie
  le cas limite documenté dans la spec).
- `/recherche?q=xyzabc123` (terme absent du contenu) affiche « Aucun résultat
  pour « xyzabc123 ». » sans erreur.

---

## Résultat à la fin de ce plan

Un IDEL connecté peut rechercher une Situation Terrain en texte libre (avec
tolérance aux fautes de frappe grâce au repli trigram), voir la liste des
résultats, et consulter le détail complet d'une situation avec sa Mission
Clinique liée — le tout protégé par authentification et RLS, sans nouvelle
dépendance externe. C'est la première brique de l'écosystème clinique décrit
dans SOINELY CORE ; les chantiers suivants (Situation Terrain en consultation
dédiée, Copilote Clinique) s'appuieront sur cette recherche et cette page
détail.
