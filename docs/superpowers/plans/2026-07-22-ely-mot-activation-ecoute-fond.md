# Ely — Mot d'activation vocal (chemin B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sur Android/Chrome/Edge, et seulement si l'IDEL l'a explicitement activé dans "Mon compte", une écoute de fond détecte la phrase "Dis-moi Ely" prononcée depuis n'importe quel écran de l'app et déclenche la même séquence mains libres que l'appui long (déjà livré) — vibration, "Je t'écoute", écoute de la question, réponse.

**Architecture:** Nouveau composant `EcouteDeFondEly`, monté une fois dans le layout de l'app, qui fait tourner une reconnaissance vocale continue et compare chaque bribe transcrite à la phrase d'activation. Un nouveau verrou micro partagé (`lib/verrou-microphone.ts`) coordonne cette écoute de fond avec l'appui long (déjà livré) et les dictées manuelles existantes, pour qu'un seul flux de reconnaissance tourne à la fois — les gestes explicites (appui long, dictée) volent toujours le micro immédiatement ; l'écoute de fond ne vole jamais, elle retente après un court délai.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest + Testing Library, Web Speech API (`SpeechRecognition`, `speechSynthesis`), Supabase Auth (`user_metadata`).

## Global Constraints

- Chemin A (appui long) est déjà mergé sur `main` (PR #48) : `components/layout/OngletEly.tsx` existe déjà et remplace déjà l'entrée "Ely" dans `components/layout/BarreNavigationBasse.tsx`. Ne pas recréer ces fichiers depuis zéro — les modifier.
- Phrase d'activation (comparée après normalisation minuscules + suppression des accents) : `"dis moi ely"`.
- Message de salutation (identique au chemin A, déjà en prod) : `"Je t'écoute"`.
- Message de repli en cas d'échec (identique au chemin A) : `"Je n'ai pas compris, réessaie."`.
- Vibration au déclenchement (identique au chemin A) : `navigator.vibrate?.(50)`.
- Délai de nouvelle tentative si le verrou micro est occupé : `2000` ms.
- Champ de consentement : `user_metadata.ecoute_permanente_ely` (booléen), **désactivé par défaut** (absent = `false`).
- Un seul flux `SpeechRecognition` actif à la fois. Les gestes explicites (appui long, dictée manuelle) volent toujours le micro immédiatement (acquisition forcée). L'écoute de fond ne vole jamais — si le micro est occupé, elle retente après le délai ci-dessus.
- Pas d'indicateur visuel custom d'écoute active — on s'appuie sur l'indicateur natif du navigateur/OS.
- Pas de détection floue de la phrase d'activation — correspondance par sous-chaîne normalisée uniquement.
- Aucun changement de comportement observable pour les navigateurs sans `SpeechRecognition` (Safari/iOS) : l'écoute de fond ne démarre jamais, le reste de l'app est inchangé.

---

### Task 1: Verrou micro partagé

**Files:**
- Create: `lib/verrou-microphone.ts`
- Test: `lib/verrou-microphone.test.ts`

**Interfaces:**
- Produces: `export type ProprietaireMicrophone = "ecoute-fond" | "declenchement-manuel" | "dictee"`, `export function acquerirMicrophone(proprietaire: ProprietaireMicrophone, liberer: () => void): boolean`, `export function acquerirMicrophoneForce(proprietaire: ProprietaireMicrophone, liberer: () => void): void`, `export function relacherMicrophone(proprietaire: ProprietaireMicrophone): void`, `export function _reinitialiserVerrouPourTests(): void` — consommés par les Tasks 3, 4 et 5.

- [ ] **Step 1: Write the failing test**

Create `lib/verrou-microphone.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  acquerirMicrophone,
  acquerirMicrophoneForce,
  relacherMicrophone,
  _reinitialiserVerrouPourTests,
} from "./verrou-microphone";

afterEach(() => {
  _reinitialiserVerrouPourTests();
});

describe("verrou-microphone", () => {
  it("acquiert le micro quand il est libre", () => {
    const liberer = vi.fn();
    expect(acquerirMicrophone("dictee", liberer)).toBe(true);
  });

  it("refuse l'acquisition si déjà détenu par un autre propriétaire", () => {
    acquerirMicrophone("ecoute-fond", vi.fn());
    expect(acquerirMicrophone("dictee", vi.fn())).toBe(false);
  });

  it("relâche le micro pour son propriétaire", () => {
    acquerirMicrophone("dictee", vi.fn());
    relacherMicrophone("dictee");
    expect(acquerirMicrophone("ecoute-fond", vi.fn())).toBe(true);
  });

  it("ne relâche pas le micro d'un autre propriétaire", () => {
    acquerirMicrophone("ecoute-fond", vi.fn());
    relacherMicrophone("dictee");
    expect(acquerirMicrophone("dictee", vi.fn())).toBe(false);
  });

  it("l'acquisition forcée appelle le rappel de libération du détenteur précédent", () => {
    const liberer = vi.fn();
    acquerirMicrophone("ecoute-fond", liberer);
    acquerirMicrophoneForce("declenchement-manuel", vi.fn());
    expect(liberer).toHaveBeenCalledTimes(1);
  });

  it("l'acquisition forcée réussit même si le micro est déjà détenu", () => {
    acquerirMicrophone("ecoute-fond", vi.fn());
    acquerirMicrophoneForce("declenchement-manuel", vi.fn());
    expect(acquerirMicrophone("dictee", vi.fn())).toBe(false);
  });

  it("l'acquisition forcée fonctionne aussi quand le micro est déjà libre", () => {
    const liberer = vi.fn();
    acquerirMicrophoneForce("declenchement-manuel", liberer);
    expect(liberer).not.toHaveBeenCalled();
    expect(acquerirMicrophone("dictee", vi.fn())).toBe(false);
  });

  it("l'ancien détenteur ne peut plus relâcher après une acquisition forcée par un autre", () => {
    acquerirMicrophone("ecoute-fond", vi.fn());
    acquerirMicrophoneForce("declenchement-manuel", vi.fn());
    relacherMicrophone("ecoute-fond");
    expect(acquerirMicrophone("dictee", vi.fn())).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/verrou-microphone.test.ts`
Expected: FAIL — `Failed to resolve import "./verrou-microphone"` (le module n'existe pas encore).

- [ ] **Step 3: Write minimal implementation**

Create `lib/verrou-microphone.ts`:

```ts
export type ProprietaireMicrophone = "ecoute-fond" | "declenchement-manuel" | "dictee";

interface Detenteur {
  proprietaire: ProprietaireMicrophone;
  liberer: () => void;
}

let detenteurActuel: Detenteur | null = null;

export function acquerirMicrophone(proprietaire: ProprietaireMicrophone, liberer: () => void): boolean {
  if (detenteurActuel !== null) return false;
  detenteurActuel = { proprietaire, liberer };
  return true;
}

export function acquerirMicrophoneForce(proprietaire: ProprietaireMicrophone, liberer: () => void): void {
  detenteurActuel?.liberer();
  detenteurActuel = { proprietaire, liberer };
}

export function relacherMicrophone(proprietaire: ProprietaireMicrophone): void {
  if (detenteurActuel?.proprietaire === proprietaire) {
    detenteurActuel = null;
  }
}

export function _reinitialiserVerrouPourTests(): void {
  detenteurActuel = null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/verrou-microphone.test.ts`
Expected: `Test Files  1 passed (1)` / `Tests  7 passed (7)`

- [ ] **Step 5: Type check and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx eslint lib/verrou-microphone.ts lib/verrou-microphone.test.ts`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/verrou-microphone.ts lib/verrou-microphone.test.ts
git commit -m "feat: ajoute le verrou micro partagé"
```

---

### Task 2: Écoute continue dans `lib/reconnaissance-vocale.ts`

**Files:**
- Modify: `lib/reconnaissance-vocale.ts`
- Test: `lib/reconnaissance-vocale.test.ts` (nouveau — ce module n'a pas encore de test direct, il n'est aujourd'hui exercé qu'indirectement via ses consommateurs)

**Interfaces:**
- Produces: `creerReconnaissanceVocale(options?: { continuous?: boolean }): SpeechRecognitionInstance | null` (le paramètre est nouveau et optionnel — les 3 appels existants sans argument gardent leur comportement, `continuous` par défaut `false`). `SpeechRecognitionInstance` gagne un champ `continuous: boolean` et `onerror` est retypé en `((event: SpeechRecognitionErrorEventLike) => void) | null` où `SpeechRecognitionErrorEventLike extends Event { error: string }` — consommé par la Task 4.

- [ ] **Step 1: Write the failing test**

Create `lib/reconnaissance-vocale.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import {
  creerReconnaissanceVocale,
  lireSupportVocalClient,
  lireSupportVocalServeur,
  souscrireSupportVocal,
} from "./reconnaissance-vocale";

class FakeSpeechRecognition {
  lang = "";
  interimResults = false;
  maxAlternatives = 1;
  continuous = false;
}

afterEach(() => {
  Reflect.deleteProperty(window, "SpeechRecognition");
  Reflect.deleteProperty(window, "webkitSpeechRecognition");
});

describe("lireSupportVocalClient", () => {
  it("retourne false si aucune API de reconnaissance n'est disponible", () => {
    expect(lireSupportVocalClient()).toBe(false);
  });

  it("retourne true si SpeechRecognition est disponible", () => {
    window.SpeechRecognition = FakeSpeechRecognition as never;
    expect(lireSupportVocalClient()).toBe(true);
  });

  it("retourne true si seul webkitSpeechRecognition est disponible", () => {
    window.webkitSpeechRecognition = FakeSpeechRecognition as never;
    expect(lireSupportVocalClient()).toBe(true);
  });
});

describe("lireSupportVocalServeur", () => {
  it("retourne toujours false", () => {
    expect(lireSupportVocalServeur()).toBe(false);
  });
});

describe("souscrireSupportVocal", () => {
  it("retourne une fonction de désinscription sans effet", () => {
    const desinscrire = souscrireSupportVocal();
    expect(() => desinscrire()).not.toThrow();
  });
});

describe("creerReconnaissanceVocale", () => {
  it("retourne null si aucune API n'est disponible", () => {
    expect(creerReconnaissanceVocale()).toBeNull();
  });

  it("configure la reconnaissance en français, résultat unique, non continue par défaut", () => {
    window.SpeechRecognition = FakeSpeechRecognition as never;

    const recognition = creerReconnaissanceVocale();

    expect(recognition?.lang).toBe("fr-FR");
    expect(recognition?.interimResults).toBe(false);
    expect(recognition?.maxAlternatives).toBe(1);
    expect(recognition?.continuous).toBe(false);
  });

  it("active l'écoute continue quand demandé", () => {
    window.SpeechRecognition = FakeSpeechRecognition as never;

    const recognition = creerReconnaissanceVocale({ continuous: true });

    expect(recognition?.continuous).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/reconnaissance-vocale.test.ts`
Expected: FAIL — `recognition?.continuous` est `undefined` (pas `false`) dans le test "non continue par défaut", et le test "active l'écoute continue" échoue de la même façon puisque l'option `continuous` n'existe pas encore.

- [ ] **Step 3: Write minimal implementation**

In `lib/reconnaissance-vocale.ts`, replace the whole file with:

```ts
export interface SpeechRecognitionResultItem {
  transcript: string;
}

export interface SpeechRecognitionEvent extends Event {
  results: { [index: number]: { [index: number]: SpeechRecognitionResultItem } };
}

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

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function souscrireSupportVocal() {
  return () => {};
}

export function lireSupportVocalClient(): boolean {
  return Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition);
}

export function lireSupportVocalServeur(): boolean {
  return false;
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/reconnaissance-vocale.test.ts`
Expected: `Test Files  1 passed (1)` / `Tests  7 passed (7)`

- [ ] **Step 5: Confirm existing consumers still compile and pass**

Run: `npx tsc --noEmit`
Expected: no errors — `onerror` widening from `(() => void)` to `((event: SpeechRecognitionErrorEventLike) => void)` is compatible with every existing `recognition.onerror = () => { ... }` assignment (a callback with fewer parameters than the declared type is always assignable).

Run: `npx vitest run components/ui/ChampAvecDictee.test.tsx components/layout/OngletEly.test.tsx`
Expected: `Tests` all passing, no regressions — these are the two existing consumers of `creerReconnaissanceVocale`/`SpeechRecognitionInstance`.

- [ ] **Step 6: Lint**

Run: `npx eslint lib/reconnaissance-vocale.ts lib/reconnaissance-vocale.test.ts`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/reconnaissance-vocale.ts lib/reconnaissance-vocale.test.ts
git commit -m "feat: ajoute l'écoute continue et précise le typage onerror"
```

---

### Task 3: Rétrofit du verrou micro dans `OngletEly`

**Files:**
- Modify: `components/layout/OngletEly.tsx`
- Modify: `components/layout/OngletEly.test.tsx`

**Interfaces:**
- Consumes: `acquerirMicrophone`, `acquerirMicrophoneForce`, `relacherMicrophone`, `_reinitialiserVerrouPourTests` de `@/lib/verrou-microphone` (Task 1).

- [ ] **Step 1: Write the failing tests**

In `components/layout/OngletEly.test.tsx`, add this import alongside the existing ones at the top of the file:

```tsx
import { acquerirMicrophone, _reinitialiserVerrouPourTests } from "@/lib/verrou-microphone";
```

Add `_reinitialiserVerrouPourTests();` as the first line inside the existing `beforeEach(() => { ... })` block (before `vi.useFakeTimers();` or after — order doesn't matter, just add the call).

Add these 3 tests inside the existing `describe("OngletEly", () => { ... })` block, after the existing tests:

```tsx
it("acquiert le verrou micro pendant l'écoute de la question", () => {
  render(<OngletEly actif={false} />);
  const lien = screen.getByRole("link", { name: /Ely/ });

  fireEvent.pointerDown(lien);
  act(() => {
    vi.advanceTimersByTime(500);
  });
  act(() => {
    currentUtterance?.onend?.();
  });

  expect(acquerirMicrophone("dictee", vi.fn())).toBe(false);
});

it("libère le verrou micro une fois l'écoute terminée", () => {
  render(<OngletEly actif={false} />);
  const lien = screen.getByRole("link", { name: /Ely/ });

  fireEvent.pointerDown(lien);
  act(() => {
    vi.advanceTimersByTime(500);
  });
  act(() => {
    currentUtterance?.onend?.();
  });
  act(() => {
    derniereInstance().onresult?.(evenementTranscript("test"));
    derniereInstance().onend?.();
  });

  expect(acquerirMicrophone("dictee", vi.fn())).toBe(true);
});

it("vole le verrou micro à l'écoute de fond si elle le détient déjà", () => {
  const libererEcouteDeFond = vi.fn();
  acquerirMicrophone("ecoute-fond", libererEcouteDeFond);

  render(<OngletEly actif={false} />);
  const lien = screen.getByRole("link", { name: /Ely/ });

  fireEvent.pointerDown(lien);
  act(() => {
    vi.advanceTimersByTime(500);
  });
  act(() => {
    currentUtterance?.onend?.();
  });

  expect(libererEcouteDeFond).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/layout/OngletEly.test.tsx`
Expected: FAIL — `Failed to resolve import "@/lib/verrou-microphone"` does NOT happen (Task 1 already created it), but the 3 new tests fail: `acquerirMicrophone("dictee", vi.fn())` returns `true` in both the first two tests (nothing in `OngletEly` acquires the lock yet), and `libererEcouteDeFond` is never called in the third.

- [ ] **Step 3: Write minimal implementation**

Replace the whole file `components/layout/OngletEly.tsx` with:

```tsx
"use client";

import { useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { couperLecture, lireTexteAVoixHaute } from "@/lib/synthese-vocale";
import {
  creerReconnaissanceVocale,
  lireSupportVocalClient,
  type SpeechRecognitionInstance,
} from "@/lib/reconnaissance-vocale";
import { acquerirMicrophoneForce, relacherMicrophone } from "@/lib/verrou-microphone";

const SEUIL_APPUI_LONG_MS = 500;

function IconeEly() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[22px] w-[22px]"
    >
      <path d="M5 5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H10l-4.5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

interface OngletElyProps {
  actif: boolean;
}

export function OngletEly({ actif }: OngletElyProps) {
  const router = useRouter();
  const minuteurRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const declencheRef = useRef(false);
  const annuleRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [enSequence, setEnSequence] = useState(false);

  function demarrerMinuteur() {
    annulerMinuteur();
    declencheRef.current = false;
    minuteurRef.current = setTimeout(() => {
      declencheRef.current = true;
      demarrerSequence();
    }, SEUIL_APPUI_LONG_MS);
  }

  function annulerMinuteur() {
    if (minuteurRef.current) {
      clearTimeout(minuteurRef.current);
      minuteurRef.current = null;
    }
  }

  function demarrerSequence() {
    if (enSequence) return;
    if (!lireSupportVocalClient()) {
      declencheRef.current = false;
      return;
    }
    annuleRef.current = false;
    navigator.vibrate?.(50);
    setEnSequence(true);
    lireTexteAVoixHaute("Je t'écoute", () => {}, demarrerEcouteQuestion);
  }

  function demarrerEcouteQuestion() {
    if (annuleRef.current) return;

    const recognition = creerReconnaissanceVocale();
    if (!recognition) {
      setEnSequence(false);
      return;
    }
    acquerirMicrophoneForce("declenchement-manuel", () => recognition.stop());
    recognitionRef.current = recognition;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        router.push(`/ely?q=${encodeURIComponent(transcript)}`);
      }
    };
    recognition.onerror = () => {
      if (!annuleRef.current) {
        lireTexteAVoixHaute("Je n'ai pas compris, réessaie.", () => {}, () => {});
      }
    };
    recognition.onend = () => {
      relacherMicrophone("declenchement-manuel");
      setEnSequence(false);
      recognitionRef.current = null;
    };
    recognition.start();
  }

  function annulerSequence() {
    annuleRef.current = true;
    couperLecture();
    recognitionRef.current?.stop();
    relacherMicrophone("declenchement-manuel");
    setEnSequence(false);
  }

  function handleClick(e: MouseEvent) {
    if (declencheRef.current) {
      e.preventDefault();
      declencheRef.current = false;
      return;
    }
    if (enSequence) {
      e.preventDefault();
      annulerSequence();
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
      className={`flex w-14 flex-col items-center gap-1 py-1 text-[11px] font-medium transition-colors select-none [-webkit-touch-callout:none] [touch-action:manipulation] ${
        actif ? "text-brand-violet" : "text-navy/40"
      }`}
    >
      <IconeEly />
      Ely
    </Link>
  );
}
```

The only changes from the current file: the new `acquerirMicrophoneForce`/`relacherMicrophone` import, one `acquerirMicrophoneForce(...)` call at the top of `demarrerEcouteQuestion`, and one `relacherMicrophone("declenchement-manuel")` call each in `recognition.onend` and `annulerSequence`. Everything else (long-press timing, cancellation, visual output) is byte-identical to the current file.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/layout/OngletEly.test.tsx`
Expected: `Test Files  1 passed (1)` / `Tests  14 passed (14)`

- [ ] **Step 5: Type check, lint, and full regression**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx eslint components/layout/OngletEly.tsx components/layout/OngletEly.test.tsx`
Expected: no errors.

Run: `npx vitest run`
Expected: all tests pass, no regressions elsewhere (in particular `components/layout/BarreNavigationBasse.test.tsx`, which renders `OngletEly` indirectly and is unaffected by this change).

- [ ] **Step 6: Commit**

```bash
git add components/layout/OngletEly.tsx components/layout/OngletEly.test.tsx
git commit -m "feat: OngletEly vole le verrou micro au déclenchement"
```

---

### Task 4: Écoute de fond du mot d'activation

**Files:**
- Create: `components/layout/EcouteDeFondEly.tsx`
- Test: `components/layout/EcouteDeFondEly.test.tsx`

**Interfaces:**
- Consumes: `creerReconnaissanceVocale`, `lireSupportVocalClient`, `type SpeechRecognitionInstance` de `@/lib/reconnaissance-vocale` (Task 2) ; `lireTexteAVoixHaute` de `@/lib/synthese-vocale` (inchangé) ; `acquerirMicrophone`, `relacherMicrophone` de `@/lib/verrou-microphone` (Task 1) ; `useRouter` de `next/navigation`.
- Produces: `export function EcouteDeFondEly({ ecoutePermanenteActivee }: { ecoutePermanenteActivee: boolean }): null` — consommé par la Task 7 (montage dans le layout).

- [ ] **Step 1: Write the failing test**

Create `components/layout/EcouteDeFondEly.test.tsx`:

```tsx
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EcouteDeFondEly } from "./EcouteDeFondEly";
import { acquerirMicrophone, _reinitialiserVerrouPourTests } from "@/lib/verrou-microphone";
import type { SpeechRecognitionEvent } from "@/lib/reconnaissance-vocale";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

let instances: FakeSpeechRecognition[] = [];

class FakeSpeechRecognition {
  lang = "";
  interimResults = false;
  maxAlternatives = 1;
  continuous = false;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
  start = vi.fn();
  stop = vi.fn();

  constructor() {
    instances.push(this);
  }
}

function derniereInstance(): FakeSpeechRecognition {
  return instances[instances.length - 1];
}

function evenementTranscript(transcript: string): SpeechRecognitionEvent {
  return { results: { 0: { 0: { transcript } } } } as unknown as SpeechRecognitionEvent;
}

class FakeSpeechSynthesisUtterance {
  text: string;
  lang = "";
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

let currentUtterance: FakeSpeechSynthesisUtterance | null = null;
const speakMock = vi.fn((utterance: FakeSpeechSynthesisUtterance) => {
  currentUtterance = utterance;
});
const cancelMock = vi.fn();
const vibrateMock = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  instances = [];
  currentUtterance = null;
  pushMock.mockClear();
  speakMock.mockClear();
  cancelMock.mockClear();
  vibrateMock.mockClear();
  _reinitialiserVerrouPourTests();
  window.SpeechRecognition = FakeSpeechRecognition as never;
  window.SpeechSynthesisUtterance = FakeSpeechSynthesisUtterance as never;
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { speak: speakMock, cancel: cancelMock },
  });
  Object.defineProperty(window.navigator, "vibrate", {
    configurable: true,
    value: vibrateMock,
  });
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(window, "SpeechRecognition");
  Reflect.deleteProperty(window, "SpeechSynthesisUtterance");
  Reflect.deleteProperty(window, "speechSynthesis");
  Reflect.deleteProperty(window.navigator, "vibrate");
});

