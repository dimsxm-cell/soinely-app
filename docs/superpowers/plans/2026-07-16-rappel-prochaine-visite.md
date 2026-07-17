# Rappel pour la prochaine visite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sur la fiche patient (`/ma-journee/[missionId]`), permettre à l'IDEL
d'écrire une note "rappel pour la prochaine visite" pendant une visite
(`en_cours`/`terminee`), et afficher ce rappel — celui de la visite
précédente la plus récente — bien en évidence à la visite suivante.

**Architecture:** Une migration ajoute une colonne
`missions_du_jour.rappel` (text, nullable). `getMissionDetail` (existant)
est étendu pour la lire et calculer `dernierRappel`, exactement selon le
même mécanisme déjà utilisé pour `transmission`/`derniereTransmission`
(nouvelle fonction privée `getDernierRappel`, calquée sur
`getDerniereTransmission`). Une nouvelle Server Action
`updateRappelAction` gère l'écriture. L'écran gagne deux blocs : un en
lecture seule (style `warning`, positionné après "Allergie") et un
éditable (à côté de "Transmission de cette visite").

**Tech Stack:** Next.js 16 (App Router, Server Components), Supabase (RLS
existante, `SupabaseClient<Database>`), TypeScript strict, Vitest.

Spec complète : `docs/superpowers/specs/2026-07-16-rappel-prochaine-visite-design.md`.

## Global Constraints

- Aucune nouvelle policy RLS — la colonne ajoutée vit sur une table déjà
  couverte par `missions_du_jour_owner_all` (`for all`).
- `rappel`/`dernierRappel` suivent exactement le même mécanisme que
  `transmission`/`derniereTransmission` : `dernierRappel` est calculé sans
  condition de statut (toujours affiché s'il existe, même avant que la
  visite ait commencé) ; le bloc d'écriture n'est visible que si le statut
  est `en_cours` ou `terminee`.
- `getDernierRappel` reste une fonction **privée** (non exportée), même
  statut que `getDerniereTransmission`.
- Aucun état lu/non-lu, aucune date d'échéance, aucune notification.
- Bloc "Rappel de la dernière visite" positionné juste après "Allergie" et
  avant "Dernière transmission" ; style `warning` (`border-warning/30
  bg-warning/5`, label en `text-warning`), jamais la couleur `danger`.
- `SupabaseClient<Database>` partout, jamais de `SupabaseClient` non typé.
- `@typescript-eslint/no-explicit-any` est une erreur dans ce repo — tout
  cast sur un embed Supabase utilise `as unknown as { ... }` avec la forme
  exacte, même pattern que le reste de `lib/data/ma-journee.ts`.
- **`npm run build` est une étape obligatoire** dans chaque tâche.
- Pas de nouveau test e2e Playwright dédié — même écran déjà couvert.

---

### Task 1: Migration — colonne rappel

**Files:**
- Create: `supabase/migrations/20260716000200_rappel.sql`

**Interfaces:**
- Produces: `missions_du_jour.rappel` (text, nullable) — consommée par la
  Tâche 2.

- [ ] **Step 1: Écrire la migration**

Créer `supabase/migrations/20260716000200_rappel.sql` :

```sql
-- Rappel (texte) laissé par l'IDEL pour la prochaine visite du patient.
alter table public.missions_du_jour
  add column rappel text;
```

- [ ] **Step 2: Vérifier par relecture**

