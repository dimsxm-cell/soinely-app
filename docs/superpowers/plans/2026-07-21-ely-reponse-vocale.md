# Ely — Réponse lue à voix haute — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a search on `/ely`, automatically read the matched answer aloud using the browser's built-in speech synthesis, with a "Couper" (stop) button visible while it's speaking.

**Architecture:** A new browser-only helper module (`lib/synthese-vocale.ts`) wraps `window.speechSynthesis`, mirroring the existing `lib/reconnaissance-vocale.ts` (used for voice *input*) but for voice *output*. A new client component (`LectureVocaleReponse`) consumes it and is rendered alongside the existing `CarteReponse` on the `/ely` page.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Vitest + Testing Library. No new npm dependencies — uses the browser's native `SpeechSynthesis`/`SpeechSynthesisUtterance` APIs.

## Global Constraints

- Design doc: `docs/superpowers/specs/2026-07-21-ely-reponse-vocale-design.md` — every task below implements a decision from that doc; do not deviate without updating it first.
- Playback is automatic (no "Écouter" button to trigger it) — only a "🔇 Couper" button to stop it.
- The spoken text must be built from exactly the same data `CarteReponse` already displays: `situation.titre`, `situation.observation`, and `situation.conduiteATenir.slice(0, 3)` — no separate summary text to maintain.
- Silent degradation when `window.speechSynthesis` is unavailable: no button, no error, the existing text card still works.
- French voice: `utterance.lang = "fr-FR"`.
- Match existing code style: French function/variable names, Server Components by default, `"use client"` only where a component genuinely needs browser APIs — mirror `lib/reconnaissance-vocale.ts` and `components/ui/ChampAvecDictee.tsx`/`ChampRechercheVocale.tsx`'s conventions exactly (they are the direct precedent for this task).

---

### Task 1: `lib/synthese-vocale.ts` — speech synthesis helper module

**Files:**
- Create: `lib/synthese-vocale.ts`
- Create: `lib/synthese-vocale.test.ts`

**Interfaces:**
- Produces: `lireSupportSyntheseClient(): boolean`, `lireSupportSyntheseServeur(): boolean`, `souscrireSupportSynthese(): () => void`, `lireTexteAVoixHaute(texte: string, onFin: () => void): void`, `couperLecture(): void` — all consumed by Task 2.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/synthese-vocale.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  couperLecture,
  lireSupportSyntheseClient,
  lireSupportSyntheseServeur,
  lireTexteAVoixHaute,
} from "./synthese-vocale";

class FakeSpeechSynthesisUtterance {
  text: string;
  lang = "";
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

const speakMock = vi.fn();
const cancelMock = vi.fn();

beforeEach(() => {
  speakMock.mockReset();
  cancelMock.mockReset();
  window.SpeechSynthesisUtterance = FakeSpeechSynthesisUtterance as never;
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { speak: speakMock, cancel: cancelMock },
  });
});

afterEach(() => {
  Reflect.deleteProperty(window, "SpeechSynthesisUtterance");
  Reflect.deleteProperty(window, "speechSynthesis");
});

describe("lireSupportSyntheseClient", () => {
  it("retourne true quand window.speechSynthesis existe", () => {
    expect(lireSupportSyntheseClient()).toBe(true);
  });

  it("retourne false quand window.speechSynthesis est absent", () => {
    Reflect.deleteProperty(window, "speechSynthesis");
    expect(lireSupportSyntheseClient()).toBe(false);
  });
});

describe("lireSupportSyntheseServeur", () => {
  it("retourne toujours false (rendu serveur)", () => {
    expect(lireSupportSyntheseServeur()).toBe(false);
  });
});

describe("lireTexteAVoixHaute", () => {
  it("crée un utterance en français et le passe à speechSynthesis.speak", () => {
    const onFin = vi.fn();
    lireTexteAVoixHaute("Bonjour", onFin);

    expect(speakMock).toHaveBeenCalledTimes(1);
    const utterance = speakMock.mock.calls[0][0] as FakeSpeechSynthesisUtterance;
    expect(utterance.text).toBe("Bonjour");
    expect(utterance.lang).toBe("fr-FR");
  });

  it("appelle onFin quand la lecture se termine normalement (onend)", () => {
    const onFin = vi.fn();
    lireTexteAVoixHaute("Bonjour", onFin);

    const utterance = speakMock.mock.calls[0][0] as FakeSpeechSynthesisUtterance;
    utterance.onend?.();

    expect(onFin).toHaveBeenCalledTimes(1);
  });

  it("appelle onFin aussi en cas d'erreur (onerror, ex. coupure manuelle)", () => {
    const onFin = vi.fn();
    lireTexteAVoixHaute("Bonjour", onFin);

    const utterance = speakMock.mock.calls[0][0] as FakeSpeechSynthesisUtterance;
    utterance.onerror?.();

    expect(onFin).toHaveBeenCalledTimes(1);
  });
});

