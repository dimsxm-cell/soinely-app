# Situation Terrain — liste/navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à une IDEL connectée de parcourir toutes les Situations Terrain publiées sans avoir à taper une recherche, via un nouvel écran `/situations`.

**Architecture:** Une fonction de lecture `getAllSituationsTerrain` ajoutée à `lib/data/recherche.ts` (fichier existant), un nouvel écran `/situations` réutilisant `CarteSituationTerrain` (déjà construit), un lien de navigation depuis Ma Journée dès cette première version.

**Tech Stack:** Next.js 16 (App Router, Server Components), Supabase (RLS existante, types générés), TypeScript strict, Vitest.

Spec complète : `docs/superpowers/specs/2026-07-15-situation-terrain-liste-design.md`.

## Global Constraints

- Aucune nouvelle migration, aucune nouvelle policy RLS — la policy
  existante `situations_terrain_select_published` couvre déjà cette
  lecture.
- **Aucune modification de `proxy.ts`** — confirmé : `PROTECTED_PATHS`
  contient déjà `"/situations"` et `config.matcher` contient déjà
  `"/situations/:path*"` (le pattern Next.js `:path*` couvre zéro ou
  plusieurs segments, donc la route bare `/situations` est déjà protégée
  par l'entrée existante ajoutée pour `/situations/[id]`). Ne pas toucher
  ce fichier.
- Pas de filtre par spécialité, pas de pagination — hors scope pour cette
  v1.
- Utiliser le type `SupabaseClient<Database>` (types générés désormais
  disponibles dans `lib/types/database.types.ts`) pour toute nouvelle
  fonction de la couche données — ne pas revenir à un `SupabaseClient`
  non typé.
- Ce repo traite `@typescript-eslint/no-explicit-any` comme une erreur.
- **`npm run build` est une étape obligatoire** dans chaque tâche, pas
  seulement ESLint/Vitest — un précédent chantier a montré qu'ESLint ne
  détecte pas les erreurs de type TypeScript que seul `next build`
  attrape.

---

### Task 1: Couche données — getAllSituationsTerrain

**Files:**
- Modify: `lib/data/recherche.ts`
- Modify: `lib/data/recherche.test.ts`

**Interfaces:**
- Produces : `getAllSituationsTerrain(supabase: SupabaseClient<Database>): Promise<SituationTerrain[]>`,
  consommée par la Tâche 2.

- [ ] **Step 1: Écrire les tests (échouent d'abord)**

Ajouter à `lib/data/recherche.test.ts`, après le `describe("getSituationTerrainDetail", ...)` existant :

```ts
describe("getAllSituationsTerrain", () => {
  it("retourne toutes les situations publiées, mappées et triées par titre", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () =>
              Promise.resolve({
                data: [
                  {
                    id: "s1",
                    titre: "Hypoglycémie chez un patient diabétique",
                    observation: "Sueurs, tremblements.",
                    verifications: ["Mesurer la glycémie"],
                    causes_possibles: ["Insuline surdosée"],
                    conduite_a_tenir: ["Resucrage oral"],
                    quand_avis_medical: "Si la glycémie reste basse.",
                    sources: ["HAS"],
                    specialite: "idel",
                    niveau_confiance: "valide",
                    version: 1,
                    published: true,
                  },
                ],
                error: null,
              }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getAllSituationsTerrain } = await import("./recherche");
    const result = await getAllSituationsTerrain(fakeClient);

    expect(result).toEqual([
      {
        id: "s1",
        titre: "Hypoglycémie chez un patient diabétique",
        observation: "Sueurs, tremblements.",
        verifications: ["Mesurer la glycémie"],
        causesPossibles: ["Insuline surdosée"],
        conduiteATenir: ["Resucrage oral"],
        quandAvisMedical: "Si la glycémie reste basse.",
        sources: ["HAS"],
        specialite: "idel",
        niveauConfiance: "valide",
        version: 1,
        published: true,
      },
    ]);
  });

  it("retourne un tableau vide en cas d'erreur", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: null, error: { message: "boom" } }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getAllSituationsTerrain } = await import("./recherche");
    const result = await getAllSituationsTerrain(fakeClient);

    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npx vitest run lib/data/recherche.test.ts`
Expected: FAIL — `getAllSituationsTerrain` n'existe pas encore.

- [ ] **Step 3: Implémenter**

Ajouter à `lib/data/recherche.ts`, après `getSituationTerrainDetail` :

```ts
export async function getAllSituationsTerrain(
  supabase: SupabaseClient<Database>
): Promise<SituationTerrain[]> {
  const { data, error } = await supabase
    .from("situations_terrain")
    .select("*")
    .eq("published", true)
    .order("titre");

  if (error || !data) return [];

  return data.map(mapSituationTerrain);
}
```

Aucun nouvel import n'est nécessaire — `SupabaseClient`, `Database`,
`SituationTerrain` et `mapSituationTerrain` sont déjà importés/définis
dans ce fichier.

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run lib/data/recherche.test.ts`
Expected: PASS (8 tests : 6 existants + 2 nouveaux)

- [ ] **Step 5: Vérifier la compilation et le lint**

Run: `npm run build`
Expected: PASS (0 erreur TypeScript)

Run: `npx eslint lib/data/recherche.ts`
Expected: PASS (0 erreur)

- [ ] **Step 6: Commit**

```bash
git add lib/data/recherche.ts lib/data/recherche.test.ts
git commit -m "feat(situations): getAllSituationsTerrain"
```

---

### Task 2: Écran `/situations` + navigation

**Files:**
- Create: `app/situations/page.tsx`
- Modify: `app/ma-journee/page.tsx`

**Interfaces:**
- Consomme : `getAllSituationsTerrain` (Tâche 1), `createClient`
  (`lib/supabase/server.ts`), `CarteSituationTerrain`
  (`components/ui/CarteSituationTerrain.tsx`, déjà existant, inchangé).

Ce fichier `app/situations/page.tsx` coexiste avec
`app/situations/[id]/page.tsx` (déjà existant) — Next.js App Router
supporte un `page.tsx` au niveau d'un segment en plus d'un sous-dossier
dynamique `[id]/page.tsx` du même segment, sans conflit.

- [ ] **Step 1: Créer l'écran liste**

Créer `app/situations/page.tsx` :

```tsx
import { createClient } from "@/lib/supabase/server";
import { getAllSituationsTerrain } from "@/lib/data/recherche";
import { CarteSituationTerrain } from "@/components/ui/CarteSituationTerrain";

export default async function SituationsPage() {
  const supabase = await createClient();
  const situations = await getAllSituationsTerrain(supabase);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-navy">Situations Terrain</h1>

      {situations.length > 0 ? (
        <div className="flex flex-col gap-4">
          {situations.map((situation) => (
            <CarteSituationTerrain key={situation.id} situation={situation} />
          ))}
        </div>
      ) : (
        <p className="text-navy/60">Aucune situation disponible pour le moment.</p>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Ajouter le lien de navigation sur Ma Journée**

Modifier `app/ma-journee/page.tsx` — dans le `<div className="flex gap-4">`
existant contenant les boutons "Rechercher" et "Copilote", ajouter un
troisième lien juste après "Copilote" :

```tsx
<Link href="/situations">
  <Button variant="secondary">Parcourir</Button>
</Link>
```

Le résultat final de ce bloc doit être :

```tsx
<div className="flex gap-4">
  <Link href="/recherche">
    <Button variant="secondary">Rechercher</Button>
  </Link>
  <Link href="/copilote">
    <Button variant="secondary">Copilote</Button>
  </Link>
  <Link href="/situations">
    <Button variant="secondary">Parcourir</Button>
  </Link>
</div>
```

Ne rien changer d'autre dans ce fichier — la grille de statistiques, la
liste des missions et tous les messages d'état vide restent inchangés.

- [ ] **Step 3: Vérifier la compilation et le lint**

Run: `npm run build`
Expected: PASS (0 erreur TypeScript)

Run: `npx eslint app/situations/page.tsx app/ma-journee/page.tsx`
Expected: PASS (0 erreur)

- [ ] **Step 4: Lancer la suite complète**

Run: `npm test` (ou la commande équivalente de ce projet)
Expected: PASS (tous les tests existants + les nouveaux de la Tâche 1,
aucune régression)

- [ ] **Step 5: Commit**

```bash
git add app/situations/page.tsx app/ma-journee/page.tsx
git commit -m "feat(situations): écran /situations + navigation depuis Ma Journée"
```

- [ ] **Step 6: Vérification manuelle post-déploiement (contrôleur, automatique)**

Après fusion et déploiement, le contrôleur vérifie via une requête
authentifiée que `/situations` renverrait bien les 2 Situations Terrain
publiées actuellement en base ("Hypoglycémie chez un patient diabétique",
"Pansement qui saigne de façon inhabituelle"), triées alphabétiquement.

---

## Résultat à la fin de ce plan

Une IDEL connectée peut désormais parcourir l'ensemble des Situations
Terrain publiées depuis un écran dédié, accessible directement depuis Ma
Journée — sans avoir besoin de formuler une recherche pour découvrir le
contenu disponible.
