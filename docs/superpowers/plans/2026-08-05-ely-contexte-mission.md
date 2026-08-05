# Ely — Conscience du contexte de mission — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Depuis la fiche d'une mission, un lien "Demander à Ely" ouvre le chat avec un rappel visuel du patient et du type de soin — sans pré-remplir la question ni changer le comportement de recherche.

**Architecture:** Un paramètre d'URL (`?patient=...&soin=...`) transporte le contexte de `ma-journee/[missionId]/page.tsx` vers `/ely`, qui le transmet à `ConversationEly` via deux props optionnelles. `ConversationEly` affiche un petit rappel textuel sous son en-tête quand `patientContexte` est fourni.

**Tech Stack:** React 19 / Next.js (App Router), TypeScript, Tailwind, Vitest + Testing Library.

## Global Constraints

- Affichage seul : aucun pré-remplissage du champ de question, aucun changement du moteur de recherche (spec : `docs/superpowers/specs/2026-08-05-ely-contexte-mission-design.md`).
- Comportement par défaut inchangé quand `patient`/`soin` sont absents de l'URL.
- Transport par paramètres d'URL directs (`patient`, `soin`), pas par `missionId` — pas de lookup serveur supplémentaire côté `/ely`.
- Ne pas modifier le moteur de recherche (`lib/data/recherche.ts`, `lib/data/ely-actions.ts`).

---

### Task 1: Contexte de mission dans le chat Ely, de bout en bout

