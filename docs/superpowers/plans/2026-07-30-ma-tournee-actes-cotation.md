# Ma tournée — Actes multiples et cotation NGAP (lot A1) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une mission devient un passage porteur de plusieurs actes cotés, affichés en chips `AIS 3 toilette` sur la carte de tournée, sans qu'aucun montant ne soit encore calculé.

**Architecture:** Une table `actes_mission` porte le détail coté d'un passage ; `missions_du_jour.type_soin` est conservé comme libellé de synthèse pour les vingt fichiers qui le lisent. `generation-tournee.ts` regroupe désormais les soins prescrits par patient et par heure. La lecture, la carte et le formulaire de prescription suivent.

**Tech Stack:** Next.js 16.2.10 (App Router, React Server Components), React 19.2.4, TypeScript, Tailwind CSS v4, Supabase (Postgres + RLS), Vitest 4 + Testing Library (jsdom).

**Spec :** `docs/superpowers/specs/2026-07-30-ma-tournee-actes-cotation-design.md`

## Global Constraints

- Tout le code visible — identifiants, commentaires, libellés — est en **français**, y compris les noms de fonctions et de variables.
- Les tests sont **colocalisés** : `X.ts` → `X.test.ts`, `X.tsx` → `X.test.tsx`.
- Les composants concernés sont des **composants serveur** : aucun `"use client"`, aucun `useState`, aucun gestionnaire d'événement.
- Commande de test : `npm test`. Un fichier seul : `npx vitest run <chemin>`.
- **Aucun montant en euros n'est affiché, calculé ou même chargé** dans ce lot. La règle de cumul, les majorations et les déplacements sont les lots A2 et A3.
- `ngap_code_id` est **nullable partout** : un soin sans code reste valide, et tout l'historique repris pointe sur `null`.
- **Aucune migration n'est appliquée sur une base réelle par ce plan.** Les fichiers SQL sont écrits et relus ; c'est la fondatrice qui décide quand les appliquer. Tous les tests sont unitaires avec un faux client Supabase et ne touchent aucune base.
- Ne pas modifier `patients.consignes` ni les écrans qui lisent `type_soin` : leur relecture est explicitement reportée.
- **Commits** : les messages sont en français et contiennent des apostrophes, qui cassent le quoting du shell. Écrire le message dans un fichier avec l'outil Write, puis `git commit -F <ce fichier>`. Terminer par la ligne `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. N'ajouter que les fichiers de la tâche : jamais `git add -A` ni `git add .`.

---

## File Structure

| Fichier | Responsabilité |
|---|---|
| `supabase/migrations/20260730000000_actes_mission.sql` *(créé)* | Table `actes_mission`, `soins_prescrits.ngap_code_id`, colonnes `lettre_cle`/`coefficient`, reprise de l'historique |
| `supabase/migrations/20260730000100_ngap_codes_catalogue.sql` *(créé)* | Les dix codes du catalogue, dont la correction d'`AMI 4` |
| `supabase/seed.sql` *(modifié)* | Même catalogue, pour une base recréée de zéro |
| `lib/types/database.types.ts` *(modifié)* | Types générés à jour du nouveau schéma |
| `lib/data/generation-tournee.ts` *(modifié)* | Regroupement par patient et heure, insertion des actes |
| `lib/data/ma-journee.ts` *(modifié)* | `ActeVue`, `actes` dans `MissionTourneeVue` |
| `components/ui/CarteMissionTournee.tsx` *(modifié)* | Rangée de chips, un par acte |
| `lib/data/ngap.ts` *(créé)* | Lecture du catalogue pour le formulaire |
| `lib/data/patients.ts`, `lib/data/patients-actions.ts`, `app/(app)/patients/[id]/page.tsx` *(modifiés)* | Choix du code à la prescription |

---

### Task 1 : Migrations SQL et types

**Files:**
- Create: `supabase/migrations/20260730000000_actes_mission.sql`
- Create: `supabase/migrations/20260730000100_ngap_codes_catalogue.sql`
- Modify: `supabase/seed.sql:80-82`
- Modify: `lib/types/database.types.ts`

**Interfaces:**
- Consumes: rien
- Produces: la table `actes_mission (id, mission_id, libelle, ngap_code_id, ordre)` ; `soins_prescrits.ngap_code_id` ; `ngap_codes.lettre_cle`, `ngap_codes.coefficient` ; les types TypeScript correspondants dans `Database`

- [ ] **Step 1 : Écrire la migration de structure**

Créer `supabase/migrations/20260730000000_actes_mission.sql` :

```sql
-- Une mission est un passage : le détail coté vit dans actes_mission, tandis
-- que missions_du_jour.type_soin reste le libellé de synthèse lu par le
-- dossier patient, le diagramme de soins et les transmissions.
create table public.actes_mission (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions_du_jour(id) on delete cascade,
  libelle text not null,
  ngap_code_id uuid references public.ngap_codes(id),
  ordre int not null default 0
);

create index actes_mission_mission_id_idx on public.actes_mission(mission_id);

alter table public.actes_mission enable row level security;

create policy "actes_mission_owner_all" on public.actes_mission
  for all using (
    auth.uid() = (
      select t.idel_id
      from public.tournees t
      join public.missions_du_jour m on m.tournee_id = t.id
      where m.id = mission_id
    )
  ) with check (
    auth.uid() = (
      select t.idel_id
      from public.tournees t
      join public.missions_du_jour m on m.tournee_id = t.id
      where m.id = mission_id
    )
  );

alter table public.soins_prescrits
  add column ngap_code_id uuid references public.ngap_codes(id);

-- La règle de cumul du lot suivant classe les actes d'une même séance.
-- Ces colonnes sont ajoutées maintenant, pendant qu'on écrit les lignes du
-- catalogue : redécouper la chaîne « AMI 4 » à l'exécution échouerait sur
-- BSA, BSB, TLS et TLD, qui n'ont pas de coefficient.
alter table public.ngap_codes
  add column lettre_cle text,
  add column coefficient numeric(5,2);

-- Reprise de l'historique : un acte par mission existante, sans fusion des
-- passages passés.
insert into public.actes_mission (mission_id, libelle, ordre)
select id, type_soin, 0 from public.missions_du_jour;
```

