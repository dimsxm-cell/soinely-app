# Rappel pour la prochaine visite — Design

**Statut :** Design validé en dialogue avec le fondateur (2026-07-16). Reste
à valider : ce document écrit, avant de passer au plan d'implémentation.

## Contexte

Dernier des 4 mini-chantiers de "geste de fin de soin" restant à
brainstormer (transmission/dernière transmission et absence livrés par
`docs/superpowers/specs/2026-07-16-fiche-patient-v2-design.md` ; navigation
vers le patient suivant livrée par
`docs/superpowers/specs/2026-07-16-navigation-patient-suivant-design.md`).
Le mini-chantier "photo" reste à traiter séparément après celui-ci — les
deux touchent des couches techniques trop différentes (stockage de
fichiers vs. simple champ texte) pour un seul spec.

Contrairement aux 3 précédents, "photo" et "rappel" n'avaient pas de
description écrite retrouvée dans les mockups/documents de ce projet
(`mockup-arrivee-patient.html`, `soinely-plan-action.html`) — leur contenu
vient d'un échange direct avec le fondateur au démarrage de ce chantier,
capturé ci-dessous dans les décisions actées.

## Décisions actées avec le fondateur

- **"Rappel" = une note laissée par l'IDEL pendant une visite, à relire
  avant la prochaine visite chez ce même patient** (ex : "vérifier la
  cicatrisation dans 3 jours"). Distinct de "consignes" (information
  patient permanente, jamais liée à une visite précise) et de
  "transmission" (compte-rendu général de la visite, pas spécifiquement
  tourné vers le futur).
- **Champ texte séparé**, pas une case à cocher sur la transmission
  existante — un 2ᵉ bloc d'écriture à côté de "Transmission de cette
  visite", explicitement nommé.
- **Écrit dans les mêmes conditions que la transmission** : visible et
  modifiable seulement si le statut de la mission est `en_cours` ou
  `terminee` — écrire une note "pour la prochaine fois" n'a de sens
  qu'une fois la visite commencée.
- **Cycle de vie : toujours le rappel le plus récent, aucun état lu/non-lu
  à gérer.** Même mécanique que "dernière transmission" — dès que l'IDEL
  écrit un nouveau rappel (ou laisse le champ vide) à la visite suivante,
  l'ancien arrête naturellement de s'afficher. Pas de case "fait"/"résolu"
  pour cette v1.
- **Affiché juste après "Allergie" et avant "Dernière transmission"** — la
  chose la plus actionnable à lire avant de commencer le soin passe avant
  le compte-rendu informatif de la visite précédente.
- **Style visuel distinct** : couleur `warning` (déjà utilisée pour le
  badge "En cours" de `CarteMission`), pas le style neutre de "Dernière
  transmission" ni la gravité du rouge d'"Allergie" — attire l'œil sans
  laisser penser à un danger médical.

## Architecture

### Migration (nouvelle)

```sql
-- Rappel (texte) laissé par l'IDEL pour la prochaine visite du patient.
alter table public.missions_du_jour
  add column rappel text;
```

Aucune nouvelle policy RLS — la colonne est ajoutée à une table déjà
couverte par `missions_du_jour_owner_all` (`for all`), qui s'applique au
niveau de la ligne, pas de la colonne.

### Types (`lib/types/clinical.ts`, modifié)

`MissionDetail` gagne deux champs, exactement symétriques à
`transmission`/`derniereTransmission` :

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

### Couche données (`lib/data/ma-journee.ts`, modifié)

Nouvelle fonction privée `getDernierRappel`, calquée exactement sur
`getDerniereTransmission` existante (même patient, exclut la mission
courante, filtre les lignes où `rappel` n'est pas vide, triée par date de
tournée puis heure décroissante, garde la plus récente) :

```ts
async function getDernierRappel(
  supabase: SupabaseClient<Database>,
  patientId: string,
  missionIdActuelle: string
): Promise<string | null>
```

`getMissionDetail` (existant) est étendu : sélectionne aussi `rappel` sur
la mission courante, et appelle `getDernierRappel` de la même façon que
`getDerniereTransmission` — sans condition sur le statut (comme "dernière
transmission", toujours calculé et affiché si non vide, y compris avant
que la visite ait commencé).

### Server Actions (`lib/data/ma-journee-actions.ts`, modifié)

