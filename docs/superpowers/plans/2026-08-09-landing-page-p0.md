# Landing page P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Soinely marketing landing page (`app/page.tsx` and `components/marketing/`) into compliance with the 8 remaining P0 items of the approved "Landing Page 10/10" spec, without touching anything already conformant.

**Architecture:** Additive where possible (new sections as new components inserted into `app/page.tsx`), targeted edits where the spec requires removing or correcting existing content (nav, footer, CTA copy). No new routes, no new backend, no new dependencies — everything is React/Tailwind CSS v4 inside the existing marketing component set.

**Tech Stack:** Next.js App Router (Server Components by default, `"use client"` only where interaction requires it), Tailwind CSS v4 (`@theme` tokens + inline `style={}` matching existing marketing component conventions), Vitest + Testing Library.

## Global Constraints

- Design tokens are added under **`--color-soinely-*`** names in `app/globals.css`'s existing `@theme` block — never touch or rename `--color-brand-violet`/`--color-brand-rose` (used outside the landing page).
- Every new/changed CTA button that says "Rejoindre la bêta privée" links to `/login`.
- No fabricated data: the video player ships with no real video file (source `/marketing/demo-produit.mp4` will 404 until a real file is dropped in — this is correct, expected behavior for this plan, not a bug to fix).
- The "Conforme RGPD" claim must not appear anywhere after this plan — not in the footer, not in the new Sécurité section.
- FAQ, Contact, and Mentions légales pages/links are explicitly out of scope — do not create them or link to them.
- SEO metadata (sitemap, robots.txt, Open Graph, JSON-LD, canonical) is explicitly out of scope (spec P1 item, not P0).
- `prefers-reduced-motion` must be respected by any new transition (the mobile menu's open/close animation is the only new transition this plan introduces).

---

### Task 1: Design tokens

**Files:**
- Modify: `app/globals.css:1-13`

**Interfaces:**
- Produces: 9 new Tailwind v4 theme colors, usable in later tasks as `text-soinely-purple-800`, `bg-soinely-ink`, etc., or as `var(--color-soinely-purple-800)` inside inline `style={}` (the convention already used throughout `components/marketing/`).

- [ ] **Step 1: Add the tokens**

In `app/globals.css`, inside the existing `@theme { ... }` block (the one that already contains `--color-brand-violet`), add these 9 lines directly after `--color-brand-rose: #EC4899;` and before the closing `--radius-card: 16px;` line stays where it is — insert before it:

```css
  --color-soinely-purple-900: #3F1D78;
  --color-soinely-purple-800: #51258F;
  --color-soinely-purple-700: #6733A5;
  --color-soinely-purple-600: #7C4DCA;
  --color-soinely-purple-500: #9068D8;
  --color-soinely-lilac-200: #DDD0F3;
  --color-soinely-lilac-100: #F0EAF9;
  --color-soinely-lilac-050: #F8F5FC;
  --color-soinely-ink: #20182C;
  --color-soinely-text: #4E4658;
  --color-soinely-muted: #756D7D;
  --color-soinely-border: #E9E3EF;
  --color-soinely-canvas: #FCFAFD;
```

The full block should read:

```css
@theme {
  --color-primary: #2563EB;
  --color-navy: #0F172A;
  --color-teal: #14B8A6;
  --color-success: #22C55E;
  --color-warning: #F59E0B;
  --color-danger: #EF4444;
  --color-brand-violet: #7C3AED;
  --color-brand-rose: #EC4899;
  --color-soinely-purple-900: #3F1D78;
  --color-soinely-purple-800: #51258F;
  --color-soinely-purple-700: #6733A5;
  --color-soinely-purple-600: #7C4DCA;
  --color-soinely-purple-500: #9068D8;
  --color-soinely-lilac-200: #DDD0F3;
  --color-soinely-lilac-100: #F0EAF9;
  --color-soinely-lilac-050: #F8F5FC;
  --color-soinely-ink: #20182C;
  --color-soinely-text: #4E4658;
  --color-soinely-muted: #756D7D;
  --color-soinely-border: #E9E3EF;
  --color-soinely-canvas: #FCFAFD;
  --radius-card: 16px;
}
```

- [ ] **Step 2: Verify the build still compiles**

Run: `npx tsc --noEmit`
Expected: no errors (CSS changes don't affect TypeScript, but this confirms nothing else broke)

Run: `npx next build`
Expected: build succeeds — Tailwind v4 picks up new `@theme` tokens automatically, no restart or config change needed.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(landing): ajoute les tokens de design de la spec 10/10"
```

---

### Task 2: Retirer Tarifs, ajouter les liens Démonstration/Sécurité, CTA header

**Files:**
- Modify: `components/marketing/EnTeteMarketing.tsx`

**Interfaces:**
- Produces: `LIENS_NAV` array shape stays `{ href: string; label: string }[]` — Task 3 imports this exact shape into `MenuMobileMarketing`.

- [ ] **Step 1: Update the nav links array**

In `components/marketing/EnTeteMarketing.tsx`, replace:

```tsx
const LIENS_NAV = [
  { href: "#feat", label: "Fonctionnalités" },
  { href: "#ely", label: "ELY, votre copilote" },
  { href: "/abonnement", label: "Tarifs" },
];
```

with:

```tsx
const LIENS_NAV = [
  { href: "#feat", label: "Fonctionnalités" },
  { href: "#ely", label: "ELY, votre copilote" },
  { href: "#demo", label: "Démonstration" },
  { href: "#securite", label: "Sécurité" },
];
```

(`#demo` and `#securite` don't exist yet — Tasks 5 and 6 add those sections. An anchor link to a not-yet-existing id is inert, not broken: it simply won't scroll until the target exists.)

- [ ] **Step 2: Update the header CTA label**

Replace:

```tsx
        <Link
          href="/login"
          className="btn-glace whitespace-nowrap rounded-[12px] text-[14.5px] font-bold text-white"
          style={{
            background: "linear-gradient(135deg,#7c3aed,#a855f7)",
            padding: "12px 22px",
            boxShadow: "0 6px 18px rgba(124,58,237,.32)",
          }}
        >
          Se connecter
        </Link>
```

with:

```tsx
        <Link
          href="/login"
          className="btn-glace whitespace-nowrap rounded-[12px] text-[14.5px] font-bold text-white"
          style={{
            background: "linear-gradient(135deg,#7c3aed,#a855f7)",
            padding: "12px 22px",
            boxShadow: "0 6px 18px rgba(124,58,237,.32)",
          }}
        >
          Rejoindre la bêta privée
        </Link>
```

- [ ] **Step 3: Run the existing page test to see the expected failure**

Run: `npx vitest run app/page.test.tsx`
Expected: FAIL — `getByRole("link", { name: /se connecter/i })` no longer finds a match. This is expected; Task 8 updates this test file once all copy changes have landed. Do not fix it in this task.

- [ ] **Step 4: Commit**

```bash
git add components/marketing/EnTeteMarketing.tsx
git commit -m "feat(landing): retire Tarifs de la nav, ajoute Demonstration/Securite, CTA beta dans le header"
```

(The failing `app/page.test.tsx` is expected and tracked — it gets fixed in Task 8, not here.)

---

### Task 3: Menu mobile

**Files:**
- Create: `components/marketing/MenuMobileMarketing.tsx`
- Test: `components/marketing/MenuMobileMarketing.test.tsx`
- Modify: `components/marketing/EnTeteMarketing.tsx`

**Interfaces:**
- Consumes: `LIENS_NAV: { href: string; label: string }[]` from Task 2 (passed as a prop, not re-imported — `EnTeteMarketing.tsx` already has the array in scope).
- Produces: `export function MenuMobileMarketing({ liens }: { liens: { href: string; label: string }[] })` — a self-contained client component, nothing later depends on it beyond this task's own wiring into `EnTeteMarketing.tsx`.

- [ ] **Step 1: Write the failing test**

```tsx
// components/marketing/MenuMobileMarketing.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MenuMobileMarketing } from "./MenuMobileMarketing";

const LIENS = [
  { href: "#feat", label: "Fonctionnalités" },
  { href: "#ely", label: "ELY, votre copilote" },
];

describe("MenuMobileMarketing", () => {
  it("le panneau est fermé par défaut", () => {
    render(<MenuMobileMarketing liens={LIENS} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
  });

  it("s'ouvre au clic sur le bouton burger et liste les liens", () => {
    render(<MenuMobileMarketing liens={LIENS} />);
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fonctionnalités" })).toHaveAttribute("href", "#feat");
    expect(screen.getByRole("link", { name: "ELY, votre copilote" })).toHaveAttribute("href", "#ely");
    expect(screen.getByRole("link", { name: /rejoindre la bêta privée/i })).toHaveAttribute("href", "/login");
  });

  it("se ferme au clic sur un lien", () => {
    render(<MenuMobileMarketing liens={LIENS} />);
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("link", { name: "Fonctionnalités" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("se ferme à la touche Échap", () => {
    render(<MenuMobileMarketing liens={LIENS} />);
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/marketing/MenuMobileMarketing.test.tsx`
Expected: FAIL — `Cannot find module './MenuMobileMarketing'`

- [ ] **Step 3: Write the implementation**

```tsx
// components/marketing/MenuMobileMarketing.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface LienNav {
  href: string;
  label: string;
}

export function MenuMobileMarketing({ liens }: { liens: LienNav[] }) {
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    if (!ouvert) return;
    function surEchap(event: KeyboardEvent) {
      if (event.key === "Escape") setOuvert(false);
    }
    document.addEventListener("keydown", surEchap);
    return () => document.removeEventListener("keydown", surEchap);
  }, [ouvert]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-label="Menu"
        aria-expanded={ouvert}
        className="flex h-10 w-10 items-center justify-center rounded-[10px] text-[#1e1b3c]"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          {ouvert ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
        </svg>
      </button>

      {ouvert && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navigation"
          className="menu-mobile-panel fixed inset-0 z-[60] flex flex-col"
          style={{ background: "#fff" }}
        >
          <div className="flex items-center justify-end px-6" style={{ height: 76 }}>
            <button
              type="button"
              onClick={() => setOuvert(false)}
              aria-label="Fermer le menu"
              className="flex h-10 w-10 items-center justify-center rounded-[10px] text-[#1e1b3c]"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex flex-1 flex-col items-center justify-center gap-7 px-6" aria-label="Navigation principale mobile">
            {liens.map((lien) => (
              <Link
                key={lien.label}
                href={lien.href}
                onClick={() => setOuvert(false)}
                className="text-[22px] font-bold"
                style={{ color: "#1e1b3c" }}
              >
                {lien.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOuvert(false)}
              className="btn-glace mt-4 rounded-[12px] text-[16px] font-bold text-white"
              style={{
                background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                padding: "14px 30px",
                boxShadow: "0 10px 26px rgba(124,58,237,.35)",
              }}
            >
              Rejoindre la bêta privée
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/marketing/MenuMobileMarketing.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Add the reduced-motion rule for the panel**

The panel currently shows/hides instantly (React conditional render, no CSS transition), which already satisfies `prefers-reduced-motion` trivially. Add a fade-in for users who *don't* have reduced motion set, guarded the same way every other animation in this codebase is. In `app/globals.css`, find the existing block:

```css
@media (prefers-reduced-motion: reduce) {
  .reveal { opacity: 1; transform: none; filter: none; transition: none; }
  .row-lift, .tile-bounce, .baguette, .cta-lift, .pcard, .rbtn { transition: none; }
  .row-lift:hover, .tile-bounce:hover, .baguette:hover, .cta-lift:hover, .pcard:hover, .pcard.pop:hover, .rbtn:hover { transform: none; }
  .ripple-dot { display: none; }
}
```

Add `.menu-mobile-panel { transition: none; }` inside that same block (append it as a new line before the closing `}`), and add the animated version just above the media query block:

```css
.menu-mobile-panel {
  animation: menu-mobile-in .22s ease both;
}
@keyframes menu-mobile-in {
  from { opacity: 0; transform: translateY(-8px); }
}
```

- [ ] **Step 6: Wire the menu into the header**

In `components/marketing/EnTeteMarketing.tsx`, add the import at the top:

```tsx
import { MenuMobileMarketing } from "@/components/marketing/MenuMobileMarketing";
```

Then replace:

```tsx
        {/* CTA — Se connecter */}
        <Link
          href="/login"
          className="btn-glace whitespace-nowrap rounded-[12px] text-[14.5px] font-bold text-white"
          style={{
            background: "linear-gradient(135deg,#7c3aed,#a855f7)",
            padding: "12px 22px",
            boxShadow: "0 6px 18px rgba(124,58,237,.32)",
          }}
        >
          Rejoindre la bêta privée
        </Link>
      </div>
    </header>
  );
}
```

with:

```tsx
        {/* CTA — Rejoindre la bêta privée */}
        <Link
          href="/login"
          className="btn-glace hidden whitespace-nowrap rounded-[12px] text-[14.5px] font-bold text-white lg:inline-flex"
          style={{
            background: "linear-gradient(135deg,#7c3aed,#a855f7)",
            padding: "12px 22px",
            boxShadow: "0 6px 18px rgba(124,58,237,.32)",
          }}
        >
          Rejoindre la bêta privée
        </Link>

        <MenuMobileMarketing liens={LIENS_NAV} />
      </div>
    </header>
  );
}
```

(the CTA text itself was already updated in Task 2 — this step adds the `hidden lg:inline-flex` classes so the header CTA disappears exactly when the burger takes over, and adds the `MenuMobileMarketing` sibling as the last child of the `.lg-content` row). The header row becomes: Logo — nav (hidden below `lg:`) — CTA button (hidden below `lg:`) — burger (hidden at `lg:` and above, via `MenuMobileMarketing`'s own `lg:hidden` class).

- [ ] **Step 7: Verify the header renders both states**

Run: `npx vitest run components/marketing/MenuMobileMarketing.test.tsx`
Expected: PASS (4 tests, unaffected by the wiring change)

- [ ] **Step 8: Commit**

```bash
git add components/marketing/MenuMobileMarketing.tsx components/marketing/MenuMobileMarketing.test.tsx components/marketing/EnTeteMarketing.tsx app/globals.css
git commit -m "feat(landing): menu mobile accessible (burger, Echap, fermeture au clic)"
```

---

### Task 4: Section Bénéfices

**Files:**
- Create: `components/marketing/Benefices.tsx`
- Test: `components/marketing/Benefices.test.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Produces: `export function Benefices()` — no props, static content. Consumed by `app/page.tsx` only.

