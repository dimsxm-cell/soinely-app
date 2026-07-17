# Photo jointe à la visite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sur la fiche patient (`/ma-journee/[missionId]`), permettre à
l'IDEL de joindre une photo à une visite (`en_cours`/`terminee`), et
afficher la photo de la visite précédente du même patient pour comparer
l'évolution — via un bucket Supabase Storage privé et des URLs signées à
la demande, jamais de fichier public.

**Architecture:** Une migration crée le bucket `photos-visites` (privé,
limité en taille/type), une policy RLS sur `storage.objects` (même
principe que `missions_du_jour_owner_all`, appliquée au premier segment du
chemin de fichier), et ajoute `missions_du_jour.photo_path` (chemin, pas
URL). `getMissionDetail` (existant) est étendu pour renvoyer ce chemin et
celui de la visite précédente (`getDernierePhoto`, calquée sur
`getDerniereTransmission`/`getDernierRappel`). Une nouvelle fonction
`getPhotoUrl` résout un chemin en URL signée à la demande — jamais stockée,
jamais renvoyée par `getMissionDetail` lui-même. Une nouvelle Server Action
`uploadPhotoAction` reçoit le fichier et l'envoie au bucket. L'écran
affiche les deux blocs (lecture seule + envoi).

**Tech Stack:** Next.js 16 (App Router, Server Components), Supabase (RLS
existante + nouvelle policy Storage, `SupabaseClient<Database>`),
Supabase Storage (nouveau pour ce projet), TypeScript strict, Vitest.

Spec complète : `docs/superpowers/specs/2026-07-17-photo-visite-design.md`.

## Global Constraints

- **Bucket `photos-visites` toujours privé** (`public: false` dans
  `storage.buckets`) — jamais d'URL publique stockée ou durable, toujours
  une URL signée générée à la demande (`createSignedUrl`, validité 300
  secondes).
- **Une seule photo par visite** — l'envoi utilise `upsert: true`, un
  nouvel envoi remplace l'ancien fichier au même chemin.
- **Convention de chemin** : `{userId}/{missionId}.{extension}` — le
  premier segment doit être `auth.uid()` pour que la policy RLS sur
  `storage.objects` accepte l'écriture.
- **`getMissionDetail` ne renvoie que des chemins** (`photoPath`,
  `dernierePhotoPath`), jamais d'URL — la résolution en URL signée se fait
  dans l'écran via `getPhotoUrl`, jamais dans la couche données de
  `getMissionDetail`.
- **`getDernierePhoto` reste une fonction privée** (non exportée), même
  statut que `getDerniereTransmission`/`getDernierRappel`.
