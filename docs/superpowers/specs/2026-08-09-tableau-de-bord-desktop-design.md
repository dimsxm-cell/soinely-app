# Tableau de bord desktop — design

## Contexte

Le projet Claude Design (`51b62c06-550b-45b6-81d8-35e6e90e6609`) contient une
maquette `Tableau de bord.dc.html` : un dashboard desktop (barre latérale,
grille multi-colonnes) pensé pour un cabinet regroupant plusieurs IDEL. C'est
la première maquette du lot qui ne correspond à aucun écran existant — toute
l'app Soinely est aujourd'hui mobile-first, une seule colonne centrée
(`max-w-2xl`), mono-utilisateur.

L'offre d'abonnement « Cabinet » (`components/ui/CartesTarifs.tsx`) promet
déjà cette direction : *« Chaque infirmier du cabinet dispose de son propre
compte. Le partage du dossier entre comptes arrive prochainement. »* Ce
dashboard est la première étape vers cette promesse, mais **pas encore** son
aboutissement : construire le vrai partage de données entre comptes IDEL
(modèle de données, invitations, permissions) est un chantier séparé, plus
gros, qui n'est pas dans le périmètre de cette spec.

## Décomposition du projet complet

Le projet « cabinet multi-IDEL » se découpe en 4 briques indépendantes :

1. **Cabinet + adhésion** — modèle de données et mécanisme pour lier
   plusieurs comptes IDEL à un même cabinet. N'existe pas aujourd'hui.
2. **Agrégation des statistiques** — requêtes serveur qui calculent des
   totaux cabinet (facturation, patients, alertes) sans exposer les patients
   d'un IDEL aux autres membres.
3. **Gabarit desktop** (cette spec) — la mise en page elle-même, avec des
   données mélangeant réel (par compte) et factice (ce qui dépend des
   briques 1-2).
4. **Contrôle d'accès** — réserver l'écran aux abonnés du plan Cabinet.

Ordre choisi par l'utilisateur : commencer par la brique 3 pour valider la
direction visuelle avant d'investir dans le modèle de données partagé. Les
briques 1, 2 et 4 restent à spécifier séparément, plus tard.

## Périmètre de cette spec

Construire l'écran `/tableau-de-bord`, un gabarit desktop fidèle à la
maquette, connecté aux données réelles du compte connecté là où elles
existent déjà, et à des données d'exemple clairement isolées ailleurs — sans
toucher au modèle de données, aux permissions, ni à la navigation existante.

## Architecture

- Nouvelle route `app/tableau-de-bord/page.tsx`, **hors** du groupe `(app)` —
  même précédent que `app/abonnement/page.tsx` : pas de `BarreSuperieure` ni
  de `BarreNavigationBasse` mobiles, layout entièrement autonome.
- Server Component : récupère les données réelles nécessaires puis les passe
  à un composant de présentation. Pas de garde de largeur d'écran — la page
  reste pensée desktop uniquement, elle s'affichera mal sur mobile et c'est
  accepté pour cette première passe.
- Pas de lien depuis le reste de l'app vers `/tableau-de-bord` : accès direct
  par URL uniquement, pour l'instant.
- Pas de contrôle d'abonnement (brique 4 différée) : tout utilisateur
  connecté qui visite l'URL voit la page.

## Répartition réel / factice

### Réel (calculé depuis les données du compte connecté)

| Élément maquette | Source |
|---|---|
| Prénom de l'utilisateur | `getUtilisateurConnecte()` → `user_metadata.full_name` |
| Tournée du jour, prochain arrêt (patient, adresse, distance, actes) | `getTourneeDuJour` + `getMissionsTourneeVue` (`lib/data/ma-journee.ts`), même source que `/ma-tournee` |
| Allergie/consigne affichée sur le prochain arrêt | Champ `allergies`/`consignes` du patient, déjà inclus dans `MissionTourneeVue` |
| Anneau de progression (missions faites / total) | Calculé depuis les statuts de `MissionTourneeVue[]`, comme `EnTeteTournee` |
| KPI « Patients actifs » | `getPatients(supabase, user.id).length` |
| KPI « Cotation du jour » | `calculerMontantTournee` + `calculerMajorationsTournee` (mêmes fonctions que `/ma-tournee`), avec `getContexteTarifaire` |
| Liste « Suite de la tournée » (arrêts à venir) | `MissionTourneeVue[]` filtrée sur les statuts non terminés |
| Action rapide « Nouveau patient » | Lien réel vers `/patients/nouveau` |
| Action rapide « Demander à Ely » | Lien réel vers `/ely` |
| Lien barre latérale « Ma tournée » | Lien réel vers `/ma-tournee` |
| Lien barre latérale « Patients » | Lien réel vers `/patients` |
| Lien barre latérale « Documents » | Lien réel vers `/situations/dossier` |