**Files:**
- Modify: `components/ui/ConversationEly.tsx:46-51` (props), `components/ui/ConversationEly.tsx:134-168` (rendu de l'en-tête)
- Modify: `app/(app)/ely/page.tsx` (fichier entier, 27 lignes — lit et transmet les nouveaux paramètres)
- Modify: `app/(app)/ma-journee/[missionId]/page.tsx:418-430` (ajoute le lien d'entrée)
- Modify: `vitest.setup.ts` (ajoute un stub `scrollIntoView`, nécessaire pour tester `ConversationEly`)
- Test: `components/ui/ConversationEly.test.tsx` (nouveau)

**Interfaces:**
- Consumes: `MissionDetail` (`lib/types/clinical.ts:117`, hérite de `MissionDuJour` à la ligne 81 qui porte `patientNom: string` et `typeSoin: string`) — déjà chargé par `getMissionDetail`, aucune donnée nouvelle à récupérer.
- Produces: `ConversationEly` gagne deux props optionnelles `patientContexte?: string | null` et `soinContexte?: string | null` — interface stable, rien d'autre n'en dépend dans ce plan.

- [ ] **Step 1: Écrire le test (échoue pour l'instant)**

`ConversationEly` n'a pas encore de fichier de test sur cette branche.
Comme le composant appelle `ancreScroll.current?.scrollIntoView(...)`
dans un `useEffect` qui se déclenche au montage, et que jsdom ne fournit
pas `scrollIntoView`, le stub doit être ajouté à `vitest.setup.ts` (pas
dans le fichier de test lui-même — c'est l'endroit correct, déjà établi
dans ce projet pour ce type de lacune jsdom, voir le stub
`IntersectionObserver` juste au-dessus dans le même fichier).

Dans `vitest.setup.ts`, ajouter après le bloc `IntersectionObserver`
existant :

```ts
// jsdom ne fournit pas scrollIntoView ; utilisé par les composants qui
// font défiler automatiquement vers un ancrage (ex. ConversationEly).
Element.prototype.scrollIntoView = vi.fn();
```

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

describe("ConversationEly — contexte de mission", () => {
  it("affiche le patient et le soin quand les deux sont fournis", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(
      <ConversationEly
        requeteInitiale=""
        situationInitiale={null}
        patientContexte="Marie Dupont"
        soinContexte="Pansement"
      />
    );

    expect(screen.getByText("Pour Marie Dupont · Pansement")).toBeInTheDocument();
  });

  it("affiche le patient seul sans point médian quand soinContexte est absent", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(
      <ConversationEly requeteInitiale="" situationInitiale={null} patientContexte="Marie Dupont" />
    );

    expect(screen.getByText("Pour Marie Dupont")).toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });

  it("n'affiche aucun rappel quand patientContexte est absent (comportement par défaut)", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(<ConversationEly requeteInitiale="" situationInitiale={null} />);

    expect(screen.queryByText(/^Pour /)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run components/ui/ConversationEly.test.tsx`
Expected: les deux premiers tests FAIL (le texte "Pour Marie Dupont..."
n'existe nulle part encore) ; le troisième passe déjà (comportement par
défaut déjà correct aujourd'hui, rien à afficher).

- [ ] **Step 3: Ajouter les props et le rendu du rappel dans `ConversationEly.tsx`**

Remplacer l'interface de props (ligne ~46-51) :

Avant :
```tsx
interface ConversationElyProps {
  requeteInitiale: string;
  situationInitiale: SituationTerrain | null;
}

export function ConversationEly({ requeteInitiale, situationInitiale }: ConversationElyProps) {
```

Après :
```tsx
interface ConversationElyProps {
  requeteInitiale: string;
  situationInitiale: SituationTerrain | null;
  patientContexte?: string | null;
  soinContexte?: string | null;
}

export function ConversationEly({
  requeteInitiale,
  situationInitiale,
  patientContexte,
  soinContexte,
}: ConversationElyProps) {
```

Puis, juste après le `</div>` qui ferme le bloc d'en-tête existant
(ligne ~168, celui qui contient "ELY" et le bouton nouvelle conversation) :

Avant :
```tsx
        )}
      </div>

      <div className="py-6">
```

Après :
```tsx
        )}
      </div>

      {patientContexte && (
        <p className="mt-3 text-[13px] font-semibold text-navy/55">
          Pour {patientContexte}
          {soinContexte ? ` · ${soinContexte}` : ""}
        </p>
      )}

      <div className="py-6">
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

Run: `npx vitest run components/ui/ConversationEly.test.tsx`
Expected: PASS (3/3)

- [ ] **Step 5: Transmettre les paramètres dans `app/(app)/ely/page.tsx`**

Remplacer le fichier entier :

```tsx
import { createClient } from "@/lib/supabase/server";
import { searchSituationsTerrain } from "@/lib/data/recherche";
import { ConversationEly } from "@/components/ui/ConversationEly";
import { PersistanceRecherche } from "@/components/ui/PersistanceRecherche";

export default async function ElyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; patient?: string; soin?: string }>;
}) {
  const { q, patient, soin } = await searchParams;
  const query = q ?? "";

  const supabase = await createClient();
  const results = query.trim() ? await searchSituationsTerrain(supabase, query) : [];
  const situationInitiale = results[0] ?? null;

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <PersistanceRecherche cle="ely_derniere_requete" requeteActuelle={query} />
      <div className="mx-auto flex max-w-2xl flex-col px-6 py-6 sm:py-8">
        <ConversationEly
          requeteInitiale={query}
          situationInitiale={situationInitiale}
          patientContexte={patient ?? null}
          soinContexte={soin ?? null}
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Ajouter le lien d'entrée dans `ma-journee/[missionId]/page.tsx`**

Repérer le bloc "Dossier du patient" existant (~ligne 418-430) :

Avant :
```tsx
          <Link
            href={`/patients/${mission.patient.id}`}
            className="row-lift flex items-center justify-between rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)]"
          >
            <span className="text-[15px] font-semibold text-navy">Voir la fiche du patient</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[19px] w-[19px] shrink-0 text-navy/25">
              <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
```

Après (ajoute le nouveau lien juste après le premier, avant la fermeture
du `</div>` englobant) :
```tsx
          <Link
            href={`/patients/${mission.patient.id}`}
            className="row-lift flex items-center justify-between rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)]"
          >
            <span className="text-[15px] font-semibold text-navy">Voir la fiche du patient</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[19px] w-[19px] shrink-0 text-navy/25">
              <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link
            href={`/ely?patient=${encodeURIComponent(mission.patientNom)}&soin=${encodeURIComponent(mission.typeSoin)}`}
            className="row-lift mt-2.5 flex items-center justify-between rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)]"
          >
            <span className="text-[15px] font-semibold text-navy">Demander à Ely</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[19px] w-[19px] shrink-0 text-navy/25">
              <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
```

- [ ] **Step 7: Lancer la suite complète, le lint et le typecheck**

Run: `npx vitest run`
Expected: PASS (tous les fichiers, y compris le nouveau)

Run: `npx eslint components/ui/ConversationEly.tsx "app/(app)/ely/page.tsx" "app/(app)/ma-journee/[missionId]/page.tsx" vitest.setup.ts components/ui/ConversationEly.test.tsx`
Expected: aucune erreur

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: aucune nouvelle erreur (des erreurs préexistantes sans rapport peuvent apparaître dans `.next/types/validator.ts`, un artefact de build gitignoré — les ignorer si présentes)

- [ ] **Step 8: Commit**

```bash
git add components/ui/ConversationEly.tsx components/ui/ConversationEly.test.tsx "app/(app)/ely/page.tsx" "app/(app)/ma-journee/[missionId]/page.tsx" vitest.setup.ts
git commit -m "feat(ely): affiche le contexte de mission (patient, soin) dans le chat"
```

## Vérification manuelle (hors suite automatisée)

Sur `/ma-journee` (authentifié), ouvrir une mission du jour, cliquer
"Demander à Ely" (à côté de "Voir la fiche du patient"), confirmer que le
rappel "Pour [Patient] · [Soin]" s'affiche sous l'en-tête et que le champ
de question reste vide. Poser une question, confirmer que la réponse
fonctionne normalement. Cliquer "Nouvelle conversation", confirmer que le
rappel disparaît. Naviguer vers `/ely` par un autre chemin (onglet de
navigation) et confirmer qu'aucun rappel ne s'affiche.

## Note pour la fusion

Une autre branche (`worktree-ely-badge-fiabilite`, PR #49, non fusionnée)
crée aussi `components/ui/ConversationEly.test.tsx` comme nouveau fichier,
pour une fonctionnalité différente (badge de fiabilité). Les deux branches
ajoutant le même chemin de fichier, un conflit de fusion est attendu à
l'intégration de la seconde des deux PR — résolution attendue : combiner
les cas de test des deux fichiers, pas en écraser un par l'autre.