describe("EcouteDeFondEly", () => {
  it("ne démarre pas l'écoute si le réglage est désactivé", () => {
    render(<EcouteDeFondEly ecoutePermanenteActivee={false} />);
    expect(instances).toHaveLength(0);
  });

  it("ne démarre pas l'écoute si le navigateur ne supporte pas la reconnaissance vocale", () => {
    Reflect.deleteProperty(window, "SpeechRecognition");
    render(<EcouteDeFondEly ecoutePermanenteActivee={true} />);
    expect(instances).toHaveLength(0);
  });

  it("démarre une écoute continue quand le réglage est activé et le support présent", () => {
    render(<EcouteDeFondEly ecoutePermanenteActivee={true} />);

    expect(instances).toHaveLength(1);
    expect(derniereInstance().continuous).toBe(true);
    expect(derniereInstance().start).toHaveBeenCalled();
  });

  it("détecte la phrase d'activation et déclenche vibration puis « Je t'écoute »", () => {
    render(<EcouteDeFondEly ecoutePermanenteActivee={true} />);

    act(() => {
      derniereInstance().onresult?.(evenementTranscript("Dis-moi Ely"));
    });

    expect(vibrateMock).toHaveBeenCalledWith(50);
    expect(speakMock).toHaveBeenCalledTimes(1);
    expect(currentUtterance?.text).toBe("Je t'écoute");
  });

  it("ignore une transcription qui ne contient pas la phrase d'activation", () => {
    render(<EcouteDeFondEly ecoutePermanenteActivee={true} />);

    act(() => {
      derniereInstance().onresult?.(evenementTranscript("le patient va bien"));
    });

    expect(vibrateMock).not.toHaveBeenCalled();
    expect(speakMock).not.toHaveBeenCalled();
  });

  it("démarre l'écoute de la question une fois la salutation terminée", () => {
    render(<EcouteDeFondEly ecoutePermanenteActivee={true} />);
    act(() => {
      derniereInstance().onresult?.(evenementTranscript("dis moi ely"));
    });
    act(() => {
      currentUtterance?.onend?.();
    });

    expect(instances).toHaveLength(2);
    expect(derniereInstance().continuous).toBe(false);
    expect(derniereInstance().start).toHaveBeenCalled();
  });

  it("navigue vers /ely avec la question captée", () => {
    render(<EcouteDeFondEly ecoutePermanenteActivee={true} />);
    act(() => {
      derniereInstance().onresult?.(evenementTranscript("dis moi ely"));
    });
    act(() => {
      currentUtterance?.onend?.();
    });
    act(() => {
      derniereInstance().onresult?.(evenementTranscript("le patient a une plaie"));
    });

    expect(pushMock).toHaveBeenCalledWith("/ely?q=le%20patient%20a%20une%20plaie");
  });

  it("dit un message de repli si la question n'est pas comprise", () => {
    render(<EcouteDeFondEly ecoutePermanenteActivee={true} />);
    act(() => {
      derniereInstance().onresult?.(evenementTranscript("dis moi ely"));
    });
    act(() => {
      currentUtterance?.onend?.();
    });
    act(() => {
      derniereInstance().onerror?.({ error: "no-speech" });
    });

    expect(speakMock).toHaveBeenCalledTimes(2);
    expect(currentUtterance?.text).toBe("Je n'ai pas compris, réessaie.");
  });

  it("relance l'écoute du mot d'activation après une fin naturelle", () => {
    render(<EcouteDeFondEly ecoutePermanenteActivee={true} />);
    act(() => {
      derniereInstance().onend?.();
    });

    expect(instances).toHaveLength(2);
    expect(derniereInstance().continuous).toBe(true);
  });

  it("arrête définitivement sans boucle si la permission est refusée", () => {
    render(<EcouteDeFondEly ecoutePermanenteActivee={true} />);
    act(() => {
      derniereInstance().onerror?.({ error: "not-allowed" });
    });
    act(() => {
      derniereInstance().onend?.();
    });

    expect(instances).toHaveLength(1);
  });

  it("retente après un délai si le verrou micro est déjà pris", () => {
    acquerirMicrophone("dictee", vi.fn());

    render(<EcouteDeFondEly ecoutePermanenteActivee={true} />);
    expect(instances).toHaveLength(0);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(instances).toHaveLength(0);
  });

  it("démarre dès que le verrou micro se libère, à la prochaine tentative", () => {
    acquerirMicrophone("dictee", vi.fn());

    render(<EcouteDeFondEly ecoutePermanenteActivee={true} />);
    expect(instances).toHaveLength(0);

    act(() => {
      _reinitialiserVerrouPourTests();
      vi.advanceTimersByTime(2000);
    });

    expect(instances).toHaveLength(1);
  });

  it("arrête et libère le verrou micro au démontage", () => {
    const { unmount } = render(<EcouteDeFondEly ecoutePermanenteActivee={true} />);
    const instance = derniereInstance();

    unmount();

    expect(instance.stop).toHaveBeenCalled();
    expect(acquerirMicrophone("dictee", vi.fn())).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/layout/EcouteDeFondEly.test.tsx`
Expected: FAIL — `Failed to resolve import "./EcouteDeFondEly"` (le module n'existe pas encore).

- [ ] **Step 3: Write minimal implementation**

Create `components/layout/EcouteDeFondEly.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  creerReconnaissanceVocale,
  lireSupportVocalClient,
  type SpeechRecognitionInstance,
} from "@/lib/reconnaissance-vocale";
import { lireTexteAVoixHaute } from "@/lib/synthese-vocale";
import { acquerirMicrophone, relacherMicrophone } from "@/lib/verrou-microphone";

const PHRASE_ACTIVATION = "dis moi ely";
const NOUVELLE_TENTATIVE_MS = 2000;

function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .trim();
}

interface EcouteDeFondElyProps {
  ecoutePermanenteActivee: boolean;
}

export function EcouteDeFondEly({ ecoutePermanenteActivee }: EcouteDeFondElyProps) {
  const router = useRouter();
  const abandonneRef = useRef(false);

  useEffect(() => {
    if (!ecoutePermanenteActivee || !lireSupportVocalClient()) return;

    let arrete = false;
    let recognitionActif: SpeechRecognitionInstance | null = null;
    abandonneRef.current = false;

    function ecouterMotActivation() {
      if (arrete || abandonneRef.current) return;

      if (!acquerirMicrophone("ecoute-fond", () => recognitionActif?.stop())) {
        setTimeout(ecouterMotActivation, NOUVELLE_TENTATIVE_MS);
        return;
      }

      const recognition = creerReconnaissanceVocale({ continuous: true });
      if (!recognition) {
        relacherMicrophone("ecoute-fond");
        return;
      }
      recognitionActif = recognition;

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
        recognitionActif = null;
        if (!arrete && !abandonneRef.current) {
          ecouterMotActivation();
        }
      };

      recognition.start();
    }

    function declencherSequence() {
      navigator.vibrate?.(50);
      lireTexteAVoixHaute("Je t'écoute", () => {}, demarrerEcouteQuestion);
    }

    function demarrerEcouteQuestion() {
      if (arrete) return;

      if (!acquerirMicrophone("ecoute-fond", () => recognitionActif?.stop())) {
        ecouterMotActivation();
        return;
      }

      const recognition = creerReconnaissanceVocale();
      if (!recognition) {
        relacherMicrophone("ecoute-fond");
        ecouterMotActivation();
        return;
      }
      recognitionActif = recognition;

      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          router.push(`/ely?q=${encodeURIComponent(transcript)}`);
        }
      };
      recognition.onerror = () => {
        lireTexteAVoixHaute("Je n'ai pas compris, réessaie.", () => {}, () => {});
      };
      recognition.onend = () => {
        relacherMicrophone("ecoute-fond");
        recognitionActif = null;
        if (!arrete && !abandonneRef.current) {
          ecouterMotActivation();
        }
      };

      recognition.start();
    }

    ecouterMotActivation();

    return () => {
      arrete = true;
      recognitionActif?.stop();
      relacherMicrophone("ecoute-fond");
    };
  }, [ecoutePermanenteActivee, router]);

  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/layout/EcouteDeFondEly.test.tsx`
Expected: `Test Files  1 passed (1)` / `Tests  13 passed (13)`

- [ ] **Step 5: Type check, lint, and full regression**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx eslint components/layout/EcouteDeFondEly.tsx components/layout/EcouteDeFondEly.test.tsx`
Expected: no errors.

