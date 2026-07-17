# Navigation vers le patient suivant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Depuis la fiche patient (`/ma-journee/[missionId]`), une fois une
mission `terminee` ou `absent`, proposer un lien direct vers la fiche du
patient suivant de la tournée (la prochaine mission `a_faire` par
`heure_prevue`), ou un message de fin de tournée s'il n'en reste aucune.

**Architecture:** Aucune migration — la tournée (`tournee_id`) et le
statut (`statut`) existent déjà sur `missions_du_jour`. `getMissionDetail`
(existant) gagne un champ `prochaineMission`, calculé uniquement quand le
statut de la mission consultée est `terminee` ou `absent`, via une nouvelle
fonction privée `getProchaineMission`. L'écran détail affiche ce résultat
dans la zone qui aujourd'hui ne rend déjà plus rien pour ces deux statuts.

**Tech Stack:** Next.js 16 (App Router, Server Components), Supabase (RLS
existante, `SupabaseClient<Database>`), TypeScript strict, Vitest.

Spec complète : `docs/superpowers/specs/2026-07-16-navigation-patient-suivant-design.md`.

## Global Constraints

- **Aucune nouvelle migration, aucune nouvelle policy RLS** — `tournee_id`
  et `statut` existent déjà sur `missions_du_jour` ; `tournees_owner_all`
  empêche déjà de lire la tournée d'une autre IDEL.
- **"Patient suivant" = la mission `a_faire` triée par `heure_prevue`
  croissant, la première trouvée, dans la même tournée** — jamais l'ordre
  d'insertion ni l'ordre des visites déjà faites.
- **`prochaineMission` n'est calculé (requête supplémentaire) que si le
  statut de la mission consultée est `terminee` ou `absent`** — aucune
  requête ajoutée pour `a_faire`/`en_cours`.
- `getProchaineMission` reste une fonction **privée** (non exportée), même
  statut que `getDerniereTransmission` déjà dans ce fichier.
- Aucune nouvelle Server Action, aucune nouvelle route, aucune confirmation
  avant de suivre le lien.
- `SupabaseClient<Database>` partout, jamais de `SupabaseClient` non typé.
- `@typescript-eslint/no-explicit-any` est une erreur dans ce repo — tout
  cast sur un embed Supabase utilise `as unknown as { ... }` avec la forme
  exacte, même pattern que le reste de `lib/data/ma-journee.ts`.
- **`npm run build` est une étape obligatoire** dans chaque tâche.
- Pas de nouveau test e2e Playwright dédié — même écran déjà couvert.

---

### Task 1: Types + couche données — getProchaineMission

**Files:**
- Modify: `lib/types/clinical.ts`
- Modify: `lib/data/ma-journee.ts`
- Modify: `lib/data/ma-journee.test.ts`

**Interfaces:**
- Consomme : rien de nouveau (aucune nouvelle colonne, `tournee_id` et
  `statut` existent déjà).
- Produces : `ProchaineMission` (`lib/types/clinical.ts`) ;
  `MissionDetail.prochaineMission: ProchaineMission | null` ; `getMissionDetail`
  retournant ce nouveau champ (`lib/data/ma-journee.ts`) — consommés par la
  Tâche 2.

- [ ] **Step 1: Écrire les tests qui échouent d'abord**

