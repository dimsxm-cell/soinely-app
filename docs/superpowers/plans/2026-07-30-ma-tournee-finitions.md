# Ma tournée — Finitions (lot E) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rapprocher `/ma-tournee` de sa maquette sans toucher à la base — consignes en pied de carte, filtre « Alertes » recentré sur les allergies, code mort supprimé — et rendre la page testable en extrayant ses composants.

**Architecture:** `app/(app)/ma-tournee/page.tsx` (619 lignes) est scindé en un module de helpers purs (`lib/tournee-vue.ts`) et trois composants de présentation (`components/ui/`), chacun avec son test colocalisé. La page ne garde que la lecture de `searchParams`, les appels Supabase et l'assemblage.

**Tech Stack:** Next.js 16.2.10 (App Router, React Server Components), React 19.2.4, TypeScript, Tailwind CSS v4, Vitest 4 + Testing Library (jsdom).

**Spec :** `docs/superpowers/specs/2026-07-30-ma-tournee-finitions-design.md`

## Global Constraints

- Tout le code visible (identifiants, commentaires, libellés) est en **français**, y compris les noms de fonctions et de variables — convention de tout le dépôt.
- Les tests sont **colocalisés** : `X.tsx` → `X.test.tsx`, `X.ts` → `X.test.ts`.
- Les composants extraits sont des **composants serveur** : aucun `"use client"`, aucun `useState`, aucun gestionnaire d'événement. Les actions passent par `<form action={updateMissionStatutAction}>`.
- Commande de test : `npm test` (vitest run). Un test seul : `npx vitest run <chemin> -t "<nom>"`.
- `lib/data/` est réservé aux accès Supabase. Les helpers de présentation vont dans `lib/`, à côté de `lib/format.ts`.
- Ne pas modifier le comportement des lots A à D : pas de km, pas de cotation, pas de motif d'absence, pas de correction de statut.
- Aucune migration Supabase dans ce lot.

---

## File Structure

| Fichier | Responsabilité |
|---|---|
| `lib/tournee-vue.ts` *(créé)* | Helpers purs : filtrage, comptage, formats, couleurs d'avatar, libellés de statut |
| `lib/tournee-vue.test.ts` *(créé)* | Tests des helpers |
| `components/ui/CarteMissionTournee.tsx` *(créé)* | Colonne timeline + carte patient + actions + pied de consignes |
| `components/ui/CarteMissionTournee.test.tsx` *(créé)* | Tests de la carte |
| `components/ui/EnTeteTournee.tsx` *(créé)* | En-tête sombre : compteur, progression, trois stats |
| `components/ui/EnTeteTournee.test.tsx` *(créé)* | Tests de l'en-tête |
| `components/ui/OngletsFiltresTournee.tsx` *(créé)* | Les quatre filtres à badge |
| `components/ui/OngletsFiltresTournee.test.tsx` *(créé)* | Tests des onglets |
| `app/(app)/ma-tournee/page.tsx` *(réduit)* | Données Supabase + assemblage + état vide |

---

### Task 1 : Helpers purs dans `lib/tournee-vue.ts`

**Files:**
- Create: `lib/tournee-vue.ts`
- Test: `lib/tournee-vue.test.ts`
- Source à déplacer: `app/(app)/ma-tournee/page.tsx:16-123`

**Interfaces:**
- Consumes: `MissionTourneeVue` depuis `@/lib/data/ma-journee`, `StatutMission` depuis `@/lib/types/clinical`
- Produces:
  - `type Filtre = "tout" | "a_faire" | "alertes" | "valides"`
  - `filtrerMissions(missions: MissionTourneeVue[], filtre: Filtre): MissionTourneeVue[]`
  - `compterMissions(missions: MissionTourneeVue[]): CountsMissions`
  - `type CountsMissions = { tout: number; a_faire: number; alertes: number; valides: number }`
  - `estimerHeureFin(missions: MissionTourneeVue[]): string | null`
  - `calculerAge(dateNaissance: string | null): number | null`
  - `getInitiales(nomComplet: string): string`
  - `getCouleurAvatar(id: string): { bg: string; text: string }`
  - `formatHeure(iso: string): string`
  - `formatDateTournee(): string`
  - `STATUT_LABEL: Record<StatutMission, string>`, `STATUT_BADGE: Record<StatutMission, string>`

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `lib/tournee-vue.test.ts` :

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MissionTourneeVue } from "@/lib/data/ma-journee";
import {
  calculerAge,
  compterMissions,
  estimerHeureFin,
  filtrerMissions,
  getCouleurAvatar,
  getInitiales,
} from "./tournee-vue";

