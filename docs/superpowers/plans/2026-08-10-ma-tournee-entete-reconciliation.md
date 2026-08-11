# Ma tournée — réconciliation de l'en-tête Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile the real `/ma-tournee` screen's header with the Claude Design mockup `Ma tournée.dc.html` — a real date+title header, a real total-Km stat, and a real user-initials avatar fallback — without touching anything that already matches the mockup (mission cards, filters, floating button, bottom nav).

**Architecture:** Two small formatting helpers are added to shared utility files (`lib/format.ts`, `lib/kilometrage.ts`), then `EnTeteTournee.tsx` is updated to stop rendering the shared `BarreLogoProfilHero` (used by other screens, not touched) and render its own page-specific header row instead, consuming real data already available (`tournee.date`'s day-of-week via a moved formatter, `missions[].distanceKm`/`distanceKmCorrigee`, the connected user's `full_name`).

**Tech Stack:** Next.js Server Components, TypeScript, Tailwind CSS, Vitest + React Testing Library.

## Global Constraints

- No fabricated UI: the mockup's "Ely a optimisé" banner, the header's "map" and "more" (···) buttons, and the "online" dot on the profile avatar are never built — none has a real destination or backing feature. Do not add them in any task.
- `BarreLogoProfilHero` (`components/ui/BarreLogoProfilHero.tsx`) is shared by `BarreSuperieure.tsx`, `EnTeteListePatients.tsx`, and `EnTeteAccueil.tsx` — never modify it. `EnTeteTournee.tsx` stops using it and builds its own header row instead.
- `formatDateDuJour()` keeps its existing behavior and stays importable from `@/lib/accueil-vue` (3 real consumers depend on that path: `components/ui/TableauDeBordDesktop.tsx`, `components/ui/EnTeteAccueil.tsx`, `app/(app)/ma-journee/page.tsx`) — moving its implementation to `lib/format.ts` must not break any of them.
- `getInitiales()` in `lib/tournee-vue.ts` (patient-name initials, civility-aware) is never modified or reused for the user's own profile initials — a distinct `initialesUtilisateur()` is added instead.
- The "Km" stat sums `distanceRetenue(distanceKm, distanceKmCorrigee)` across **all** missions of the day (not just remaining ones) — same scope as the existing "Cotation" stat, for consistency.

---

### Task 1: `lib/format.ts` — `initialesUtilisateur()` and the moved `formatDateDuJour()`

**Files:**
- Modify: `lib/format.ts`
- Modify: `lib/accueil-vue.ts:1-17`
- Test: `lib/format.test.ts` (new file)

**Interfaces:**
- Produces: `export function initialesUtilisateur(nomComplet: string): string` — consumed by Task 3.
- Produces: `export function formatDateDuJour(): string` (moved here from `lib/accueil-vue.ts`, identical behavior) — consumed by Task 3. Also re-exported from `lib/accueil-vue.ts` for its existing consumers.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/format.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatDateDuJour, formaterNomPropre, initialesUtilisateur } from "./format";

describe("initialesUtilisateur", () => {
  it("prend la premiere lettre du premier mot et la premiere lettre du dernier mot", () => {
    expect(initialesUtilisateur("Sophie Lambert")).toBe("SL");
  });

  it("gere un nom a un seul mot en prenant ses 2 premieres lettres", () => {
    expect(initialesUtilisateur("Madonna")).toBe("MA");
  });

  it("prend premier et dernier mot, pas premier et deuxieme, pour un nom a 3 mots", () => {
    expect(initialesUtilisateur("Marie Claire Dubois")).toBe("MD");
  });

  it("rend une chaine vide pour un nom vide", () => {
    expect(initialesUtilisateur("")).toBe("");
  });
});

