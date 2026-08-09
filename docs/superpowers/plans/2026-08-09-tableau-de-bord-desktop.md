# Tableau de bord desktop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the desktop-only `/tableau-de-bord` route from the Claude Design mockup `Tableau de bord.dc.html`, wiring it to the connected IDEL's real tournée/patients/cotation data wherever that data already exists, and isolating everything else as clearly-labeled example data.

**Architecture:** A new route outside the `(app)` group (same precedent as `app/abonnement/page.tsx`), so it gets none of the mobile chrome (`BarreSuperieure`, `BarreNavigationBasse`). One Server Component fetches real data with the exact same functions `/ma-tournee` already uses. Two new presentation components render it: a small one for the violet "tournée en cours" hero card (real math: progress ring, remaining km, estimated end time), and a larger one for everything else (sidebar, header, KPI cards, upcoming-stops list, and the two fake cards from the mockup).

**Tech Stack:** Next.js App Router (Server Component page + client-free presentation components — no interactivity requires `"use client"` here), Tailwind CSS v4 arbitrary-value classes, existing `lib/data/ma-journee.ts` / `lib/cotation.ts` / `lib/majorations.ts` / `lib/data/ngap.ts` / `lib/data/patients.ts` / `lib/waze.ts` / `lib/accueil-vue.ts` / `lib/tournee-vue.ts` helpers.

## Global Constraints

- Route lives at `app/tableau-de-bord/page.tsx` — **outside** the `(app)` route group. No `BarreSuperieure`/`BarreNavigationBasse`, no mobile-width guard (per spec: this screen is desktop-only for now, no mobile fallback).
- No new backend, no new Supabase tables/columns, no new Server Actions. Every "real" data point must come from an existing, already-tested function.
- Fake data lives in a single named constant, `DONNEES_EXEMPLE`, declared at the top of `TableauDeBordDesktop.tsx` — never inline inside JSX, so brique #2 (agrégation) can replace it in one place later.
- Non-functional interactive-looking elements (sidebar entries with no destination, the two fake quick-action tiles) are rendered as `<span>`/`<div>`, never `<a>`/`<button>` — nothing that looks clickable may fail to do anything on click.
- No `HDS`/data-hosting-certification claims anywhere on this screen (matches the standing rule already applied to `/ely` and `/abonnement`).
- Follow existing design tokens: the violet gradient `linear-gradient(168deg,#221b33_0%,#2c1f47_58%,#3a2260_100%)`, `font-display` for numerals/headings, `brand-violet`/`brand-rose` already used across the app, rather than introducing new colors beyond what the mockup's palette maps to.
- No dedicated test for `app/tableau-de-bord/page.tsx` itself (it is a thin assembly of already-tested functions) — same choice already made for `app/(app)/ma-tournee/page.tsx`.

---

### Task 1: `CarteTourneeEnCoursDesktop` — hero card (progress ring + prochain arrêt)

**Files:**
- Create: `components/ui/CarteTourneeEnCoursDesktop.tsx`
- Test: `components/ui/CarteTourneeEnCoursDesktop.test.tsx`

**Interfaces:**
- Consumes: `MissionTourneeVue` from `@/lib/data/ma-journee` (existing type — has `id`, `patientNom`, `patientAdresse`, `patientAllergies`, `patientConsignes`, `distanceKm`, `distanceKmCorrigee`, `actes: ActeVue[]`, `heurePrevue`, `heureDebutReelle`, `statut`); `formaterNomPropre` from `@/lib/format`; `formatHeure`, `formatHeureDepuisTimestamp`, `estimerHeureFin` from `@/lib/tournee-vue`; `hrefWaze` from `@/lib/waze`.
- Produces: `export function CarteTourneeEnCoursDesktop({ missions }: { missions: MissionTourneeVue[] })` — consumed by Task 3 (`TableauDeBordDesktop`).

- [ ] **Step 1: Write the failing test**

