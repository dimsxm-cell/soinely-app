# Dossier de soins dans Explorer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second tab "Dossier de soins" to the Explorer screen (`/situations`), backed by a new `fiches_dossier_soins` table, so patient-care reference sheets can live alongside the existing Situations Terrain.

**Architecture:** New Supabase table + RLS policy mirroring `situations_terrain`, new TypeScript types in `lib/types/clinical.ts`, a new data-access module `lib/data/dossierSoins.ts`, two new small presentational components, and three page-level changes (`/situations` gets a tab bar, `/situations/dossier` and `/situations/dossier/[id]` are new routes). No changes to `proxy.ts` or the bottom nav — both are already broad enough to cover the new sub-routes.

**Tech Stack:** Next.js 16 (App Router, Server Components), React 19, Supabase (Postgres + RLS), TypeScript, Vitest, Tailwind v4.

## Global Constraints

- Design doc: `docs/superpowers/specs/2026-07-19-dossier-soins-explorer-design.md` — every task below implements a decision from that doc; do not deviate without updating it first.
- **No content is inserted into `fiches_dossier_soins` as part of this plan.** The clinical content drafts already live in `docs/contenu-clinique/2026-07-19-dossier-soins-*.md`, marked brouillon, awaiting fiche-by-fiche validation by the founder (Marie-Christine). This plan only builds the empty-state-capable screen and schema. See "Hors scope" in the design doc.
- Match existing code style: French function/variable names for domain concepts (`getAllFichesDossierSoins`, not `getAllCareSheets`), file-per-responsibility, Server Components by default (no `"use client"` unless genuinely needed).
- Every new SQL string embedded in code must use the project's existing quoting/escaping conventions (single-quoted SQL, `''` for embedded apostrophes).

---

### Task 1: Migration — `fiches_dossier_soins` table

**Files:**
- Create: `supabase/migrations/20260719000100_fiches_dossier_soins.sql`

**Interfaces:**
- Produces: table `public.fiches_dossier_soins` with columns `id, section, titre, resume, contenu, sources, ordre, niveau_confiance, version, published, created_at, updated_at`, used by Task 3's data layer.

- [ ] **Step 1: Write the migration file**

```sql
create table public.fiches_dossier_soins (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in (
    'identification_patient',
    'traitements',
    'surveillance_clinique',
    'protocoles_urgence',
    'transmissions_infirmieres',
    'prescriptions_liaisons_medicales',
    'administratif',
    'allergies_alertes',
    'contacts_utiles'
  )),
  titre text not null,
  resume text not null,
  contenu jsonb not null default '[]',
  sources jsonb not null default '[]',
  ordre int not null default 0,
  niveau_confiance text not null default 'brouillon' check (niveau_confiance in ('brouillon','relu','valide')),
  version int not null default 1,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fiches_dossier_soins enable row level security;

create policy "fiches_dossier_soins_select_published" on public.fiches_dossier_soins
  for select using (published = true and auth.role() = 'authenticated');
```

- [ ] **Step 2: Apply the migration locally and verify the table exists**

Run: `npx supabase db reset`
Expected: migration runs without error; output includes `20260719000100_fiches_dossier_soins.sql` in the applied list.

Then run: `npx supabase db execute --local -- "select count(*) from public.fiches_dossier_soins;"` (or open the local Studio at the URL printed by `supabase status` and check the table exists under `public`).
Expected: `0` rows, no error — confirms the table and RLS policy were created correctly.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260719000100_fiches_dossier_soins.sql
git commit -m "feat: add fiches_dossier_soins table"
```

---

### Task 2: Types — `lib/types/clinical.ts`

**Files:**
- Modify: `lib/types/clinical.ts` (append at end of file, after `SituationTerrainDetail`)

**Interfaces:**
- Consumes: `NiveauConfiance` (already defined at the top of this file).
- Produces: `SectionDossierSoin`, `BlocContenuFiche`, `FicheDossierSoin` — consumed by Task 3 (data layer), Task 5 (`CarteFicheDossier`), Task 8 (detail page).

- [ ] **Step 1: Append the new types**

```ts
export type SectionDossierSoin =
  | "identification_patient"
  | "traitements"
  | "surveillance_clinique"
  | "protocoles_urgence"
  | "transmissions_infirmieres"
  | "prescriptions_liaisons_medicales"
  | "administratif"
  | "allergies_alertes"
  | "contacts_utiles";