Run: `npx vitest run`
Expected: all tests pass, no regressions.

- [ ] **Step 6: Commit**

```bash
git add components/layout/EcouteDeFondEly.tsx components/layout/EcouteDeFondEly.test.tsx
git commit -m "feat: ajoute l'écoute de fond du mot d'activation Dis-moi Ely"
```

---

### Task 5: Rétrofit du verrou micro dans les dictées manuelles

**Files:**
- Modify: `components/ui/ChampRechercheVocale.tsx`
- Create: `components/ui/ChampRechercheVocale.test.tsx` (ce composant n'a aujourd'hui aucun test direct)
- Modify: `components/ui/ChampAvecDictee.tsx`
- Modify: `components/ui/ChampAvecDictee.test.tsx`

**Interfaces:**
- Consumes: `acquerirMicrophoneForce`, `relacherMicrophone` de `@/lib/verrou-microphone` (Task 1).

- [ ] **Step 1: Write the failing tests**

Create `components/ui/ChampRechercheVocale.test.tsx`:

```tsx
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChampRechercheVocale } from "./ChampRechercheVocale";
import { acquerirMicrophone, _reinitialiserVerrouPourTests } from "@/lib/verrou-microphone";
import type { SpeechRecognitionEvent } from "@/lib/reconnaissance-vocale";

let instances: FakeSpeechRecognition[] = [];

class FakeSpeechRecognition {
  lang = "";
  interimResults = false;
  maxAlternatives = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
  start = vi.fn();
  stop = vi.fn();

  constructor() {
    instances.push(this);
  }
}

function derniereInstance(): FakeSpeechRecognition {
  return instances[instances.length - 1];
}

function evenementTranscript(transcript: string): SpeechRecognitionEvent {
  return { results: { 0: { 0: { transcript } } } } as unknown as SpeechRecognitionEvent;
}

beforeEach(() => {
  instances = [];
  _reinitialiserVerrouPourTests();
});

afterEach(() => {
  Reflect.deleteProperty(window, "SpeechRecognition");
});

describe("ChampRechercheVocale", () => {
  it("affiche un champ de recherche avec la valeur par défaut", () => {
    render(<ChampRechercheVocale defaultValue="plaie infectée" placeholder="Poser une question" ariaLabel="Question" />);
    expect(screen.getByLabelText("Question")).toHaveValue("plaie infectée");
  });

  it("ne montre pas le bouton micro si la reconnaissance vocale n'est pas supportée", () => {
    render(<ChampRechercheVocale defaultValue="" placeholder="Poser une question" ariaLabel="Question" />);
    expect(screen.queryByRole("button", { name: /Dicter/i })).not.toBeInTheDocument();
  });

  it("remplace la valeur du champ avec la dictée", () => {
    window.SpeechRecognition = FakeSpeechRecognition as never;

    render(<ChampRechercheVocale defaultValue="" placeholder="Poser une question" ariaLabel="Question" />);
    fireEvent.click(screen.getByRole("button", { name: "Dicter la question au micro" }));

    act(() => {
      derniereInstance().onresult?.(evenementTranscript("le patient a une plaie qui s'infecte"));
    });

    expect(screen.getByLabelText("Question")).toHaveValue("le patient a une plaie qui s'infecte");
  });

  it("vole le verrou micro à un autre détenteur au clic sur le micro", () => {
    window.SpeechRecognition = FakeSpeechRecognition as never;
    const libererAutre = vi.fn();
    acquerirMicrophone("ecoute-fond", libererAutre);

    render(<ChampRechercheVocale defaultValue="" placeholder="Poser une question" ariaLabel="Question" />);
    fireEvent.click(screen.getByRole("button", { name: "Dicter la question au micro" }));

    expect(libererAutre).toHaveBeenCalledTimes(1);
    expect(derniereInstance().start).toHaveBeenCalled();
  });

  it("libère le verrou micro une fois la dictée terminée", () => {
    window.SpeechRecognition = FakeSpeechRecognition as never;

    render(<ChampRechercheVocale defaultValue="" placeholder="Poser une question" ariaLabel="Question" />);
    fireEvent.click(screen.getByRole("button", { name: "Dicter la question au micro" }));
    act(() => {
      derniereInstance().onend?.();
    });

    expect(acquerirMicrophone("dictee", vi.fn())).toBe(true);
  });
});
```

