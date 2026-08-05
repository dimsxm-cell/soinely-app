# Tenir la promesse marketing (réorganisation de tournée) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer deux fonctionnalités réelles (navigation Waze par visite, réorganisation manuelle de l'ordre des visites restantes) et réaligner le discours marketing sur ce qui existe vraiment.

**Architecture:** Un nouveau champ `ordre_visite` sur `missions_du_jour` porte un ordre de passage suggéré, distinct de l'heure prescrite. Un algorithme de plus-proche-voisin glouton (dans `lib/data/generation-tournee.ts`) calcule cet ordre à partir d'un point de départ ; une nouvelle Server Action (`lib/data/reorganisation-tournee.ts`) l'orchestre et l'écrit. Un lien Waze par visite s'appuie sur les coordonnées déjà géocodées des patients. Cinq fichiers marketing sont réécrits pour décrire fidèlement ces deux fonctionnalités.

**Tech Stack:** Next.js App Router (Server Components + Server Actions), TypeScript, Supabase (Postgres), Tailwind, Vitest + Testing Library.

## Global Constraints

- Aucune API de trafic tierce, aucun suivi GPS continu (spec : Alternatives écartées).
- `heure_prevue` n'est jamais réécrite par la réorganisation — seul le nouveau champ `ordre_visite` porte le nouvel ordre.
- Le point de départ du calcul est la dernière visite `en_cours`/`terminee` (jamais la position GPS actuelle).
- Le tri par défaut (aucune réorganisation encore faite) doit rester identique à l'existant : tri par `heure_prevue`.
- Les patients non géocodés ne font jamais échouer toute la réorganisation.
- Portée volontairement restreinte à `/ma-journee` (`getMissionsDuJour`) : `/ma-tournee` (`getMissionsTourneeVue`) est une vue de facturation avec ses propres filtres, pas la chronologie suivie en temps réel — son tri n'est pas touché par ce plan. `getProchaineMission` (l'indication "prochaine mission" après une validation) reste également sur `heure_prevue` seul, pour la même raison de portée. Ce sont des déviations volontaires par rapport au libellé littéral de la section Architecture de la spec, retenues pour rester proportionnées au chantier — voir la note remise à l'utilisateur à la fin de ce plan.

---

### Task 1: Schéma, types et tri par ordre de visite

**Files:**
- Create: `supabase/migrations/20260805000000_ordre_visite.sql`
- Modify: `lib/types/database.types.ts:211-256` (bloc `missions_du_jour`)
- Modify: `lib/types/clinical.ts:81-89` (`MissionDuJour`)
- Modify: `lib/data/ma-journee.ts:105-134` (`getMissionsDuJour`)
- Test: `lib/data/ma-journee.test.ts:131-225` (tests existants de `getMissionsDuJour`, à adapter)

**Interfaces:**
- Produces: `MissionDuJour.ordreVisite?: number | null` — consommé par Task 4 (`CarteMission`).
- Produces: `getMissionsDuJour` trie par `ordre_visite` (nulls en premier) puis `heure_prevue` — comportement dont dépend Task 4 pour l'affichage.

- [ ] **Step 1: Écrire la migration**

```sql
-- Ordre de passage suggéré par la réorganisation manuelle de tournée.
--
-- Distinct de heure_prevue, qui reste l'horaire prescrit du soin et peut
-- porter une contrainte médicale (ex. horaire d'injection) — un algorithme
-- de proximité n'a pas à le modifier.

alter table public.missions_du_jour
  add column if not exists ordre_visite integer;

comment on column public.missions_du_jour.ordre_visite is
  'Ordre de passage suggéré par la réorganisation manuelle. Nul tant qu''aucune réorganisation n''a eu lieu — l''affichage se rabat alors sur heure_prevue. Ne remplace jamais heure_prevue, qui reste l''horaire prescrit du soin.';
```

- [ ] **Step 2: Mettre à jour les types Supabase générés**

Dans `lib/types/database.types.ts`, bloc `missions_du_jour` (lignes 211-256) :

Avant (`Row`, ligne 212-226) :
```ts
      missions_du_jour: {
        Row: {
          heure_prevue: string
          id: string
          distance_km: number | null
          distance_km_corrigee: number | null
          mission_clinique_id: string | null
          motif_absence: string | null
          patient_id: string
          photo_path: string | null
          rappel: string | null
          statut: string
          tournee_id: string
          transmission: string | null
          type_soin: string
        }
```

Après :
```ts
      missions_du_jour: {
        Row: {
          heure_prevue: string
          id: string
          distance_km: number | null
          distance_km_corrigee: number | null
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
```

Même ajout (`ordre_visite: number | null` juste après `motif_absence?: string | null`, avant `patient_id`) dans les blocs `Insert` (lignes 227-241) et `Update` (lignes 242-256) — dans ces deux blocs la ligne s'écrit `ordre_visite?: number | null` (optionnel, comme `distance_km?` et `motif_absence?` juste au-dessus).

- [ ] **Step 3: Ajouter le champ au type métier**

Dans `lib/types/clinical.ts:81-89` :

Avant :
```ts
export interface MissionDuJour {
  id: string;
  patientId: string;
  patientNom: string;
  typeSoin: string;
  heurePrevue: string;
  statut: StatutMission;
  missionCliniqueId: string | null;
}
```

Après :
```ts
export interface MissionDuJour {
  id: string;
  patientId: string;
  patientNom: string;
  typeSoin: string;
  heurePrevue: string;
  statut: StatutMission;
  missionCliniqueId: string | null;
  /**
   * Ordre de passage suggéré par la réorganisation manuelle, ou `null` tant
   * qu'aucune réorganisation n'a eu lieu. Optionnel côté type pour ne pas
   * casser les objets `MissionDuJour` déjà construits ailleurs (tests
   * notamment) — toujours renseigné en pratique par `getMissionsDuJour`.
   */
  ordreVisite?: number | null;
}
```

