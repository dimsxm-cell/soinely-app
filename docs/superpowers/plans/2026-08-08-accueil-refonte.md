# Refonte visuelle de « Accueil » (`/ma-journee`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/ma-journee` (« Accueil ») adopte l'habillage visuel du mockup Claude Design (bandeau dégradé violet avec salutation/stats, bandeau de conseil Ely, timeline de missions redessinée, bouton flottant d'action rapide), sans dupliquer la coquille globale de l'app (`BarreSuperieure`/`BarreNavigationBasse`), en conservant l'intégralité du comportement réel actuel (recherche, réorganisation, matériel, Démarrer/Terminer). Deux ajouts réels, à partir de données déjà existantes : une stat « Km » (somme des distances déjà stockées par mission) et un conseil Ely dérivé de l'état de la tournée.

**Architecture:** Nouveau module de fonctions pures `lib/accueil-vue.ts` (comptages, Km, conseil Ely, action rapide), nouveau composant `EnTeteAccueil` pour le bandeau dégradé, `CarteMission.tsx` restylé en place (nouvelle palette locale, comportement inchangé). `CarteInformation` devient inutilisé et est supprimé. `MissionDuJour` gagne deux champs optionnels (`distanceKm`, `distanceKmCorrigee`) déjà présents en base.

**Tech Stack:** Next.js App Router / TypeScript / Supabase / Tailwind / Vitest.

## Global Constraints

