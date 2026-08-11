# Ma tournée — réconciliation de l'en-tête avec la maquette — design

## Contexte

La maquette Claude Design `Ma tournée.dc.html` (projet
`51b62c06-550b-45b6-81d8-35e6e90e6609`) a été comparée à l'écran réel
`/ma-tournee`. Cet écran a déjà subi une refonte majeure le 2026-08-07
(`docs/superpowers/plans/2026-08-07-ma-tournee-refonte.md`, déjà fusionnée
dans `main`) : l'essentiel de la maquette y est déjà présent — en-tête
dégradé violet avec anneau de progression, 3 cartes de statistiques
(Reste / Km / Cotation), 4 onglets-pilules de filtre avec compteurs,
cartes de mission avec timeline/avatar/badge/actes/alertes/consignes,
boutons d'action contextuels (GPS/Appeler/Valider, Valider/Absent), bouton
flottant "Suivant", et barre de navigation basse globale déjà alignée
avec la maquette (`Accueil`/`Ma tournée`/`Ely`/`Patients`/`Explorer`).

Cette spec ne couvre donc **pas** une refonte, mais une réconciliation
ciblée des écarts réels restants entre la maquette et l'écran actuel.

## Périmètre

### En-tête — restructuration approuvée

Remplacer le logo Soinely + lien vers `/ma-journee` (actuellement rendu
via `BarreLogoProfilHero`, redondant avec l'onglet "Accueil" déjà présent
dans `BarreNavigationBasse`) par :
- la date du jour en toutes lettres, capitalisée (ex. « Mardi 29
  juillet »), sur la ligne du haut ;
- le titre « Ma tournée » en dessous.

Le bouton profil (à droite) reste, mais avec un repli à initiales réelles
plutôt qu'une icône silhouette générique.

`BarreLogoProfilHero` est un composant partagé
(`components/layout/BarreSuperieure.tsx`,
`components/ui/EnTeteListePatients.tsx`, `components/ui/EnTeteAccueil.tsx`
l'utilisent aussi) : il n'est **pas modifié**. `EnTeteTournee.tsx` cesse
de l'utiliser et construit sa propre ligne d'en-tête, propre à cet écran.

### Stat « Km » — branchement d'une donnée déjà réelle

`MissionTourneeVue` porte déjà `distanceKm` et `distanceKmCorrigee`
(calculés pour le kilométrage NGAP), et `lib/kilometrage.ts` exporte déjà
`distanceRetenue(distanceKm, distanceKmCorrigee)` pour choisir la bonne
valeur. La stat « Km », actuellement figée à `—`, devient la somme de
`distanceRetenue(...)  ?? 0` sur **toutes** les missions du jour — même
périmètre que la stat « Cotation », qui somme déjà l'ensemble des
missions plutôt que les seules restantes.

### Avatar profil — initiales réelles

Repli sur les initiales de l'utilisateur connecté (ex. « SL » pour
« Sophie Lambert ») sur fond dégradé violet, à la place de l'icône
silhouette générique, quand aucune photo de profil n'est définie.

`getInitiales()` (`lib/tournee-vue.ts`) n'est pas réutilisable telle
quelle : elle est conçue pour des noms de **patients** avec civilité
(« Mme », « M. ») et retourne les 2 premières lettres d'un seul mot
(« Mme Dupont » → « Du »), pas les initiales prénom+nom d'un nom complet
d'utilisateur. Une nouvelle fonction dédiée est ajoutée plutôt que de
détourner celle-ci.

### Éléments fabriqués de la maquette — omis

