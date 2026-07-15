# Changement de statut des missions (v1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à une IDEL connectée de faire avancer le statut d'une mission (à faire → en cours → terminée) directement depuis Ma Journée, en une seule étape à la fois.

**Architecture:** Un Server Action (`updateMissionStatutAction`) qui revalide la transition contre l'état réel en base avant d'écrire, exposé via un formulaire ajouté à `CarteMission`. Aucune nouvelle migration, aucune nouvelle policy RLS — la policy existante `missions_du_jour_owner_all` (`for all`) couvre déjà l'UPDATE.

**Tech Stack:** Next.js 16 (App Router, Server Actions), Supabase (RLS existante), TypeScript strict, Vitest.

Spec complète : `docs/superpowers/specs/2026-07-15-statut-missions-design.md`.

## Global Constraints

- Progression à sens unique uniquement : `a_faire → en_cours` et
  `en_cours → terminee`. Aucune autre transition n'est valide, y compris
  déclenchée par une requête modifiée à la main — le Server Action doit
  relire le statut réel en base avant d'écrire, jamais faire confiance
  uniquement à ce que le formulaire soumet.
- Aucune nouvelle migration, aucune nouvelle policy RLS.
- Aucune confirmation UI avant "Terminer" — décision actée, ne pas
  ajouter de dialogue de confirmation.
- Le Server Action doit vivre dans un fichier séparé des fonctions de
  lecture (`lib/data/ma-journee-actions.ts`, pas `lib/data/ma-journee.ts`)
  pour ne pas marquer les lectures existantes `"use server"`.
- `CarteMission` importe l'action directement depuis `lib/` — pas de prop
  d'action à faire transiter depuis la page.
- Ce repo traite `@typescript-eslint/no-explicit-any` comme une erreur —
  utiliser des assertions de type (`as StatutMission`) plutôt que `any`
  si nécessaire, jamais d'annotation `: any` explicite.
- Pattern de test des Server Actions déjà établi : voir
  `app/login/actions.test.ts` — `vi.mock("@/lib/supabase/server", ...)`
  pour simuler le client, pas de bibliothèque de mock Supabase.

---

### Task 1: Server Action — updateMissionStatutAction

**Files:**
- Create: `lib/data/ma-journee-actions.ts`
- Create: `lib/data/ma-journee-actions.test.ts`

**Interfaces:**
- Consomme : le type `StatutMission` (déjà défini dans
  `lib/types/clinical.ts`), `createClient` (`lib/supabase/server.ts`).
- Produces : `updateMissionStatutAction(formData: FormData): Promise<void>`,
  consommée par la Tâche 2. Attend deux champs dans le `FormData` :
  `missionId` (string) et `nouveauStatut` (string, une valeur de
  `StatutMission`).