### Factice (constantes codées en dur, aucune fonctionnalité derrière)

- Nom du cabinet affiché dans la barre latérale (ex. « Cabinet Voltaire ») —
  aucun champ de ce type n'existe (`FormulaireCabinet` ne gère que
  l'adresse/code postal du cabinet, pas un nom).
- Bloc « À traiter » (ordonnances à renouveler, rejet de télétransmission,
  photo d'escarre manquante) — aucune fonctionnalité équivalente n'existe.
- Graphique « Facturation — 7 derniers jours » et sa tendance (+12,4 %) —
  aucun historique de facturation n'est calculé aujourd'hui.
- Ligne « Télétransmission SCOR à jour » — aucune intégration SCOR n'existe.
- Carte « Ely a 3 suggestions » (barre latérale) — aucun mécanisme de
  suggestion proactive n'existe.
- Actions rapides « Scanner une ordonnance » et « Facturer la journée » —
  non fonctionnelles : rendues comme des `<div>` (pas des `<button>` ni des
  `<a>`), sans gestionnaire de clic, pour ne jamais laisser croire à une
  action possible.
- Entrées barre latérale « Agenda », « Facturation », « Réglages » —
  visibles pour la fidélité visuelle mais sans destination réelle : rendues
  comme des `<span>` au même habillage que les autres entrées de nav, pas
  des `<a>` — jamais de lien qui ne mène nulle part.

Toute donnée factice est regroupée dans une constante clairement nommée
(ex. `DONNEES_EXEMPLE` en tête du fichier composant) pour qu'un futur
remplacement par la brique « agrégation » (#2) soit un remplacement
localisé, pas une chasse au texte codé en dur dans le JSX.

## Composants

- `app/tableau-de-bord/page.tsx` — Server Component, récupère les données
  réelles, assemble les props, ne contient aucune logique de présentation.
- `components/ui/TableauDeBordDesktop.tsx` — composant de présentation pur
  (les données factices vivent ici, jamais dans `page.tsx`), reprend la
  structure de la maquette : barre latérale fixe + zone principale
  (en-tête, carte tournée en cours, KPI, liste des arrêts, bloc « à
  traiter », bloc facturation, actions rapides).
- Réutilisation des styles déjà établis (dégradé violet des en-têtes,
  `font-display`, tokens de couleur existants) plutôt que de nouvelles
  constantes de couleur.

## Erreurs

Mêmes garde-fous que `/ma-tournee` : si `getTourneeDuJour` échoue ou renvoie
`null` (pas de tournée aujourd'hui), la carte « tournée en cours » affiche un
état vide sobre plutôt qu'une erreur — pas de nouvelle gestion d'erreur à
inventer, on suit le patron déjà en place.

## Tests

- Test du composant de présentation : rendu correct des sections avec des
  props de test (réelles factices pour le test, distinctes des données
  d'exemple codées en dur du composant) — notamment l'anneau de progression
  et le KPI de cotation, qui font l'objet d'un calcul.
- Pas de test de route/page dédié : `page.tsx` reste un assemblage fin de
  fonctions déjà testées ailleurs (`getTourneeDuJour`, `getMissionsTourneeVue`,
  `getPatients`, `calculerMontantTournee`), suivant le même choix que
  `/ma-tournee/page.tsx`.

## Hors périmètre (explicitement)

- Modèle de données « cabinet » et adhésion entre comptes (brique 1).
- Agrégation réelle multi-comptes (brique 2).
- Contrôle d'accès par plan d'abonnement (brique 4).
- Gestion d'un affichage mobile pour cette route.
- Lien de navigation depuis le reste de l'app vers `/tableau-de-bord`.
