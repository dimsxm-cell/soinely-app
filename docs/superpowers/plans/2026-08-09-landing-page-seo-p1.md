# Landing page SEO (P1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Soinely marketing site (`/`, `/conditions`, `/confidentialite`) properly indexable and shareable — sitemap, robots.txt, Open Graph, JSON-LD, canonical URLs — the P1 SEO item deferred from the landing-page P0 spec.

**Architecture:** A single new constants file (`lib/site.ts`) is the one source of truth for the production domain and the structured-data payload. Everything else is Next.js App Router file-convention routes (`sitemap.ts`, `robots.ts`, `opengraph-image.tsx`) plus small, additive edits to existing metadata exports. No new dependencies, no new routes beyond the Next.js SEO conventions, no changes to any rendered UI.

**Tech Stack:** Next.js App Router metadata API (`Metadata`, `MetadataRoute.Sitemap`, `MetadataRoute.Robots`), `next/og` `ImageResponse` (already used by `app/icon.tsx`), Vitest.

## Global Constraints

- The production domain (`https://soinely.app`) is defined exactly once, in `lib/site.ts`'s `SITE_URL` export. No other file may hardcode this string.
- JSON-LD structured data contains only facts verifiable in the code (name, domain, logo path, description already used in the layout) — never a rating, review, or usage statistic that isn't backed by real data.
- `/abonnement` is excluded from `app/sitemap.ts` (consistent with removing the "Tarifs" nav link during the P0 pass) but is NOT added to `robots.ts`'s disallow list — sitemap exclusion and crawl-blocking are different decisions, and only the former was made for this route.
- `robots.ts` allows indexing (`allow: "/"`) at the root — the user explicitly chose to allow indexing during the private beta rather than blocking it.
- Any JSX passed to `ImageResponse` (in `app/opengraph-image.tsx`) uses inline `style` objects only — no Tailwind class names. The underlying Satori renderer used by `next/og` does not read compiled Tailwind CSS, only inline styles. `app/icon.tsx` already follows this constraint; follow the same pattern.
- `app/opengraph-image.tsx` gets no dedicated automated test — `app/icon.tsx` and `app/apple-icon.tsx` (the two existing `ImageResponse`-based routes in this repo) have none either, and this plan follows that precedent rather than introducing a new one.

---

### Task 1: `lib/site.ts` — domain constant and structured data

**Files:**
- Create: `lib/site.ts`
- Test: `lib/site.test.ts`

**Interfaces:**
- Produces: `export const SITE_URL: string` — the production origin, no trailing slash. Consumed by Tasks 2, 3, 5, 6.
- Produces: `export const DONNEES_STRUCTUREES_SITE: { "@context": string; "@graph": Array<Record<string, unknown>> }` — the JSON-LD payload. Consumed by Task 5.

- [ ] **Step 1: Write the failing test**

```ts
// lib/site.test.ts
import { describe, expect, it } from "vitest";
import { SITE_URL, DONNEES_STRUCTUREES_SITE } from "./site";

describe("SITE_URL", () => {
  it("pointe vers le domaine de production, sans slash final", () => {
    expect(SITE_URL).toBe("https://soinely.app");
  });
});

describe("DONNEES_STRUCTUREES_SITE", () => {
  it("decrit l'organisation et le site, sans donnee fabriquee", () => {
    const graph = DONNEES_STRUCTUREES_SITE["@graph"];
    expect(graph).toHaveLength(2);

    const organisation = graph.find((n) => n["@type"] === "Organization");
    expect(organisation).toMatchObject({
      name: "Soinely",
      url: "https://soinely.app",
      logo: "https://soinely.app/logo-soinely.png",
      description: "Le copilote des infirmiers libéraux.",
    });
    expect(organisation).not.toHaveProperty("aggregateRating");
    expect(organisation).not.toHaveProperty("review");

    const site = graph.find((n) => n["@type"] === "WebSite");
    expect(site).toMatchObject({
      name: "Soinely",
      url: "https://soinely.app",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/site.test.ts`
Expected: FAIL — `Cannot find module './site'`

- [ ] **Step 3: Write the implementation**