Relire le fichier créé et le comparer ligne à ligne au bloc SQL
ci-dessus. Aucune commande à exécuter ici — migration appliquée au projet
distant séparément, avec autorisation explicite du fondateur.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260716000200_rappel.sql
git commit -m "feat(db): rappel pour la prochaine visite"
```

---

### Task 2: Types + couche données — getDernierRappel

**Files:**
- Modify: `lib/types/clinical.ts`
- Modify: `lib/data/ma-journee.ts`
- Modify: `lib/data/ma-journee.test.ts`

**Interfaces:**
- Consomme: la colonne de la Tâche 1.
- Produces: `MissionDetail.rappel: string | null`,
  `MissionDetail.dernierRappel: string | null` (`lib/types/clinical.ts`) ;
  `getMissionDetail` retournant ces deux nouveaux champs
  (`lib/data/ma-journee.ts`) — consommés par la Tâche 3 (formulaire) et la
  Tâche 4 (écran).

Point d'attention : `getMissionDetail` interroge déjà `missions_du_jour`
trois fois en interne selon le statut (la mission elle-même,
`getDerniereTransmission`, et parfois `getProchaineMission`). Les tests
existants routent ces requêtes via un `select(...)` distinct par forme de
chaîne. `getDernierRappel` ajoute une **4ᵉ forme de requête**
(`"rappel, heure_prevue, tournees(date)"`), qui partage `"tournees(date)"`
avec celle de `getDerniereTransmission` (`"transmission, heure_prevue,
tournees(date)"`) — le routeur de test doit donc distinguer sur le nom de
colonne lui-même (`"transmission"` vs `"rappel"`), pas sur
`"tournees(date)"`. Le Step 1 ci-dessous vous donne le routeur déjà
corrigé — les 3 appels existants à `fakeClientAvecCandidats` qui passent un
3ᵉ argument positionnel (`prochaineRows`) doivent gagner un argument vide
supplémentaire avant celui-ci, sans quoi ils passeraient silencieusement
leurs données `prochaineRows` à la place de `candidatsRappel`. Le Step 1
vous donne ces 3 appels déjà corrigés.

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
  function fakeClientAvecCandidats(
    missionRow: unknown,
    candidatsTransmission: unknown[],
    candidatsRappel: unknown[] = [],
    prochaineRows: unknown[] = []
  ) {
    return {
      from: () => ({
        select: (colonnes: string) => {
          if (colonnes.includes("tournee_id")) {
            return {
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: missionRow, error: null }),
              }),
            };
          }
          if (colonnes.includes("transmission")) {
            return {
              eq: () => ({
                neq: () => ({
                  not: () => Promise.resolve({ data: candidatsTransmission, error: null }),
                }),
              }),
            };
          }
          if (colonnes.includes("rappel")) {
            return {
              eq: () => ({
                neq: () => ({
                  not: () => Promise.resolve({ data: candidatsRappel, error: null }),
                }),
              }),
            };
          }
          return {
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => Promise.resolve({ data: prochaineRows, error: null }),
                }),
              }),
            }),
          };
        },
      }),
    } as unknown as SupabaseClient;
  }

  const missionRow = {
    id: "m1",
    patient_id: "p1",
    tournee_id: "t1",
    type_soin: "Injection Lovenox",
    heure_prevue: "14:30:00",
    statut: "a_faire",
    mission_clinique_id: null,
    transmission: "Vu ce jour, tout va bien.",
    rappel: "Pense à vérifier la tension.",
    patients: {
      id: "p1",
      nom_complet: "Mme Dupont",
      adresse: "12 rue des Lilas, 75011 Paris",
      telephone: "06 12 34 56 78",
      allergies: "Allergie pénicilline",
      consignes: "Sonner au portail.",
      date_naissance: "1948-03-14",
    },
  };

  it("mappe la mission et le patient joint, avec la dernière transmission et le dernier rappel les plus récents", async () => {
    const fakeClient = fakeClientAvecCandidats(
      missionRow,
      [
        { transmission: "Ancienne visite, RAS.", heure_prevue: "09:00:00", tournees: { date: "2026-07-01" } },
        { transmission: "Pansement refait, rougeur à surveiller.", heure_prevue: "10:00:00", tournees: { date: "2026-07-14" } },
      ],
      [
        { rappel: "Ancien rappel, déjà traité.", heure_prevue: "09:00:00", tournees: { date: "2026-07-01" } },
        { rappel: "Vérifier la cicatrisation dans 3 jours.", heure_prevue: "10:00:00", tournees: { date: "2026-07-14" } },
      ]
    );

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
      transmission: "Vu ce jour, tout va bien.",
      derniereTransmission: "Pansement refait, rougeur à surveiller.",
      rappel: "Pense à vérifier la tension.",
      dernierRappel: "Vérifier la cicatrisation dans 3 jours.",
      prochaineMission: null,
      patient: {
        id: "p1",
        nomComplet: "Mme Dupont",
        adresse: "12 rue des Lilas, 75011 Paris",
        telephone: "06 12 34 56 78",
        allergies: "Allergie pénicilline",
        consignes: "Sonner au portail.",
        dateNaissance: "1948-03-14",
      },
    });
  });

  it("retourne derniereTransmission à null si aucune visite précédente n'a de transmission", async () => {
    const fakeClient = fakeClientAvecCandidats(missionRow, []);

    const { getMissionDetail } = await import("./ma-journee");
    const detail = await getMissionDetail(fakeClient, "m1");

    expect(detail?.derniereTransmission).toBeNull();
  });

  it("retourne dernierRappel à null si aucune visite précédente n'a de rappel", async () => {
    const fakeClient = fakeClientAvecCandidats(missionRow, [], []);

    const { getMissionDetail } = await import("./ma-journee");
    const detail = await getMissionDetail(fakeClient, "m1");

    expect(detail?.dernierRappel).toBeNull();
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

  it("retourne la prochaine mission à faire (la plus proche par heure_prevue) quand le statut est terminee", async () => {
    const fakeClient = fakeClientAvecCandidats(
      { ...missionRow, statut: "terminee" },
      [],
      [],
      [{ id: "m2", heure_prevue: "15:00:00", patients: { nom_complet: "M. Martin" } }]
    );

    const { getMissionDetail } = await import("./ma-journee");
    const detail = await getMissionDetail(fakeClient, "m1");

    expect(detail?.prochaineMission).toEqual({
      id: "m2",
      patientNom: "M. Martin",
      heurePrevue: "15:00:00",
    });
  });

  it("retourne prochaineMission à null si aucune mission à faire ne reste dans la tournée, statut terminee", async () => {
    const fakeClient = fakeClientAvecCandidats({ ...missionRow, statut: "terminee" }, [], [], []);

    const { getMissionDetail } = await import("./ma-journee");
    const detail = await getMissionDetail(fakeClient, "m1");

    expect(detail?.prochaineMission).toBeNull();
  });

  it("retourne aussi la prochaine mission à faire quand le statut est absent, y compris avec un embed patients en tableau", async () => {
    const fakeClient = fakeClientAvecCandidats(
      { ...missionRow, statut: "absent" },
      [],
      [],
      [{ id: "m3", heure_prevue: "16:00:00", patients: [{ nom_complet: "Mme Bernard" }] }]
    );

    const { getMissionDetail } = await import("./ma-journee");
    const detail = await getMissionDetail(fakeClient, "m1");

    expect(detail?.prochaineMission).toEqual({
      id: "m3",
      patientNom: "Mme Bernard",
      heurePrevue: "16:00:00",
    });
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

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npx vitest run lib/data/ma-journee.test.ts`
Expected: FAIL — `getMissionDetail` ne renvoie pas encore `rappel`/
`dernierRappel` (champs absents du type `MissionDetail` et de la valeur
retournée).

- [ ] **Step 3: Étendre les types (`lib/types/clinical.ts`)**

Dans `lib/types/clinical.ts`, remplacer :

```ts
export interface MissionDetail extends MissionDuJour {
  patient: Patient;
  transmission: string | null;
  derniereTransmission: string | null;
  prochaineMission: ProchaineMission | null;
}
```

par :

```ts
export interface MissionDetail extends MissionDuJour {
  patient: Patient;
  transmission: string | null;
  derniereTransmission: string | null;
  rappel: string | null;
  dernierRappel: string | null;
  prochaineMission: ProchaineMission | null;
}
```

- [ ] **Step 4: Ajouter `getDernierRappel` et étendre `getMissionDetail` (`lib/data/ma-journee.ts`)**

Remplacer entièrement le contenu de `lib/data/ma-journee.ts` par :

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import type {
  MissionDetail,
  MissionDuJour,
  ProchaineMission,
  StatutMission,
  Tournee,
} from "@/lib/types/clinical";

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

async function getDerniereTransmission(
  supabase: SupabaseClient<Database>,
  patientId: string,
  missionIdActuelle: string
): Promise<string | null> {
  const { data } = await supabase
    .from("missions_du_jour")
    .select("transmission, heure_prevue, tournees(date)")
    .eq("patient_id", patientId)
    .neq("id", missionIdActuelle)
    .not("transmission", "is", null);

  if (!data || data.length === 0) return null;

  type CandidatRow = { transmission: string | null; heure_prevue: string; tournees: unknown };
  const avecDate = (data as CandidatRow[]).map((row) => {
    const tourneeEmbed = row.tournees;
    const tournee = Array.isArray(tourneeEmbed)
      ? (tourneeEmbed[0] as { date: string } | undefined)
      : (tourneeEmbed as { date: string } | null);
    return { transmission: row.transmission, dateHeure: `${tournee?.date ?? ""}T${row.heure_prevue}` };
  });

  avecDate.sort((a, b) => b.dateHeure.localeCompare(a.dateHeure));

  return avecDate[0].transmission;
}

async function getDernierRappel(
  supabase: SupabaseClient<Database>,
  patientId: string,
  missionIdActuelle: string
): Promise<string | null> {
  const { data } = await supabase
    .from("missions_du_jour")
    .select("rappel, heure_prevue, tournees(date)")
    .eq("patient_id", patientId)
    .neq("id", missionIdActuelle)
    .not("rappel", "is", null);

  if (!data || data.length === 0) return null;

  type CandidatRow = { rappel: string | null; heure_prevue: string; tournees: unknown };
  const avecDate = (data as CandidatRow[]).map((row) => {
    const tourneeEmbed = row.tournees;
    const tournee = Array.isArray(tourneeEmbed)
      ? (tourneeEmbed[0] as { date: string } | undefined)
      : (tourneeEmbed as { date: string } | null);
    return { rappel: row.rappel, dateHeure: `${tournee?.date ?? ""}T${row.heure_prevue}` };
  });

  avecDate.sort((a, b) => b.dateHeure.localeCompare(a.dateHeure));

  return avecDate[0].rappel;
}

async function getProchaineMission(
  supabase: SupabaseClient<Database>,
  tourneeId: string
): Promise<ProchaineMission | null> {
  const { data, error } = await supabase
    .from("missions_du_jour")
    .select("id, heure_prevue, patients(nom_complet)")
    .eq("tournee_id", tourneeId)
    .eq("statut", "a_faire")
    .order("heure_prevue")
    .limit(1);

  if (error || !data || data.length === 0) return null;

  const row = data[0];
  const patientEmbed = row.patients as unknown;
  const patient = Array.isArray(patientEmbed)
    ? (patientEmbed[0] as { nom_complet: string })
    : (patientEmbed as { nom_complet: string });

  return {
    id: row.id,
    patientNom: patient.nom_complet,
    heurePrevue: row.heure_prevue,
  };
}

export async function getMissionDetail(
  supabase: SupabaseClient<Database>,
  missionId: string
): Promise<MissionDetail | null> {
  const { data, error } = await supabase
    .from("missions_du_jour")
    .select(
      "id, patient_id, tournee_id, type_soin, heure_prevue, statut, mission_clinique_id, transmission, rappel, patients(id, nom_complet, adresse, telephone, allergies, consignes, date_naissance)"
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
    date_naissance: string | null;
  };
  const patientRow = Array.isArray(patientEmbed)
    ? (patientEmbed[0] as PatientRow)
    : (patientEmbed as PatientRow);

  const derniereTransmission = await getDerniereTransmission(supabase, data.patient_id, missionId);
  const dernierRappel = await getDernierRappel(supabase, data.patient_id, missionId);

  const statut = data.statut as StatutMission;
  const prochaineMission =
    statut === "terminee" || statut === "absent"
      ? await getProchaineMission(supabase, data.tournee_id)
      : null;

  return {
    id: data.id,
    patientId: data.patient_id,
    patientNom: patientRow.nom_complet,
    typeSoin: data.type_soin,
    heurePrevue: data.heure_prevue,
    statut,
    missionCliniqueId: data.mission_clinique_id,
    transmission: data.transmission,
    derniereTransmission,
    rappel: data.rappel,
    dernierRappel,
    prochaineMission,
    patient: {
      id: patientRow.id,
      nomComplet: patientRow.nom_complet,
      adresse: patientRow.adresse,
      telephone: patientRow.telephone,
      allergies: patientRow.allergies,
      consignes: patientRow.consignes,
      dateNaissance: patientRow.date_naissance,
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

- [ ] **Step 5: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run lib/data/ma-journee.test.ts`
Expected: PASS (tous les tests, existants et les 2 nouveaux pour
`dernierRappel`)

- [ ] **Step 6: Vérifier la compilation et le lint**

Run: `npm run build`
Expected: PASS (0 erreur TypeScript)

Run: `npx eslint lib/types/clinical.ts lib/data/ma-journee.ts`
Expected: PASS (0 erreur)

- [ ] **Step 7: Commit**

```bash
git add lib/types/clinical.ts lib/data/ma-journee.ts lib/data/ma-journee.test.ts
git commit -m "feat(patients): getDernierRappel (rappel pour la prochaine visite)"
```

---

### Task 3: Server Action — updateRappelAction

**Files:**
- Modify: `lib/data/ma-journee-actions.ts`
- Modify: `lib/data/ma-journee-actions.test.ts`

**Interfaces:**
- Consomme: rien de nouveau (utilise `createClient` déjà importé).
- Produces: `updateRappelAction(formData: FormData): Promise<void>` —
  consommée par la Tâche 4.

- [ ] **Step 1: Écrire les tests qui échouent d'abord**

Dans `lib/data/ma-journee-actions.test.ts`, ajouter à la fin du fichier
(après le `describe("updateTransmissionAction", ...)` existant, avant la
fin du fichier) :

```ts

describe("updateRappelAction", () => {
  it("met à jour le rappel de la mission et invalide le cache", async () => {
    eqSelectMock.mockResolvedValue({ data: { id: "m1" }, error: null });
    eqUpdateMock.mockResolvedValue({ error: null });

    const { updateRappelAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("rappel", "Vérifier la cicatrisation dans 3 jours.");

    await updateRappelAction(formData);

    expect(updateMock).toHaveBeenCalledWith({ rappel: "Vérifier la cicatrisation dans 3 jours." });
    expect(eqUpdateMock).toHaveBeenCalledWith("id", "m1");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee/m1");
  });

  it("ne fait rien si la mission n'existe pas", async () => {
    eqSelectMock.mockResolvedValue({ data: null, error: null });

    const { updateRappelAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "inconnue");
    formData.set("rappel", "Peu importe");

    await updateRappelAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npx vitest run lib/data/ma-journee-actions.test.ts`
Expected: FAIL — `updateRappelAction` n'existe pas encore.

- [ ] **Step 3: Implémenter**

Dans `lib/data/ma-journee-actions.ts`, ajouter à la fin du fichier (après
`updateTransmissionAction`) :

```ts

export async function updateRappelAction(formData: FormData): Promise<void> {
  const missionId = String(formData.get("missionId"));
  const rappel = String(formData.get("rappel"));

  const supabase = await createClient();

  const { data: mission } = await supabase
    .from("missions_du_jour")
    .select("id")
    .eq("id", missionId)
    .maybeSingle();

  if (!mission) return;

  await supabase.from("missions_du_jour").update({ rappel }).eq("id", missionId);

  revalidatePath(`/ma-journee/${missionId}`);
}
```

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run lib/data/ma-journee-actions.test.ts`
Expected: PASS (tous les tests existants + 2 nouveaux pour
`updateRappelAction`)

- [ ] **Step 5: Vérifier la compilation et le lint**

Run: `npm run build`
Expected: PASS (0 erreur TypeScript)

Run: `npx eslint lib/data/ma-journee-actions.ts`
Expected: PASS (0 erreur)

- [ ] **Step 6: Commit**

```bash
git add lib/data/ma-journee-actions.ts lib/data/ma-journee-actions.test.ts
git commit -m "feat(patients): updateRappelAction"
```

---

### Task 4: Écran — blocs Rappel

**Files:**
- Modify: `app/ma-journee/[missionId]/page.tsx`

**Interfaces:**
- Consomme: `getMissionDetail` étendu (Tâche 2 — `mission.rappel`,
  `mission.dernierRappel`), `updateRappelAction` (Tâche 3).

- [ ] **Step 1: Ajouter l'import de `updateRappelAction`**

Dans `app/ma-journee/[missionId]/page.tsx`, remplacer :

```ts
import {
  updateConsignesAction,
  updateMissionStatutAction,
  updateTransmissionAction,
} from "@/lib/data/ma-journee-actions";
```

par :

```ts
import {
  updateConsignesAction,
  updateMissionStatutAction,
  updateRappelAction,
  updateTransmissionAction,
} from "@/lib/data/ma-journee-actions";
```

- [ ] **Step 2: Ajouter le bloc de lecture "Rappel de la dernière visite"**

Toujours dans le même fichier, remplacer :

```tsx
      {mission.patient.allergies && (
        <section className="rounded-card border border-danger/30 bg-danger/5 p-6">
          <p className="text-xs font-medium uppercase text-danger">Allergie</p>
          <p className="mt-1 text-navy">{mission.patient.allergies}</p>
        </section>
      )}

      {mission.derniereTransmission && (
```

par :

```tsx
      {mission.patient.allergies && (
        <section className="rounded-card border border-danger/30 bg-danger/5 p-6">
          <p className="text-xs font-medium uppercase text-danger">Allergie</p>
          <p className="mt-1 text-navy">{mission.patient.allergies}</p>
        </section>
      )}

      {mission.dernierRappel && (
        <section className="rounded-card border border-warning/30 bg-warning/5 p-6">
          <p className="text-xs font-medium uppercase text-warning">Rappel de la dernière visite</p>
          <p className="mt-1 text-navy">{mission.dernierRappel}</p>
        </section>
      )}

      {mission.derniereTransmission && (
```

- [ ] **Step 3: Ajouter le bloc éditable "Rappel pour la prochaine visite"**

Toujours dans le même fichier, remplacer :

```tsx
      {peutEcrireTransmission && (
        <section className="rounded-card border border-navy/10 bg-white p-6">
          <p className="text-xs font-medium uppercase text-navy/60">Transmission de cette visite</p>
          <form action={updateTransmissionAction} className="mt-2 flex flex-col gap-3">
            <input type="hidden" name="missionId" value={mission.id} />
            <textarea
              name="transmission"
              defaultValue={mission.transmission ?? ""}
              rows={3}
              className="rounded-card border border-navy/10 p-3 text-navy"
            />
            <Button type="submit" variant="tertiary" className="self-start">
              Enregistrer
            </Button>
          </form>
        </section>
      )}
```

par :

```tsx
      {peutEcrireTransmission && (
        <section className="rounded-card border border-navy/10 bg-white p-6">
          <p className="text-xs font-medium uppercase text-navy/60">Transmission de cette visite</p>
          <form action={updateTransmissionAction} className="mt-2 flex flex-col gap-3">
            <input type="hidden" name="missionId" value={mission.id} />
            <textarea
              name="transmission"
              defaultValue={mission.transmission ?? ""}
              rows={3}
              className="rounded-card border border-navy/10 p-3 text-navy"
            />
            <Button type="submit" variant="tertiary" className="self-start">
              Enregistrer
            </Button>
          </form>
        </section>
      )}

      {peutEcrireTransmission && (
        <section className="rounded-card border border-navy/10 bg-white p-6">
          <p className="text-xs font-medium uppercase text-navy/60">Rappel pour la prochaine visite</p>
          <form action={updateRappelAction} className="mt-2 flex flex-col gap-3">
            <input type="hidden" name="missionId" value={mission.id} />
            <textarea
              name="rappel"
              defaultValue={mission.rappel ?? ""}
              rows={3}
              className="rounded-card border border-navy/10 p-3 text-navy"
            />
            <Button type="submit" variant="tertiary" className="self-start">
              Enregistrer
            </Button>
          </form>
        </section>
      )}
```

- [ ] **Step 4: Vérifier la compilation et le lint**

Run: `npm run build`
Expected: PASS (0 erreur TypeScript)

Run: `npx eslint "app/ma-journee/[missionId]/page.tsx"`
Expected: PASS (0 erreur)

- [ ] **Step 5: Lancer la suite complète**

Run: `npm test`
Expected: PASS (tous les tests existants + ceux des tâches précédentes,
aucune régression)

- [ ] **Step 6: Commit**

```bash
git add "app/ma-journee/[missionId]/page.tsx"
git commit -m "feat(patients): blocs rappel sur la fiche patient"
```

- [ ] **Step 7: Vérification manuelle post-déploiement (contrôleur, avec autorisation explicite du fondateur)**

Après déploiement, avec autorisation explicite du fondateur : sur les
patients/missions de test déjà en place, écrire un rappel sur une mission
`en_cours`/`terminee`, créer une seconde mission pour le même patient à
une date postérieure et confirmer que "Rappel de la dernière visite"
s'affiche correctement (style `warning`, positionné avant "Dernière
transmission") sur la fiche de cette 2ᵉ mission ; confirmer qu'un rappel
vide ne laisse aucun bloc vide.

---

## Résultat à la fin de ce plan

Depuis la fiche patient, une IDEL peut laisser une note "pour la prochaine
visite" pendant un soin, et la retrouve bien en évidence (couleur
`warning`, juste après l'allergie) dès qu'elle rouvre la fiche de ce
patient à la visite suivante — sans état lu/non-lu ni notification à
gérer, sur le même mécanisme déjà éprouvé pour la transmission.
