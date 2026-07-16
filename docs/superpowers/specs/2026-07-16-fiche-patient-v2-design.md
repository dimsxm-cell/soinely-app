# Fiche patient v2 — transmission, absence, actions rapides — Design

**Statut :** Design validé en dialogue avec le fondateur (2026-07-16, y compris
après retour sur une référence visuelle). Reste à valider : ce document
écrit, avant de passer au plan d'implémentation.

## Contexte

Ce chantier étend l'écran `/ma-journee/[missionId]` (livré au chantier
"Écran Arrivée chez le patient", `docs/superpowers/specs/2026-07-16-arrivee-patient-design.md`)
avec cinq ajouts, regroupés en un seul spec car ils touchent le même
écran et la même migration :

1. **Transmission** — écrire une transmission pour la visite en cours, lire
   celle de la visite précédente du même patient. Premier des 4 mini-
   chantiers identifiés dans "le geste de fin de soin" (les 3 autres —
   photo, rappel, navigation automatique — restent hors scope).
2. **Dernière transmission** — ferme la boucle du chantier 1, qui avait
   explicitement reporté ce champ faute de transmissions existantes.
3. **Âge / date de naissance** — nouveau champ patient.
4. **Appeler / SMS** — liens directs vers le téléphone du patient, déjà en
   base.
5. **Absence** — un patient peut ne pas être présent à l'heure prévue ;
   l'IDEL doit pouvoir le signaler sans passer par "Commencer le soin".
   Explicitement écarté du chantier 1 ("chantier séparé"), traité ici.

