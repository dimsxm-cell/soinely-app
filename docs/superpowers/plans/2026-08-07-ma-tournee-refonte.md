# Refonte visuelle de « Ma tournée » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/ma-tournee` adopte l'habillage visuel du mockup Claude Design (en-tête violet dégradé avec anneau de progression, filtres en pilules, cartes de mission redessinées) tout en conservant à l'identique tout le comportement réel existant (statuts, GPS/Waze, facturation, alertes), et gagne un vrai badge de retard basé sur l'heure de début réelle du soin en cours.

**Architecture:** Nouvelle colonne `heure_debut_reelle`, écrite par l'action de transition de statut existante. Trois composants déjà utilisés uniquement par cette page (`EnTeteTournee`, `OngletsFiltresTournee`, `CarteMissionTournee`) sont restylés en place, avec une nouvelle palette locale (classes Tailwind arbitraires, pas de token global). Le calcul du retard et le formatage d'heure depuis un timestamp passent par le fuseau `Europe/Paris` explicitement, indépendamment du fuseau du serveur.

**Tech Stack:** Next.js App Router / TypeScript / Supabase / Tailwind / Vitest.

## Global Constraints

- Nouvelle palette (`#6d28d9`, fond `#e9e7e2`, dégradé d'en-tête `linear-gradient(168deg,#221b33 0%,#2c1f47 58%,#3a2260 100%)`) appliquée **uniquement** dans `EnTeteTournee.tsx`, `OngletsFiltresTournee.tsx`, `CarteMissionTournee.tsx` — jamais dans `app/globals.css`, jamais dans `components/layout/BarreNavigationBasse.tsx`.
- Comptage de progression inchangé : `valides` = `terminee` OU `absent` ; `restants` = `a_faire` OU `en_cours`.
- Flux de statut inchangé : `a_faire →(Valider le soin)→ en_cours →(Valider)→ terminee`, `a_faire →(Absent)→ absent`, annulations `terminee → a_faire` et `absent → a_faire`.
- Aucune nouvelle catégorie d'alerte au-delà de `patientAllergies`.
- Stat « Km » affichée `—` (pas de donnée réelle de distance cumulée de tournée).
- `heure_debut_reelle` est écrite inconditionnellement à chaque transition vers `en_cours` (pas de vérification « déjà posée »).
- Tous les boutons/liens d'action existants (GPS/Waze, Appeler, Valider, Absent, annulations, motif d'absence, lien contexte clinique) gardent leur comportement, texte et cibles exacts — seules leurs classes visuelles changent.

---

### Task 1: Données — heure de début réelle et calcul du retard

**Files:**
- Create: `supabase/migrations/20260807000000_heure_debut_reelle.sql`
- Modify: `lib/types/database.types.ts`
- Modify: `lib/data/ma-journee.ts`
- Modify: `lib/tournee-vue.ts`
- Test: `lib/tournee-vue.test.ts`

**Interfaces:**
- Produces:
  - `MissionTourneeVue.heureDebutReelle: string | null` (nouveau champ, `lib/data/ma-journee.ts`)
  - `calculerRetardMinutes(mission: MissionTourneeVue): number | null` (`lib/tournee-vue.ts`)
  - `formatHeureDepuisTimestamp(iso: string): string` (`lib/tournee-vue.ts`) — renvoie `"HH:MM"` en heure de Paris

- [ ] **Step 1: Write the migration**

```sql
-- Heure réelle de début d'un soin, capturée au moment où le statut passe
-- à « en cours ». Sert à calculer un retard par rapport à heure_prevue,
-- figé au démarrage plutôt que recalculé en continu pendant le soin.
alter table public.missions_du_jour
  add column heure_debut_reelle timestamptz;
```

- [ ] **Step 2: Apply the migration locally and regenerate types**

Run: `npx supabase db push` (ou, si aucun projet lié dans ce worktree, appliquer via `psql`/le SQL Editor en environnement de développement uniquement — jamais en production à ce stade)
Note pour le contrôleur : la synchronisation en production suit la même procédure que pour `materiel_ngap` (2026-08-06) — appliquer la migration en production **avant** la fusion du code, via `supabase db push`, pour éviter la course au déploiement.

- [ ] **Step 3: Add the column to `lib/types/database.types.ts`**

Dans le bloc `missions_du_jour`, ajouter `heure_debut_reelle` en ordre alphabétique parmi les colonnes optionnelles (après `distance_km_corrigee`, avant `mission_clinique_id`), dans les trois sous-objets :

```typescript
        Row: {
          heure_prevue: string
          id: string
          distance_km: number | null
          distance_km_corrigee: number | null
          heure_debut_reelle: string | null
          mission_clinique_id: string | null
          motif_absence: string | null
          ordre_visite: number | null
          patient_id: string
          photo_path: string | null
          rappel: string | null
          statut: string
          tournee_id: string
          transmission: string | null
          type_soin: string
        }
        Insert: {
          heure_prevue: string
          id?: string
          distance_km?: number | null
          distance_km_corrigee?: number | null
          heure_debut_reelle?: string | null
          mission_clinique_id?: string | null
          motif_absence?: string | null
          ordre_visite?: number | null
          patient_id: string
          photo_path?: string | null
          rappel?: string | null
          statut?: string
          tournee_id: string
          transmission?: string | null
          type_soin: string
        }
        Update: {
          heure_prevue?: string
          id?: string
          distance_km?: number | null
          distance_km_corrigee?: number | null
          heure_debut_reelle?: string | null
          mission_clinique_id?: string | null
          motif_absence?: string | null
          ordre_visite?: number | null
          patient_id?: string
          photo_path?: string | null
          rappel?: string | null
          statut?: string
          tournee_id?: string
```

(Laisser le reste du bloc — `transmission`, `type_soin`, `Relationships`, etc. — inchangé.)

- [ ] **Step 4: Extend `MissionTourneeVue` and its mapping in `lib/data/ma-journee.ts`**

Ajouter le champ à l'interface (après `motifAbsence`, dernier champ actuel — voir `lib/data/ma-journee.ts:394-419`) :

```typescript
export interface MissionTourneeVue {
  id: string;
  patientId: string;
  patientNom: string;
  patientAdresse: string;
  patientTelephone: string;
  patientAllergies: string | null;
  patientConsignes: string | null;
  patientDateNaissance: string | null;
  /**
   * Forfait journalier de dépendance du patient (BSA, BSB, BSC), ou `null`.
   * Sa présence bascule les actes techniques du passage en AMX à 50 %.
   */
  patientForfaitBsi: string | null;
  /** Distance routière depuis le cabinet, aller simple. */
  distanceKm: number | null;
  /** Distance corrigée à la main, qui prime sur la précédente. */
  distanceKmCorrigee: number | null;
  typeSoin: string;
  heurePrevue: string;
  statut: StatutMission;
  missionCliniqueId: string | null;
  dureeEstimeeMin: number;
  actes: ActeVue[];
  motifAbsence: string | null;
  /** Heure réelle de début du soin, posée à la transition vers `en_cours`. */
  heureDebutReelle: string | null;
}
```