- [ ] **Step 1: Écrire les tests (échouent d'abord)**

Créer `lib/data/ma-journee-actions.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const eqSelectMock = vi.fn();
const selectMock = vi.fn(() => ({ eq: () => ({ maybeSingle: eqSelectMock }) }));
const eqUpdateMock = vi.fn();
const updateMock = vi.fn(() => ({ eq: eqUpdateMock }));
const fromMock = vi.fn(() => ({ select: selectMock, update: updateMock }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({ from: fromMock }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateMissionStatutAction", () => {
  it("applique une transition valide (a_faire vers en_cours) et invalide le cache", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "a_faire" }, error: null });
    eqUpdateMock.mockResolvedValue({ error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "en_cours");

    await updateMissionStatutAction(formData);

    expect(fromMock).toHaveBeenCalledWith("missions_du_jour");
    expect(updateMock).toHaveBeenCalledWith({ statut: "en_cours" });
    expect(eqUpdateMock).toHaveBeenCalledWith("id", "m1");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee");
  });

  it("n'applique pas une transition invalide (terminee vers a_faire)", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "terminee" }, error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "a_faire");

    await updateMissionStatutAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("n'applique rien si la mission n'existe pas", async () => {
    eqSelectMock.mockResolvedValue({ data: null, error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "inconnue");
    formData.set("nouveauStatut", "en_cours");

    await updateMissionStatutAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npx vitest run lib/data/ma-journee-actions.test.ts`
Expected: FAIL — `./ma-journee-actions` n'existe pas encore.

- [ ] **Step 3: Implémenter**

Créer `lib/data/ma-journee-actions.ts` :

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { StatutMission } from "@/lib/types/clinical";

const TRANSITIONS_VALIDES: Partial<Record<StatutMission, StatutMission>> = {
  a_faire: "en_cours",
  en_cours: "terminee",
};

export async function updateMissionStatutAction(formData: FormData): Promise<void> {
  const missionId = String(formData.get("missionId"));
  const nouveauStatut = String(formData.get("nouveauStatut")) as StatutMission;

  const supabase = await createClient();

  const { data: mission } = await supabase
    .from("missions_du_jour")
    .select("statut")
    .eq("id", missionId)
    .maybeSingle();

  if (!mission || TRANSITIONS_VALIDES[mission.statut as StatutMission] !== nouveauStatut) {
    return;
  }

  await supabase.from("missions_du_jour").update({ statut: nouveauStatut }).eq("id", missionId);

  revalidatePath("/ma-journee");
}
```

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run lib/data/ma-journee-actions.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Vérifier le lint**

Run: `npx eslint lib/data/ma-journee-actions.ts`
Expected: PASS (0 erreur — aucun `any` explicite)

- [ ] **Step 6: Commit**

```bash
git add lib/data/ma-journee-actions.ts lib/data/ma-journee-actions.test.ts
git commit -m "feat(ma-journee): updateMissionStatutAction"
```

---

### Task 2: Bouton d'action dans CarteMission

**Files:**
- Modify: `components/ui/CarteMission.tsx`
- Modify: `components/ui/CarteMission.test.tsx`

**Interfaces:**
- Consomme : `updateMissionStatutAction` (Tâche 1), `Button`
  (`components/ui/Button.tsx`), le type `StatutMission`
  (`lib/types/clinical.ts`).

- [ ] **Step 1: Écrire les nouveaux tests**

Remplacer le contenu de `components/ui/CarteMission.test.tsx` par :

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CarteMission } from "./CarteMission";
import type { MissionDuJour } from "@/lib/types/clinical";

vi.mock("@/lib/data/ma-journee-actions", () => ({
  updateMissionStatutAction: vi.fn(),
}));

const mission: MissionDuJour = {
  id: "m1",
  patientLabel: "Mme Dupont",
  typeSoin: "Pansement",
  heurePrevue: "08:30:00",
  statut: "a_faire",
  missionCliniqueId: null,
};

describe("CarteMission", () => {
  it("affiche le patient, le type de soin, l'heure et le statut", () => {
    render(<CarteMission mission={mission} />);

    expect(screen.getByText("Mme Dupont")).toBeInTheDocument();
    expect(screen.getByText(/Pansement/)).toBeInTheDocument();
    expect(screen.getByText(/08:30:00/)).toBeInTheDocument();
    expect(screen.getByText("À faire")).toBeInTheDocument();
  });

  it("affiche le bon libellé pour le statut « en cours »", () => {
    render(<CarteMission mission={{ ...mission, statut: "en_cours" }} />);
    expect(screen.getByText("En cours")).toBeInTheDocument();
  });

  it("affiche le bon libellé pour le statut « terminée »", () => {
    render(<CarteMission mission={{ ...mission, statut: "terminee" }} />);
    expect(screen.getByText("Terminée")).toBeInTheDocument();
  });

  it("affiche le bouton « Démarrer » pour une mission à faire", () => {
    render(<CarteMission mission={mission} />);

    expect(screen.getByRole("button", { name: "Démarrer" })).toBeInTheDocument();

    const champStatut = document.querySelector('input[name="nouveauStatut"]') as HTMLInputElement;
    expect(champStatut.value).toBe("en_cours");
  });

  it("affiche le bouton « Terminer » pour une mission en cours", () => {
    render(<CarteMission mission={{ ...mission, statut: "en_cours" }} />);

    expect(screen.getByRole("button", { name: "Terminer" })).toBeInTheDocument();

    const champStatut = document.querySelector('input[name="nouveauStatut"]') as HTMLInputElement;
    expect(champStatut.value).toBe("terminee");
  });

  it("n'affiche aucun bouton pour une mission terminée", () => {
    render(<CarteMission mission={{ ...mission, statut: "terminee" }} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Lancer les tests et vérifier que les 3 nouveaux échouent**

Run: `npx vitest run components/ui/CarteMission.test.tsx`
Expected: FAIL sur les 3 nouveaux tests (bouton/champ caché pas encore
implémentés) ; PASS sur les 3 tests déjà existants (comportement inchangé
jusqu'ici).

- [ ] **Step 3: Implémenter**

Remplacer le contenu de `components/ui/CarteMission.tsx` par :

```tsx
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

export function CarteMission({ mission }: { mission: MissionDuJour }) {
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
Expected: PASS (6 tests)

- [ ] **Step 5: Vérifier la compilation et le lint**

Run: `npm run build`
Expected: PASS (0 erreur TypeScript)

Run: `npx eslint components/ui/CarteMission.tsx`
Expected: PASS (0 erreur)

- [ ] **Step 6: Lancer la suite complète**

Run: `npm test` (ou la commande équivalente de ce projet)
Expected: PASS (tous les tests existants + les nouveaux, aucune
régression — en particulier `app/ma-journee/page.tsx` continue de
fonctionner puisqu'il n'est pas modifié par ce plan)

- [ ] **Step 7: Commit**

```bash
git add components/ui/CarteMission.tsx components/ui/CarteMission.test.tsx
git commit -m "feat(ma-journee): bouton de changement de statut sur CarteMission"
```

- [ ] **Step 8: Vérification manuelle post-déploiement (contrôleur, avec autorisation)**

Après fusion et déploiement, le contrôleur, avec autorisation explicite,
vérifie contre les missions de test déjà en base (insérées lors du
chantier précédent) :
1. Appelle `updateMissionStatutAction` (ou reproduit son effet via une
   requête authentifiée directe) pour une transition légale (ex. une
   mission `a_faire` vers `en_cours`) — confirme que le statut change en
   base et que la RLS accepte l'écriture avec le token du compte de test.
2. Tente une transition illégale (ex. `terminee` vers `a_faire`, ou
   `a_faire` directement vers `terminee`) — confirme qu'elle est
   rejetée silencieusement (aucun changement en base).

---

## Résultat à la fin de ce plan

Une IDEL connectée peut faire avancer une mission de sa tournée du jour
d'un simple tap, sans risque de sauter une étape ou de revenir en
arrière — même en cas de requête modifiée à la main. C'est la première
mutation métier de l'application, et la donnée `statut` devient enfin
actionnable : une future itération du Copilote pourra détecter la
mission `en_cours` d'une IDEL et adapter son contexte en conséquence.