```ts
// lib/site.ts

/**
 * Domaine de production, source unique : tout le reste (sitemap, robots,
 * metadonnees, canonical) en derive plutot que de le recopier.
 */
export const SITE_URL = "https://soinely.app";

/**
 * Donnees structurees JSON-LD, injectees telles quelles dans le layout
 * racine. Uniquement des faits verifiables dans le code — jamais de note,
 * d'avis ou de chiffre d'usage fabrique.
 */
export const DONNEES_STRUCTUREES_SITE = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Soinely",
      url: SITE_URL,
      logo: `${SITE_URL}/logo-soinely.png`,
      description: "Le copilote des infirmiers libéraux.",
    },
    {
      "@type": "WebSite",
      name: "Soinely",
      url: SITE_URL,
    },
  ],
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/site.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/site.ts lib/site.test.ts
git commit -m "feat(seo): ajoute la constante de domaine et les donnees structurees du site"
```

---

### Task 2: `app/sitemap.ts`

**Files:**
- Create: `app/sitemap.ts`
- Test: `app/sitemap.test.ts`

**Interfaces:**
- Consumes: `SITE_URL` from `@/lib/site` (Task 1).
- Produces: `export default function sitemap(): MetadataRoute.Sitemap` — a Next.js file-convention route, no other task depends on its signature.

- [ ] **Step 1: Write the failing test**

```ts
// app/sitemap.test.ts
import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";

describe("sitemap", () => {
  it("liste exactement les 3 pages publiques indexables", () => {
    const entries = sitemap();
    expect(entries).toHaveLength(3);

    const urls = entries.map((e) => e.url);
    expect(urls).toEqual([
      "https://soinely.app",
      "https://soinely.app/conditions",
      "https://soinely.app/confidentialite",
    ]);
  });

  it("n'inclut jamais /abonnement ni une route authentifiee", () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => u.includes("/abonnement"))).toBe(false);
    expect(urls.some((u) => u.includes("/login"))).toBe(false);
    expect(urls.some((u) => u.includes("/tableau-de-bord"))).toBe(false);
  });

  it("donne la priorite la plus haute a la page d'accueil", () => {
    const entries = sitemap();
    const home = entries.find((e) => e.url === "https://soinely.app");
    expect(home?.priority).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/sitemap.test.ts`
Expected: FAIL — `Cannot find module './sitemap'`

- [ ] **Step 3: Write the implementation**

```ts
// app/sitemap.ts
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/conditions`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/confidentialite`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/sitemap.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add app/sitemap.ts app/sitemap.test.ts
git commit -m "feat(seo): ajoute le sitemap (accueil, conditions, confidentialite)"
```

---

### Task 3: `app/robots.ts`

**Files:**
- Create: `app/robots.ts`
- Test: `app/robots.test.ts`

**Interfaces:**
- Consumes: `SITE_URL` from `@/lib/site` (Task 1).
- Produces: `export default function robots(): MetadataRoute.Robots` — a Next.js file-convention route, no other task depends on its signature.

- [ ] **Step 1: Write the failing test**

```ts
// app/robots.test.ts
import { describe, expect, it } from "vitest";
import robots from "./robots";

interface ReglesRobots {
  userAgent: string;
  allow: string;
  disallow: string[];
}

describe("robots", () => {
  it("autorise le crawl general et pointe vers le sitemap", () => {
    const result = robots();
    const rules = result.rules as ReglesRobots;
    expect(rules.userAgent).toBe("*");
    expect(rules.allow).toBe("/");
    expect(result.sitemap).toBe("https://soinely.app/sitemap.xml");
  });

  it("interdit les routes non publiques", () => {
    const result = robots();
    const rules = result.rules as ReglesRobots;
    expect(rules.disallow).toEqual([
      "/api/",
      "/auth/",
      "/login",
      "/reinitialiser-mot-de-passe",
      "/tableau-de-bord",
      "/compte",
      "/ely",
      "/ma-journee",
      "/ma-tournee",
      "/patients",
      "/recherche",
      "/situations",
    ]);
  });

  it("n'interdit pas /abonnement (seul le sitemap l'exclut, pas le crawl)", () => {
    const result = robots();
    const rules = result.rules as ReglesRobots;
    expect(rules.disallow).not.toContain("/abonnement");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/robots.test.ts`
Expected: FAIL — `Cannot find module './robots'`

- [ ] **Step 3: Write the implementation**

```ts
// app/robots.ts
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth/",
        "/login",
        "/reinitialiser-mot-de-passe",
        "/tableau-de-bord",
        "/compte",
        "/ely",
        "/ma-journee",
        "/ma-tournee",
        "/patients",
        "/recherche",
        "/situations",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/robots.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add app/robots.ts app/robots.test.ts
git commit -m "feat(seo): ajoute robots.txt (autorise le crawl public, interdit les routes privees)"
```

---

### Task 4: `app/opengraph-image.tsx`