Modifier la requête `getMissionsTourneeVue` (`lib/data/ma-journee.ts:421-479`) pour sélectionner et mapper la colonne. Chaîne de sélection actuelle (ligne 428) :

```typescript
      "id, patient_id, type_soin, heure_prevue, statut, motif_absence, mission_clinique_id, distance_km, distance_km_corrigee, patients(nom_complet, adresse, telephone, allergies, consignes, date_naissance, forfait_bsi), missions_cliniques(duree_estimee_min), actes_mission(libelle, ordre, ngap_codes(code, cotation, lettre_cle, coefficient, derogatoire_bsi, eligible_mci))"
```

devient :

```typescript
      "id, patient_id, type_soin, heure_prevue, statut, motif_absence, heure_debut_reelle, mission_clinique_id, distance_km, distance_km_corrigee, patients(nom_complet, adresse, telephone, allergies, consignes, date_naissance, forfait_bsi), missions_cliniques(duree_estimee_min), actes_mission(libelle, ordre, ngap_codes(code, cotation, lettre_cle, coefficient, derogatoire_bsi, eligible_mci))"
```

Et dans le `return` du `.map()` (`lib/data/ma-journee.ts:458-477`), ajouter le champ après `motifAbsence` :

```typescript
    return {
      id: row.id,
      patientId: row.patient_id,
      patientNom: patient?.nom_complet ?? "",
      patientAdresse: patient?.adresse ?? "",
      patientTelephone: patient?.telephone ?? "",
      patientAllergies: patient?.allergies ?? null,
      patientConsignes: patient?.consignes ?? null,
      patientDateNaissance: patient?.date_naissance ?? null,
      patientForfaitBsi: patient?.forfait_bsi ?? null,
      distanceKm: row.distance_km ?? null,
      distanceKmCorrigee: row.distance_km_corrigee ?? null,
      typeSoin: row.type_soin,
      heurePrevue: row.heure_prevue,
      statut: row.statut as StatutMission,
      missionCliniqueId: row.mission_clinique_id,
      dureeEstimeeMin: mc?.duree_estimee_min ?? 0,
      actes,
      motifAbsence: row.motif_absence,
      heureDebutReelle: row.heure_debut_reelle ?? null,
    };
```

- [ ] **Step 5: Write the failing tests**

Ajouter à la fin de `lib/tournee-vue.test.ts` (après le dernier `describe` existant) :

```typescript
describe("formatHeureDepuisTimestamp", () => {
  it("convertit un timestamp UTC en heure de Paris, en heure d'été", () => {
    // 29 juillet 2026, 12:35 UTC = 14:35 heure d'été de Paris (UTC+2).
    expect(formatHeureDepuisTimestamp("2026-07-29T12:35:00.000Z")).toBe("14:35");
  });

  it("convertit un timestamp UTC en heure de Paris, en heure d'hiver", () => {
    // 15 janvier 2026, 13:05 UTC = 14:05 heure d'hiver de Paris (UTC+1).
    expect(formatHeureDepuisTimestamp("2026-01-15T13:05:00.000Z")).toBe("14:05");
  });
});

describe("calculerRetardMinutes", () => {
  function creerMissionEnCours(heurePrevue: string, heureDebutReelle: string | null): MissionTourneeVue {
    return {
      id: "m1",
      patientId: "p1",
      patientNom: "Mme Dupont",
      patientAdresse: "12 rue des Lilas",
      patientTelephone: "06 12 34 56 78",
      patientAllergies: null,
      patientConsignes: null,
      patientDateNaissance: null,
      patientForfaitBsi: null,
      distanceKm: null,
      distanceKmCorrigee: null,
      typeSoin: "Pansement",
      heurePrevue,
      statut: "en_cours",
      missionCliniqueId: null,
      dureeEstimeeMin: 25,
      actes: [],
      motifAbsence: null,
      heureDebutReelle,
    };
  }

  it("renvoie le nombre de minutes de retard, arrivée après l'heure prévue", () => {
    // Prévu 14:20 Paris, débuté 14:32 Paris (12:32 UTC en été) : 12 min de retard.
    const mission = creerMissionEnCours("14:20:00", "2026-07-29T12:32:00.000Z");
    expect(calculerRetardMinutes(mission)).toBe(12);
  });

  it("renvoie null quand l'heure réelle précède ou égale l'heure prévue", () => {
    const pile = creerMissionEnCours("14:20:00", "2026-07-29T12:20:00.000Z");
    const enAvance = creerMissionEnCours("14:20:00", "2026-07-29T12:10:00.000Z");
    expect(calculerRetardMinutes(pile)).toBeNull();
    expect(calculerRetardMinutes(enAvance)).toBeNull();
  });

  it("renvoie null quand la mission n'est pas en cours", () => {
    const mission = { ...creerMissionEnCours("14:20:00", "2026-07-29T12:32:00.000Z"), statut: "a_faire" as const };
    expect(calculerRetardMinutes(mission)).toBeNull();
  });

  it("renvoie null sans heure de début réelle", () => {
    const mission = creerMissionEnCours("14:20:00", null);
    expect(calculerRetardMinutes(mission)).toBeNull();
  });
});
```

Ajouter `formatHeureDepuisTimestamp` et `calculerRetardMinutes` à l'import existant en tête de fichier (`lib/tournee-vue.test.ts:3-...`, bloc d'import depuis `@/lib/tournee-vue`).

- [ ] **Step 6: Run tests to verify they fail**

Run: `npx vitest run lib/tournee-vue.test.ts`
Expected: FAIL — `formatHeureDepuisTimestamp`/`calculerRetardMinutes` ne sont pas exportées

- [ ] **Step 7: Implement in `lib/tournee-vue.ts`**

Ajouter à la fin du fichier (après `STATUT_BADGE`) :