- [ ] **Step 2 : Écrire la migration de catalogue**

Créer `supabase/migrations/20260730000100_ngap_codes_catalogue.sql`. Les deux
lignes déjà présentes sont mises à jour plutôt que rejetées : le seed initial
donne `AMI 4` à 6,30 €, qui est le tarif d'`AMI 2`.

```sql
-- Catalogue fourni par la fondatrice le 2026-07-30, source albus.fr.
-- Ces valeurs sont datées : une revalorisation NGAP doit repartir de cette date.
insert into public.ngap_codes (code, libelle, cotation, conditions, lettre_cle, coefficient) values
  ('AMI 1',  'Injection sous-cutanée ou intramusculaire',        3.15,  'Sur prescription médicale',                                          'AMI', 1),
  ('AMI 2',  'Pansement simple',                                 6.30,  'Soin technique courant sur plaie simple',                             'AMI', 2),
  ('AMI 4',  'Pansement lourd et complexe',                     12.60,  'Plaie nécessitant des conditions d''asepsie rigoureuses',             'AMI', 4),
  ('AMI 9',  'Pose de perfusion courte (≤ 1h)',                 28.35,  'Perfusion intraveineuse sur une durée inférieure ou égale à 1 heure', 'AMI', 9),
  ('AMI 14', 'Pose de perfusion longue (> 1h)',                 44.10,  'Perfusion nécessitant une surveillance continue de plus d''une heure', 'AMI', 14),
  ('AIS 3',  'Actes infirmiers de soins (ex. toilette, habillage)', 7.95, 'Pour un patient dépendant (selon critères transitoires / spécifiques)', 'AIS', 3),
  ('BSA',    'Forfait journalier prise en charge légère',       13.00,  'Patient dépendant ayant une charge en soins légère',                  'BSA', null),
  ('BSB',    'Forfait journalier prise en charge intermédiaire', 18.20, 'Patient dépendant ayant une charge en soins intermédiaire',           'BSB', null),
  ('TLS',    'Accompagnement téléconsultation (soin prévu)',    10.00,  'Cumulable avec un autre soin réalisé lors de la même séance',         'TLS', null),
  ('TLD',    'Accompagnement téléconsultation (à domicile)',    15.00,  'Réalisé à domicile sans autre soin, majorations de déplacement possibles', 'TLD', null)
on conflict (code) do update set
  libelle     = excluded.libelle,
  cotation    = excluded.cotation,
  conditions  = excluded.conditions,
  lettre_cle  = excluded.lettre_cle,
  coefficient = excluded.coefficient;
```

- [ ] **Step 3 : Corriger le seed initial**

Dans `supabase/seed.sql`, remplacer le bloc `insert into public.ngap_codes …`
(lignes 80-82, deux codes dont `AMI 4` à 6,30) par le même `insert … on conflict`
que la migration ci-dessus, afin qu'une base recréée de zéro ne réintroduise pas
la valeur fausse.

- [ ] **Step 4 : Mettre les types à jour**

Dans `lib/types/database.types.ts`, ajouter l'entrée `actes_mission` (`Row`,
`Insert`, `Update`) sur le modèle des tables voisines, ajouter `ngap_code_id:
string | null` aux trois formes de `soins_prescrits`, et `lettre_cle: string |
null` / `coefficient: number | null` à celles de `ngap_codes`. Dans `Insert`,
`id` et `ordre` sont optionnels ; `mission_id` et `libelle` sont requis.

- [ ] **Step 5 : Vérifier que tout compile**

Run: `npx tsc --noEmit`
Expected: aucune erreur. Puis `npm test` — la suite doit rester au vert (277/277) : aucun code applicatif n'a encore changé.

- [ ] **Step 6 : Commit**

```bash
git add supabase/migrations/20260730000000_actes_mission.sql supabase/migrations/20260730000100_ngap_codes_catalogue.sql supabase/seed.sql lib/types/database.types.ts
git commit -F <fichier de message>
```

Message : la table des actes, le catalogue daté, et la correction d'`AMI 4` dont la valeur en base était celle d'`AMI 2`.

---

### Task 2 : Génération de tournée groupée par passage

**Files:**
- Modify: `lib/data/generation-tournee.ts:55-127`
- Test: `lib/data/generation-tournee.test.ts:107-338`

**Interfaces:**
- Consumes: `actes_mission`, `soins_prescrits.ngap_code_id` (Task 1)
- Produces: `genererTourneeDuJour(supabase, idelId, date)` insère une ligne `missions_du_jour` par couple patient/heure, avec `type_soin` valant les libellés joints par `" + "`, puis une ligne `actes_mission` par soin du groupe (`libelle`, `ngap_code_id`, `ordre` à partir de 0)

- [ ] **Step 1 : Réécrire le faux client du test**