Nouvelle `updateRappelAction(formData)`, calquée exactement sur
`updateTransmissionAction` existante : lit `missionId` et `rappel`, met à
jour `missions_du_jour.rappel` directement, revalide
`/ma-journee/[missionId]`.

### Écran `/ma-journee/[missionId]` (existant, modifié)

Deux ajouts :

1. **Bloc en lecture seule "Rappel de la dernière visite"** — visible si
   `dernierRappel` n'est pas vide, positionné juste après le bloc
   "Allergie" et avant "Dernière transmission". Style `warning`
   (`border-warning/30 bg-warning/5 text-warning` pour le label, même
   structure que le bloc "Allergie" mais en couleur `warning`).
2. **Bloc éditable "Rappel pour la prochaine visite"** — visible dans les
   mêmes conditions que "Transmission de cette visite"
   (`peutEcrireTransmission`, donc `en_cours`/`terminee`), positionné juste
   après ce bloc. Même structure de formulaire
   (`<textarea>` + bouton "Enregistrer"), soumet `updateRappelAction`.

## Gestion des cas limites

- `rappel` (visite courante) vide : le bloc d'écriture reste affiché (si
  statut le permet) avec un champ vide, pas de texte de substitution.
- `dernierRappel` `null` (aucune visite précédente avec un rappel non
  vide) : le bloc "Rappel de la dernière visite" n'est pas affiché du
  tout — pas de bloc vide.
- Mission `a_faire` (visite pas encore commencée) : "Rappel de la dernière
  visite" reste visible s'il existe (comme "Dernière transmission") ;
  "Rappel pour la prochaine visite" (écriture) n'est pas visible, cohérent
  avec la règle déjà actée pour la transmission.
- Un rappel écrit à une visite `absent` (patient non vu) : impossible par
  construction — le bloc d'écriture n'est visible que pour
  `en_cours`/`terminee`, jamais pour `absent`.

## Tests

- Vitest : `getMissionDetail` — nouveau champ `rappel` mappé correctement ;
  `dernierRappel` calculé correctement (cas avec un rappel précédent
  pertinent, cas sans aucun, cas où la visite précédente n'a pas de rappel
  renseigné) — mêmes trois cas que ceux déjà écrits pour
  `derniereTransmission`.
- Vitest : `updateRappelAction` (nouveau) — met à jour la bonne mission,
  revalide le bon chemin ; ne fait rien si la mission n'existe pas — mêmes
  cas que ceux déjà écrits pour `updateTransmissionAction`.
- Pas de nouveau test e2e Playwright dédié — même écran déjà couvert,
  aucune nouvelle route.

## Vérification manuelle

Après déploiement, avec autorisation explicite du fondateur : sur les
patients/missions de test déjà en place, écrire un rappel sur une mission
`en_cours`/`terminee`, créer une seconde mission pour le même patient à
une date postérieure et confirmer que "Rappel de la dernière visite"
s'affiche correctement (avec le style `warning`, positionné avant
"Dernière transmission") sur la fiche de cette 2ᵉ mission ; confirmer
qu'un rappel vide ne laisse aucun bloc vide.

## Alternatives écartées

- **Case à cocher sur la transmission existante** ("marquer cette
  transmission comme importante") plutôt qu'un champ séparé : écartée —
  mélangerait deux intentions différentes (compte-rendu général vs. note
  tournée vers le futur) dans un seul champ texte.
- **État lu/non-lu (case "fait"/"résolu")** : écartée pour cette v1 —
  ajouterait un statut et une action supplémentaire pour un gain limité,
  la mécanique "toujours le plus récent" déjà utilisée pour la
  transmission suffit et ne demande aucun nouvel état.
- **Date d'échéance sur le rappel** (ex : "à vérifier le 20/07") avec
  notification : écartée — le document source ne demande qu'une note
  texte relue à la prochaine visite, pas un système de rappel programmé
  avec notifications ; complexité hors scope pour cette v1.

## Hors scope (rappel)

- Photo — dernier des 4 mini-chantiers de "geste de fin de soin", à
  brainstormer séparément après celui-ci.
- État lu/non-lu, date d'échéance, notifications (voir Alternatives
  écartées).
- Toute action groupée (ex : lister tous les rappels actifs de la
  tournée) — cette v1 se limite à l'affichage par fiche patient.
