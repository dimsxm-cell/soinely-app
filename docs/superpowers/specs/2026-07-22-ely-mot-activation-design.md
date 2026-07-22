# Ely — Mot d'activation vocal — Design

**Statut :** Design validé en dialogue avec la fondatrice (2026-07-22).

## Contexte

`app/(app)/ely/page.tsx` permet déjà de poser une question clinique (dictée
vocale via un bouton micro, `ChampRechercheVocale`) et de recevoir une
réponse affichée et lue à voix haute (`LectureVocaleReponse`, chantier
précédent — voir `docs/superpowers/specs/2026-07-21-ely-reponse-vocale-design.md`).
Ce chantier ne couvre que le déclenchement mains libres décrit dans le
document de vision "Copilote Vocal™" : dire "Dis-moi Ely", entendre
"Je t'écoute", poser sa question, recevoir la réponse — sans toucher
l'écran.

## Contrainte technique de départ

`window.SpeechRecognition` / `webkitSpeechRecognition` (l'API utilisée pour
toute reconnaissance vocale dans cette app) **n'est pas implémentée par
Safari, ni sur macOS ni sur iOS** — donc pas sur l'iPhone de la fondatrice.
Le bouton micro existant (`ChampRechercheVocale`) le sait déjà et se cache
silencieusement via `lireSupportVocalClient()`. Par ailleurs, même là où
l'API existe (Chrome/Edge/Android), elle envoie l'audio au cloud Google pour
la reconnaissance — pas de traitement local.

Conséquence actée avec la fondatrice : le chantier a **deux chemins de
déclenchement complémentaires**, pas un seul.

## Décisions actées avec la fondatrice

- **Chemin A — appui long, tous appareils.** Un appui long (~500 ms) sur
  l'onglet "Ely" de la barre de navigation basse déclenche la séquence
  "Je t'écoute" → écoute de la question → réponse. Fonctionne partout,
  y compris iPhone (dégradation silencieuse : sans support, l'appui long ne
  fait rien de plus qu'un tap normal).
- **Chemin B — mot d'activation "Dis-moi Ely", Android/Chrome/Edge
  uniquement, désactivé par défaut.** Une vraie écoute de fond détecte la
  phrase prononcée, sans geste physique. Réglage explicite dans "Mon
  compte" (off par défaut) car l'écoute de fond tourne en continu tant
  qu'un écran de l'app est ouvert, y compris chez un patient.
- **Un tap court** sur l'onglet Ely continue de fonctionner exactement comme
  aujourd'hui (navigation classique).
- **Envoi automatique** de la question dictée dès qu'elle est captée — zéro
  tap requis entre la question et la réponse, dans les deux chemins.
- **Retour vocal en cas d'échec** ("Je n'ai pas compris, réessaie.") plutôt
  qu'un retour silencieux à l'état de repos — cohérent avec un usage
  mains libres où l'IDEL ne regarde pas forcément l'écran.
- **Retour haptique** (vibration courte) dès qu'un déclenchement est
  reconnu (fin de l'appui long, ou phrase d'activation détectée) —
  confirmation immédiate sans avoir à regarder l'écran.
- **Annulation en cours de séquence** : un tap simple sur l'onglet Ely
  pendant qu'Ely parle ou écoute coupe tout et revient au repos — même
  logique que le bouton "Couper" du chantier précédent.
- **Pas d'indicateur visuel custom pour l'écoute de fond** — on s'appuie sur
  l'indicateur natif du navigateur/OS (icône micro déjà affichée par
  Chrome/Android quand un site utilise le micro) plutôt que d'en dupliquer
  un.
- **Un seul micro actif à la fois.** L'écoute de fond, l'appui long et les
  dictées manuelles existantes (`ChampRechercheVocale`, `ChampAvecDictee`)
  ne doivent jamais tourner simultanément.

## Architecture

### 1. `lib/reconnaissance-vocale.ts` (modifié)