describe("couperLecture", () => {
  it("appelle speechSynthesis.cancel", () => {
    couperLecture();
    expect(cancelMock).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/synthese-vocale.test.ts`
Expected: FAIL — `Cannot find module './synthese-vocale'` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

```ts
// lib/synthese-vocale.ts
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/synthese-vocale.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/synthese-vocale.ts lib/synthese-vocale.test.ts
git commit -m "feat: add synthese-vocale helper module"
```

---

### Task 2: `components/ui/LectureVocaleReponse.tsx` — playback component

**Files:**
- Create: `components/ui/LectureVocaleReponse.tsx`
- Create: `components/ui/LectureVocaleReponse.test.tsx`

**Interfaces:**
- Consumes: `lireSupportSyntheseClient`, `lireSupportSyntheseServeur`, `souscrireSupportSynthese`, `lireTexteAVoixHaute`, `couperLecture` from `@/lib/synthese-vocale` (Task 1).
- Produces: `LectureVocaleReponse({ texte: string })` — a client component consumed by Task 3.

- [ ] **Step 1: Write the failing tests**

```tsx
// components/ui/LectureVocaleReponse.test.tsx
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LectureVocaleReponse } from "./LectureVocaleReponse";

class FakeSpeechSynthesisUtterance {
  text: string;
  lang = "";
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

beforeEach(() => {
  currentUtterance = null;
  speakMock.mockClear();
  cancelMock.mockClear();
  window.SpeechSynthesisUtterance = FakeSpeechSynthesisUtterance as never;
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { speak: speakMock, cancel: cancelMock },
  });
});

afterEach(() => {
  Reflect.deleteProperty(window, "SpeechSynthesisUtterance");
  Reflect.deleteProperty(window, "speechSynthesis");
});

describe("LectureVocaleReponse", () => {
  it("lance la lecture au montage et affiche le bouton Couper", async () => {
    render(<LectureVocaleReponse texte="Bonjour, ceci est un test." />);

    expect(speakMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("button", { name: /Couper/i })).toBeInTheDocument();
  });

  it("cache le bouton une fois la lecture terminée (onend)", async () => {
    render(<LectureVocaleReponse texte="Bonjour" />);
    await screen.findByRole("button", { name: /Couper/i });

    act(() => {
      currentUtterance?.onend?.();
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Couper/i })).not.toBeInTheDocument();
    });
  });

  it("coupe la lecture au clic sur le bouton", async () => {
    render(<LectureVocaleReponse texte="Bonjour" />);
    const bouton = await screen.findByRole("button", { name: /Couper/i });

    fireEvent.click(bouton);

    expect(cancelMock).toHaveBeenCalled();
  });

  it("ne rend rien si la synthèse vocale n'est pas supportée", () => {
    Reflect.deleteProperty(window, "speechSynthesis");

    const { container } = render(<LectureVocaleReponse texte="Bonjour" />);

    expect(speakMock).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it("ne rend rien et ne lit rien si le texte est vide", () => {
    const { container } = render(<LectureVocaleReponse texte="   " />);

    expect(speakMock).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/ui/LectureVocaleReponse.test.tsx`
Expected: FAIL — `Cannot find module './LectureVocaleReponse'`.

- [ ] **Step 3: Write the implementation**

```tsx
// components/ui/LectureVocaleReponse.tsx
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/ui/LectureVocaleReponse.test.tsx`
Expected: PASS, 5 tests.

Note: the "ne rend rien si non supportée" test deletes `window.speechSynthesis`
in the test body (after the `beforeEach` already set it), matching how
`lireSupportSyntheseClient` is expected to react to its absence — if this
doesn't trigger a re-render in your React version, verify `useSyncExternalStore`
is genuinely being re-evaluated per render (it is, by design) rather than
adding a workaround.

- [ ] **Step 5: Commit**

```bash
git add components/ui/LectureVocaleReponse.tsx components/ui/LectureVocaleReponse.test.tsx
git commit -m "feat: add LectureVocaleReponse component"
```

---

### Task 3: Wire `LectureVocaleReponse` into `/ely`

**Files:**
- Modify: `app/(app)/ely/page.tsx`

**Interfaces:**
- Consumes: `LectureVocaleReponse` (Task 2).

- [ ] **Step 1: Add the import and render the component after `CarteReponse`**

Change:

```tsx
import { CarteReponse } from "@/components/ui/CarteReponse";
```

to:

```tsx
import { CarteReponse } from "@/components/ui/CarteReponse";
import { LectureVocaleReponse } from "@/components/ui/LectureVocaleReponse";
```

Change:

```tsx
        {reponse && <CarteReponse situation={reponse} />}
```

to:

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

Full resulting file:

```tsx
import { createClient } from "@/lib/supabase/server";
import { searchSituationsTerrain } from "@/lib/data/recherche";
import { CarteReponse } from "@/components/ui/CarteReponse";
import { LectureVocaleReponse } from "@/components/ui/LectureVocaleReponse";
import { CarteSituationTerrain } from "@/components/ui/CarteSituationTerrain";
import { Button } from "@/components/ui/Button";
import { ChampRechercheVocale } from "@/components/ui/ChampRechercheVocale";
import { PersistanceRecherche } from "@/components/ui/PersistanceRecherche";

export default async function ElyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q ?? "";

  const supabase = await createClient();
  const results = query.trim() ? await searchSituationsTerrain(supabase, query) : [];
  const [reponse, ...autres] = results;

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10 sm:py-14">
        <PersistanceRecherche cle="ely_derniere_requete" requeteActuelle={query} />

        <h1 className="font-display text-[28px] font-medium leading-tight sm:text-[32px]">Ely</h1>

        <form method="GET" className="flex gap-3">
          <ChampRechercheVocale
            defaultValue={query}
            placeholder="Ex. : le patient a une plaie qui s'infecte, que faire ?"
            ariaLabel="Poser une question clinique"
          />
          <Button type="submit">Demander</Button>
        </form>

        {query.trim() && results.length === 0 && (
          <p className="text-navy/70">
            Je n&apos;ai pas trouvé de réponse à cette question. Essayez de la reformuler.
          </p>
        )}

        {reponse && (
          <>
            <CarteReponse situation={reponse} />
            <LectureVocaleReponse
              texte={[reponse.titre, reponse.observation, ...reponse.conduiteATenir.slice(0, 3)].join(". ")}
            />
          </>
        )}

        {autres.length > 0 && (
          <div className="flex flex-col gap-4">
            {autres.map((situation) => (
              <CarteSituationTerrain key={situation.id} situation={situation} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
```

Only the two diffs above are intentional — do not reformat or otherwise
touch the rest of this file.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/ely/page.tsx"
git commit -m "feat: read Ely's answer aloud automatically"
```

---

### Task 4: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass, including the 11 new ones from Tasks 1 and 2.

- [ ] **Step 2: Run the type checker, linter, and build**

Run: `npx tsc --noEmit && npx eslint . && npm run build`
Expected: no errors; the build output still lists `/ely` among the routes, unchanged.

- [ ] **Step 3: Manual verification in the browser (with the founder's authorization before touching the running app)**

Run: `npm run dev`, open `/ely` in Chrome or Edge (desktop — both have solid
`speechSynthesis` support).

Expected:
- Typing or dictating a question that matches a seeded situation and submitting shows the existing "Réponse la plus proche" card, and the answer starts speaking automatically in French within about a second.
- A "🔇 Couper" pill button appears next to/below the card while it's speaking.
- Clicking "Couper" stops the audio immediately and the button disappears.
- Letting the answer finish naturally also makes the button disappear on its own.
- Submitting a new question while the previous answer is still speaking (full page reload) does not produce overlapping audio.
- A query with no match still shows the existing "Je n'ai pas trouvé de réponse..." message, with nothing spoken (no `CarteReponse`, so no `LectureVocaleReponse` either).

- [ ] **Step 4: Report status**

No commit for this task — if Steps 1-3 all pass, the plan is complete. If anything fails, fix it as part of the relevant earlier task (re-open that task, don't patch ad hoc here) and re-run this verification task.

---

## Hors scope (rappel, voir le design doc)

- Mot d'activation "Dis-moi Ely" et salutation "Je t'écoute" — chantier séparé, à spécifier après celui-ci.
- Écoute permanente / toujours active.
- Préférence utilisateur persistante pour activer/désactiver la lecture automatique.
- Choix de la voix ou réglage du débit de lecture.
