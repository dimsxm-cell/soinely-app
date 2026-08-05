# Badge de fiabilité dans le chat Ely — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher le badge `BadgeNiveauConfiance` (Brouillon / Relu / Validé) au-dessus du titre de chaque réponse d'Ely dans `ConversationEly.tsx`.

**Architecture:** Ajout d'un seul élément JSX dans la branche `message.situation` existante de `ConversationEly.tsx`, réutilisant `BadgeNiveauConfiance` sans le modifier. Aucune donnée nouvelle : `niveauConfiance` est déjà porté par `SituationTerrain`.

**Tech Stack:** React 19 / Next.js (App Router), TypeScript, Tailwind, Vitest + Testing Library.

## Global Constraints

- Badge seul, aucun texte d'avertissement supplémentaire (spec : `docs/superpowers/specs/2026-08-05-ely-badge-fiabilite-design.md`).
- Position : au-dessus du titre, sur sa propre ligne (pas en ligne avec le titre).
- Ne pas modifier `BadgeNiveauConfiance.tsx` ni la recherche (`lib/data/recherche.ts`, `lib/data/ely-actions.ts`) — chantier d'affichage pur.

---

### Task 1: Badge de fiabilité dans la bulle de réponse d'Ely

**Files:**
- Modify: `components/ui/ConversationEly.tsx:1-10` (imports), `components/ui/ConversationEly.tsx:226-229` (bulle de réponse)
- Test: `components/ui/ConversationEly.test.tsx` (nouveau)

**Interfaces:**
- Consumes: `BadgeNiveauConfiance` (`components/ui/BadgeNiveauConfiance.tsx`), props `{ niveau: NiveauConfiance }` — composant déjà existant, ne pas le modifier. `SituationTerrain` (`lib/types/clinical.ts`) — déjà porte `niveauConfiance`.
- Produces: rien de consommé par d'autres tâches — chantier autonome.

- [ ] **Step 1: Écrire le test (échoue pour l'instant)**

Le composant `ConversationEly` a besoin d'un mock de `next/navigation`
(`useRouter`) car il appelle `router.push`/`router.replace`. Aucun autre
mock n'est nécessaire : `lireSupportVocalClient()` et
`lireSupportSyntheseClient()` (utilisés respectivement pour le bouton micro
et `LectureVocaleReponse`) renvoient `false` par défaut dans jsdom (pas de
`window.SpeechRecognition` ni `window.speechSynthesis`), donc ces
sous-parties ne se rendent simplement pas — pas besoin de les mocker.

Créer `components/ui/ConversationEly.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SituationTerrain } from "@/lib/types/clinical";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

function situation(overrides: Partial<SituationTerrain> = {}): SituationTerrain {
  return {
    id: "s1",
    titre: "Hypoglycémie",
    observation: "Le patient présente des sueurs et des tremblements.",
    verifications: [],
    causesPossibles: [],
    conduiteATenir: ["Resucrage immédiat"],
    quandAvisMedical: "Si pas d'amélioration en 15 minutes.",
    sources: [],
    specialite: "Diabétologie",
    niveauConfiance: "valide",
    version: 1,
    published: true,
    ...overrides,
  };
}

describe("ConversationEly", () => {
  it("affiche le badge Brouillon pour une situation non relue", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(
      <ConversationEly
        requeteInitiale="arrêt cardio-respiratoire"
        situationInitiale={situation({ niveauConfiance: "brouillon" })}
      />
    );

    expect(screen.getByText("Brouillon")).toBeInTheDocument();
  });

  it("affiche le badge Validé pour une situation relue et validée", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(
      <ConversationEly
        requeteInitiale="hypoglycémie"
        situationInitiale={situation({ niveauConfiance: "valide" })}
      />
    );

    expect(screen.getByText("Validé")).toBeInTheDocument();
  });

  it("n'affiche aucun badge quand aucune situation n'est trouvée", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(<ConversationEly requeteInitiale="question sans réponse" situationInitiale={null} />);

    expect(screen.queryByText("Brouillon")).not.toBeInTheDocument();
    expect(screen.queryByText("Relu")).not.toBeInTheDocument();
    expect(screen.queryByText("Validé")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run components/ui/ConversationEly.test.tsx`
Expected: les deux premiers tests FAIL (`Unable to find an element with the text: Brouillon` / `Validé`) — le troisième passe déjà (il n'y a pas encore de badge nulle part, ce qui est le comportement attendu pour ce cas).

- [ ] **Step 3: Ajouter l'import**

Dans `components/ui/ConversationEly.tsx`, à côté des autres imports de
composants `ui/` (juste après l'import de `IconeMicro`, ligne 9) :

```tsx
import { BadgeNiveauConfiance } from "@/components/ui/BadgeNiveauConfiance";
```

- [ ] **Step 4: Insérer le badge au-dessus du titre**

Dans `components/ui/ConversationEly.tsx`, la branche `message.situation ?`
de la bulle de réponse (repérer le texte exact ci-dessous, ~ligne 226) :

Avant :
```tsx
                    {message.situation ? (
                      <>
                        <p className="text-[14.5px] font-bold tracking-tight text-brand-violet">{message.situation.titre}</p>
```

Après :
```tsx
                    {message.situation ? (
                      <>
                        <BadgeNiveauConfiance niveau={message.situation.niveauConfiance} />
                        <p className="mt-1.5 text-[14.5px] font-bold tracking-tight text-brand-violet">{message.situation.titre}</p>
```

(Le `mt-1.5` déplacé sur le `<p>` du titre remplace l'absence de marge
précédente entre le haut de la bulle et le titre — désormais entre le badge
et le titre.)

- [ ] **Step 5: Lancer le test, vérifier qu'il passe**

Run: `npx vitest run components/ui/ConversationEly.test.tsx`
Expected: PASS (3/3)

- [ ] **Step 6: Lancer la suite complète et le lint**

Run: `npx vitest run`
Expected: PASS (tous les fichiers, y compris le nouveau)

Run: `npx eslint components/ui/ConversationEly.tsx components/ui/ConversationEly.test.tsx`
Expected: aucune erreur

- [ ] **Step 7: Commit**

```bash
git add components/ui/ConversationEly.tsx components/ui/ConversationEly.test.tsx
git commit -m "feat(ely): affiche le badge de fiabilite dans le chat"
```

## Vérification manuelle (hors suite automatisée)

Sur `/ely` (authentifié), poser une question qui matche une situation
`"brouillon"` (ex. "arrêt cardio-respiratoire") puis une qui matche une
situation `"valide"` (ex. "hypoglycémie") ; confirmer visuellement la
présence et la couleur du badge dans les deux cas, au-dessus du titre.
