# Ely — Badge de fiabilité dans le chat — Design

**Statut :** Design validé en dialogue avec la fondatrice (2026-08-05).

## Contexte

`ConversationEly.tsx` affiche la réponse d'Ely (`SituationTerrain`) dans une
bulle de chat, mais sans jamais montrer son `niveauConfiance`
(`"brouillon" | "relu" | "valide"`) — alors que ce statut est déjà affiché
partout ailleurs dans l'app (`/recherche`, `/situations/[id]`) via
`BadgeNiveauConfiance`. Sur les 18 situations en base, 12 sont encore au
statut `"brouillon"` (non relues) : une IDEL qui pose une question à Ely n'a
aujourd'hui aucun moyen de savoir si la réponse vient d'une fiche validée ou
d'un brouillon.

La donnée est déjà remontée jusqu'au composant — `poserQuestionElyAction`
retourne un `SituationTerrain` complet, `niveauConfiance` inclus
(`lib/data/recherche.ts:25`). C'est un chantier d'affichage pur, aucune
modification de la recherche ni des server actions.

## Décision actée avec la fondatrice

- **Badge seul, pas de texte d'avertissement supplémentaire.** Cohérent avec
  le reste de l'app, qui n'affiche que le badge sans phrase complémentaire.
- **Position : au-dessus du titre, sur sa propre ligne.** Plus sûr qu'un
  placement en ligne avec le titre, qui risquerait de mal s'enrouler sur les
  bulles de chat étroites (`max-w-[80%]`) en cas de titre long.

## Architecture

### `components/ui/ConversationEly.tsx` (modifié)

Un seul import ajouté, un seul élément inséré dans la bulle de réponse
(la branche `message.situation` de la boucle `messages.map`, ligne ~226) :

```tsx
import { BadgeNiveauConfiance } from "@/components/ui/BadgeNiveauConfiance";

// ...dans la bulle de réponse, juste avant le titre :
{message.situation ? (
  <>
    <BadgeNiveauConfiance niveau={message.situation.niveauConfiance} />
    <p className="mt-1.5 text-[14.5px] font-bold tracking-tight text-brand-violet">
      {message.situation.titre}
    </p>
    {/* ...reste inchangé... */}
```

`BadgeNiveauConfiance` est réutilisé tel quel (aucune modification) :
c'est déjà un composant autonome, sans dépendance à son contexte d'appel.

Rien d'autre ne change : la voix (`LectureVocaleReponse` lit le contenu de
la situation, pas le badge — cohérent avec la décision "badge seul"), la
recherche, les suggestions, le reste du chat.

## Cas limites

- **`message.situation === null`** (aucun résultat trouvé) : la branche
  `MESSAGE_AUCUN_RESULTAT` ne montre pas de badge — il n'y a pas de
  situation à qualifier. Comportement déjà correct, rien à changer.
- **Réponse initiale via `/ely?q=...`** (recherche déclenchée côté serveur
  par `app/(app)/ely/page.tsx`, premier message affiché) : passe par le même
  rendu que les tours suivants, donc le badge s'affiche automatiquement sans
  modification supplémentaire.

## Tests

- `components/ui/ConversationEly.test.tsx` (nouveau si le fichier n'existe
  pas déjà) : une réponse avec `niveauConfiance: "brouillon"` affiche le
  badge "Brouillon" ; une réponse `"valide"` affiche "Validé" ; l'état
  "aucun résultat" (`situation: null`) n'affiche aucun badge.

## Vérification manuelle

Poser une question qui matche une situation `"brouillon"` (ex. "arrêt
cardio-respiratoire") et une qui matche une situation `"valide"` (ex.
"hypoglycémie") depuis `/ely`, confirmer visuellement la présence et la
couleur du badge dans les deux cas.

## Alternatives écartées

- **Badge + phrase d'avertissement pour les brouillons** : écarté par la
  fondatrice — le badge seul est déjà le langage visuel établi ailleurs
  dans l'app ; une phrase supplémentaire alourdirait la bulle sans être
  cohérente avec ce précédent.
- **Restreindre la recherche d'Ely aux situations `"valide"` uniquement** :
  non retenu ici — hors scope de cette demande (qui porte sur l'affichage,
  pas sur le comportement de recherche) ; changerait aussi significativement
  ce qu'Ely peut répondre (2/3 des situations sont encore "brouillon").
  Question à part si elle se pose un jour.

## Hors scope (rappel)

- Toute évolution du moteur de recherche ou de la couverture clinique.
- Conscience contextuelle (mission en cours) — chantier futur déjà identifié
  ailleurs, indépendant de celui-ci.