- **`getPhotoUrl` est exportée** (contrairement aux fonctions "dernière
  X") car appelée directement depuis l'écran, pas seulement depuis
  `getMissionDetail`.
- **Bloc d'envoi visible seulement si `peutEcrireTransmission`**
  (`en_cours`/`terminee`) — même garde que transmission/rappel. Bloc
  "Dernière photo" toujours affiché si elle existe, sans condition de
  statut.
- **Aucun message d'erreur affiché à l'IDEL** en cas d'échec d'envoi —
  cohérent avec le reste de l'app (aucune action existante n'affiche
  d'erreur).
- `SupabaseClient<Database>` partout, jamais de `SupabaseClient` non
  typé. `@typescript-eslint/no-explicit-any` est une erreur — tout cast
  sur un embed Supabase utilise `as unknown as { ... }`.
- **`npm run build` est une étape obligatoire** dans chaque tâche.
- **`lib/types/database.types.ts` doit être mis à jour dans la Tâche 2**
  (ajout de `photo_path` sur `missions_du_jour`) — sans ça, `npm run
  build` échoue dès que le code lit/écrit cette colonne via le client
  typé (déjà rencontré et corrigé lors du chantier précédent).
- Pas de nouveau test e2e Playwright dédié — même écran déjà couvert, et
  un envoi de fichier réel serait de toute façon hors de portée de la
  configuration Playwright actuelle du projet.

---

### Task 1: Migration — bucket photos-visites + colonne photo_path

**Files:**
- Create: `supabase/migrations/20260717000000_photos.sql`

**Interfaces:**
- Produces : bucket Storage `photos-visites` (privé, 10 Mo max,
  `image/jpeg`/`image/png`/`image/webp`), policy `photos_visites_owner_all`
  sur `storage.objects`, `missions_du_jour.photo_path` (text, nullable) —
  consommés par la Tâche 2.

- [ ] **Step 1: Écrire la migration**

Créer `supabase/migrations/20260717000000_photos.sql` :

```sql
-- Bucket de stockage pour les photos jointes aux visites (privé, jamais
-- public — servi uniquement via URLs signées à la demande).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos-visites', 'photos-visites', false, 10485760, array['image/jpeg','image/png','image/webp']);

-- RLS sur storage.objects : chaque IDEL ne peut lire/écrire que ses
-- propres fichiers, identifiés par le premier segment du chemin
-- (idel_id) — même principe que missions_du_jour_owner_all/
-- patients_owner_all, appliqué ici au stockage de fichiers.
create policy "photos_visites_owner_all" on storage.objects
  for all
  using (bucket_id = 'photos-visites' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'photos-visites' and (storage.foldername(name))[1] = auth.uid()::text);

-- Chemin du fichier dans le bucket (pas une URL — les URLs signées sont
-- générées à la demande, jamais stockées puisqu'elles expirent).
alter table public.missions_du_jour
  add column photo_path text;
```

- [ ] **Step 2: Vérifier par relecture**

Relire le fichier créé et le comparer ligne à ligne au bloc SQL
ci-dessus. `storage.objects` a RLS activée par défaut sur tout projet
Supabase (pas besoin d'un `alter table ... enable row level security`
explicite, à la différence des tables `public.*` de ce projet). Aucune
commande à exécuter ici — migration appliquée au projet distant
séparément, avec autorisation explicite du fondateur.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260717000000_photos.sql
git commit -m "feat(db): bucket photos-visites et colonne photo_path"
```

---

### Task 2: Types + couche données — getDernierePhoto, getPhotoUrl

**Files:**
- Modify: `lib/types/clinical.ts`
- Modify: `lib/types/database.types.ts`
- Modify: `lib/data/ma-journee.ts`
- Modify: `lib/data/ma-journee.test.ts`

**Interfaces:**
- Consomme : la colonne et le bucket de la Tâche 1.
- Produces : `MissionDetail.photoPath: string | null`,
  `MissionDetail.dernierePhotoPath: string | null`
  (`lib/types/clinical.ts`) ; `getMissionDetail` retournant ces deux
  champs ; `getPhotoUrl(supabase, path): Promise<string | null>` exportée
  (`lib/data/ma-journee.ts`) — consommés par la Tâche 3 (l'action
  d'envoi n'a pas besoin de `getPhotoUrl`, seulement `photoPath` via son
  propre chemin construit) et la Tâche 4 (écran).

Point d'attention (même type de piège que pour le chantier "rappel", qui
avait ajouté une 4ᵉ branche) : `getMissionDetail` interroge déjà
`missions_du_jour` en 4 formes de requête selon le contexte (la mission
elle-même, `getDerniereTransmission`, `getDernierRappel`, et parfois
`getProchaineMission`). Cette tâche ajoute une **5ᵉ forme**
(`getDernierePhoto`, select `"photo_path, heure_prevue, tournees(date)"`).
Le Step 1 ci-dessous vous donne le routeur de test déjà étendu à 5
branches (distinction sur `"photo_path"`, qui n'apparaît dans aucune
autre forme de requête de ce fichier) — et les 3 appels existants à
`fakeClientAvecCandidats` qui passent un argument `prochaineRows` gagnent
un argument vide supplémentaire avant celui-ci, déjà fait dans le code
ci-dessous.

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
    candidatsPhoto: unknown[] = [],
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
          if (colonnes.includes("photo_path")) {
            return {
              eq: () => ({
                neq: () => ({
                  not: () => Promise.resolve({ data: candidatsPhoto, error: null }),
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
    photo_path: "u1/m1.jpg",
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

  it("mappe la mission et le patient joint, avec la dernière transmission, le dernier rappel et la dernière photo les plus récents", async () => {
    const fakeClient = fakeClientAvecCandidats(
      missionRow,
      [
        { transmission: "Ancienne visite, RAS.", heure_prevue: "09:00:00", tournees: { date: "2026-07-01" } },
        { transmission: "Pansement refait, rougeur à surveiller.", heure_prevue: "10:00:00", tournees: { date: "2026-07-14" } },
      ],
      [
        { rappel: "Ancien rappel, déjà traité.", heure_prevue: "09:00:00", tournees: { date: "2026-07-01" } },
        { rappel: "Vérifier la cicatrisation dans 3 jours.", heure_prevue: "10:00:00", tournees: { date: "2026-07-14" } },
      ],
      [
        { photo_path: "u1/m0-ancienne.jpg", heure_prevue: "09:00:00", tournees: { date: "2026-07-01" } },
        { photo_path: "u1/m0-recente.jpg", heure_prevue: "10:00:00", tournees: { date: "2026-07-14" } },
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
      photoPath: "u1/m1.jpg",
      dernierePhotoPath: "u1/m0-recente.jpg",
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

  it("retourne dernierePhotoPath à null si aucune visite précédente n'a de photo", async () => {
    const fakeClient = fakeClientAvecCandidats(missionRow, [], [], []);

    const { getMissionDetail } = await import("./ma-journee");
    const detail = await getMissionDetail(fakeClient, "m1");

    expect(detail?.dernierePhotoPath).toBeNull();
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
    const fakeClient = fakeClientAvecCandidats({ ...missionRow, statut: "terminee" }, [], [], [], []);

    const { getMissionDetail } = await import("./ma-journee");
    const detail = await getMissionDetail(fakeClient, "m1");

    expect(detail?.prochaineMission).toBeNull();
  });

  it("retourne aussi la prochaine mission à faire quand le statut est absent, y compris avec un embed patients en tableau", async () => {
    const fakeClient = fakeClientAvecCandidats(
      { ...missionRow, statut: "absent" },
      [],
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

describe("getPhotoUrl", () => {
  it("retourne l'URL signée si Supabase Storage répond sans erreur", async () => {
    const fakeClient = {
      storage: {
        from: () => ({
          createSignedUrl: () =>
            Promise.resolve({ data: { signedUrl: "https://example.supabase.co/signed/u1/m1.jpg" }, error: null }),
        }),
      },
    } as unknown as SupabaseClient;

    const { getPhotoUrl } = await import("./ma-journee");
    const url = await getPhotoUrl(fakeClient, "u1/m1.jpg");

    expect(url).toBe("https://example.supabase.co/signed/u1/m1.jpg");
  });

  it("retourne null si Supabase Storage renvoie une erreur", async () => {
    const fakeClient = {
      storage: {
        from: () => ({
          createSignedUrl: () => Promise.resolve({ data: null, error: { message: "not found" } }),
        }),
      },
    } as unknown as SupabaseClient;

    const { getPhotoUrl } = await import("./ma-journee");
    const url = await getPhotoUrl(fakeClient, "u1/inconnue.jpg");

    expect(url).toBeNull();
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
Expected: FAIL — `getMissionDetail` ne renvoie pas encore `photoPath`/
`dernierePhotoPath`, `getPhotoUrl` n'existe pas encore.

- [ ] **Step 3: Étendre les types (`lib/types/clinical.ts`)**

Dans `lib/types/clinical.ts`, remplacer :

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

par :

```ts
export interface MissionDetail extends MissionDuJour {
  patient: Patient;
  transmission: string | null;
  derniereTransmission: string | null;
  rappel: string | null;
  dernierRappel: string | null;
  photoPath: string | null;
  dernierePhotoPath: string | null;
  prochaineMission: ProchaineMission | null;
}
```

- [ ] **Step 4: Mettre à jour les types générés (`lib/types/database.types.ts`)**

Dans le bloc `missions_du_jour` (`Row`/`Insert`/`Update`), ajouter
`photo_path` (alphabétiquement entre `patient_id` et `rappel`) :

```ts
      missions_du_jour: {
        Row: {
          heure_prevue: string
          id: string
          mission_clinique_id: string | null
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
          mission_clinique_id?: string | null
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
          mission_clinique_id?: string | null
          patient_id?: string
          photo_path?: string | null
          rappel?: string | null
          statut?: string
          tournee_id?: string
          transmission?: string | null
          type_soin?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_du_jour_mission_clinique_id_fkey"
            columns: ["mission_clinique_id"]
            isOneToOne: false
            referencedRelation: "missions_cliniques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_du_jour_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_du_jour_tournee_id_fkey"
            columns: ["tournee_id"]
            isOneToOne: false
            referencedRelation: "tournees"
            referencedColumns: ["id"]
          },
        ]
      }