Dans `lib/data/generation-tournee.test.ts`, remplacer `buildFakeClient`
(lignes 108-139) par la version ci-dessous. Deux changements : la lecture des
soins se termine maintenant par `.order("created_at")`, et l'insertion des
missions est relue par `.select()` pour rattacher les actes.

```ts
  function buildFakeClient(soins: unknown[]) {
    const soinsOrderMock = vi.fn(() => Promise.resolve({ data: soins, error: null }));
    const soinsEqActifMock = vi.fn(() => ({ order: soinsOrderMock }));
    const soinsEqIdelMock = vi.fn(() => ({ eq: soinsEqActifMock }));
    const soinsSelectMock = vi.fn(() => ({ eq: soinsEqIdelMock }));

    const tourneeInsertMock = vi.fn(() => ({
      select: () => ({
        single: () => Promise.resolve({ data: { id: "t-nouvelle" }, error: null }),
      }),
    }));

    // Les missions insérées sont relues pour que leurs actes s'y rattachent :
    // le faux client rend un identifiant par ligne reçue.
    let lignesInserees: Array<Record<string, unknown>> = [];
    const missionsSelectMock = vi.fn(() =>
      Promise.resolve({
        data: lignesInserees.map((ligne, index) => ({
          id: `m-${index + 1}`,
          patient_id: ligne.patient_id,
          heure_prevue: ligne.heure_prevue,
        })),
        error: null,
      })
    );
    const missionsInsertMock = vi.fn((lignes: Array<Record<string, unknown>>) => {
      lignesInserees = lignes;
      return { select: missionsSelectMock };
    });

    const actesInsertMock = vi.fn().mockResolvedValue({ error: null });
    const tourneeDeleteEqMock = vi.fn().mockResolvedValue({ error: null });
    const tourneeDeleteMock = vi.fn(() => ({ eq: tourneeDeleteEqMock }));

    const fromMock = vi.fn((table: string) => {
      if (table === "soins_prescrits") return { select: soinsSelectMock };
      if (table === "tournees") return { insert: tourneeInsertMock, delete: tourneeDeleteMock };
      if (table === "missions_du_jour") return { insert: missionsInsertMock };
      if (table === "actes_mission") return { insert: actesInsertMock };
      throw new Error(`table inattendue : ${table}`);
    });

    const fakeClient = { from: fromMock } as unknown as SupabaseClient;

    return {
      fakeClient,
      soinsEqIdelMock,
      soinsEqActifMock,
      soinsOrderMock,
      tourneeInsertMock,
      missionsInsertMock,
      missionsSelectMock,
      actesInsertMock,
      tourneeDeleteEqMock,
    };
  }
```

- [ ] **Step 2 : Adapter les tests existants et écrire les nouveaux**

Toujours dans `lib/data/generation-tournee.test.ts` :

a) Dans le test « génère les missions des soins dus… » (ligne 151), les trois
soins portent désormais chacun un `ngap_code_id` (`null` pour les deux premiers,
`"c-glyc"` pour la glycémie), et les assertions deviennent :

```ts
    expect(tourneeInsertMock).toHaveBeenCalledWith({
      idel_id: "u1",
      date: "2026-07-15",
      nb_patients: 2,
      nb_injections: 0,
      nb_pansements: 1,
      nb_glycemies: 2,
      temps_estime_min: 60,
    });
    expect(missionsInsertMock).toHaveBeenCalledWith([
      {
        tournee_id: "t-nouvelle",
        patient_id: "p2",
        type_soin: "Glycémie",
        heure_prevue: "07:00:00",
        statut: "a_faire",
      },
      {
        tournee_id: "t-nouvelle",
        patient_id: "p1",
        type_soin: "Pansement",
        heure_prevue: "10:00:00",
        statut: "a_faire",
      },
      {
        tournee_id: "t-nouvelle",
        patient_id: "p2",
        type_soin: "Glycémie",
        heure_prevue: "19:00:00",
        statut: "a_faire",
      },
    ]);
```

b) Ajouter les tests suivants au `describe("genererTourneeDuJour")` :