In `components/ui/ChampAvecDictee.test.tsx`, add this import alongside the existing ones:

```tsx
import { acquerirMicrophone, _reinitialiserVerrouPourTests } from "@/lib/verrou-microphone";
```

Add `stop = vi.fn();` as a new field on the existing `FakeSpeechRecognition` class (alongside `start = vi.fn();`).

Add `_reinitialiserVerrouPourTests();` as the first line of the existing `beforeEach(() => { instances = []; })` block.

Add these 2 tests inside the existing `describe("ChampAvecDictee", () => { ... })` block:

```tsx
it("vole le verrou micro à un autre détenteur au clic sur Dicter", () => {
  window.SpeechRecognition = FakeSpeechRecognition as never;
  const libererAutre = vi.fn();
  acquerirMicrophone("ecoute-fond", libererAutre);

  render(<ChampAvecDictee name="adresse" label="Adresse" />);
  fireEvent.click(screen.getByRole("button", { name: "Dicter — Adresse" }));

  expect(libererAutre).toHaveBeenCalledTimes(1);
  expect(derniereInstance().start).toHaveBeenCalled();
});

it("libère le verrou micro une fois la dictée terminée", () => {
  window.SpeechRecognition = FakeSpeechRecognition as never;

  render(<ChampAvecDictee name="adresse" label="Adresse" />);
  fireEvent.click(screen.getByRole("button", { name: "Dicter — Adresse" }));
  act(() => {
    derniereInstance().onend?.();
  });

  expect(acquerirMicrophone("dictee", vi.fn())).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/ui/ChampRechercheVocale.test.tsx components/ui/ChampAvecDictee.test.tsx`