describe("formatDateDuJour (deplacee depuis lib/accueil-vue.ts)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formate la date du jour en toutes lettres, capitalisee", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T09:00:00"));
    expect(formatDateDuJour()).toBe("Samedi 8 août");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/format.test.ts`
Expected: FAIL — `initialesUtilisateur`/`formatDateDuJour` are not exported from `./format`

- [ ] **Step 3: Write the implementation**

Replace the full contents of `lib/format.ts`:

```ts
export function formatDateFr(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/** Date du jour, en toutes lettres, capitalisee (ex. "Mardi 29 juillet"). */
export function formatDateDuJour(): string {
  const date = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return date.charAt(0).toUpperCase() + date.slice(1);
}

export function formaterNomPropre(nom: string): string {
  return nom
    .toLocaleLowerCase("fr-FR")
    .replace(/(^|[\s'-])(\p{L})/gu, (_correspondance, separateur: string, lettre: string) =>
      separateur + lettre.toLocaleUpperCase("fr-FR")
    );
}

/**
 * Initiales d'un nom complet d'utilisateur (ex. "Sophie Lambert" -> "SL"),
 * pour l'avatar de repli quand aucune photo de profil n'est definie.
 *
 * Distincte de getInitiales() (lib/tournee-vue.ts), qui gere des noms de
 * *patients* avec civilite ("Mme", "M.") en prenant les 2 premieres lettres
 * d'un seul mot — un nom complet d'utilisateur n'a pas de civilite et veut
 * les vraies initiales prenom+nom, pas une tranche d'un seul mot.
 */
export function initialesUtilisateur(nomComplet: string): string {
  const mots = nomComplet.trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return "";
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[mots.length - 1][0]).toUpperCase();
}
```

- [ ] **Step 4: Update `lib/accueil-vue.ts` to re-export `formatDateDuJour` instead of defining it**

In `lib/accueil-vue.ts`, replace:

```ts
import type { MissionDuJour } from "@/lib/types/clinical";
import { formaterNomPropre } from "@/lib/format";

/** Salutation dependant de l'heure du jour, a l'affichage. */
export function formatSalutation(): string {
  return new Date().getHours() < 18 ? "Bonjour" : "Bonsoir";
}

/** Date du jour, en toutes lettres, capitalisee. */
export function formatDateDuJour(): string {
  const date = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return date.charAt(0).toUpperCase() + date.slice(1);
}
```

with:

```ts
import type { MissionDuJour } from "@/lib/types/clinical";
import { formaterNomPropre } from "@/lib/format";

// Deplacee vers lib/format.ts (formatage partage entre plusieurs ecrans),
// mais re-exportee ici pour ne rien casser chez les imports existants.
export { formatDateDuJour } from "@/lib/format";

/** Salutation dependant de l'heure du jour, a l'affichage. */
export function formatSalutation(): string {
  return new Date().getHours() < 18 ? "Bonjour" : "Bonsoir";
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run lib/format.test.ts lib/accueil-vue.test.ts`
Expected: PASS — the 5 new tests in `lib/format.test.ts`, and the existing `lib/accueil-vue.test.ts` suite (including its own `formatDateDuJour` test) unaffected by the re-export.

- [ ] **Step 6: Run the full test suite to confirm the 3 other consumers still work**

Run: `npx vitest run`
Expected: all tests pass, including any existing tests for `TableauDeBordDesktop.tsx`, `EnTeteAccueil.tsx`, and `app/(app)/ma-journee/page.tsx` that exercise `formatDateDuJour`.

- [ ] **Step 7: Commit**

```bash
git add lib/format.ts lib/format.test.ts lib/accueil-vue.ts
git commit -m "feat(ma-tournee): ajoute initialesUtilisateur et deplace formatDateDuJour vers lib/format"
```

---

### Task 2: `lib/kilometrage.ts` — `formaterKm()`

**Files:**
- Modify: `lib/kilometrage.ts`
- Test: `lib/kilometrage.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `export function formaterKm(km: number): string` — consumed by Task 3.

- [ ] **Step 1: Write the failing test**

Add to the end of `lib/kilometrage.test.ts` (the file already exists — append this `describe` block, keep everything already in the file untouched):

```ts
describe("formaterKm", () => {
  it("ecrit la distance a la francaise, une decimale", () => {
    expect(formaterKm(13.7)).toBe("13,7 km");
  });

  it("ajoute un zero decimal a une valeur entiere", () => {
    expect(formaterKm(5)).toBe("5,0 km");
  });

  it("gere zero", () => {
    expect(formaterKm(0)).toBe("0,0 km");
  });
});
```

Also update the file's existing import line to include `formaterKm`:

```ts
import {
  calculerIndemniteKilometrique,
  distanceRetenue,
  formaterKm,
  kilometresIndemnisables,
} from "./kilometrage";
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/kilometrage.test.ts`
Expected: FAIL — `formaterKm` is not exported from `./kilometrage`

- [ ] **Step 3: Write the implementation**

In `lib/kilometrage.ts`, add at the end of the file (after `distanceRetenue`, before the private `arrondirCentimes` helper — or after it, placement relative to the private helper doesn't matter, just keep it a top-level export):

```ts
/**
 * Distance totale d'une tournee, au format francais (ex. "13,7 km"), pour
 * affichage. Meme motif que formaterEuros() dans lib/cotation.ts.
 */
export function formaterKm(km: number): string {
  return `${km.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/kilometrage.test.ts`
Expected: PASS (all tests in the file, including the 3 new ones)

- [ ] **Step 5: Commit**

```bash
git add lib/kilometrage.ts lib/kilometrage.test.ts
git commit -m "feat(ma-tournee): ajoute formaterKm pour l'affichage de la distance totale"
```

---

### Task 3: `components/ui/EnTeteTournee.tsx` — en-tête réel + stat Km branchée

**Files:**
- Modify: `components/ui/EnTeteTournee.tsx`
- Test: `components/ui/EnTeteTournee.test.tsx` (new file — this component has no existing test)

**Interfaces:**
- Consumes: `initialesUtilisateur`, `formatDateDuJour` from `@/lib/format` (Task 1); `distanceRetenue`, `formaterKm` from `@/lib/kilometrage` (Task 2).
- Produces: `EnTeteTournee` gains a new prop `nomComplet?: string` — consumed by Task 4.

- [ ] **Step 1: Write the failing tests**

```tsx
// components/ui/EnTeteTournee.test.tsx
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EnTeteTournee } from "./EnTeteTournee";
import type { MissionTourneeVue } from "@/lib/data/ma-journee";
import type { Tournee } from "@/lib/types/clinical";
import type { ContexteTarifaire } from "@/lib/cotation";

const TOURNEE: Tournee = {
  id: "t1",
  date: "2026-08-10",
  nbPatients: 0,
  nbInjections: 0,
  nbPansements: 0,
  nbGlycemies: 0,
  tempsEstimeMin: 0,
  materielPrepare: false,
  materielVerifie: false,
};

const CONTEXTE: ContexteTarifaire = { zone: "metropole", valeurs: new Map() };

function creerMission(surcharge: Partial<MissionTourneeVue> = {}): MissionTourneeVue {
  return {
    id: "m1",
    patientId: "p1",
    patientNom: "Mme Dupont",
    patientAdresse: "1 rue des Lilas",
    patientTelephone: "0600000000",
    patientAllergies: null,
    patientConsignes: null,
    patientDateNaissance: null,
    patientForfaitBsi: null,
    distanceKm: null,
    distanceKmCorrigee: null,
    typeSoin: "Soin",
    heurePrevue: "09:00",
    statut: "a_faire",
    missionCliniqueId: null,
    dureeEstimeeMin: 20,
    actes: [],
    motifAbsence: null,
    heureDebutReelle: null,
    ...surcharge,
  };
}

describe("EnTeteTournee", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T09:00:00"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("affiche la date du jour et le titre Ma tournee", () => {
    render(
      <EnTeteTournee
        missions={[]}
        tournee={TOURNEE}
        contexteTarifaire={CONTEXTE}
        filtre="tout"
        counts={{ tout: 0, a_faire: 0, alertes: 0, valides: 0 }}
        avatarUrl={null}
      />
    );
    expect(screen.getByText("Lundi 10 août")).toBeInTheDocument();
    expect(screen.getByText("Ma tournée")).toBeInTheDocument();
  });

  it("affiche les initiales de l'utilisateur quand aucune photo n'est definie", () => {
    render(
      <EnTeteTournee
        missions={[]}
        tournee={TOURNEE}
        contexteTarifaire={CONTEXTE}
        filtre="tout"
        counts={{ tout: 0, a_faire: 0, alertes: 0, valides: 0 }}
        avatarUrl={null}
        nomComplet="Sophie Lambert"
      />
    );
    expect(screen.getByText("SL")).toBeInTheDocument();
  });

  it("somme la distance retenue de toutes les missions pour la stat Km", () => {
    const missions = [
      creerMission({ id: "m1", distanceKm: 5, distanceKmCorrigee: null }),
      creerMission({ id: "m2", distanceKm: 3, distanceKmCorrigee: 4.7 }),
      creerMission({ id: "m3", distanceKm: null, distanceKmCorrigee: null }),
    ];
    render(
      <EnTeteTournee
        missions={missions}
        tournee={TOURNEE}
        contexteTarifaire={CONTEXTE}
        filtre="tout"
        counts={{ tout: 3, a_faire: 3, alertes: 0, valides: 0 }}
        avatarUrl={null}
      />
    );
    // 5 (m1, pas de correction) + 4,7 (m2, la correction prime) + 0 (m3, aucune donnee) = 9,7
    expect(screen.getByText("9,7 km")).toBeInTheDocument();
  });

  it("affiche un tiret pour la stat Km quand aucune mission n'a de distance", () => {
    // La mission porte un acte cotant reellement (comme dans
    // lib/cotation.test.ts), pour que la stat Cotation ne soit PAS "—"
    // elle aussi — sinon getByText("—") trouverait deux elements et
    // echouerait sans dire lequel des deux stats est realement teste.
    const missions = [
      creerMission({
        actes: [
          { libelle: "Injection", code: "AMI 1", cotation: 3.15, lettreCle: "AMI", coefficient: 1, derogatoireBsi: false, eligibleMci: false },
        ],
      }),
    ];
    render(
      <EnTeteTournee
        missions={missions}
        tournee={TOURNEE}
        contexteTarifaire={CONTEXTE}
        filtre="tout"
        counts={{ tout: 1, a_faire: 1, alertes: 0, valides: 0 }}
        avatarUrl={null}
      />
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("n'affiche aucun element fabrique de la maquette (banniere Ely, boutons carte/plus, point en ligne)", () => {
    const { container } = render(
      <EnTeteTournee
        missions={[]}
        tournee={TOURNEE}
        contexteTarifaire={CONTEXTE}
        filtre="tout"
        counts={{ tout: 0, a_faire: 0, alertes: 0, valides: 0 }}
        avatarUrl={null}
      />
    );
    expect(screen.queryByText(/Ely a optimisé/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /carte/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /plus d.actions/i })).not.toBeInTheDocument();
    // Le point "en ligne" de la maquette est un petit cercle vert decoratif :
    // verifie qu'aucun element avec ce fond vert caracteristique n'existe.
    expect(container.querySelector('[class*="34c759"]')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/ui/EnTeteTournee.test.tsx`
Expected: FAIL — "Lundi 10 août" / "Ma tournée" / "SL" / "9,7 km" not found (current header still renders the old logo/link/em-dash content)

- [ ] **Step 3: Write the implementation**

Replace the full contents of `components/ui/EnTeteTournee.tsx`:

```tsx
import Link from "next/link";
import type { MissionTourneeVue } from "@/lib/data/ma-journee";
import type { Tournee } from "@/lib/types/clinical";
import {
  calculerRetardMinutes,
  estimerHeureFin,
  formatHeure,
  formatHeureDepuisTimestamp,
  type CountsMissions,
  type Filtre,
} from "@/lib/tournee-vue";
import { calculerMontantTournee, formaterEuros, type ContexteTarifaire } from "@/lib/cotation";
import { calculerMajorationsTournee } from "@/lib/majorations";
import { formatDateDuJour, formaterNomPropre, initialesUtilisateur } from "@/lib/format";
import { distanceRetenue, formaterKm } from "@/lib/kilometrage";
import { OngletsFiltresTournee } from "@/components/ui/OngletsFiltresTournee";
import { RubanLemniscateHero } from "@/components/ui/RubanLemniscateHero";

const CIRCONFERENCE = 2 * Math.PI * 33;

export function EnTeteTournee({
  missions,
  tournee,
  contexteTarifaire,
  filtre,
  counts,
  avatarUrl,
  nomComplet,
}: {
  missions: MissionTourneeVue[];
  tournee: Tournee;
  contexteTarifaire: ContexteTarifaire;
  filtre: Filtre;
  counts: CountsMissions;
  avatarUrl?: string | null;
  nomComplet?: string;
}) {
  const total = missions.length;
  const valides = missions.filter((m) => m.statut === "terminee" || m.statut === "absent").length;
  const restants = missions.filter((m) => m.statut === "a_faire" || m.statut === "en_cours").length;
  const pct = total > 0 ? Math.round((valides / total) * 100) : 0;
  const dashoffset = CIRCONFERENCE * (1 - pct / 100);
  const heureFin = estimerHeureFin(missions);
  const montantActes = calculerMontantTournee(missions, contexteTarifaire);
  const montantMajorations = calculerMajorationsTournee(missions, tournee.date, contexteTarifaire);
  const montantTotal = Math.round((montantActes + montantMajorations) * 100) / 100;
  const totalKm = missions.reduce(
    (somme, m) => somme + (distanceRetenue(m.distanceKm, m.distanceKmCorrigee) ?? 0),
    0
  );

  const enCours = missions.find((m) => m.statut === "en_cours") ?? null;
  const retard = enCours ? calculerRetardMinutes(enCours) : null;

  const nowName = enCours ? formaterNomPropre(enCours.patientNom) : "Tournée à jour";
  const nowSub = enCours
    ? `En cours depuis ${enCours.heureDebutReelle ? formatHeureDepuisTimestamp(enCours.heureDebutReelle) : formatHeure(enCours.heurePrevue)} · ${enCours.patientAdresse}`
    : restants > 0
      ? `${restants} soin${restants > 1 ? "s" : ""} restant${restants > 1 ? "s" : ""} · aucun en cours`
      : "Tous les soins du jour sont validés";

  return (
    <div className="relative overflow-hidden bg-[linear-gradient(168deg,#221b33_0%,#2c1f47_58%,#3a2260_100%)] px-5 pb-4 pt-6 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-12 -top-20 h-[260px] w-[260px] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,.4),transparent_68%)]"
      />
      <RubanLemniscateHero />
      <div className="relative mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9d94b8]">
              {formatDateDuJour()}
            </p>
            <p className="font-display mt-[3px] text-[20px] font-bold leading-[1.15] tracking-[-0.6px]">
              Ma tournée
            </p>
          </div>
          <Link
            href="/compte"
            aria-label="Mon compte"
            className="flex h-9 w-9 shrink-0 items-center justify-center"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL signée à courte durée de vie, incompatible avec le cache de next/image
              <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-white/50" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(140deg,#a855f7,#6d28d9)] text-[12.5px] font-bold tracking-[-0.2px] text-white ring-2 ring-white/30">
                {initialesUtilisateur(nomComplet ?? "")}
              </span>
            )}
          </Link>
        </div>

        <div className="mt-5 flex items-center gap-3.5">
          <div className="relative h-[70px] w-[70px] shrink-0">
            <svg width="70" height="70" viewBox="0 0 70 70" className="absolute inset-0 -rotate-90">
              <circle cx="35" cy="35" r="33" fill="none" stroke="rgba(255,255,255,.13)" strokeWidth="4" />
              <circle
                cx="35"
                cy="35"
                r="33"
                fill="none"
                stroke="#a855f7"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={CIRCONFERENCE}
                strokeDashoffset={dashoffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-[20px] font-bold leading-none tabular-nums">{valides}</span>
              <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[#9d94b8]">/ {total}</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[23px] font-bold leading-tight tracking-tight">{nowName}</p>
            <p className="mt-1 text-[13px] text-[#b8afd0]">{nowSub}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {retard !== null && (
                <span className="inline-flex animate-pulse items-center gap-1.5 rounded-[8px] border border-[rgba(214,64,44,.36)] bg-[rgba(214,64,44,.2)] px-2 py-1 text-[11px] font-bold text-[#ffc4b8]">
                  <span aria-hidden="true" className="h-[5px] w-[5px] rounded-full bg-[#ff6f56]" />
                  {retard} min de retard
                </span>
              )}
              {heureFin && (
                <span className="rounded-[8px] border border-white/[0.14] bg-white/10 px-2 py-1 text-[11px] font-bold text-[#d5c9f2]">
                  Fin estimée {heureFin}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <div className="flex-1 rounded-[14px] border border-white/10 bg-white/[0.07] px-2.5 py-2.5">
            <p className="font-display text-[17px] font-bold tabular-nums">{restants}</p>
            <p className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9d94b8]">Reste</p>
          </div>
          <div className="flex-1 rounded-[14px] border border-white/10 bg-white/[0.07] px-2.5 py-2.5">
            <p className="font-display text-[17px] font-bold tabular-nums">
              {totalKm > 0 ? formaterKm(totalKm) : "—"}
            </p>
            <p className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9d94b8]">Km</p>
          </div>
          <div className="flex-1 rounded-[14px] border border-white/10 bg-white/[0.07] px-2.5 py-2.5">
            <p className="font-display text-[17px] font-bold tabular-nums">
              {montantTotal > 0 ? formaterEuros(montantTotal) : "—"}
            </p>
            <p className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9d94b8]">Cotation</p>
          </div>
        </div>

        <div className="mt-3">
          <OngletsFiltresTournee filtre={filtre} counts={counts} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/ui/EnTeteTournee.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add components/ui/EnTeteTournee.tsx components/ui/EnTeteTournee.test.tsx
git commit -m "feat(ma-tournee): en-tete reel (date+titre, initiales, stat Km branchee)"
```

---

### Task 4: `app/(app)/ma-tournee/page.tsx` — transmet le nom complet

**Files:**
- Modify: `app/(app)/ma-tournee/page.tsx`

**Interfaces:**
- Consumes: `EnTeteTournee`'s new `nomComplet?: string` prop (Task 3).

No dedicated test for this task — `page.tsx` has no existing test file (the project's own established convention: page-level Server Components stay untested when they're a thin assembly of already-tested functions, e.g. `/ma-tournee/page.tsx` itself and `/tableau-de-bord/page.tsx` before it). Verify with a build instead.

- [ ] **Step 1: Read the connected user's full name and pass it down**

In `app/(app)/ma-tournee/page.tsx`, replace:

```tsx
  const avatarPath = user?.user_metadata?.avatar_path as string | undefined;
  const avatarUrl = avatarPath ? await getAvatarUrl(supabase, avatarPath) : null;
```

with:

```tsx
  const avatarPath = user?.user_metadata?.avatar_path as string | undefined;
  const avatarUrl = avatarPath ? await getAvatarUrl(supabase, avatarPath) : null;
  const nomComplet = user?.user_metadata?.full_name as string | undefined;
```

Then replace:

```tsx
          <EnTeteTournee
            missions={missions}
            tournee={tournee}
            contexteTarifaire={contexteTarifaire}
            filtre={filtre}
            counts={counts}
            avatarUrl={avatarUrl}
          />
```

with:

```tsx
          <EnTeteTournee
            missions={missions}
            tournee={tournee}
            contexteTarifaire={contexteTarifaire}
            filtre={filtre}
            counts={counts}
            avatarUrl={avatarUrl}
            nomComplet={nomComplet}
          />
```

- [ ] **Step 2: Verify the build and the full test suite**

Run: `npx tsc --noEmit`
Expected: no errors

Run: `npx next build`
Expected: build succeeds

Run: `npx vitest run`
Expected: all tests pass (100% green)

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/ma-tournee/page.tsx"
git commit -m "feat(ma-tournee): transmet le nom complet de l'utilisateur a l'en-tete"
```

---

## Post-plan note

This plan covers only the header reconciliation between `/ma-tournee` and
the `Ma tournée.dc.html` mockup, per
`docs/superpowers/specs/2026-08-10-ma-tournee-entete-reconciliation-design.md`.
Everything else in the mockup (mission cards, filters, floating "Suivant"
button, bottom navigation) already matches the real screen from the
2026-08-07 redesign and is untouched. The mockup's "Ely a optimisé"
banner, header "map"/"more" buttons, and "online" status dot are
deliberately never built — they have no real backing functionality.