- Nouvelle palette (`#6d28d9`, `#a855f7`, dégradé d'en-tête `linear-gradient(168deg,#221b33 0%,#2c1f47 58%,#3a2260 100%)`) appliquée à `EnTeteAccueil.tsx` et `CarteMission.tsx`, ainsi qu'aux deux éléments ajoutés directement dans `app/(app)/ma-journee/page.tsx` (bandeau de conseil Ely, bouton flottant) — précédent déjà tranché sur la refonte de Ma tournée (un bouton ponctuel dans `page.tsx` peut porter la nouvelle palette). **Jamais** dans `app/globals.css`, `components/layout/BarreNavigationBasse.tsx`, ni `components/layout/BarreSuperieure.tsx`.
- Comptages : `faites` = `terminee` OU `absent` ; `restantes` = `a_faire` OU `en_cours` — mêmes règles que Ma tournée.
- Aucune donnée inventée : la stat Km est une vraie somme ou `—` (jamais une valeur inventée) ; le conseil Ely ne mentionne aucun temps de trajet (donnée non disponible).
- Comportement de recherche inchangé : formulaire GET, `?q=`, champ toujours visible (pas de bascule d'affichage cliquable comme dans le mockup).
- « Réorganiser ma tournée » et la checklist Matériel restent affichés dans les mêmes conditions qu'aujourd'hui.
- Pas de bouton « + » (ajouter une mission) — sous-projet séparé, hors scope de ce plan.
- Ordre des missions : toujours celui déjà renvoyé par `getMissionsDuJour` (`ordre_visite` puis `heure_prevue`) — aucun tri supplémentaire à ajouter nulle part.

---

### Task 1: Données — distance par mission sur `/ma-journee`

**Files:**
- Modify: `lib/types/clinical.ts`
- Modify: `lib/data/ma-journee.ts`
- Test: `lib/data/ma-journee.test.ts`

**Interfaces:**
- Produces:
  - `MissionDuJour.distanceKm?: number | null`
  - `MissionDuJour.distanceKmCorrigee?: number | null`

- [ ] **Step 1: Write the failing test**

Dans `lib/data/ma-journee.test.ts`, ajouter ce test dans le `describe("getMissionsDuJour", ...)` existant, après le dernier test de ce bloc (« lève en cas d'erreur de lecture ») :

```typescript
  it("mappe la distance depuis le cabinet et sa correction manuelle", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              order: () =>
                Promise.resolve({
                  data: [
                    {
                      id: "m4",
                      patient_id: "p4",
                      type_soin: "Pansement",
                      heure_prevue: "11:00:00",
                      statut: "a_faire",
                      mission_clinique_id: null,
                      ordre_visite: null,
                      distance_km: 4.8,
                      distance_km_corrigee: 5.2,
                      patients: { nom_complet: "M. Petit" },
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getMissionsDuJour } = await import("./ma-journee");
    const missions = await getMissionsDuJour(fakeClient, "t1");

    expect(missions[0].distanceKm).toBe(4.8);
    expect(missions[0].distanceKmCorrigee).toBe(5.2);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/data/ma-journee.test.ts`
Expected: FAIL — `missions[0].distanceKm` est `undefined` (colonnes pas encore sélectionnées)

- [ ] **Step 3: Add the fields to `MissionDuJour`**

Dans `lib/types/clinical.ts`, ajouter à la fin de l'interface `MissionDuJour` (après `ordreVisite`) :

```typescript
  /**
   * Distance routière depuis le cabinet, aller simple, et sa correction
   * manuelle éventuelle. Optionnelles côté type pour la même raison que
   * `ordreVisite` — toujours renseignées en pratique par `getMissionsDuJour`.
   */
  distanceKm?: number | null;
  distanceKmCorrigee?: number | null;
```

- [ ] **Step 4: Extend the query and mapping in `getMissionsDuJour`**

Dans `lib/data/ma-journee.ts`, chaîne de sélection actuelle de `getMissionsDuJour` :

```typescript
      "id, patient_id, type_soin, heure_prevue, statut, mission_clinique_id, ordre_visite, patients(nom_complet)"
```

devient :

```typescript
      "id, patient_id, type_soin, heure_prevue, statut, mission_clinique_id, ordre_visite, distance_km, distance_km_corrigee, patients(nom_complet)"
```

Et dans le `return` du `.map()`, ajouter après `ordreVisite` :

```typescript
    return {
      id: row.id,
      patientId: row.patient_id,
      patientNom: patient.nom_complet,
      typeSoin: row.type_soin,
      heurePrevue: row.heure_prevue,
      statut: row.statut as StatutMission,
      missionCliniqueId: row.mission_clinique_id,
      ordreVisite: row.ordre_visite,
      distanceKm: row.distance_km,
      distanceKmCorrigee: row.distance_km_corrigee,
    };
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run lib/data/ma-journee.test.ts`
Expected: PASS — le nouveau test passe ; les tests existants de `getMissionsDuJour` passent aussi sans modification (leurs lignes simulées n'ont pas `distance_km`/`distance_km_corrigee`, donc `undefined` mappé — `toEqual` ne fait pas la différence entre une propriété absente et une propriété `undefined`).

- [ ] **Step 6: Commit**

```bash
git add lib/types/clinical.ts lib/data/ma-journee.ts lib/data/ma-journee.test.ts
git commit -m "feat(accueil): ajoute la distance par mission a MissionDuJour"
```

---

### Task 2: Fonctions pures de vue Accueil

**Files:**
- Create: `lib/accueil-vue.ts`
- Test: `lib/accueil-vue.test.ts`

**Interfaces:**
- Consumes: `MissionDuJour` (`@/lib/types/clinical`, avec `distanceKm`/`distanceKmCorrigee` de la Task 1) ; `formaterNomPropre` (`@/lib/format`).
- Produces:
  - `formatSalutation(): string`
  - `formatDateDuJour(): string`
  - `interface CountsAccueil { visites: number; faites: number; restantes: number }`
  - `compterMissionsAccueil(missions: MissionDuJour[]): CountsAccueil`
  - `calculerKmTournee(missions: MissionDuJour[]): number | null`
  - `conseilEly(missions: MissionDuJour[]): string`
  - `interface ActionRapideAccueil { missionId: string; label: string; nouveauStatut: "en_cours" | "terminee" }`
  - `prochaineActionAccueil(missions: MissionDuJour[]): ActionRapideAccueil | null`

- [ ] **Step 1: Write the failing tests**

Create `lib/accueil-vue.test.ts` :

```typescript
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calculerKmTournee,
  compterMissionsAccueil,
  conseilEly,
  formatDateDuJour,
  formatSalutation,
  prochaineActionAccueil,
} from "./accueil-vue";
import type { MissionDuJour } from "@/lib/types/clinical";

function creerMission(surcharge: Partial<MissionDuJour> = {}): MissionDuJour {
  return {
    id: "m1",
    patientId: "p1",
    patientNom: "Mme Dupont",
    typeSoin: "Pansement",
    heurePrevue: "08:00:00",
    statut: "a_faire",
    missionCliniqueId: null,
    ...surcharge,
  };
}

describe("formatSalutation", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renvoie Bonjour avant 18h", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T09:00:00"));
    expect(formatSalutation()).toBe("Bonjour");
  });

  it("renvoie Bonsoir a partir de 18h", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T18:00:00"));
    expect(formatSalutation()).toBe("Bonsoir");
  });
});

describe("formatDateDuJour", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formate la date du jour en toutes lettres, capitalisee", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T09:00:00"));
    expect(formatDateDuJour()).toBe("Samedi 8 août");
  });
});

describe("compterMissionsAccueil", () => {
  it("compte les visites, faites (terminee ou absente) et restantes (a faire ou en cours)", () => {
    const missions = [
      creerMission({ id: "a", statut: "terminee" }),
      creerMission({ id: "b", statut: "absent" }),
      creerMission({ id: "c", statut: "a_faire" }),
      creerMission({ id: "d", statut: "en_cours" }),
    ];

    expect(compterMissionsAccueil(missions)).toEqual({ visites: 4, faites: 2, restantes: 2 });
  });

  it("renvoie des comptages a zero sans mission", () => {
    expect(compterMissionsAccueil([])).toEqual({ visites: 0, faites: 0, restantes: 0 });
  });
});

describe("calculerKmTournee", () => {
  it("renvoie null quand aucune mission n'a de distance connue", () => {
    const missions = [creerMission({ distanceKm: null, distanceKmCorrigee: null })];
    expect(calculerKmTournee(missions)).toBeNull();
  });

  it("somme les distances, en priorisant la correction manuelle sur la distance brute", () => {
    const missions = [
      creerMission({ id: "a", distanceKm: 3.2, distanceKmCorrigee: null }),
      creerMission({ id: "b", distanceKm: 5, distanceKmCorrigee: 4.1 }),
    ];
    // 3.2 (pas de correction) + 4.1 (corrigee, prime sur 5) = 7.3 -> arrondi a 7.
    expect(calculerKmTournee(missions)).toBe(7);
  });

  it("traite une mission sans distance comme 0 des qu'une autre mission a une distance connue", () => {
    const missions = [
      creerMission({ id: "a", distanceKm: null, distanceKmCorrigee: null }),
      creerMission({ id: "b", distanceKm: 10, distanceKmCorrigee: null }),
    ];
    expect(calculerKmTournee(missions)).toBe(10);
  });
});

describe("conseilEly", () => {
  it("mentionne le soin en cours en priorite", () => {
    const missions = [
      creerMission({ id: "a", statut: "a_faire", patientNom: "M. Martin" }),
      creerMission({ id: "b", statut: "en_cours", patientNom: "Mme Dupont" }),
    ];
    expect(conseilEly(missions)).toBe(
      "Soin en cours chez Mme Dupont — pensez à la transmission avant de partir."
    );
  });

  it("mentionne la prochaine visite a faire, sans temps de trajet invente", () => {
    const missions = [creerMission({ statut: "a_faire", patientNom: "Mme Dupont", heurePrevue: "14:20:00" })];
    expect(conseilEly(missions)).toBe("Prochaine visite : Mme Dupont à 14:20.");
  });

  it("indique la tournee bouclee quand il ne reste aucune mission a faire ou en cours", () => {
    const missions = [creerMission({ statut: "terminee" })];
    expect(conseilEly(missions)).toBe("Tournée bouclée. Vos transmissions sont à jour, bonne journée.");
  });

  it("indique la tournee bouclee sans aucune mission", () => {
    expect(conseilEly([])).toBe("Tournée bouclée. Vos transmissions sont à jour, bonne journée.");
  });
});

describe("prochaineActionAccueil", () => {
  it("propose de terminer le soin en cours, en priorite", () => {
    const missions = [
      creerMission({ id: "a", statut: "a_faire" }),
      creerMission({ id: "b", statut: "en_cours" }),
    ];
    expect(prochaineActionAccueil(missions)).toEqual({
      missionId: "b",
      label: "Terminer le soin en cours",
      nouveauStatut: "terminee",
    });
  });

  it("propose de demarrer la prochaine mission a faire, sans soin en cours", () => {
    const missions = [creerMission({ id: "c", statut: "a_faire", patientNom: "Mme Dupont" })];
    expect(prochaineActionAccueil(missions)).toEqual({
      missionId: "c",
      label: "Démarrer · Mme Dupont",
      nouveauStatut: "en_cours",
    });
  });

  it("renvoie null sans mission a faire ni en cours", () => {
    const missions = [creerMission({ statut: "terminee" })];
    expect(prochaineActionAccueil(missions)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/accueil-vue.test.ts`
Expected: FAIL — `./accueil-vue` n'existe pas encore

- [ ] **Step 3: Implement `lib/accueil-vue.ts`**

```typescript
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

export interface CountsAccueil {
  visites: number;
  faites: number;
  restantes: number;
}

/**
 * Comptages de l'accueil — memes regles que « Ma tournee » : une absence
 * est une visite traitee, pas un blocage.
 */
export function compterMissionsAccueil(missions: MissionDuJour[]): CountsAccueil {
  return {
    visites: missions.length,
    faites: missions.filter((m) => m.statut === "terminee" || m.statut === "absent").length,
    restantes: missions.filter((m) => m.statut === "a_faire" || m.statut === "en_cours").length,
  };
}

/**
 * Somme des distances routieres connues (cabinet -> patient, aller simple),
 * en kilometres, arrondie. `null` si aucune mission n'a de distance connue —
 * jamais une valeur inventee.
 */
export function calculerKmTournee(missions: MissionDuJour[]): number | null {
  const connu = missions.some((m) => m.distanceKmCorrigee != null || m.distanceKm != null);
  if (!connu) return null;

  const total = missions.reduce((somme, m) => somme + (m.distanceKmCorrigee ?? m.distanceKm ?? 0), 0);
  return Math.round(total);
}

/**
 * Conseil affiche sous forme de bandeau, derive de l'etat reel de la
 * tournee — jamais de donnee inventee (pas de temps de trajet estime).
 */
export function conseilEly(missions: MissionDuJour[]): string {
  const enCours = missions.find((m) => m.statut === "en_cours");
  if (enCours) {
    return `Soin en cours chez ${formaterNomPropre(enCours.patientNom)} — pensez à la transmission avant de partir.`;
  }

  const prochaine = missions.find((m) => m.statut === "a_faire");
  if (prochaine) {
    return `Prochaine visite : ${formaterNomPropre(prochaine.patientNom)} à ${prochaine.heurePrevue.slice(0, 5)}.`;
  }

  return "Tournée bouclée. Vos transmissions sont à jour, bonne journée.";
}

export interface ActionRapideAccueil {
  missionId: string;
  label: string;
  nouveauStatut: "en_cours" | "terminee";
}

/**
 * Mission et action a proposer dans le bouton flottant, ou `null` si
 * aucune mission n'appelle une action immediate.
 */
export function prochaineActionAccueil(missions: MissionDuJour[]): ActionRapideAccueil | null {
  const enCours = missions.find((m) => m.statut === "en_cours");
  if (enCours) {
    return { missionId: enCours.id, label: "Terminer le soin en cours", nouveauStatut: "terminee" };
  }

  const prochaine = missions.find((m) => m.statut === "a_faire");
  if (prochaine) {
    return {
      missionId: prochaine.id,
      label: `Démarrer · ${formaterNomPropre(prochaine.patientNom)}`,
      nouveauStatut: "en_cours",
    };
  }

  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/accueil-vue.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/accueil-vue.ts lib/accueil-vue.test.ts
git commit -m "feat(accueil): ajoute les fonctions de vue (comptages, km, conseil Ely, action rapide)"
```

---

### Task 3: En-tête Accueil — bandeau dégradé, et intégration dans la page

**Files:**
- Create: `components/ui/EnTeteAccueil.tsx`
- Test: `components/ui/EnTeteAccueil.test.tsx`
- Modify: `app/(app)/ma-journee/page.tsx`
- Delete: `components/ui/CarteInformation.tsx`, `components/ui/CarteInformation.test.tsx`

**Interfaces:**
- Consumes: `formatSalutation`, `formatDateDuJour`, `compterMissionsAccueil`, `calculerKmTournee` (Task 2) ; `MissionDuJour` (Task 1, avec `distanceKm`/`distanceKmCorrigee`).
- Produces: `EnTeteAccueil({ prenom, missions }: { prenom: string | undefined; missions: MissionDuJour[] })`.

- [ ] **Step 1: Write the failing test**

Create `components/ui/EnTeteAccueil.test.tsx` :

```typescript
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EnTeteAccueil } from "./EnTeteAccueil";
import type { MissionDuJour } from "@/lib/types/clinical";

function creerMission(surcharge: Partial<MissionDuJour> = {}): MissionDuJour {
  return {
    id: "m1",
    patientId: "p1",
    patientNom: "Mme Dupont",
    typeSoin: "Pansement",
    heurePrevue: "08:00:00",
    statut: "a_faire",
    missionCliniqueId: null,
    ...surcharge,
  };
}

describe("EnTeteAccueil", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("affiche la salutation avec le prenom", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T09:00:00"));

    render(<EnTeteAccueil prenom="Dimitri" missions={[]} />);

    expect(screen.getByText("Bonjour, Dimitri")).toBeInTheDocument();
  });

  it("affiche la salutation seule sans prenom", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T09:00:00"));

    render(<EnTeteAccueil prenom={undefined} missions={[]} />);

    expect(screen.getByText("Bonjour")).toBeInTheDocument();
  });

  it("affiche Bonsoir apres 18h", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T19:00:00"));

    render(<EnTeteAccueil prenom="Dimitri" missions={[]} />);

    expect(screen.getByText("Bonsoir, Dimitri")).toBeInTheDocument();
  });

  it("affiche les stats Visites/Faites/Restantes calculees depuis les missions", () => {
    const missions = [
      creerMission({ id: "a", statut: "terminee" }),
      creerMission({ id: "b", statut: "terminee" }),
      creerMission({ id: "c", statut: "absent" }),
      creerMission({ id: "d", statut: "a_faire" }),
    ];

    render(<EnTeteAccueil prenom="Dimitri" missions={missions} />);

    expect(screen.getByText("Visites").parentElement).toHaveTextContent("4");
    expect(screen.getByText("Faites").parentElement).toHaveTextContent("3");
    expect(screen.getByText("Restantes").parentElement).toHaveTextContent("1");
  });

  it("affiche la stat Km comme non disponible sans donnee de distance", () => {
    const missions = [creerMission({ distanceKm: null, distanceKmCorrigee: null })];

    render(<EnTeteAccueil prenom="Dimitri" missions={missions} />);

    expect(screen.getByText("Km").parentElement).toHaveTextContent("—");
  });

  it("affiche la somme des distances reelles quand elles existent", () => {
    const missions = [
      creerMission({ id: "a", distanceKm: 3.2, distanceKmCorrigee: null }),
      creerMission({ id: "b", distanceKm: 5, distanceKmCorrigee: 4.1 }),
    ];

    render(<EnTeteAccueil prenom="Dimitri" missions={missions} />);

    expect(screen.getByText("Km").parentElement).toHaveTextContent("7");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/ui/EnTeteAccueil.test.tsx`
Expected: FAIL — `./EnTeteAccueil` n'existe pas encore

- [ ] **Step 3: Implement `EnTeteAccueil.tsx`**

```typescript
import Image from "next/image";
import type { MissionDuJour } from "@/lib/types/clinical";
import { calculerKmTournee, compterMissionsAccueil, formatDateDuJour, formatSalutation } from "@/lib/accueil-vue";

export function EnTeteAccueil({
  prenom,
  missions,
}: {
  prenom: string | undefined;
  missions: MissionDuJour[];
}) {
  const { visites, faites, restantes } = compterMissionsAccueil(missions);
  const km = calculerKmTournee(missions);

  return (
    <div className="relative overflow-hidden bg-[linear-gradient(168deg,#221b33_0%,#2c1f47_58%,#3a2260_100%)] px-5 pb-4 pt-8 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-24 h-[280px] w-[280px] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,.4),transparent_68%)]"
      />
      <div className="relative mx-auto max-w-2xl">
        <div className="flex items-center gap-3.5">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#a99ccb]">{formatDateDuJour()}</p>
            <p className="mt-1 font-display text-[26px] font-bold leading-tight tracking-tight">
              {formatSalutation()}
              {prenom ? `, ${prenom}` : ""}
            </p>
          </div>
          <Image
            src="/marketing/ely-nouveau-portrait.webp"
            alt="ELY"
            width={379}
            height={231}
            className="h-[100px] w-[100px] shrink-0 object-contain"
            priority
          />
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <div className="rounded-[14px] border border-white/10 bg-white/[0.07] px-2.5 py-2.5">
            <p className="font-display text-[17px] font-bold tabular-nums">{visites}</p>
            <p className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9d94b8]">Visites</p>
          </div>
          <div className="rounded-[14px] border border-white/10 bg-white/[0.07] px-2.5 py-2.5">
            <p className="font-display text-[17px] font-bold tabular-nums">{faites}</p>
            <p className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9d94b8]">Faites</p>
          </div>
          <div className="rounded-[14px] border border-white/10 bg-white/[0.07] px-2.5 py-2.5">
            <p className="font-display text-[17px] font-bold tabular-nums">{restantes}</p>
            <p className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9d94b8]">Restantes</p>
          </div>
          <div className="rounded-[14px] border border-white/10 bg-white/[0.07] px-2.5 py-2.5">
            <p className="font-display text-[17px] font-bold tabular-nums">{km !== null ? km : "—"}</p>
            <p className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9d94b8]">Km</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/ui/EnTeteAccueil.test.tsx`
Expected: PASS

- [ ] **Step 5: Delete `CarteInformation` (devient inutilisé une fois `page.tsx` réécrit à l'étape suivante)**

```bash
git rm components/ui/CarteInformation.tsx components/ui/CarteInformation.test.tsx
```

- [ ] **Step 6: Rewrite `app/(app)/ma-journee/page.tsx`**

Remplacer tout le fichier :

```typescript
import Image from "next/image";
import { createClient, getUtilisateurConnecte } from "@/lib/supabase/server";
import { formaterNomPropre } from "@/lib/format";
import { getMissionEnCoursHref, getMissionsDuJour, getTourneeDuJour } from "@/lib/data/ma-journee";
import { reorganiserTourneeAction } from "@/lib/data/reorganisation-tournee";
import { formatDateDuJour, formatSalutation } from "@/lib/accueil-vue";
import { EnTeteAccueil } from "@/components/ui/EnTeteAccueil";
import { CarteMission } from "@/components/ui/CarteMission";
import { FormulaireAvecRetour } from "@/components/ui/FormulaireAvecRetour";
import { getMaterielDuJour } from "@/lib/data/materiel";
import { CarteMateriel } from "@/components/ui/CarteMateriel";

export default async function MaJourneePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const requete = (q ?? "").trim();

  const supabase = await createClient();
  const user = await getUtilisateurConnecte();

  const nomComplet = user?.user_metadata?.full_name as string | undefined;
  const prenom = nomComplet ? formaterNomPropre(nomComplet).split(" ")[0] : undefined;

  const tournee = user ? await getTourneeDuJour(supabase, user.id) : null;
  const [missions, contexte, materiel] = tournee
    ? await Promise.all([
        getMissionsDuJour(supabase, tournee.id),
        getMissionEnCoursHref(supabase, tournee.id),
        getMaterielDuJour(supabase, tournee.id),
      ])
    : [[], null, []];

  const missionsVisibles = requete
    ? missions.filter((m) => m.patientNom.toLowerCase().includes(requete.toLowerCase()))
    : missions;
  const missionsRestantes = missions.filter((m) => m.statut !== "terminee").length;
  const missionsAFaire = missions.filter((m) => m.statut === "a_faire").length;

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      {tournee ? (
        <EnTeteAccueil prenom={prenom} missions={missions} />
      ) : (
        <div className="mx-auto w-full max-w-2xl px-6 py-6 sm:py-10">
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">
              {formatSalutation()}
              {prenom ? `, ${prenom}` : ""}
            </h1>
            <Image
              src="/marketing/ely-nouveau-portrait.webp"
              alt="ELY"
              width={379}
              height={231}
              className="h-[52px] w-[52px] shrink-0 object-contain"
              priority
            />
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-[15px] text-navy/50">
            Accueil
            <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-brand-violet/[0.12] px-2.5 py-1 text-[12.5px] font-semibold text-brand-violet">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand-violet" />
              {formatDateDuJour()}
            </span>
          </div>
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
        </div>
      )}

      {tournee && (
        <div className="mx-auto w-full max-w-2xl px-6 py-6 sm:py-10">
          <form method="GET">
            <input
              type="search"
              name="q"
              defaultValue={requete}
              placeholder="Rechercher un patient..."
              aria-label="Rechercher un patient dans les missions du jour"
              className="min-h-[48px] w-full rounded-[14px] border border-[#e4e0ea] bg-[#faf9fc] px-4 text-[15px] text-navy placeholder:text-navy/40 focus:border-[#a855f7] focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-[rgba(168,85,247,.16)]"
            />
          </form>

          {materiel.length > 0 && (
            <CarteMateriel
              items={materiel}
              tourneeId={tournee.id}
              prepare={tournee.materielPrepare}
              verifie={tournee.materielVerifie}
            />
          )}

          <div className="mt-7">
            <div className="flex items-baseline justify-between">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-navy/45">
                Missions du jour
              </p>
              <p className="text-[12.5px] text-navy/45">
                {missionsRestantes > 0
                  ? `${missionsRestantes} restante${missionsRestantes > 1 ? "s" : ""}`
                  : "Tout est fait"}
              </p>
            </div>

            {missionsAFaire >= 2 && (
              <FormulaireAvecRetour
                action={reorganiserTourneeAction}
                messageSucces="Tournée réorganisée."
                className="mt-3 flex flex-col items-start gap-1.5"
              >
                <input type="hidden" name="tourneeId" value={tournee.id} />
                <button
                  type="submit"
                  className="btn-glace rounded-[12px] bg-brand-violet/10 px-4 py-2.5 text-[13.5px] font-semibold text-brand-violet"
                >
                  Réorganiser ma tournée
                </button>
              </FormulaireAvecRetour>
            )}

            {missionsVisibles.length > 0 ? (
              <div className="mt-3 flex flex-col gap-3">
                {missionsVisibles.map((mission, index) => (
                  <CarteMission
                    key={mission.id}
                    mission={mission}
                    contexteHref={mission.id === contexte?.missionId ? contexte.href : undefined}
                    estDerniere={index === missionsVisibles.length - 1}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-6 text-center text-navy/60">
                {requete ? "Aucun patient ne correspond." : "Aucune mission prévue pour aujourd'hui."}
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 7: Run the full suite and the build**

Run: `npx vitest run`
Expected: PASS

Run: `npx next build`
Expected: build réussi

- [ ] **Step 8: Commit**

```bash
git add components/ui/EnTeteAccueil.tsx components/ui/EnTeteAccueil.test.tsx "app/(app)/ma-journee/page.tsx"
git commit -m "feat(accueil): bandeau degrade avec salutation et stats, supprime CarteInformation"
```

---

### Task 4: `CarteMission` — restylage visuel

**Files:**
- Modify: `components/ui/CarteMission.tsx`
- Test: `components/ui/CarteMission.test.tsx` — inchangé, sert de filet de non-régression (aucune assertion ne porte sur une classe CSS).

**Interfaces:**
- Consumes: rien de nouveau — restylage pur, mêmes props (`mission`, `contexteHref`, `estDerniere`).

- [ ] **Step 1: Run the untouched test file to confirm the current baseline passes**

Run: `npx vitest run components/ui/CarteMission.test.tsx`
Expected: PASS (avant modification — sert de référence)

- [ ] **Step 2: Rewrite `CarteMission.tsx`**

Remplacer tout le fichier :

```typescript
import { FormulaireAvecRetour } from "@/components/ui/FormulaireAvecRetour";
import Link from "next/link";
import type { MissionDuJour, StatutMission } from "@/lib/types/clinical";
import { updateMissionStatutAction } from "@/lib/data/ma-journee-actions";
import { formaterNomPropre } from "@/lib/format";
import { IconeSoin } from "@/components/ui/IconeSoin";

const STATUT_LABEL: Record<MissionDuJour["statut"], string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  terminee: "Terminée",
  absent: "Absente",
};

const STATUT_CLASSES: Record<MissionDuJour["statut"], string> = {
  a_faire: "text-[#8d8798] bg-[rgba(141,135,152,.1)]",
  en_cours: "text-[#6d28d9] bg-[rgba(109,40,217,.11)] font-bold",
  terminee: "text-[#1a7f5a] bg-[rgba(26,127,90,.11)] font-semibold",
  absent: "text-[#c2410c] bg-[rgba(194,65,12,.11)] font-semibold",
};

const DOT_CLASSES: Record<MissionDuJour["statut"], string> = {
  a_faire: "bg-[rgba(109,40,217,.5)]",
  en_cours: "bg-[#6d28d9] shadow-[0_0_0_4px_rgba(109,40,217,.2)]",
  terminee: "bg-[#1a7f5a]",
  absent: "bg-navy/20",
};

const PROCHAIN_STATUT: Partial<Record<StatutMission, StatutMission>> = {
  a_faire: "en_cours",
  en_cours: "terminee",
};

const LIBELLE_ACTION: Partial<Record<StatutMission, string>> = {
  a_faire: "Démarrer",
  en_cours: "Terminer",
};

const BOUTON_CLASSES: Partial<Record<StatutMission, string>> = {
  a_faire: "bg-[linear-gradient(135deg,#6d28d9,#a855f7)] shadow-[0_4px_12px_rgba(109,40,217,.3)]",
  en_cours: "bg-[#1a7f5a] shadow-[0_4px_12px_rgba(26,127,55,.28)]",
};

interface CarteMissionProps {
  mission: MissionDuJour;
  contexteHref?: string;
  estDerniere?: boolean;
}

export function CarteMission({ mission, contexteHref, estDerniere }: CarteMissionProps) {
  const prochainStatut = PROCHAIN_STATUT[mission.statut];
  const heureAffichee = mission.heurePrevue.slice(0, 5);
  const enCours = mission.statut === "en_cours";
  const terminee = mission.statut === "terminee";

  return (
    <div className="flex items-stretch gap-2.5">
      <div className="relative flex w-9 shrink-0 flex-col items-center gap-1.5 pt-3.5">
        {!estDerniere && (
          <span aria-hidden="true" className="absolute left-1/2 top-[30px] bottom-[-12px] w-px -translate-x-1/2 bg-navy/12" />
        )}
        <span className="whitespace-nowrap text-[11px] font-bold tabular-nums text-navy/45">{heureAffichee}</span>
        <span
          aria-hidden="true"
          className={`relative z-10 h-3 w-3 rounded-full ring-4 ring-[#F6F7F5] ${DOT_CLASSES[mission.statut]}`}
        />
        {mission.ordreVisite != null && (
          <span
            aria-label={`Ordre de passage suggéré : ${mission.ordreVisite}`}
            className="relative z-10 flex h-4 w-4 items-center justify-center rounded-full bg-[#6d28d9] text-[9px] font-bold text-white"
          >
            {mission.ordreVisite}
          </span>
        )}
      </div>

      <div
        className={`flex flex-1 flex-col gap-3 rounded-2xl border bg-white p-3.5 sm:flex-row sm:items-center ${
          enCours
            ? "border-[1.5px] border-[#6d28d9] shadow-[0_6px_18px_rgba(109,40,217,.18)]"
            : "border-navy/[0.06] shadow-[0_1px_2px_rgba(15,23,42,.04)]"
        } ${terminee ? "opacity-70" : ""}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            aria-hidden="true"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${
              enCours
                ? "bg-[linear-gradient(140deg,#a855f7,#6d28d9)] text-white"
                : terminee
                  ? "bg-[rgba(109,40,217,.06)] text-[#6d28d9]"
                  : "bg-[rgba(109,40,217,.12)] text-[#6d28d9]"
            }`}
          >
            <IconeSoin typeSoin={mission.typeSoin} className="h-5 w-5" />
          </span>

          <Link href={`/ma-journee/${mission.id}`} className="min-w-0 flex-1 hover:opacity-80">
            <p className={`font-semibold ${terminee ? "text-navy/50" : "text-navy"}`}>
              {formaterNomPropre(mission.patientNom)}
            </p>
            <p className="text-sm text-navy/50">{mission.typeSoin}</p>
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0 sm:flex-nowrap sm:justify-end">
          {contexteHref && (
            <Link href={contexteHref} className="text-sm font-semibold text-[#6d28d9] hover:underline">
              Contexte clinique
            </Link>
          )}
          <span className={`rounded-[10px] px-2.5 py-1 text-[11.5px] font-semibold ${STATUT_CLASSES[mission.statut]}`}>
            {STATUT_LABEL[mission.statut]}
          </span>
          {prochainStatut && (
            <FormulaireAvecRetour action={updateMissionStatutAction} messageSucces="Passage mis à jour.">
              <input type="hidden" name="missionId" value={mission.id} />
              <input type="hidden" name="nouveauStatut" value={prochainStatut} />
              <button
                type="submit"
                className={`btn-glace rounded-[12px] px-4 py-2 text-sm font-semibold text-white ${BOUTON_CLASSES[mission.statut]}`}
              >
                {LIBELLE_ACTION[mission.statut]}
              </button>
            </FormulaireAvecRetour>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run tests to verify no regression**

Run: `npx vitest run components/ui/CarteMission.test.tsx`
Expected: PASS — mêmes tests, aucune modification nécessaire (aucune assertion ne porte sur une classe CSS).

- [ ] **Step 4: Commit**

```bash
git add components/ui/CarteMission.tsx
git commit -m "feat(accueil): restyle CarteMission avec la nouvelle palette violette"
```

---

### Task 5: Conseil Ely et bouton flottant d'action rapide

**Files:**
- Modify: `app/(app)/ma-journee/page.tsx`

**Interfaces:**
- Consumes: `conseilEly`, `prochaineActionAccueil`, `ActionRapideAccueil` (Task 2) ; `updateMissionStatutAction` (déjà existant, `@/lib/data/ma-journee-actions`).

- [ ] **Step 1: Add the imports and computed values**

Dans `app/(app)/ma-journee/page.tsx`, la Task 3 a laissé cette ligne d'import :

```typescript
import { formatDateDuJour, formatSalutation } from "@/lib/accueil-vue";
```

La remplacer par :

```typescript
import { conseilEly, formatDateDuJour, formatSalutation, prochaineActionAccueil } from "@/lib/accueil-vue";
```

Et ajouter cette nouvelle ligne d'import, avec les autres imports existants :

```typescript
import { updateMissionStatutAction } from "@/lib/data/ma-journee-actions";
```

Juste après le calcul existant de `missionsAFaire` (`const missionsAFaire = missions.filter((m) => m.statut === "a_faire").length;`), ajouter :

```typescript
  const conseil = tournee ? conseilEly(missions) : null;
  const actionRapide = tournee ? prochaineActionAccueil(missions) : null;
```

- [ ] **Step 2: Insert the Ely tip banner**

Dans le bloc `{tournee && (<div className="mx-auto w-full max-w-2xl px-6 py-6 sm:py-10">...)}`, juste après le `<form method="GET">...</form>` de recherche et avant le bloc `{materiel.length > 0 && (...)}`, insérer :

```typescript
          {conseil && (
            <div className="mt-4 flex items-start gap-2.5 rounded-[16px] border border-[rgba(168,85,247,.26)] bg-[linear-gradient(140deg,rgba(168,85,247,.13),rgba(109,40,217,.05))] px-3.5 py-3">
              <Image
                src="/marketing/ely-nouveau-portrait.webp"
                alt=""
                width={379}
                height={231}
                className="h-7 w-7 shrink-0 rounded-full border border-[rgba(168,85,247,.3)] bg-white object-contain"
              />
              <p className="text-[12.5px] leading-relaxed text-[#4b4359]">{conseil}</p>
            </div>
          )}
```

- [ ] **Step 3: Add the floating quick-action button**

Juste avant la fermeture de `</main>` (après le bloc `{tournee && (<div>...</div>)}` de contenu), ajouter :

```typescript
      {tournee && actionRapide && (
        <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-10 mx-auto max-w-2xl px-4">
          <FormulaireAvecRetour action={updateMissionStatutAction} messageSucces="Passage mis à jour.">
            <input type="hidden" name="missionId" value={actionRapide.missionId} />
            <input type="hidden" name="nouveauStatut" value={actionRapide.nouveauStatut} />
            <button
              type="submit"
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,#6d28d9,#a855f7)] px-4 text-[15px] font-bold text-white shadow-[0_14px_28px_-12px_rgba(109,40,217,.9)]"
            >
              {actionRapide.label}
            </button>
          </FormulaireAvecRetour>
        </div>
      )}
```

Remarque : pas de test dédié pour ce câblage — aucune page de ce dépôt n'a de fichier `page.test.tsx` (convention déjà établie, vérifiée sur l'ensemble du projet), et la logique (`conseilEly`, `prochaineActionAccueil`) est déjà entièrement testée à la Task 2. Le comportement de soumission réutilise `updateMissionStatutAction`, déjà testé par ailleurs (`lib/data/ma-journee-actions.test.ts`).

- [ ] **Step 4: Run the full suite, typecheck and build**

Run: `npx vitest run`
Expected: PASS

Run: `npx tsc --noEmit`
Expected: aucune erreur

Run: `npx next build`
Expected: build réussi

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/ma-journee/page.tsx"
git commit -m "feat(accueil): ajoute le conseil Ely et le bouton flottant d'action rapide"
```

---

## Exécution

Après la Task 5, exécuter une dernière fois `npx vitest run`, `npx tsc --noEmit` et `npx next build` avant la revue finale de branche. Aucune migration de base de données dans ce plan — les colonnes `distance_km`/`distance_km_corrigee` existent déjà en production (utilisées depuis la génération de tournée).