Expected: FAIL — `ChampRechercheVocale.test.tsx` fails to resolve `"./ChampRechercheVocale"`... no, wait: the component file exists already, so that import resolves fine, but the "vole le verrou micro" and "libère le verrou" tests fail because nothing in the component touches the lock yet (`libererAutre` never called; `acquerirMicrophone("dictee", ...)` returns `false` after `onend` because nothing released it). Same for the 2 new `ChampAvecDictee.test.tsx` tests.

- [ ] **Step 3: Write minimal implementation**

Replace the whole file `components/ui/ChampRechercheVocale.tsx` with:

```tsx
"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import {
  creerReconnaissanceVocale,
  lireSupportVocalClient,
  lireSupportVocalServeur,
  souscrireSupportVocal,
} from "@/lib/reconnaissance-vocale";
import { acquerirMicrophoneForce, relacherMicrophone } from "@/lib/verrou-microphone";

interface ChampRechercheVocaleProps {
  defaultValue: string;
  placeholder: string;
  ariaLabel: string;
}

export function ChampRechercheVocale({ defaultValue, placeholder, ariaLabel }: ChampRechercheVocaleProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [ecoute, setEcoute] = useState(false);
  const supporte = useSyncExternalStore(
    souscrireSupportVocal,
    lireSupportVocalClient,
    lireSupportVocalServeur
  );

  function demarrerEcoute() {
    const recognition = creerReconnaissanceVocale();
    if (!recognition) return;

    acquerirMicrophoneForce("dictee", () => recognition.stop());

    recognition.onstart = () => setEcoute(true);
    recognition.onend = () => {
      relacherMicrophone("dictee");
      setEcoute(false);
    };
    recognition.onerror = () => {
      relacherMicrophone("dictee");
      setEcoute(false);
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript && inputRef.current) {
        inputRef.current.value = transcript;
        inputRef.current.focus();
      }
    };

    recognition.start();
  }

  return (
    <div className="flex min-h-[44px] flex-1 items-center gap-1 rounded-card border border-navy/20 bg-white pr-1.5">
      <input
        ref={inputRef}
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="min-h-[44px] flex-1 border-0 bg-transparent px-4 py-2 text-navy outline-none"
      />
      {supporte && (
        <button
          type="button"
          onClick={demarrerEcoute}
          aria-label="Dicter la question au micro"
          aria-pressed={ecoute}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base transition-colors ${
            ecoute ? "bg-danger/15 text-danger" : "bg-navy/5 text-navy hover:bg-navy/10"
          }`}
        >
          <span aria-hidden="true">🎤</span>
        </button>
      )}
    </div>
  );
}
```

Replace the whole file `components/ui/ChampAvecDictee.tsx` with:

```tsx
"use client";