Ces cinq points sont partis d'une référence visuelle externe (capture
d'écran d'un mockup "Ma journée" / "Fiche patient") — la palette et la
mise en page ont été adaptées au style déjà établi de l'app (couleurs de
`app/globals.css`), pas copiées telles quelles. Deux autres éléments visibles
sur cette même référence (une liste de soins ajoutables par visite, au lieu
d'un `type_soin` unique et fixe par mission) impliqueraient un changement de
modèle de données plus large et restent **hors scope** — à rediscuter
séparément s'ils s'avèrent nécessaires.

## Décisions actées avec le fondateur

- **Transmission = colonne sur `missions_du_jour`** (`transmission text`,
  nullable), pas une table séparée — une transmission par visite, même
  logique que `consignes` sur `patients`.
- **Le champ d'écriture de la transmission n'apparaît que si le statut est
  `en_cours` ou `terminee`** — écrire "ce qui s'est passé" n'a pas de sens
  avant d'avoir commencé la visite. Pas de champ obligatoire avant de
  passer au statut suivant, cohérent avec la décision déjà actée pour
  "Terminer" (aucune confirmation, priorité à la rapidité).
- **"Dernière transmission" est en lecture seule**, toujours visible dès
  l'arrivée (y compris avant de commencer le soin) — c'est justement
  l'info à lire avant d'entrer chez le patient. Recherchée parmi les
  visites précédentes du même patient (`patient_id`), jamais partagée
  entre IDEL différentes (les patients ne sont jamais partagés, RLS
  `patients_owner_all` déjà scopée par `idel_id`).
- **`patients.date_naissance`** (date, nullable) — l'âge est calculé à
  l'affichage, jamais stocké. Rien n'est affiché si le champ est vide (pas
  de saisie obligatoire pour cette v1, pas d'UI de création de patient de
  toute façon).
- **Appeler / SMS : simples liens `tel:`/`sms:`** construits à partir de
  `patients.telephone` (déjà en base) — aucune nouvelle donnée, aucune
  Server Action, aucun état à gérer.
- **Absence : nouvelle valeur `absent` sur `missions_du_jour.statut`**,
  branche alternative accessible uniquement depuis `a_faire` (jamais
  depuis `en_cours` — si le soin a déjà commencé, "absent" n'a plus de
  sens). État terminal, comme `terminee` : aucun bouton de statut affiché
  ensuite.
- **Le bouton "Absence" n'apparaît que sur la fiche patient**
  (`/ma-journee/[missionId]`), pas sur la carte compacte de Ma Journée —
  `CarteMission` garde son unique bouton d'avancement linéaire inchangé
  dans son comportement (il gagne seulement une nouvelle entrée de libellé
  pour afficher le badge "Absente" quand ce statut est atteint, requis pour
  que le typage reste exhaustif).
- **Aucune confirmation avant de cliquer sur "Absence"**, cohérent avec la
  philosophie déjà actée pour "Terminer".
- **Réutilise `updateMissionStatutAction`** (pas de nouvelle Server Action
  pour le statut) — la validation de transition gagne un cas
  supplémentaire pour ce seul embranchement.

## Architecture

### Migration (nouvelle)

```sql
-- Transmission (texte) par visite.
alter table public.missions_du_jour
  add column transmission text;

-- Nouvelle branche de statut : "absent", accessible depuis a_faire.
alter table public.missions_du_jour
  drop constraint missions_du_jour_statut_check,
  add constraint missions_du_jour_statut_check
    check (statut in ('a_faire','en_cours','terminee','absent'));

-- Date de naissance, pour l'âge affiché sur la fiche patient.
alter table public.patients
  add column date_naissance date;
```

Aucune nouvelle policy RLS — les trois colonnes sont ajoutées à des tables
déjà couvertes par `missions_du_jour_owner_all` et `patients_owner_all`
(toutes deux `for all`), qui s'appliquent au niveau de la ligne, pas de la
colonne.

### Types (`lib/types/clinical.ts`, modifié)

- `StatutMission` gagne `"absent"`.
- `Patient` gagne `dateNaissance: string | null`.
- `MissionDetail` gagne `transmission: string | null` (celle de la visite
  courante) et `derniereTransmission: string | null` (celle de la visite
  précédente du même patient, ou `null` si aucune n'existe).

### Couche données (`lib/data/ma-journee.ts`, modifié)

`getMissionDetail` (existant) est étendu : sélectionne aussi
`transmission` sur la mission et `date_naissance` sur le patient joint, et
calcule `derniereTransmission` via une requête complémentaire sur
`missions_du_jour` filtrée par le même `patient_id`, excluant la mission
courante, ne gardant que les lignes où `transmission` n'est pas vide,
triée chronologiquement par date de tournée (jointure sur `tournees.date`)
puis heure — la plus récente en premier. Aucune nouvelle fonction publique
n'est nécessaire ; le détail exact de la requête (une passe SQL triée vs.
récupération puis tri en mémoire) se décide au plan d'implémentation.

### Server Actions (`lib/data/ma-journee-actions.ts`, modifié)

- **Nouvelle** `updateTransmissionAction(formData)` : lit `missionId` et
  `transmission`, met à jour `missions_du_jour.transmission` directement
  (pas de table `patients` impliquée, contrairement à `updateConsignesAction`),
  revalide `/ma-journee/[missionId]`.
- **`updateMissionStatutAction`** (existant) : la validation de transition
  accepte désormais soit la transition linéaire habituelle
  (`TRANSITIONS_VALIDES[statutActuel] === nouveauStatut`), soit le cas
  `statutActuel === "a_faire" && nouveauStatut === "absent"`. Aucun autre
  comportement changé.

### `CarteMission` (composant existant, modifié a minima)

`STATUT_LABEL`/`STATUT_CLASSES` (déjà des `Record` exhaustifs sur
`StatutMission`) gagnent une entrée `absent` (badge "Absente", couleur
neutre distincte de "Terminée"). Aucun nouveau bouton sur ce composant —
"Absence" reste une action de la fiche patient uniquement.

### Écran `/ma-journee/[missionId]` (existant, modifié)

Ajoute, dans l'ordre : âge à côté du nom (si `dateNaissance` renseignée) ;
deux liens "Appeler" (`tel:`) et "SMS" (`sms:`) utilisant
`patient.telephone` ; bloc "Dernière transmission" en lecture seule
(toujours visible si non vide) ; bloc "Transmission de cette visite"
éditable (visible seulement si statut `en_cours`/`terminee`,
`updateTransmissionAction`) ; bouton "Absence" (visible seulement si
statut `a_faire`, soumet `updateMissionStatutAction` avec
`nouveauStatut="absent"`, sans confirmation).

## Gestion des cas limites

- `date_naissance` vide : aucun âge affiché, juste le nom.
- `transmission` (visite courante) vide : le bloc d'écriture reste
  affiché (si statut le permet) mais avec un champ vide, pas de texte de
  substitution particulier.
- `derniereTransmission` `null` (aucune visite précédente avec
  transmission) : le bloc "Dernière transmission" n'est pas affiché du
  tout — pas de bloc vide.
- Mission déjà `absent` ou `terminee` : aucun bouton de statut affiché,
  cohérent avec le comportement déjà existant pour `terminee`.
- Tentative de transition `en_cours → absent` ou `terminee → absent` via
  une requête modifiée à la main : rejetée silencieusement par
  `updateMissionStatutAction`, même comportement que toute autre
  transition invalide aujourd'hui.
- `telephone` : déjà `not null` sur `patients`, les liens Appeler/SMS ont
  toujours une valeur à utiliser.

## Tests

- Vitest : `getMissionDetail` — mapping étendu (`transmission`,
  `dateNaissance`), et nouveau comportement pour `derniereTransmission`
  (cas avec une visite précédente pertinente, cas sans aucune, cas où la
  visite précédente n'a pas de transmission renseignée).
- Vitest : `updateTransmissionAction` (nouveau) — met à jour la bonne
  mission, revalide le bon chemin ; ne fait rien si la mission n'existe
  pas.
- Vitest : `updateMissionStatutAction` (existant, étendu) — nouveau cas
  `a_faire → absent` accepté ; nouveaux cas `en_cours → absent` et
  `terminee → absent` rejetés.
- Vitest : `CarteMission` (existant, étendu) — badge "Absente" affiché
  correctement pour ce statut, aucun bouton affiché (comme pour
  `terminee`).
- Pas de nouveau test e2e Playwright dédié — même écran déjà couvert,
  aucune nouvelle route.

## Vérification manuelle

Après déploiement, avec autorisation explicite du fondateur : sur les
patients/missions de test déjà en place (issus de la vérification du
chantier "Écran Arrivée chez le patient"), écrire une transmission sur une
mission terminée, créer une seconde mission pour le même patient à une
date antérieure/postérieure et confirmer que "Dernière transmission"
s'affiche correctement sur la bonne fiche ; tester la transition vers
`absent` depuis `a_faire` et confirmer qu'elle est rejetée depuis
`en_cours` ; confirmer que les liens Appeler/SMS pointent vers le bon
numéro ; renseigner `date_naissance` sur un patient de test et confirmer
que l'âge s'affiche correctement.

## Alternatives écartées

- **Table `transmissions` séparée** : écartée — une IDEL écrit une seule
  transmission par visite, pas d'historique interne à une même mission à
  gérer.
- **Bouton "Absence" aussi sur `CarteMission`** : écarté — éviterait de
  toucher un composant déjà construit et revu plusieurs fois pour un
  geste qui a plus de sens une fois qu'on a ouvert la fiche complète du
  patient.
- **Confirmation avant de marquer "Absence"** : écartée, comme pour
  "Terminer" — friction jugée non justifiée, l'app privilégie la rapidité
  sur le terrain.
- **Liste de soins ajoutables par visite** (vu sur la référence visuelle) :
  écartée pour ce chantier — impliquerait de remplacer le `type_soin`
  unique et fixe par mission par un vrai modèle de liste, changement de
  modèle de données plus large que ce spec, à rediscuter séparément.

## Hors scope (rappel)

- Photo, rappel, navigation automatique vers le patient suivant — 3 des 4
  mini-chantiers de "geste de fin de soin", non traités ici.
- Liste de soins multiples par visite (voir Alternatives écartées).
- Toute action de suivi après un "Absence" (reprogrammation, notification,
  etc.) — la v1 se limite à changer le statut.
- Création/suppression de patient depuis l'UI (toujours hors scope, comme
  au chantier 1).