- Le bandeau « Ely a optimisé » (« J'ai inversé deux visites de
  l'après-midi : 18 min de trajet en moins ») : aucune fonctionnalité de
  réoptimisation d'itinéraire par Ely n'existe. Les garde-fous établis
  pour Ely cette session limitent son rôle à répondre à des questions
  cliniques par recherche verbatim sur des fiches validées — jamais de
  planification ou de recalcul d'itinéraire. Fabrication complète, omise.
- Les boutons « carte » et « ··· » (plus d'actions) de l'en-tête : aucune
  destination réelle n'existe pour l'un ou l'autre — y compris dans le
  script de la maquette elle-même, où ce sont de simples toasts
  placeholder (« Vue carte de la tournée », « Plus d'actions »). Omis.
- Le point vert « en ligne » sur l'avatar : n'a aucun sens pour une
  session mono-utilisateur (pas de présence multi-utilisateurs à
  signaler). Omis.

## Hors périmètre (explicitement)

- Tout ce qui colle déjà à la maquette (cartes de mission, filtres,
  bouton "Suivant", barre de navigation basse) : aucun changement.
- Le modèle de données ou le calcul de distance lui-même
  (`lib/distance.ts`, `lib/kilometrage.ts`) : la spec consomme ce qui
  existe déjà, n'ajoute aucun nouveau calcul de distance.
- Toute fonctionnalité de carte, de menu d'actions supplémentaires, ou de
  réoptimisation d'itinéraire par Ely : hors périmètre, pas seulement
  omises de cette passe mais non spécifiées du tout.

## Architecture

### `lib/format.ts`

Deux ajouts :
- `initialesUtilisateur(nomComplet: string): string` — sépare sur les
  espaces, prend la première lettre du premier mot et la première lettre
  du dernier mot (si plusieurs mots), sinon les 2 premières lettres du
  mot unique ; retour en majuscules. Distincte de `getInitiales()`
  (patients), qui n'est pas touchée.
- `formatDateDuJour(): string` — **déplacée** depuis `lib/accueil-vue.ts`
  (où elle est déjà utilisée par l'écran Accueil) vers ce fichier de
  formatage partagé, puisque `/ma-tournee` en a maintenant besoin aussi.
  `lib/accueil-vue.ts` importe la fonction depuis son nouvel
  emplacement ; son comportement ne change pas.

### `lib/kilometrage.ts`

Ajout de `formaterKm(km: number): string`, même style que
`formaterEuros()` déjà présent dans `lib/cotation.ts` : formatage
`fr-FR`, une décimale, séparateur virgule (ex. `13,7 km`).

### `app/(app)/ma-tournee/page.tsx`

Le nom complet de l'utilisateur connecté
(`user?.user_metadata?.full_name`) est lu et transmis à `EnTeteTournee`,
suivant le même motif déjà utilisé par `app/tableau-de-bord/page.tsx`
pour la même donnée.

### `components/ui/EnTeteTournee.tsx`

- Reçoit une nouvelle prop `nomComplet?: string` (nom de l'utilisateur
  connecté, pour les initiales de repli).
- Ne rend plus `<BarreLogoProfilHero />`. Rend à la place une ligne
  d'en-tête propre à l'écran : date du jour (`formatDateDuJour()`) +
  titre « Ma tournée » à gauche ; bouton profil à droite (lien
  `/compte`, photo si `avatarUrl` est fourni, sinon cercle à dégradé
  violet avec `initialesUtilisateur(nomComplet ?? "")`).
- La stat « Km » (actuellement `—` en dur) devient
  `formaterKm(missions.reduce((total, m) => total + (distanceRetenue(m.distanceKm, m.distanceKmCorrigee) ?? 0), 0))`.
- Aucun autre élément de l'en-tête (anneau, nom/sous-titre du soin en
  cours, badges retard/fin estimée, stats Reste/Cotation, filtres) ne
  change.

## Erreurs

Aucun nouveau cas d'erreur : toutes les données consommées (distances,
nom complet) sont déjà chargées par la page ou nullable de façon déjà
gérée ailleurs dans ce fichier (`?? 0`, `?? "Tournée à jour"`, etc.).
Un utilisateur sans `full_name` renseigné obtient une chaîne vide passée
à `initialesUtilisateur`, qui retourne alors une chaîne vide plutôt que
de lever une erreur — l'avatar affiche un cercle vide plutôt qu'un texte
cassé. Ce cas n'est pas nouveau : l'écran affichait déjà un repli
générique pour un profil incomplet.

## Tests

- `lib/format.test.ts` — `initialesUtilisateur()` : nom simple deux mots
  (« Sophie Lambert » → « SL »), nom à un seul mot, nom à trois mots
  (vérifie qu'on prend premier + dernier, pas premier + deuxième), chaîne
  vide. `formatDateDuJour()` reste couverte par les tests déjà existants
  d'`accueil-vue.test.ts` — pas de nouveau test nécessaire pour un simple
  déplacement de fichier, mais l'import déplacé doit continuer à passer
  la suite existante.
- `lib/kilometrage.test.ts` — `formaterKm()` : valeur avec décimale,
  valeur entière, zéro.
- `components/ui/EnTeteTournee.test.ts` (nouveau, ce composant n'a pas de
  test dédié aujourd'hui) : rendu de la date et du titre « Ma tournée » ;
  stat Km calculée correctement à partir de missions de test avec
  `distanceKm`/`distanceKmCorrigee` variés (y compris une mission avec
  les deux à `null`, qui ne doit pas casser la somme) ; avatar en
  initiales quand `avatarUrl` est absent ; absence du bandeau Ely, des
  boutons carte/plus, et du point « en ligne » nulle part dans le rendu.
