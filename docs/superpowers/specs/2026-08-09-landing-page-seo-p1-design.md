# Landing page SEO (P1) — design

## Contexte

La passe P0 de la landing page (`docs/superpowers/specs/2026-08-09-landing-page-p0-design.md`)
a explicitement laissé de côté le SEO technique, marqué comme item P1 dans le
spec original ("indispensable avant bêta" couvrait la nav, les CTA, la
sécurité perçue — pas le référencement). Cette spec couvre ce P1 : sitemap,
robots.txt, Open Graph, JSON-LD, canonical.

Le site est en bêta privée (accès par liste d'attente), mais l'utilisateur a
choisi d'autoriser l'indexation dès maintenant plutôt que de la bloquer
jusqu'au lancement public — le statut "bêta privée" reste géré par le contenu
de la page (`ListeAttente`, `CtaFinal`), pas par un blocage technique.

## Périmètre

Rendre indexable et partageable correctement l'ensemble déjà construit lors
du P0 : `/`, `/conditions`, `/confidentialite`. Ne touche à aucune logique
métier, aucun composant visuel existant — uniquement des métadonnées et 4
nouveaux fichiers de convention Next.js (`sitemap.ts`, `robots.ts`,
`opengraph-image.tsx`) plus `lib/site.ts`.

## Hors périmètre (explicitement)

- FAQ, Contact, Mentions légales : nécessitent du contenu réel que
  l'utilisateur n'a pas encore fourni. Pas de page créée à sa place.
- `/abonnement` : volontairement exclu du sitemap, cohérent avec le retrait
  du lien "Tarifs" de la nav lors du P0 (décision utilisateur explicite).
  Reste crawlable si un lien externe y mène un jour ; simplement pas
  poussé activement.
- Aucune route de l'app authentifiée (`(app)`, `/tableau-de-bord`,
  `/compte`…) ne reçoit de métadonnées enrichies : elles sont exclues du
  sitemap et interdites au crawl via `robots.ts`.
- Pas de `title.template` au niveau du layout racine : `/conditions` et
  `/confidentialite` gèrent déjà leur propre titre complet ; introduire un
  template maintenant risquerait de les faire diverger sans bénéfice pour
  cette passe.

## Architecture

Une seule source de vérité pour le domaine : `lib/site.ts` exporte
`SITE_URL = "https://soinely.app"`, consommée par le layout racine, le
sitemap, robots.txt et le JSON-LD. Aucun autre fichier ne doit écrire ce
domaine en dur.

Le reste s'appuie exclusivement sur les conventions de fichiers de Next.js
(App Router) : `sitemap.ts`, `robots.ts`, `opengraph-image.tsx` sont
détectés et servis automatiquement, sans route manuelle à déclarer.

## Composants

### `lib/site.ts`

```ts
export const SITE_URL = "https://soinely.app";
```

### `app/layout.tsx`

Ajouts au `Metadata` existant (title/description conservés tels quels) :
- `metadataBase: new URL(SITE_URL)` — requis par Next pour résoudre les URLs
  d'image Open Graph en absolu.
- `openGraph`: titre, description, `siteName: "Soinely"`,
  `locale: "fr_FR"`, `type: "website"`, `url: SITE_URL`. Pas de champ
  `images` explicite — Next détecte automatiquement `opengraph-image.tsx`
  et génère la balise lui-même.
- `twitter: { card: "summary_large_image" }` — sans image dédiée, Next
  réutilise `opengraph-image.tsx` par défaut.
- Un `<script type="application/ld+json">` dans `<body>`, contenu JSON-LD
  statique (voir ci-dessous) sérialisé via `JSON.stringify` — jamais de
  donnée dynamique ou saisie utilisateur interpolée, donc pas de risque
  d'injection.

JSON-LD (deux objets `@type` distincts, un seul `<script>`, tableau
`@graph`) :

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "name": "Soinely",
      "url": "https://soinely.app",
      "logo": "https://soinely.app/logo-soinely.png",
      "description": "Le copilote des infirmiers libéraux."
    },
    {
      "@type": "WebSite",
      "name": "Soinely",
      "url": "https://soinely.app"
    }
  ]
}
```

Aucune note, aucun avis, aucun chiffre d'usage : uniquement les faits
d'identité de la marque, tous vérifiables dans le code (nom, domaine,
logo réellement servi depuis `public/logo-soinely.png`, description déjà
utilisée dans le layout).

### `app/opengraph-image.tsx`

Même technique que `app/icon.tsx` (déjà dans le dépôt) : `ImageResponse` de
`next/og`, JSX à styles inline uniquement (pas de classes Tailwind, non
supportées par le moteur de rendu Satori sous-jacent). Dimensions standard
1200×630. Fond dégradé violet de marque (mêmes teintes que les en-têtes
existants), la marque de cœur/croix de `LogoSoinely` reconstruite en SVG
inline (comme le fait déjà `icon.tsx`), "Soinely" en grand, tagline "Le
copilote des infirmiers libéraux" en dessous.

### `app/sitemap.ts`

```ts
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

### `app/robots.ts`

```ts
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

### Canonical, page par page

Trois pages reçoivent un `alternates.canonical` explicite et propre à
elles — jamais hérité du layout racine, pour ne jamais faire pointer une
page vers l'URL d'une autre par héritage silencieux :

- `app/page.tsx` — nouvel `export const metadata` (le fichier n'en a
  aujourd'hui aucun ; titre/description restent hérités du layout, seul
  `alternates.canonical: SITE_URL` est ajouté).
- `app/conditions/page.tsx` — ajoute `alternates.canonical` à
  l'`export const metadata` déjà présent, sans toucher au titre/description
  existants.
- `app/confidentialite/page.tsx` — même traitement.

## Erreurs

Aucun cas d'erreur à gérer : ces fichiers sont statiques (pas de données
externes, pas d'appel réseau, pas de dépendance à l'état de la requête).

## Tests

- `app/sitemap.test.ts` — appelle `sitemap()`, vérifie exactement 3 entrées,
  les bonnes URLs, et l'absence de `/abonnement`, `/login` ou toute route de
  `(app)`.
- `app/robots.test.ts` — appelle `robots()`, vérifie `allow: "/"`, vérifie
  que chaque route sensible listée ci-dessus apparaît dans `disallow`, et
  vérifie le champ `sitemap`.
- `app/opengraph-image.tsx` — pas de test, suivant le précédent déjà établi
  par `app/icon.tsx` et `app/apple-icon.tsx` dans ce dépôt (aucun test sur
  un rendu `ImageResponse` ailleurs dans le code).
- Pages avec `canonical` ajouté : pas de nouveau test dédié — la valeur est
  un champ statique d'un objet déjà exporté, sa présence n'a pas de
  comportement observable testable au-delà de la compilation TypeScript
  (le type `Metadata` de Next valide déjà la forme du champ).
