# Copilote contextuel v2 (mission actuelle) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher un lien "Contexte clinique" sur la carte de la mission `en_cours` de l'IDEL, menant directement au protocole clinique lié si disponible, sinon vers une recherche pré-remplie avec le type de soin.

**Architecture:** Une fonction de lecture `getMissionEnCoursHref` (jointure imbriquée Supabase, aucune nouvelle table) résout le lien approprié ; `CarteMission` reçoit ce lien en prop optionnelle et l'affiche uniquement sur la mission concernée.

**Tech Stack:** Next.js 16 (App Router, Server Components), Supabase (jointure imbriquée sur relation FK existante), TypeScript strict, Vitest.

Spec complète : `docs/superpowers/specs/2026-07-15-copilote-contextuel-design.md`.

## Global Constraints

- Aucune nouvelle table, aucune nouvelle migration, aucune nouvelle policy
  RLS — la relation `missions_du_jour.mission_clinique_id → missions_cliniques.id`
  existe déjà, et la policy `missions_du_jour_owner_all` couvre déjà cette
  lecture.
- Le lien "Contexte clinique" n'apparaît que sur la mission `en_cours` —
  jamais sur les missions "à faire" ou "terminée".
- Si `situation_terrain_id` n'est pas résolu (pas de `mission_clinique_id`,
  ou `missions_cliniques.situation_terrain_id` est `null`), replier sur
  `/copilote?q={type_soin}` — jamais générer un lien vers
  `/situations/null` ou équivalent.
- La requête ne doit pas planter s'il y a plusieurs missions `en_cours`
  simultanément (cas non empêché par le schéma) — utiliser `.limit(1)`,
  pas `.maybeSingle()`.
- Ce repo traite `@typescript-eslint/no-explicit-any` comme une erreur —
  utiliser des assertions de type plutôt que `any` si nécessaire.
- Pattern couche données établi : mapping explicite, tests avec un client
  Supabase simulé écrit à la main (voir `lib/data/ma-journee.ts` et son
  fichier de test).

---

### Task 1: Couche données — getMissionEnCoursHref

**Files:**
- Modify: `lib/data/ma-journee.ts`
- Modify: `lib/data/ma-journee.test.ts`

**Interfaces:**
- Produces : `getMissionEnCoursHref(supabase: SupabaseClient, tourneeId: string): Promise<{ missionId: string; href: string } | null>`,
  consommée par la Tâche 2.