```ts
  it("regroupe en un seul passage deux soins du même patient à la même heure", async () => {
    const soins = [
      {
        patient_id: "p1",
        type_soin: "Toilette",
        ngap_code_id: "c-ais3",
        frequence_type: "quotidien",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["08:00:00"],
        date_debut: "2026-07-01",
        date_fin: null,
      },
      {
        patient_id: "p1",
        type_soin: "Insuline",
        ngap_code_id: "c-ami1",
        frequence_type: "quotidien",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["08:00:00"],
        date_debut: "2026-07-01",
        date_fin: null,
      },
    ];
    const { fakeClient, missionsInsertMock, actesInsertMock } = buildFakeClient(soins);

    const { genererTourneeDuJour } = await import("./generation-tournee");
    await genererTourneeDuJour(fakeClient, "u1", "2026-07-15");

    expect(missionsInsertMock).toHaveBeenCalledWith([
      {
        tournee_id: "t-nouvelle",
        patient_id: "p1",
        type_soin: "Toilette + Insuline",
        heure_prevue: "08:00:00",
        statut: "a_faire",
      },
    ]);
    expect(actesInsertMock).toHaveBeenCalledWith([
      { mission_id: "m-1", libelle: "Toilette", ngap_code_id: "c-ais3", ordre: 0 },
      { mission_id: "m-1", libelle: "Insuline", ngap_code_id: "c-ami1", ordre: 1 },
    ]);
  });

  it("garde deux passages distincts pour deux heures différentes", async () => {
    const soins = [
      {
        patient_id: "p1",
        type_soin: "Toilette",
        ngap_code_id: null,
        frequence_type: "quotidien",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["08:00:00"],
        date_debut: "2026-07-01",
        date_fin: null,
      },
      {
        patient_id: "p1",
        type_soin: "Insuline",
        ngap_code_id: null,
        frequence_type: "quotidien",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["19:00:00"],
        date_debut: "2026-07-01",
        date_fin: null,
      },
    ];
    const { fakeClient, missionsInsertMock } = buildFakeClient(soins);

    const { genererTourneeDuJour } = await import("./generation-tournee");
    await genererTourneeDuJour(fakeClient, "u1", "2026-07-15");

    expect(missionsInsertMock.mock.calls[0][0]).toHaveLength(2);
  });

  it("compte deux injections d'un même passage comme deux injections", async () => {
    const soins = [
      {
        patient_id: "p1",
        type_soin: "Injection Lovenox",
        ngap_code_id: null,
        frequence_type: "quotidien",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["08:00:00"],
        date_debut: "2026-07-01",
        date_fin: null,
      },
      {
        patient_id: "p1",
        type_soin: "Injection insuline",
        ngap_code_id: null,
        frequence_type: "quotidien",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["08:00:00"],
        date_debut: "2026-07-01",
        date_fin: null,
      },
    ];
    const { fakeClient, tourneeInsertMock } = buildFakeClient(soins);

    const { genererTourneeDuJour } = await import("./generation-tournee");
    await genererTourneeDuJour(fakeClient, "u1", "2026-07-15");

    // Le libellé de synthèse ne contient qu'une fois le mot « injection » par
    // acte : compter sur lui en aurait perdu une.
    expect(tourneeInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ nb_injections: 2, temps_estime_min: 40 })
    );
  });

  it("lit les soins dans l'ordre de leur création", async () => {
    const { fakeClient, soinsOrderMock } = buildFakeClient([]);

    const { genererTourneeDuJour } = await import("./generation-tournee");
    await genererTourneeDuJour(fakeClient, "u1", "2026-07-15");

    expect(soinsOrderMock).toHaveBeenCalledWith("created_at");
  });

  it("supprime la tournée si l'insertion des actes échoue", async () => {
    const soins = [
      {
        patient_id: "p1",
        type_soin: "Pansement",
        ngap_code_id: null,
        frequence_type: "quotidien",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["10:00:00"],
        date_debut: "2026-07-01",
        date_fin: null,
      },
    ];
    const { fakeClient, actesInsertMock, tourneeDeleteEqMock } = buildFakeClient(soins);
    actesInsertMock.mockResolvedValueOnce({ error: { message: "boom" } });

    const { genererTourneeDuJour } = await import("./generation-tournee");
    await genererTourneeDuJour(fakeClient, "u1", "2026-07-15");

    expect(tourneeDeleteEqMock).toHaveBeenCalledWith("id", "t-nouvelle");
  });
```

c) Dans le test « supprime la tournée si l'insertion des missions échoue »
(ligne 317), l'échec se simule désormais sur la relecture :

```ts
    const { fakeClient, missionsSelectMock, tourneeDeleteEqMock } = buildFakeClient(soins);
    missionsSelectMock.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
```

d) Dans tous les autres soins des tests existants, ajouter `ngap_code_id: null`.

- [ ] **Step 3 : Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run lib/data/generation-tournee.test.ts`
Expected: FAIL — `table inattendue : actes_mission`, et les assertions de regroupement ne passent pas : le code produit encore une mission par soin.

- [ ] **Step 4 : Réécrire la génération**

Dans `lib/data/generation-tournee.ts`, remplacer l'interface `MissionAGenerer`
(lignes 50-54) et le corps de `genererTourneeDuJour` (lignes 55-127) par :

```ts
interface ActeAGenerer {
  libelle: string;
  ngap_code_id: string | null;
}

interface PassageAGenerer {
  patient_id: string;
  heure_prevue: string;
  actes: ActeAGenerer[];
}