- [ ] **Step 1: Write the failing test**

```tsx
// components/marketing/Benefices.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Benefices } from "./Benefices";

describe("Benefices", () => {
  it("affiche les 3 bénéfices de la spec, pas plus", () => {
    render(<Benefices />);
    expect(screen.getByText("Du temps retrouvé")).toBeInTheDocument();
    expect(screen.getByText("Moins de charge mentale")).toBeInTheDocument();
    expect(screen.getByText("L'essentiel à portée de main")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/marketing/Benefices.test.tsx`
Expected: FAIL — `Cannot find module './Benefices'`

- [ ] **Step 3: Write the implementation**

```tsx
// components/marketing/Benefices.tsx
const BENEFICES = [
  {
    titre: "Du temps retrouvé",
    texte: "Moins de trajets à vide, moins de recherches — chaque minute compte, SOINELY vous la rend.",
    d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM12 8v4l2.5 1.5",
  },
  {
    titre: "Moins de charge mentale",
    texte: "ELY se souvient à votre place, vous restez concentrée sur le soin.",
    d: "M12 5a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 0 3 3 0 0 0 2-5 3 3 0 0 0-2-5 3 3 0 0 0-3-3z",
  },
  {
    titre: "L'essentiel à portée de main",
    texte: "Protocoles, cotations, historique patient : tout est là, sans ouvrir dix applications.",
    d: "M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5zM20 22H6.5a2.5 2.5 0 0 1 0-5H20",
  },
];

export function Benefices() {
  return (
    <section style={{ background: "var(--color-soinely-canvas)", padding: "56px 0" }}>
      <div className="mx-auto w-full max-w-[1180px] px-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {BENEFICES.map((b) => (
            <div
              key={b.titre}
              style={{
                background: "#fff",
                border: "1px solid var(--color-soinely-border)",
                borderRadius: 20,
                padding: "28px 26px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: "var(--color-soinely-lilac-100)",
                  color: "var(--color-soinely-purple-700)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 18px",
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d={b.d} />
                </svg>
              </div>
              <p
                className="font-display"
                style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.3px", color: "var(--color-soinely-ink)", margin: "0 0 8px" }}
              >
                {b.titre}
              </p>
              <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--color-soinely-text)", margin: 0 }}>
                {b.texte}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/marketing/Benefices.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: Insert into the page, before RangeeFonctionnalites**

In `app/page.tsx`, add the import:

```tsx
import { Benefices } from "@/components/marketing/Benefices";
```

Insert `<Benefices />` (no `<Reveal>` wrapper — it sits directly under the Hero, matching how `Hero` itself has no reveal wrapper, since above-the-fold content shouldn't fade in on load) between `<Hero />` and the `<Reveal variant="up"><RangeeFonctionnalites /></Reveal>` block:

```tsx
      <EnTeteMarketing />
      <Hero />
      <Benefices />
      <Reveal variant="up">
        <RangeeFonctionnalites />
      </Reveal>