export interface BlocContenuFiche {
  titre: string;
  items: string[];
}

export interface FicheDossierSoin {
  id: string;
  section: SectionDossierSoin;
  titre: string;
  resume: string;
  contenu: BlocContenuFiche[];
  sources: string[];
  ordre: number;
  niveauConfiance: NiveauConfiance;
  version: number;
  published: boolean;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors (pre-existing errors, if any, are unrelated to this file — do not fix unrelated errors here).

- [ ] **Step 3: Commit**

```bash
git add lib/types/clinical.ts
git commit -m "feat: add FicheDossierSoin types"
```

---

### Task 3: Data layer — `lib/data/dossierSoins.ts`

**Files:**
- Create: `lib/data/dossierSoins.ts`
- Create: `lib/data/dossierSoins.test.ts`

**Interfaces:**
- Consumes: `Database["public"]["Tables"]["fiches_dossier_soins"]["Row"]` (regenerate types first, Step 0 below), `FicheDossierSoin`, `SectionDossierSoin`, `BlocContenuFiche`, `NiveauConfiance` from `lib/types/clinical.ts`.
- Produces: `SECTIONS_DOSSIER_SOINS` (ordered array), `mapFicheDossierSoin(row)`, `getAllFichesDossierSoins(supabase)`, `getFicheDossierDetail(supabase, id)` — consumed by Task 6 and Task 8 (pages).

- [ ] **Step 0: Regenerate Supabase types**

Run: `npx supabase gen types typescript --local > lib/types/database.types.ts`
Expected: `lib/types/database.types.ts` now contains a `fiches_dossier_soins` entry under `Tables`, with `Row`/`Insert`/`Update` shapes matching Task 1's migration.

- [ ] **Step 2: Write the failing test**

```ts
// lib/data/dossierSoins.test.ts
import { describe, expect, it, vi } from "vitest";
import { getAllFichesDossierSoins, getFicheDossierDetail, SECTIONS_DOSSIER_SOINS } from "./dossierSoins";

function buildRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    section: "protocoles_urgence",
    titre: "Douleur — conduite à tenir",
    resume: "Résumé de test",
    contenu: [{ titre: "Bloc", items: ["item 1", "item 2"] }],
    sources: ["HAS"],
    ordre: 1,
    niveau_confiance: "valide",
    version: 1,
    published: true,
    created_at: "2026-07-19T00:00:00Z",
    updated_at: "2026-07-19T00:00:00Z",
    ...overrides,
  };
}

function buildSupabaseStub(rows: ReturnType<typeof buildRow>[], singleRow: ReturnType<typeof buildRow> | null = null) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          // getAllFichesDossierSoins chains .order("section").order("ordre") —
          // the first order() must return an object with a second order()
          // that resolves, not resolve directly itself.
          order: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: rows, error: null })),
          })),
          // getFicheDossierDetail chains .eq("id", id).eq("published", true).maybeSingle()
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: singleRow, error: null })),
          })),
        })),
      })),
    })),
  };
}

describe("SECTIONS_DOSSIER_SOINS", () => {
  it("lists all 9 sections in binder order", () => {
    expect(SECTIONS_DOSSIER_SOINS.map((s) => s.valeur)).toEqual([
      "identification_patient",
      "traitements",
      "surveillance_clinique",
      "protocoles_urgence",
      "transmissions_infirmieres",
      "prescriptions_liaisons_medicales",
      "administratif",
      "allergies_alertes",
      "contacts_utiles",
    ]);
  });
});

describe("getAllFichesDossierSoins", () => {
  it("maps rows to camelCase FicheDossierSoin, ordered by section then ordre", async () => {
    const rows = [buildRow(), buildRow({ id: "22222222-2222-2222-2222-222222222222", ordre: 2 })];
    const supabase = buildSupabaseStub(rows) as unknown as Parameters<typeof getAllFichesDossierSoins>[0];

    const result = await getAllFichesDossierSoins(supabase);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: "11111111-1111-1111-1111-111111111111",
      section: "protocoles_urgence",
      titre: "Douleur — conduite à tenir",
      resume: "Résumé de test",
      contenu: [{ titre: "Bloc", items: ["item 1", "item 2"] }],
      sources: ["HAS"],
      ordre: 1,
      niveauConfiance: "valide",
      version: 1,
      published: true,
    });
  });

  it("returns an empty array when no fiche is published", async () => {
    const supabase = buildSupabaseStub([]) as unknown as Parameters<typeof getAllFichesDossierSoins>[0];

    const result = await getAllFichesDossierSoins(supabase);

    expect(result).toEqual([]);
  });
});

describe("getFicheDossierDetail", () => {
  it("returns the mapped fiche when found and published", async () => {
    const row = buildRow();
    const supabase = buildSupabaseStub([], row) as unknown as Parameters<typeof getFicheDossierDetail>[0];

    const result = await getFicheDossierDetail(supabase, row.id);

    expect(result?.id).toBe(row.id);
    expect(result?.titre).toBe(row.titre);
  });

  it("returns null when not found", async () => {
    const supabase = buildSupabaseStub([], null) as unknown as Parameters<typeof getFicheDossierDetail>[0];

    const result = await getFicheDossierDetail(supabase, "does-not-exist");

    expect(result).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run lib/data/dossierSoins.test.ts`
Expected: FAIL — `Cannot find module './dossierSoins'` (file doesn't exist yet).

- [ ] **Step 4: Write the implementation**

```ts
// lib/data/dossierSoins.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import type {
  BlocContenuFiche,
  FicheDossierSoin,
  NiveauConfiance,
  SectionDossierSoin,
} from "@/lib/types/clinical";

type FicheDossierSoinRow = Database["public"]["Tables"]["fiches_dossier_soins"]["Row"];

export const SECTIONS_DOSSIER_SOINS: { valeur: SectionDossierSoin; label: string }[] = [
  { valeur: "identification_patient", label: "Identification du patient" },
  { valeur: "traitements", label: "Traitements" },
  { valeur: "surveillance_clinique", label: "Surveillance clinique" },
  { valeur: "protocoles_urgence", label: "Protocoles d'urgence (conduites à tenir)" },
  { valeur: "transmissions_infirmieres", label: "Transmissions infirmières" },
  { valeur: "prescriptions_liaisons_medicales", label: "Prescriptions et liaisons médicales" },
  { valeur: "administratif", label: "Administratif" },
  { valeur: "allergies_alertes", label: "Allergies et alertes" },
  { valeur: "contacts_utiles", label: "Contacts utiles" },
];

function mapFicheDossierSoin(row: FicheDossierSoinRow): FicheDossierSoin {
  return {
    id: row.id,
    section: row.section as SectionDossierSoin,
    titre: row.titre,
    resume: row.resume,
    contenu: row.contenu as BlocContenuFiche[],
    sources: row.sources as string[],
    ordre: row.ordre,
    niveauConfiance: row.niveau_confiance as NiveauConfiance,
    version: row.version,
    published: row.published,
  };
}

export async function getAllFichesDossierSoins(
  supabase: SupabaseClient<Database>
): Promise<FicheDossierSoin[]> {
  const { data, error } = await supabase
    .from("fiches_dossier_soins")
    .select("*")
    .eq("published", true)
    .order("section")
    .order("ordre");

  if (error || !data) return [];

  return data.map(mapFicheDossierSoin);
}

export async function getFicheDossierDetail(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<FicheDossierSoin | null> {
  const { data, error } = await supabase
    .from("fiches_dossier_soins")
    .select("*")
    .eq("id", id)
    .eq("published", true)
    .maybeSingle();

  if (error || !data) return null;

  return mapFicheDossierSoin(data);
}
```

Note: the double `.order("section").order("ordre")` chaining and the nested `.eq("id", id).eq("published", true).maybeSingle()` chaining must match what the test stub in Step 2 mocks — if the real Supabase client's chaining shape differs when you run this for real (vs. the stub), adjust the stub in Step 2, not the production code, since the production code must match `lib/data/recherche.ts`'s established call shape (`getAllSituationsTerrain`, `getSituationTerrainDetail`) exactly.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/data/dossierSoins.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/data/dossierSoins.ts lib/data/dossierSoins.test.ts lib/types/database.types.ts
git commit -m "feat: add dossierSoins data layer"
```

---

### Task 4: `OngletsExplorer` component

**Files:**
- Create: `components/ui/OngletsExplorer.tsx`
- Create: `components/ui/OngletsExplorer.test.tsx`

**Interfaces:**
- Produces: `OngletsExplorer({ actif }: { actif: "situations" | "dossier" })` — a two-tab nav bar, consumed by Task 6 (`/situations`) and Task 7 (`/situations/dossier`).

- [ ] **Step 1: Write the failing test**

```tsx
// components/ui/OngletsExplorer.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OngletsExplorer } from "./OngletsExplorer";

describe("OngletsExplorer", () => {
  it("renders both tab labels as links to their routes", () => {
    render(<OngletsExplorer actif="situations" />);

    const situations = screen.getByRole("link", { name: "Situations Terrain" });
    const dossier = screen.getByRole("link", { name: "Dossier de soins" });

    expect(situations).toHaveAttribute("href", "/situations");
    expect(dossier).toHaveAttribute("href", "/situations/dossier");
  });

  it("marks the active tab with aria-current", () => {
    render(<OngletsExplorer actif="dossier" />);

    expect(screen.getByRole("link", { name: "Dossier de soins" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Situations Terrain" })).not.toHaveAttribute("aria-current");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/ui/OngletsExplorer.test.tsx`
Expected: FAIL — `Cannot find module './OngletsExplorer'`.

- [ ] **Step 3: Write the implementation**

```tsx
// components/ui/OngletsExplorer.tsx
import Link from "next/link";

interface OngletsExplorerProps {
  actif: "situations" | "dossier";
}

const ONGLETS = [
  { cle: "situations" as const, href: "/situations", label: "Situations Terrain" },
  { cle: "dossier" as const, href: "/situations/dossier", label: "Dossier de soins" },
];

export function OngletsExplorer({ actif }: OngletsExplorerProps) {
  return (
    <div className="flex gap-6 border-b border-navy/10">
      {ONGLETS.map((onglet) => {
        const estActif = onglet.cle === actif;
        return (
          <Link
            key={onglet.cle}
            href={onglet.href}
            aria-current={estActif ? "page" : undefined}
            className={`-mb-px border-b-2 pb-3 text-sm font-medium transition-colors ${
              estActif ? "border-primary text-primary" : "border-transparent text-navy/50"
            }`}
          >
            {onglet.label}
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/ui/OngletsExplorer.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add components/ui/OngletsExplorer.tsx components/ui/OngletsExplorer.test.tsx
git commit -m "feat: add OngletsExplorer tab bar component"
```

---

### Task 5: `CarteFicheDossier` component

**Files:**
- Create: `components/ui/CarteFicheDossier.tsx`
- Create: `components/ui/CarteFicheDossier.test.tsx`

**Interfaces:**
- Consumes: `FicheDossierSoin` from `lib/types/clinical.ts` (Task 2).
- Produces: `CarteFicheDossier({ fiche }: { fiche: FicheDossierSoin })` — consumed by Task 7 (`/situations/dossier` list page).

- [ ] **Step 1: Write the failing test**

```tsx
// components/ui/CarteFicheDossier.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CarteFicheDossier } from "./CarteFicheDossier";
import type { FicheDossierSoin } from "@/lib/types/clinical";

const fiche: FicheDossierSoin = {
  id: "11111111-1111-1111-1111-111111111111",
  section: "protocoles_urgence",
  titre: "Douleur — conduite à tenir",
  resume: "Évaluation de la douleur et conduite à tenir.",
  contenu: [],
  sources: ["HAS"],
  ordre: 1,
  niveauConfiance: "brouillon",
  version: 1,
  published: true,
};

describe("CarteFicheDossier", () => {
  it("links to the fiche detail page and shows titre, resume and niveauConfiance badge", () => {
    render(<CarteFicheDossier fiche={fiche} />);

    const lien = screen.getByRole("link");
    expect(lien).toHaveAttribute("href", "/situations/dossier/11111111-1111-1111-1111-111111111111");
    expect(screen.getByText("Douleur — conduite à tenir")).toBeInTheDocument();
    expect(screen.getByText("Évaluation de la douleur et conduite à tenir.")).toBeInTheDocument();
    expect(screen.getByText("brouillon")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/ui/CarteFicheDossier.test.tsx`
Expected: FAIL — `Cannot find module './CarteFicheDossier'`.

- [ ] **Step 3: Write the implementation**

```tsx
// components/ui/CarteFicheDossier.tsx
import Link from "next/link";
import type { FicheDossierSoin } from "@/lib/types/clinical";

interface CarteFicheDossierProps {
  fiche: FicheDossierSoin;
}

export function CarteFicheDossier({ fiche }: CarteFicheDossierProps) {
  return (
    <Link
      href={`/situations/dossier/${fiche.id}`}
      className="block rounded-card border border-navy/10 bg-white p-6 transition-colors hover:border-primary"
    >
      <span className="rounded-full bg-navy/10 px-4 py-2 text-sm text-navy">
        {fiche.niveauConfiance}
      </span>
      <h3 className="mt-4 text-xl font-semibold text-navy">{fiche.titre}</h3>
      <p className="mt-2 line-clamp-2 text-navy/70">{fiche.resume}</p>
    </Link>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/ui/CarteFicheDossier.test.tsx`
Expected: PASS, 1 test.

- [ ] **Step 5: Commit**

```bash
git add components/ui/CarteFicheDossier.tsx components/ui/CarteFicheDossier.test.tsx
git commit -m "feat: add CarteFicheDossier component"
```

---

### Task 6: Add the tab bar to `/situations`

**Files:**
- Modify: `app/(app)/situations/page.tsx`

**Interfaces:**
- Consumes: `OngletsExplorer` (Task 4).

**Correction (2026-07-19, discovered during execution):** the plan originally
modeled this page's "before" state on content read from the main checkout's
*uncommitted* working tree (an unrelated, in-progress visual redesign
touching many files — `app/globals.css`, several `Carte*` components, a
`LienRetour` component, etc. — none of it committed). The task's isolated
worktree correctly does not have any of that. The actual committed baseline
(confirmed via `git show HEAD:"app/(app)/situations/page.tsx"`) is simpler.
Steps below reflect the real committed file, verbatim.

- [ ] **Step 1: Add the tab bar above the existing title**

Change:

```tsx
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-navy">Situations Terrain</h1>
```

to:

```tsx
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <OngletsExplorer actif="situations" />

      <h1 className="text-2xl font-semibold text-navy">Situations Terrain</h1>
```

And add the import at the top of the file:

```tsx
import { OngletsExplorer } from "@/components/ui/OngletsExplorer";
```

Full resulting file:

```tsx
import { createClient } from "@/lib/supabase/server";
import { getAllSituationsTerrain } from "@/lib/data/recherche";
import { CarteSituationTerrain } from "@/components/ui/CarteSituationTerrain";
import { OngletsExplorer } from "@/components/ui/OngletsExplorer";

export default async function SituationsPage() {
  const supabase = await createClient();
  const situations = await getAllSituationsTerrain(supabase);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <OngletsExplorer actif="situations" />

      <h1 className="text-2xl font-semibold text-navy">Situations Terrain</h1>

      {situations.length > 0 ? (
        <div className="flex flex-col gap-4">
          {situations.map((situation) => (
            <CarteSituationTerrain key={situation.id} situation={situation} />
          ))}
        </div>
      ) : (
        <p className="text-navy/60">Aucune situation disponible pour le moment.</p>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Run the existing test suite for this route's dependencies**

Run: `npx vitest run components/ui/OngletsExplorer.test.tsx lib/data/recherche.test.ts`
Expected: PASS (no test file exists specifically for the page itself — this project doesn't unit-test page components directly, consistent with `situations/page.tsx` having no dedicated test today).

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/situations/page.tsx"
git commit -m "feat: add Explorer tab bar to Situations Terrain page"
```

---

### Task 7: New page — `/situations/dossier`

**Files:**
- Create: `app/(app)/situations/dossier/page.tsx`

**Interfaces:**
- Consumes: `createClient` (`lib/supabase/server`), `getAllFichesDossierSoins`, `SECTIONS_DOSSIER_SOINS` (Task 3), `CarteFicheDossier` (Task 5), `OngletsExplorer` (Task 4).

**Correction (2026-07-19):** matches the corrected Task 6 baseline — see
that task's correction note. Uses the same `<main className="mx-auto flex
max-w-2xl flex-col gap-6 p-6">` / `text-2xl font-semibold` style as the
actual committed `/situations` page, not the uncommitted redesign styling
originally drafted here.

- [ ] **Step 1: Write the page**

```tsx
import { createClient } from "@/lib/supabase/server";
import { getAllFichesDossierSoins, SECTIONS_DOSSIER_SOINS } from "@/lib/data/dossierSoins";
import { CarteFicheDossier } from "@/components/ui/CarteFicheDossier";
import { OngletsExplorer } from "@/components/ui/OngletsExplorer";

export default async function DossierSoinsPage() {
  const supabase = await createClient();
  const fiches = await getAllFichesDossierSoins(supabase);

  const sectionsAvecFiches = SECTIONS_DOSSIER_SOINS.map((section) => ({
    ...section,
    fiches: fiches.filter((fiche) => fiche.section === section.valeur),
  })).filter((section) => section.fiches.length > 0);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <OngletsExplorer actif="dossier" />

      <h1 className="text-2xl font-semibold text-navy">Dossier de soins</h1>

      {sectionsAvecFiches.length > 0 ? (
        <div className="flex flex-col gap-8">
          {sectionsAvecFiches.map((section) => (
            <div key={section.valeur} className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-navy">{section.label}</h2>
              {section.fiches.map((fiche) => (
                <CarteFicheDossier key={fiche.id} fiche={fiche} />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-navy/60">Aucune fiche disponible pour le moment.</p>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/situations/dossier/page.tsx"
git commit -m "feat: add /situations/dossier list page"
```

---

### Task 8: New page — `/situations/dossier/[id]`

**Files:**
- Create: `app/(app)/situations/dossier/[id]/page.tsx`

**Interfaces:**
- Consumes: `createClient`, `getFicheDossierDetail` (Task 3), `Link` from `next/link`, `notFound` from `next/navigation`.

**Correction (2026-07-19):** matches the corrected Task 6/7 baseline. The
original draft referenced a `LienRetour` component — that component does
not exist in this worktree (part of the same uncommitted, unrelated
redesign noted in Task 6's correction). The actual committed
`/situations/[id]/page.tsx` (confirmed via `git show`) uses a plain
`next/link` `<Link>` for its back-link, styled `text-primary
hover:underline` — use that same pattern here instead.

- [ ] **Step 1: Write the page**

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getFicheDossierDetail } from "@/lib/data/dossierSoins";

export default async function FicheDossierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const fiche = await getFicheDossierDetail(supabase, id);

  if (!fiche) notFound();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <Link href="/situations/dossier" className="text-primary hover:underline">
        ← Retour au dossier de soins
      </Link>

      <span className="w-fit rounded-full bg-navy/10 px-4 py-2 text-sm text-navy">
        {fiche.niveauConfiance}
      </span>

      <h1 className="text-2xl font-semibold text-navy">{fiche.titre}</h1>

      <p className="text-navy/80">{fiche.resume}</p>

      {fiche.contenu.map((bloc) => (
        <section key={bloc.titre}>
          <h2 className="text-lg font-semibold text-navy">{bloc.titre}</h2>
          <ul className="mt-2 list-disc pl-6 text-navy/80">
            {bloc.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}

      <section>
        <h2 className="text-lg font-semibold text-navy">Sources</h2>
        <ul className="mt-2 list-disc pl-6 text-navy/80">
          {fiche.sources.map((source) => (
            <li key={source}>{source}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/situations/dossier/[id]/page.tsx"
git commit -m "feat: add /situations/dossier/[id] detail page"
```

---

### Task 9: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass, including the new ones from Tasks 3, 4, 5.

- [ ] **Step 2: Run the type checker and linter**

Run: `npx tsc --noEmit && npx eslint .`
Expected: no errors.

- [ ] **Step 3: Manual verification in the browser (with the founder's authorization before touching the running app)**

Run: `npm run dev`, open `http://localhost:3000/situations`.

Expected:
- A two-tab bar appears above the "Situations Terrain" heading: "Situations Terrain" (active) and "Dossier de soins".
- Existing Situations Terrain content is unchanged.
- Clicking "Dossier de soins" navigates to `/situations/dossier`, shows the same tab bar with "Dossier de soins" active, and displays "Aucune fiche disponible pour le moment." (no content has been validated/inserted yet — see Global Constraints).
- The bottom nav "Explorer" tab stays highlighted on both `/situations` and `/situations/dossier`.
- Navigating directly to `/situations/dossier/00000000-0000-0000-0000-000000000000` (a non-existent id) renders the Next.js not-found page.

- [ ] **Step 4: Report status**

No commit for this task — if Steps 1-3 all pass, the plan is complete. If anything fails, fix it as part of the relevant earlier task (re-open that task, don't patch ad hoc here) and re-run this verification task.

---

## Hors scope (rappel, voir le design doc)

- Insertion en base du contenu clinique — suivi ultérieur, fiche par fiche, une fois chaque brouillon dans `docs/contenu-clinique/2026-07-19-dossier-soins-*.md` relu et validé par la fondatrice.
- Chantiers 2 à 4 (nom infirmière dynamique, couleurs, avatar) — specs séparées.