export async function genererTourneeDuJour(
  supabase: SupabaseClient<Database>,
  idelId: string,
  date: string
): Promise<void> {
  const { data: soins, error: soinsError } = await supabase
    .from("soins_prescrits")
    .select(
      "patient_id, type_soin, ngap_code_id, frequence_type, jours_semaine, intervalle_jours, heures, date_debut, date_fin"
    )
    .eq("idel_id", idelId)
    .eq("actif", true)
    // Ordre explicite : sans lui Postgres n'en garantit aucun, et le libellé
    // de synthèse d'un passage changerait d'une génération à l'autre pour les
    // mêmes données.
    .order("created_at");

  if (soinsError) return;

  // Un passage = un patient à une heure. Deux soins prescrits à la même heure
  // chez le même patient sont deux actes d'un seul passage, pas deux visites.
  const passages = new Map<string, PassageAGenerer>();
  const patientsDistincts = new Set<string>();

  for (const soin of soins ?? []) {
    const recurrence: SoinRecurrence = {
      frequenceType: soin.frequence_type as FrequenceSoin,
      joursSemaine: soin.jours_semaine,
      intervalleJours: soin.intervalle_jours,
      dateDebut: soin.date_debut,
      dateFin: soin.date_fin,
    };

    if (!estSoinDuAujourdhui(recurrence, date)) continue;

    patientsDistincts.add(soin.patient_id);

    for (const heure of soin.heures) {
      const cle = `${soin.patient_id}|${heure}`;
      const acte: ActeAGenerer = {
        libelle: soin.type_soin,
        ngap_code_id: soin.ngap_code_id,
      };
      const passage = passages.get(cle);

      if (passage) passage.actes.push(acte);
      else passages.set(cle, { patient_id: soin.patient_id, heure_prevue: heure, actes: [acte] });
    }
  }

  const passagesTries = [...passages.values()].sort((a, b) =>
    a.heure_prevue.localeCompare(b.heure_prevue)
  );

  // Les compteurs se calculent sur les actes et non sur le libellé de synthèse :
  // deux injections dans un même passage doivent en compter deux.
  const compteurs = { nb_injections: 0, nb_pansements: 0, nb_glycemies: 0 };
  let nbActes = 0;

  for (const passage of passagesTries) {
    for (const acte of passage.actes) {
      nbActes += 1;
      const libelleMinuscule = acte.libelle.toLowerCase();
      for (const { cle, motif } of MOTS_CLES_COMPTEUR) {
        if (libelleMinuscule.includes(motif)) compteurs[cle] += 1;
      }
    }
  }

  const { data: tournee, error } = await supabase
    .from("tournees")
    .insert({
      idel_id: idelId,
      date,
      nb_patients: patientsDistincts.size,
      nb_injections: compteurs.nb_injections,
      nb_pansements: compteurs.nb_pansements,
      nb_glycemies: compteurs.nb_glycemies,
      // Le regroupement supprime un déplacement, pas un temps de soin : la
      // durée reste comptée par acte.
      temps_estime_min: nbActes * DUREE_PAR_MISSION_MIN,
    })
    .select("id")
    .single();

  if (error || !tournee) return;

  if (passagesTries.length === 0) return;

  const { data: missionsCreees, error: missionsError } = await supabase
    .from("missions_du_jour")
    .insert(
      passagesTries.map((passage) => ({
        tournee_id: tournee.id,
        patient_id: passage.patient_id,
        type_soin: passage.actes.map((acte) => acte.libelle).join(" + "),
        heure_prevue: passage.heure_prevue,
        statut: "a_faire",
      }))
    )
    .select("id, patient_id, heure_prevue");

  if (missionsError || !missionsCreees) {
    await supabase.from("tournees").delete().eq("id", tournee.id);
    return;
  }

  const idParPassage = new Map(
    missionsCreees.map((mission) => [`${mission.patient_id}|${mission.heure_prevue}`, mission.id])
  );

  const actes = passagesTries.flatMap((passage) => {
    const missionId = idParPassage.get(`${passage.patient_id}|${passage.heure_prevue}`);
    if (!missionId) return [];
    return passage.actes.map((acte, index) => ({
      mission_id: missionId,
      libelle: acte.libelle,
      ngap_code_id: acte.ngap_code_id,
      ordre: index,
    }));
  });

  const { error: actesError } = await supabase.from("actes_mission").insert(actes);

  if (actesError) {
    // La suppression de la tournée emporte ses missions et leurs actes par
    // cascade : une tournée sans actes vaut moins que pas de tournée du tout.
    await supabase.from("tournees").delete().eq("id", tournee.id);
  }
}
```

- [ ] **Step 5 : Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run lib/data/generation-tournee.test.ts`
Expected: PASS — 14 tests (9 existants adaptés + 5 nouveaux).

- [ ] **Step 6 : Commit**

```bash
git add lib/data/generation-tournee.ts lib/data/generation-tournee.test.ts
git commit -F <fichier de message>
```

Message : une mission devient un passage ; les compteurs et la durée restent calculés sur les actes pour ne pas changer de valeur.

---

### Task 3 : Lecture des actes dans la vue de tournée

**Files:**
- Modify: `lib/data/ma-journee.ts:283-360`
- Test: `lib/data/ma-journee.test.ts`

**Interfaces:**
- Consumes: `actes_mission` (Task 1), alimentée par la génération (Task 2)
- Produces:
  ```ts
  export interface ActeVue {
    libelle: string;
    code: string | null;
  }
  ```
  et `MissionTourneeVue.actes: ActeVue[]`, triés par `ordre`

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter à `lib/data/ma-journee.test.ts` :

