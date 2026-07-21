# Ely — Réponse lue à voix haute — Design

**Statut :** Design validé en dialogue avec la fondatrice (2026-07-21). Reste
à valider : ce document écrit, avant de passer au plan d'implémentation.

## Contexte

`app/(app)/ely/page.tsx` permet déjà de poser une question clinique (avec
dictée vocale en entrée, via `ChampRechercheVocale` /
`lib/reconnaissance-vocale.ts`) et affiche la réponse la plus proche sous
forme de carte texte (`CarteReponse`). Le document de vision produit
(`SOINELY MVP Écran 6.pdf`, "Copilote Vocal™") décrit un usage mains libres
complet : mot d'activation "Dis-moi Ely", salutation "Je t'écoute", question
dictée, puis réponse lue à voix haute — pensé pour une IDEL en tournée,
souvent les mains prises.

Ce chantier ne couvre que la dernière brique : **la réponse lue à voix
haute**. Le mot d'activation et l'écoute permanente sont un chantier
distinct, plus complexe (écoute en arrière-plan, faux positifs, vie privée),
traité séparément après celui-ci.

## Décisions actées avec la fondatrice

- **Lecture automatique**, pas de bouton "Écouter" à appuyer — dès que la
  réponse s'affiche après une recherche, elle s'énonce. Cohérent avec
  l'usage mains libres visé (typiquement juste après avoir dicté la
  question).
- **Bouton "🔇 Couper" pendant la lecture** — une IDEL peut être devant un
  patient au moment où le son se déclenche ; elle doit pouvoir l'interrompre
  immédiatement.
- **Texte lu = exactement ce qui s'affiche visuellement** dans
  `CarteReponse` : titre, observation, et les 3 premières étapes de conduite
  à tenir (`situation.conduiteATenir.slice(0, 3)`, déjà le même sous-ensemble
  que la carte affiche). Pas de texte séparé à maintenir en double.
- **API native du navigateur** (`window.speechSynthesis` /
  `SpeechSynthesisUtterance`), même famille que `reconnaissance-vocale.ts`
  pour la dictée — aucune dépendance ni service externe.
- **Dégradation silencieuse** si l'API n'est pas supportée : pas de bouton,
  pas d'erreur, la carte texte reste utilisable normalement.

## Architecture

### Nouveau module `lib/synthese-vocale.ts`

Miroir de `lib/reconnaissance-vocale.ts` pour la sortie plutôt que l'entrée :

```ts
declare global {
  interface Window {
    SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
  }
}

export function lireSupportSyntheseClient(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function lireSupportSyntheseServeur(): boolean {
  return false;
}

export function souscrireSupportSynthese() {
  return () => {};
}

export function lireTexteAVoixHaute(texte: string, onFin: () => void): void {
  const utterance = new SpeechSynthesisUtterance(texte);
  utterance.lang = "fr-FR";
  utterance.onend = onFin;
  utterance.onerror = onFin;
  window.speechSynthesis.speak(utterance);
}

export function couperLecture(): void {
  window.speechSynthesis.cancel();
}
```

`onFin` remet le composant appelant en état "pas en train de lire" (fin
naturelle, erreur, ou coupure manuelle déclenchent tous `onend`/`onerror` —
`couperLecture()` via `cancel()` déclenche `onerror`, pas `onend`, d'où le
branchement des deux vers le même callback).

### Nouveau composant `components/ui/LectureVocaleReponse.tsx`

```tsx
"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  couperLecture,
  lireSupportSyntheseClient,
  lireSupportSyntheseServeur,
  lireTexteAVoixHaute,
  souscrireSupportSynthese,
} from "@/lib/synthese-vocale";

interface LectureVocaleReponseProps {
  texte: string;
}

export function LectureVocaleReponse({ texte }: LectureVocaleReponseProps) {
  const [enCours, setEnCours] = useState(false);
  const supporte = useSyncExternalStore(
    souscrireSupportSynthese,
    lireSupportSyntheseClient,
    lireSupportSyntheseServeur
  );

  useEffect(() => {
    if (!supporte || !texte.trim()) return;

    setEnCours(true);
    lireTexteAVoixHaute(texte, () => setEnCours(false));

    return () => {
      couperLecture();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texte, supporte]);

  if (!supporte || !enCours) return null;

  return (
    <button
      type="button"
      onClick={() => couperLecture()}
      className="inline-flex items-center gap-1.5 rounded-full bg-navy/10 px-3 py-1.5 text-sm font-medium text-navy transition-colors hover:bg-navy/15"
    >
      <span aria-hidden="true">🔇</span> Couper
    </button>
  );
}
```

