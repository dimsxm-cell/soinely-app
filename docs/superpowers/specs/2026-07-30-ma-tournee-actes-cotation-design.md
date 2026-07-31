# Ma tournée — Actes multiples et cotation NGAP (lot A1) — Design

**Statut :** Design validé en dialogue avec la fondatrice (2026-07-30).

## Contexte

Le lot E (`docs/superpowers/specs/2026-07-30-ma-tournee-finitions-design.md`) a
rapproché `/ma-tournee` de sa maquette pour tout ce qui ne demandait aucune
migration. Il restait quatre lots, dont celui-ci, le plus visible : la maquette
montre chaque passage porteur de **plusieurs actes cotés** (`AIS 3 toilette`,
`AMI 1 insuline`) et un total « Cotation » en en-tête.

La fondatrice veut à terme le **total réellement facturable** — actes,
majorations et déplacements. Ce montant engage sa facturation à la CPAM : une
valeur fausse n'est pas un défaut d'affichage mais un risque d'indu. Le chemin
est donc découpé en trois, et ce document ne couvre que le premier :

- **A1** — modèle des actes, catalogue de codes, chips cotés sur les cartes ← **le présent document**
- **A2** — moteur de calcul : règle d'association des actes d'un même passage, majorations
- **A3** — déplacements : indemnité forfaitaire et indemnités kilométriques, après le lot B qui apporte les distances

**Aucun montant n'est affiché à l'issue d'A1.** La colonne « Cotation » de
l'en-tête attend d'être fiable pour apparaître.

## État des lieux

- `public.ngap_codes` (`code`, `libelle`, `cotation numeric(6,2)`, `conditions`)
  **existe depuis le schéma initial** et n'est lue par aucun code applicatif.
  Elle contient deux entrées seedées : `AMI 4` à 6,30 € et `AMI 1` à 3,15 €.
- `missions_du_jour` porte **un seul** `type_soin` en texte libre.
- `generation-tournee.ts` crée **une mission par soin prescrit** : deux soins à
  08:00 chez la même patiente produisent deux cartes, là où la maquette en
  montre une seule à deux chips.
- `type_soin` est le champ le plus transverse de l'application : plus de vingt
  fichiers le lisent, dont le dossier patient, le diagramme de soins, les
  transmissions, les prescriptions, la page d'accueil et le choix d'icône.

## Décisions actées avec la fondatrice

- **Une mission est un passage, pas un geste.** Le détail coté vit dans une
  table `actes_mission`. Le statut, la transmission, la photo et le rappel
  restent au niveau du passage : l'IDEL valide une fois, pas acte par acte.
- **`missions_du_jour.type_soin` est conservé** comme libellé de synthèse du
  passage. Les vingt fichiers qui le lisent ne bougent pas et l'historique
  reste intact. La même information existe donc à deux endroits : c'est une
  dénormalisation assumée, dont `generation-tournee.ts` est l'unique
  producteur.
- **Le libellé de synthèse joint les libellés d'actes** (« Toilette + Insuline »).
  N'y mettre que le premier acte ferait disparaître un soin du diagramme de
  soins à chaque passage groupé — une régression sur une page existante.
- **L'historique n'est ni fusionné ni réécrit.** La migration crée un acte par
  mission existante ; les passages passés ne sont pas regroupés rétroactivement.
- **Les valeurs de cotation vivent en base, jamais dans le code.** Une
  revalorisation NGAP ne doit pas exiger un redéploiement.
- **Le catalogue est alimenté par la liste de la fondatrice**, pas par une
  liste devinée. Voir « Donnée d'entrée manquante ».

## Architecture

### 1. Migration `supabase/migrations/20260730000000_actes_mission.sql`

```sql
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

-- Reprise de l'historique : un acte par mission existante, sans fusion.
insert into public.actes_mission (mission_id, libelle, ordre)
select id, type_soin, 0 from public.missions_du_jour;
```

`ngap_code_id` est nullable des deux côtés : un soin sans code reste valide, et
tout l'historique repris pointe sur `null`.

### 2. `lib/data/generation-tournee.ts` (modifié)

La génération regroupe par **patient et heure** au lieu de produire une mission
par soin :

- clé de regroupement : `${patient_id}|${heure_prevue}` ;
- une ligne `missions_du_jour` par groupe, dont `type_soin` vaut les libellés
  des actes joints par `" + "` ;
- une ligne `actes_mission` par soin du groupe, `ordre` suivant ce même ordre.

L'ordre des actes au sein d'un passage suit le `created_at` du soin prescrit —
la requête de `genererTourneeDuJour` gagne donc un `order("created_at")`
explicite. Sans lui, Postgres ne garantit aucun ordre : le libellé de synthèse
et les chips changeraient d'une génération à l'autre pour les mêmes données.