function creerMission(surcharge: Partial<MissionTourneeVue> = {}): MissionTourneeVue {
  return {
    id: "m1",
    patientId: "p1",
    patientNom: "Mme Dupont",
    patientAdresse: "12 rue des Lilas",
    patientTelephone: "06 12 34 56 78",
    patientAllergies: null,
    patientConsignes: null,
    patientDateNaissance: "1944-03-12",
    typeSoin: "Pansement",
    heurePrevue: "08:00:00",
    statut: "a_faire",
    missionCliniqueId: null,
    dureeEstimeeMin: 25,
    ...surcharge,
  };
}

describe("filtrerMissions", () => {
  it("« à faire » retient aussi les missions en cours", () => {
    const missions = [
      creerMission({ id: "a", statut: "a_faire" }),
      creerMission({ id: "b", statut: "en_cours" }),
      creerMission({ id: "c", statut: "terminee" }),
    ];

    expect(filtrerMissions(missions, "a_faire").map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("« validés » retient aussi les missions absentes", () => {
    const missions = [
      creerMission({ id: "a", statut: "terminee" }),
      creerMission({ id: "b", statut: "absent" }),
      creerMission({ id: "c", statut: "a_faire" }),
    ];

    expect(filtrerMissions(missions, "valides").map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("« alertes » ne retient que les missions avec allergie", () => {
    const missions = [
      creerMission({ id: "a", patientAllergies: "Allergie iode" }),
      creerMission({ id: "b", patientConsignes: "Code portail 4512B" }),
      creerMission({ id: "c" }),
    ];

    expect(filtrerMissions(missions, "alertes").map((m) => m.id)).toEqual(["a"]);
  });

  it("« tout » retient toutes les missions", () => {
    const missions = [creerMission({ id: "a" }), creerMission({ id: "b", statut: "terminee" })];

    expect(filtrerMissions(missions, "tout")).toHaveLength(2);
  });
});

describe("compterMissions", () => {
  it("ne compte pas dans « alertes » une mission qui n'a que des consignes", () => {
    const missions = [
      creerMission({ id: "a", patientAllergies: "Allergie iode" }),
      creerMission({ id: "b", patientConsignes: "3e étage sans ascenseur" }),
      creerMission({ id: "c", statut: "terminee" }),
    ];

    expect(compterMissions(missions)).toEqual({
      tout: 3,
      a_faire: 2,
      alertes: 1,
      valides: 1,
    });
  });
});

describe("estimerHeureFin", () => {
  it("renvoie l'heure de la dernière mission restante", () => {
    const missions = [
      creerMission({ id: "a", heurePrevue: "08:00:00", statut: "terminee" }),
      creerMission({ id: "b", heurePrevue: "14:20:00", statut: "en_cours" }),
      creerMission({ id: "c", heurePrevue: "18:05:00", statut: "a_faire" }),
    ];

    expect(estimerHeureFin(missions)).toBe("18:05");
  });

  it("renvoie null quand plus aucune mission ne reste", () => {
    const missions = [
      creerMission({ id: "a", statut: "terminee" }),
      creerMission({ id: "b", statut: "absent" }),
    ];

    expect(estimerHeureFin(missions)).toBeNull();
  });
});

describe("calculerAge", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-30T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retire un an quand l'anniversaire n'est pas encore passé", () => {
    expect(calculerAge("1950-08-15")).toBe(75);
  });

  it("compte l'année entière quand l'anniversaire est passé", () => {
    expect(calculerAge("1950-06-15")).toBe(76);
  });

  it("renvoie null sans date de naissance", () => {
    expect(calculerAge(null)).toBeNull();
  });
});

describe("getInitiales", () => {
  it("ignore la civilité « Mme »", () => {
    expect(getInitiales("Mme Dupont")).toBe("DU");
  });

  it("ignore la civilité « M. »", () => {
    expect(getInitiales("M. Martin")).toBe("MA");
  });

  it("prend le premier mot quand il n'y a pas de civilité", () => {
    expect(getInitiales("Nguyen")).toBe("NG");
  });
});

describe("getCouleurAvatar", () => {
  it("donne toujours la même couleur pour un même identifiant", () => {
    expect(getCouleurAvatar("patient-1")).toEqual(getCouleurAvatar("patient-1"));
  });

  it("renvoie une paire de classes Tailwind", () => {
    const couleur = getCouleurAvatar("patient-1");

    expect(couleur.bg).toMatch(/^bg-/);
    expect(couleur.text).toMatch(/^text-/);
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run lib/tournee-vue.test.ts`
Expected: FAIL — `Failed to resolve import "./tournee-vue"`.

- [ ] **Step 3 : Créer `lib/tournee-vue.ts`**

Déplacer depuis `app/(app)/ma-tournee/page.tsx` les lignes 16 à 123 (type `Filtre`, `formatDateTournee`, `formatHeure`, `calculerAge`, `getInitiales`, `PALETTE_AVATAR`, `getCouleurAvatar`, `estimerHeureFin`, `filtrerMissions`, `compterMissions`, `STATUT_LABEL`, `STATUT_BADGE`) en les exportant, avec **trois** changements :

1. `CIVILITES` perd les points — sinon `"M."`, ramené à `"m"` par le `replace`, ne correspond à aucune entrée et l'avatar de « M. Martin » affiche `M.` au lieu de `MA` ;
2. le filtre `alertes` de `filtrerMissions` ne teste plus `patientConsignes` ;
3. le compteur `alertes` de `compterMissions` ne teste plus `patientConsignes`.

```ts
import type { MissionTourneeVue } from "@/lib/data/ma-journee";
import type { StatutMission } from "@/lib/types/clinical";

export type Filtre = "tout" | "a_faire" | "alertes" | "valides";

export function formatDateTournee(): string {
  return new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatHeure(iso: string): string {
  return iso.slice(0, 5);
}

export function calculerAge(dateNaissance: string | null): number | null {
  if (!dateNaissance) return null;
  const today = new Date();
  const birth = new Date(dateNaissance);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// Les civilités sont listées sans point final : le nom candidat est comparé
// après avoir été dépouillé du sien, donc « M. » se présente ici comme « m ».
const CIVILITES = ["mme", "m", "mr", "dr", "pr", "mlle"];

export function getInitiales(nomComplet: string): string {
  const parts = nomComplet.trim().split(/\s+/);
  const nom = parts.find((p) => !CIVILITES.includes(p.toLowerCase().replace(/\.$/, "")));
  return (nom ?? parts[0]).slice(0, 2).toUpperCase();
}

const PALETTE_AVATAR = [
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-teal-100", text: "text-teal-700" },
  { bg: "bg-orange-100", text: "text-orange-700" },
  { bg: "bg-pink-100", text: "text-pink-700" },
];

export function getCouleurAvatar(id: string) {
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return PALETTE_AVATAR[hash % PALETTE_AVATAR.length];
}

export function estimerHeureFin(missions: MissionTourneeVue[]): string | null {
  const restantes = missions.filter((m) => m.statut === "a_faire" || m.statut === "en_cours");
  if (restantes.length === 0) return null;
  return formatHeure(restantes[restantes.length - 1].heurePrevue);
}

export function filtrerMissions(missions: MissionTourneeVue[], filtre: Filtre): MissionTourneeVue[] {
  switch (filtre) {
    case "a_faire":
      return missions.filter((m) => m.statut === "a_faire" || m.statut === "en_cours");
    // Une consigne d'accès (code portail, étage, chien) n'est pas une alerte :
    // seule l'allergie en est une tant que les lots A à D n'ont pas apporté de
    // source d'alerte de suivi.
    case "alertes":
      return missions.filter((m) => m.patientAllergies);
    case "valides":
      return missions.filter((m) => m.statut === "terminee" || m.statut === "absent");
    default:
      return missions;
  }
}

export interface CountsMissions {
  tout: number;
  a_faire: number;
  alertes: number;
  valides: number;
}

export function compterMissions(missions: MissionTourneeVue[]): CountsMissions {
  return {
    tout: missions.length,
    a_faire: missions.filter((m) => m.statut === "a_faire" || m.statut === "en_cours").length,
    alertes: missions.filter((m) => m.patientAllergies).length,
    valides: missions.filter((m) => m.statut === "terminee" || m.statut === "absent").length,
  };
}

export const STATUT_LABEL: Record<StatutMission, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  terminee: "Validé",
  absent: "Absent",
};

export const STATUT_BADGE: Record<StatutMission, string> = {
  a_faire: "bg-navy/[0.06] text-navy/50",
  en_cours: "bg-brand-violet/[0.12] text-brand-violet font-bold",
  terminee: "bg-emerald-50 text-emerald-600 font-semibold",
  absent: "bg-amber-50 text-amber-600 font-semibold",
};
```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run lib/tournee-vue.test.ts`
Expected: PASS — 15 tests.

- [ ] **Step 5 : Commit**

```bash
git add lib/tournee-vue.ts lib/tournee-vue.test.ts
git commit -m "Extrait les helpers de la page Ma tournée dans lib/tournee-vue"
```

Corps du message à inclure : la liste des civilités portait un point final alors que le nom candidat en est dépouillé avant comparaison — « M. Martin » affichait donc `M.` en avatar au lieu de `MA`. Le filtre « Alertes » ne retient plus les consignes, qui décrivent l'accès et non un risque clinique.

---

### Task 2 : `components/ui/CarteMissionTournee.tsx`

**Files:**
- Create: `components/ui/CarteMissionTournee.tsx`
- Test: `components/ui/CarteMissionTournee.test.tsx`
- Source à déplacer: `app/(app)/ma-tournee/page.tsx:125-363`

**Interfaces:**
- Consumes: `calculerAge`, `formatHeure`, `getCouleurAvatar`, `getInitiales`, `STATUT_BADGE`, `STATUT_LABEL` depuis `@/lib/tournee-vue` (Task 1) ; `MissionTourneeVue` depuis `@/lib/data/ma-journee` ; `updateMissionStatutAction` depuis `@/lib/data/ma-journee-actions` ; `IconeSoin` depuis `@/components/ui/IconeSoin` ; `formaterNomPropre` depuis `@/lib/format`
- Produces: `CarteMissionTournee({ mission, contexteHref, estDerniere })` — la prop `numero` de la version actuelle **disparaît**

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `components/ui/CarteMissionTournee.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CarteMissionTournee } from "./CarteMissionTournee";
import type { MissionTourneeVue } from "@/lib/data/ma-journee";

vi.mock("@/lib/data/ma-journee-actions", () => ({
  updateMissionStatutAction: vi.fn(),
}));

function creerMission(surcharge: Partial<MissionTourneeVue> = {}): MissionTourneeVue {
  return {
    id: "m1",
    patientId: "p1",
    patientNom: "Mme Dupont",
    patientAdresse: "12 rue des Lilas",
    patientTelephone: "06 12 34 56 78",
    patientAllergies: null,
    patientConsignes: null,
    patientDateNaissance: "1944-03-12",
    typeSoin: "Pansement",
    heurePrevue: "08:00:00",
    statut: "a_faire",
    missionCliniqueId: null,
    dureeEstimeeMin: 25,
    ...surcharge,
  };
}

describe("CarteMissionTournee", () => {
  it("affiche le patient, l'heure, la durée et le statut", () => {
    render(<CarteMissionTournee mission={creerMission()} estDerniere={false} />);

    expect(screen.getByText("Mme Dupont")).toBeInTheDocument();
    expect(screen.getByText("08:00")).toBeInTheDocument();
    expect(screen.getByText("25 min")).toBeInTheDocument();
    expect(screen.getByText("À faire")).toBeInTheDocument();
  });

  it("affiche une allergie en encart d'alerte", () => {
    render(
      <CarteMissionTournee
        mission={creerMission({ patientAllergies: "Allergie iode" })}
        estDerniere={false}
      />
    );

    expect(screen.getByText("Allergie iode")).toBeInTheDocument();
  });

  it("affiche les consignes en pied de carte, séparées des alertes", () => {
    render(
      <CarteMissionTournee
        mission={creerMission({ patientConsignes: "3e étage sans ascenseur" })}
        estDerniere={false}
      />
    );

    const consignes = screen.getByText("3e étage sans ascenseur");
    expect(consignes).toBeInTheDocument();
    // Le pied est un simple filet pointillé, pas un encart coloré d'alerte.
    expect(consignes.className).toContain("text-navy/45");
    expect(consignes.closest("div")?.className).toContain("border-dashed");
  });

  it("propose « Valider le soin » et « Absent » pour une mission à faire", () => {
    render(<CarteMissionTournee mission={creerMission()} estDerniere={false} />);

    expect(screen.getByRole("button", { name: "Valider le soin" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Absent" })).toBeInTheDocument();
  });

  it("propose GPS, Appeler et Valider pour une mission en cours", () => {
    render(<CarteMissionTournee mission={creerMission({ statut: "en_cours" })} estDerniere={false} />);

    expect(screen.getByRole("link", { name: /GPS/ })).toHaveAttribute(
      "href",
      "https://maps.google.com/?q=12%20rue%20des%20Lilas"
    );
    expect(screen.getByRole("link", { name: /Appeler/ })).toHaveAttribute(
      "href",
      "tel:0612345678"
    );
    expect(screen.getByRole("button", { name: /Valider/ })).toBeInTheDocument();
  });

  it("n'affiche aucune action pour une mission validée", () => {
    render(<CarteMissionTournee mission={creerMission({ statut: "terminee" })} estDerniere={false} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("n'affiche aucune action pour une mission absente", () => {
    render(<CarteMissionTournee mission={creerMission({ statut: "absent" })} estDerniere={false} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("affiche les consignes même sur une mission validée", () => {
    render(
      <CarteMissionTournee
        mission={creerMission({ statut: "terminee", patientConsignes: "Code portail 4512B" })}
        estDerniere={false}
      />
    );

    expect(screen.getByText("Code portail 4512B")).toBeInTheDocument();
  });

  it("le nom du patient renvoie vers l'écran d'arrivée de la mission", () => {
    render(<CarteMissionTournee mission={creerMission()} estDerniere={false} />);

    expect(screen.getByRole("link", { name: /Mme Dupont/ })).toHaveAttribute(
      "href",
      "/ma-journee/m1"
    );
  });

  it("affiche le lien de contexte clinique quand il est fourni", () => {
    render(
      <CarteMissionTournee
        mission={creerMission({ statut: "en_cours" })}
        contexteHref="/situations/s1"
        estDerniere={false}
      />
    );

    expect(screen.getByRole("link", { name: /contexte clinique/i })).toHaveAttribute(
      "href",
      "/situations/s1"
    );
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run components/ui/CarteMissionTournee.test.tsx`
Expected: FAIL — `Failed to resolve import "./CarteMissionTournee"`.

- [ ] **Step 3 : Créer le composant**

Déplacer `CarteMissionTournee` et son interface de props depuis `page.tsx:127-363`, avec ces changements :

1. en-tête du fichier — imports et props (la prop `numero`, jamais rendue, disparaît) :

```tsx
import Link from "next/link";
import { IconeSoin } from "@/components/ui/IconeSoin";
import type { MissionTourneeVue } from "@/lib/data/ma-journee";
import { updateMissionStatutAction } from "@/lib/data/ma-journee-actions";
import { formaterNomPropre } from "@/lib/format";
import {
  STATUT_BADGE,
  STATUT_LABEL,
  calculerAge,
  formatHeure,
  getCouleurAvatar,
  getInitiales,
} from "@/lib/tournee-vue";

interface CarteMissionTourneeProps {
  mission: MissionTourneeVue;
  contexteHref?: string;
  estDerniere: boolean;
}

export function CarteMissionTournee({
  mission,
  contexteHref,
  estDerniere,
}: CarteMissionTourneeProps) {
```

2. le corps (calcul des variables locales, colonne timeline, en-tête de carte, chip du soin, encart rouge d'allergie, lien de contexte, bloc d'actions) est repris **tel quel** depuis `page.tsx:140-359` ;

3. l'encart ambre des consignes (`page.tsx:259-269`) est **supprimé** ;

4. un pied de carte est ajouté **après** le bloc d'actions, juste avant la fermeture de la carte blanche :

```tsx
        {/* Consignes d'accès : code portail, étage, animal, présence de la
            famille. Rendues en pied de carte et non en encart d'alerte —
            c'est de la logistique, pas un risque clinique. */}
        {mission.patientConsignes && (
          <div className="border-t border-dashed border-navy/10 px-4 py-2.5">
            <p className="text-[12.5px] leading-relaxed text-navy/45">
              {mission.patientConsignes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run components/ui/CarteMissionTournee.test.tsx`
Expected: PASS — 10 tests.

- [ ] **Step 5 : Commit**

```bash
git add components/ui/CarteMissionTournee.tsx components/ui/CarteMissionTournee.test.tsx
git commit -m "Extrait la carte de mission et descend les consignes en pied de carte"
```

---

### Task 3 : `components/ui/EnTeteTournee.tsx`

**Files:**
- Create: `components/ui/EnTeteTournee.tsx`
- Test: `components/ui/EnTeteTournee.test.tsx`
- Source à déplacer: `app/(app)/ma-tournee/page.tsx:365-462`

**Interfaces:**
- Consumes: `estimerHeureFin`, `formatDateTournee` depuis `@/lib/tournee-vue` (Task 1) ; `MissionTourneeVue` depuis `@/lib/data/ma-journee` ; `Tournee` depuis `@/lib/types/clinical`
- Produces: `EnTeteTournee({ missions, tournee })`

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `components/ui/EnTeteTournee.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EnTeteTournee } from "./EnTeteTournee";
import type { MissionTourneeVue } from "@/lib/data/ma-journee";
import type { StatutMission, Tournee } from "@/lib/types/clinical";

const tournee: Tournee = {
  id: "t1",
  date: "2026-07-30",
  nbPatients: 8,
  nbInjections: 3,
  nbPansements: 2,
  nbGlycemies: 1,
  tempsEstimeMin: 240,
};

function creerMission(id: string, statut: StatutMission, heurePrevue: string): MissionTourneeVue {
  return {
    id,
    patientId: `p-${id}`,
    patientNom: "Mme Dupont",
    patientAdresse: "12 rue des Lilas",
    patientTelephone: "06 12 34 56 78",
    patientAllergies: null,
    patientConsignes: null,
    patientDateNaissance: "1944-03-12",
    typeSoin: "Pansement",
    heurePrevue,
    statut,
    missionCliniqueId: null,
    dureeEstimeeMin: 25,
  };
}

// Les trois nombres affichés — validés (2), restants (3), patients (8) — sont
// volontairement distincts : sinon `getByText("2")` en trouverait plusieurs et
// échouerait sur l'ambiguïté plutôt que sur le comportement testé.
const missions = [
  creerMission("a", "terminee", "08:00:00"),
  creerMission("b", "absent", "10:05:00"),
  creerMission("c", "a_faire", "15:15:00"),
  creerMission("d", "a_faire", "16:00:00"),
  creerMission("e", "a_faire", "18:05:00"),
];

describe("EnTeteTournee", () => {
  it("affiche le compteur de soins validés sur le total", () => {
    render(<EnTeteTournee missions={missions} tournee={tournee} />);

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("/5")).toBeInTheDocument();
    expect(screen.getByText("soins validés")).toBeInTheDocument();
  });

  it("la barre de progression annonce le pourcentage validé", () => {
    render(<EnTeteTournee missions={missions} tournee={tournee} />);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");
  });

  it("affiche le nombre de missions restantes et l'heure de fin estimée", () => {
    render(<EnTeteTournee missions={missions} tournee={tournee} />);

    expect(screen.getByText("Reste")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Fin est.")).toBeInTheDocument();
    expect(screen.getByText("18:05")).toBeInTheDocument();
  });

  it("affiche le nombre de patients de la tournée", () => {
    render(<EnTeteTournee missions={missions} tournee={tournee} />);

    expect(screen.getByText("Patients")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("n'affiche pas d'heure de fin quand tout est validé", () => {
    const toutesValidees = [
      creerMission("a", "terminee", "08:00:00"),
      creerMission("b", "terminee", "10:05:00"),
    ];

    render(<EnTeteTournee missions={toutesValidees} tournee={tournee} />);

    expect(screen.queryByText("Fin est.")).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run components/ui/EnTeteTournee.test.tsx`
Expected: FAIL — `Failed to resolve import "./EnTeteTournee"`.

- [ ] **Step 3 : Créer le composant**

Déplacer `EnTeteTournee` depuis `page.tsx:367-462` **sans changement de rendu**, en exportant la fonction et en remplaçant les helpers locaux par les imports :

```tsx
import type { MissionTourneeVue } from "@/lib/data/ma-journee";
import type { Tournee } from "@/lib/types/clinical";
import { estimerHeureFin, formatDateTournee } from "@/lib/tournee-vue";

export function EnTeteTournee({
  missions,
  tournee,
}: {
  missions: MissionTourneeVue[];
  tournee: Tournee;
}) {
```

Le corps (calculs `total`/`valides`/`restants`/`pct`/`heureFin`/`maintenant` et tout le JSX) est repris tel quel depuis `page.tsx:374-461`.

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run components/ui/EnTeteTournee.test.tsx`
Expected: PASS — 5 tests.

- [ ] **Step 5 : Commit**

```bash
git add components/ui/EnTeteTournee.tsx components/ui/EnTeteTournee.test.tsx
git commit -m "Extrait l'en-tête de la page Ma tournée"
```

---

### Task 4 : `components/ui/OngletsFiltresTournee.tsx`

**Files:**
- Create: `components/ui/OngletsFiltresTournee.tsx`
- Test: `components/ui/OngletsFiltresTournee.test.tsx`
- Source à déplacer: `app/(app)/ma-tournee/page.tsx:464-513`

**Interfaces:**
- Consumes: `Filtre`, `CountsMissions` depuis `@/lib/tournee-vue` (Task 1)
- Produces: `OngletsFiltresTournee({ filtre, counts })` avec `counts: CountsMissions`

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `components/ui/OngletsFiltresTournee.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OngletsFiltresTournee } from "./OngletsFiltresTournee";

const counts = { tout: 8, a_faire: 5, alertes: 3, valides: 2 };

describe("OngletsFiltresTournee", () => {
  it("affiche les quatre onglets avec leur comptage", () => {
    render(<OngletsFiltresTournee filtre="tout" counts={counts} />);

    expect(screen.getByRole("link", { name: /Tout/ })).toHaveTextContent("8");
    expect(screen.getByRole("link", { name: /À faire/ })).toHaveTextContent("5");
    expect(screen.getByRole("link", { name: /Alertes/ })).toHaveTextContent("3");
    expect(screen.getByRole("link", { name: /Validés/ })).toHaveTextContent("2");
  });

  it("marque l'onglet actif pour les lecteurs d'écran", () => {
    render(<OngletsFiltresTournee filtre="alertes" counts={counts} />);

    expect(screen.getByRole("link", { name: /Alertes/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Tout/ })).not.toHaveAttribute("aria-current");
  });

  it("« Tout » revient à la page sans paramètre, les autres filtrent", () => {
    render(<OngletsFiltresTournee filtre="tout" counts={counts} />);

    expect(screen.getByRole("link", { name: /Tout/ })).toHaveAttribute("href", "/ma-tournee");
    expect(screen.getByRole("link", { name: /À faire/ })).toHaveAttribute(
      "href",
      "/ma-tournee?filtre=a_faire"
    );
    expect(screen.getByRole("link", { name: /Validés/ })).toHaveAttribute(
      "href",
      "/ma-tournee?filtre=valides"
    );
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run components/ui/OngletsFiltresTournee.test.tsx`
Expected: FAIL — `Failed to resolve import "./OngletsFiltresTournee"`.

- [ ] **Step 3 : Créer le composant**

```tsx
import Link from "next/link";
import type { CountsMissions, Filtre } from "@/lib/tournee-vue";

export function OngletsFiltresTournee({
  filtre,
  counts,
}: {
  filtre: Filtre;
  counts: CountsMissions;
}) {
  const onglets: { label: string; clef: Filtre; count: number }[] = [
    { label: "Tout", clef: "tout", count: counts.tout },
    { label: "À faire", clef: "a_faire", count: counts.a_faire },
    { label: "Alertes", clef: "alertes", count: counts.alertes },
    { label: "Validés", clef: "valides", count: counts.valides },
  ];

  // Pas de conteneur défilable : les quatre onglets tiennent dans la largeur
  // contrainte, et un conteneur défilable rogne sur ses quatre côtés — c'est
  // ce qui tranchait le bouton actif du menu Explorer (commit 5ca03ab).
  return (
    <div className="flex gap-2 border-b border-navy/[0.07] bg-white px-4 py-3">
      <div className="mx-auto flex w-full max-w-2xl gap-2">
        {onglets.map((o) => {
          const actif = filtre === o.clef;
          return (
            <Link
              key={o.clef}
              href={o.clef === "tout" ? "/ma-tournee" : `/ma-tournee?filtre=${o.clef}`}
              aria-current={actif ? "page" : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-colors ${
                actif
                  ? "bg-navy text-white"
                  : "border border-navy/12 bg-white text-navy/55 hover:bg-navy/[0.04]"
              }`}
            >
              {o.label}
              <span
                className={`min-w-[18px] rounded-full px-1.5 py-px text-center text-[10px] font-bold ${
                  actif ? "bg-white/15 text-white/80" : "bg-navy/[0.07] text-navy/50"
                }`}
              >
                {o.count}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run components/ui/OngletsFiltresTournee.test.tsx`
Expected: PASS — 3 tests.

- [ ] **Step 5 : Commit**

```bash
git add components/ui/OngletsFiltresTournee.tsx components/ui/OngletsFiltresTournee.test.tsx
git commit -m "Extrait les onglets de filtre et marque l'onglet actif pour les lecteurs d'écran"
```

---

### Task 5 : Réduire `page.tsx` à l'assemblage

**Files:**
- Modify: `app/(app)/ma-tournee/page.tsx` (619 lignes → ~75)

**Interfaces:**
- Consumes: `CarteMissionTournee` (Task 2), `EnTeteTournee` (Task 3), `OngletsFiltresTournee` (Task 4), `Filtre`/`compterMissions`/`filtrerMissions` (Task 1)
- Produces: rien — c'est la feuille de l'arbre

- [ ] **Step 1 : Remplacer intégralement le contenu de `page.tsx`**

```tsx
import Link from "next/link";
import { createClient, getUtilisateurConnecte } from "@/lib/supabase/server";
import {
  getMissionEnCoursHref,
  getMissionsTourneeVue,
  getTourneeDuJour,
  type MissionTourneeVue,
} from "@/lib/data/ma-journee";
import { CarteMissionTournee } from "@/components/ui/CarteMissionTournee";
import { EnTeteTournee } from "@/components/ui/EnTeteTournee";
import { OngletsFiltresTournee } from "@/components/ui/OngletsFiltresTournee";
import { compterMissions, filtrerMissions, type Filtre } from "@/lib/tournee-vue";
import type { Tournee } from "@/lib/types/clinical";

export default async function MaTourneePage({
  searchParams,
}: {
  searchParams: Promise<{ filtre?: string }>;
}) {
  const { filtre: filtreParam } = await searchParams;
  const filtre: Filtre =
    filtreParam === "a_faire" || filtreParam === "alertes" || filtreParam === "valides"
      ? filtreParam
      : "tout";

  const supabase = await createClient();
  const user = await getUtilisateurConnecte();

  const tournee: Tournee | null = user ? await getTourneeDuJour(supabase, user.id) : null;

  const [missions, contexte] = tournee
    ? await Promise.all([
        getMissionsTourneeVue(supabase, tournee.id),
        getMissionEnCoursHref(supabase, tournee.id),
      ])
    : [[] as MissionTourneeVue[], null];

  const counts = compterMissions(missions);
  const missionsFiltrees = filtrerMissions(missions, filtre);

  return (
    <main className="min-h-screen bg-[#F6F7F5]" aria-label="Ma tournée">
      {tournee ? (
        <>
          <EnTeteTournee missions={missions} tournee={tournee} />
          <OngletsFiltresTournee filtre={filtre} counts={counts} />

          <div className="mx-auto max-w-2xl px-4 pt-4 pb-8">
            {missionsFiltrees.length > 0 ? (
              missionsFiltrees.map((mission, index) => (
                <CarteMissionTournee
                  key={mission.id}
                  mission={mission}
                  contexteHref={mission.id === contexte?.missionId ? contexte.href : undefined}
                  estDerniere={index === missionsFiltrees.length - 1}
                />
              ))
            ) : (
              <div className="mt-12 text-center">
                <p className="text-[15px] font-semibold text-navy/40">
                  Aucune mission dans cette catégorie
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-violet/10">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8 text-brand-violet"
              aria-hidden="true"
            >
              <path d="M4 18.5h3.5a3 3 0 0 0 0-6h-3a3 3 0 0 1 0-6H20" />
              <circle cx="18.5" cy="18.5" r="2" />
              <path d="M17.5 6.5 20 4l-2.5-2.5" />
            </svg>
          </div>
          <p className="mt-5 text-[18px] font-bold text-navy/80">
            Aucune tournée pour aujourd&apos;hui
          </p>
          <p className="mx-auto mt-2 max-w-[300px] text-[14px] leading-relaxed text-navy/45">
            Vos missions du jour apparaîtront ici dès qu&apos;une tournée sera générée.
          </p>
          <Link
            href="/ma-journee"
            className="mt-6 rounded-[14px] bg-gradient-to-r from-brand-violet to-brand-rose px-6 py-3 text-[14px] font-semibold text-white shadow-[0_4px_16px_rgba(124,58,237,0.32)]"
          >
            Aller à l&apos;accueil
          </Link>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 2 : Lancer toute la suite de tests**

Run: `npm test`
Expected: PASS — aucune régression, les 33 nouveaux tests inclus.

- [ ] **Step 3 : Vérifier le lint**

Run: `npm run lint`
Expected: aucune erreur, aucun avertissement nouveau. Si `IconeSoin` ou un import devenu inutile est signalé dans `page.tsx`, le retirer.

- [ ] **Step 4 : Vérifier la compilation**

Run: `npm run build`
Expected: build réussi, `/ma-tournee` listée dans les routes.

- [ ] **Step 5 : Commit**

```bash
git add "app/(app)/ma-tournee/page.tsx"
git commit -m "Réduit la page Ma tournée à la lecture des données et à l'assemblage"
```

---

## Vérification finale

- [ ] `npm test` — suite complète au vert
- [ ] `npm run lint` — propre
- [ ] `npm run build` — compile
- [ ] `git diff main --stat` — seuls les fichiers listés dans la table File Structure apparaissent
- [ ] Relecture visuelle de `/ma-tournee` par la fondatrice, comparée à `Ma Tournée.md` : consignes en pied de carte, aucun encart ambre, avatar `MA` pour « M. Martin », badge « Alertes » aligné sur le nombre de missions affichées quand on clique dessus
