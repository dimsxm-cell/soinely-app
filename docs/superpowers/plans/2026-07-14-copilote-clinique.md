# Copilote Clinique (v1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner à une IDEL connectée un point d'entrée "poser une question" qui met en avant un résultat principal comme réponse, en réutilisant intégralement le moteur de recherche de Recherche Intelligente.

**Architecture:** Aucune nouvelle donnée, aucune nouvelle dépendance. Un nouvel écran `/copilote` appelle `searchSituationsTerrain` (déjà en production) et présente le premier résultat via un nouveau composant "réponse" mis en avant, les résultats suivants via le composant de liste déjà existant.

**Tech Stack:** Next.js 16 (App Router, Server Components), Supabase (aucun changement de schéma), TypeScript strict, Vitest, Playwright.

Ce plan suppose Recherche Intelligente déjà en production (voir
`docs/superpowers/plans/2026-07-14-recherche-intelligente.md`) : la fonction
RPC `search_situations_terrain`, `lib/data/recherche.ts`, `CarteSituationTerrain`,
`/situations/[id]`, et la protection de route dans `proxy.ts` sont réutilisés
tels quels, sans modification.

Spec complète : `docs/superpowers/specs/2026-07-14-copilote-clinique-design.md`.

## Global Constraints

- Aucun appel LLM, aucune génération de texte clinique par IA — le Copilote
  ne renvoie que du contenu déjà validé (`niveau_confiance = 'valide'`,
  `published = true`), via `searchSituationsTerrain` inchangée.
- Aucune nouvelle policy RLS, aucune nouvelle migration — ce chantier ne
  touche pas la base de données.
- Next.js 16 : `searchParams` est une `Promise` dans les Server Components —
  toujours `await` avant utilisation.
- Client Supabase serveur : `await createClient()`.
- Style Tailwind v4 : tokens `@theme` existants uniquement (`bg-navy`,
  `text-navy`, `bg-primary`, `text-primary`, `rounded-card`). Grille
  d'espacement stricte en multiples de 8px. Pour la mise en avant visuelle
  de la carte-réponse, réutiliser le même procédé que la section "avis
  médical" de `/situations/[id]` (teinte de fond/bordure à faible opacité —
  `bg-primary/5`, `border-primary/30` — texte qui reste `text-navy`/
  `text-primary`, jamais une nouvelle combinaison de contraste).
- `lang="fr"` déjà en place — toutes les nouvelles pages sont en français.
- Aucun usage de `service_role` dans le code applicatif.
- Pattern couche données établi : ce chantier ne crée aucune nouvelle
  fonction de données — il consomme `searchSituationsTerrain` telle
  qu'exportée par `lib/data/recherche.ts`.

---

### Task 1: Composant CarteReponse

**Files:**
- Create: `components/ui/CarteReponse.tsx`
- Test: `components/ui/CarteReponse.test.tsx`

**Interfaces:**
- Consomme : le type `SituationTerrain` (`lib/types/clinical.ts`), `Button`
  (`components/ui/Button.tsx`).
- Produces : composant `CarteReponse`, consommé par la Tâche 2.