Deux invariants préservent le comportement actuel des compteurs :

- **les compteurs de `tournees`** (`nb_injections`, `nb_pansements`,
  `nb_glycemies`) sont calculés sur les **libellés d'actes**, pas sur le libellé
  de synthèse — sinon deux injections dans un même passage n'en compteraient
  qu'une ;
- **`temps_estime_min`** reste `DUREE_PAR_MISSION_MIN` multiplié par le nombre
  d'**actes**, non de passages : le regroupement supprime un déplacement, pas
  un temps de soin. Les deux valeurs restent donc identiques à celles
  d'aujourd'hui.

`nb_patients` compte toujours les patients distincts.

### 3. `lib/data/ma-journee.ts` (modifié)

```ts
export interface ActeVue {
  libelle: string;
  code: string | null; // « AIS 3 »
}
```

`MissionTourneeVue` gagne `actes: ActeVue[]`, triés par `ordre`.
`getMissionsTourneeVue` charge `actes_mission(libelle, ordre, ngap_codes(code))`
dans sa requête existante. `typeSoin` reste exposé : la carte ne l'utilise plus,
les autres écrans si.

`ActeVue` ne porte **pas** la valeur en euros : A1 n'affiche aucun montant, et
charger un champ que rien ne consomme est du code mort. A2 l'ajoutera quand le
calcul existera.

### 4. `components/ui/CarteMissionTournee.tsx` (modifié)

Le chip unique devient une rangée de chips, une par acte :

- **acte avec code** — le code en gras suivi du libellé (`AIS 3 toilette`),
  sans icône, comme la maquette ;
- **acte sans code** — le chip actuel, `IconeSoin` et libellé, ce qui couvre
  tout l'historique repris et les soins non encore cotés.

Le reste de la carte est inchangé.

### 5. Saisie du code à la prescription

- `app/(app)/patients/[id]/page.tsx:173` — le formulaire d'ajout d'un soin
  prescrit gagne un `<select name="ngapCodeId">` alimenté par `ngap_codes`,
  option vide en premier et sélectionnée par défaut : le code est facultatif.
- `lib/data/patients-actions.ts` — `ajouterSoinPrescritAction` lit ce champ et
  l'insère ; une valeur vide devient `null`.
- `lib/data/patients.ts` — la lecture des soins prescrits remonte le code, pour
  que la liste des soins de la fiche patient l'affiche à côté du libellé.

## Donnée d'entrée manquante

Le catalogue `ngap_codes` doit être étoffé par une migration de seed reprenant
la liste que la fondatrice fournira, au format `code | libellé | valeur en € |
conditions`, accompagnée de la date à laquelle ces valeurs ont été relevées —
cette date est stockée en commentaire de la migration pour qu'une revalorisation
future sache ce qui doit être revu.

Cette liste conditionne **la seule tâche de seed**. Table, génération, lecture,
affichage et sélecteur se construisent et se testent sans elle : les actes
pointent alors sur un code nul et s'affichent dans leur forme de repli. Le plan
d'implémentation isole donc cette tâche pour qu'elle soit la seule bloquée.

## Tests

- `lib/data/generation-tournee.test.ts` — deux soins pour un même patient à une
  même heure donnent **une** mission portant **deux** actes ordonnés ; le
  libellé de synthèse vaut « Toilette + Insuline » ; deux injections dans un
  même passage comptent **2** dans `nb_injections` ; `temps_estime_min` compte
  les actes ; deux soins à des heures différentes restent deux missions.
- `lib/data/ma-journee.test.ts` — `getMissionsTourneeVue` remonte les actes
  triés par `ordre`, avec `code` et `cotation` quand `ngap_code_id` est
  renseigné, à `null` sinon.
- `components/ui/CarteMissionTournee.test.tsx` — une mission à deux actes cotés
  affiche deux chips portant leur code ; un acte sans code affiche le chip de
  repli ; une mission mêlant les deux affiche les deux formes.
- `lib/data/patients-actions.test.ts` — `ajouterSoinPrescritAction` insère le
  `ngap_code_id` choisi, et `null` quand le champ est laissé vide.

## Hors périmètre

Montant en en-tête, règle d'association des actes d'un même passage,
majorations (nuit, dimanche et fériés, MAU, MCI), indemnité forfaitaire de
déplacement, indemnités kilométriques, kilomètres par mission — lots A2, A3 et B.
Le champ `patients.consignes` n'est pas touché : sa relecture a été explicitement
reportée.

## Vérification

- `npm test` — toute la suite passe, les nouveaux tests inclus
- `npm run lint` — aucun avertissement nouveau
- `npm run build` — la page compile
- Migration appliquée sur la base de développement, puis relecture de
  `/ma-tournee` par la fondatrice : un passage groupé affiche bien ses chips,
  et le diagramme de soins du patient n'a rien perdu
