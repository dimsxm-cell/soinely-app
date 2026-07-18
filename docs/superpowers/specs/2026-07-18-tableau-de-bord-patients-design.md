# Tableau de bord Patients — Design

**Statut :** Design validé en dialogue avec le fondateur (2026-07-18). Reste
à valider : ce document écrit, avant de passer au plan d'implémentation.

## Contexte

Depuis le début du projet, la création de patients, tournées et soins
n'existe nulle part dans l'app — reporté explicitement comme hors scope
dans "Fiche patient v2"
(`docs/superpowers/specs/2026-07-16-fiche-patient-v2-design.md` : "Création
/suppression de patient depuis l'UI (toujours hors scope, comme au chantier
1)") et dans "Écran Arrivée chez le patient" avant lui. Toute la patientèle
de test (`patients`, `tournees`, `missions_du_jour`) est peuplée à la main
en SQL. Une IDEL qui s'inscrit aujourd'hui — même après avoir payé —
atterrit sur un `/ma-journee` vide, sans aucun moyen d'y ajouter quoi que
ce soit.

Ce chantier fait suite à une demande du fondateur de repenser le parcours
post-inscription : retirer le mur de paiement immédiat au profit d'un
questionnaire d'onboarding menant à un vrai tableau de bord. Il couvre la
partie "tableau de bord" seule — le parcours d'inscription/paiement est un
chantier séparé, traité ensuite. Il répond à trois besoins exprimés :
créer des fiches patients complètes, définir les soins à administrer à
chacun, et générer automatiquement la tournée du jour à partir de ces
soins.

## Décisions actées avec le fondateur

- **Champs ajoutés à la fiche patient** (au-delà de l'existant : nom,
  adresse, téléphone, allergies, consignes, date de naissance) : médecin
  traitant (nom + téléphone), contact d'urgence (nom + téléphone),
  antécédents/pathologies, traitements en cours. Tous des champs texte
  libre, tous optionnels.