`creerReconnaissanceVocale()` gagne un paramètre optionnel pour piloter
l'écoute continue, nécessaire au chemin B (le chemin A et les usages
existants gardent le comportement par défaut, une seule phrase puis arrêt).
Le type `onerror` est précisé pour exposer le code d'erreur — nécessaire au
chemin B pour distinguer un refus de permission (`not-allowed`, définitif)
d'une erreur transitoire (`no-speech`, `network`, à retenter) :

```ts
export interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

export interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
}

export interface OptionsReconnaissanceVocale {
  continuous?: boolean;
}

export function creerReconnaissanceVocale(
  options: OptionsReconnaissanceVocale = {}
): SpeechRecognitionInstance | null {
  const SpeechRecognitionClass = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!SpeechRecognitionClass) return null;

  const recognition = new SpeechRecognitionClass();
  recognition.lang = "fr-FR";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = options.continuous ?? false;
  return recognition;
}
```

Élargir `onerror` d'un callback à 0 argument vers 1 argument est compatible
avec les 3 usages existants (`ChampRechercheVocale`, `ChampAvecDictee` ×2) —
un callback qui ignore ses arguments reste valide.

### 2. `lib/verrou-microphone.ts` (nouveau)

Verrou minimal en mémoire pour garantir qu'un seul flux de reconnaissance
tourne à la fois entre les trois consommateurs (écoute de fond, appui long,
dictées manuelles) :

```ts
export type ProprietaireMicrophone = "ecoute-fond" | "declenchement-manuel" | "dictee";

let proprietaireActuel: ProprietaireMicrophone | null = null;

export function acquerirMicrophone(proprietaire: ProprietaireMicrophone): boolean {
  if (proprietaireActuel !== null) return false;
  proprietaireActuel = proprietaire;
  return true;
}

export function relacherMicrophone(proprietaire: ProprietaireMicrophone): void {
  if (proprietaireActuel === proprietaire) {
    proprietaireActuel = null;
  }
}
```

`ChampRechercheVocale` et `ChampAvecDictee` devront aussi acquérir/relâcher
ce verrou autour de leur `recognition.start()`/fin de session — petite
modification supplémentaire à ces deux fichiers existants, pour que le
verrou soit réellement respecté par tous les consommateurs du micro.

### 3. `components/layout/OngletEly.tsx` (nouveau) — chemin A

Remplace l'entrée "Ely" dans `BarreNavigationBasse`. Rendu visuel identique
à l'existant (même icône, même style actif/inactif) ; gagne la détection
d'appui long :

```tsx
"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { couperLecture, lireTexteAVoixHaute } from "@/lib/synthese-vocale";
import { creerReconnaissanceVocale } from "@/lib/reconnaissance-vocale";
import { acquerirMicrophone, relacherMicrophone } from "@/lib/verrou-microphone";

const SEUIL_APPUI_LONG_MS = 500;

export function OngletEly({ actif }: { actif: boolean }) {
  const router = useRouter();
  const minuteurRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const declencheRef = useRef(false);
  const [enSequence, setEnSequence] = useState(false);

  function demarrerMinuteur() {
    declencheRef.current = false;
    minuteurRef.current = setTimeout(() => {
      declencheRef.current = true;
      demarrerSequence();
    }, SEUIL_APPUI_LONG_MS);
  }

  function annulerMinuteur() {
    if (minuteurRef.current) clearTimeout(minuteurRef.current);
  }

  function demarrerSequence() {
    if (!acquerirMicrophone("declenchement-manuel")) return;
    navigator.vibrate?.(50);
    setEnSequence(true);
    lireTexteAVoixHaute("Je t'écoute", () => {}, demarrerEcouteQuestion);
  }

  function demarrerEcouteQuestion() {
    const recognition = creerReconnaissanceVocale();
    if (!recognition) {
      relacherMicrophone("declenchement-manuel");
      setEnSequence(false);
      return;
    }
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) router.push(`/ely?q=${encodeURIComponent(transcript)}`);
    };
    recognition.onerror = () => {
      lireTexteAVoixHaute("Je n'ai pas compris, réessaie.", () => {}, () => {});
    };
    recognition.onend = () => {
      relacherMicrophone("declenchement-manuel");
      setEnSequence(false);
    };
    recognition.start();
  }

  function handleClick(e: React.MouseEvent) {
    if (declencheRef.current) {
      e.preventDefault();
      return;
    }
    if (enSequence) {
      e.preventDefault();
      couperLecture();
      relacherMicrophone("declenchement-manuel");
      setEnSequence(false);
    }
  }

  return (
    <Link
      href="/ely"
      onPointerDown={demarrerMinuteur}
      onPointerUp={annulerMinuteur}
      onPointerLeave={annulerMinuteur}
      onClick={handleClick}
      aria-current={actif ? "page" : undefined}
      className={`flex w-14 flex-col items-center gap-1 py-1 text-[11px] font-medium transition-colors ${
        actif ? "text-brand-violet" : "text-navy/40"
      }`}
    >
      {/* IconeEly existante */}
      Ely
    </Link>
  );
}
```

