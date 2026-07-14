# Copilote Clinique (v1) — Design

**Statut :** Approuvé par le fondateur (2026-07-14). Prochaine étape : plan d'implémentation.

## Contexte

Soinely est un copilote clinique pour IDEL. Le chantier "Recherche Intelligente"
(terminé, en production) a livré `search_situations_terrain` (recherche
plein-texte + repli trigram tolérant aux fautes) et l'écran `/recherche` +
`/situations/[id]`.

La vision produit (SOINELY CORE — Clinical Knowledge Architecture) décrit un
"Copilote" qui comprend le contexte de l'IDEL (mission en cours, situation
terrain, historique, favoris — "Smart Context") et répond aux questions
cliniques. Ce chantier est une **première version volontairement réduite** de
cette vision, pour les raisons actées ci-dessous.

## Décisions actées avec le fondateur

- **Zéro génération de texte clinique par IA.** Le risque (responsabilité
  médicale en cas de conseil clinique halluciné ou imprécis) est jugé trop
  élevé pour une v1. Le Copilote ne renvoie jamais de texte rédigé par un
  LLM — uniquement du contenu déjà validé (`niveau_confiance = 'valide'`,
  `published = true`), exactement comme `/recherche`.
- **Pas de nouvel appel LLM du tout pour cette v1.** Même pour comprendre
  l'intention de la question, ce chantier réutilise tel quel le moteur de
  recherche plein-texte + trigram existant (`search_situations_terrain`),
  sans dépendance IA externe, sans coût par appel, sans latence
  supplémentaire.
- **Pas de conscience du contexte (mission en cours).** La vision "Smart
  Context" suppose qu'on sait quelle mission l'IDEL est en train de
  réaliser — mais aucun écran ne permet aujourd'hui de voir/ouvrir une
  mission individuelle de la tournée (`Ma Journée` n'affiche que des
  statistiques agrégées ; `CarteMission` existe mais n'est utilisé nulle
  part). Le Copilote v1 est donc **indépendant de toute mission en cours**.
  La conscience contextuelle est reportée à un chantier futur, après
  construction de l'écran de liste des missions du jour.
- **Différenciation vs `/recherche` : présentation, pas moteur.** Le
  Copilote pose une question ouverte en langage courant et met en avant
  **un résultat principal comme réponse**, plutôt qu'une liste de résultats
  à parcourir. Le moteur sous-jacent est identique.

## Architecture

Aucune nouvelle infrastructure. Réutilise entièrement la couche données de
Recherche Intelligente (`lib/data/recherche.ts` :
`searchSituationsTerrain`, `getSituationTerrainDetail`) et la page détail
existante (`/situations/[id]`). Le seul ajout est un écran `/copilote` avec
une présentation différente des mêmes résultats.

### Écran `/copilote` (protégé, authentifié)

- `proxy.ts` : ajouter `/copilote` à `PROTECTED_PATHS`/`matcher`, aux côtés
  de `/ma-journee`, `/recherche`, `/situations` (déjà en place).
- Formulaire de question ouverte (soumission `?q=...`, même mécanisme GET
  que `/recherche` — pas de recherche instantanée, pas de JS client).
  Placeholder distinct de `/recherche` : orienté question complète plutôt
  que mot-clé (ex. "Le patient a une plaie qui s'infecte, que faire ?").
- Appelle `searchSituationsTerrain(supabase, query)` (inchangée).
- **Premier résultat mis en avant** comme réponse : nouveau composant
  visuellement proéminent (titre, observation, aperçu de la conduite à
  tenir — 2-3 premiers éléments, pas la liste complète), avec un bouton
  vers la fiche complète `/situations/[id]` (déjà construite, inchangée).
- **Résultats suivants** (s'il y en a d'autres) affichés en dessous, plus
  discrets, réutilisant le composant existant `CarteSituationTerrain` de
  Recherche Intelligente.
- **Aucun résultat** : message adapté au ton "question" plutôt que
  "recherche" (voir Cas limites).

### Nouveau composant : carte "réponse"

- `components/ui/CarteReponse.tsx` : reçoit une `SituationTerrain`, affiche
  titre + observation + un extrait de `conduiteATenir` (2-3 items, pas
  tous), lien "Voir la fiche complète" vers `/situations/[id]`.
- Ne duplique pas le rendu complet de `/situations/[id]` — reste un
  résumé + lien, pas une réimplémentation de la page détail.
- Suit les mêmes tokens Tailwind que les composants existants
  (`rounded-card`, `text-navy`, `bg-navy/10`, grille 8px) — pas de nouvelle
  couleur ni de nouvelle échelle.

## Gestion des cas limites

- Champ de question vide au chargement initial : aucune recherche lancée,
  pas d'erreur — juste le formulaire.
- Question sans résultat : message « Je n'ai pas trouvé de réponse à cette
  question. Essayez de la reformuler. » (distinct du message de
  `/recherche`, qui reste « Aucun résultat pour « {query} ». »).
- Un seul résultat : affiché uniquement comme réponse principale, pas de
  section "autres résultats" vide en dessous.
- Situation "réponse principale" sans Mission Clinique liée (cas réel :
  "Pansement qui saigne") : le composant carte-réponse n'affiche que ce
  qu'il a (titre/observation/conduite à tenir) — la mission liée n'est
  visible que sur la fiche complète après clic, pas dupliquée ici.

## Tests

- Vitest : `CarteReponse` (rendu titre/observation/extrait conduite à
  tenir/lien), même pattern que `CarteSituationTerrain.test.tsx`.
- Playwright (smoke) : redirection non-authentifiée sur `/copilote`, même
  pattern que `e2e/recherche.spec.ts`.
- Pas de nouveau test sur `searchSituationsTerrain`/`getSituationTerrainDetail`
  — logique inchangée, déjà testée par Recherche Intelligente.

## Alternatives écartées

- **Compréhension de l'intention via LLM (reformulation de la question en
  requête de recherche) :** écartée pour cette v1 — nouvelle dépendance
  externe (coût, latence, clé API) pour un bénéfice incertain tant que la
  recherche plein-texte + trigram existante n'a pas montré ses limites en
  usage réel.
- **Réponses générées par IA (RAG) :** écartée — risque de responsabilité
  médicale jugé trop élevé pour une v1 ; le contenu affiché doit rester
  strictement le texte déjà validé, jamais reformulé.
- **Conscience du contexte (mission en cours, historique, favoris) :**
  écartée pour cette v1 — dépend d'un écran de liste des missions du jour
  qui n'existe pas encore. Chantier futur une fois ce prérequis construit.
- **Réimplémentation complète de la fiche détail dans la carte-réponse :**
  écartée — dupliquerait `/situations/[id]` sans raison ; un résumé + lien
  suffit et évite la duplication de code.

## Hors scope (rappel)

- Tout appel LLM (compréhension d'intention ou génération de réponse).
- Conscience contextuelle (mission en cours, historique, favoris, HUB).
- Liaison NGAP dans les résultats (déjà hors scope de Recherche
  Intelligente, toujours hors scope ici).
- Production de contenu clinique réel.