```

- [ ] **Step 5: Ajouter `getDernierePhoto`/`getPhotoUrl` et étendre `getMissionDetail` (`lib/data/ma-journee.ts`)**

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

const BUCKET_PHOTOS = "photos-visites";

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

async function getDernierePhoto(
  supabase: SupabaseClient<Database>,
  patientId: string,
  missionIdActuelle: string
): Promise<string | null> {
  const { data } = await supabase
    .from("missions_du_jour")
    .select("photo_path, heure_prevue, tournees(date)")
    .eq("patient_id", patientId)
    .neq("id", missionIdActuelle)
    .not("photo_path", "is", null);

  if (!data || data.length === 0) return null;

  type CandidatRow = { photo_path: string | null; heure_prevue: string; tournees: unknown };
  const avecDate = (data as CandidatRow[]).map((row) => {
    const tourneeEmbed = row.tournees;
    const tournee = Array.isArray(tourneeEmbed)
      ? (tourneeEmbed[0] as { date: string } | undefined)
      : (tourneeEmbed as { date: string } | null);
    return { photoPath: row.photo_path, dateHeure: `${tournee?.date ?? ""}T${row.heure_prevue}` };
  });

  avecDate.sort((a, b) => b.dateHeure.localeCompare(a.dateHeure));

  return avecDate[0].photoPath;
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
      "id, patient_id, tournee_id, type_soin, heure_prevue, statut, mission_clinique_id, transmission, rappel, photo_path, patients(id, nom_complet, adresse, telephone, allergies, consignes, date_naissance)"
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
  const dernierePhotoPath = await getDernierePhoto(supabase, data.patient_id, missionId);

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
    photoPath: data.photo_path,
    dernierePhotoPath,
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

export async function getPhotoUrl(
  supabase: SupabaseClient<Database>,
  path: string
): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET_PHOTOS).createSignedUrl(path, 300);

  if (error || !data) return null;

  return data.signedUrl;
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

- [ ] **Step 6: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run lib/data/ma-journee.test.ts`
Expected: PASS (tous les tests, existants et les 3 nouveaux pour
`dernierePhotoPath`/`getPhotoUrl`)

