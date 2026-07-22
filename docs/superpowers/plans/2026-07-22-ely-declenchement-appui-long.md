# Ely — Déclenchement par appui long (chemin A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un appui long (~500 ms) sur l'onglet "Ely" de la barre de navigation basse déclenche une séquence mains libres — vibration, salutation "Je t'écoute", écoute de la question, navigation vers la réponse — sur tous les appareils, avec dégradation silencieuse là où `SpeechRecognition` n'est pas supporté (Safari/iOS).

**Architecture:** Nouveau composant `OngletEly` qui remplace l'entrée "Ely" dans `BarreNavigationBasse`, orchestrant les libs vocales déjà existantes (`lib/reconnaissance-vocale.ts`, `lib/synthese-vocale.ts`) sans les modifier. Un tap court garde le comportement de navigation actuel.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest + Testing Library, Web Speech API (`SpeechRecognition`, `speechSynthesis`).

## Global Constraints

- Ce plan couvre uniquement le chemin A (appui long). Le chemin B (mot d'activation "Dis-moi Ely", écoute de fond, verrou micro partagé `lib/verrou-microphone.ts`) est un second chantier séparé — voir `docs/superpowers/specs/2026-07-22-ely-mot-activation-design.md`.
- Aucune modification de `lib/reconnaissance-vocale.ts` ni `lib/synthese-vocale.ts` — réutilisation telle quelle de `creerReconnaissanceVocale`, `lireSupportVocalClient`, `lireTexteAVoixHaute`, `couperLecture`.
- Seuil d'appui long : `500` ms.
- Texte de salutation exact : `"Je t'écoute"`.
- Texte de repli en cas d'échec exact : `"Je n'ai pas compris, réessaie."`.
- Rendu visuel de l'onglet Ely inchangé : même icône SVG, mêmes classes Tailwind, même comportement `aria-current="page"`.
- Les 3 tests existants de `components/layout/BarreNavigationBasse.test.tsx` doivent continuer à passer.

---

### Task 1: Composant `OngletEly`

**Files:**
- Create: `components/layout/OngletEly.tsx`
- Test: `components/layout/OngletEly.test.tsx`

**Interfaces:**
- Consumes: `creerReconnaissanceVocale(): SpeechRecognitionInstance | null` et `lireSupportVocalClient(): boolean` de `@/lib/reconnaissance-vocale` ; `lireTexteAVoixHaute(texte: string, onDebut: () => void, onFin: () => void): void` et `couperLecture(): void` de `@/lib/synthese-vocale` ; `useRouter` de `next/navigation`.
- Produces: `export function OngletEly({ actif }: { actif: boolean }): JSX.Element` — un `<Link href="/ely">` avec la même icône/texte "Ely" que l'ancien `OngletNav`, consommé par `BarreNavigationBasse` (Task 2).

- [ ] **Step 1: Write the failing test**

Create `components/layout/OngletEly.test.tsx`:

```tsx
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OngletEly } from "./OngletEly";
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

describe("OngletEly", () => {
  it("un tap court ne déclenche pas la séquence vocale", () => {
    render(<OngletEly actif={false} />);
    const lien = screen.getByRole("link", { name: /Ely/ });

    fireEvent.pointerDown(lien);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.pointerUp(lien);
    fireEvent.click(lien);

    expect(vibrateMock).not.toHaveBeenCalled();
    expect(speakMock).not.toHaveBeenCalled();
  });

  it("relâcher avant le seuil annule le minuteur, même si on attend ensuite", () => {
    render(<OngletEly actif={false} />);
    const lien = screen.getByRole("link", { name: /Ely/ });

    fireEvent.pointerDown(lien);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.pointerUp(lien);
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(vibrateMock).not.toHaveBeenCalled();
    expect(speakMock).not.toHaveBeenCalled();
  });

  it("un appui long déclenche une vibration puis « Je t'écoute »", () => {
    render(<OngletEly actif={false} />);
    const lien = screen.getByRole("link", { name: /Ely/ });

    fireEvent.pointerDown(lien);
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(vibrateMock).toHaveBeenCalledWith(50);
    expect(speakMock).toHaveBeenCalledTimes(1);
    expect(currentUtterance?.text).toBe("Je t'écoute");
  });

  it("démarre l'écoute de la question une fois la salutation terminée", () => {
    render(<OngletEly actif={false} />);
    const lien = screen.getByRole("link", { name: /Ely/ });

    fireEvent.pointerDown(lien);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => {
      currentUtterance?.onend?.();
    });

    expect(instances).toHaveLength(1);
    expect(derniereInstance().start).toHaveBeenCalled();
  });

  it("navigue vers /ely avec la question captée en paramètre", () => {
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
      derniereInstance().onresult?.(evenementTranscript("le patient a une plaie qui s'infecte"));
    });

    expect(pushMock).toHaveBeenCalledWith("/ely?q=le%20patient%20a%20une%20plaie%20qui%20s'infecte");
  });

  it("dit un message de repli si rien n'est compris", () => {
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
      derniereInstance().onerror?.();
    });

    expect(speakMock).toHaveBeenCalledTimes(2);
    expect(currentUtterance?.text).toBe("Je n'ai pas compris, réessaie.");
  });

  it("un tap pendant la séquence arrête tout", () => {
    render(<OngletEly actif={false} />);
    const lien = screen.getByRole("link", { name: /Ely/ });

    fireEvent.pointerDown(lien);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.pointerUp(lien);
    fireEvent.click(lien);

    act(() => {
      currentUtterance?.onend?.();
    });

    fireEvent.pointerDown(lien);
    fireEvent.pointerUp(lien);
    fireEvent.click(lien);

    expect(cancelMock).toHaveBeenCalled();
    expect(derniereInstance().stop).toHaveBeenCalled();
  });

  it("sur un navigateur sans reconnaissance vocale, l'appui long ne fait rien", () => {
    Reflect.deleteProperty(window, "SpeechRecognition");
    render(<OngletEly actif={false} />);
    const lien = screen.getByRole("link", { name: /Ely/ });

    fireEvent.pointerDown(lien);
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(vibrateMock).not.toHaveBeenCalled();
    expect(speakMock).not.toHaveBeenCalled();
  });

  it("affiche aria-current=page quand actif est vrai", () => {
    render(<OngletEly actif={true} />);
    expect(screen.getByRole("link", { name: /Ely/ })).toHaveAttribute("aria-current", "page");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/layout/OngletEly.test.tsx`
Expected: FAIL — `Failed to resolve import "./OngletEly"` (le module n'existe pas encore).

- [ ] **Step 3: Write minimal implementation**

Create `components/layout/OngletEly.tsx`:

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
      setEnSequence(false);
      recognitionRef.current = null;
    };
    recognition.start();
  }

  function annulerSequence() {
    annuleRef.current = true;
    couperLecture();
    recognitionRef.current?.stop();
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
      className={`flex w-14 flex-col items-center gap-1 py-1 text-[11px] font-medium transition-colors ${
        actif ? "text-brand-violet" : "text-navy/40"
      }`}
    >
      <IconeEly />
      Ely
    </Link>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/layout/OngletEly.test.tsx`
Expected: `Test Files  1 passed (1)` / `Tests  9 passed (9)`

- [ ] **Step 5: Type check and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx eslint components/layout/OngletEly.tsx components/layout/OngletEly.test.tsx`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/layout/OngletEly.tsx components/layout/OngletEly.test.tsx
git commit -m "feat: ajoute OngletEly (déclenchement par appui long)"
```

---

### Task 2: Intégration dans `BarreNavigationBasse`

**Files:**
- Modify: `components/layout/BarreNavigationBasse.tsx`
- Modify: `components/layout/BarreNavigationBasse.test.tsx`

**Interfaces:**
- Consumes: `OngletEly` de `./OngletEly` (Task 1) — `<OngletEly actif={boolean} />`.

- [ ] **Step 1: Modifier `BarreNavigationBasse.test.tsx` pour mocker `useRouter`**

`OngletEly` appelle `useRouter()` de `next/navigation`. Le mock actuel du fichier ne fournit que `usePathname`, donc monter `BarreNavigationBasse` (qui va monter `OngletEly`) plantera avec `useRouter is not a function` sans cet ajout.

Dans `components/layout/BarreNavigationBasse.test.tsx`, remplacer :

```tsx
const usePathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));
```

par :

```tsx
const usePathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
  useRouter: () => ({ push: vi.fn() }),
}));
```

- [ ] **Step 2: Run the existing tests to confirm they still fail for the right reason (or pass) before touching the component**

Run: `npx vitest run components/layout/BarreNavigationBasse.test.tsx`
Expected: `Tests  3 passed (3)` — ce fichier ne dépend pas encore d'`OngletEly`, ce changement seul ne doit rien casser.

- [ ] **Step 3: Réécrire `BarreNavigationBasse.tsx`**

Remplacer l'intégralité du fichier `components/layout/BarreNavigationBasse.tsx` par :

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { OngletEly } from "./OngletEly";

function IconeAccueil() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]">
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.5V19a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

function IconePatients() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M15.8 14.2c2.3.3 4.2 2.1 4.2 4.8" />
    </svg>
  );
}

function IconeExplorer() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m14.5 9.5-1.8 4.2-4.2 1.8 1.8-4.2 4.2-1.8Z" />
    </svg>
  );
}

function IconePlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" className="h-6 w-6">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

interface Onglet {
  href: string;
  label: string;
  icone: ReactNode;
}

const ONGLETS_GAUCHE: Onglet[] = [
  { href: "/ma-journee", label: "Accueil", icone: <IconeAccueil /> },
  { href: "/patients", label: "Patients", icone: <IconePatients /> },
];

const ONGLETS_DROITE: Onglet[] = [{ href: "/situations", label: "Explorer", icone: <IconeExplorer /> }];

function estActif(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function OngletNav({ onglet, actif }: { onglet: Onglet; actif: boolean }) {
  return (
    <Link
      href={onglet.href}
      aria-current={actif ? "page" : undefined}
      className={`flex w-14 flex-col items-center gap-1 py-1 text-[11px] font-medium transition-colors ${
        actif ? "text-brand-violet" : "text-navy/40"
      }`}
    >
      {onglet.icone}
      {onglet.label}
    </Link>
  );
}

export function BarreNavigationBasse() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-navy/10 bg-white/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {ONGLETS_GAUCHE.map((onglet) => (
          <OngletNav key={onglet.href} onglet={onglet} actif={estActif(pathname, onglet.href)} />
        ))}

        <Link
          href="/patients/nouveau"
          aria-label="Ajouter un patient"
          className="-mt-6 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-brand-violet to-brand-rose text-white shadow-[0_4px_12px_rgba(124,58,237,.35)] transition-transform hover:scale-105"
        >
          <IconePlus />
        </Link>

        {ONGLETS_DROITE.map((onglet) => (
          <OngletNav key={onglet.href} onglet={onglet} actif={estActif(pathname, onglet.href)} />
        ))}

        <OngletEly actif={estActif(pathname, "/ely")} />
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Run all navigation tests to verify they pass**

Run: `npx vitest run components/layout/BarreNavigationBasse.test.tsx components/layout/OngletEly.test.tsx`
Expected: `Test Files  2 passed (2)` / `Tests  12 passed (12)`

- [ ] **Step 5: Full regression check**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx eslint components/layout/BarreNavigationBasse.tsx components/layout/BarreNavigationBasse.test.tsx`
Expected: no errors.

Run: `npx vitest run`
Expected: all tests pass (no regressions elsewhere).

- [ ] **Step 6: Commit**

```bash
git add components/layout/BarreNavigationBasse.tsx components/layout/BarreNavigationBasse.test.tsx
git commit -m "feat: branche OngletEly dans la barre de navigation"
```