```

- [ ] **Step 6: Commit**

```bash
git add components/marketing/Benefices.tsx components/marketing/Benefices.test.tsx app/page.tsx
git commit -m "feat(landing): ajoute la section Benefices (3 cartes, avant les fonctionnalites)"
```

---

### Task 5: Section Sécurité / confiance + correction du footer

**Files:**
- Create: `components/marketing/SecuriteConfiance.tsx`
- Test: `components/marketing/SecuriteConfiance.test.tsx`
- Modify: `components/marketing/PiedDePageMarketing.tsx`
- Test: `components/marketing/PiedDePageMarketing.test.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Produces: `export function SecuriteConfiance()` — no props, static content, `id="securite"` on its root `<section>` (this is what `EnTeteMarketing.tsx`'s `#securite` nav link from Task 2 scrolls to).

- [ ] **Step 1: Write the failing tests**

```tsx
// components/marketing/SecuriteConfiance.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SecuriteConfiance } from "./SecuriteConfiance";

describe("SecuriteConfiance", () => {
  it("utilise la formulation sûre de la spec, sans affirmation de conformité non validée", () => {
    render(<SecuriteConfiance />);
    expect(
      screen.getByText("Conçu avec la confidentialité et la protection des données comme exigences de base.")
    ).toBeInTheDocument();
    expect(screen.queryByText(/conforme RGPD/i)).not.toBeInTheDocument();
  });

  it("porte l'ancre #securite pour le lien de navigation du header", () => {
    const { container } = render(<SecuriteConfiance />);
    expect(container.querySelector("section#securite")).toBeInTheDocument();
  });
});
```

```tsx
// components/marketing/PiedDePageMarketing.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PiedDePageMarketing } from "./PiedDePageMarketing";

describe("PiedDePageMarketing", () => {
  it("n'affiche plus l'affirmation de conformite RGPD", () => {
    render(<PiedDePageMarketing />);
    expect(screen.queryByText(/conforme RGPD/i)).not.toBeInTheDocument();
  });

  it("affiche le logo et le copyright", () => {
    render(<PiedDePageMarketing />);
    expect(screen.getByText("SOINELY")).toBeInTheDocument();
    expect(screen.getByText(`© SOINELY ${new Date().getFullYear()}`)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/marketing/SecuriteConfiance.test.tsx components/marketing/PiedDePageMarketing.test.tsx`
Expected: FAIL — `SecuriteConfiance` module doesn't exist; `PiedDePageMarketing` test fails because "Conforme RGPD" is currently present and there's no "SOINELY" text/copyright line yet.

- [ ] **Step 3: Write the new Sécurité section**

```tsx
// components/marketing/SecuriteConfiance.tsx
const BADGES = [
  {
    t1: "Données chiffrées",
    t2: "En transit et au repos",
    d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  },
  {
    t1: "Accès cloisonné",
    t2: "Chaque IDEL n'accède qu'à ses patients",
    d: "M6 10V8a6 6 0 0 1 12 0v2 M5 10h14v10H5z",
  },
  {
    t1: "Conçu par des IDEL",
    t2: "Pour les infirmiers libéraux",
    d: "M12 21s-7-4.4-9.5-8.5C.5 9 2 5 5.5 5 7.8 5 9 6.5 12 9c3-2.5 4.2-4 6.5-4C22 5 23.5 9 21.5 12.5 19 16.6 12 21 12 21z",
  },
];

export function SecuriteConfiance() {
  return (
    <section id="securite" style={{ background: "#fff", padding: "56px 0" }}>
      <div className="mx-auto w-full max-w-[1180px] px-6" style={{ textAlign: "center" }}>
        <p
          className="font-display"
          style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.4px", color: "var(--color-soinely-ink)", margin: "0 auto 12px", maxWidth: "36ch" }}
        >
          Conçu avec la confidentialité et la protection des données comme exigences de base.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {BADGES.map((badge) => (
            <div key={badge.t1} style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--color-soinely-lilac-100)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-soinely-purple-700)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={badge.d} />
                </svg>
              </div>
              <div style={{ lineHeight: 1.3, textAlign: "left" }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--color-soinely-ink)" }}>{badge.t1}</div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--color-soinely-muted)" }}>{badge.t2}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Fix the footer**

In `components/marketing/PiedDePageMarketing.tsx`, replace the whole `BADGES` array and footer content:

```tsx
import Link from "next/link";
import { LogoSoinely } from "@/components/ui/LogoSoinely";

export function PiedDePageMarketing() {
  return (
    <footer style={{ borderTop: "1px solid #f0ecfb", background: "#fff", padding: "26px 0" }}>
      <div className="mx-auto flex w-full max-w-[1180px] items-center justify-center gap-[11px] px-6">
        <LogoSoinely variante="carre" className="h-7 w-7" />
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.3px", color: "#1e1b3c" }}>SOINELY</span>
      </div>

      <div className="mx-auto mt-5 flex w-full max-w-[1180px] flex-wrap items-center justify-center gap-x-5 gap-y-2 px-6">
        <Link href="/conditions" className="text-[12.5px] font-semibold text-[#8a83a0] hover:text-[#7c3aed]">
          Conditions générales
        </Link>
        <Link href="/confidentialite" className="text-[12.5px] font-semibold text-[#8a83a0] hover:text-[#7c3aed]">
          Politique de confidentialité
        </Link>
      </div>

      <div className="mx-auto mt-4 w-full max-w-[1180px] px-6 text-center" style={{ fontSize: 11.5, color: "#9a92b3" }}>
        © SOINELY {new Date().getFullYear()}
      </div>
    </footer>
  );
}
```

(This removes the 4-badge trust strip entirely — those 3 non-RGPD badges now live in the new `SecuriteConfiance` section from Step 3, and the spec's §2.10 footer list doesn't call for a badge strip in the footer at all, only Logo/Produit/Sécurité-confidentialité-link/FAQ/Contact/Mentions-légales/legal-links/copyright. Produit/FAQ/Contact/Mentions légales stay out of scope per this plan's Global Constraints.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run components/marketing/SecuriteConfiance.test.tsx components/marketing/PiedDePageMarketing.test.tsx`
Expected: PASS (4 tests total)

- [ ] **Step 6: Insert the new section into the page**

In `app/page.tsx`, add the import:

```tsx
import { SecuriteConfiance } from "@/components/marketing/SecuriteConfiance";
```

Insert it wrapped in `<Reveal variant="up">`, after `EnTempsReel` and before `VideoDemo`:

```tsx
      <Reveal variant="left">
        <EnTempsReel />
      </Reveal>
      <Reveal variant="up">
        <SecuriteConfiance />
      </Reveal>
      <Reveal variant="blur">
        <VideoDemo />
      </Reveal>
```

- [ ] **Step 7: Commit**

```bash
git add components/marketing/SecuriteConfiance.tsx components/marketing/SecuriteConfiance.test.tsx components/marketing/PiedDePageMarketing.tsx components/marketing/PiedDePageMarketing.test.tsx app/page.tsx
git commit -m "feat(landing): section Securite/confiance, retire l'affirmation Conforme RGPD du footer"
```

---

### Task 6: Lecteur vidéo réel

**Files:**
- Modify: `components/marketing/VideoDemo.tsx`
- Test: `components/marketing/VideoDemo.test.tsx`

**Interfaces:**
- Produces: `export function VideoDemo()` — same signature as before (no props), now a Client Component. `id="demo"` on its root `<section>` (target of `EnTeteMarketing.tsx`'s `#demo` nav link from Task 2).

- [ ] **Step 1: Write the failing test**

```tsx
// components/marketing/VideoDemo.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VideoDemo } from "./VideoDemo";

describe("VideoDemo", () => {
  it("porte l'ancre #demo et le titre exact de la spec", () => {
    const { container } = render(<VideoDemo />);
    expect(container.querySelector("section#demo")).toBeInTheDocument();
    expect(screen.getByText("45 secondes pour découvrir une tournée avec SOINELY")).toBeInTheDocument();
  });

  it("affiche la miniature et le bouton play par défaut, sans lecteur video", () => {
    render(<VideoDemo />);
    expect(screen.queryByTestId("video-player")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /regarder la vidéo/i })).toBeInTheDocument();
  });

  it("remplace la miniature par le lecteur video au clic", () => {
    render(<VideoDemo />);
    fireEvent.click(screen.getByRole("button", { name: /regarder la vidéo/i }));

    const player = screen.getByTestId("video-player");
    expect(player.querySelector("source")).toHaveAttribute("src", "/marketing/demo-produit.mp4");
    expect(player.querySelector("track")).toHaveAttribute("src", "/marketing/demo-produit.fr.vtt");
    expect(screen.queryByRole("button", { name: /regarder la vidéo/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/marketing/VideoDemo.test.tsx`
Expected: FAIL — no `id="demo"`, wrong title text, no play/pause toggle behavior yet.

- [ ] **Step 3: Write the implementation**

Replace the full contents of `components/marketing/VideoDemo.tsx`:

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";

const VIDEO_BULLETS = [
  { l: "Tournée optimisée", d: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z M12 10.5a1 1 0 1 0 0-1 1 1 0 0 0 0 1z" },
  { l: "ELY en action", d: "M12 21s-7-4.4-9.5-8.5C.5 9 2 5 5.5 5 7.8 5 9 6.5 12 9c3-2.5 4.2-4 6.5-4C22 5 23.5 9 21.5 12.5 19 16.6 12 21 12 21z" },
  { l: "Transmissions simplifiées", d: "m22 2-7 20-4-9-9-4z M22 2 11 13" },
  { l: "Sérénité retrouvée", d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
];

export function VideoDemo() {
  const [lecture, setLecture] = useState(false);

  return (
    <section id="demo" className="py-10 sm:py-14" style={{ background: "#fff" }}>
      <div className="mx-auto w-full max-w-[1180px] px-6">
        <div
          className="grid grid-cols-1 gap-8 px-6 py-9 lg:grid-cols-[0.85fr_1.5fr_0.7fr] lg:items-center lg:gap-[34px] lg:px-11 lg:py-11"
          style={{
            borderRadius: 26,
            overflow: "hidden",
            background: "linear-gradient(120deg,var(--color-soinely-purple-900) 0%,#5b21b6 50%,#8b2fb0 100%)",
          }}
        >
          {/* Texte gauche */}
          <div>
            <div style={{ display: "inline-block", fontSize: 10.5, fontWeight: 800, letterSpacing: ".6px", color: "#fff", background: "rgba(255,255,255,.16)", padding: "5px 11px", borderRadius: 6, marginBottom: 16 }}>
              EN 45 SECONDES
            </div>
            <h2
              className="font-display"
              style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.8px", lineHeight: 1.12, color: "#fff", margin: "0 0 14px" }}
            >
              45 secondes pour découvrir une tournée avec SOINELY
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,.8)", margin: "0 0 22px" }}>
              Voyez comment ELY vous accompagne à chaque étape de votre tournée.
            </p>
            {!lecture && (
              <button
                type="button"
                onClick={() => setLecture(true)}
                className="btn-glace inline-flex items-center gap-[9px] rounded-[12px] font-bold text-white"
                style={{ background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.25)", fontSize: 14, padding: "12px 20px" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Regarder la vidéo{" "}
                <span style={{ opacity: 0.7 }}>00:45</span>
              </button>
            )}
          </div>

          {/* Vignette vidéo centrale, ou lecteur une fois lancé */}
          <div style={{ position: "relative", height: 250, borderRadius: 18, overflow: "hidden", background: "#000" }}>
            {lecture ? (
              <video
                data-testid="video-player"
                controls
                autoPlay
                poster="/marketing/video-thumb.webp"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              >
                <source src="/marketing/demo-produit.mp4" type="video/mp4" />
                <track kind="subtitles" src="/marketing/demo-produit.fr.vtt" srcLang="fr" label="Français" default />
              </video>
            ) : (
              <button
                type="button"
                onClick={() => setLecture(true)}
                aria-label="Lancer la vidéo de démonstration"
                style={{ position: "relative", width: "100%", height: "100%", padding: 0, border: 0, cursor: "pointer" }}
              >
                <Image
                  src="/marketing/video-thumb.webp"
                  alt="Aperçu vidéo SOINELY"
                  fill
                  sizes="(min-width:1024px) 50vw, 100vw"
                  className="object-cover"
                />
                <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ width: 66, height: 66, borderRadius: 9999, background: "rgba(255,255,255,.92)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(0,0,0,.25)" }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="#6d28d9" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </span>
              </button>
            )}
          </div>

          {/* Bullets droite */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {VIDEO_BULLETS.map((v) => (
              <div key={v.l} style={{ display: "flex", alignItems: "center", gap: 11, fontSize: 13.5, fontWeight: 600, color: "#fff" }}>
                <span style={{ width: 34, height: 34, borderRadius: 9999, background: "rgba(255,255,255,.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={v.d} />
                  </svg>
                </span>
                {v.l}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

Note: two independent triggers set `lecture` to `true` (the button in the left column, and the thumbnail itself) — both are real, visible, clickable controls; this matches how the mockup already implied the whole thumbnail was clickable.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/marketing/VideoDemo.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add components/marketing/VideoDemo.tsx components/marketing/VideoDemo.test.tsx
git commit -m "feat(landing): lecteur video reel (sans fichier), pret a recevoir la vraie demo"
```

---

### Task 7: Section CTA final

**Files:**
- Create: `components/marketing/CtaFinal.tsx`
- Test: `components/marketing/CtaFinal.test.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Produces: `export function CtaFinal()` — no props, static content + one link to `/login`.

- [ ] **Step 1: Write the failing test**

```tsx
// components/marketing/CtaFinal.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CtaFinal } from "./CtaFinal";

describe("CtaFinal", () => {
  it("affiche le texte exact de la spec et le CTA vers /login", () => {
    render(<CtaFinal />);
    expect(screen.getByText("Vous prenez soin de vos patients.")).toBeInTheDocument();
    expect(screen.getByText("ELY prend soin de votre journée.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /rejoindre la bêta privée/i })).toHaveAttribute("href", "/login");
    expect(screen.getByText("Gratuit pendant la bêta • Sans engagement")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/marketing/CtaFinal.test.tsx`
Expected: FAIL — `Cannot find module './CtaFinal'`

- [ ] **Step 3: Write the implementation**

```tsx
// components/marketing/CtaFinal.tsx
import Link from "next/link";

export function CtaFinal() {
  return (
    <section
      className="py-16 sm:py-20"
      style={{ background: "var(--color-soinely-purple-900)" }}
    >
      <div className="mx-auto w-full max-w-[720px] px-6 text-center">
        <h2
          className="font-display"
          style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.6px", lineHeight: 1.18, color: "#fff", margin: "0 0 6px" }}
        >
          Vous prenez soin de vos patients.
        </h2>
        <p
          className="font-display"
          style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.6px", lineHeight: 1.18, color: "var(--color-soinely-lilac-200)", margin: "0 0 18px" }}
        >
          ELY prend soin de votre journée.
        </p>
        <p style={{ fontSize: 15.5, lineHeight: 1.55, color: "rgba(255,255,255,.78)", margin: "0 auto 28px", maxWidth: "48ch" }}>
          Rejoignez la bêta privée de SOINELY et participez aux dernières étapes de construction
          du copilote pensé pour les IDEL.
        </p>
        <Link
          href="/login"
          className="btn-glace-clair inline-flex items-center gap-[9px] rounded-[12px] font-extrabold"
          style={{ background: "#fff", color: "var(--color-soinely-purple-700)", fontSize: 16, padding: "16px 32px", boxShadow: "0 14px 32px rgba(0,0,0,.22)" }}
        >
          Rejoindre la bêta privée
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-soinely-purple-700)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
        <p style={{ marginTop: 16, fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,.7)" }}>
          Gratuit pendant la bêta • Sans engagement
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/marketing/CtaFinal.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: Insert into the page, after ListeAttente**

In `app/page.tsx`, add the import:

```tsx
import { CtaFinal } from "@/components/marketing/CtaFinal";
```

Insert it after the `<Reveal variant="rise"><ListeAttente /></Reveal>` block and before `<PiedDePageMarketing />`:

```tsx
      <Reveal variant="rise">
        <ListeAttente />
      </Reveal>
      <CtaFinal />
      <PiedDePageMarketing />
```

(No `<Reveal>` wrapper — this is the page's closing statement, it should be immediately visible once scrolled into view rather than animating in, consistent with how `Hero` and `Benefices` also skip the reveal wrapper.)

- [ ] **Step 6: Commit**

```bash
git add components/marketing/CtaFinal.tsx components/marketing/CtaFinal.test.tsx app/page.tsx
git commit -m "feat(landing): section CTA final (fond violet profond)"
```

---

### Task 8: CTA cohérents, micro-copy, hygiène Core Web Vitals, mise à jour des tests

**Files:**
- Modify: `components/marketing/Hero.tsx`
- Modify: `components/marketing/ListeAttente.tsx`
- Modify: `app/page.test.tsx`

**Interfaces:**
- Consumes: nothing new — this task only edits copy/markup in already-existing files.
- Produces: nothing consumed by later tasks — this is the last task in the plan.

- [ ] **Step 1: Update `app/page.test.tsx` first (TDD: this defines the target copy)**

Replace the full contents of `app/page.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import Page from "./page";

describe("Home page", () => {
  it("renders the Soinely brand in the header", () => {
    render(<Page />);
    const header = screen.getByRole("banner");
    expect(within(header).getByText("SOINELY")).toBeInTheDocument();
  });

  it("links the primary CTAs to /login with consistent beta copy", () => {
    render(<Page />);
    const ctas = screen.getAllByRole("link", { name: /rejoindre la bêta privée/i });
    expect(ctas.length).toBeGreaterThanOrEqual(4); // header, hero, liste d'attente, CTA final
    for (const cta of ctas) {
      expect(cta).toHaveAttribute("href", "/login");
    }
  });

  it("le hero propose un CTA secondaire vers la démonstration", () => {
    render(<Page />);
    expect(screen.getByRole("link", { name: /voir soinely en action/i })).toHaveAttribute("href", "#demo");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/page.test.tsx`
Expected: FAIL — Hero still says "Essayer gratuitement", ListeAttente still says "Rejoindre la liste d'attente", no secondary CTA exists yet.

- [ ] **Step 3: Update `Hero.tsx` — primary CTA, add secondary CTA, dedupe micro-copy**

In `components/marketing/Hero.tsx`, replace this whole block (currently lines 120-183 — the "CTA unique" `Link` plus the "Badges sous le CTA" `div` that follows it):

```tsx
          {/* CTA unique — Essayer gratuitement */}
          <div className="mb-[24px] flex items-center gap-[14px]">
            <Link
              href="/login"
              className="btn-glace inline-flex items-center gap-[9px] rounded-[12px] font-bold text-white"
              style={{
                background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                fontSize: 16,
                padding: "16px 30px",
                boxShadow: "0 10px 26px rgba(124,58,237,.35)",
              }}
            >
              Essayer gratuitement
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="btn-arrow"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>

          {/* Badges sous le CTA */}
          <div
            className="flex flex-wrap items-center gap-[22px] font-semibold"
            style={{ fontSize: 12.5, color: "#8a83a0" }}
          >
            {[
              {
                label: "Données de santé chiffrées",
                d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
              },
              { label: "Sans engagement", d: "M20 6 9 17l-5-5" },
              {
                label: "Conçu par et pour les IDEL",
                d: "M12 21s-7-4.4-9.5-8.5C.5 9 2 5 5.5 5 7.8 5 9 6.5 12 9c3-2.5 4.2-4 6.5-4C22 5 23.5 9 21.5 12.5 19 16.6 12 21 12 21z",
              },
            ].map((badge) => (
              <span key={badge.label} className="flex items-center gap-[6px]">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={badge.d} />
                </svg>
                {badge.label}
              </span>
            ))}
          </div>
```

with:

```tsx
          {/* CTA primaire + secondaire */}
          <div className="mb-[24px] flex flex-wrap items-center gap-[14px]">
            <Link
              href="/login"
              className="btn-glace inline-flex items-center gap-[9px] rounded-[12px] font-bold text-white"
              style={{
                background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                fontSize: 16,
                padding: "16px 30px",
                boxShadow: "0 10px 26px rgba(124,58,237,.35)",
              }}
            >
              Rejoindre la bêta privée
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="btn-arrow"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <Link
              href="#demo"
              className="btn-glace-clair inline-flex items-center gap-[9px] rounded-[12px] font-bold"
              style={{
                background: "#fff",
                border: "1px solid #e9defb",
                color: "#6d28d9",
                fontSize: 16,
                padding: "16px 30px",
              }}
            >
              Voir SOINELY en action
            </Link>
          </div>

          {/* Micro-copy */}
          <p style={{ fontSize: 12.5, fontWeight: 600, color: "#8a83a0", margin: 0 }}>
            Bêta gratuite • Sans engagement
          </p>
```

This deletes the duplicate badges block the audit flagged — the `HERO_CHECKS` checklist above (lines 93-118, with the circular checkmark icons) already covers the same 3 claims once and **stays untouched**; only this second, redundant badge list is removed.

- [ ] **Step 4: Update `ListeAttente.tsx` — CTA copy**

Replace:

```tsx
            <Link
              href="/login"
              className="btn-glace-clair mb-3 inline-flex items-center gap-[9px] rounded-[12px] font-extrabold"
              style={{ background: "#fff", color: "#7c3aed", fontSize: 15, padding: "14px 26px", boxShadow: "0 10px 26px rgba(0,0,0,.18)", display: "inline-flex", marginBottom: 12 }}
            >
              Rejoindre la liste d&apos;attente
```

with:

```tsx
            <Link
              href="/login"
              className="btn-glace-clair mb-3 inline-flex items-center gap-[9px] rounded-[12px] font-extrabold"
              style={{ background: "#fff", color: "#7c3aed", fontSize: 15, padding: "14px 26px", boxShadow: "0 10px 26px rgba(0,0,0,.18)", display: "inline-flex", marginBottom: 12 }}
            >
              Rejoindre la bêta privée
```

(Only the link text changes — the surrounding arrow `<svg>`, `href`, and styling stay exactly as they are.)

- [ ] **Step 5: Core Web Vitals — hero background video preload**

In `components/marketing/Hero.tsx`, find:

```tsx
        <video
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover"
          poster="/marketing/hero-nurse.webp"
        >
```

Add `preload="none"`:

```tsx
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          className="h-full w-full object-cover"
          poster="/marketing/hero-nurse.webp"
        >
```

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass, including the updated `app/page.test.tsx` (3 tests) and every component test from Tasks 3–7.

- [ ] **Step 7: Verify build and types**

Run: `npx tsc --noEmit`
Expected: no errors

Run: `npx next build`
Expected: build succeeds

- [ ] **Step 8: Commit**

```bash
git add components/marketing/Hero.tsx components/marketing/ListeAttente.tsx app/page.test.tsx
git commit -m "feat(landing): CTA beta coherent partout, CTA secondaire du hero, hygiene video de fond"
```

---

## Post-plan note

This plan covers the 8 remaining P0 items of the approved spec
(`docs/superpowers/specs/2026-08-09-landing-page-p0-design.md`). FAQ,
Contact, Mentions légales pages, full SEO metadata, sticky-phone scroll
storytelling, and analytics event tracking are explicitly out of scope —
separate, unspecified future work.