`BarreNavigationBasse.tsx` sort "Ely" du tableau générique `ONGLETS_DROITE`
et rend `<OngletEly actif={estActif(pathname, "/ely")} />` à la place.

### 4. `components/layout/EcouteDeFondEly.tsx` (nouveau) — chemin B

Monté une fois dans `app/(app)/layout.tsx`, ne rend rien de visible. Tant
que le réglage est actif et le navigateur compatible, fait tourner une
reconnaissance continue et compare chaque bribe transcrite à la phrase
d'activation :

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { creerReconnaissanceVocale, lireSupportVocalClient } from "@/lib/reconnaissance-vocale";
import { lireTexteAVoixHaute } from "@/lib/synthese-vocale";
import { acquerirMicrophone, relacherMicrophone } from "@/lib/verrou-microphone";

const PHRASE_ACTIVATION = "dis moi ely";
const NOUVELLE_TENTATIVE_MS = 2000;

function normaliser(texte: string): string {
  return texte.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

export function EcouteDeFondEly({ ecoutePermanenteActivee }: { ecoutePermanenteActivee: boolean }) {
  const router = useRouter();
  const abandonneRef = useRef(false);

  useEffect(() => {
    if (!ecoutePermanenteActivee || !lireSupportVocalClient()) return;

    let arrete = false;

    function ecouterMotActivation() {
      if (arrete || abandonneRef.current) return;
      if (!acquerirMicrophone("ecoute-fond")) {
        setTimeout(ecouterMotActivation, NOUVELLE_TENTATIVE_MS);
        return;
      }

      const recognition = creerReconnaissanceVocale({ continuous: true });
      if (!recognition) {
        relacherMicrophone("ecoute-fond");
        return;
      }

      recognition.onresult = (event) => {
        const dernier = event.results[event.results.length - 1]?.[0]?.transcript ?? "";
        if (normaliser(dernier).includes(PHRASE_ACTIVATION)) {
          recognition.stop();
          declencherSequence();
        }
      };
      recognition.onerror = (event) => {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          abandonneRef.current = true;
        }
      };
      recognition.onend = () => {
        relacherMicrophone("ecoute-fond");
        if (!arrete && !abandonneRef.current) ecouterMotActivation();
      };

      recognition.start();
    }

    function declencherSequence() {
      relacherMicrophone("ecoute-fond");
      navigator.vibrate?.(50);
      lireTexteAVoixHaute("Je t'écoute", () => {}, demarrerEcouteQuestion);
    }

    function demarrerEcouteQuestion() {
      if (!acquerirMicrophone("ecoute-fond")) return;
      const recognition = creerReconnaissanceVocale();
      if (!recognition) {
        relacherMicrophone("ecoute-fond");
        return;
      }
      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) router.push(`/ely?q=${encodeURIComponent(transcript)}`);
      };
      recognition.onerror = () => {
        lireTexteAVoixHaute("Je n'ai pas compris, réessaie.", () => {}, () => {});
      };
      recognition.onend = () => {
        relacherMicrophone("ecoute-fond");
        if (!arrete && !abandonneRef.current) ecouterMotActivation();
      };
      recognition.start();
    }

    ecouterMotActivation();

    return () => {
      arrete = true;
      relacherMicrophone("ecoute-fond");
    };
  }, [ecoutePermanenteActivee, router]);

  return null;
}
```

Ce composant est le plus complexe du chantier (boucle de relance, verrou
partagé, deux sous-séquences). Le code ci-dessus fixe le **comportement
attendu** ; les détails de séquencement exacts (ordre des `relacherMicrophone`,
gestion des races entre `onend` et `onresult`) seront vérifiés et, si
nécessaire, affinés pendant l'implémentation et son passage de tests —
c'est le composant qui mérite la revue la plus attentive du chantier.

### 5. `app/(app)/layout.tsx` (modifié)

Devient async pour lire le réglage côté serveur, même pattern que
`app/(app)/compte/page.tsx` :

```tsx
import { createClient } from "@/lib/supabase/server";
import { BarreNavigationBasse } from "@/components/layout/BarreNavigationBasse";
import { BarreSuperieure } from "@/components/layout/BarreSuperieure";
import { EcouteDeFondEly } from "@/components/layout/EcouteDeFondEly";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ecoutePermanenteActivee = Boolean(user?.user_metadata?.ecoute_permanente_ely);

  return (
    <div className="min-h-screen bg-[#F6F7F5]">
      <BarreSuperieure />
      <div className="pb-24">{children}</div>
      <BarreNavigationBasse />
      <EcouteDeFondEly ecoutePermanenteActivee={ecoutePermanenteActivee} />
    </div>
  );
}
```

### 6. `app/(app)/compte/actions.ts` (nouveau) et `app/(app)/compte/page.tsx` (modifié)

Server action, même pattern que `app/reinitialiser-mot-de-passe/actions.ts` :

```ts
"use server";