- **Soins prescrits = nouvelle notion, détachée des missions du jour.** Un
  soin prescrit décrit une récurrence ("pansement tous les 2 jours à
  10h") ; les missions du jour restent des occurrences concrètes générées
  à partir de ces soins — aucun changement de forme sur `missions_du_jour`
  au-delà de la façon dont elle est alimentée.
- **Quatre types de récurrence supportés**, choisis explicitement par le
  fondateur plutôt qu'un sous-ensemble : jours de semaine précis, tous les
  X jours, quotidien (avec une ou plusieurs heures dans la journée), et
  ponctuel (une seule occurrence, à une date donnée).
- **Date de fin optionnelle** par soin — vide = continu jusqu'à arrêt
  manuel (`actif = false`), renseignée = le soin s'arrête automatiquement
  après cette date (ordonnance à durée limitée).
- **Génération automatique de la tournée du jour, sans bouton ni
  confirmation** : à l'ouverture de `/ma-journee` un jour donné, si aucune
  tournée n'existe encore pour ce jour, elle est calculée et créée à la
  volée à partir des soins actifs dus ce jour-là — même principe de "pas
  de friction" déjà acté pour "Terminer"/"Absence" dans "Fiche patient
  v2".
- **Aucun ajustement manuel de la tournée générée dans ce chantier**
  (ajout d'une visite exceptionnelle, retrait, réordonnancement) — le
  statut `absent` déjà existant permet déjà de sauter un patient présent
  à tort. Chantier séparé si le besoin se confirme.
- **Durée estimée par défaut** : faute de champ dédié, chaque mission
  générée compte pour 20 minutes dans `temps_estime_min` (valeur codée en
  dur, ajustable plus tard si le besoin d'un champ par soin se confirme).
- **Comptage des statistiques du jour** (`nb_injections`, `nb_pansements`,
  `nb_glycemies`) : calculé par correspondance insensible à la casse sur
  des mots-clés dans `type_soin` ("pansement", "injection", "glyc") —
  cohérent avec le fait que `type_soin` reste un texte libre (ex.
  "Injection Lovenox" compte comme une injection). Un soin qui ne
  correspond à aucun mot-clé compte dans `nb_patients` mais dans aucun des
  trois compteurs spécifiques.

## Architecture

### Migration (nouvelle)

```sql
-- Fiche patient complète.
alter table public.patients
  add column medecin_nom text,
  add column medecin_telephone text,
  add column contact_urgence_nom text,
  add column contact_urgence_telephone text,
  add column antecedents text,
  add column traitements_en_cours text;

-- Soins prescrits : récurrence détachée des missions concrètes.
create table public.soins_prescrits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  idel_id uuid not null references public.profiles(id) on delete cascade,
  type_soin text not null,
  frequence_type text not null check (frequence_type in ('jours_semaine', 'tous_les_x_jours', 'quotidien', 'ponctuel')),
  jours_semaine int[],
  intervalle_jours int,
  heures time[] not null,
  date_debut date not null default current_date,
  date_fin date,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  check (
    (frequence_type = 'jours_semaine' and jours_semaine is not null and intervalle_jours is null)
    or (frequence_type = 'tous_les_x_jours' and intervalle_jours is not null and jours_semaine is null)
    or (frequence_type in ('quotidien', 'ponctuel') and jours_semaine is null and intervalle_jours is null)
  )
);

alter table public.soins_prescrits enable row level security;

create policy "soins_prescrits_owner_all" on public.soins_prescrits
  for all using (auth.uid() = idel_id) with check (auth.uid() = idel_id);
```

`idel_id` dupliqué sur `soins_prescrits` (plutôt qu'une jointure via
`patient_id` pour la policy RLS) — même convention que `patients.idel_id`
et `tournees.idel_id`, déjà établie dans ce projet plutôt que des
politiques RLS avec sous-requêtes.

`jours_semaine` utilise la convention `Date.getDay()` de JavaScript (0 =
dimanche … 6 = samedi), pour éviter toute couche de traduction entre le
stockage et le calcul de récurrence.

### Types (`lib/types/clinical.ts`, modifié)

- `Patient` gagne : `medecinNom`, `medecinTelephone`,
  `contactUrgenceNom`, `contactUrgenceTelephone`, `antecedents`,
  `traitementsEnCours` (tous `string | null`).
- Nouveau type `FrequenceSoin = "jours_semaine" | "tous_les_x_jours" |
  "quotidien" | "ponctuel"`.
- Nouveau type `SoinPrescrit` : `id`, `patientId`, `typeSoin`,
  `frequenceType: FrequenceSoin`, `joursSemaine: number[] | null`,
  `intervalleJours: number | null`, `heures: string[]`, `dateDebut:
  string`, `dateFin: string | null`, `actif: boolean`.

### Couche données (nouveau : `lib/data/patients.ts`)

- `getPatients(supabase, idelId)` : liste des patients de l'IDEL, triés
  par nom.
- `getPatient(supabase, patientId)` : une fiche patient complète (ou
  `null`).
- `getSoinsPrescrits(supabase, patientId)` : tous les soins prescrits
  d'un patient, actifs et arrêtés, triés par date de création
  décroissante.

### Server Actions (nouveau : `lib/data/patients-actions.ts`)

- `createPatientAction(formData)` : insère une ligne `patients` avec
  `idel_id` = utilisateur courant, redirige vers la fiche créée
  (`/patients/[id]`).
- `updatePatientAction(formData)` : met à jour les champs de la fiche
  patient (y compris les champs ajoutés par ce chantier), revalide
  `/patients/[id]`.
- `createSoinPrescritAction(formData)` : lit `patientId`, `typeSoin`,
  `frequenceType`, et les champs pertinents selon le type
  (`joursSemaine` en cases à cocher, `intervalleJours`, `heures` en une
  ou plusieurs entrées, `dateDebut`, `dateFin`), insère la ligne, rejette
  (sans écrire) une `dateFin` antérieure à `dateDebut`, revalide
  `/patients/[id]`.
- `arreterSoinPrescritAction(formData)` : lit `soinId`, met `actif =
  false`, revalide `/patients/[id]`.

### Génération automatique de la tournée

`getTourneeDuJour(supabase, idelId, date)` (existant, `lib/data/ma-journee.ts`,
modifié) : si aucune ligne `tournees` pour `(idel_id, date)`, appelle
`genererTourneeDuJour` avant de relire — comportement transparent pour
l'appelant (`app/ma-journee/page.tsx` ne change pas).

`genererTourneeDuJour(supabase, idelId, date)` (nouveau, `lib/data/generation-tournee.ts`) :

1. Charge tous les `soins_prescrits` actifs (`actif = true`) dont l'IDEL
   est propriétaire, avec le patient associé.
2. Pour chacun, calcule s'il est dû à `date` selon `frequence_type` :
   - `ponctuel` : dû si `date_debut === date`.
   - `quotidien` : dû si `date >= date_debut` et (`date_fin` est `null`
     ou `date <= date_fin`).
   - `jours_semaine` : dû si le jour de la semaine de `date` est dans
     `jours_semaine`, et `date` dans la plage `date_debut`/`date_fin`.
   - `tous_les_x_jours` : dû si `(date - date_debut) % intervalle_jours
     === 0` (différence en jours), et `date` dans la plage
     `date_debut`/`date_fin`.
3. Pour chaque soin dû, crée une mission par heure dans `heures` (un
   soin avec 2 heures → 2 missions), avec `patient_id`, `type_soin`,
   `heure_prevue`, `statut: 'a_faire'`.
4. Trie l'ensemble des missions générées par `heure_prevue`.
5. Calcule les statistiques : `nb_patients` (patients distincts),
   `nb_injections`/`nb_pansements`/`nb_glycemies` (correspondance de
   mots-clés sur `type_soin`, voir Décisions), `temps_estime_min` (20 ×
   nombre de missions générées).
6. Insère la ligne `tournees` puis les lignes `missions_du_jour`
   (séquentiellement — Supabase-js n'expose pas de transaction
   multi-requêtes côté client ; si un plan alternatif existe au moment de
   l'implémentation, il peut être adopté sans revenir sur ce design).
7. Si aucun soin n'est dû ce jour-là : crée quand même une ligne
   `tournees` avec toutes les statistiques à 0, pour ne pas recalculer à
   chaque rafraîchissement de page le même jour.

### Pages (nouveau)

- `/patients` : liste des patients (nom, adresse), lien vers chaque
  fiche, bouton "Ajouter un patient" vers `/patients/nouveau`.
- `/patients/nouveau` : formulaire de création (tous les champs de la
  fiche patient), soumet `createPatientAction`.
- `/patients/[id]` : fiche patient complète (affichage + édition des
  champs via `updatePatientAction`), section "Soins prescrits" listant
  les soins actifs et arrêtés séparément, formulaire d'ajout d'un soin
  (`createSoinPrescritAction`) dont les champs affichés changent selon le
  type de récurrence choisi, bouton "Arrêter" sur chaque soin actif
  (`arreterSoinPrescritAction`).

### Nav (`app/ma-journee/page.tsx`, modifié)

Ajoute un lien "Patients" vers `/patients`, à côté des liens existants
(Rechercher, Ely, Parcourir, Mon compte).

### `proxy.ts` (modifié)

`/patients` ajouté à `AUTH_REQUIRED_PATHS` et
`SUBSCRIPTION_REQUIRED_PATHS` — même traitement que `/ma-journee`,
`/recherche`, etc. (connexion et abonnement essai/actif requis).

## Gestion des cas limites

- Patient sans aucun soin prescrit actif : aucune mission générée pour
  lui, n'apparaît pas dans la tournée du jour tant qu'aucun soin n'est
  ajouté.
- Deux ouvertures successives de `/ma-journee` le même jour : la
  deuxième trouve la ligne `tournees` déjà créée par la première, ne
  régénère rien (pas de doublons).
- Soin `ponctuel` dont la date est passée sans que `/ma-journee` ait été
  ouvert ce jour-là : aucune génération rétroactive — la génération ne
  s'exécute qu'au moment de l'ouverture pour la date du jour courant,
  jamais pour une date antérieure.
- `dateFin` antérieure à `dateDebut` à la création d'un soin : rejetée
  par validation applicative dans `createSoinPrescritAction` (pas de
  contrainte SQL dédiée, cohérence applicative suffisante ici).
- Soin arrêté (`actif = false`) : jamais pris en compte par la
  génération, même s'il serait autrement dû.
- Suppression de patient : hors scope de ce chantier (voir Hors scope),
  donc aucun cas de suppression en cascade à traiter ici.

## Tests

- Vitest : `getPatients`, `getPatient`, `getSoinsPrescrits` (lignes
  trouvées, absentes).
- Vitest : `createPatientAction`, `updatePatientAction` — bons champs
  insérés/mis à jour, redirection/revalidation attendues.
- Vitest : `createSoinPrescritAction` — un cas par `frequence_type`,
  vérifie que seuls les champs pertinents sont enregistrés (ex.
  `jours_semaine` rempli et `intervalle_jours` `null` pour le type
  `jours_semaine`) ; rejette une `dateFin` antérieure à `dateDebut`.
- Vitest : `arreterSoinPrescritAction` — passe `actif` à `false`, ne
  touche à rien d'autre.
- Vitest : `genererTourneeDuJour` — un cas par type de récurrence (dû
  aujourd'hui / pas dû aujourd'hui), un cas avec plusieurs heures sur le
  même soin (génère plusieurs missions), un cas avec un soin arrêté
  (jamais généré), un cas avec une `dateFin` dépassée, un cas sans aucun
  soin dû (tournée créée à 0), un cas où la tournée existe déjà (pas de
  régénération, pas de doublon).
- Vitest : comptage des statistiques (`nb_injections`/`nb_pansements`/
  `nb_glycemies`) — correspondance de mots-clés insensible à la casse, un
  soin qui ne correspond à aucun mot-clé ne compte que dans
  `nb_patients`.
- Vitest : `proxy.ts` — `/patients` traité comme les autres routes
  protégées (un cas suffit, la boucle existante sur
  `AUTH_REQUIRED_PATHS`/`SUBSCRIPTION_REQUIRED_PATHS` couvre déjà le
  comportement générique).
- Pas de nouveau test e2e Playwright dédié pour ce chantier (aucune
  suite e2e existante ne couvre encore `/patients` ; à ajouter si une
  suite e2e plus large se construit plus tard).

## Vérification manuelle

Après déploiement, avec autorisation explicite du fondateur : créer un
patient de test via `/patients/nouveau`, lui ajouter un soin `quotidien`
et un soin `jours_semaine`, ouvrir `/ma-journee` le jour concerné et
confirmer que la tournée se génère avec les bonnes missions et les bonnes
statistiques ; rouvrir la page et confirmer qu'aucun doublon n'apparaît ;
arrêter un soin et confirmer qu'il n'est plus généré le lendemain.

## Alternatives écartées

- **Lier les soins prescrits aux codes NGAP** (`ngap_codes`, déjà en
  base) : écarté — non demandé, ajouterait une contrainte de saisie
  (rechercher/choisir un code) non nécessaire pour ce chantier.
  `type_soin` reste un texte libre, comme partout ailleurs dans l'app.
- **Durée par soin, configurable** : écartée pour cette v1 — une
  estimation fixe (20 min/mission) suffit tant que le besoin d'affiner
  n'est pas exprimé.
- **Génération par tâche planifiée (cron/edge function)** plutôt qu'à la
  demande : écartée — aucune infrastructure de tâche planifiée n'existe
  dans le projet, et la génération à l'ouverture de la page reproduit
  exactement le principe déjà en place pour `getTourneeDuJour` (lecture
  paresseuse), sans dépendance externe supplémentaire.
- **Ajustement manuel de la tournée générée** : écarté pour ce chantier
  (voir Décisions) — chantier séparé si confirmé nécessaire.
- **Suppression de patient ou de soin prescrit depuis l'UI** : écartée —
  aucun besoin exprimé ; un soin peut être arrêté (`actif = false`) mais
  pas supprimé, ce qui évite aussi toute question de suppression en
  cascade des missions passées.

## Hors scope (rappel)

- Parcours d'inscription / suppression du mur de paiement — chantier
  séparé, non traité ici.
- Ajustement manuel de la tournée générée (ajout, retrait,
  réordonnancement).
- Lien entre soins et codes NGAP de facturation.
- Suppression de patient et de soin prescrit (seul "arrêter" un soin est
  possible).
- Réactivation d'un soin arrêté (il faudrait en recréer un).
- Durée par soin configurable (valeur fixe 20 min/mission pour cette
  v1).
- Notifications ou rappels lorsqu'un soin approche de sa `date_fin`.