- [ ] **Step 7: Vérifier la compilation et le lint**

Run: `npm run build`
Expected: PASS (0 erreur TypeScript)

Run: `npx eslint lib/types/clinical.ts lib/types/database.types.ts lib/data/ma-journee.ts`
Expected: PASS (0 erreur)

- [ ] **Step 8: Commit**

```bash
git add lib/types/clinical.ts lib/types/database.types.ts lib/data/ma-journee.ts lib/data/ma-journee.test.ts
git commit -m "feat(patients): getDernierePhoto, getPhotoUrl (photo jointe à la visite)"
```

---

### Task 3: Server Action — uploadPhotoAction

**Files:**
- Modify: `lib/data/ma-journee-actions.ts`
- Modify: `lib/data/ma-journee-actions.test.ts`

**Interfaces:**
- Consomme : rien de nouveau côté données (utilise `createClient` déjà
  importé) — nouveau côté API Supabase : `supabase.auth.getUser()` et
  `supabase.storage.from(...).upload(...)`, jamais utilisés jusqu'ici
  dans ce fichier.
- Produces : `uploadPhotoAction(formData: FormData): Promise<void>` —
  consommée par la Tâche 4.

Point d'attention : le mock partagé en tête de
`lib/data/ma-journee-actions.test.ts` (`vi.mock("@/lib/supabase/server",
...)`) ne renvoie aujourd'hui qu'un objet `{ from: fromMock }`. Cette
tâche l'étend pour renvoyer aussi `auth.getUser` et `storage.from` —
sans effet sur les tests existants (`updateMissionStatutAction`,
`updateConsignesAction`, `updateTransmissionAction`,
`updateRappelAction`), qui n'appellent jamais ces deux nouvelles
méthodes.