```tsx
// components/ui/CarteTourneeEnCoursDesktop.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CarteTourneeEnCoursDesktop } from "./CarteTourneeEnCoursDesktop";
import type { MissionTourneeVue } from "@/lib/data/ma-journee";

function creerMission(surcharge: Partial<MissionTourneeVue> = {}): MissionTourneeVue {
  return {
    id: "m1",
    patientId: "p1",
    patientNom: "Mme Lefèvre",
    patientAdresse: "3 rue du Chemin Vert",
    patientTelephone: "0600000000",
    patientAllergies: null,
    patientConsignes: null,
    patientDateNaissance: null,
    patientForfaitBsi: null,
    distanceKm: 2.1,
    distanceKmCorrigee: null,
    typeSoin: "Pansement",
    heurePrevue: "14:20:00",
    statut: "en_cours",
    missionCliniqueId: null,
    dureeEstimeeMin: 20,
    actes: [],
    motifAbsence: null,
    heureDebutReelle: "2026-08-09T14:12:00Z",
    ...surcharge,
  };
}

describe("CarteTourneeEnCoursDesktop", () => {
  it("affiche le patient du prochain arrêt (mission en cours en priorité)", () => {
    const missions = [
      creerMission({ id: "a", statut: "a_faire", patientNom: "Mme Chevalier", heurePrevue: "15:15:00" }),
      creerMission({ id: "b", statut: "en_cours", patientNom: "Mme Lefèvre" }),
    ];
    render(<CarteTourneeEnCoursDesktop missions={missions} />);

    expect(screen.getByText("Mme Lefèvre")).toBeInTheDocument();
  });

  it("affiche le premier arrêt à faire quand rien n'est en cours", () => {
    const missions = [
      creerMission({ id: "a", statut: "terminee", patientNom: "Mme Bernard", heurePrevue: "10:00:00" }),
      creerMission({ id: "b", statut: "a_faire", patientNom: "M. Nguyen", heurePrevue: "16:00:00" }),
    ];
    render(<CarteTourneeEnCoursDesktop missions={missions} />);

    expect(screen.getByText("M. Nguyen")).toBeInTheDocument();
  });

  it("affiche le compte de soins faits sur le total", () => {
    const missions = [
      creerMission({ id: "a", statut: "terminee" }),
      creerMission({ id: "b", statut: "absent" }),
      creerMission({ id: "c", statut: "a_faire", heurePrevue: "16:00:00" }),
    ];
    render(<CarteTourneeEnCoursDesktop missions={missions} />);

    expect(screen.getByText("2").parentElement).toHaveTextContent("2/3");
  });

  it("additionne les km restants des arrêts non terminés, arrondis comme calculerKmTournee", () => {
    const missions = [
      creerMission({ id: "a", statut: "en_cours", distanceKm: 2.1, distanceKmCorrigee: null }),
      creerMission({ id: "b", statut: "a_faire", heurePrevue: "16:00:00", distanceKm: 3, distanceKmCorrigee: 4.5 }),
      creerMission({ id: "c", statut: "terminee", distanceKm: 100, distanceKmCorrigee: null }),
    ];
    render(<CarteTourneeEnCoursDesktop missions={missions} />);

    // 2.1 + 4.5 (distanceKmCorrigee prime sur distanceKm) = 6.6, arrondi à 7
    expect(screen.getByText(/7 km/)).toBeInTheDocument();
  });

  it("affiche un état vide sobre sans mission restante", () => {
    const missions = [creerMission({ id: "a", statut: "terminee" })];
    render(<CarteTourneeEnCoursDesktop missions={missions} />);

    expect(screen.getByText("Tournée terminée")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/ui/CarteTourneeEnCoursDesktop.test.tsx`
Expected: FAIL — `Cannot find module './CarteTourneeEnCoursDesktop'`

- [ ] **Step 3: Write the implementation**