- [ ] **Step 1: Écrire les tests (échouent d'abord)**

Ajouter à `lib/data/ma-journee.test.ts`, après le `describe("getMissionsDuJour", ...)` existant :

```ts
describe("getMissionEnCoursHref", () => {
  it("retourne un lien direct vers la situation terrain si un protocole est lié", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              limit: () =>
                Promise.resolve({
                  data: [
                    {
                      id: "m1",
                      type_soin: "Glycémie",
                      mission_clinique_id: "mc1",
                      missions_cliniques: { situation_terrain_id: "s1" },
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getMissionEnCoursHref } = await import("./ma-journee");
    const contexte = await getMissionEnCoursHref(fakeClient, "t1");

    expect(contexte).toEqual({ missionId: "m1", href: "/situations/s1" });
  });

  it("retourne un lien de recherche pré-remplie si aucun protocole n'est lié", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              limit: () =>
                Promise.resolve({
                  data: [
                    {
                      id: "m2",
                      type_soin: "Pansement",
                      mission_clinique_id: null,
                      missions_cliniques: null,
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getMissionEnCoursHref } = await import("./ma-journee");
    const contexte = await getMissionEnCoursHref(fakeClient, "t1");

    expect(contexte).toEqual({ missionId: "m2", href: "/copilote?q=Pansement" });
  });

  it("retourne null si aucune mission n'est en cours", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getMissionEnCoursHref } = await import("./ma-journee");
    const contexte = await getMissionEnCoursHref(fakeClient, "t1");

    expect(contexte).toBeNull();
  });
});
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npx vitest run lib/data/ma-journee.test.ts`
Expected: FAIL — `getMissionEnCoursHref` n'existe pas encore.

- [ ] **Step 3: Implémenter**

Ajouter à `lib/data/ma-journee.ts`, après `getMissionsDuJour` :

```ts
export async function getMissionEnCoursHref(
  supabase: SupabaseClient,
  tourneeId: string
): Promise<{ missionId: string; href: string } | null> {
  const { data, error } = await supabase
    .from("missions_du_jour")
    .select("id, type_soin, mission_clinique_id, missions_cliniques(situation_terrain_id)")
    .eq("tournee_id", tourneeId)
    .eq("statut", "en_cours")
    .limit(1);

  if (error || !data || data.length === 0) return null;

  const mission = data[0];
  const situationTerrainId = (
    mission.missions_cliniques as { situation_terrain_id: string | null } | null
  )?.situation_terrain_id;

  const href = situationTerrainId
    ? `/situations/${situationTerrainId}`
    : `/copilote?q=${encodeURIComponent(mission.type_soin)}`;

  return { missionId: mission.id, href };
}
```

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run lib/data/ma-journee.test.ts`
Expected: PASS (6 tests : 1 `getTourneeDuJour` + 2 `getMissionsDuJour` + 3 nouveaux)

- [ ] **Step 5: Vérifier le lint**

Run: `npx eslint lib/data/ma-journee.ts`
Expected: PASS (0 erreur — aucun `any` explicite)

- [ ] **Step 6: Commit**

```bash
git add lib/data/ma-journee.ts lib/data/ma-journee.test.ts
git commit -m "feat(ma-journee): getMissionEnCoursHref"
```

---

### Task 2: Lien Contexte clinique dans CarteMission + intégration

**Files:**
- Modify: `components/ui/CarteMission.tsx`
- Modify: `components/ui/CarteMission.test.tsx`
- Modify: `app/ma-journee/page.tsx`

**Interfaces:**
- Consomme : `getMissionEnCoursHref` (Tâche 1).

- [ ] **Step 1: Écrire les nouveaux tests**

Ajouter à `components/ui/CarteMission.test.tsx`, à l'intérieur du bloc
`describe("CarteMission", ...)` existant :

```tsx
  it("affiche un lien « Contexte clinique » quand contexteHref est fourni", () => {
    render(<CarteMission mission={{ ...mission, statut: "en_cours" }} contexteHref="/situations/s1" />);

    const lien = screen.getByRole("link", { name: "Contexte clinique" });
    expect(lien).toHaveAttribute("href", "/situations/s1");
  });

  it("n'affiche aucun lien contexte si contexteHref n'est pas fourni", () => {
    render(<CarteMission mission={{ ...mission, statut: "en_cours" }} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Lancer les tests et vérifier que les 2 nouveaux échouent**

Run: `npx vitest run components/ui/CarteMission.test.tsx`
Expected: FAIL sur les 2 nouveaux tests ; PASS sur les 6 tests déjà
existants.

- [ ] **Step 3: Implémenter le composant**

Remplacer le contenu de `components/ui/CarteMission.tsx` par :

```tsx
import Link from "next/link";
import type { MissionDuJour, StatutMission } from "@/lib/types/clinical";
import { updateMissionStatutAction } from "@/lib/data/ma-journee-actions";
import { Button } from "@/components/ui/Button";

const STATUT_LABEL: Record<MissionDuJour["statut"], string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  terminee: "Terminée",
};

const STATUT_CLASSES: Record<MissionDuJour["statut"], string> = {
  a_faire: "bg-navy/5 text-navy",
  en_cours: "bg-warning text-navy",
  terminee: "bg-success text-navy",
};

const PROCHAIN_STATUT: Partial<Record<StatutMission, StatutMission>> = {
  a_faire: "en_cours",
  en_cours: "terminee",
};

const LIBELLE_ACTION: Partial<Record<StatutMission, string>> = {
  a_faire: "Démarrer",
  en_cours: "Terminer",
};

interface CarteMissionProps {
  mission: MissionDuJour;
  contexteHref?: string;
}

export function CarteMission({ mission, contexteHref }: CarteMissionProps) {
  const prochainStatut = PROCHAIN_STATUT[mission.statut];

  return (
    <div className="flex items-center justify-between rounded-card border border-navy/10 bg-white p-6">
      <div>
        <p className="font-medium text-navy">{mission.patientLabel}</p>
        <p className="text-sm text-navy/60">
          {mission.typeSoin} · {mission.heurePrevue}
        </p>
      </div>
      <div className="flex items-center gap-4">
        {contexteHref && (
          <Link href={contexteHref}>
            <Button variant="tertiary">Contexte clinique</Button>
          </Link>
        )}
        <span className={`rounded-full px-2 py-2 text-xs font-medium ${STATUT_CLASSES[mission.statut]}`}>
          {STATUT_LABEL[mission.statut]}
        </span>
        {prochainStatut && (
          <form action={updateMissionStatutAction}>
            <input type="hidden" name="missionId" value={mission.id} />
            <input type="hidden" name="nouveauStatut" value={prochainStatut} />
            <Button type="submit" variant="secondary">
              {LIBELLE_ACTION[mission.statut]}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run components/ui/CarteMission.test.tsx`
Expected: PASS (8 tests)

- [ ] **Step 5: Intégrer sur Ma Journée**

Remplacer le contenu de `app/ma-journee/page.tsx` par :

```tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMissionEnCoursHref, getMissionsDuJour, getTourneeDuJour } from "@/lib/data/ma-journee";
import { Button } from "@/components/ui/Button";
import { CarteInformation } from "@/components/ui/CarteInformation";
import { CarteMission } from "@/components/ui/CarteMission";

export default async function MaJourneePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tournee = user ? await getTourneeDuJour(supabase, user.id) : null;
  const missions = tournee ? await getMissionsDuJour(supabase, tournee.id) : [];
  const contexte = tournee ? await getMissionEnCoursHref(supabase, tournee.id) : null;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-navy">Ma Journée</h1>
      <div className="flex gap-4">
        <Link href="/recherche">
          <Button variant="secondary">Rechercher</Button>
        </Link>
        <Link href="/copilote">
          <Button variant="secondary">Copilote</Button>
        </Link>
      </div>
      {tournee ? (
        <div className="grid grid-cols-2 gap-4">
          <CarteInformation label="Patients" value={tournee.nbPatients} />
          <CarteInformation label="Injections" value={tournee.nbInjections} />
          <CarteInformation label="Pansements" value={tournee.nbPansements} />
          <CarteInformation label="Glycémies" value={tournee.nbGlycemies} />
        </div>
      ) : (
        <p className="text-navy/60">Aucune tournée enregistrée pour aujourd&apos;hui.</p>
      )}
      {tournee &&
        (missions.length > 0 ? (
          <div className="flex flex-col gap-4">
            {missions.map((mission) => (
              <CarteMission
                key={mission.id}
                mission={mission}
                contexteHref={mission.id === contexte?.missionId ? contexte.href : undefined}
              />
            ))}
          </div>
        ) : (
          <p className="text-navy/60">Aucune mission prévue pour aujourd&apos;hui.</p>
        ))}
    </main>
  );
}
```

- [ ] **Step 6: Vérifier la compilation et le lint**

Run: `npm run build`
Expected: PASS (0 erreur TypeScript)

Run: `npx eslint components/ui/CarteMission.tsx app/ma-journee/page.tsx`
Expected: PASS (0 erreur)

- [ ] **Step 7: Lancer la suite complète**

Run: `npm test` (ou la commande équivalente de ce projet)
Expected: PASS (tous les tests existants + les nouveaux, aucune
régression)

- [ ] **Step 8: Commit**

```bash
git add components/ui/CarteMission.tsx components/ui/CarteMission.test.tsx app/ma-journee/page.tsx
git commit -m "feat(ma-journee): lien Contexte clinique sur la mission en cours"
```

- [ ] **Step 9: Vérification manuelle post-déploiement (contrôleur, automatique)**

Après fusion et déploiement, le contrôleur vérifie contre les missions de
test déjà en base : marquer une mission comme "en cours" (déjà possible
depuis le chantier précédent), puis confirmer via une requête
authentifiée que `getMissionEnCoursHref` résout le bon lien — direct vers
`/situations/[id]` si `mission_clinique_id` est renseigné et résolu (cas
de "Prise en charge hypoglycémie"), sinon vers `/copilote?q=...` (cas de
"M. Lefevre"/"Mme Girard", sans lien clinique).

---

## Résultat à la fin de ce plan

Une IDEL dont une mission est marquée "en cours" voit un lien "Contexte
clinique" sur sa carte, menant directement à la bonne information — le
protocole clinique lié si disponible, ou une recherche pré-remplie sinon
— sans avoir à taper quoi que ce soit. C'est la première pièce de la
vision "Smart Context" : le Copilote commence à savoir ce que l'IDEL est
en train de faire, pas seulement ce qu'elle demande.