import { useState, useSyncExternalStore } from "react";
import {
  creerReconnaissanceVocale,
  lireSupportVocalClient,
  lireSupportVocalServeur,
  souscrireSupportVocal,
} from "@/lib/reconnaissance-vocale";
import { acquerirMicrophoneForce, relacherMicrophone } from "@/lib/verrou-microphone";

interface ChampAvecDicteeProps {
  name: string;
  label: string;
  defaultValue?: string | null;
  required?: boolean;
  multiligne?: boolean;
  rows?: number;
  placeholder?: string;
}

export function ChampAvecDictee({
  name,
  label,
  defaultValue,
  required,
  multiligne,
  rows = 2,
  placeholder,
}: ChampAvecDicteeProps) {
  const [valeur, setValeur] = useState(defaultValue ?? "");
  const [ecoute, setEcoute] = useState(false);
  const supporte = useSyncExternalStore(
    souscrireSupportVocal,
    lireSupportVocalClient,
    lireSupportVocalServeur
  );

  function demarrerEcoute() {
    const recognition = creerReconnaissanceVocale();
    if (!recognition) return;

    acquerirMicrophoneForce("dictee", () => recognition.stop());

    recognition.onstart = () => setEcoute(true);
    recognition.onend = () => {
      relacherMicrophone("dictee");
      setEcoute(false);
    };
    recognition.onerror = () => {
      relacherMicrophone("dictee");
      setEcoute(false);
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (!transcript) return;
      setValeur((precedente) => {
        if (!multiligne) return transcript;
        return precedente ? `${precedente} ${transcript}` : transcript;
      });
    };

    recognition.start();
  }

  const classeChamp = "min-w-0 flex-1 rounded-card border border-navy/20 p-2 text-navy";

  return (
    <label className="flex flex-col gap-1 text-sm text-navy">
      {label}
      <div className="flex gap-2">
        {multiligne ? (
          <textarea
            name={name}
            value={valeur}
            onChange={(event) => setValeur(event.target.value)}
            required={required}
            rows={rows}
            placeholder={placeholder}
            className={classeChamp}
          />
        ) : (
          <input
            name={name}
            value={valeur}
            onChange={(event) => setValeur(event.target.value)}
            required={required}
            placeholder={placeholder}
            className={classeChamp}
          />
        )}
        {supporte && (
          <button
            type="button"
            onClick={demarrerEcoute}
            aria-label={`Dicter — ${label}`}
            aria-pressed={ecoute}
            className={`flex h-[44px] w-[44px] shrink-0 items-center justify-center self-start rounded-card text-base transition-colors ${
              ecoute ? "bg-danger/15 text-danger" : "bg-navy/5 text-navy hover:bg-navy/10"
            }`}
          >
            <span aria-hidden="true">🎤</span>
          </button>
        )}
      </div>
    </label>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/ui/ChampRechercheVocale.test.tsx components/ui/ChampAvecDictee.test.tsx`
Expected: `Test Files  2 passed (2)` / `Tests  13 passed (13)` (5 in `ChampRechercheVocale.test.tsx` + 8 in `ChampAvecDictee.test.tsx`).

- [ ] **Step 5: Type check, lint, and full regression**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx eslint components/ui/ChampRechercheVocale.tsx components/ui/ChampRechercheVocale.test.tsx components/ui/ChampAvecDictee.tsx components/ui/ChampAvecDictee.test.tsx`
Expected: no errors.

Run: `npx vitest run`
Expected: all tests pass, no regressions (in particular the pages that render `ChampRechercheVocale` — `/ely` — and `ChampAvecDictee` — patient forms).

- [ ] **Step 6: Commit**

```bash
git add components/ui/ChampRechercheVocale.tsx components/ui/ChampRechercheVocale.test.tsx components/ui/ChampAvecDictee.tsx components/ui/ChampAvecDictee.test.tsx
git commit -m "feat: les dictées manuelles volent le verrou micro"
```

---

### Task 6: Réglage "Copilote vocal" dans Mon compte

**Files:**
- Create: `components/ui/BasculeEcoutePermanenteEly.tsx`
- Test: `components/ui/BasculeEcoutePermanenteEly.test.tsx`
- Create: `app/(app)/compte/actions.ts`
- Test: `app/(app)/compte/actions.test.ts`
- Modify: `app/(app)/compte/page.tsx`

**Interfaces:**
- Produces: `export async function mettreAJourEcoutePermanenteAction(formData: FormData): Promise<void>` — server action, appelée par `BasculeEcoutePermanenteEly`'s form. `export function BasculeEcoutePermanenteEly({ activeParDefaut }: { activeParDefaut: boolean }): JSX.Element`.
- Consumes (Task 7 will read the same field): `user_metadata.ecoute_permanente_ely` — le nom de champ est fixé ici et dans le Global Constraints, Task 7 doit lire exactement le même nom.

- [ ] **Step 1: Write the failing tests**

Create `app/(app)/compte/actions.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

const updateUserMock = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      updateUser: updateUserMock,
    },
  }),
}));

describe("mettreAJourEcoutePermanenteAction", () => {
  it("active le réglage quand la case est cochée", async () => {
    updateUserMock.mockClear();
    const { mettreAJourEcoutePermanenteAction } = await import("./actions");

    const formData = new FormData();
    formData.set("ecoute_permanente_ely", "on");

    await mettreAJourEcoutePermanenteAction(formData);

    expect(updateUserMock).toHaveBeenCalledWith({ data: { ecoute_permanente_ely: true } });
  });

  it("désactive le réglage quand la case est absente du formulaire", async () => {
    updateUserMock.mockClear();
    const { mettreAJourEcoutePermanenteAction } = await import("./actions");

    const formData = new FormData();

    await mettreAJourEcoutePermanenteAction(formData);

    expect(updateUserMock).toHaveBeenCalledWith({ data: { ecoute_permanente_ely: false } });
  });
});
```

Create `components/ui/BasculeEcoutePermanenteEly.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BasculeEcoutePermanenteEly } from "./BasculeEcoutePermanenteEly";

describe("BasculeEcoutePermanenteEly", () => {
  it("affiche la case décochée quand le réglage est désactivé", () => {
    render(<BasculeEcoutePermanenteEly activeParDefaut={false} />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("affiche la case cochée quand le réglage est activé", () => {
    render(<BasculeEcoutePermanenteEly activeParDefaut={true} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/\(app\)/compte/actions.test.ts components/ui/BasculeEcoutePermanenteEly.test.tsx`
Expected: FAIL — both modules being imported don't exist yet (`Failed to resolve import`).

- [ ] **Step 3: Write minimal implementation**

Create `app/(app)/compte/actions.ts`:

```ts
"use server";

import { createClient } from "@/lib/supabase/server";

export async function mettreAJourEcoutePermanenteAction(formData: FormData): Promise<void> {
  const activee = formData.get("ecoute_permanente_ely") === "on";
  const supabase = await createClient();
  await supabase.auth.updateUser({ data: { ecoute_permanente_ely: activee } });
}
```

Create `components/ui/BasculeEcoutePermanenteEly.tsx`:

```tsx
"use client";

import { mettreAJourEcoutePermanenteAction } from "@/app/(app)/compte/actions";

interface BasculeEcoutePermanenteElyProps {
  activeParDefaut: boolean;
}

export function BasculeEcoutePermanenteEly({ activeParDefaut }: BasculeEcoutePermanenteElyProps) {
  return (
    <form action={mettreAJourEcoutePermanenteAction}>
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm text-navy">Écoute permanente pour Ely (dire « Dis-moi Ely »)</span>
        <input
          type="checkbox"
          name="ecoute_permanente_ely"
          value="on"
          defaultChecked={activeParDefaut}
          onChange={(event) => event.currentTarget.form?.requestSubmit?.()}
          className="h-5 w-5 accent-brand-violet"
        />
      </label>
    </form>
  );
}
```

In `app/(app)/compte/page.tsx`, add this import alongside the existing ones:

```tsx
import { BasculeEcoutePermanenteEly } from "@/components/ui/BasculeEcoutePermanenteEly";
```

Right after the line `const joursRestantsEssai = abonnement ? 0 : getJoursRestantsEssaiGratuit(user.created_at);`, add:

```tsx
const ecoutePermanenteActivee = Boolean(user.user_metadata?.ecoute_permanente_ely);
```

Add a new `<section>` inside the `<div className="mt-8 flex flex-col gap-5">` block, right after the closing `</section>` of the "Patients" section and before the "Abonnement" section:

```tsx
          <section className="rounded-[20px] border border-navy/10 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,.04),0_18px_40px_rgba(15,23,42,.06)]">
            <p className="text-[12.5px] font-bold uppercase tracking-wider text-navy/45">Copilote vocal</p>
            <p className="mt-2 text-sm text-navy/60">
              Active l&apos;écoute permanente pour dire « Dis-moi Ely » sans les mains, où que tu sois dans
              l&apos;app. Fonctionne uniquement sur Android/Chrome. Le micro reste actif tant que l&apos;app
              est ouverte à l&apos;écran.
            </p>
            <div className="mt-4">
              <BasculeEcoutePermanenteEly activeParDefaut={ecoutePermanenteActivee} />
            </div>
          </section>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run "app/(app)/compte/actions.test.ts" components/ui/BasculeEcoutePermanenteEly.test.tsx`
Expected: `Test Files  2 passed (2)` / `Tests  4 passed (4)`

- [ ] **Step 5: Type check, lint, and full regression**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx eslint "app/(app)/compte/actions.ts" "app/(app)/compte/actions.test.ts" "app/(app)/compte/page.tsx" components/ui/BasculeEcoutePermanenteEly.tsx components/ui/BasculeEcoutePermanenteEly.test.tsx`
Expected: no errors.

Run: `npx vitest run`
Expected: all tests pass, no regressions.

- [ ] **Step 6: Commit**

```bash
git add components/ui/BasculeEcoutePermanenteEly.tsx components/ui/BasculeEcoutePermanenteEly.test.tsx "app/(app)/compte/actions.ts" "app/(app)/compte/actions.test.ts" "app/(app)/compte/page.tsx"
git commit -m "feat: ajoute le réglage Copilote vocal dans Mon compte"
```

---

### Task 7: Montage de l'écoute de fond dans le layout de l'app

**Files:**
- Modify: `app/(app)/layout.tsx`

**Interfaces:**
- Consumes: `EcouteDeFondEly` de `@/components/layout/EcouteDeFondEly` (Task 4) ; `createClient` de `@/lib/supabase/server` (déjà utilisé ailleurs, ex. `app/(app)/compte/page.tsx`) ; lit `user_metadata.ecoute_permanente_ely` (même nom de champ que Task 6).

Ce fichier n'a aucun test dédié aujourd'hui (comme les autres layouts/pages serveur de ce projet — la logique testable vit dans `lib/` et les composants clients, qui sont déjà couverts).

- [ ] **Step 1: Modify the layout**

Replace the whole file `app/(app)/layout.tsx` with:

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

- [ ] **Step 2: Type check, lint, and full regression**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx eslint "app/(app)/layout.tsx"`
Expected: no errors.

Run: `npx vitest run`
Expected: all tests pass — this file has no test of its own, but confirm nothing else broke (in particular any test that renders pages inside the `(app)` route group).

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/layout.tsx"
git commit -m "feat: monte l'écoute de fond Ely dans le layout de l'app"
```