```tsx
// components/ui/CarteTourneeEnCoursDesktop.tsx
import type { MissionTourneeVue } from "@/lib/data/ma-journee";
import { estimerHeureFin, formatHeure, formatHeureDepuisTimestamp } from "@/lib/tournee-vue";
import { formaterNomPropre } from "@/lib/format";
import { hrefWaze } from "@/lib/waze";

/** Même convention que calculerKmTournee (lib/accueil-vue.ts) : arrondi à l'entier. */
function kmRestants(missions: MissionTourneeVue[]): number | null {
  const restants = missions.filter((m) => m.statut !== "terminee" && m.statut !== "absent");
  const connu = restants.some((m) => m.distanceKmCorrigee != null || m.distanceKm != null);
  if (!connu) return null;
  const total = restants.reduce((somme, m) => somme + (m.distanceKmCorrigee ?? m.distanceKm ?? 0), 0);
  return Math.round(total);
}

export function CarteTourneeEnCoursDesktop({ missions }: { missions: MissionTourneeVue[] }) {
  const total = missions.length;
  const valides = missions.filter((m) => m.statut === "terminee" || m.statut === "absent").length;
  const pct = total > 0 ? Math.round((valides / total) * 100) : 0;
  const circonference = 2 * Math.PI * 54;
  const dashoffset = circonference * (1 - pct / 100);

  const prochainArret =
    missions.find((m) => m.statut === "en_cours") ?? missions.find((m) => m.statut === "a_faire") ?? null;
  const heureFin = estimerHeureFin(missions);
  const km = kmRestants(missions);

  return (
    <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(145deg,#1b1826_0%,#221c33_55%,#2c1f47_100%)] p-7 text-white shadow-[0_22px_50px_-28px_rgba(24,18,44,.85)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-16 h-[250px] w-[250px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,.35),transparent_68%)]"
      />
      <div className="relative flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          {prochainArret ? (
            <>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(52,199,89,.3)] bg-[rgba(26,127,90,.18)] px-2.5 py-1">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#34c759]" />
                <span className="text-[11px] font-bold text-[#7ee2a8]">
                  {prochainArret.statut === "en_cours" ? "Tournée en cours" : "Prochain arrêt"}
                </span>
              </div>
              <p className="mt-4 font-display text-[28px] font-bold leading-[1.15] tracking-tight">
                {prochainArret.statut === "en_cours"
                  ? `En cours chez ${formaterNomPropre(prochainArret.patientNom)}`
                  : `Prochain soin à ${formatHeure(prochainArret.heurePrevue)}`}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[16px] border border-white/10 bg-white/[0.06] p-3.5">
                <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[13px] bg-[linear-gradient(140deg,#8b5cf6,#6d28d9)] text-[14px] font-bold">
                  {formaterNomPropre(prochainArret.patientNom).slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-[150px] flex-1">
                  <p className="text-[15px] font-bold tracking-tight">{formaterNomPropre(prochainArret.patientNom)}</p>
                  <p className="mt-0.5 truncate text-[12.5px] text-[#a9a2bd]">
                    {prochainArret.patientAdresse}
                    {prochainArret.statut === "en_cours" && prochainArret.heureDebutReelle
                      ? ` · en cours depuis ${formatHeureDepuisTimestamp(prochainArret.heureDebutReelle)}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <a
                    href={hrefWaze({ latitude: null, longitude: null, adresse: prochainArret.patientAdresse })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-[38px] items-center rounded-[11px] border border-white/[0.16] bg-white/[0.08] px-3.5 text-[12.5px] font-semibold text-white"
                  >
                    Itinéraire
                  </a>
                  <a
                    href={`/ma-journee/${prochainArret.id}`}
                    className="flex min-h-[38px] items-center rounded-[11px] bg-white px-3.5 text-[12.5px] font-bold text-[#241a3d]"
                  >
                    Ouvrir
                  </a>
                </div>
              </div>
              {(prochainArret.patientAllergies || prochainArret.patientConsignes) && (
                <div className="mt-3 flex items-center gap-2 rounded-[12px] border border-[rgba(214,64,44,.3)] bg-[rgba(214,64,44,.14)] px-3 py-2.5">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[15px] w-[15px] shrink-0">
                    <path d="M12 9v4M12 17h.01" stroke="#ff8f7d" strokeWidth="2.3" strokeLinecap="round" fill="none" />
                    <circle cx="12" cy="12" r="9" stroke="#ff8f7d" strokeWidth="2.3" fill="none" />
                  </svg>
                  <p className="text-[12.5px] font-semibold text-[#ffc4b8]">
                    {prochainArret.patientAllergies || prochainArret.patientConsignes}
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="font-display text-[22px] font-bold tracking-tight text-white/90">Tournée terminée</p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-center gap-2.5">
          <div className="relative h-[132px] w-[132px]">
            <svg width="132" height="132" viewBox="0 0 132 132" className="-rotate-90">
              <circle cx="66" cy="66" r="54" fill="none" stroke="rgba(255,255,255,.11)" strokeWidth="11" />
              <circle
                cx="66"
                cy="66"
                r="54"
                fill="none"
                stroke="#a855f7"
                strokeWidth="11"
                strokeLinecap="round"
                strokeDasharray={circonference}
                strokeDashoffset={dashoffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-[30px] font-bold leading-none tabular-nums">
                {valides}
                <span className="text-[17px] text-[#8f88a8]">/{total}</span>
              </span>
              <span className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#8f88a8]">Soins</span>
            </div>
          </div>
          <div className="flex gap-4 text-center">
            <div>
              <p className="text-[15px] font-bold tabular-nums">{heureFin ?? "—"}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-[#8f88a8]">Fin est.</p>
            </div>
            <div>
              <p className="text-[15px] font-bold tabular-nums">{km !== null ? `${km} km` : "—"}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-[#8f88a8]">Restants</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/ui/CarteTourneeEnCoursDesktop.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add components/ui/CarteTourneeEnCoursDesktop.tsx components/ui/CarteTourneeEnCoursDesktop.test.tsx
git commit -m "feat(tableau-de-bord): carte tournee en cours desktop"
```

---

### Task 2: `TableauDeBordDesktop` — sidebar, header, KPI cards, hero card slot

**Files:**
- Create: `components/ui/TableauDeBordDesktop.tsx`
- Test: `components/ui/TableauDeBordDesktop.test.tsx`

**Interfaces:**
- Consumes: `CarteTourneeEnCoursDesktop` from Task 1 (`{ missions: MissionTourneeVue[] }`); `MissionTourneeVue` from `@/lib/data/ma-journee`; `formatDateDuJour`, `formatSalutation` from `@/lib/accueil-vue`; `formaterEuros` from `@/lib/cotation`; `LogoSoinely` from `@/components/ui/LogoSoinely`.
- Produces: `export function TableauDeBordDesktop({ prenom, missions, nombrePatients, montantCotationJour }: TableauDeBordDesktopProps)` where
  ```ts
  interface TableauDeBordDesktopProps {
    prenom: string | undefined;
    missions: MissionTourneeVue[];
    nombrePatients: number;
    montantCotationJour: number;
  }
  ```
  Consumed by Task 4 (`app/tableau-de-bord/page.tsx`). This task adds the "Suite de la tournée" / "À traiter" / "Facturation" / "Actions rapides" sections as empty placeholders (`<div />`) that Task 3 fills in — the file must exist and render end-to-end after this task, even though the main content grid is finished in Task 3.

- [ ] **Step 1: Write the failing test**

```tsx
// components/ui/TableauDeBordDesktop.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TableauDeBordDesktop } from "./TableauDeBordDesktop";
import type { MissionTourneeVue } from "@/lib/data/ma-journee";

function creerMission(surcharge: Partial<MissionTourneeVue> = {}): MissionTourneeVue {
  return {
    id: "m1",
    patientId: "p1",
    patientNom: "Mme Lefèvre",
    patientAdresse: "3 rue du Chemin Vert",
    patientTelephone: "0600000000",
    patientAllergies: null,
    patientConsignes: null,
    patientDateNaissance: null,
    patientForfaitBsi: null,
    distanceKm: 2.1,
    distanceKmCorrigee: null,
    typeSoin: "Pansement",
    heurePrevue: "14:20:00",
    statut: "en_cours",
    missionCliniqueId: null,
    dureeEstimeeMin: 20,
    actes: [],
    motifAbsence: null,
    heureDebutReelle: null,
    ...surcharge,
  };
}

describe("TableauDeBordDesktop", () => {
  it("salue l'utilisateur par son prénom", () => {
    render(
      <TableauDeBordDesktop prenom="Camille" missions={[creerMission()]} nombrePatients={12} montantCotationJour={64.5} />
    );

    expect(screen.getByText(/Camille/)).toBeInTheDocument();
  });

  it("affiche le nombre de patients et la cotation du jour dans les cartes KPI", () => {
    render(
      <TableauDeBordDesktop prenom="Camille" missions={[creerMission()]} nombrePatients={12} montantCotationJour={64.5} />
    );

    expect(screen.getByText("Patients actifs").parentElement).toHaveTextContent("12");
    // Espace insécable avant le symbole € : on compare sans en dépendre,
    // même précaution que lib/cotation.test.ts.
    expect(
      screen.getByText("Cotation du jour").parentElement?.textContent?.replace(/\s/g, " ")
    ).toContain("64,50 €");
  });

  it("propose des liens de navigation reels vers Ma tournee, Patients et Documents", () => {
    render(
      <TableauDeBordDesktop prenom="Camille" missions={[creerMission()]} nombrePatients={12} montantCotationJour={64.5} />
    );

    expect(screen.getByRole("link", { name: "Ma tournée" })).toHaveAttribute("href", "/ma-tournee");
    expect(screen.getByRole("link", { name: "Patients" })).toHaveAttribute("href", "/patients");
    expect(screen.getByRole("link", { name: "Documents" })).toHaveAttribute("href", "/situations/dossier");
  });

  it("n'affiche pas de lien pour les entrées de navigation sans destination réelle", () => {
    render(
      <TableauDeBordDesktop prenom="Camille" missions={[creerMission()]} nombrePatients={12} montantCotationJour={64.5} />
    );

    expect(screen.queryByRole("link", { name: "Agenda" })).not.toBeInTheDocument();
    expect(screen.getByText("Agenda")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/ui/TableauDeBordDesktop.test.tsx`
Expected: FAIL — `Cannot find module './TableauDeBordDesktop'`

- [ ] **Step 3: Write the implementation**

```tsx
// components/ui/TableauDeBordDesktop.tsx
import Link from "next/link";
import type { ReactNode } from "react";
import type { MissionTourneeVue } from "@/lib/data/ma-journee";
import { formatDateDuJour, formatSalutation } from "@/lib/accueil-vue";
import { formaterEuros } from "@/lib/cotation";
import { LogoSoinely } from "@/components/ui/LogoSoinely";
import { CarteTourneeEnCoursDesktop } from "@/components/ui/CarteTourneeEnCoursDesktop";

/**
 * Donnees d'exemple : rien ici ne vient d'une vraie fonctionnalite. A
 * remplacer par la brique #2 (agregation cabinet) le jour ou elle existe —
 * regroupees ici pour que ce remplacement soit localise, pas une chasse au
 * texte code en dur dans le JSX.
 */
const DONNEES_EXEMPLE = {
  nomCabinet: "Cabinet Voltaire",
  suggestionEly: "Optimisation de tournée, 2 ordonnances à renouveler.",
  aTraiter: [
    { titre: "2 ordonnances expirent demain", sous: "Mme Bernard, M. Nguyen" },
    { titre: "1 rejet de télétransmission à corriger", sous: "Facture 2024-0812 · 42,30 €" },
    { titre: "Photo d'escarre à joindre", sous: "Dossier du 22/07" },
  ],
  facturationSemaine: {
    montant: "1 842 €",
    tendance: "+12,4 %",
    barres: [58, 72, 45, 88, 64, 96, 78],
    jours: ["L", "M", "M", "J", "V", "S", "D"],
    teletransmission: "Télétransmission SCOR à jour · 0 rejet",
  },
};

interface EntreeNav {
  label: string;
  href?: string;
}

const NAV_PILOTAGE: EntreeNav[] = [
  { label: "Tableau de bord" },
  { label: "Ma tournée", href: "/ma-tournee" },
  { label: "Agenda" },
  { label: "Patients", href: "/patients" },
];

const NAV_GESTION: EntreeNav[] = [
  { label: "Facturation" },
  { label: "Documents", href: "/situations/dossier" },
  { label: "Réglages" },
];

function EntreeNavigation({ entree, actif }: { entree: EntreeNav; actif: boolean }) {
  const classe = `flex min-h-[38px] items-center gap-2.5 rounded-[11px] px-3 text-[13.5px] font-semibold ${
    actif ? "bg-white/[0.08] text-white" : "text-[#9d96ae]"
  }`;
  if (!entree.href) {
    return <span className={classe}>{entree.label}</span>;
  }
  return (
    <Link href={entree.href} className={classe}>
      {entree.label}
    </Link>
  );
}

function CarteKpi({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div className="flex flex-1 flex-col justify-center rounded-[20px] border border-navy/10 bg-white p-5 shadow-[0_1px_2px_rgba(30,25,45,.04)]">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-navy/45">{label}</p>
      <p className="mt-2 font-display text-[28px] font-bold leading-none tracking-tight tabular-nums">{valeur}</p>
    </div>
  );
}

function Panneau({ titre, sous, children }: { titre: string; sous?: string; children: ReactNode }) {
  return (
    <div className="rounded-[22px] border border-navy/10 bg-white p-5">
      <p className="font-display text-[16px] font-bold tracking-tight text-navy">{titre}</p>
      {sous && <p className="mt-0.5 text-[12px] text-navy/45">{sous}</p>}
      <div className="mt-3.5">{children}</div>
    </div>
  );
}

export function TableauDeBordDesktop({
  prenom,
  missions,
  nombrePatients,
  montantCotationJour,
}: {
  prenom: string | undefined;
  missions: MissionTourneeVue[];
  nombrePatients: number;
  montantCotationJour: number;
}) {
  return (
    <div className="grid min-h-screen grid-cols-[246px_1fr] bg-[#0f0e14] text-navy">
      <aside className="flex flex-col gap-6 border-r border-white/[0.07] bg-[#0f0e14] px-4 py-6 text-white">
        <div className="flex items-center gap-2.5 px-1">
          <LogoSoinely variante="carre" className="h-8 w-8" />
          <div>
            <p className="font-display text-[15px] font-bold leading-none">Soinely</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6f6883]">
              {DONNEES_EXEMPLE.nomCabinet}
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5">
          <p className="px-3 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#5c566e]">Pilotage</p>
          {NAV_PILOTAGE.map((entree) => (
            <EntreeNavigation key={entree.label} entree={entree} actif={entree.label === "Tableau de bord"} />
          ))}
        </nav>

        <nav className="flex flex-col gap-0.5">
          <p className="px-3 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#5c566e]">Gestion</p>
          {NAV_GESTION.map((entree) => (
            <EntreeNavigation key={entree.label} entree={entree} actif={false} />
          ))}
        </nav>

        <div className="mt-auto rounded-[16px] border border-[rgba(139,92,246,.28)] bg-[linear-gradient(150deg,rgba(139,92,246,.22),rgba(109,40,217,.06))] p-3.5">
          <p className="text-[12.5px] font-bold text-white">Ely a des suggestions</p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#b3abc7]">{DONNEES_EXEMPLE.suggestionEly}</p>
          <Link
            href="/ely"
            className="mt-2.5 flex min-h-[34px] items-center justify-center rounded-[10px] bg-white text-[12.5px] font-bold text-[#2b1a55]"
          >
            Voir avec Ely
          </Link>
        </div>
      </aside>

      <main className="min-w-0 bg-[#f2f0ec]">
        <header className="flex items-center gap-4 border-b border-[#e3dfd8] bg-[rgba(242,240,236,.86)] px-8 py-4">
          <div className="flex-1">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-navy/45">{formatDateDuJour()}</p>
            <p className="mt-0.5 font-display text-[21px] font-bold tracking-tight">
              {formatSalutation()}
              {prenom ? ` ${prenom}` : ""}
            </p>
          </div>
          <Link
            href="/ma-tournee"
            className="flex min-h-[40px] items-center gap-2 rounded-[12px] bg-gradient-to-r from-brand-violet to-brand-rose px-4 text-[13px] font-bold text-white shadow-[0_8px_22px_rgba(109,40,217,.28)]"
          >
            Reprendre la tournée
          </Link>
        </header>

        <div className="flex flex-col gap-5 px-8 py-6">
          <section className="grid grid-cols-[1.55fr_1fr] items-stretch gap-5">
            <CarteTourneeEnCoursDesktop missions={missions} />
            <div className="grid grid-rows-2 gap-5">
              <CarteKpi label="Cotation du jour" valeur={formaterEuros(montantCotationJour)} />
              <CarteKpi label="Patients actifs" valeur={String(nombrePatients)} />
            </div>
          </section>

          <div id="tableau-de-bord-contenu-principal" />
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/ui/TableauDeBordDesktop.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add components/ui/TableauDeBordDesktop.tsx components/ui/TableauDeBordDesktop.test.tsx
git commit -m "feat(tableau-de-bord): sidebar, en-tete et cartes KPI du dashboard desktop"
```

---

### Task 3: Main content grid — Suite de la tournée, À traiter, Facturation, Actions rapides

**Files:**
- Modify: `components/ui/TableauDeBordDesktop.tsx`
- Modify: `components/ui/TableauDeBordDesktop.test.tsx`

**Interfaces:**
- Consumes: `formatHeure` from `@/lib/tournee-vue`; `formaterNomPropre` from `@/lib/format`; everything already imported by Task 2.
- Produces: no new exports — this task replaces the `<div id="tableau-de-bord-contenu-principal" />` placeholder from Task 2 with the real content. `TableauDeBordDesktop`'s prop signature does not change.

- [ ] **Step 1: Write the failing tests (add to the existing file)**

Add to `components/ui/TableauDeBordDesktop.test.tsx`:

```tsx
describe("TableauDeBordDesktop — suite de la tournée", () => {
  it("liste les arrêts restants sans répéter celui déjà mis en avant dans la carte tournée", () => {
    const missions = [
      creerMission({ id: "a", statut: "en_cours", patientNom: "Mme Lefèvre" }),
      creerMission({ id: "b", statut: "a_faire", patientNom: "Mme Chevalier", heurePrevue: "15:15:00" }),
      creerMission({ id: "c", statut: "terminee", patientNom: "M. Bruno", heurePrevue: "09:00:00" }),
    ];
    render(
      <TableauDeBordDesktop prenom="Camille" missions={missions} nombrePatients={12} montantCotationJour={64.5} />
    );

    // "Mme Lefèvre" apparaît une fois dans la carte tournée, mais pas répétée dans la liste
    expect(screen.getAllByText("Mme Lefèvre")).toHaveLength(1);
    expect(screen.getByText("Mme Chevalier")).toBeInTheDocument();
    expect(screen.queryByText("M. Bruno")).not.toBeInTheDocument();
  });

  it("affiche un etat vide sobre quand plus aucun arret ne reste apres celui en cours", () => {
    const missions = [creerMission({ id: "a", statut: "en_cours" })];
    render(
      <TableauDeBordDesktop prenom="Camille" missions={missions} nombrePatients={12} montantCotationJour={64.5} />
    );

    expect(screen.getByText("Aucun autre arrêt aujourd'hui.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/ui/TableauDeBordDesktop.test.tsx`
Expected: FAIL — new assertions find nothing (`getByText("Mme Chevalier")` throws)

- [ ] **Step 3: Write the implementation**

Replace the `<div id="tableau-de-bord-contenu-principal" />` line inside `TableauDeBordDesktop.tsx` with:

```tsx
          <section className="grid grid-cols-[1.55fr_1fr] items-start gap-5">
            <Panneau titre="Suite de la tournée" sous={`${suiteDeLaTournee.length} arrêt${suiteDeLaTournee.length > 1 ? "s" : ""} restant${suiteDeLaTournee.length > 1 ? "s" : ""}`}>
              {suiteDeLaTournee.length > 0 ? (
                <div className="flex flex-col divide-y divide-[#f0ede7]">
                  {suiteDeLaTournee.map((mission) => (
                    <div key={mission.id} className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0">
                      <span className="w-11 shrink-0 text-[13px] font-bold tabular-nums text-[#3b3648]">
                        {formatHeure(mission.heurePrevue)}
                      </span>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-violet/10 text-[12px] font-bold text-brand-violet">
                        {formaterNomPropre(mission.patientNom).slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold tracking-tight text-navy">
                          {formaterNomPropre(mission.patientNom)}
                        </span>
                        <span className="block truncate text-[12px] text-navy/45">{mission.patientAdresse}</span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-[13px] text-navy/45">Aucun autre arrêt aujourd&apos;hui.</p>
              )}
            </Panneau>

            <div className="flex flex-col gap-5">
              <Panneau titre="À traiter">
                <div className="flex flex-col gap-2">
                  {DONNEES_EXEMPLE.aTraiter.map((item) => (
                    <div key={item.titre} className="rounded-[13px] border border-[#ece8f2] bg-[#fbfafd] px-3 py-2.5">
                      <p className="text-[13px] font-semibold text-navy">{item.titre}</p>
                      <p className="mt-0.5 text-[11.5px] text-navy/45">{item.sous}</p>
                    </div>
                  ))}
                </div>
              </Panneau>

              <Panneau titre="Facturation" sous="7 derniers jours (exemple)">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-[22px] font-bold tracking-tight">
                    {DONNEES_EXEMPLE.facturationSemaine.montant}
                  </span>
                  <span className="text-[12px] font-bold text-[#1a7f5a]">
                    {DONNEES_EXEMPLE.facturationSemaine.tendance}
                  </span>
                </div>
                <div className="mt-4 flex h-16 items-end gap-2">
                  {DONNEES_EXEMPLE.facturationSemaine.barres.map((valeur, index) => (
                    <div key={DONNEES_EXEMPLE.facturationSemaine.jours[index]} className="flex flex-1 flex-col items-center gap-1.5">
                      <div
                        className="w-full rounded-t-[4px] bg-brand-violet/25"
                        style={{ height: `${valeur}%` }}
                      />
                      <span className="text-[10px] font-semibold text-navy/40">
                        {DONNEES_EXEMPLE.facturationSemaine.jours[index]}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2 border-t border-[#efece6] pt-3.5">
                  <span aria-hidden="true" className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#34c759]" />
                  <p className="text-[12px] text-navy/50">{DONNEES_EXEMPLE.facturationSemaine.teletransmission}</p>
                </div>
              </Panneau>
            </div>
          </section>

          <section className="grid grid-cols-4 gap-4">
            <Link
              href="/patients/nouveau"
              className="flex items-center gap-3 rounded-[16px] border border-navy/10 bg-white px-4 py-3.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-brand-violet/10 text-brand-violet">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <span className="text-[13.5px] font-bold text-navy">Nouveau patient</span>
            </Link>
            <div className="flex items-center gap-3 rounded-[16px] border border-navy/10 bg-white px-4 py-3.5 opacity-60">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-navy/5 text-navy/40">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3" />
                </svg>
              </span>
              <span className="text-[13.5px] font-bold text-navy/50">Scanner une ordonnance</span>
            </div>
            <div className="flex items-center gap-3 rounded-[16px] border border-navy/10 bg-white px-4 py-3.5 opacity-60">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-navy/5 text-navy/40">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 6.2A6.5 6.5 0 0 0 7.4 9m0 6A6.5 6.5 0 0 0 17 17.8" />
                </svg>
              </span>
              <span className="text-[13.5px] font-bold text-navy/50">Facturer la journée</span>
            </div>
            <Link
              href="/ely"
              className="flex items-center gap-3 rounded-[16px] border border-navy/10 bg-white px-4 py-3.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-brand-violet/10 text-brand-violet">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8 8 0 0 1-8 8H5l-1.5 3 .5-4.6A8 8 0 1 1 21 11.5Z" />
                </svg>
              </span>
              <span className="text-[13.5px] font-bold text-navy">Demander à Ely</span>
            </Link>
          </section>
```

Add this computation near the top of the component body, before the `return`:

```tsx
  const prochainArretId =
    (missions.find((m) => m.statut === "en_cours") ?? missions.find((m) => m.statut === "a_faire"))?.id ?? null;
  const suiteDeLaTournee = missions.filter(
    (m) => (m.statut === "a_faire" || m.statut === "en_cours") && m.id !== prochainArretId
  );
```

Add the two new imports at the top of the file (neither is imported yet in
`TableauDeBordDesktop.tsx` — Task 1's imports live in the separate
`CarteTourneeEnCoursDesktop.tsx` file):

```tsx
import { formatHeure } from "@/lib/tournee-vue";
import { formaterNomPropre } from "@/lib/format";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/ui/TableauDeBordDesktop.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add components/ui/TableauDeBordDesktop.tsx components/ui/TableauDeBordDesktop.test.tsx
git commit -m "feat(tableau-de-bord): suite de la tournee, a traiter, facturation et actions rapides"
```

---

### Task 4: Route wiring — `app/tableau-de-bord/page.tsx`

**Files:**
- Create: `app/tableau-de-bord/page.tsx`

**Interfaces:**
- Consumes: `TableauDeBordDesktop` from Task 3 (`{ prenom, missions, nombrePatients, montantCotationJour }`); `createClient`, `getUtilisateurConnecte` from `@/lib/supabase/server`; `getTourneeDuJour`, `getMissionsTourneeVue` from `@/lib/data/ma-journee`; `getPatients` from `@/lib/data/patients`; `getContexteTarifaire` from `@/lib/data/ngap`; `calculerMontantTournee` from `@/lib/cotation`; `calculerMajorationsTournee` from `@/lib/majorations`; `formaterNomPropre` from `@/lib/format`.
- Produces: the `/tableau-de-bord` route. Nothing downstream depends on this file — it is the last task.

- [ ] **Step 1: Write the implementation**

```tsx
// app/tableau-de-bord/page.tsx
import { createClient, getUtilisateurConnecte } from "@/lib/supabase/server";
import { getTourneeDuJour, getMissionsTourneeVue } from "@/lib/data/ma-journee";
import { getPatients } from "@/lib/data/patients";
import { getContexteTarifaire } from "@/lib/data/ngap";
import { calculerMontantTournee, type ContexteTarifaire } from "@/lib/cotation";
import { calculerMajorationsTournee } from "@/lib/majorations";
import { formaterNomPropre } from "@/lib/format";
import { TableauDeBordDesktop } from "@/components/ui/TableauDeBordDesktop";
import type { MissionTourneeVue } from "@/lib/data/ma-journee";

export default async function TableauDeBordPage() {
  const supabase = await createClient();
  const user = await getUtilisateurConnecte();

  const nomComplet = user?.user_metadata?.full_name as string | undefined;
  const prenom = nomComplet ? formaterNomPropre(nomComplet).split(" ")[0] : undefined;

  const tournee = user ? await getTourneeDuJour(supabase, user.id) : null;
  const patients = user ? await getPatients(supabase, user.id) : [];

  const [missions, contexteTarifaire] =
    tournee && user
      ? await Promise.all([
          getMissionsTourneeVue(supabase, tournee.id),
          getContexteTarifaire(supabase, user.id),
        ])
      : [[] as MissionTourneeVue[], { zone: "metropole", valeurs: new Map() } satisfies ContexteTarifaire];

  const montantActes = calculerMontantTournee(missions, contexteTarifaire);
  const montantMajorations = tournee
    ? calculerMajorationsTournee(missions, tournee.date, contexteTarifaire)
    : 0;
  const montantCotationJour = Math.round((montantActes + montantMajorations) * 100) / 100;

  return (
    <TableauDeBordDesktop
      prenom={prenom}
      missions={missions}
      nombrePatients={patients.length}
      montantCotationJour={montantCotationJour}
    />
  );
}
```

- [ ] **Step 2: Verify the route compiles and renders**

Run: `npx tsc --noEmit`
Expected: no errors

Run: `npx vitest run`
Expected: all tests pass (existing suite + the two new test files, unaffected)

Run: `npx next build`
Expected: build succeeds, `/tableau-de-bord` appears in the route list

- [ ] **Step 3: Commit**

```bash
git add app/tableau-de-bord/page.tsx
git commit -m "feat(tableau-de-bord): route /tableau-de-bord avec donnees reelles du compte"
```

---

## Post-plan note

This plan covers brique #3 (gabarit desktop) only, per the approved spec
(`docs/superpowers/specs/2026-08-09-tableau-de-bord-desktop-design.md`).
Briques #1 (cabinet + adhésion), #2 (agrégation), and #4 (contrôle d'accès
par plan) are separate, unspecified projects — do not fold their work into
this plan's tasks.