```typescript
const FUSEAU_TOURNEE = "Europe/Paris";

function partiesHeureParis(iso: string): { heures: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSEAU_TOURNEE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const heures = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minutes = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return { heures, minutes };
}

/** Formate un timestamp en heure de Paris, quel que soit le fuseau du serveur. */
export function formatHeureDepuisTimestamp(iso: string): string {
  const { heures, minutes } = partiesHeureParis(iso);
  return `${String(heures).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function minutesDepuisMinuit(iso: string): number {
  const { heures, minutes } = partiesHeureParis(iso);
  return heures * 60 + minutes;
}

function minutesDepuisChaineHeure(heure: string): number {
  const [h, m] = heure.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Retard en minutes du soin en cours, figé à l'heure réelle de début —
 * ne grossit pas pendant le soin. Comparaison en minutes-depuis-minuit
 * heure de Paris des deux côtés, pour rester correcte quel que soit le
 * fuseau du serveur qui exécute ce calcul (Vercel tourne en UTC).
 */
export function calculerRetardMinutes(mission: MissionTourneeVue): number | null {
  if (mission.statut !== "en_cours" || !mission.heureDebutReelle) return null;
  const retard = minutesDepuisMinuit(mission.heureDebutReelle) - minutesDepuisChaineHeure(mission.heurePrevue);
  return retard > 0 ? retard : null;
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run lib/tournee-vue.test.ts`
Expected: PASS — tests existants + 6 nouveaux

- [ ] **Step 9: Run the full suite to confirm the type change doesn't break other consumers**

Run: `npx vitest run`
Expected: PASS. Si des tests existants construisant un `MissionTourneeVue` échouent au typecheck (`npx tsc --noEmit`), c'est qu'ils manquent le nouveau champ obligatoire `heureDebutReelle` — ils seront corrigés dans les tâches qui touchent ces fichiers de test (Task 3 pour `EnTeteTournee.test.tsx`, Task 4 pour `CarteMissionTournee.test.tsx`). Confirmer ici seulement que `lib/tournee-vue.test.ts` et le reste de la suite non liée à `MissionTourneeVue` passent.

Run: `npx tsc --noEmit`
Expected: erreurs uniquement dans `EnTeteTournee.test.tsx` et `CarteMissionTournee.test.tsx` (champ manquant) — normal à ce stade, corrigé dans les tâches suivantes.

- [ ] **Step 10: Commit**

```bash
git add supabase/migrations/20260807000000_heure_debut_reelle.sql lib/types/database.types.ts lib/data/ma-journee.ts lib/tournee-vue.ts lib/tournee-vue.test.ts
git commit -m "feat(ma-tournee): ajoute heure_debut_reelle et le calcul du retard"
```

---

### Task 2: Enregistrement de l'heure de début réelle

**Files:**
- Modify: `lib/data/ma-journee-actions.ts`
- Test: `lib/data/ma-journee-actions.test.ts`

**Interfaces:**
- Consumes: rien de nouveau — modifie la construction du payload déjà existant dans `updateMissionStatutAction`.

- [ ] **Step 1: Write the failing test**

Dans `lib/data/ma-journee-actions.test.ts`, modifier le premier test du `describe("updateMissionStatutAction", ...)` (actuellement « applique une transition valide (a_faire vers en_cours)... », lignes 35-57) pour vérifier le nouveau champ. Remplacer l'assertion ligne 50 :

```typescript
    expect(updateMock).toHaveBeenCalledWith({ statut: "en_cours" });
```

par :

```typescript
    expect(updateMock).toHaveBeenCalledWith({
      statut: "en_cours",
      heure_debut_reelle: expect.any(String),
    });
```

Ajouter aussi, dans le même `describe`, un test dédié qui vérifie qu'une transition qui n'est PAS vers `en_cours` ne pose pas la colonne :

```typescript
  it("ne pose pas heure_debut_reelle pour une transition qui n'est pas vers en_cours", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "en_cours" }, error: null });
    eqUpdateMock.mockReturnValue({ eq: eqUpdateMock2 });
    eqUpdateMock2.mockResolvedValue({ error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "terminee");

    await updateMissionStatutAction(formData);

    expect(updateMock).toHaveBeenCalledWith({ statut: "terminee" });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/data/ma-journee-actions.test.ts`
Expected: FAIL sur l'assertion `heure_debut_reelle` manquante

- [ ] **Step 3: Implement**

Dans `lib/data/ma-journee-actions.ts`, fonction `updateMissionStatutAction`, remplacer la construction actuelle de `misAJour` :

```typescript
  const misAJour =
    nouveauStatut === "a_faire"
      ? { statut: nouveauStatut, motif_absence: null }
      : { statut: nouveauStatut };
```

par :

```typescript
  const misAJour =
    nouveauStatut === "a_faire"
      ? { statut: nouveauStatut, motif_absence: null }
      : nouveauStatut === "en_cours"
        ? { statut: nouveauStatut, heure_debut_reelle: new Date().toISOString() }
        : { statut: nouveauStatut };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/data/ma-journee-actions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/data/ma-journee-actions.ts lib/data/ma-journee-actions.test.ts
git commit -m "feat(ma-tournee): enregistre l'heure de debut reelle au demarrage d'un soin"
```

---

### Task 3: En-tête et filtres — refonte visuelle

**Files:**
- Modify: `components/ui/OngletsFiltresTournee.tsx`
- Modify: `components/ui/EnTeteTournee.tsx`
- Modify: `app/(app)/ma-tournee/page.tsx`
- Modify: `components/ui/EnTeteTournee.test.tsx`
- Test: `components/ui/OngletsFiltresTournee.test.tsx` — inchangé, sert de filet de non-régression (aucune assertion ne porte sur une classe CSS).

**Interfaces:**
- Consumes: `calculerRetardMinutes(mission)`, `formatHeureDepuisTimestamp(iso)` (Task 1) ; `Filtre`, `CountsMissions` (déjà existants, `lib/tournee-vue.ts`).
- Produces: `EnTeteTournee` gagne deux props obligatoires `filtre: Filtre` et `counts: CountsMissions`, et rend `OngletsFiltresTournee` en interne.

- [ ] **Step 1: Restyle `OngletsFiltresTournee.tsx`**

Remplacer tout le fichier :

```typescript
import Link from "next/link";
import type { CountsMissions, Filtre } from "@/lib/tournee-vue";

export function OngletsFiltresTournee({
  filtre,
  counts,
}: {
  filtre: Filtre;
  counts: CountsMissions;
}) {
  const onglets: { label: string; clef: Filtre; count: number }[] = [
    { label: "Tout", clef: "tout", count: counts.tout },
    { label: "À faire", clef: "a_faire", count: counts.a_faire },
    { label: "Alertes", clef: "alertes", count: counts.alertes },
    { label: "Validés", clef: "valides", count: counts.valides },
  ];

  return (
    <div className="flex gap-1 rounded-[14px] border border-white/[0.08] bg-black/[0.26] p-1">
      {onglets.map((o) => {
        const actif = filtre === o.clef;
        return (
          <Link
            key={o.clef}
            href={o.clef === "tout" ? "/ma-tournee" : `/ma-tournee?filtre=${o.clef}`}
            aria-current={actif ? "page" : undefined}
            className={`flex flex-1 min-h-[34px] items-center justify-center gap-1.5 whitespace-nowrap rounded-[11px] text-[12px] transition-colors ${
              actif ? "bg-white font-bold text-[#2b1a55]" : "font-semibold text-[#a79dc4] hover:text-white"
            }`}
          >
            {o.label} {o.count}
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Run the untouched test file to confirm it still passes against the restyle**

Run: `npx vitest run components/ui/OngletsFiltresTournee.test.tsx`
Expected: PASS — aucune assertion ne porte sur une classe, seuls texte/href/aria-current sont vérifiés.

- [ ] **Step 3: Rewrite `EnTeteTournee.test.tsx`**

Remplacer tout le fichier — chaque appel `render(<EnTeteTournee .../>)` gagne les props `filtre`/`counts`, `creerMission` gagne `heureDebutReelle`, et de nouveaux tests couvrent l'anneau/le retard/la stat Km :

```typescript
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EnTeteTournee } from "./EnTeteTournee";
import type { MissionTourneeVue } from "@/lib/data/ma-journee";
import type { StatutMission, Tournee } from "@/lib/types/clinical";
import type { ContexteTarifaire } from "@/lib/cotation";
import type { CountsMissions } from "@/lib/tournee-vue";

const TARIFS: ContexteTarifaire = { zone: "metropole", valeurs: new Map() };

const tournee: Tournee = {
  id: "t1",
  date: "2026-07-30",
  nbPatients: 8,
  nbInjections: 3,
  nbPansements: 2,
  nbGlycemies: 1,
  tempsEstimeMin: 240,
  materielPrepare: false,
  materielVerifie: false,
};

const COUNTS_VIDES: CountsMissions = { tout: 0, a_faire: 0, alertes: 0, valides: 0 };

function creerMission(
  id: string,
  statut: StatutMission,
  heurePrevue: string,
  heureDebutReelle: string | null = null
): MissionTourneeVue {
  return {
    id,
    patientId: `p-${id}`,
    patientNom: "Mme Dupont",
    patientAdresse: "12 rue des Lilas",
    patientTelephone: "06 12 34 56 78",
    patientAllergies: null,
    patientConsignes: null,
    patientDateNaissance: "1944-03-12",
    patientForfaitBsi: null,
    distanceKm: null,
    distanceKmCorrigee: null,
    typeSoin: "Pansement",
    heurePrevue,
    statut,
    missionCliniqueId: null,
    dureeEstimeeMin: 25,
    actes: [],
    motifAbsence: null,
    heureDebutReelle,
  };
}

const missions = [
  creerMission("a", "terminee", "08:00:00"),
  creerMission("b", "absent", "10:05:00"),
  creerMission("c", "a_faire", "15:15:00"),
  creerMission("d", "a_faire", "16:00:00"),
  creerMission("e", "a_faire", "18:05:00"),
];

describe("EnTeteTournee", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-30T09:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("affiche le compteur de passages validés sur le total, dans l'anneau", () => {
    render(
      <EnTeteTournee
        missions={missions}
        tournee={tournee}
        contexteTarifaire={TARIFS}
        filtre="tout"
        counts={COUNTS_VIDES}
      />
    );

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("/ 5")).toBeInTheDocument();
  });

  it("affiche le nombre de missions restantes et l'heure de fin estimée", () => {
    render(
      <EnTeteTournee
        missions={missions}
        tournee={tournee}
        contexteTarifaire={TARIFS}
        filtre="tout"
        counts={COUNTS_VIDES}
      />
    );

    expect(screen.getByText("Reste")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/Fin estimée.*18:05/)).toBeInTheDocument();
  });

  it("affiche la stat Km comme non disponible", () => {
    render(
      <EnTeteTournee
        missions={missions}
        tournee={tournee}
        contexteTarifaire={TARIFS}
        filtre="tout"
        counts={COUNTS_VIDES}
      />
    );

    expect(screen.getByText("Km")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("affiche le montant facturable comme pastille Cotation", () => {
    const avecActes = [
      {
        ...creerMission("a", "terminee", "08:00:00"),
        actes: [
          { libelle: "Pansement", code: "AMI 2", cotation: 6.3, lettreCle: "AMI", coefficient: 2, derogatoireBsi: false, eligibleMci: false },
        ],
      },
    ];

    render(
      <EnTeteTournee
        missions={avecActes}
        tournee={tournee}
        contexteTarifaire={TARIFS}
        filtre="tout"
        counts={COUNTS_VIDES}
      />
    );

    expect(screen.getByText("Cotation")).toBeInTheDocument();
    expect(screen.getByText(/6,30/)).toBeInTheDocument();
  });

  it("n'affiche pas la pastille d'heure de fin quand tout est validé", () => {
    const toutesValidees = [creerMission("a", "terminee", "08:00:00"), creerMission("b", "terminee", "10:05:00")];

    render(
      <EnTeteTournee
        missions={toutesValidees}
        tournee={tournee}
        contexteTarifaire={TARIFS}
        filtre="tout"
        counts={COUNTS_VIDES}
      />
    );

    expect(screen.queryByText(/Fin estimée/)).not.toBeInTheDocument();
  });

  it("rend les filtres avec leur comptage", () => {
    const counts: CountsMissions = { tout: 5, a_faire: 3, alertes: 1, valides: 2 };

    render(
      <EnTeteTournee missions={missions} tournee={tournee} contexteTarifaire={TARIFS} filtre="tout" counts={counts} />
    );

    expect(screen.getByRole("link", { name: /Tout/ })).toHaveTextContent("5");
    expect(screen.getByRole("link", { name: /Validés/ })).toHaveTextContent("2");
  });
});

describe("EnTeteTournee — majorations toujours incluses dans le total", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-07T09:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("inclut les majorations dans la pastille Cotation, sans ligne de détail séparée", () => {
    // Un passage à 21 h, un mardi : 6,30 € d'acte, 2,75 € de déplacement et
    // 9,15 € de majoration de nuit, soit 18,20 € facturables — même calcul
    // qu'avant la refonte, seule la ligne « dont X de majorations » disparaît.
    const AVEC_MAJORATIONS: ContexteTarifaire = {
      zone: "metropole",
      valeurs: new Map([
        ["AMI", { lettreCle: "AMI", valeurMetropole: 3.15, valeurDom: 3.3 }],
        ["IFD", { lettreCle: "IFD", valeurMetropole: 2.75, valeurDom: 2.75 }],
        ["MN", { lettreCle: "MN", valeurMetropole: 9.15, valeurDom: 9.15 }],
      ]),
    };
    const mission = {
      ...creerMission("a", "terminee", "21:00:00"),
      actes: [
        { libelle: "Pansement", code: "AMI 2", cotation: 6.3, lettreCle: "AMI", coefficient: 2, derogatoireBsi: false, eligibleMci: false },
      ],
    };

    render(
      <EnTeteTournee
        missions={[mission]}
        tournee={{ ...tournee, date: "2026-07-07" }}
        contexteTarifaire={AVEC_MAJORATIONS}
        filtre="tout"
        counts={COUNTS_VIDES}
      />
    );

    expect(screen.getByText(/18,20/)).toBeInTheDocument();
    expect(screen.queryByText(/de majorations/)).not.toBeInTheDocument();
  });
});

describe("EnTeteTournee — soin en cours et retard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-30T09:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("affiche le nom et l'adresse du soin en cours", () => {
    const avecEnCours = [
      ...missions,
      creerMission("f", "en_cours", "14:20:00", "2026-07-30T12:32:00.000Z"),
    ];

    render(
      <EnTeteTournee
        missions={avecEnCours}
        tournee={tournee}
        contexteTarifaire={TARIFS}
        filtre="tout"
        counts={COUNTS_VIDES}
      />
    );

    expect(screen.getByText("Mme Dupont")).toBeInTheDocument();
    expect(screen.getByText(/12 rue des Lilas/)).toBeInTheDocument();
  });

  it("affiche un badge de retard quand le soin a démarré en retard", () => {
    // Prévu 14:20 Paris, débuté 14:32 Paris (12:32 UTC, été) : 12 min de retard.
    const avecRetard = [creerMission("f", "en_cours", "14:20:00", "2026-07-30T12:32:00.000Z")];

    render(
      <EnTeteTournee
        missions={avecRetard}
        tournee={tournee}
        contexteTarifaire={TARIFS}
        filtre="tout"
        counts={COUNTS_VIDES}
      />
    );

    expect(screen.getByText(/12 min de retard/)).toBeInTheDocument();
  });

  it("n'affiche aucun badge de retard quand le soin a démarré à l'heure", () => {
    const aLHeure = [creerMission("f", "en_cours", "14:20:00", "2026-07-30T12:20:00.000Z")];

    render(
      <EnTeteTournee
        missions={aLHeure}
        tournee={tournee}
        contexteTarifaire={TARIFS}
        filtre="tout"
        counts={COUNTS_VIDES}
      />
    );

    expect(screen.queryByText(/retard/)).not.toBeInTheDocument();
  });

  it("affiche un message de repli quand rien n'est en cours mais qu'il reste des soins", () => {
    render(
      <EnTeteTournee
        missions={missions}
        tournee={tournee}
        contexteTarifaire={TARIFS}
        filtre="tout"
        counts={COUNTS_VIDES}
      />
    );

    expect(screen.getByText(/restant.*aucun en cours/)).toBeInTheDocument();
  });

  it("affiche un message de repli quand tout est validé", () => {
    const toutesValidees = [creerMission("a", "terminee", "08:00:00")];

    render(
      <EnTeteTournee
        missions={toutesValidees}
        tournee={tournee}
        contexteTarifaire={TARIFS}
        filtre="tout"
        counts={COUNTS_VIDES}
      />
    );

    expect(screen.getByText("Tous les soins du jour sont validés")).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx vitest run components/ui/EnTeteTournee.test.tsx`
Expected: FAIL — le composant n'a pas encore les nouvelles props/le nouveau rendu

- [ ] **Step 5: Rewrite `EnTeteTournee.tsx`**

Remplacer tout le fichier :

```typescript
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
import { formaterNomPropre } from "@/lib/format";
import { OngletsFiltresTournee } from "@/components/ui/OngletsFiltresTournee";

const CIRCONFERENCE = 2 * Math.PI * 33;

export function EnTeteTournee({
  missions,
  tournee,
  contexteTarifaire,
  filtre,
  counts,
}: {
  missions: MissionTourneeVue[];
  tournee: Tournee;
  contexteTarifaire: ContexteTarifaire;
  filtre: Filtre;
  counts: CountsMissions;
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

  const enCours = missions.find((m) => m.statut === "en_cours") ?? null;
  const retard = enCours ? calculerRetardMinutes(enCours) : null;

  const nowName = enCours ? formaterNomPropre(enCours.patientNom) : "Tournée à jour";
  const nowSub = enCours
    ? `En cours depuis ${enCours.heureDebutReelle ? formatHeureDepuisTimestamp(enCours.heureDebutReelle) : formatHeure(enCours.heurePrevue)} · ${enCours.patientAdresse}`
    : restants > 0
      ? `${restants} soin${restants > 1 ? "s" : ""} restant${restants > 1 ? "s" : ""} · aucun en cours`
      : "Tous les soins du jour sont validés";

  return (
    <div className="relative overflow-hidden bg-[linear-gradient(168deg,#221b33_0%,#2c1f47_58%,#3a2260_100%)] px-5 pb-4 pt-8 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-12 -top-20 h-[260px] w-[260px] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,.4),transparent_68%)]"
      />
      <div className="relative mx-auto max-w-2xl">
        <div className="flex items-center gap-3.5">
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
            <p className="font-display text-[17px] font-bold tabular-nums">—</p>
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

Remarque : `calculerMajorationsTournee`/`calculerMontantTournee` restent utilisées (le total « Cotation » reste le même calcul qu'avant, juste réaffiché en pastille) ; le détail séparé des majorations n'est plus affiché dans l'en-tête (il reste visible par mission dans chaque carte).

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run components/ui/EnTeteTournee.test.tsx components/ui/OngletsFiltresTournee.test.tsx`
Expected: PASS

- [ ] **Step 7: Wire `filtre`/`counts` into `EnTeteTournee` from the page, and stop rendering `OngletsFiltresTournee` separately**

Dans `app/(app)/ma-tournee/page.tsx`, retirer l'import de `OngletsFiltresTournee` (ligne 14) et son rendu séparé (ligne 57), puis passer `filtre`/`counts` à `EnTeteTournee` :

Avant :

```typescript
          <EnTeteTournee missions={missions} tournee={tournee} contexteTarifaire={contexteTarifaire} />
          <OngletsFiltresTournee filtre={filtre} counts={counts} />
```

Après :

```typescript
          <EnTeteTournee
            missions={missions}
            tournee={tournee}
            contexteTarifaire={contexteTarifaire}
            filtre={filtre}
            counts={counts}
          />
```

Et retirer la ligne d'import `import { OngletsFiltresTournee } from "@/components/ui/OngletsFiltresTournee";`.

- [ ] **Step 8: Run the full suite and the build**

Run: `npx vitest run`
Expected: PASS

Run: `npx next build`
Expected: build réussi

- [ ] **Step 9: Commit**

```bash
git add components/ui/OngletsFiltresTournee.tsx components/ui/EnTeteTournee.tsx components/ui/EnTeteTournee.test.tsx "app/(app)/ma-tournee/page.tsx"
git commit -m "feat(ma-tournee): en-tete violet avec anneau de progression et filtres en pilules"
```

---

### Task 4: Cartes de mission — refonte visuelle et bouton « Suivant »

**Files:**
- Modify: `components/ui/CarteMissionTournee.tsx`
- Modify: `components/ui/CarteMissionTournee.test.tsx`
- Modify: `lib/tournee-vue.ts`
- Modify: `lib/tournee-vue.test.ts`
- Modify: `app/(app)/ma-tournee/page.tsx`

**Interfaces:**
- Consumes: rien de nouveau côté données — restylage pur + un nouvel `id` DOM sur la carte pour le défilement du bouton « Suivant ».

- [ ] **Step 1: Remove `getCouleurAvatar` and `PALETTE_AVATAR` (dead code after this task)**

Dans `lib/tournee-vue.ts`, supprimer le bloc `PALETTE_AVATAR` et la fonction `getCouleurAvatar` (lignes 38-52 dans la version actuelle du fichier).

Dans `lib/tournee-vue.test.ts`, supprimer le `describe("getCouleurAvatar", ...)` correspondant, et retirer `getCouleurAvatar` de l'import en tête de fichier.

- [ ] **Step 2: Run tests to verify the removal doesn't break anything yet**

Run: `npx vitest run lib/tournee-vue.test.ts`
Expected: PASS (les tests de `getCouleurAvatar` ont été retirés, pas seulement désactivés)

`CarteMissionTournee.tsx` importe encore `getCouleurAvatar` à ce stade — normal, corrigé à l'étape suivante dans le même commit logique (ne pas commiter entre ces deux étapes).

- [ ] **Step 3: Update `CarteMissionTournee.test.tsx`**

Ajouter `heureDebutReelle: null` à `creerMission` (`components/ui/CarteMissionTournee.test.tsx:12-34`) :

```typescript
function creerMission(surcharge: Partial<MissionTourneeVue> = {}): MissionTourneeVue {
  return {
    id: "m1",
    patientId: "p1",
    patientNom: "Mme Dupont",
    patientAdresse: "12 rue des Lilas",
    patientTelephone: "06 12 34 56 78",
    patientAllergies: null,
    patientConsignes: null,
    patientDateNaissance: "1944-03-12",
    patientForfaitBsi: null,
    distanceKm: null,
    distanceKmCorrigee: null,
    typeSoin: "Pansement",
    heurePrevue: "08:00:00",
    statut: "a_faire",
    missionCliniqueId: null,
    dureeEstimeeMin: 25,
    actes: [],
    motifAbsence: null,
    heureDebutReelle: null,
    ...surcharge,
  };
}
```

Corriger le test qui vérifie les classes du pied de carte (« affiche les consignes en pied de carte », lignes 65-82) — les classes exactes changent avec le restylage :

```typescript
  it("affiche les consignes en pied de carte, séparées des alertes", () => {
    render(
      <CarteMissionTournee
        mission={creerMission({ patientConsignes: "3e étage sans ascenseur" })}
        estDerniere={false}
        dateTournee="2026-07-07"
        contexteTarifaire={TARIFS}
      />
    );

    const consignes = screen.getByText("3e étage sans ascenseur");
    expect(consignes).toBeInTheDocument();
    // Le pied est un encart clair, pas un encart coloré d'alerte.
    expect(consignes.className).toContain("text-[#6e6880]");
    // Le pictogramme SVG d'alerte n'apparaît que dans l'encart d'allergie.
    expect(screen.queryByText("⚠️")).not.toBeInTheDocument();
  });
```

Ajouter, à la fin du fichier, un nouveau `describe` pour l'ancrage de défilement :

```typescript
describe("CarteMissionTournee — ancrage de défilement", () => {
  it("porte un id dérivé de l'identifiant de la mission", () => {
    const { container } = render(
      <CarteMissionTournee mission={creerMission({ id: "abc123" })} estDerniere={false}
        dateTournee="2026-07-07"
        contexteTarifaire={TARIFS} />
    );

    expect(container.querySelector("#stop-abc123")).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx vitest run components/ui/CarteMissionTournee.test.tsx`
Expected: FAIL — `#stop-abc123` absent, classe `text-[#6e6880]` absente (composant pas encore modifié)

- [ ] **Step 5: Rewrite `CarteMissionTournee.tsx`**

Remplacer tout le fichier :

```typescript
import { FormulaireAvecRetour } from "@/components/ui/FormulaireAvecRetour";
import Link from "next/link";
import { IconeSoin } from "@/components/ui/IconeSoin";
import type { MissionTourneeVue } from "@/lib/data/ma-journee";
import { updateMissionStatutAction, updateMotifAbsenceAction } from "@/lib/data/ma-journee-actions";
import { formaterNomPropre } from "@/lib/format";
import { calculerDetailPassage } from "@/lib/facturation";
import { formaterEuros, type ContexteTarifaire } from "@/lib/cotation";
import { hrefWaze } from "@/lib/waze";
import { STATUT_LABEL, calculerAge, formatHeure, getInitiales } from "@/lib/tournee-vue";

const CLASSES_CHIP =
  "inline-flex items-center gap-1.5 rounded-[8px] bg-[#faf9fc] border border-[#ece8f2] px-2.5 py-1 text-[12px] font-medium text-[#3b3648]";

const STATUT_BADGE_VIOLET: Record<MissionTourneeVue["statut"], string> = {
  a_faire: "text-[#8d8798] bg-[rgba(141,135,152,.1)]",
  en_cours: "text-[#6d28d9] bg-[rgba(109,40,217,.11)] font-bold",
  terminee: "text-[#1a7f5a] bg-[rgba(26,127,90,.11)] font-semibold",
  absent: "text-[#c2410c] bg-[rgba(194,65,12,.11)] font-semibold",
};

interface CarteMissionTourneeProps {
  mission: MissionTourneeVue;
  contexteHref?: string;
  estDerniere: boolean;
  /** Date de la tournée, dont dépendent les majorations dimanche et fériés. */
  dateTournee: string;
  contexteTarifaire: ContexteTarifaire;
}

export function CarteMissionTournee({
  mission,
  contexteHref,
  estDerniere,
  dateTournee,
  contexteTarifaire,
}: CarteMissionTourneeProps) {
  const detail = calculerDetailPassage(mission, dateTournee, contexteTarifaire);
  const age = calculerAge(mission.patientDateNaissance);
  const initiales = getInitiales(mission.patientNom);
  const heure = formatHeure(mission.heurePrevue);
  const enCours = mission.statut === "en_cours";
  const aFaire = mission.statut === "a_faire";
  const terminee = mission.statut === "terminee";
  const absent = mission.statut === "absent";
  const nomFormate = formaterNomPropre(mission.patientNom);
  const wazeUrl = hrefWaze({ latitude: null, longitude: null, adresse: mission.patientAdresse });
  const telUrl = `tel:${mission.patientTelephone.replace(/\s/g, "")}`;

  return (
    <div id={`stop-${mission.id}`} className="flex gap-2.5">
      {/* Colonne timeline */}
      <div className="relative flex w-[46px] shrink-0 flex-col items-end pt-4 text-right">
        <span className={`text-[14px] font-bold tabular-nums ${enCours ? "text-[#6d28d9]" : terminee || absent ? "text-[#a099b3]" : "text-[#3b3648]"}`}>
          {heure}
        </span>
        {mission.dureeEstimeeMin > 0 && (
          <span className="mt-0.5 text-[10px] font-bold tabular-nums text-[#a099b3]">{mission.dureeEstimeeMin} min</span>
        )}
        {!estDerniere && (
          <span
            aria-hidden="true"
            className={`mt-2 min-h-4 w-[2px] flex-1 rounded-full ${terminee || absent ? "bg-[#e0dbe8]" : "bg-[rgba(109,40,217,.2)]"}`}
          />
        )}
      </div>

      {/* Carte blanche */}
      <div
        className={`mb-3 flex-1 overflow-hidden rounded-[20px] border bg-white ${
          enCours ? "border-[1.5px] border-[#6d28d9]" : "border-[#e6e2db]"
        } ${terminee || absent ? "opacity-70" : ""}`}
      >
        <div className="flex items-start gap-2.5 px-4 py-3.5">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] text-[14px] font-bold ${
              enCours ? "bg-[linear-gradient(140deg,#a855f7,#6d28d9)] text-white" : "bg-[rgba(109,40,217,.1)] text-[#6d28d9]"
            }`}
            aria-hidden="true"
          >
            {initiales}
          </div>

          <div className="min-w-0 flex-1">
            <Link href={`/ma-journee/${mission.id}`} className="flex items-baseline gap-1.5 hover:opacity-75">
              <span className="text-[15px] font-bold tracking-tight text-[#1d1d1f]">{nomFormate}</span>
              {age !== null && <span className="text-[11px] font-bold text-[#a099b3]">{age} a</span>}
            </Link>
            {mission.patientAdresse && (
              <p className="mt-0.5 truncate text-[11.5px] text-[#8d8798]">{mission.patientAdresse}</p>
            )}
          </div>

          <span className={`shrink-0 rounded-[8px] px-2.5 py-1 text-[10.5px] ${STATUT_BADGE_VIOLET[mission.statut]}`}>
            {STATUT_LABEL[mission.statut]}
          </span>
        </div>

        <div className="border-t border-[#ece8f2] px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            {mission.actes.length > 0 ? (
              mission.actes.map((acte, index) => (
                <span key={`${acte.libelle}-${index}`} className={CLASSES_CHIP}>
                  {acte.code ? (
                    <span className="font-bold text-[#3b3648]">{acte.code}</span>
                  ) : (
                    <IconeSoin typeSoin={acte.libelle} className="h-3.5 w-3.5 text-[#6d28d9]" />
                  )}
                  {acte.libelle}
                </span>
              ))
            ) : (
              <span className={CLASSES_CHIP}>
                <IconeSoin typeSoin={mission.typeSoin} className="h-3.5 w-3.5 text-[#6d28d9]" />
                {mission.typeSoin}
              </span>
            )}
          </div>

          {detail.total > 0 && (
            <p className="mt-2.5 text-right text-[12px] text-[#8d8798]">
              {detail.majorations.total > 0 && (
                <span>dont {formaterEuros(detail.majorations.total)} de majorations · </span>
              )}
              <span className="font-bold tabular-nums text-[#3b3648]">{formaterEuros(detail.total)}</span>
            </p>
          )}

          {mission.patientAllergies && (
            <div className="mt-2.5 flex items-start gap-2 rounded-[12px] bg-[rgba(214,64,44,.09)] px-3 py-2">
              <svg width="13" height="13" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" className="mt-0.5 shrink-0" style={{ stroke: "#d6402c", fill: "none" }} aria-hidden="true">
                <path d="M12 3 2.5 20h19L12 3Z" />
                <path d="M12 9.5v4.5" />
                <path d="M12 17h.01" />
              </svg>
              <p className="text-[12.5px] font-medium text-[#a4271b]">{mission.patientAllergies}</p>
            </div>
          )}

          {contexteHref && (
            <Link href={contexteHref} className="mt-2 inline-flex text-[12.5px] font-semibold text-[#6d28d9] hover:underline">
              Voir contexte clinique →
            </Link>
          )}
        </div>

        {(aFaire || enCours) && (
          <div className="border-t border-[#ece8f2] px-4 py-3">
            {enCours ? (
              <div className="flex gap-2">
                <a
                  href={wazeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[13px] border border-[#e4e0ea] bg-[#faf9fc] py-2.5 text-[13px] font-semibold text-[#3b3648]"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <polygon points="3 11 22 2 13 21 11 13 3 11" />
                  </svg>
                  GPS
                </a>
                <a
                  href={telUrl}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[13px] border border-[#e4e0ea] bg-[#faf9fc] py-2.5 text-[13px] font-semibold text-[#3b3648]"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92Z" />
                  </svg>
                  Appeler
                </a>
                <FormulaireAvecRetour action={updateMissionStatutAction} messageSucces="Passage mis à jour." className="flex-1">
                  <input type="hidden" name="missionId" value={mission.id} />
                  <input type="hidden" name="nouveauStatut" value="terminee" />
                  <button
                    type="submit"
                    className="w-full rounded-[13px] bg-[linear-gradient(135deg,#6d28d9,#a855f7)] py-2.5 text-[13px] font-bold text-white shadow-[0_8px_20px_-8px_rgba(109,40,217,.8)]"
                  >
                    ✓ Valider
                  </button>
                </FormulaireAvecRetour>
              </div>
            ) : (
              <div className="flex gap-2">
                <FormulaireAvecRetour action={updateMissionStatutAction} messageSucces="Passage mis à jour." className="flex-1">
                  <input type="hidden" name="missionId" value={mission.id} />
                  <input type="hidden" name="nouveauStatut" value="en_cours" />
                  <button
                    type="submit"
                    className="w-full rounded-[13px] border border-[rgba(109,40,217,.28)] bg-[rgba(109,40,217,.07)] py-2.5 text-[13px] font-bold text-[#6d28d9]"
                  >
                    Valider le soin
                  </button>
                </FormulaireAvecRetour>
                <FormulaireAvecRetour action={updateMissionStatutAction} messageSucces="Passage mis à jour.">
                  <input type="hidden" name="missionId" value={mission.id} />
                  <input type="hidden" name="nouveauStatut" value="absent" />
                  <button
                    type="submit"
                    className="rounded-[13px] border border-[#e4e0ea] bg-[#faf9fc] px-4 py-2.5 text-[13px] font-semibold text-[#8d8798]"
                  >
                    Absent
                  </button>
                </FormulaireAvecRetour>
              </div>
            )}
          </div>
        )}

        {terminee && (
          <div className="border-t border-[#ece8f2] px-4 py-3">
            <FormulaireAvecRetour action={updateMissionStatutAction} messageSucces="Passage mis à jour.">
              <input type="hidden" name="missionId" value={mission.id} />
              <input type="hidden" name="nouveauStatut" value="a_faire" />
              <button
                type="submit"
                className="rounded-[13px] border border-[#e4e0ea] bg-[#faf9fc] px-4 py-2.5 text-[13px] font-semibold text-[#8d8798]"
              >
                Annuler la validation
              </button>
            </FormulaireAvecRetour>
          </div>
        )}

        {absent && (
          <div className="border-t border-[#ece8f2] px-4 py-3">
            {mission.motifAbsence && (
              <div className="mb-2.5 flex items-start gap-2 rounded-[12px] bg-amber-50 px-3 py-2">
                <span className="mt-px shrink-0 text-[13px]" aria-hidden="true">
                  ⚠️
                </span>
                <p className="text-[12.5px] font-medium text-amber-700">{mission.motifAbsence}</p>
              </div>
            )}

            <FormulaireAvecRetour action={updateMotifAbsenceAction} messageSucces="Motif enregistré." className="flex min-w-0 gap-2">
              <input type="hidden" name="missionId" value={mission.id} />
              <label className="sr-only" htmlFor={`motif-${mission.id}`}>
                Motif de l&apos;absence de {nomFormate}
              </label>
              <input
                id={`motif-${mission.id}`}
                name="motif"
                type="text"
                defaultValue={mission.motifAbsence ?? ""}
                placeholder="Motif (facultatif)"
                maxLength={120}
                className="min-w-0 flex-1 rounded-[13px] border border-[#e4e0ea] px-3 py-2 text-[13px] text-[#1d1d1f] placeholder:text-[#a099b3]"
              />
              <button
                type="submit"
                className="shrink-0 rounded-[13px] border border-[#e4e0ea] bg-[#faf9fc] px-3 py-2 text-[13px] font-semibold text-[#8d8798]"
              >
                Enregistrer
              </button>
            </FormulaireAvecRetour>

            <FormulaireAvecRetour action={updateMissionStatutAction} messageSucces="Passage mis à jour." className="mt-2">
              <input type="hidden" name="missionId" value={mission.id} />
              <input type="hidden" name="nouveauStatut" value="a_faire" />
              <button
                type="submit"
                className="rounded-[13px] border border-[#e4e0ea] bg-[#faf9fc] px-4 py-2.5 text-[13px] font-semibold text-[#8d8798]"
              >
                Annuler l&apos;absence
              </button>
            </FormulaireAvecRetour>
          </div>
        )}

        {mission.patientConsignes && (
          <div className="border-t border-dashed border-[#e6e2db] px-4 py-2.5">
            <p className="text-[12.5px] leading-relaxed text-[#6e6880]">{mission.patientConsignes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run components/ui/CarteMissionTournee.test.tsx`
Expected: PASS

- [ ] **Step 7: Add the floating "Suivant" button to the page**

Dans `app/(app)/ma-tournee/page.tsx`, ajouter les imports nécessaires et le bouton flottant. Ajouter aux imports existants :

```typescript
import { formatHeure } from "@/lib/tournee-vue";
import { formaterNomPropre } from "@/lib/format";
```

Après le calcul de `missionsFiltrees` (ligne actuelle `const missionsFiltrees = filtrerMissions(missions, filtre);`), ajouter :

```typescript
  const prochaine = missions.find((m) => m.statut === "a_faire") ?? null;
```

Dans le rendu, juste avant la fermeture de la balise `</>` qui englobe l'en-tête et la liste (après le `<div className="mx-auto max-w-2xl px-4 pt-4 pb-8">...</div>` existant), ajouter le bouton flottant :

```typescript
          {prochaine && (
            <div className="sticky bottom-4 z-10 mx-auto max-w-2xl px-4">
              <a
                href={`#stop-${prochaine.id}`}
                className="flex min-h-[50px] items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,#6d28d9,#a855f7)] px-4 text-[15px] font-bold text-white shadow-[0_12px_28px_-10px_rgba(109,40,217,.7)]"
              >
                <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m3 11 19-8-8 19-2.5-8.5L3 11Z" />
                </svg>
                Suivant — {formaterNomPropre(prochaine.patientNom)} · {formatHeure(prochaine.heurePrevue)}
              </a>
            </div>
          )}
```

Remarque : le bouton « Suivant » n'a pas de test dédié — aucune page de ce dépôt n'a de fichier `page.test.tsx` (convention établie, vérifiée sur l'ensemble du projet), et sa logique est un simple `missions.find(...)`. Le comportement de recherche du premier `a_faire` est de toute façon exercé indirectement par `missions_du_jour`/`filtrerMissions`, déjà couverts ailleurs.

- [ ] **Step 8: Run the full suite and the build**

Run: `npx vitest run`
Expected: PASS

Run: `npx tsc --noEmit`
Expected: aucune erreur (le champ `heureDebutReelle` manquant dans les fixtures de test, seul point resté en échec depuis Task 1 Step 9, est maintenant corrigé partout)

Run: `npx next build`
Expected: build réussi

- [ ] **Step 9: Commit**

```bash
git add components/ui/CarteMissionTournee.tsx components/ui/CarteMissionTournee.test.tsx lib/tournee-vue.ts lib/tournee-vue.test.ts "app/(app)/ma-tournee/page.tsx"
git commit -m "feat(ma-tournee): refonte des cartes de mission et bouton flottant Suivant"
```

---

## Exécution

Après la Task 4, exécuter la suite complète (`npx vitest run`) et `npx next build` une dernière fois avant la revue finale de branche. Rappeler au contrôleur, à ce moment, la note opérationnelle de la Task 1 Step 2 : appliquer la migration `20260807000000_heure_debut_reelle.sql` en production avant de fusionner/pousser le code, pour éviter la course au déploiement (même risque que pour `materiel_ngap`, 2026-08-06).