```ts
describe("getMissionsTourneeVue", () => {
  function fakeClientAvecMissions(rows: unknown[]) {
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: rows, error: null }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;
  }

  const patient = {
    nom_complet: "Mme Dupont",
    adresse: "12 rue des Lilas",
    telephone: "06 12 34 56 78",
    allergies: null,
    consignes: null,
    date_naissance: "1944-03-12",
  };

  it("remonte les actes triés par ordre, avec leur code NGAP", async () => {
    const fakeClient = fakeClientAvecMissions([
      {
        id: "m1",
        patient_id: "p1",
        type_soin: "Toilette + Insuline",
        heure_prevue: "08:00:00",
        statut: "a_faire",
        mission_clinique_id: null,
        patients: patient,
        missions_cliniques: null,
        actes_mission: [
          { libelle: "Insuline", ordre: 1, ngap_codes: { code: "AMI 1" } },
          { libelle: "Toilette", ordre: 0, ngap_codes: { code: "AIS 3" } },
        ],
      },
    ]);

    const { getMissionsTourneeVue } = await import("./ma-journee");
    const missions = await getMissionsTourneeVue(fakeClient, "t1");

    expect(missions[0].actes).toEqual([
      { libelle: "Toilette", code: "AIS 3" },
      { libelle: "Insuline", code: "AMI 1" },
    ]);
  });

  it("rend un code nul pour un acte sans cotation", async () => {
    const fakeClient = fakeClientAvecMissions([
      {
        id: "m1",
        patient_id: "p1",
        type_soin: "Pansement",
        heure_prevue: "10:00:00",
        statut: "a_faire",
        mission_clinique_id: null,
        patients: patient,
        missions_cliniques: null,
        actes_mission: [{ libelle: "Pansement", ordre: 0, ngap_codes: null }],
      },
    ]);

    const { getMissionsTourneeVue } = await import("./ma-journee");
    const missions = await getMissionsTourneeVue(fakeClient, "t1");

    expect(missions[0].actes).toEqual([{ libelle: "Pansement", code: null }]);
  });

  it("rend une liste d'actes vide quand la mission n'en porte aucun", async () => {
    const fakeClient = fakeClientAvecMissions([
      {
        id: "m1",
        patient_id: "p1",
        type_soin: "Pansement",
        heure_prevue: "10:00:00",
        statut: "a_faire",
        mission_clinique_id: null,
        patients: patient,
        missions_cliniques: null,
        actes_mission: null,
      },
    ]);

    const { getMissionsTourneeVue } = await import("./ma-journee");
    const missions = await getMissionsTourneeVue(fakeClient, "t1");

    expect(missions[0].actes).toEqual([]);
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run lib/data/ma-journee.test.ts -t "actes"`
Expected: FAIL — `missions[0].actes` vaut `undefined`.

- [ ] **Step 3 : Implémenter**

Dans `lib/data/ma-journee.ts`, section « Vue enrichie pour la page Ma tournée » :

a) déclarer le type et l'ajouter à l'interface existante :

```ts
export interface ActeVue {
  libelle: string;
  code: string | null;
}
```

`MissionTourneeVue` gagne `actes: ActeVue[];`. Le champ `typeSoin` **reste** :
la carte ne l'utilise plus, les autres écrans si.

`ActeVue` ne porte pas la valeur en euros : ce lot n'affiche aucun montant, et
charger un champ que rien ne consomme serait du code mort. A2 l'ajoutera.

b) dans `getMissionsTourneeVue`, étendre le `select` :

```ts
      "id, patient_id, type_soin, heure_prevue, statut, mission_clinique_id, patients(nom_complet, adresse, telephone, allergies, consignes, date_naissance), missions_cliniques(duree_estimee_min), actes_mission(libelle, ordre, ngap_codes(code))"
```

c) dans le `map`, avant le `return`, construire les actes :

```ts
    type ActeRow = {
      libelle: string;
      ordre: number;
      ngap_codes: { code: string } | { code: string }[] | null;
    };

    const actesEmbed = (row.actes_mission ?? []) as ActeRow[];
    const actes: ActeVue[] = [...actesEmbed]
      .sort((a, b) => a.ordre - b.ordre)
      .map((acte) => {
        const codeEmbed = acte.ngap_codes;
        const ngap = Array.isArray(codeEmbed) ? codeEmbed[0] : codeEmbed;
        return { libelle: acte.libelle, code: ngap?.code ?? null };
      });
```

puis ajouter `actes,` à l'objet retourné.