Le `useEffect` se déclenche au montage (une seule fois par page, puisque
`/ely` est une vraie navigation GET, pas un fetch client) et à chaque
changement de `texte` (protection si le composant était un jour réutilisé
sans remonter). Le cleanup annule la lecture si l'utilisateur quitte la
page pendant qu'elle parle.

### `app/(app)/ely/page.tsx` (modifié)

Construit le texte à lire (même sous-ensemble que `CarteReponse`) et rend
`LectureVocaleReponse` juste après `CarteReponse` :

```tsx
{reponse && (
  <>
    <CarteReponse situation={reponse} />
    <LectureVocaleReponse
      texte={[reponse.titre, reponse.observation, ...reponse.conduiteATenir.slice(0, 3)].join(". ")}
    />
  </>
)}
```

## Gestion des cas limites

- Navigateur sans `speechSynthesis` (support serveur toujours `false`,
  cohérent avec `lireSupportVocalServeur` existant) : composant ne rend
  rien, aucune erreur.
- Aucun résultat de recherche : `reponse` est `undefined`, ni `CarteReponse`
  ni `LectureVocaleReponse` ne sont rendus.
- Nouvelle recherche pendant une lecture en cours : navigation complète de
  page (formulaire `method="GET"`), l'ancien composant est démonté (cleanup
  → `couperLecture()`) avant que le nouveau ne monte et lance sa propre
  lecture — pas de chevauchement possible.
- Utilisateur clique "Couper" : `cancel()` déclenche `onerror` côté
  `SpeechSynthesisUtterance`, remonté vers le même `onFin` que `onend` →
  bouton disparaît immédiatement.

## Tests

- Vitest (`lib/synthese-vocale.test.ts`) : `lireSupportSyntheseClient`
  (présent/absent), `lireTexteAVoixHaute` (appelle `speechSynthesis.speak`
  avec un `SpeechSynthesisUtterance` configuré en `fr-FR`, déclenche `onFin`
  sur `onend` et sur `onerror`), `couperLecture` (appelle
  `speechSynthesis.cancel`).
- Vitest + Testing Library (`components/ui/LectureVocaleReponse.test.tsx`),
  même style que `ChampAvecDictee.test.tsx` (mock de
  `window.speechSynthesis`/`window.SpeechSynthesisUtterance`) : lance la
  lecture au montage, affiche le bouton "Couper" pendant la lecture, le
  bouton disparaît après `onend`, cliquer "Couper" appelle `cancel()` et
  fait disparaître le bouton, ne rend rien si le support est absent.
- Pas de nouveau test e2e Playwright dédié — `jsdom` n'implémente pas
  `speechSynthesis`, un test e2e réel nécessiterait un vrai navigateur avec
  audio, hors de portée du pipeline CI actuel (même limite déjà acceptée
  pour `reconnaissance-vocale.ts`, non testé en e2e).

## Vérification manuelle

Avec autorisation explicite de la fondatrice, dans un navigateur avec
support de la synthèse vocale (Chrome ou Edge desktop) : poser une question
sur `/ely`, confirmer que la réponse s'énonce automatiquement en français,
confirmer que le bouton "Couper" apparaît pendant la lecture et l'interrompt
immédiatement au clic, poser une nouvelle question et confirmer qu'aucun
chevauchement audio ne se produit avec la lecture précédente.

## Alternatives écartées

- **Bouton "Écouter" à déclenchement manuel** au lieu d'automatique : écarté
  par la fondatrice — l'usage mains libres visé perd son intérêt si chaque
  réponse nécessite un tap supplémentaire.
- **Service de synthèse vocale externe** (ex. cloud TTS pour une voix plus
  naturelle) : écarté pour cette v1 — coût et dépendance externe non
  justifiés tant que l'API native du navigateur suffit ; réévaluable si la
  qualité de voix devient un point de friction réel.
- **Texte lu différent du texte affiché** (résumé encore plus court à
  l'oral) : écarté — dupliquer la logique de résumé entre l'affichage et la
  lecture créerait un risque de désynchronisation ; réutiliser exactement le
  sous-ensemble déjà affiché est plus simple et plus sûr.

## Hors scope (rappel)

- Mot d'activation "Dis-moi Ely" et salutation "Je t'écoute" — chantier
  séparé, à spécifier après celui-ci.
- Écoute permanente / toujours active.
- Préférence utilisateur persistante pour activer/désactiver la lecture
  automatique (à ajouter plus tard si le besoin se confirme).
- Choix de la voix ou réglage du débit de lecture.