- [ ] **Step 1: Écrire les tests qui échouent d'abord**

Remplacer entièrement le contenu de `lib/data/ma-journee-actions.test.ts`
par :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const eqSelectMock = vi.fn();
const selectMock = vi.fn(() => ({ eq: () => ({ maybeSingle: eqSelectMock }) }));
const eqUpdateMock = vi.fn();
const updateMock = vi.fn(() => ({ eq: eqUpdateMock }));
const fromMock = vi.fn(() => ({ select: selectMock, update: updateMock }));
const getUserMock = vi.fn();
const uploadMock = vi.fn();
const storageFromMock = vi.fn(() => ({ upload: uploadMock }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    from: fromMock,
    auth: { getUser: getUserMock },
    storage: { from: storageFromMock },
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateMissionStatutAction", () => {
  it("applique une transition valide (a_faire vers en_cours) et invalide le cache des deux écrans", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "a_faire" }, error: null });
    eqUpdateMock.mockResolvedValue({ error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "en_cours");

    await updateMissionStatutAction(formData);

    expect(fromMock).toHaveBeenCalledWith("missions_du_jour");
    expect(updateMock).toHaveBeenCalledWith({ statut: "en_cours" });
    expect(eqUpdateMock).toHaveBeenCalledWith("id", "m1");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee/m1");
  });

  it("applique la transition a_faire vers absent et invalide le cache", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "a_faire" }, error: null });
    eqUpdateMock.mockResolvedValue({ error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "absent");

    await updateMissionStatutAction(formData);

    expect(updateMock).toHaveBeenCalledWith({ statut: "absent" });
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee/m1");
  });

  it("n'applique pas absent depuis en_cours", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "en_cours" }, error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "absent");

    await updateMissionStatutAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("n'applique pas absent depuis terminee", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "terminee" }, error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "absent");

    await updateMissionStatutAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("n'applique pas une transition invalide (terminee vers a_faire)", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "terminee" }, error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "a_faire");

    await updateMissionStatutAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("n'applique pas une transition invalide (a_faire directement vers terminee)", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "a_faire" }, error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "terminee");

    await updateMissionStatutAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("n'applique pas une transition invalide (en_cours vers a_faire)", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "en_cours" }, error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "a_faire");

    await updateMissionStatutAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("n'applique rien si la mission n'existe pas", async () => {
    eqSelectMock.mockResolvedValue({ data: null, error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "inconnue");
    formData.set("nouveauStatut", "en_cours");

    await updateMissionStatutAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateConsignesAction", () => {
  it("met à jour les consignes du patient lié à la mission et invalide le cache", async () => {
    eqSelectMock.mockResolvedValue({ data: { patient_id: "p1" }, error: null });
    eqUpdateMock.mockResolvedValue({ error: null });

    const { updateConsignesAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("consignes", "Sonner au portail.");

    await updateConsignesAction(formData);

    expect(fromMock).toHaveBeenCalledWith("missions_du_jour");
    expect(fromMock).toHaveBeenCalledWith("patients");
    expect(updateMock).toHaveBeenCalledWith({ consignes: "Sonner au portail." });
    expect(eqUpdateMock).toHaveBeenCalledWith("id", "p1");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee/m1");
  });

  it("ne fait rien si la mission n'existe pas", async () => {
    eqSelectMock.mockResolvedValue({ data: null, error: null });

    const { updateConsignesAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "inconnue");
    formData.set("consignes", "Peu importe");

    await updateConsignesAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateTransmissionAction", () => {
  it("met à jour la transmission de la mission et invalide le cache", async () => {
    eqSelectMock.mockResolvedValue({ data: { id: "m1" }, error: null });
    eqUpdateMock.mockResolvedValue({ error: null });

    const { updateTransmissionAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("transmission", "RAS, patient stable.");

    await updateTransmissionAction(formData);

    expect(updateMock).toHaveBeenCalledWith({ transmission: "RAS, patient stable." });
    expect(eqUpdateMock).toHaveBeenCalledWith("id", "m1");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee/m1");
  });

  it("ne fait rien si la mission n'existe pas", async () => {
    eqSelectMock.mockResolvedValue({ data: null, error: null });

    const { updateTransmissionAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "inconnue");
    formData.set("transmission", "Peu importe");

    await updateTransmissionAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

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

describe("uploadPhotoAction", () => {
  it("envoie la photo, met à jour photo_path et invalide le cache", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    eqSelectMock.mockResolvedValue({ data: { id: "m1" }, error: null });
    uploadMock.mockResolvedValue({ data: { path: "u1/m1.jpg" }, error: null });
    eqUpdateMock.mockResolvedValue({ error: null });

    const { uploadPhotoAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const photo = new File(["contenu"], "plaie.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("photo", photo);

    await uploadPhotoAction(formData);

    expect(storageFromMock).toHaveBeenCalledWith("photos-visites");
    expect(uploadMock).toHaveBeenCalledWith("u1/m1.jpg", photo, { upsert: true, contentType: "image/jpeg" });
    expect(updateMock).toHaveBeenCalledWith({ photo_path: "u1/m1.jpg" });
    expect(eqUpdateMock).toHaveBeenCalledWith("id", "m1");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee/m1");
  });

  it("ne fait rien si aucun fichier n'est fourni", async () => {
    const { uploadPhotoAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");

    await uploadPhotoAction(formData);

    expect(uploadMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("ne fait rien si la mission n'existe pas", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    eqSelectMock.mockResolvedValue({ data: null, error: null });

    const { uploadPhotoAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const photo = new File(["contenu"], "plaie.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.set("missionId", "inconnue");
    formData.set("photo", photo);

    await uploadPhotoAction(formData);

    expect(uploadMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("ne met rien à jour si l'envoi Storage échoue", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    eqSelectMock.mockResolvedValue({ data: { id: "m1" }, error: null });
    uploadMock.mockResolvedValue({ data: null, error: { message: "boom" } });

    const { uploadPhotoAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const photo = new File(["contenu"], "plaie.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("photo", photo);

    await uploadPhotoAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npx vitest run lib/data/ma-journee-actions.test.ts`
Expected: FAIL — `uploadPhotoAction` n'existe pas encore.

- [ ] **Step 3: Implémenter**

Dans `lib/data/ma-journee-actions.ts`, ajouter à la fin du fichier (après
`updateRappelAction`) :

```ts

export async function uploadPhotoAction(formData: FormData): Promise<void> {
  const missionId = String(formData.get("missionId"));
  const photo = formData.get("photo");

  if (!(photo instanceof File) || photo.size === 0) return;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: mission } = await supabase
    .from("missions_du_jour")
    .select("id")
    .eq("id", missionId)
    .maybeSingle();

  if (!mission) return;

  const extension = photo.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/${missionId}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("photos-visites")
    .upload(path, photo, { upsert: true, contentType: photo.type });

  if (uploadError) return;

  await supabase.from("missions_du_jour").update({ photo_path: path }).eq("id", missionId);

  revalidatePath(`/ma-journee/${missionId}`);
}
```

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run lib/data/ma-journee-actions.test.ts`
Expected: PASS (tous les tests existants + 4 nouveaux pour
`uploadPhotoAction`)

- [ ] **Step 5: Vérifier la compilation et le lint**

Run: `npm run build`
Expected: PASS (0 erreur TypeScript)

Run: `npx eslint lib/data/ma-journee-actions.ts`
Expected: PASS (0 erreur)

- [ ] **Step 6: Commit**

```bash
git add lib/data/ma-journee-actions.ts lib/data/ma-journee-actions.test.ts
git commit -m "feat(patients): uploadPhotoAction"
```

---

### Task 4: Écran — blocs Photo

**Files:**
- Modify: `app/ma-journee/[missionId]/page.tsx`

**Interfaces:**
- Consomme : `getMissionDetail` étendu (Tâche 2 — `mission.photoPath`,
  `mission.dernierePhotoPath`), `getPhotoUrl` (Tâche 2),
  `uploadPhotoAction` (Tâche 3).

- [ ] **Step 1: Ajouter les imports**

Dans `app/ma-journee/[missionId]/page.tsx`, remplacer :

```ts
import { createClient } from "@/lib/supabase/server";
import { getMissionDetail } from "@/lib/data/ma-journee";
import {
  updateConsignesAction,
  updateMissionStatutAction,
  updateRappelAction,
  updateTransmissionAction,
} from "@/lib/data/ma-journee-actions";
```

par :

```ts
import { createClient } from "@/lib/supabase/server";
import { getMissionDetail, getPhotoUrl } from "@/lib/data/ma-journee";
import {
  updateConsignesAction,
  updateMissionStatutAction,
  updateRappelAction,
  updateTransmissionAction,
  uploadPhotoAction,
} from "@/lib/data/ma-journee-actions";
```

- [ ] **Step 2: Résoudre les URLs signées**

Toujours dans le même fichier, remplacer :

```tsx
  const { missionId } = await params;
  const supabase = await createClient();
  const mission = await getMissionDetail(supabase, missionId);

  if (!mission) notFound();

  const prochainStatut = PROCHAIN_STATUT[mission.statut];
```

par :

```tsx
  const { missionId } = await params;
  const supabase = await createClient();
  const mission = await getMissionDetail(supabase, missionId);

  if (!mission) notFound();

  const photoUrl = mission.photoPath ? await getPhotoUrl(supabase, mission.photoPath) : null;
  const dernierePhotoUrl = mission.dernierePhotoPath
    ? await getPhotoUrl(supabase, mission.dernierePhotoPath)
    : null;

  const prochainStatut = PROCHAIN_STATUT[mission.statut];
```

- [ ] **Step 3: Ajouter le bloc de lecture "Dernière photo"**

Toujours dans le même fichier, remplacer :

```tsx
      {mission.derniereTransmission && (
        <section className="rounded-card border border-navy/10 bg-navy/5 p-6">
          <p className="text-xs font-medium uppercase text-navy/60">Dernière transmission</p>
          <p className="mt-1 text-navy">{mission.derniereTransmission}</p>
        </section>
      )}

      <section className="rounded-card border border-navy/10 bg-white p-6">
        <p className="text-xs font-medium uppercase text-navy/60">Consignes</p>
```

par :

```tsx
      {mission.derniereTransmission && (
        <section className="rounded-card border border-navy/10 bg-navy/5 p-6">
          <p className="text-xs font-medium uppercase text-navy/60">Dernière transmission</p>
          <p className="mt-1 text-navy">{mission.derniereTransmission}</p>
        </section>
      )}

      {dernierePhotoUrl && (
        <section className="rounded-card border border-navy/10 bg-navy/5 p-6">
          <p className="text-xs font-medium uppercase text-navy/60">Dernière photo</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- URL signée à courte durée de vie, incompatible avec le cache de next/image */}
          <img
            src={dernierePhotoUrl}
            alt="Photo de la visite précédente"
            className="mt-2 max-w-full rounded-card"
          />
        </section>
      )}

      <section className="rounded-card border border-navy/10 bg-white p-6">
        <p className="text-xs font-medium uppercase text-navy/60">Consignes</p>
```

- [ ] **Step 4: Ajouter le bloc d'envoi "Photo de cette visite"**

Toujours dans le même fichier, remplacer :

```tsx
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

      {prochainStatut ? (
```

par :

```tsx
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

      {peutEcrireTransmission && (
        <section className="rounded-card border border-navy/10 bg-white p-6">
          <p className="text-xs font-medium uppercase text-navy/60">Photo de cette visite</p>
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- URL signée à courte durée de vie, incompatible avec le cache de next/image
            <img
              src={photoUrl}
              alt="Photo envoyée pour cette visite"
              className="mt-2 max-w-full rounded-card"
            />
          )}
          <form action={uploadPhotoAction} className="mt-2 flex flex-col gap-3">
            <input type="hidden" name="missionId" value={mission.id} />
            <input type="file" name="photo" accept="image/*" capture="environment" />
            <Button type="submit" variant="tertiary" className="self-start">
              Envoyer
            </Button>
          </form>
        </section>
      )}

      {prochainStatut ? (
```

- [ ] **Step 5: Vérifier la compilation et le lint**

Run: `npm run build`
Expected: PASS (0 erreur TypeScript)

Run: `npx eslint "app/ma-journee/[missionId]/page.tsx"`
Expected: PASS (0 erreur)

- [ ] **Step 6: Lancer la suite complète**

Run: `npm test`
Expected: PASS (tous les tests existants + ceux des tâches précédentes,
aucune régression)

- [ ] **Step 7: Commit**

```bash
git add "app/ma-journee/[missionId]/page.tsx"
git commit -m "feat(patients): blocs photo sur la fiche patient"
```

- [ ] **Step 8: Vérification manuelle post-déploiement (contrôleur, avec autorisation explicite du fondateur)**

Après déploiement, avec autorisation explicite du fondateur — et une fois
la migration de ce chantier appliquée (s'ajoute aux 3 déjà en attente) :
envoyer une photo de test sur une mission `en_cours`/`terminee`,
confirmer qu'elle s'affiche immédiatement ; créer une seconde mission
pour le même patient et confirmer que "Dernière photo" s'affiche
correctement ; ré-envoyer une photo sur la même mission et confirmer que
l'ancienne est bien remplacée ; confirmer via un second compte IDEL que
ses photos restent inaccessibles à ce compte de test (RLS storage, pas
seulement RLS table).

---

## Résultat à la fin de ce plan

Depuis la fiche patient, une IDEL peut joindre une photo à une visite
(plaie, pansement...) et voir la photo de la visite précédente pour
comparer l'évolution — stockées dans un bucket privé, jamais accessibles
sans passer par une URL signée à courte durée de vie générée à la
demande. Ce chantier clôt les 4 mini-chantiers de "geste de fin de soin".