**Files:**
- Create: `app/opengraph-image.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks (self-contained, no `SITE_URL` needed — Next resolves the image's own absolute URL itself from `metadataBase`, added in Task 5).
- Produces: nothing consumed by later tasks — Next.js detects this file by naming convention alone and wires it into every route's Open Graph and Twitter Card metadata automatically.

- [ ] **Step 1: Write the implementation**

No test for this task (see Global Constraints — matches the existing `app/icon.tsx`/`app/apple-icon.tsx` precedent, neither of which has one).

```tsx
// app/opengraph-image.tsx
import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const VIOLET_CHARTE = "#6A4CFF";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #221b33 0%, #3a2260 60%, #6d28d9 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 140,
            height: 140,
            borderRadius: 40,
            background: VIOLET_CHARTE,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          <svg width="88" height="88" viewBox="0 0 48 48">
            <path
              d="M24 42S5 29.5 5 17.6C5 11.2 9.9 6 16 6c3.7 0 7 1.9 8 4.8C25 7.9 28.3 6 32 6c6.1 0 11 5.2 11 11.6C43 29.5 24 42 24 42Z"
              fill="#ffffff"
            />
            <path d="M30 12h6v5h5v6h-5v5h-6v-5h-5v-6h5v-5Z" fill={VIOLET_CHARTE} />
          </svg>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 84,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-2px",
          }}
        >
          Soinely
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 32,
            fontWeight: 600,
            color: "#c9bdf0",
          }}
        >
          Le copilote des infirmiers libéraux
        </div>
      </div>
    ),
    { ...size }
  );
}
```

The heart-and-cross paths are the same brand mark already used by `components/ui/LogoSoinely.tsx`'s `variante="carre"` (violet square, white heart, violet cross cut out of the heart) — reproduced here with inline styles/SVG only because `ImageResponse`'s Satori renderer cannot read `LogoSoinely`'s Tailwind classes.

- [ ] **Step 2: Verify it compiles and renders**

Run: `npx tsc --noEmit`
Expected: no errors

Run: `npm run dev` (in one terminal), then in another:
Run: `curl -sD - -o /tmp/og.png "http://localhost:3000/opengraph-image" | head -20`
Expected: response headers show `content-type: image/png`; `/tmp/og.png` is a non-empty PNG file (`file /tmp/og.png` reports `PNG image data, 1200 x 630`). Stop the dev server after checking.

- [ ] **Step 3: Commit**

```bash
git add app/opengraph-image.tsx
git commit -m "feat(seo): ajoute l'image Open Graph generee (1200x630)"
```

---

### Task 5: `app/layout.tsx` — metadataBase, Open Graph, Twitter, JSON-LD

**Files:**
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `SITE_URL`, `DONNEES_STRUCTUREES_SITE` from `@/lib/site` (Task 1).

- [ ] **Step 1: Add the import**

In `app/layout.tsx`, add to the imports at the top of the file:

```tsx
import { SITE_URL, DONNEES_STRUCTUREES_SITE } from "@/lib/site";
```

- [ ] **Step 2: Replace the metadata export**

Replace:

```tsx
export const metadata: Metadata = {
  title: "Soinely",
  description: "Le copilote des infirmiers libéraux",
};
```

with:

```tsx
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Soinely",
  description: "Le copilote des infirmiers libéraux",
  openGraph: {
    title: "Soinely",
    description: "Le copilote des infirmiers libéraux",
    url: SITE_URL,
    siteName: "Soinely",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};
```

(No `images` field in `openGraph` — Next.js auto-detects `app/opengraph-image.tsx`, from Task 4, and generates that tag itself. Without a dedicated `twitter-image` file, Next also reuses the same image for the Twitter card.)

- [ ] **Step 3: Add the JSON-LD script**

Replace:

```tsx
      <body className="min-h-full flex flex-col">
        <ActiverAppuiTactile />
        {children}