- [ ] **Step 1: Écrire les tests (échouent d'abord)**

Créer `components/ui/CarteReponse.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CarteReponse } from "./CarteReponse";
import type { SituationTerrain } from "@/lib/types/clinical";

const situation: SituationTerrain = {
  id: "s1",
  titre: "Hypoglycémie chez un patient diabétique",
  observation: "Le patient présente des sueurs, des tremblements et une confusion légère.",
  verifications: [],
  causesPossibles: [],
  conduiteATenir: [
    "Resucrage oral si conscient (15g de sucre)",
    "Recontrôler la glycémie 15 min après",
    "Ne jamais resucrer un patient inconscient par voie orale",
  ],
  quandAvisMedical: "",
  sources: [],
  specialite: "idel",
  niveauConfiance: "valide",
  version: 1,
  published: true,
};

describe("CarteReponse", () => {
  it("affiche le titre, l'observation, un aperçu de la conduite à tenir et un lien vers la fiche complète", () => {
    render(<CarteReponse situation={situation} />);

    expect(screen.getByText(situation.titre)).toBeInTheDocument();
    expect(screen.getByText(/sueurs, des tremblements/)).toBeInTheDocument();
    expect(
      screen.getByText("Resucrage oral si conscient (15g de sucre)")
    ).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/situations/s1");
  });

  it("n'affiche pas de liste si conduiteATenir est vide", () => {
    render(<CarteReponse situation={{ ...situation, conduiteATenir: [] }} />);

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npx vitest run components/ui/CarteReponse.test.tsx`
Expected: FAIL — `./CarteReponse` n'existe pas encore.

- [ ] **Step 3: Implémenter**

Créer `components/ui/CarteReponse.tsx` :

```tsx
import Link from "next/link";
import type { SituationTerrain } from "@/lib/types/clinical";
import { Button } from "@/components/ui/Button";

interface CarteReponseProps {
  situation: SituationTerrain;
}

export function CarteReponse({ situation }: CarteReponseProps) {
  const apercu = situation.conduiteATenir.slice(0, 3);

  return (
    <div className="rounded-card border border-primary/30 bg-primary/5 p-6">
      <p className="text-sm font-medium text-primary">Réponse la plus proche</p>
      <h2 className="mt-2 text-xl font-semibold text-navy">{situation.titre}</h2>
      <p className="mt-2 text-navy/80">{situation.observation}</p>
      {apercu.length > 0 && (
        <ul className="mt-4 list-disc pl-6 text-navy/80">
          {apercu.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      <Link href={`/situations/${situation.id}`} className="mt-4 inline-block">
        <Button variant="secondary">Voir la fiche complète</Button>
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run components/ui/CarteReponse.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add components/ui/CarteReponse.tsx components/ui/CarteReponse.test.tsx
git commit -m "feat(copilote): composant CarteReponse"
```

---

### Task 2: Écran `/copilote`

**Files:**
- Create: `app/copilote/page.tsx`
- Modify: `proxy.ts`

**Interfaces:**
- Consomme : `searchSituationsTerrain` (`lib/data/recherche.ts`, inchangée),
  `createClient` (`lib/supabase/server.ts`), `CarteReponse` (Tâche 1),
  `CarteSituationTerrain` (déjà existant, `components/ui/CarteSituationTerrain.tsx`),
  `Button` (`components/ui/Button.tsx`).

- [ ] **Step 1: Créer la page**

Créer `app/copilote/page.tsx` :

```tsx
import { createClient } from "@/lib/supabase/server";
import { searchSituationsTerrain } from "@/lib/data/recherche";
import { CarteReponse } from "@/components/ui/CarteReponse";
import { CarteSituationTerrain } from "@/components/ui/CarteSituationTerrain";
import { Button } from "@/components/ui/Button";

export default async function CopilotePage({
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
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-navy">Copilote Clinique</h1>

      <form method="GET" className="flex gap-4">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Ex. : le patient a une plaie qui s'infecte, que faire ?"
          aria-label="Poser une question clinique"
          className="min-h-[44px] flex-1 rounded-card border border-navy/20 px-4 py-2 text-navy"
        />
        <Button type="submit">Demander</Button>
      </form>

      {query.trim() && results.length === 0 && (
        <p className="text-navy/70">
          Je n&apos;ai pas trouvé de réponse à cette question. Essayez de la reformuler.
        </p>
      )}

      {reponse && <CarteReponse situation={reponse} />}

      {autres.length > 0 && (
        <div className="flex flex-col gap-4">
          {autres.map((situation) => (
            <CarteSituationTerrain key={situation.id} situation={situation} />
          ))}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Protéger la route dans `proxy.ts`**

Dans `proxy.ts`, modifier :

```ts
const PROTECTED_PATHS = ["/ma-journee", "/recherche", "/situations", "/copilote"];
```

et :

```ts
export const config = {
  matcher: [
    "/ma-journee/:path*",
    "/recherche/:path*",
    "/situations/:path*",
    "/copilote/:path*",
  ],
};
```

- [ ] **Step 3: Vérifier la compilation et le lint**

Run: `npm run build`
Expected: PASS (0 erreur TypeScript)

Run: `npx eslint app/copilote/page.tsx proxy.ts`
Expected: PASS (0 erreur — en particulier, aucun `any` explicite)

- [ ] **Step 4: Commit**

```bash
git add app/copilote proxy.ts
git commit -m "feat(copilote): écran /copilote"
```

---

### Task 3: Tests e2e + vérification manuelle

**Files:**
- Create: `e2e/copilote.spec.ts`

**Interfaces:**
- Consomme : la route `/copilote` (Tâche 2), le pattern Playwright existant
  (`e2e/recherche.spec.ts`, `playwright.config.ts`).

Comme pour Recherche Intelligente, aucun compte de test n'est câblé en CI —
le test automatisé couvre uniquement la redirection non-authentifiée ; la
vérification en conditions réelles (question posée, réponse mise en avant)
est faite manuellement par le contrôleur après déploiement.

- [ ] **Step 1: Écrire le test**

Créer `e2e/copilote.spec.ts` :

```ts
import { test, expect } from "@playwright/test";

test("redirige /copilote vers /login", async ({ page }) => {
  await page.goto("/copilote");
  await expect(page).toHaveURL(/\/login/);
});
```

- [ ] **Step 2: Lancer le test**

Run: `npx playwright test e2e/copilote.spec.ts`
Expected: PASS (1 test)

- [ ] **Step 3: Commit**

```bash
git add e2e/copilote.spec.ts
git commit -m "test(e2e): redirection non-authentifiée pour /copilote"
```

- [ ] **Step 4: Vérification manuelle post-déploiement (contrôleur, avec autorisation)**

Après fusion et déploiement, le contrôleur se connecte avec le compte IDEL
de test et vérifie dans l'application déployée :
- `/copilote?q=le patient a une plaie qui s'infecte, que faire` met en avant
  une situation pertinente comme "réponse" (probablement liée aux
  situations existantes selon leur contenu réel).
- Le bouton "Voir la fiche complète" mène bien à `/situations/[id]` avec le
  contenu attendu.
- Une question sans correspondance affiche « Je n'ai pas trouvé de réponse
  à cette question. Essayez de la reformuler. » sans erreur.
- Le champ vide au chargement initial n'affiche ni erreur ni message.

---

## Résultat à la fin de ce plan

Une IDEL connectée peut poser une question clinique en langage courant sur
`/copilote` et voir immédiatement la situation la plus pertinente mise en
avant comme réponse, avec un accès direct à sa fiche complète — sans
nouvelle dépendance, sans nouveau risque de contenu halluciné, en
réutilisant entièrement l'infrastructure de recherche déjà en production.
La conscience contextuelle (mission en cours) reste un chantier futur, une
fois l'écran de liste des missions du jour construit.