Dans `lib/data/ma-journee.test.ts`, remplacer le bloc `describe("getMissionDetail", ...)`
existant (repérable par sa première ligne, `describe("getMissionDetail", () => {`,
jusqu'à son `});` fermant, juste avant `describe("getMissionEnCoursHref", ...)`)
par :

```ts
describe("getMissionDetail", () => {
  function fakeClientAvecCandidats(
    missionRow: unknown,
    candidats: unknown[],
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
          if (colonnes.includes("tournees(date)")) {
            return {
              eq: () => ({
                neq: () => ({
                  not: () => Promise.resolve({ data: candidats, error: null }),
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

  it("mappe la mission et le patient joint, avec la dernière transmission la plus récente", async () => {
    const fakeClient = fakeClientAvecCandidats(missionRow, [
      { transmission: "Ancienne visite, RAS.", heure_prevue: "09:00:00", tournees: { date: "2026-07-01" } },
      { transmission: "Pansement refait, rougeur à surveiller.", heure_prevue: "10:00:00", tournees: { date: "2026-07-14" } },
    ]);

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
    const fakeClient = fakeClientAvecCandidats({ ...missionRow, statut: "terminee" }, [], []);

    const { getMissionDetail } = await import("./ma-journee");
    const detail = await getMissionDetail(fakeClient, "m1");

    expect(detail?.prochaineMission).toBeNull();
  });

  it("retourne aussi la prochaine mission à faire quand le statut est absent, y compris avec un embed patients en tableau", async () => {
    const fakeClient = fakeClientAvecCandidats(
      { ...missionRow, statut: "absent" },
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
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npx vitest run lib/data/ma-journee.test.ts`
Expected: FAIL — `getMissionDetail` ne renvoie pas encore `prochaineMission`
(champ absent du type `MissionDetail` et de la valeur retournée), et le
mock à 3 branches (`tournee_id` / `tournees(date)` / défaut) ne correspond
pas encore à la requête réelle (2 branches seulement aujourd'hui, pas de
`tournee_id` dans le select principal).

- [ ] **Step 3: Ajouter le type `ProchaineMission` (`lib/types/clinical.ts`)**

Dans `lib/types/clinical.ts`, juste avant `export interface MissionDuJour {`,
insérer :

```ts
export interface ProchaineMission {
  id: string;
  patientNom: string;
  heurePrevue: string;
}

```

Puis, dans `export interface MissionDetail extends MissionDuJour {`,
ajouter un champ après `derniereTransmission: string | null;` :

```ts
export interface MissionDetail extends MissionDuJour {
  patient: Patient;
  transmission: string | null;
  derniereTransmission: string | null;
  prochaineMission: ProchaineMission | null;
}
```

- [ ] **Step 4: Ajouter `getProchaineMission` et étendre `getMissionDetail` (`lib/data/ma-journee.ts`)**

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
      "id, patient_id, tournee_id, type_soin, heure_prevue, statut, mission_clinique_id, transmission, patients(id, nom_complet, adresse, telephone, allergies, consignes, date_naissance)"
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
Expected: PASS (tous les tests, existants et les 3 nouveaux pour
`prochaineMission`)

- [ ] **Step 6: Vérifier la compilation et le lint**

Run: `npm run build`
Expected: PASS (0 erreur TypeScript)

Run: `npx eslint lib/types/clinical.ts lib/data/ma-journee.ts`
Expected: PASS (0 erreur)

- [ ] **Step 7: Commit**

```bash
git add lib/types/clinical.ts lib/data/ma-journee.ts lib/data/ma-journee.test.ts
git commit -m "feat(patients): getProchaineMission (patient suivant de la tournée)"
```

---

### Task 2: Écran — bloc "Patient suivant"

**Files:**
- Modify: `app/ma-journee/[missionId]/page.tsx:161-180`

**Interfaces:**
- Consomme : `getMissionDetail` étendu (Tâche 1 — `mission.prochaineMission: ProchaineMission | null`).

- [ ] **Step 1: Remplacer le bloc final de l'écran**

Dans `app/ma-journee/[missionId]/page.tsx`, remplacer les lignes 161-180
(le bloc `{prochainStatut && (...)}`, juste après la section
"Transmission de cette visite" et juste avant la fermeture de `<main>`)
par :

```tsx
      {prochainStatut ? (
        <div className="flex gap-3">
          {peutMarquerAbsent && (
            <form action={updateMissionStatutAction} className="flex-1">
              <input type="hidden" name="missionId" value={mission.id} />
              <input type="hidden" name="nouveauStatut" value="absent" />
              <Button type="submit" variant="secondary" className="w-full">
                Absence
              </Button>
            </form>
          )}
          <form action={updateMissionStatutAction} className="flex-1">
            <input type="hidden" name="missionId" value={mission.id} />
            <input type="hidden" name="nouveauStatut" value={prochainStatut} />
            <Button type="submit" variant="primary" className="w-full">
              {LIBELLE_ACTION[mission.statut]}
            </Button>
          </form>
        </div>
      ) : (
        <section className="rounded-card border border-navy/10 bg-white p-6">
          {mission.prochaineMission ? (
            <>
              <p className="text-xs font-medium uppercase text-navy/60">Patient suivant</p>
              <p className="mt-1 text-navy">
                {mission.prochaineMission.patientNom} · {mission.prochaineMission.heurePrevue}
              </p>
              <Link href={`/ma-journee/${mission.prochaineMission.id}`} className="mt-3 inline-block">
                <Button variant="primary">Voir la fiche</Button>
              </Link>
            </>
          ) : (
            <p className="text-navy/60">Aucun autre patient à voir aujourd&apos;hui.</p>
          )}
        </section>
      )}
```

Ne rien changer d'autre dans ce fichier — `Link` et `Button` sont déjà
importés en haut du fichier, aucun nouvel import nécessaire.

- [ ] **Step 2: Vérifier la compilation et le lint**

Run: `npm run build`
Expected: PASS (0 erreur TypeScript)

Run: `npx eslint "app/ma-journee/[missionId]/page.tsx"`
Expected: PASS (0 erreur, y compris `react/no-unescaped-entities` sur
`&apos;`)

- [ ] **Step 3: Lancer la suite complète**

Run: `npm test`
Expected: PASS (tous les tests existants + ceux de la Tâche 1, aucune
régression)

- [ ] **Step 4: Commit**

```bash
git add "app/ma-journee/[missionId]/page.tsx"
git commit -m "feat(patients): bloc patient suivant sur la fiche patient"
```

- [ ] **Step 5: Vérification manuelle post-déploiement (contrôleur, avec autorisation explicite du fondateur)**

Après déploiement, avec autorisation explicite du fondateur : sur la
tournée de test déjà en place, marquer une mission `terminee` (ou
`absent`) alors qu'il reste au moins une mission `a_faire` plus tardive
dans la même tournée, et confirmer que le bloc "Patient suivant" affiche
la bonne mission (la plus proche par heure, pas la suivante par ordre
d'ID) ; marquer toutes les missions restantes comme vues et confirmer que
le message "Aucun autre patient à voir aujourd'hui." apparaît à la
dernière ; suivre le lien "Voir la fiche" et confirmer l'arrivée sur la
bonne fiche patient.

---

## Résultat à la fin de ce plan

Depuis la fiche patient, une fois une visite terminée ou un patient marqué
absent, l'IDEL voit directement qui voir ensuite (le patient le plus
urgent restant, par heure prévue) avec un lien vers sa fiche complète, ou
un message confirmant qu'il n'y a plus personne à voir — sans redirection
automatique ni nouvel écran de fin de tournée.