```

with:

```tsx
      <body className="min-h-full flex flex-col">
        {/* Contenu 100% statique (aucune donnee dynamique ni saisie
            utilisateur) : JSON.stringify ici ne pose pas de risque
            d'injection, contrairement a une interpolation de chaine. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(DONNEES_STRUCTUREES_SITE) }}
        />
        <ActiverAppuiTactile />
        {children}
```

- [ ] **Step 4: Verify the build**

Run: `npx tsc --noEmit`
Expected: no errors

Run: `npx next build`
Expected: build succeeds (Next validates the `Metadata` object's shape at build time — a malformed `metadataBase` or `openGraph` value fails the build)

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: all tests still pass (this task changes no component under test, only `app/layout.tsx`, which has no existing test file)

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(seo): enrichit le layout racine (metadataBase, Open Graph, Twitter, JSON-LD)"
```

---

### Task 6: Canonical URLs — `/`, `/conditions`, `/confidentialite`

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/conditions/page.tsx`
- Modify: `app/confidentialite/page.tsx`

**Interfaces:**
- Consumes: `SITE_URL` from `@/lib/site` (Task 1).

No dedicated test for this task — each `alternates.canonical` value is a static field on an already-exported `Metadata` object; `tsc` already validates the field's shape, and there is no behavior beyond the literal string to assert on. Verify with a build, not a new test file.

- [ ] **Step 1: Add canonical to `app/page.tsx`**

`app/page.tsx` currently has no `metadata` export. Add the import and the export, right after the existing imports and before `export default function Page()`:

```tsx
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
```

```tsx
export const metadata: Metadata = {
  alternates: { canonical: SITE_URL },
};
```

The full top of the file becomes:

```tsx
import type { Metadata } from "next";
import { EnTeteMarketing } from "@/components/marketing/EnTeteMarketing";
import { Hero } from "@/components/marketing/Hero";
import { Benefices } from "@/components/marketing/Benefices";
import { RangeeFonctionnalites } from "@/components/marketing/RangeeFonctionnalites";
import { JourneeAvecSoinely } from "@/components/marketing/JourneeAvecSoinely";
import { EnTempsReel } from "@/components/marketing/EnTempsReel";
import { SecuriteConfiance } from "@/components/marketing/SecuriteConfiance";
import { VideoDemo } from "@/components/marketing/VideoDemo";
import { ListeAttente } from "@/components/marketing/ListeAttente";
import { CtaFinal } from "@/components/marketing/CtaFinal";
import { PiedDePageMarketing } from "@/components/marketing/PiedDePageMarketing";
import { Reveal } from "@/components/marketing/Reveal";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: SITE_URL },
};

export default function Page() {
```

(Only the imports and the new `metadata` export are added — the rest of the file, including the whole `Page` function body, is unchanged.)

- [ ] **Step 2: Add canonical to `app/conditions/page.tsx`**

Replace:

```tsx
import type { Metadata } from "next";
import { PageLegale, type SectionLegale } from "@/components/legal/PageLegale";
import { DUREE_ESSAI_GRATUIT_JOURS } from "@/lib/data/abonnement";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation — Soinely",
  description: "Les règles d'utilisation du service Soinely, destiné aux infirmiers et infirmières libéraux.",
};
```

with:

```tsx
import type { Metadata } from "next";
import { PageLegale, type SectionLegale } from "@/components/legal/PageLegale";
import { DUREE_ESSAI_GRATUIT_JOURS } from "@/lib/data/abonnement";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation — Soinely",
  description: "Les règles d'utilisation du service Soinely, destiné aux infirmiers et infirmières libéraux.",
  alternates: { canonical: `${SITE_URL}/conditions` },
};
```

- [ ] **Step 3: Add canonical to `app/confidentialite/page.tsx`**

Replace:

```tsx
import type { Metadata } from "next";
import { PageLegale, type SectionLegale } from "@/components/legal/PageLegale";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Soinely",
  description: "Comment Soinely collecte, utilise et protège les données personnelles et les données de santé.",
};
```

with:

```tsx
import type { Metadata } from "next";
import { PageLegale, type SectionLegale } from "@/components/legal/PageLegale";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Soinely",
  description: "Comment Soinely collecte, utilise et protège les données personnelles et les données de santé.",
  alternates: { canonical: `${SITE_URL}/confidentialite` },
};
```

- [ ] **Step 4: Verify the build and the full test suite**

Run: `npx tsc --noEmit`
Expected: no errors

Run: `npx next build`
Expected: build succeeds

Run: `npx vitest run`
Expected: all tests pass (these 3 files have no existing dedicated test asserting on their `metadata` export's exact shape, so none needs updating)

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/conditions/page.tsx app/confidentialite/page.tsx
git commit -m "feat(seo): ajoute une URL canonique a chaque page publique"
```

---

## Post-plan note

This plan covers the P1 SEO item deferred from the landing-page P0 spec
(`docs/superpowers/specs/2026-08-09-landing-page-seo-p1-design.md`). FAQ,
Contact, and Mentions légales pages remain out of scope — they need real
content from the user, not something to fabricate. `/abonnement` and every
authenticated app route stay out of the sitemap and blocked from crawling,
per this plan's Global Constraints.