import { createClient } from "@/lib/supabase/server";

export async function mettreAJourEcoutePermanenteAction(formData: FormData): Promise<void> {
  const activee = formData.get("ecoute_permanente_ely") === "on";
  const supabase = await createClient();
  await supabase.auth.updateUser({ data: { ecoute_permanente_ely: activee } });
}
```

`ComptePage` lit `user.user_metadata?.ecoute_permanente_ely` (comme elle lit
déjà `full_name`) et ajoute une section "Copilote vocal" avec une case à
cocher qui soumet automatiquement le formulaire au changement (pattern
`onChange={(e) => e.currentTarget.form?.requestSubmit()}` dans un petit
wrapper client), pour se comporter comme un interrupteur plutôt qu'exiger un
bouton "Enregistrer" séparé.

## Gestion des cas limites

- **Tap court sur Ely** : comportement inchangé, navigation classique.
- **Appareil sans `SpeechRecognition` (Safari/iOS)** : chemin A dégrade en
  tap normal (aucun minuteur ne se déclenche d'effet visible), chemin B ne
  démarre jamais (`lireSupportVocalClient()` bloque `EcouteDeFondEly` avant
  toute tentative).
- **Permission micro refusée** : chemin A échoue silencieusement au moment
  du tap (dégradation cohérente avec le reste de l'app) ; chemin B
  s'arrête définitivement pour la session (`abandonneRef`) sans boucle de
  relance, jusqu'au prochain chargement de page.
- **Dictée manuelle utilisée pendant que le chemin B tourne** : le verrou
  refuse l'acquisition côté dictée manuelle tant que `ecoute-fond` est
  actif ; il faudra que `ChampRechercheVocale`/`ChampAvecDictee` retentent
  ou informent l'utilisatrice si le micro est occupé — à trancher dans le
  plan (probable : la dictée manuelle a toujours priorité, elle peut couper
  l'écoute de fond en cours plutôt que d'attendre, puisqu'un geste explicite
  de l'IDEL doit primer sur une écoute passive).
- **Phrase mal reconnue** (ex. "dis-moi Ellie") : pas de tolérance floue en
  v1, la phrase doit apparaître littéralement (après normalisation
  accents/casse) dans la transcription — un essai raté n'a pas de
  conséquence, l'écoute de fond continue.
- **Nouvelle question pendant la lecture d'une réponse précédente** : la
  navigation complète de page (via `router.push`) démonte l'ancien
  `LectureVocaleReponse`, dont le cleanup coupe la lecture en cours — pas de
  chevauchement, même garantie que le chantier précédent.

## Tests

- `lib/reconnaissance-vocale.test.ts` : cas ajoutés pour le paramètre
  `continuous` (défaut `false`, passé `true` quand fourni) et pour le
  nouveau typage `onerror`.
- `lib/verrou-microphone.test.ts` (nouveau) : acquisition/relâchement,
  refus si déjà pris, relâchement no-op si appelé par un non-propriétaire.
- `components/layout/OngletEly.test.tsx` (nouveau) : tap court → navigation
  normale ; appui < 500 ms relâché → pas de séquence déclenchée ; appui ≥
  500 ms → vibration + "Je t'écoute" + écoute + navigation avec la
  transcription ; erreur/silence → message vocal de repli ; tap pendant la
  séquence → tout s'arrête.
- `components/layout/EcouteDeFondEly.test.tsx` (nouveau) : ne démarre pas si
  réglage désactivé ou navigateur non supporté ; démarre et relance après un
  `onend` naturel ; phrase détectée déclenche la séquence complète ;
  `not-allowed` arrête définitivement sans boucle ; verrou refusé retente
  après le délai.
- Pas de nouveau test e2e Playwright — même limite déjà acceptée pour le
  reste de la reconnaissance/synthèse vocale (jsdom ne les implémente pas).

## Vérification manuelle

Avec autorisation explicite de la fondatrice, sur un appareil Android/Chrome
et sur son iPhone :

- **iPhone** : confirmer que le tap court sur Ely fonctionne normalement,
  que l'appui long déclenche "Je t'écoute" puis la question puis la
  réponse, et qu'aucune option d'écoute de fond n'apparaît comme active
  côté navigateur (puisque non supportée).
- **Android/Chrome** : activer le réglage dans "Mon compte", dire
  "Dis-moi Ely" depuis un autre écran de l'app, confirmer la vibration, la
  salutation, la capture de la question, la réponse. Désactiver le réglage
  et confirmer que l'écoute de fond s'arrête. Tester la dictée manuelle sur
  un champ patient pendant que le réglage est actif pour confirmer l'absence
  de conflit micro.

## Alternatives écartées

- **Écoute de fond comme seul mécanisme, sans repli par appui long** :
  écarté — aurait laissé l'iPhone de la fondatrice, et Safari en général,
  sans aucun moyen mains libres d'utiliser Ely.
- **Écoute de fond activée par défaut** : écartée par la fondatrice —
  capter de l'audio ambiant chez un patient sans geste explicite de
  consentement n'est pas acceptable par défaut dans ce contexte.
- **Détection floue/tolérante de la phrase d'activation** (ex. distance de
  Levenshtein, variantes phonétiques) : écartée pour cette v1 — complexité
  disproportionnée tant que le taux de faux négatifs réel n'est pas mesuré ;
  réévaluable si "Dis-moi Ely" s'avère peu fiable en usage réel.
- **Indicateur visuel custom d'écoute active** : écarté — le navigateur/OS
  affiche déjà un indicateur natif quand le micro est utilisé ; en ajouter
  un propre à l'app dupliquerait ce signal sans bénéfice clair pour cette
  v1.
- **Moteur de mot-clé embarqué (type Porcupine), sans cloud, compatible
  iPhone** : écarté pour cette v1 — chantier technique disproportionné
  (modèle embarqué, licence, entraînement) par rapport au reste de l'app ;
  resterait une option future si l'écoute de fond cloud-only s'avère trop
  limitante.

## Hors scope (rappel)

- Conversation continue après la première réponse (un aller-retour : une
  question, une réponse, retour au repos).
- Tooltip/onboarding pour aider à découvrir le geste d'appui long.
- Réglage du seuil de durée de l'appui long, choix de la phrase
  d'activation, choix de la voix ou du débit de lecture.