- [ ] **Step 4: Écrire les tests du nouveau tri (échouent pour l'instant)**

Dans `lib/data/ma-journee.test.ts`, le describe `getMissionsDuJour` (lignes 131-189 et 191-225 dans le fichier actuel) doit être adapté : la requête enchaîne désormais deux `.order()` (`ordre_visite` puis `heure_prevue`), et chaque ligne mockée porte `ordre_visite`.

Remplacer entièrement le premier test (lignes 132-189) :

```ts
  it("mappe les colonnes snake_case Supabase vers MissionDuJour, avec le nom du patient joint, triées par ordre de visite puis par heure", async () => {
    const orderHeureMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: "m1",
          patient_id: "p1",
          type_soin: "Pansement",
          heure_prevue: "08:30:00",
          statut: "a_faire",
          mission_clinique_id: null,
          ordre_visite: null,
          patients: { nom_complet: "Mme Dupont" },
        },
        {
          id: "m2",
          patient_id: "p2",
          type_soin: "Injection",
          heure_prevue: "09:15:00",
          statut: "terminee",
          mission_clinique_id: "mc1",
          ordre_visite: null,
          patients: { nom_complet: "M. Martin" },
        },
      ],
      error: null,
    });
    const orderOrdreVisiteMock = vi.fn(() => ({ order: orderHeureMock }));

    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: orderOrdreVisiteMock,
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getMissionsDuJour } = await import("./ma-journee");
    const missions = await getMissionsDuJour(fakeClient, "t1");

    expect(orderOrdreVisiteMock).toHaveBeenCalledWith("ordre_visite", { nullsFirst: true });
    expect(orderHeureMock).toHaveBeenCalledWith("heure_prevue");
    expect(missions).toEqual([
      {
        id: "m1",
        patientId: "p1",
        patientNom: "Mme Dupont",
        typeSoin: "Pansement",
        heurePrevue: "08:30:00",
        statut: "a_faire",
        missionCliniqueId: null,
        ordreVisite: null,
      },
      {
        id: "m2",
        patientId: "p2",
        patientNom: "M. Martin",
        typeSoin: "Injection",
        heurePrevue: "09:15:00",
        statut: "terminee",
        missionCliniqueId: "mc1",
        ordreVisite: null,
      },
    ]);
  });

  it("porte l'ordre de visite quand une réorganisation a eu lieu", async () => {
    const orderHeureMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: "m1",
          patient_id: "p1",
          type_soin: "Pansement",
          heure_prevue: "08:30:00",
          statut: "a_faire",
          mission_clinique_id: null,
          ordre_visite: 2,
          patients: { nom_complet: "Mme Dupont" },
        },
      ],
      error: null,
    });

    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({ order: orderHeureMock }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getMissionsDuJour } = await import("./ma-journee");
    const missions = await getMissionsDuJour(fakeClient, "t1");

    expect(missions[0].ordreVisite).toBe(2);
  });
```

Remplacer entièrement le second test (lignes 191-225, "gère un embed patients renvoyé sous forme de tableau") :

```ts
  it("gère un embed patients renvoyé sous forme de tableau", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
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
                      ordre_visite: null,
                      patients: [{ nom_complet: "Mme Bernard" }],
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

    expect(missions).toEqual([
      {
        id: "m3",
        patientId: "p3",
        patientNom: "Mme Bernard",
        typeSoin: "Glycémie",
        heurePrevue: "10:00:00",
        statut: "a_faire",
        missionCliniqueId: null,
        ordreVisite: null,
      },
    ]);
  });
```

- [ ] **Step 5: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run lib/data/ma-journee.test.ts`
Expected: FAIL — `getMissionsDuJour` n'a encore qu'un seul `.order()`, et ne lit/mappe pas `ordre_visite`.

- [ ] **Step 6: Mettre à jour `getMissionsDuJour`**

Dans `lib/data/ma-journee.ts:105-134` :

Avant :
```ts
export async function getMissionsDuJour(
  supabase: SupabaseClient<Database>,
  tourneeId: string
): Promise<MissionDuJour[]> {
  const { data, error } = await supabase
    .from("missions_du_jour")
    .select("id, patient_id, type_soin, heure_prevue, statut, mission_clinique_id, patients(nom_complet)")
    .eq("tournee_id", tourneeId)
    .order("heure_prevue");

  if (error) echouer("getMissionsDuJour", error);
  if (!data) return [];

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
```

Après :
```ts
export async function getMissionsDuJour(
  supabase: SupabaseClient<Database>,
  tourneeId: string
): Promise<MissionDuJour[]> {
  const { data, error } = await supabase
    .from("missions_du_jour")
    .select(
      "id, patient_id, type_soin, heure_prevue, statut, mission_clinique_id, ordre_visite, patients(nom_complet)"
    )
    .eq("tournee_id", tourneeId)
    // Les missions jamais réorganisées (ordre_visite nul) passent en premier,
    // triées entre elles par heure_prevue — comportement identique à
    // aujourd'hui tant qu'aucune ligne n'a de ordre_visite. Une fois la
    // tournée réorganisée, les missions déjà faites (statut non touché par
    // la réorganisation, donc toujours à ordre_visite nul) restent avant les
    // visites à venir fraîchement numérotées.
    .order("ordre_visite", { nullsFirst: true })
    .order("heure_prevue");

  if (error) echouer("getMissionsDuJour", error);
  if (!data) return [];

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
      ordreVisite: row.ordre_visite,
    };
  });
}
```

- [ ] **Step 7: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run lib/data/ma-journee.test.ts`
Expected: PASS

- [ ] **Step 8: Typecheck et lint**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: aucune nouvelle erreur

Run: `npx eslint lib/types/clinical.ts lib/data/ma-journee.ts lib/data/ma-journee.test.ts`
Expected: aucune erreur

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/20260805000000_ordre_visite.sql lib/types/database.types.ts lib/types/clinical.ts lib/data/ma-journee.ts lib/data/ma-journee.test.ts
git commit -m "feat(tournee): ajoute ordre_visite, trie les missions du jour en consequence"
```

---

### Task 2: Algorithme de calcul de l'ordre de visite

**Files:**
- Modify: `lib/data/generation-tournee.ts` (ajout d'une fonction, aucune ligne existante retirée)
- Test: `lib/data/generation-tournee.test.ts`

**Interfaces:**
- Consumes: `calculerDistanceRoutiereKm` (`@/lib/distance`), `Coordonnees` (`@/lib/geocodage`).
- Produces: `export interface VisiteAPositionner { missionId: string; latitude: number | null; longitude: number | null }` et `export async function calculerOrdreVisites(origine: Coordonnees, visites: VisiteAPositionner[]): Promise<string[]>` — consommés par Task 3.

- [ ] **Step 1: Écrire les tests (échouent pour l'instant)**

Ajouter à la fin de `lib/data/generation-tournee.test.ts` :

```ts
import { calculerOrdreVisites } from "./generation-tournee";