d) `actes` est un champ **requis** de `MissionTourneeVue` : les fabriques de
test qui construisent cet objet ne compilent plus sans lui. Ajouter `actes: []`
à `creerMission` dans `components/ui/CarteMissionTournee.test.tsx` **et** à
`creerMission` dans `components/ui/EnTeteTournee.test.tsx`. Vitest efface les
types à l'exécution et ne le signalerait pas — c'est `npx tsc --noEmit` et
`npm run build` qui échoueraient.

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run lib/data/ma-journee.test.ts`
Expected: PASS — les 3 nouveaux tests et tous les existants.

Run: `npx tsc --noEmit`
Expected: aucune erreur — c'est ce qui prouve que les deux fabriques ont bien été complétées.

- [ ] **Step 5 : Commit**

```bash
git add lib/data/ma-journee.ts lib/data/ma-journee.test.ts
git commit -F <fichier de message>
```

---

### Task 4 : Chips cotés sur la carte de mission

**Files:**
- Modify: `components/ui/CarteMissionTournee.tsx:119-131`
- Test: `components/ui/CarteMissionTournee.test.tsx`

**Interfaces:**
- Consumes: `MissionTourneeVue.actes: ActeVue[]` avec `ActeVue = { libelle: string; code: string | null }` (Task 3)
- Produces: rien

- [ ] **Step 1 : Écrire les tests qui échouent**

Dans `components/ui/CarteMissionTournee.test.tsx`, ajouter `actes: []` à la
fabrique `creerMission` existante, puis ajouter :

```ts
describe("CarteMissionTournee — actes", () => {
  it("affiche un chip par acte, code en tête", () => {
    render(
      <CarteMissionTournee
        mission={creerMission({
          actes: [
            { libelle: "toilette", code: "AIS 3" },
            { libelle: "insuline", code: "AMI 1" },
          ],
        })}
        estDerniere={false}
      />
    );

    expect(screen.getByText("AIS 3")).toBeInTheDocument();
    expect(screen.getByText("toilette")).toBeInTheDocument();
    expect(screen.getByText("AMI 1")).toBeInTheDocument();
    expect(screen.getByText("insuline")).toBeInTheDocument();
  });

  it("affiche le libellé seul pour un acte sans cotation", () => {
    render(
      <CarteMissionTournee
        mission={creerMission({ actes: [{ libelle: "Pansement", code: null }] })}
        estDerniere={false}
      />
    );

    expect(screen.getByText("Pansement")).toBeInTheDocument();
  });

  it("mêle les deux formes quand un acte est coté et l'autre non", () => {
    render(
      <CarteMissionTournee
        mission={creerMission({
          actes: [
            { libelle: "toilette", code: "AIS 3" },
            { libelle: "Pansement", code: null },
          ],
        })}
        estDerniere={false}
      />
    );

    expect(screen.getByText("AIS 3")).toBeInTheDocument();
    expect(screen.getByText("toilette")).toBeInTheDocument();
    expect(screen.getByText("Pansement")).toBeInTheDocument();
  });

  it("se rabat sur le libellé de synthèse quand la mission ne porte aucun acte", () => {
    render(
      <CarteMissionTournee
        mission={creerMission({ typeSoin: "Pansement", actes: [] })}
        estDerniere={false}
      />
    );

    expect(screen.getByText("Pansement")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run components/ui/CarteMissionTournee.test.tsx`
Expected: FAIL — TypeScript refuse `actes` sur le type de la fabrique tant que Task 3 n'est pas là ; une fois compilé, `getByText("AIS 3")` ne trouve rien.

- [ ] **Step 3 : Implémenter**

Dans `components/ui/CarteMissionTournee.tsx`, remplacer le bloc « Chip du soin »
(le `div` à `flex flex-wrap gap-1.5` et son unique `span`) par :

```tsx
          {/* Un chip par acte. Le code NGAP porte l'information de facturation :
              il passe en tête, en gras. Un acte sans code — tout l'historique
              repris — garde l'icône et le libellé seuls. */}
          <div className="flex flex-wrap gap-1.5">
            {mission.actes.length > 0 ? (
              mission.actes.map((acte, index) => (
                <span
                  key={`${acte.libelle}-${index}`}
                  className="inline-flex items-center gap-1.5 rounded-[8px] bg-navy/[0.05] px-2.5 py-1 text-[12px] font-medium text-navy/65"
                >
                  {acte.code ? (
                    <span className="font-bold text-navy/80">{acte.code}</span>
                  ) : (
                    <IconeSoin
                      typeSoin={acte.libelle}
                      className="h-3.5 w-3.5 text-brand-violet"
                    />
                  )}
                  {acte.libelle}
                </span>
              ))
            ) : (
              // Repli : une mission sans acte n'existe pas après la migration,
              // mais une carte muette serait pire qu'un libellé de synthèse.
              <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-navy/[0.05] px-2.5 py-1 text-[12px] font-medium text-navy/65">
                <IconeSoin
                  typeSoin={mission.typeSoin}
                  className="h-3.5 w-3.5 text-brand-violet"
                />
                {mission.typeSoin}
              </span>
            )}
          </div>
```

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run components/ui/CarteMissionTournee.test.tsx`
Expected: PASS — 14 tests (10 existants + 4 nouveaux).

- [ ] **Step 5 : Commit**

```bash
git add components/ui/CarteMissionTournee.tsx components/ui/CarteMissionTournee.test.tsx
git commit -F <fichier de message>
```

---

### Task 5 : Choix du code NGAP à la prescription

**Files:**
- Create: `lib/data/ngap.ts`
- Create: `lib/data/ngap.test.ts`
- Modify: `lib/data/patients-actions.ts:95-152`
- Modify: `lib/data/patients.ts:79-104`
- Modify: `lib/types/clinical.ts:55-66`
- Modify: `app/(app)/patients/[id]/page.tsx:171-175`
- Test: `lib/data/patients-actions.test.ts:183-213`

**Interfaces:**
- Consumes: `soins_prescrits.ngap_code_id`, `ngap_codes` (Task 1)
- Produces:
  ```ts
  export interface CodeNgap { id: string; code: string; libelle: string }
  export async function getCodesNgap(supabase: SupabaseClient<Database>): Promise<CodeNgap[]>
  ```
  et `SoinPrescrit.ngapCodeId: string | null`

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `lib/data/ngap.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("getCodesNgap", () => {
  it("mappe les colonnes et trie par code", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          order: () =>
            Promise.resolve({
              data: [
                { id: "c1", code: "AIS 3", libelle: "Actes infirmiers de soins" },
                { id: "c2", code: "AMI 1", libelle: "Injection" },
              ],
              error: null,
            }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getCodesNgap } = await import("./ngap");
    const codes = await getCodesNgap(fakeClient);

    expect(codes).toEqual([
      { id: "c1", code: "AIS 3", libelle: "Actes infirmiers de soins" },
      { id: "c2", code: "AMI 1", libelle: "Injection" },
    ]);
  });

  it("rend une liste vide quand la lecture échoue", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          order: () => Promise.resolve({ data: null, error: { message: "boom" } }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getCodesNgap } = await import("./ngap");
    expect(await getCodesNgap(fakeClient)).toEqual([]);
  });
});
```

Dans `lib/data/patients-actions.test.ts`, ajouter au `describe("createSoinPrescritAction")` :

```ts
  it("enregistre le code NGAP choisi", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    singleInsertMock.mockResolvedValue({ data: { id: "s3" }, error: null });

    const { createSoinPrescritAction } = await import("./patients-actions");

    const formData = new FormData();
    formData.set("patientId", "p1");
    formData.set("typeSoin", "Toilette");
    formData.set("frequenceType", "quotidien");
    formData.set("heures", "08:00");
    formData.set("dateDebut", "2026-07-15");
    formData.set("ngapCodeId", "c-ais3");

    await createSoinPrescritAction(formData);

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ ngap_code_id: "c-ais3" })
    );
  });

  it("enregistre un code nul quand aucune cotation n'est choisie", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    singleInsertMock.mockResolvedValue({ data: { id: "s4" }, error: null });

    const { createSoinPrescritAction } = await import("./patients-actions");

    const formData = new FormData();
    formData.set("patientId", "p1");
    formData.set("typeSoin", "Toilette");
    formData.set("frequenceType", "quotidien");
    formData.set("heures", "08:00");
    formData.set("dateDebut", "2026-07-15");
    formData.set("ngapCodeId", "");

    await createSoinPrescritAction(formData);

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ ngap_code_id: null })
    );
  });
```

Les deux tests existants du même `describe` attendent un objet exact : leur
ajouter `ngap_code_id: null`.

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run lib/data/ngap.test.ts lib/data/patients-actions.test.ts`
Expected: FAIL — `Failed to resolve import "./ngap"`, et `ngap_code_id` absent de l'objet inséré.

- [ ] **Step 3 : Implémenter**

a) Créer `lib/data/ngap.ts` :

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

export interface CodeNgap {
  id: string;
  code: string;
  libelle: string;
}

export async function getCodesNgap(supabase: SupabaseClient<Database>): Promise<CodeNgap[]> {
  const { data, error } = await supabase
    .from("ngap_codes")
    .select("id, code, libelle")
    .order("code");

  if (error || !data) return [];

  return data.map((row) => ({ id: row.id, code: row.code, libelle: row.libelle }));
}
```

b) Dans `lib/data/patients-actions.ts`, `createSoinPrescritAction` : lire le
champ juste après `dateFin`, et l'ajouter à l'objet inséré.

```ts
  // Cotation facultative : un soin peut exister sans code NGAP.
  const ngapCodeId = String(formData.get("ngapCodeId") ?? "") || null;
```

```ts
      date_fin: dateFin,
      ngap_code_id: ngapCodeId,
```

c) Dans `lib/types/clinical.ts`, `SoinPrescrit` gagne `ngapCodeId: string | null;`
et `ngapCode: string | null;` — l'identifiant pour les formulaires, le code
lisible pour l'affichage.

d) Dans `lib/data/patients.ts`, étendre le `select` avec `ngap_code_id,
ngap_codes(code)` et compléter le mapping :

```ts
    const ngapEmbed = row.ngap_codes as { code: string } | { code: string }[] | null;
    const ngap = Array.isArray(ngapEmbed) ? ngapEmbed[0] : ngapEmbed;
```

puis, dans l'objet retourné : `ngapCodeId: row.ngap_code_id,` et
`ngapCode: ngap?.code ?? null,`.

e) Dans `app/(app)/patients/[id]/page.tsx`, charger le catalogue à côté des
autres lectures de la page :

```tsx
import { getCodesNgap } from "@/lib/data/ngap";
```

```tsx
  const codesNgap = await getCodesNgap(supabase);
```

et insérer, dans le formulaire, juste après le champ « Type de soin » :

```tsx
          <label className="flex flex-col gap-1 text-sm text-navy">
            Cotation NGAP (facultatif)
            <select
              name="ngapCodeId"
              defaultValue=""
              className="rounded-card border border-navy/20 p-2"
            >
              <option value="">Aucune</option>
              {codesNgap.map((code) => (
                <option key={code.id} value={code.id}>
                  {code.code} — {code.libelle}
                </option>
              ))}
            </select>
          </label>
```

Enfin, dans la liste des soins prescrits de cette même page, afficher le code
quand il existe, à côté du libellé du soin (ligne 134,
`<p className="text-navy">{soin.typeSoin}</p>`) :

```tsx
                  <p className="text-navy">
                    {soin.ngapCode ? `${soin.ngapCode} — ` : ""}
                    {soin.typeSoin}
                  </p>
```

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run lib/data/ngap.test.ts lib/data/patients-actions.test.ts`
Expected: PASS.

- [ ] **Step 5 : Vérifier l'ensemble**

Run: `npm test`
Expected: toute la suite au vert.

Run: `npm run lint`
Expected: aucune erreur, aucun avertissement nouveau.

Run: `npm run build`
Expected: build réussi.

- [ ] **Step 6 : Commit**

```bash
git add lib/data/ngap.ts lib/data/ngap.test.ts lib/data/patients-actions.ts lib/data/patients-actions.test.ts lib/data/patients.ts lib/types/clinical.ts "app/(app)/patients/[id]/page.tsx"
git commit -F <fichier de message>
```

---

## Vérification finale

- [ ] `npm test` — suite complète au vert
- [ ] `npm run lint` — propre
- [ ] `npm run build` — compile
- [ ] `git diff main --stat` — seuls les fichiers de la table File Structure apparaissent
- [ ] **Les deux migrations n'ont pas été appliquées** : c'est la fondatrice qui décide du moment. Le rapport final doit le rappeler, avec la commande qu'elle utilisera (`npx supabase db push`) et l'ordre des deux fichiers.
- [ ] Après application, relecture de `/ma-tournee` : un passage groupé affiche ses chips cotés, et le diagramme de soins du patient n'a rien perdu.

## Note d'exécution

Les tâches sont séquentielles : Task 2 dépend des types de Task 1, Task 4 du
type `ActeVue` de Task 3. Ne pas les paralléliser.