describe("calculerOrdreVisites", () => {
  // Points alignés sur une même longitude, à distance croissante de
  // l'origine : l'ordre plus-proche-voisin attendu est donc non ambigu
  // (A, puis B, puis C), y compris à chaque étape intermédiaire.
  const ORIGINE = { latitude: 48.80, longitude: 2.30 };
  const A = { latitude: 48.82, longitude: 2.30 };
  const B = { latitude: 48.90, longitude: 2.30 };
  const C = { latitude: 49.10, longitude: 2.30 };

  beforeEach(() => {
    // Force le repli local (Haversine), sans appel réseau : déterministe,
    // même pattern que lib/distance.test.ts.
    vi.stubEnv("OPENROUTESERVICE_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("ordonne les visites géocodées du plus proche au plus lointain de l'origine", async () => {
    const ordre = await calculerOrdreVisites(ORIGINE, [
      { missionId: "loin", latitude: C.latitude, longitude: C.longitude },
      { missionId: "proche", latitude: A.latitude, longitude: A.longitude },
      { missionId: "moyen", latitude: B.latitude, longitude: B.longitude },
    ]);

    expect(ordre).toEqual(["proche", "moyen", "loin"]);
  });

  it("place les visites non géocodées à la fin, dans leur ordre d'origine", async () => {
    const ordre = await calculerOrdreVisites(ORIGINE, [
      { missionId: "sans-coords-1", latitude: null, longitude: null },
      { missionId: "proche", latitude: A.latitude, longitude: A.longitude },
      { missionId: "sans-coords-2", latitude: null, longitude: A.longitude },
    ]);

    expect(ordre).toEqual(["proche", "sans-coords-1", "sans-coords-2"]);
  });

  it("rend une liste vide quand il n'y a aucune visite", async () => {
    expect(await calculerOrdreVisites(ORIGINE, [])).toEqual([]);
  });

  it("rend l'unique visite quand il n'y en a qu'une", async () => {
    const ordre = await calculerOrdreVisites(ORIGINE, [
      { missionId: "seule", latitude: A.latitude, longitude: A.longitude },
    ]);
    expect(ordre).toEqual(["seule"]);
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run lib/data/generation-tournee.test.ts`
Expected: FAIL avec « calculerOrdreVisites is not a function » (ou équivalent)

- [ ] **Step 3: Implémenter l'algorithme**

Ajouter dans `lib/data/generation-tournee.ts`, après `calculerDistancesDepuisCabinet` (après la ligne 127 actuelle) :

```ts
export interface VisiteAPositionner {
  missionId: string;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Ordre de passage des visites restantes, par plus-proche-voisin glouton
 * depuis un point de départ.
 *
 * Les visites sans coordonnées sont replacées à la fin, dans leur ordre
 * d'origine : aucune distance n'est calculable pour elles, et les mêler aux
 * visites géocodées ferait échouer tout le calcul pour une seule adresse
 * mal renseignée.
 */
export async function calculerOrdreVisites(
  origine: Coordonnees,
  visites: VisiteAPositionner[]
): Promise<string[]> {
  const nonGeocodees = visites.filter((v) => v.latitude === null || v.longitude === null);
  let candidates = visites.filter(
    (v): v is VisiteAPositionner & { latitude: number; longitude: number } =>
      v.latitude !== null && v.longitude !== null
  );

  const ordre: string[] = [];
  let point: Coordonnees = origine;

  while (candidates.length > 0) {
    const distances = await Promise.all(
      candidates.map((v) =>
        calculerDistanceRoutiereKm(point, { latitude: v.latitude, longitude: v.longitude })
      )
    );

    let indexPlusProche = 0;
    for (let i = 1; i < distances.length; i++) {
      if (distances[i] < distances[indexPlusProche]) indexPlusProche = i;
    }

    const plusProche = candidates[indexPlusProche];
    ordre.push(plusProche.missionId);
    point = { latitude: plusProche.latitude, longitude: plusProche.longitude };
    candidates = candidates.filter((_, i) => i !== indexPlusProche);
  }

  return [...ordre, ...nonGeocodees.map((v) => v.missionId)];
}
```

Ajouter l'import manquant en haut du fichier (à côté de `calculerDistanceRoutiereKm`, déjà importé ligne 5) :

```ts
import type { Coordonnees } from "@/lib/geocodage";
```

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run lib/data/generation-tournee.test.ts`
Expected: PASS

- [ ] **Step 5: Typecheck et lint**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: aucune nouvelle erreur

Run: `npx eslint lib/data/generation-tournee.ts lib/data/generation-tournee.test.ts`
Expected: aucune erreur

- [ ] **Step 6: Commit**

```bash
git add lib/data/generation-tournee.ts lib/data/generation-tournee.test.ts
git commit -m "feat(tournee): ajoute calculerOrdreVisites, plus-proche-voisin sur les visites restantes"
```

---

### Task 3: Server Action de réorganisation

**Files:**
- Create: `lib/data/reorganisation-tournee.ts`
- Test: `lib/data/reorganisation-tournee.test.ts`

**Interfaces:**
- Consumes: `calculerOrdreVisites`, `VisiteAPositionner` (Task 2, `@/lib/data/generation-tournee`) ; `ResultatEcriture` (`@/lib/data/ma-journee-actions`) ; `Coordonnees` (`@/lib/geocodage`).
- Produces: `export async function reorganiserTourneeAction(formData: FormData): Promise<ResultatEcriture>` — consommé par Task 4. Champ de formulaire attendu : `tourneeId`.

- [ ] **Step 1: Écrire les tests (échouent pour l'instant)**

Créer `lib/data/reorganisation-tournee.test.ts` :

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const missionsSelectQueue: { data: unknown; error: unknown }[] = [];
const profilesSelectResult: { data: unknown; error: unknown } = { data: null, error: null };
const updateResults: { error: unknown }[] = [];
const updateCalls: { payload: unknown; missionId: string }[] = [];

// Comme le vrai client Supabase, chaque maillon de la chaîne (`eq`, `order`,
// `limit`) se contente de renvoyer le même objet : seul un `await` (ou un
// `.maybeSingle()` explicite) déclenche la résolution. Un seul constructeur
// suffit donc pour les trois formes de lecture que cette action enchaîne
// (liste brute, ligne unique via .maybeSingle()).
function construireLecture(resultat: { data: unknown; error: unknown }) {
  const builder = {
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: () => Promise.resolve(resultat),
    then: (resolve: (v: typeof resultat) => void) => resolve(resultat),
  };
  return builder;
}

const fromMock = vi.fn((table: string) => {
  if (table === "profiles") {
    return { select: () => construireLecture(profilesSelectResult) };
  }
  if (table === "missions_du_jour") {
    return {
      select: () => construireLecture(missionsSelectQueue.shift() ?? { data: null, error: null }),
      update: (payload: unknown) => ({
        eq: (_colonne: string, missionId: string) => {
          updateCalls.push({ payload, missionId });
          return Promise.resolve(updateResults.shift() ?? { error: null });
        },
      }),
    };
  }
  throw new Error(`Table non attendue dans ce test : ${table}`);
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    from: fromMock,
    auth: { getUser: getUserMock },
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

beforeEach(() => {
  vi.stubEnv("OPENROUTESERVICE_API_KEY", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.clearAllMocks();
  missionsSelectQueue.length = 0;
  updateResults.length = 0;
  updateCalls.length = 0;
  profilesSelectResult.data = null;
  profilesSelectResult.error = null;
  getUserMock.mockResolvedValue({ data: { user: { id: "idel1" } }, error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("reorganiserTourneeAction", () => {
  it("réorganise à partir du cabinet quand la tournée n'a pas commencé", async () => {
    missionsSelectQueue.push(
      {
        data: [
          { id: "loin", patients: { latitude: 49.1, longitude: 2.3 } },
          { id: "proche", patients: { latitude: 48.82, longitude: 2.3 } },
        ],
        error: null,
      },
      { data: null, error: null }, // en_cours
      { data: null, error: null } // terminee
    );
    profilesSelectResult.data = { cabinet_latitude: 48.8, cabinet_longitude: 2.3 };
    updateResults.push({ error: null }, { error: null });

    const { reorganiserTourneeAction } = await import("./reorganisation-tournee");
    const formData = new FormData();
    formData.set("tourneeId", "t1");

    const resultat = await reorganiserTourneeAction(formData);

    expect(resultat).toEqual({ succes: true });
    expect(updateCalls).toEqual([
      { payload: { ordre_visite: 1 }, missionId: "proche" },
      { payload: { ordre_visite: 2 }, missionId: "loin" },
    ]);
  });

  it("part de la mission en cours plutôt que du cabinet", async () => {
    missionsSelectQueue.push(
      {
        data: [
          { id: "m1", patients: { latitude: 48.82, longitude: 2.3 } },
          { id: "m2", patients: { latitude: 48.9, longitude: 2.3 } },
        ],
        error: null,
      },
      { data: { patients: { latitude: 48.83, longitude: 2.3 } }, error: null } // en_cours
    );
    updateResults.push({ error: null }, { error: null });

    const { reorganiserTourneeAction } = await import("./reorganisation-tournee");
    const formData = new FormData();
    formData.set("tourneeId", "t1");

    await reorganiserTourneeAction(formData);

    // Depuis 48.83, m1 (48.82) est plus proche que m2 (48.90).
    expect(updateCalls[0]).toEqual({ payload: { ordre_visite: 1 }, missionId: "m1" });
    // Le cabinet n'a pas été consulté : la mission en cours a suffi.
    const appelsProfiles = fromMock.mock.calls.filter((appel) => appel[0] === "profiles");
    expect(appelsProfiles).toHaveLength(0);
  });

  it("refuse de réorganiser moins de deux visites restantes", async () => {
    missionsSelectQueue.push({ data: [{ id: "m1", patients: null }], error: null });

    const { reorganiserTourneeAction } = await import("./reorganisation-tournee");
    const formData = new FormData();
    formData.set("tourneeId", "t1");

    const resultat = await reorganiserTourneeAction(formData);

    expect(resultat.succes).toBe(false);
    expect(resultat.erreur).toMatch(/au moins deux/);
    expect(updateCalls).toHaveLength(0);
  });

  it("signale l'échec quand aucune coordonnée n'est disponible, y compris le cabinet", async () => {
    missionsSelectQueue.push(
      {
        data: [
          { id: "m1", patients: { latitude: null, longitude: null } },
          { id: "m2", patients: { latitude: null, longitude: null } },
        ],
        error: null,
      },
      { data: null, error: null }, // en_cours
      { data: null, error: null } // terminee
    );
    profilesSelectResult.data = { cabinet_latitude: null, cabinet_longitude: null };

    const { reorganiserTourneeAction } = await import("./reorganisation-tournee");
    const formData = new FormData();
    formData.set("tourneeId", "t1");

    const resultat = await reorganiserTourneeAction(formData);

    expect(resultat.succes).toBe(false);
    expect(resultat.erreur).toMatch(/adresses localisées/);
    expect(updateCalls).toHaveLength(0);
  });

  it("place un patient non géocodé en fin de séquence plutôt que d'échouer", async () => {
    missionsSelectQueue.push(
      {
        data: [
          { id: "sans-coords", patients: { latitude: null, longitude: null } },
          { id: "proche", patients: { latitude: 48.82, longitude: 2.3 } },
        ],
        error: null,
      },
      { data: null, error: null },
      { data: null, error: null }
    );
    profilesSelectResult.data = { cabinet_latitude: 48.8, cabinet_longitude: 2.3 };
    updateResults.push({ error: null }, { error: null });

    const { reorganiserTourneeAction } = await import("./reorganisation-tournee");
    const formData = new FormData();
    formData.set("tourneeId", "t1");

    await reorganiserTourneeAction(formData);

    expect(updateCalls).toEqual([
      { payload: { ordre_visite: 1 }, missionId: "proche" },
      { payload: { ordre_visite: 2 }, missionId: "sans-coords" },
    ]);
  });

  it("n'écrit rien si l'utilisatrice n'est pas connectée", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });

    const { reorganiserTourneeAction } = await import("./reorganisation-tournee");
    const formData = new FormData();
    formData.set("tourneeId", "t1");

    const resultat = await reorganiserTourneeAction(formData);

    expect(resultat.succes).toBe(false);
    expect(resultat.erreur).toMatch(/connectée/);
    expect(updateCalls).toHaveLength(0);
  });

  it("signale un échec partiel de l'écriture", async () => {
    missionsSelectQueue.push(
      {
        data: [
          { id: "m1", patients: { latitude: 48.82, longitude: 2.3 } },
          { id: "m2", patients: { latitude: 48.9, longitude: 2.3 } },
        ],
        error: null,
      },
      { data: null, error: null },
      { data: null, error: null }
    );
    profilesSelectResult.data = { cabinet_latitude: 48.8, cabinet_longitude: 2.3 };
    updateResults.push({ error: null }, { error: { message: "boom" } });

    const { reorganiserTourneeAction } = await import("./reorganisation-tournee");
    const formData = new FormData();
    formData.set("tourneeId", "t1");

    const resultat = await reorganiserTourneeAction(formData);

    expect(resultat.succes).toBe(false);
    expect(resultat.erreur).toMatch(/partiellement échoué/);
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run lib/data/reorganisation-tournee.test.ts`
Expected: FAIL — le module `./reorganisation-tournee` n'existe pas encore.

- [ ] **Step 3: Implémenter l'action**

Créer `lib/data/reorganisation-tournee.ts` :

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calculerOrdreVisites, type VisiteAPositionner } from "@/lib/data/generation-tournee";
import type { ResultatEcriture } from "@/lib/data/ma-journee-actions";
import type { Coordonnees } from "@/lib/geocodage";
import { journaliserEchec } from "@/lib/journal";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type PatientCoordsRow = { latitude: number | null; longitude: number | null };

function coordsDepuisEmbed(embed: unknown): PatientCoordsRow | null {
  if (!embed) return null;
  return Array.isArray(embed) ? ((embed[0] as PatientCoordsRow) ?? null) : (embed as PatientCoordsRow);
}

/**
 * Point de départ du calcul : la mission en cours, sinon la dernière
 * terminée, sinon le cabinet. Jamais la position GPS actuelle — décision
 * actée pour ne demander aucune permission supplémentaire.
 */
async function trouverOrigine(
  supabase: SupabaseServerClient,
  tourneeId: string,
  idelId: string
): Promise<Coordonnees | null> {
  const { data: enCours } = await supabase
    .from("missions_du_jour")
    .select("patients(latitude, longitude)")
    .eq("tournee_id", tourneeId)
    .eq("statut", "en_cours")
    .limit(1)
    .maybeSingle();

  const coordsEnCours = coordsDepuisEmbed((enCours as { patients: unknown } | null)?.patients);
  if (coordsEnCours?.latitude != null && coordsEnCours.longitude != null) {
    return { latitude: coordsEnCours.latitude, longitude: coordsEnCours.longitude };
  }

  const { data: derniereTerminee } = await supabase
    .from("missions_du_jour")
    .select("patients(latitude, longitude)")
    .eq("tournee_id", tourneeId)
    .eq("statut", "terminee")
    .order("heure_prevue", { ascending: false })
    .limit(1)
    .maybeSingle();

  const coordsTerminee = coordsDepuisEmbed((derniereTerminee as { patients: unknown } | null)?.patients);
  if (coordsTerminee?.latitude != null && coordsTerminee.longitude != null) {
    return { latitude: coordsTerminee.latitude, longitude: coordsTerminee.longitude };
  }

  const { data: profil } = await supabase
    .from("profiles")
    .select("cabinet_latitude, cabinet_longitude")
    .eq("id", idelId)
    .maybeSingle();

  const p = profil as { cabinet_latitude: number | null; cabinet_longitude: number | null } | null;
  if (p?.cabinet_latitude != null && p.cabinet_longitude != null) {
    return { latitude: p.cabinet_latitude, longitude: p.cabinet_longitude };
  }

  return null;
}

/**
 * Recalcule et écrit l'ordre de passage des visites restantes du jour.
 *
 * Déclenchement manuel uniquement — aucune détection automatique
 * d'imprévu. `heure_prevue` n'est jamais modifiée.
 */
export async function reorganiserTourneeAction(formData: FormData): Promise<ResultatEcriture> {
  const tourneeId = String(formData.get("tourneeId"));

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { succes: false, erreur: "Vous devez être connectée." };

  const { data: aFaire, error: aFaireError } = await supabase
    .from("missions_du_jour")
    .select("id, patients(latitude, longitude)")
    .eq("tournee_id", tourneeId)
    .eq("statut", "a_faire");

  if (aFaireError) {
    journaliserEchec("reorganiserTourneeAction", aFaireError);
    return { succes: false, erreur: `La réorganisation a échoué : ${aFaireError.message}` };
  }

  const missions = (aFaire ?? []) as { id: string; patients: unknown }[];
  if (missions.length < 2) {
    return { succes: false, erreur: "Il faut au moins deux visites à faire pour réorganiser la tournée." };
  }

  const origine = await trouverOrigine(supabase, tourneeId, user.id);
  if (!origine) {
    return { succes: false, erreur: "Pas assez d'adresses localisées pour réorganiser la tournée." };
  }

  const visites: VisiteAPositionner[] = missions.map((mission) => {
    const coords = coordsDepuisEmbed(mission.patients);
    return {
      missionId: mission.id,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
    };
  });

  const ordre = await calculerOrdreVisites(origine, visites);

  const resultats = await Promise.all(
    ordre.map((missionId, index) =>
      supabase.from("missions_du_jour").update({ ordre_visite: index + 1 }).eq("id", missionId)
    )
  );

  const echec = resultats.find((r) => (r as { error: unknown }).error);
  if (echec) {
    journaliserEchec("reorganiserTourneeAction — écriture de l'ordre", (echec as { error: unknown }).error);
    return { succes: false, erreur: "La réorganisation a partiellement échoué. Réessayez." };
  }

  revalidatePath("/ma-journee");
  revalidatePath("/ma-tournee");
  return { succes: true };
}
```

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run lib/data/reorganisation-tournee.test.ts`
Expected: PASS (7/7)

- [ ] **Step 5: Typecheck et lint**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: aucune nouvelle erreur

Run: `npx eslint lib/data/reorganisation-tournee.ts lib/data/reorganisation-tournee.test.ts`
Expected: aucune erreur

- [ ] **Step 6: Commit**

```bash
git add lib/data/reorganisation-tournee.ts lib/data/reorganisation-tournee.test.ts
git commit -m "feat(tournee): ajoute reorganiserTourneeAction"
```

---

### Task 4: Bouton de réorganisation et badge d'ordre

**Files:**
- Modify: `components/ui/CarteMission.tsx:44-66`
- Modify: `app/(app)/ma-journee/page.tsx`
- Test: `components/ui/CarteMission.test.tsx`

**Interfaces:**
- Consumes: `MissionDuJour.ordreVisite` (Task 1), `reorganiserTourneeAction` (Task 3), `ResultatEcriture`/`FormulaireAvecRetour` (existants).

- [ ] **Step 1: Écrire le test du badge (échoue pour l'instant)**

Ajouter à `components/ui/CarteMission.test.tsx`, dans le describe existant :

```ts
  it("affiche un badge d'ordre de visite quand ordreVisite est défini", () => {
    render(<CarteMission mission={{ ...mission, ordreVisite: 3 }} />);
    expect(screen.getByLabelText("Ordre de passage suggéré : 3")).toBeInTheDocument();
  });

  it("n'affiche aucun badge d'ordre quand ordreVisite est nul", () => {
    render(<CarteMission mission={{ ...mission, ordreVisite: null }} />);
    expect(screen.queryByLabelText(/Ordre de passage suggéré/)).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run components/ui/CarteMission.test.tsx`
Expected: FAIL — le badge n'existe pas encore.

- [ ] **Step 3: Ajouter le badge dans `CarteMission`**

Dans `components/ui/CarteMission.tsx:56-66` :

Avant :
```tsx
      <div className="relative flex w-9 shrink-0 flex-col items-center gap-1.5 pt-3.5">
        {!estDerniere && (
          <span aria-hidden="true" className="absolute left-1/2 top-[30px] bottom-[-12px] w-px -translate-x-1/2 bg-navy/12" />
        )}
        <span className="whitespace-nowrap text-[11px] font-bold tabular-nums text-navy/45">{heureAffichee}</span>
        <span
          aria-hidden="true"
          className={`relative z-10 h-3 w-3 rounded-full ring-4 ring-[#F6F7F5] ${DOT_CLASSES[mission.statut]}`}
        />
      </div>
```

Après :
```tsx
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
            className="relative z-10 flex h-4 w-4 items-center justify-center rounded-full bg-brand-violet text-[9px] font-bold text-white"
          >
            {mission.ordreVisite}
          </span>
        )}
      </div>
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

Run: `npx vitest run components/ui/CarteMission.test.tsx`
Expected: PASS

- [ ] **Step 5: Ajouter le bouton de réorganisation sur `/ma-journee`**

Dans `app/(app)/ma-journee/page.tsx`, ajouter l'import de l'action (à côté des imports existants, ligne 4-6) :

```tsx
import { reorganiserTourneeAction } from "@/lib/data/reorganisation-tournee";
import { FormulaireAvecRetour } from "@/components/ui/FormulaireAvecRetour";
```

Ajouter le calcul du compte de missions « à faire » à côté de `missionsRestantes` (ligne 46) :

Avant :
```tsx
  const missionsRestantes = missions.filter((m) => m.statut !== "terminee").length;
```

Après :
```tsx
  const missionsRestantes = missions.filter((m) => m.statut !== "terminee").length;
  const missionsAFaire = missions.filter((m) => m.statut === "a_faire").length;
```

Insérer le bouton juste après le bloc d'en-tête de la liste (après la fermeture du `<div className="flex items-baseline justify-between">...</div>`, ligne 118, avant `{missionsVisibles.length > 0 ? (`) :

Avant :
```tsx
              <p className="text-[12.5px] text-navy/45">
                {missionsRestantes > 0
                  ? `${missionsRestantes} restante${missionsRestantes > 1 ? "s" : ""}`
                  : "Tout est fait"}
              </p>
            </div>

            {missionsVisibles.length > 0 ? (
```

Après :
```tsx
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
```

- [ ] **Step 6: Vérification manuelle du rendu**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: aucune nouvelle erreur (confirme que `tournee.id` est bien accessible à cet endroit, à l'intérieur du bloc `{tournee && (...)}`)

- [ ] **Step 7: Lancer la suite complète, lint**

Run: `npx vitest run`
Expected: PASS (tous les fichiers)

Run: `npx eslint components/ui/CarteMission.tsx components/ui/CarteMission.test.tsx "app/(app)/ma-journee/page.tsx"`
Expected: aucune erreur

- [ ] **Step 8: Commit**

```bash
git add components/ui/CarteMission.tsx components/ui/CarteMission.test.tsx "app/(app)/ma-journee/page.tsx"
git commit -m "feat(tournee): bouton de reorganisation et badge d'ordre de visite"
```

---

### Task 5: Lien de navigation Waze

**Files:**
- Create: `lib/waze.ts`
- Test: `lib/waze.test.ts`
- Modify: `lib/types/clinical.ts:29-37` (`Patient`)
- Modify: `lib/data/ma-journee.ts:251-330` (`getMissionDetail`)
- Modify: `app/(app)/ma-journee/[missionId]/page.tsx:417-430`

**Interfaces:**
- Produces: `export interface DestinationWaze { latitude: number | null; longitude: number | null; adresse: string }` et `export function hrefWaze(destination: DestinationWaze): string`.
- Produces: `Patient.latitude?: number | null`, `Patient.longitude?: number | null`, propagés à `MissionDetail.patient`.

- [ ] **Step 1: Écrire les tests de `hrefWaze` (échouent pour l'instant)**

Créer `lib/waze.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { hrefWaze } from "./waze";

describe("hrefWaze", () => {
  it("utilise les coordonnées quand elles sont disponibles", () => {
    const href = hrefWaze({ latitude: 48.8566, longitude: 2.3522, adresse: "1 rue de Rivoli, Paris" });
    expect(href).toBe("https://waze.com/ul?navigate=yes&ll=48.8566%2C2.3522");
  });

  it("se rabat sur l'adresse quand les coordonnées sont absentes", () => {
    const href = hrefWaze({ latitude: null, longitude: null, adresse: "12 rue des Lilas, 75011 Paris" });
    expect(href).toBe("https://waze.com/ul?navigate=yes&q=12+rue+des+Lilas%2C+75011+Paris");
  });

  it("se rabat sur l'adresse si seule la longitude manque", () => {
    const href = hrefWaze({ latitude: 48.8566, longitude: null, adresse: "Adresse partielle" });
    expect(href).toBe("https://waze.com/ul?navigate=yes&q=Adresse+partielle");
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run lib/waze.test.ts`
Expected: FAIL — le module `./waze` n'existe pas encore.

- [ ] **Step 3: Implémenter `hrefWaze`**

Créer `lib/waze.ts` :

```ts
/**
 * Lien de navigation Waze vers un patient.
 *
 * Format de lien universel vérifié auprès de la documentation développeur
 * Waze : fonctionne comme un `<a href>` simple sans SDK, et Waze gère
 * lui-même le repli vers sa version web si l'app n'est pas installée.
 */

export interface DestinationWaze {
  latitude: number | null;
  longitude: number | null;
  adresse: string;
}

const BASE_URL_WAZE = "https://waze.com/ul";

export function hrefWaze(destination: DestinationWaze): string {
  const params = new URLSearchParams({ navigate: "yes" });

  if (destination.latitude !== null && destination.longitude !== null) {
    params.set("ll", `${destination.latitude},${destination.longitude}`);
  } else {
    params.set("q", destination.adresse);
  }

  return `${BASE_URL_WAZE}?${params.toString()}`;
}
```

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run lib/waze.test.ts`
Expected: PASS (3/3)

- [ ] **Step 5: Exposer les coordonnées du patient**

Dans `lib/types/clinical.ts:29-37` :

Avant :
```ts
export interface Patient {
  id: string;
  nomComplet: string;
  adresse: string;
  telephone: string;
  allergies: string | null;
  consignes: string | null;
  dateNaissance: string | null;
}
```

Après :
```ts
export interface Patient {
  id: string;
  nomComplet: string;
  adresse: string;
  telephone: string;
  allergies: string | null;
  consignes: string | null;
  dateNaissance: string | null;
  /**
   * Position géocodée du domicile, ou `null`/absente si l'adresse n'a pas pu
   * être localisée. Optionnelle côté type pour ne pas casser les objets
   * `Patient` déjà construits ailleurs (tests notamment).
   */
  latitude?: number | null;
  longitude?: number | null;
}
```

Dans `lib/data/ma-journee.ts`, fonction `getMissionDetail` (lignes 251-330) : ajouter `latitude, longitude` à la sélection des colonnes patient, et les deux champs à l'objet `patient` retourné.

Avant (ligne 257-258, chaîne de sélection) :
```ts
      "id, patient_id, tournee_id, type_soin, heure_prevue, statut, mission_clinique_id, transmission, rappel, photo_path, distance_km, distance_km_corrigee, patients(id, nom_complet, adresse, telephone, allergies, consignes, date_naissance, forfait_bsi), tournees(date), actes_mission(libelle, ordre, ngap_codes(code, cotation, lettre_cle, coefficient, derogatoire_bsi, eligible_mci))"
```

Après :
```ts
      "id, patient_id, tournee_id, type_soin, heure_prevue, statut, mission_clinique_id, transmission, rappel, photo_path, distance_km, distance_km_corrigee, patients(id, nom_complet, adresse, telephone, allergies, consignes, date_naissance, forfait_bsi, latitude, longitude), tournees(date), actes_mission(libelle, ordre, ngap_codes(code, cotation, lettre_cle, coefficient, derogatoire_bsi, eligible_mci))"
```

Avant (ligne 267-276, type `PatientRow`) :
```ts
  type PatientRow = {
    id: string;
    nom_complet: string;
    adresse: string;
    telephone: string;
    allergies: string | null;
    consignes: string | null;
    date_naissance: string | null;
    forfait_bsi: string | null;
  };
```

Après :
```ts
  type PatientRow = {
    id: string;
    nom_complet: string;
    adresse: string;
    telephone: string;
    allergies: string | null;
    consignes: string | null;
    date_naissance: string | null;
    forfait_bsi: string | null;
    latitude: number | null;
    longitude: number | null;
  };
```

Avant (ligne 320-328, objet `patient` retourné) :
```ts
    patient: {
      id: patientRow.id,
      nomComplet: patientRow.nom_complet,
      adresse: patientRow.adresse,
      telephone: patientRow.telephone,
      allergies: patientRow.allergies,
      consignes: patientRow.consignes,
      dateNaissance: patientRow.date_naissance,
    },
```

Après :
```ts
    patient: {
      id: patientRow.id,
      nomComplet: patientRow.nom_complet,
      adresse: patientRow.adresse,
      telephone: patientRow.telephone,
      allergies: patientRow.allergies,
      consignes: patientRow.consignes,
      dateNaissance: patientRow.date_naissance,
      latitude: patientRow.latitude,
      longitude: patientRow.longitude,
    },
```

- [ ] **Step 6: Ajouter le lien sur la fiche de mission**

Dans `app/(app)/ma-journee/[missionId]/page.tsx`, ajouter l'import (à côté des imports existants, ligne 5) :

```tsx
import { hrefWaze } from "@/lib/waze";
```

Repérer le bloc "Dossier du patient" (lignes 417-430) :

Avant :
```tsx
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-navy/45">
            Dossier du patient
          </p>
          <Link
            href={`/patients/${mission.patient.id}`}
            className="row-lift flex items-center justify-between rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)]"
          >
            <span className="text-[15px] font-semibold text-navy">Voir la fiche du patient</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[19px] w-[19px] shrink-0 text-navy/25">
              <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
```

Après :
```tsx
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-navy/45">
            Dossier du patient
          </p>
          <Link
            href={`/patients/${mission.patient.id}`}
            className="row-lift flex items-center justify-between rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)]"
          >
            <span className="text-[15px] font-semibold text-navy">Voir la fiche du patient</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[19px] w-[19px] shrink-0 text-navy/25">
              <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link
            href={hrefWaze({
              latitude: mission.patient.latitude ?? null,
              longitude: mission.patient.longitude ?? null,
              adresse: mission.patient.adresse,
            })}
            className="row-lift mt-2.5 flex items-center justify-between rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)]"
          >
            <span className="text-[15px] font-semibold text-navy">Naviguer avec Waze</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[19px] w-[19px] shrink-0 text-navy/25">
              <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
```

- [ ] **Step 7: Lancer la suite complète, typecheck, lint**

Run: `npx vitest run`
Expected: PASS

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: aucune nouvelle erreur

Run: `npx eslint lib/waze.ts lib/waze.test.ts lib/types/clinical.ts lib/data/ma-journee.ts "app/(app)/ma-journee/[missionId]/page.tsx"`
Expected: aucune erreur

- [ ] **Step 8: Commit**

```bash
git add lib/waze.ts lib/waze.test.ts lib/types/clinical.ts lib/data/ma-journee.ts "app/(app)/ma-journee/[missionId]/page.tsx"
git commit -m "feat(tournee): lien de navigation Waze sur la fiche de mission"
```

---

### Task 6: Réalignement du discours marketing — encarts et libellés

**Files:**
- Modify: `components/marketing/Hero.tsx:389-401`
- Modify: `components/marketing/JourneeAvecSoinely.tsx:120-126`
- Modify: `components/marketing/RangeeFonctionnalites.tsx:4-5,37-38`

Aucun test — copie statique, sans logique (cohérent avec le reste du dépôt : les autres pages marketing n'ont pas de test dédié).

- [ ] **Step 1: `Hero.tsx`**

Avant (lignes 389-401) :
```tsx
            <p style={{ fontSize: 12, lineHeight: 1.5, color: "#4b4763", margin: "0 0 11px" }}>
              Un embouteillage est détecté sur votre route. Je peux réorganiser votre tournée et vous faire gagner{" "}
              <b>18 minutes</b>.
            </p>
            <div
              className="btn-glace mb-[9px] rounded-[11px] text-center font-bold text-white"
              style={{
                background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                fontSize: 12.5,
                padding: 10,
              }}
            >
              Optimiser ma tournée
            </div>
```

Après :
```tsx
            <p style={{ fontSize: 12, lineHeight: 1.5, color: "#4b4763", margin: "0 0 11px" }}>
              Un imprévu sur la route ? Réorganisez votre tournée en un geste, et laissez Waze vous guider en temps réel.
            </p>
            <div
              className="btn-glace mb-[9px] rounded-[11px] text-center font-bold text-white"
              style={{
                background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                fontSize: 12.5,
                padding: 10,
              }}
            >
              Réorganiser ma tournée
            </div>
```

- [ ] **Step 2: `JourneeAvecSoinely.tsx`**

Avant (lignes 120-126) :
```tsx
                Embouteillage détecté
              </div>
              <div style={{ fontSize: 11, lineHeight: 1.45, color: "#6b6483", marginBottom: 10 }}>
                + 18 min de retard<br />Souhaitez-vous optimiser votre tournée ?
              </div>
              <div style={{ display: "flex", gap: 7 }}>
                <div className="btn-glace" style={{ flex: 1, textAlign: "center", background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", fontSize: 11.5, fontWeight: 700, padding: 8, borderRadius: 9, cursor: "pointer" }}>Optimiser</div>
```

Après :
```tsx
                Imprévu sur la tournée
              </div>
              <div style={{ fontSize: 11, lineHeight: 1.45, color: "#6b6483", marginBottom: 10 }}>
                Retard, urgence, absence…<br />Réorganisez votre tournée en un geste.
              </div>
              <div style={{ display: "flex", gap: 7 }}>
                <div className="btn-glace" style={{ flex: 1, textAlign: "center", background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", fontSize: 11.5, fontWeight: 700, padding: 8, borderRadius: 9, cursor: "pointer" }}>Réorganiser</div>
```

(La ligne suivante, le bouton "Plus tard", reste inchangée.)

- [ ] **Step 3: `RangeeFonctionnalites.tsx`**

Avant (lignes 3-14, premier élément du tableau) :
```ts
const FONCTIONNALITES = [
  {
    titre: "Jusqu'à 1h gagnée par jour",
    texte: "Des tournées optimisées qui s'adaptent en temps réel.",
    bg: "#eef4ff",
```

Après :
```ts
const FONCTIONNALITES = [
  {
    titre: "Des tournées plus fluides",
    texte: "Réorganisez l'ordre de vos visites en un geste, et laissez Waze gérer le trafic.",
    bg: "#eef4ff",
```

Avant (lignes 36-38, quatrième élément) :
```ts
  {
    titre: "Une tournée qui s'adapte à tout",
    texte: "Imprévu, trafic, urgences… ELY réorganise pour vous.",
```

Après :
```ts
  {
    titre: "Une tournée qui s'adapte à l'imprévu",
    texte: "Retard, urgence, absence… réorganisez en un geste, où que vous soyez.",
```

- [ ] **Step 4: Vérification**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: aucune nouvelle erreur

Run: `npx eslint components/marketing/Hero.tsx components/marketing/JourneeAvecSoinely.tsx components/marketing/RangeeFonctionnalites.tsx`
Expected: aucune erreur

Run: `npx vitest run`
Expected: PASS (aucun test ne couvre ces fichiers, la suite reste verte)

- [ ] **Step 5: Commit**

```bash
git add components/marketing/Hero.tsx components/marketing/JourneeAvecSoinely.tsx components/marketing/RangeeFonctionnalites.tsx
git commit -m "fix(marketing): remplace la promesse de detection automatique par la reorganisation manuelle"
```

---

### Task 7: Réalignement du discours marketing — storyboard « En temps réel »

**Files:**
- Modify: `components/marketing/EnTempsReel.tsx`

Le storyboard actuel (4 panneaux : détection automatique d'un embouteillage
→ proposition chiffrée d'ELY → validation → "18 min gagnées") dramatise
précisément la détection automatique et le gain chiffré non mesurés, avec
plus de mise en scène que les autres fichiers marketing — d'où une tâche
séparée. Le nouveau storyboard garde les 4 panneaux et leur mise en page
(aucune classe CSS ni structure ne change), mais recentre chacun sur un
geste de l'IDEL plutôt que sur une détection automatique, et retire tout
chiffre non mesuré.

Aucun test — copie et mise en scène statiques, sans logique.

- [ ] **Step 1: Titre, paragraphe et puces**

Avant (lignes 3-7) :
```ts
const IMPREVU_CHECKS = [
  "Réorganisation instantanée",
  "Recalcul du meilleur itinéraire",
  "Proposition validable en 1 tap",
];
```

Après :
```ts
const IMPREVU_CHECKS = [
  "Réorganisation en un tap",
  "Guidage Waze en temps réel",
  "Ordre de visite mis à jour aussitôt",
];
```

Avant (lignes 29-33) :
```tsx
                Un imprévu survient…<br />
                <span style={{ color: "#6d28d9" }}>ELY s&apos;occupe du reste.</span>
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: "#6b6483", margin: "0 0 18px" }}>
                Trafic, urgence, annulation de patient… SOINELY réorganise, recalcule et vous propose toujours la meilleure option.
              </p>
```

Après :
```tsx
                Un imprévu survient…<br />
                <span style={{ color: "#6d28d9" }}>réorganisez en un geste.</span>
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: "#6b6483", margin: "0 0 18px" }}>
                Trafic, urgence, annulation de patient… réorganisez votre tournée en un geste, et laissez Waze vous guider en temps réel.
              </p>
```

- [ ] **Step 2: Panneau 1 — la situation**

Avant (lignes 52-68) :
```tsx
                <div style={{ fontSize: 11, fontWeight: 800, color: "#9a92b3", marginBottom: 9 }}>08h17</div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "#1e1b3c", marginBottom: 11 }}>Embouteillage</div>
                <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", height: 100, marginBottom: 12 }}>
                  <Image
                    src="/marketing/jour-embouteillage.webp"
                    alt="Embouteillage"
                    fill
                    sizes="200px"
                    className="object-cover"
                  />
                  {/* soleil superposé */}
                  <div style={{ position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: 9999, background: "radial-gradient(circle,#fbbf24,#f59e0b)", opacity: 0.85 }} />
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#e11d48", marginBottom: 8 }}>+ 18 min de retard estimé</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#7c3aed", marginTop: "auto", lineHeight: 1.4 }}>
                  Pas d&apos;inquiétude : ELY veille et garde votre journée sereine.
                </div>
```

Après :
```tsx
                <div style={{ fontSize: 11, fontWeight: 800, color: "#9a92b3", marginBottom: 9 }}>08h17</div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "#1e1b3c", marginBottom: 11 }}>Imprévu sur la route</div>
                <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", height: 100, marginBottom: 12 }}>
                  <Image
                    src="/marketing/jour-embouteillage.webp"
                    alt="Embouteillage"
                    fill
                    sizes="200px"
                    className="object-cover"
                  />
                  {/* soleil superposé */}
                  <div style={{ position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: 9999, background: "radial-gradient(circle,#fbbf24,#f59e0b)", opacity: 0.85 }} />
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#e11d48", marginBottom: 8 }}>Retard, urgence, absence…</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#7c3aed", marginTop: "auto", lineHeight: 1.4 }}>
                  Un geste suffit pour réorganiser votre tournée.
                </div>
```

- [ ] **Step 3: Panneau 2 — la réorganisation**

Avant (lignes 73-91) :
```tsx
                <div style={{ fontSize: 11, fontWeight: 800, color: "#9a92b3", marginBottom: 9 }}>08h18</div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "#1e1b3c", marginBottom: 9 }}>Proposition d&apos;ELY</div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                  <Image
                    src="/marketing/ely-nouveau-consultation.webp"
                    alt="ELY"
                    width={353}
                    height={875}
                    className="object-contain"
                    style={{ width: 44, height: "auto", filter: "drop-shadow(0 6px 14px rgba(124,58,237,.28))" }}
                  />
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#9a92b3", marginBottom: 8 }}>Nouvel ordre proposé</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: "auto" }}>
                  {PATIENT_ORDER.map((p) => (
                    <div key={p} style={{ fontSize: 12, fontWeight: 600, color: "#3d3956" }}>→ {p}</div>
                  ))}
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#16a34a", marginTop: 11 }}>Gain estimé : 18 min</div>
```

Après :
```tsx
                <div style={{ fontSize: 11, fontWeight: 800, color: "#9a92b3", marginBottom: 9 }}>08h18</div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "#1e1b3c", marginBottom: 9 }}>Vous réorganisez</div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                  <Image
                    src="/marketing/ely-nouveau-consultation.webp"
                    alt="ELY"
                    width={353}
                    height={875}
                    className="object-contain"
                    style={{ width: 44, height: "auto", filter: "drop-shadow(0 6px 14px rgba(124,58,237,.28))" }}
                  />
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#9a92b3", marginBottom: 8 }}>Nouvel ordre de visite</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: "auto" }}>
                  {PATIENT_ORDER.map((p) => (
                    <div key={p} style={{ fontSize: 12, fontWeight: 600, color: "#3d3956" }}>→ {p}</div>
                  ))}
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#16a34a", marginTop: 11 }}>Mis à jour en un tap</div>
```

- [ ] **Step 4: Panneau 3 — la confirmation**

Avant (lignes 104-105) :
```tsx
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#1e1b3c" }}>Optimisation acceptée</div>
                  <div style={{ fontSize: 11.5, color: "#9a92b3" }}>Tournée mise à jour</div>
```

Après :
```tsx
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#1e1b3c" }}>C&apos;est fait</div>
                  <div style={{ fontSize: 11.5, color: "#9a92b3" }}>Tournée réorganisée</div>
```

(Le titre "Vous validez" et l'horaire "08h18" de ce panneau restent inchangés — le geste reste immédiat, seule la confirmation change de texte.)

- [ ] **Step 5: Panneau 4 — Waze prend le relais**

Avant (lignes 110-121) :
```tsx
                <div style={{ fontSize: 11, fontWeight: 800, color: "#9a92b3", marginBottom: 9 }}>08h19</div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "#1e1b3c", marginBottom: "auto" }}>Vous gagnez du temps</div>
                <div style={{ textAlign: "center", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginBottom: 2, transformOrigin: "50% 15%", animation: "alarm-ring 2s ease-in-out infinite" }}>
                    <path d="M12 6v6l3 2" /><circle cx="12" cy="13" r="8" />
                    <path d="M5 3 2 6M22 6l-3-3M6 19l-2 2M18 19l2 2" />
                  </svg>
                  <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-1px", color: "#7c3aed" }}>18 min</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#3d3956" }}>Gagnées</div>
                  <div style={{ fontSize: 11, color: "#9a92b3", marginTop: 2 }}>et votre journée reste fluide.</div>
                </div>
```

Après :
```tsx
                <div style={{ fontSize: 11, fontWeight: 800, color: "#9a92b3", marginBottom: 9 }}>08h19</div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "#1e1b3c", marginBottom: "auto" }}>Vous repartez</div>
                <div style={{ textAlign: "center", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginBottom: 2 }}>
                    <path d="M3 11l19-9-9 19-2-8-8-2z" />
                  </svg>
                  <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.5px", color: "#7c3aed" }}>Waze</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#3d3956" }}>vous guide</div>
                  <div style={{ fontSize: 11, color: "#9a92b3", marginTop: 2 }}>et votre journée reste fluide.</div>
                </div>
```

(L'icône passe d'un réveil animé — qui dramatisait un temps mesuré — à une
flèche de navigation statique, cohérente avec "vous guide".)

- [ ] **Step 6: Vérification**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: aucune nouvelle erreur

Run: `npx eslint components/marketing/EnTempsReel.tsx`
Expected: aucune erreur

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add components/marketing/EnTempsReel.tsx
git commit -m "fix(marketing): recentre le storyboard En temps reel sur un geste manuel"
```

## Vérification manuelle (hors suite automatisée)

Sur `/ma-journee` (authentifié) avec au moins deux missions « à faire » et
des patients géocodés : cliquer "Réorganiser ma tournée", confirmer que
l'ordre d'affichage change, que des badges numérotés apparaissent, et que
les heures affichées restent inchangées. Ouvrir une mission et cliquer
"Naviguer avec Waze", confirmer l'ouverture de Waze (ou sa version web)
routé vers la bonne adresse. Parcourir la landing page et confirmer
visuellement les 4 sections marketing modifiées (Hero, JourneeAvecSoinely,
RangeeFonctionnalites, EnTempsReel).

## Note pour l'utilisateur (portée volontairement réduite)

Deux réductions de portée par rapport au libellé littéral de la spec ont
été faites pendant l'écriture de ce plan, pour rester proportionnées au
chantier — voir "Global Constraints" :
- Le tri par `ordre_visite` s'applique uniquement à `/ma-journee`. `/ma-tournee`
  (vue de facturation, ses propres filtres) et l'indication "prochaine
  mission" après une validation restent triés par `heure_prevue` seul.
- `VideoDemo.tsx` n'est pas modifié : son unique passage concerné ("Tournée
  optimisée") ne fait pas de promesse fausse (pas de détection automatique
  ni de chiffre non mesuré), contrairement aux 4 autres fichiers marketing.
