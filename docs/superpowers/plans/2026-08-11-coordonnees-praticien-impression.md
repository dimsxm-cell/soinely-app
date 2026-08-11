# Coordonnées du praticien à l'impression — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à une IDEL de faire figurer ses coordonnées professionnelles (nom, adresse, téléphone, ADELI/RPPS) sur tout document imprimé depuis Soinely, pré-remplies depuis son profil et modifiables juste avant d'imprimer.

**Architecture:** Deux nouvelles colonnes sur `public.profiles` donnent au bloc imprimé une source unique. Trois composants client se partagent l'état modifiable par un contexte React — le fournisseur, le bloc imprimé, la barre d'impression — parce que le bloc et l'éditeur doivent vivre à des endroits libres de la page (en-tête sur les documents patient, pied de page sur les fiches d'Explorer) tout en portant la même valeur. Les trois fiches d'Explorer, qui n'étaient pas imprimables, le deviennent.

**Tech Stack:** Next.js App Router (Server Components par défaut, `"use client"` là où l'interaction l'exige), Supabase (Postgres + RLS), Server Actions, Tailwind CSS v4 (variante `print:`), Vitest + Testing Library.

## Global Constraints

- Le bloc n'affiche **que les champs renseignés** : un profil sans téléphone ne laisse aucune ligne vide.
- Sur les fiches d'Explorer, le bloc se pose **en pied de page, sous la section « Sources »** — jamais en en-tête. Ces fiches sont du contenu de référence partagé (protocoles, repères juridiques issus des fiches de l'Ordre National des Infirmiers) : des coordonnées en tête se liraient comme une signature et laisseraient croire que l'IDEL en est l'autrice.
- Sur les quatre documents patient, le bloc se pose **en en-tête**.
- La modification faite avant impression est **éphémère par défaut** : le profil n'est écrit que si la case « enregistrer dans mon profil » est cochée.
- Un échec d'enregistrement dans le profil **n'empêche jamais d'imprimer** : la valeur saisie reste valable pour l'impression en cours.
- Aucune modification du contenu des fiches ni de la mention de source : les coordonnées s'ajoutent **sous** elle, sans s'y substituer.
- Conventions du dépôt : composants en PascalCase français dans `components/ui/`, tests Vitest colocalisés (`*.test.tsx`), commentaires et libellés en français.

---

### Task 1 : Migration — `telephone` et `adeli_rpps` sur `profiles`

**Files:**
- Create: `supabase/migrations/20260811010000_coordonnees_praticien.sql`
- Modify: `lib/types/database.types.ts:485-520`

**Interfaces:**
- Produces: colonnes `public.profiles.telephone text` et `public.profiles.adeli_rpps text`, consommées par la Task 2.

- [ ] **Step 1 : Écrire la migration**

```sql
-- Coordonnées professionnelles imprimables sur les documents émis depuis
-- Soinely. Le téléphone n'existait nulle part. Le numéro ADELI/RPPS était
-- collecté à l'inscription (app/login/actions.ts) mais rangé dans les seules
-- métadonnées d'authentification : jamais réaffiché, jamais modifiable — une
-- faute de frappe y était définitive.
alter table public.profiles
  add column if not exists telephone text,
  add column if not exists adeli_rpps text;

comment on column public.profiles.telephone is
  'Téléphone professionnel, imprimé sur les documents émis par l''IDEL.';
comment on column public.profiles.adeli_rpps is
  'Identifiant professionnel ADELI ou RPPS. Repris des métadonnées d''authentification, où l''inscription le déposait sans permettre de le corriger.';

-- Reprise des saisies déjà faites à l'inscription, pour n'en perdre aucune.
update public.profiles p
   set adeli_rpps = u.raw_user_meta_data ->> 'adeli_rpps'
  from auth.users u
 where u.id = p.id
   and p.adeli_rpps is null
   and nullif(u.raw_user_meta_data ->> 'adeli_rpps', '') is not null;
```

- [ ] **Step 2 : Déclarer les colonnes dans les types générés**

Dans `lib/types/database.types.ts`, le bloc `profiles` a trois sections — `Row`, `Insert`, `Update`. Ajouter la ligne à chacune, à côté de `adresse_cabinet` :

- dans `Row` : `adeli_rpps: string | null` et `telephone: string | null`
- dans `Insert` : `adeli_rpps?: string | null` et `telephone?: string | null`
- dans `Update` : `adeli_rpps?: string | null` et `telephone?: string | null`

- [ ] **Step 3 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 4 : Commit**

```bash
git add supabase/migrations/20260811010000_coordonnees_praticien.sql lib/types/database.types.ts
git commit -m "feat(compte): ajoute telephone et ADELI/RPPS au profil"
```

---

### Task 2 : `getCoordonneesPraticien`

**Files:**
- Modify: `lib/data/profil.ts`
- Test: `lib/data/profil.test.ts` (nouveau fichier)

**Interfaces:**
- Consumes: colonnes de la Task 1.
- Produces:
  ```ts
  export interface CoordonneesPraticien {
    nom: string;
    adresse: string;
    codePostal: string;
    telephone: string;
    adeliRpps: string;
  }
  export async function getCoordonneesPraticien(
    supabase: SupabaseClient<Database>,
    userId: string
  ): Promise<CoordonneesPraticien>
  ```
  Consommée par les Tasks 5 et 6. Rend toujours un objet : les champs absents valent `""`, jamais `null`, pour que le bloc n'ait qu'un seul cas à traiter.

- [ ] **Step 1 : Écrire le test qui échoue**

```ts
// lib/data/profil.test.ts
import { describe, expect, it, vi } from "vitest";
import { getCoordonneesPraticien } from "./profil";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

function clientAvec(data: unknown, error: unknown = null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data, error }),
        }),
      }),
    }),
  } as unknown as SupabaseClient<Database>;
}

describe("getCoordonneesPraticien", () => {
  it("rend les coordonnees completes", async () => {
    const c = await getCoordonneesPraticien(
      clientAvec({
        full_name: "Sophie Lambert",
        adresse_cabinet: "15 rue Schoelcher",
        code_postal: "97110",
        telephone: "0690123456",
        adeli_rpps: "971234567",
      }),
      "u1"
    );
    expect(c).toEqual({
      nom: "Sophie Lambert",
      adresse: "15 rue Schoelcher",
      codePostal: "97110",
      telephone: "0690123456",
      adeliRpps: "971234567",
    });
  });

  it("remplace les champs absents par une chaine vide, jamais null", async () => {
    const c = await getCoordonneesPraticien(
      clientAvec({
        full_name: "Sophie Lambert",
        adresse_cabinet: null,
        code_postal: null,
        telephone: null,
        adeli_rpps: null,
      }),
      "u1"
    );
    expect(c).toEqual({
      nom: "Sophie Lambert",
      adresse: "",
      codePostal: "",
      telephone: "",
      adeliRpps: "",
    });
  });

  it("rend des champs vides quand le profil est introuvable", async () => {
    const c = await getCoordonneesPraticien(clientAvec(null), "inconnu");
    expect(c).toEqual({ nom: "", adresse: "", codePostal: "", telephone: "", adeliRpps: "" });
  });

  it("rend des champs vides et journalise en cas d'erreur", async () => {
    const c = await getCoordonneesPraticien(clientAvec(null, { message: "boom" }), "u1");
    expect(c.nom).toBe("");
  });
});
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run: `npx vitest run lib/data/profil.test.ts`
Expected: FAIL — `getCoordonneesPraticien` n'est pas exportée.

- [ ] **Step 3 : Écrire l'implémentation**

Ajouter à la fin de `lib/data/profil.ts` :

```ts
export interface CoordonneesPraticien {
  nom: string;
  adresse: string;
  codePostal: string;
  telephone: string;
  adeliRpps: string;
}

const COORDONNEES_VIDES: CoordonneesPraticien = {
  nom: "",
  adresse: "",
  codePostal: "",
  telephone: "",
  adeliRpps: "",
};

/**
 * Coordonnées professionnelles imprimées sur les documents émis par l'IDEL.
 *
 * Rend toujours un objet, jamais `null` : un profil incomplet n'est pas une
 * erreur, et le bloc imprimé n'a ainsi qu'un seul cas à traiter — une chaîne
 * vide se teste, un `null` se serait propagé jusqu'au rendu.
 */
export async function getCoordonneesPraticien(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<CoordonneesPraticien> {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, adresse_cabinet, code_postal, telephone, adeli_rpps")
    .eq("id", userId)
    .maybeSingle();

  if (error) journaliserEchec("getCoordonneesPraticien", error);
  if (error || !data) return COORDONNEES_VIDES;

  return {
    nom: data.full_name ?? "",
    adresse: data.adresse_cabinet ?? "",
    codePostal: data.code_postal ?? "",
    telephone: data.telephone ?? "",
    adeliRpps: data.adeli_rpps ?? "",
  };
}
```

- [ ] **Step 4 : Lancer le test pour le voir passer**

Run: `npx vitest run lib/data/profil.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5 : Commit**

```bash
git add lib/data/profil.ts lib/data/profil.test.ts
git commit -m "feat(compte): lit les coordonnees professionnelles du praticien"
```

---

### Task 3 : Champs téléphone et ADELI/RPPS sur `/compte`

**Files:**
- Modify: `components/ui/FormulaireCabinet.tsx`
- Modify: `lib/data/profil-actions.ts:68-137`
- Modify: `app/(app)/compte/page.tsx`

**Interfaces:**
- Consumes: colonnes de la Task 1.
- Produces: `enregistrerCabinetAction` accepte deux champs de plus, `telephone` et `adeliRpps`. `FormulaireCabinet` gagne deux props, `telephone: string` et `adeliRpps: string`.

- [ ] **Step 1 : Étendre la Server Action**

Dans `lib/data/profil-actions.ts`, dans `enregistrerCabinetAction`, juste après la ligne `const adresseCabinet = adresseSaisie === "" ? null : adresseSaisie;`, ajouter :

```ts
  // Champs libres : ni format ni longueur imposés. Un numéro se note « 0690 12
  // 34 56 » comme « +590690123456 », et un ADELI comme un RPPS n'ont pas la
  // même longueur — refuser une saisie ici ferait perdre une coordonnée juste
  // parce qu'elle est écrite autrement.
  const telephoneSaisi = String(formData.get("telephone") ?? "").trim();
  const telephone = telephoneSaisi === "" ? null : telephoneSaisi;

  const adeliSaisi = String(formData.get("adeliRpps") ?? "").trim();
  const adeliRpps = adeliSaisi === "" ? null : adeliSaisi;
```

Puis, dans l'appel `.update({ ... })`, ajouter les deux colonnes après `cabinet_longitude` :

```ts
      cabinet_longitude: position?.longitude ?? null,
      telephone,
      adeli_rpps: adeliRpps,
```

- [ ] **Step 2 : Ajouter les deux champs au formulaire**

Dans `components/ui/FormulaireCabinet.tsx`, étendre la signature :

```tsx
export function FormulaireCabinet({
  codePostal,
  adresseCabinet,
  telephone,
  adeliRpps,
  zone,
}: {
  codePostal: string;
  adresseCabinet: string;
  telephone: string;
  adeliRpps: string;
  zone: "metropole" | "dom";
}) {
```

Puis insérer ce bloc entre la `</div>` qui ferme le champ adresse et le `<div className="flex flex-wrap items-end gap-3">` du code postal :

```tsx
        <div className="flex flex-wrap gap-3">
          <div className="min-w-[160px] flex-1">
            <label htmlFor="telephone" className="block text-[13px] text-navy/55">
              Téléphone
            </label>
            <input
              id="telephone"
              name="telephone"
              type="tel"
              defaultValue={telephone}
              placeholder="0690 12 34 56"
              className="mt-1 w-full rounded-[12px] border border-navy/15 bg-white px-3 py-2 text-[15px] text-navy placeholder:text-navy/30 focus:border-brand-violet focus:outline-none focus:ring-2 focus:ring-brand-violet/30"
            />
          </div>
          <div className="min-w-[160px] flex-1">
            <label htmlFor="adeliRpps" className="block text-[13px] text-navy/55">
              Numéro ADELI / RPPS
            </label>
            <input
              id="adeliRpps"
              name="adeliRpps"
              type="text"
              defaultValue={adeliRpps}
              placeholder="971234567"
              className="mt-1 w-full rounded-[12px] border border-navy/15 bg-white px-3 py-2 text-[15px] tabular-nums text-navy placeholder:text-navy/30 focus:border-brand-violet focus:outline-none focus:ring-2 focus:ring-brand-violet/30"
            />
          </div>
        </div>
```

- [ ] **Step 3 : Passer les deux valeurs depuis la page**

Dans `app/(app)/compte/page.tsx`, la requête ne sélectionne pas encore ces colonnes. Ligne 55, remplacer :

```tsx
    supabase.from("profiles").select("code_postal, adresse_cabinet, cabinet_latitude").eq("id", user.id).maybeSingle(),
```

par :

```tsx
    supabase.from("profiles").select("code_postal, adresse_cabinet, cabinet_latitude, telephone, adeli_rpps").eq("id", user.id).maybeSingle(),
```

Puis, après la ligne `const adresseCabinet = profil.data?.adresse_cabinet ?? "";`, ajouter :

```tsx
  const telephone = profil.data?.telephone ?? "";
  const adeliRpps = profil.data?.adeli_rpps ?? "";
```

Enfin, compléter l'appel du composant :

```tsx
            <FormulaireCabinet
              codePostal={codePostal}
              adresseCabinet={adresseCabinet}
              telephone={telephone}
              adeliRpps={adeliRpps}
              zone={zone}
            />
```

- [ ] **Step 4 : Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

Run: `npx vitest run`
Expected: toute la suite passe.

- [ ] **Step 5 : Commit**

```bash
git add components/ui/FormulaireCabinet.tsx lib/data/profil-actions.ts "app/(app)/compte/page.tsx"
git commit -m "feat(compte): rend le telephone et l'ADELI/RPPS modifiables"
```

---

### Task 4 : Les trois composants d'impression

**Files:**
- Create: `components/ui/CoordonneesPraticien.tsx`
- Test: `components/ui/CoordonneesPraticien.test.tsx`
- Modify: `lib/data/profil-actions.ts`

**Interfaces:**
- Consumes: `CoordonneesPraticien` (Task 2).
- Produces, tous exportés depuis `components/ui/CoordonneesPraticien.tsx` :
  - `FournisseurCoordonneesPraticien({ initiales, children })`
  - `BlocCoordonneesPraticien({ className? })`
  - `BarreImpressionPraticien()`

  Consommés par les Tasks 5 et 6.
- Produces aussi : `enregistrerCoordonneesPraticienAction(formData): Promise<ResultatCabinet>` dans `lib/data/profil-actions.ts`.

- [ ] **Step 1 : Écrire les tests qui échouent**

```tsx
// components/ui/CoordonneesPraticien.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  BarreImpressionPraticien,
  BlocCoordonneesPraticien,
  FournisseurCoordonneesPraticien,
} from "./CoordonneesPraticien";
import type { CoordonneesPraticien } from "@/lib/data/profil";

vi.mock("@/lib/data/profil-actions", () => ({
  enregistrerCoordonneesPraticienAction: vi.fn(async () => ({ succes: true })),
}));

const COMPLETES: CoordonneesPraticien = {
  nom: "Sophie Lambert",
  adresse: "15 rue Schoelcher",
  codePostal: "97110",
  telephone: "0690123456",
  adeliRpps: "971234567",
};

function rendre(initiales: CoordonneesPraticien) {
  return render(
    <FournisseurCoordonneesPraticien initiales={initiales}>
      <BlocCoordonneesPraticien />
      <BarreImpressionPraticien />
    </FournisseurCoordonneesPraticien>
  );
}

describe("BlocCoordonneesPraticien", () => {
  it("affiche les coordonnees completes", () => {
    rendre(COMPLETES);
    expect(screen.getByText("Sophie Lambert")).toBeInTheDocument();
    expect(screen.getByText(/15 rue Schoelcher/)).toBeInTheDocument();
    expect(screen.getByText(/0690123456/)).toBeInTheDocument();
    expect(screen.getByText(/971234567/)).toBeInTheDocument();
  });

  it("n'affiche que les champs renseignes, sans ligne vide", () => {
    const { container } = rendre({ ...COMPLETES, telephone: "", adeliRpps: "" });
    expect(screen.getByText("Sophie Lambert")).toBeInTheDocument();
    expect(screen.queryByText(/ADELI/)).not.toBeInTheDocument();
    expect(container.querySelectorAll("[data-ligne-coordonnee]")).toHaveLength(2);
  });

  it("ne rend rien du tout quand aucun champ n'est renseigne", () => {
    const { container } = rendre({ nom: "", adresse: "", codePostal: "", telephone: "", adeliRpps: "" });
    expect(container.querySelector("[data-bloc-coordonnees]")).not.toBeInTheDocument();
  });

  it("reste invisible a l'ecran et n'apparait qu'a l'impression", () => {
    const { container } = rendre(COMPLETES);
    expect(container.querySelector("[data-bloc-coordonnees]")).toHaveClass("hidden", "print:block");
  });
});

describe("BarreImpressionPraticien", () => {
  it("pre-remplit les champs depuis le profil", () => {
    rendre(COMPLETES);
    expect(screen.getByLabelText("Nom")).toHaveValue("Sophie Lambert");
    expect(screen.getByLabelText("Téléphone")).toHaveValue("0690123456");
  });

  it("une modification se repercute immediatement sur le bloc imprime", () => {
    rendre(COMPLETES);
    fireEvent.change(screen.getByLabelText("Téléphone"), { target: { value: "0590000000" } });
    expect(screen.getByText(/0590000000/)).toBeInTheDocument();
    expect(screen.queryByText(/0690123456/)).not.toBeInTheDocument();
  });

  it("n'ecrit pas dans le profil quand la case n'est pas cochee", async () => {
    const { enregistrerCoordonneesPraticienAction } = await import("@/lib/data/profil-actions");
    rendre(COMPLETES);
    fireEvent.click(screen.getByRole("button", { name: /imprimer/i }));
    expect(enregistrerCoordonneesPraticienAction).not.toHaveBeenCalled();
  });

  it("est masquee a l'impression", () => {
    const { container } = rendre(COMPLETES);
    expect(container.querySelector("[data-barre-impression]")).toHaveClass("print:hidden");
  });
});
```

- [ ] **Step 2 : Lancer les tests pour les voir échouer**

Run: `npx vitest run components/ui/CoordonneesPraticien.test.tsx`
Expected: FAIL — `Cannot find module './CoordonneesPraticien'`.

- [ ] **Step 3 : Écrire la Server Action d'enregistrement**

Ajouter à la fin de `lib/data/profil-actions.ts` :

```ts
/**
 * Enregistre les coordonnées imprimables dans le profil, à la demande.
 *
 * Distincte de `enregistrerCabinetAction` : celle-ci géocode l'adresse, ce qui
 * n'a pas lieu d'être quand l'IDEL corrige une coordonnée juste avant
 * d'imprimer. Un échec ici n'empêche pas d'imprimer — la valeur saisie reste
 * valable pour l'impression en cours.
 */
export async function enregistrerCoordonneesPraticienAction(
  formData: FormData
): Promise<ResultatCabinet> {
  const valeurOuNull = (clef: string) => {
    const v = String(formData.get(clef) ?? "").trim();
    return v === "" ? null : v;
  };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { succes: false, erreur: "Vous devez être connectée." };

  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: String(formData.get("nom") ?? "").trim() || user.email || "",
      adresse_cabinet: valeurOuNull("adresse"),
      code_postal: valeurOuNull("codePostal"),
      telephone: valeurOuNull("telephone"),
      adeli_rpps: valeurOuNull("adeliRpps"),
    })
    .eq("id", user.id)
    .select("id");

  if (error) {
    journaliserEchec("enregistrerCoordonneesPraticienAction", error);
    return { succes: false, erreur: `L'enregistrement a échoué : ${error.message}` };
  }

  if (!data || data.length === 0) {
    return { succes: false, erreur: "Votre profil est introuvable. Signalez-le, il doit être recréé." };
  }

  revalidatePath("/compte");
  return { succes: true };
}
```

- [ ] **Step 4 : Écrire les trois composants**

```tsx
// components/ui/CoordonneesPraticien.tsx
"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { CoordonneesPraticien } from "@/lib/data/profil";
import { enregistrerCoordonneesPraticienAction } from "@/lib/data/profil-actions";

/**
 * Coordonnées professionnelles imprimées sur les documents émis par l'IDEL.
 *
 * Trois pièces séparées, parce qu'elles se posent à des endroits différents
 * selon l'écran : le bloc en en-tête sur les documents patient, en pied de
 * page sur les fiches d'Explorer, et la barre d'impression ailleurs encore.
 * Elles partagent le même état modifiable par un contexte — c'est ce qui leur
 * permet de vivre à des endroits libres de l'arbre sans se passer de props.
 */

interface ContexteCoordonnees {
  coordonnees: CoordonneesPraticien;
  modifier: (champ: keyof CoordonneesPraticien, valeur: string) => void;
}

const Contexte = createContext<ContexteCoordonnees | null>(null);

function useCoordonnees(): ContexteCoordonnees {
  const contexte = useContext(Contexte);
  if (!contexte) {
    throw new Error("BlocCoordonneesPraticien et BarreImpressionPraticien doivent être placés dans FournisseurCoordonneesPraticien.");
  }
  return contexte;
}

export function FournisseurCoordonneesPraticien({
  initiales,
  children,
}: {
  initiales: CoordonneesPraticien;
  children: ReactNode;
}) {
  const [coordonnees, setCoordonnees] = useState(initiales);
  const modifier = (champ: keyof CoordonneesPraticien, valeur: string) =>
    setCoordonnees((c) => ({ ...c, [champ]: valeur }));

  return <Contexte.Provider value={{ coordonnees, modifier }}>{children}</Contexte.Provider>;
}

export function BlocCoordonneesPraticien({ className = "" }: { className?: string }) {
  const { coordonnees } = useCoordonnees();
  const { nom, adresse, codePostal, telephone, adeliRpps } = coordonnees;

  const lieu = [adresse, codePostal].filter(Boolean).join(", ");
  const lignes = [
    nom,
    lieu,
    telephone ? `Tél. ${telephone}` : "",
    adeliRpps ? `ADELI/RPPS ${adeliRpps}` : "",
  ].filter(Boolean);

  // Un profil entièrement vide ne doit pas laisser un cadre orphelin sur la
  // feuille imprimée.
  if (lignes.length === 0) return null;

  return (
    <div
      data-bloc-coordonnees
      className={`hidden print:block text-[12px] leading-relaxed text-navy/70 ${className}`}
    >
      {lignes.map((ligne) => (
        <div key={ligne} data-ligne-coordonnee>
          {ligne}
        </div>
      ))}
    </div>
  );
}

const CHAMPS: { clef: keyof CoordonneesPraticien; libelle: string }[] = [
  { clef: "nom", libelle: "Nom" },
  { clef: "adresse", libelle: "Adresse" },
  { clef: "codePostal", libelle: "Code postal" },
  { clef: "telephone", libelle: "Téléphone" },
  { clef: "adeliRpps", libelle: "ADELI / RPPS" },
];

export function BarreImpressionPraticien() {
  const { coordonnees, modifier } = useCoordonnees();
  const [ouvert, setOuvert] = useState(false);
  const [enregistrer, setEnregistrer] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function imprimer() {
    // L'enregistrement ne conditionne jamais l'impression : une écriture qui
    // échoue laisse la valeur saisie valable pour la feuille en cours.
    if (enregistrer) {
      const formData = new FormData();
      for (const { clef } of CHAMPS) formData.set(clef, coordonnees[clef]);
      const resultat = await enregistrerCoordonneesPraticienAction(formData);
      if (!resultat.succes) setMessage(resultat.erreur ?? "L'enregistrement a échoué.");
    }
    window.print();
  }

  return (
    <div data-barre-impression className="print:hidden flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        className="text-[13.5px] font-semibold text-brand-violet"
      >
        {ouvert ? "Masquer mes coordonnées" : "Vérifier mes coordonnées"}
      </button>

      {ouvert && (
        <div className="w-full max-w-[520px] rounded-[16px] border border-navy/10 bg-white p-4">
          <div className="flex flex-col gap-3">
            {CHAMPS.map(({ clef, libelle }) => (
              <div key={clef}>
                <label htmlFor={`coord-${clef}`} className="block text-[13px] text-navy/55">
                  {libelle}
                </label>
                <input
                  id={`coord-${clef}`}
                  type="text"
                  value={coordonnees[clef]}
                  onChange={(e) => modifier(clef, e.target.value)}
                  className="mt-1 w-full rounded-[12px] border border-navy/15 bg-white px-3 py-2 text-[15px] text-navy focus:border-brand-violet focus:outline-none focus:ring-2 focus:ring-brand-violet/30"
                />
              </div>
            ))}
          </div>

          <label className="mt-3 flex items-center gap-2 text-[13.5px] text-navy/70">
            <input
              type="checkbox"
              checked={enregistrer}
              onChange={(e) => setEnregistrer(e.target.checked)}
              className="h-4 w-4"
            />
            Enregistrer dans mon profil
          </label>

          {message && <p className="mt-2 text-[13px] text-danger">{message}</p>}
        </div>
      )}

      <button
        type="button"
        onClick={imprimer}
        className="btn-glace flex items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-brand-violet to-brand-rose px-5 py-3 text-[14.5px] font-semibold text-white shadow-[0_8px_20px_rgba(124,58,237,0.28)]"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9V2h12v7" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
        Imprimer
      </button>
    </div>
  );
}
```

- [ ] **Step 5 : Lancer les tests pour les voir passer**

Run: `npx vitest run components/ui/CoordonneesPraticien.test.tsx`
Expected: PASS (9 tests).

- [ ] **Step 6 : Commit**

```bash
git add components/ui/CoordonneesPraticien.tsx components/ui/CoordonneesPraticien.test.tsx lib/data/profil-actions.ts
git commit -m "feat(impression): bloc de coordonnees du praticien, modifiable avant impression"
```

---

### Task 5 : Pose sur les quatre documents patient, en en-tête

**Files:**
- Modify: `app/(app)/patients/[id]/documents/consentement/page.tsx`
- Modify: `app/(app)/patients/[id]/documents/renoncement/page.tsx`
- Modify: `app/(app)/patients/[id]/documents/identite/page.tsx`
- Modify: `app/(app)/patients/[id]/documents/fin-de-prise-en-charge/page.tsx`

**Interfaces:**
- Consumes: `getCoordonneesPraticien` (Task 2), les trois composants (Task 4).

- [ ] **Step 1 : Appliquer le même remaniement aux quatre pages**

Chacune de ces quatre pages est un Server Component qui appelle déjà `getUtilisateurConnecte()` et rend un `<BoutonImprimer />` en bas. Dans **chacune** :

1. Remplacer l'import de `BoutonImprimer` :

```tsx
import {
  BarreImpressionPraticien,
  BlocCoordonneesPraticien,
  FournisseurCoordonneesPraticien,
} from "@/components/ui/CoordonneesPraticien";
import { getCoordonneesPraticien } from "@/lib/data/profil";
```

2. Charger les coordonnées après la ligne qui récupère `user`. Ces pages font déjà un `Promise.all` : y ajouter l'appel plutôt que d'enchaîner un second aller-retour. Par exemple, dans `consentement/page.tsx`, remplacer :

```tsx
  const [user, patient] = await Promise.all([getUtilisateurConnecte(), getPatient(supabase, id)]);
```

par :

```tsx
  const [user, patient] = await Promise.all([getUtilisateurConnecte(), getPatient(supabase, id)]);
  const coordonnees = user
    ? await getCoordonneesPraticien(supabase, user.id)
    : { nom: "", adresse: "", codePostal: "", telephone: "", adeliRpps: "" };
```

Les trois autres pages ont la même forme : garder leur `Promise.all` existant et ajouter les deux lignes juste après.

3. Envelopper le contenu rendu. Le `return (` de chaque page commence par `<main …>`. Placer le fournisseur **immédiatement à l'intérieur** de `<main>`, puis poser le bloc en tout premier élément :

```tsx
    <main className="min-h-screen bg-[#F6F7F5] text-navy print:bg-white">
      <FournisseurCoordonneesPraticien initiales={coordonnees}>
        <BlocCoordonneesPraticien className="mb-4" />
        {/* … le contenu existant de la page, inchangé … */}
      </FournisseurCoordonneesPraticien>
    </main>
```

4. Remplacer le bouton d'impression en bas de page :

```tsx
        <div className="flex justify-center print:hidden">
          <BarreImpressionPraticien />
        </div>
```

- [ ] **Step 2 : Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

Run: `npx vitest run`
Expected: toute la suite passe.

- [ ] **Step 3 : Commit**

```bash
git add "app/(app)/patients/[id]/documents"
git commit -m "feat(impression): coordonnees du praticien en en-tete des documents patient"
```

---

### Task 6 : Pose sur les trois fiches d'Explorer, en pied de page

**Files:**
- Modify: `app/(app)/situations/dossier/[id]/page.tsx`
- Modify: `app/(app)/situations/[id]/page.tsx`
- Modify: `app/(app)/situations/informations-professionnelles/[id]/page.tsx`

**Interfaces:**
- Consumes: `getCoordonneesPraticien` (Task 2), les trois composants (Task 4).

Ces trois pages n'ont **aucun** bouton d'impression aujourd'hui : elles en gagnent un.

- [ ] **Step 1 : Appliquer le même remaniement aux trois pages**

Dans **chacune** :

1. Ajouter les imports :

```tsx
import {
  BarreImpressionPraticien,
  BlocCoordonneesPraticien,
  FournisseurCoordonneesPraticien,
} from "@/components/ui/CoordonneesPraticien";
import { getCoordonneesPraticien } from "@/lib/data/profil";
import { getUtilisateurConnecte } from "@/lib/supabase/server";
```

Si `getUtilisateurConnecte` ou `createClient` sont déjà importés dans le fichier, ne pas dupliquer l'import — compléter la liste existante.

2. Charger les coordonnées après la récupération de la fiche :

```tsx
  const user = await getUtilisateurConnecte();
  const coordonnees = user
    ? await getCoordonneesPraticien(supabase, user.id)
    : { nom: "", adresse: "", codePostal: "", telephone: "", adeliRpps: "" };
```

Si la page ne dispose pas déjà d'une variable `supabase`, l'obtenir avec `const supabase = await createClient();` — ces pages appellent déjà `createClient` pour charger la fiche.

3. Envelopper le contenu dans le fournisseur, comme en Task 5, en plaçant le fournisseur juste à l'intérieur de `<main>`.

4. Poser le bloc **après** la section « Sources », en tout dernier. Dans `dossier/[id]/page.tsx`, après le `</section>` qui ferme le bloc Sources :

```tsx
        <section>
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-navy/45">Sources</h2>
          <ul className="mt-3 flex flex-col gap-1.5">
            {fiche.sources.map((source) => (
              <li key={source} className="text-[13.5px] text-navy/55">
                {source}
              </li>
            ))}
          </ul>
        </section>

        {/* Sous la source, jamais au-dessus : ces fiches sont un contenu de
            référence partagé. Des coordonnées en tête se liraient comme une
            signature et laisseraient croire que l'IDEL en est l'autrice. */}
        <BlocCoordonneesPraticien className="mt-6 border-t border-navy/10 pt-3" />

        <div className="mt-6 flex justify-center print:hidden">
          <BarreImpressionPraticien />
        </div>
```

Les deux autres pages ont la même structure de fin : appliquer le même ajout après leur dernière section.

- [ ] **Step 2 : Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

Run: `npx vitest run`
Expected: toute la suite passe.

- [ ] **Step 3 : Commit**

```bash
git add "app/(app)/situations"
git commit -m "feat(impression): rend les fiches Explorer imprimables, coordonnees en pied de page"
```

---

### Task 7 : Règles d'impression

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: rien. Produces: rien que du CSS.

`app/globals.css` ne contient aucune règle `@media print` aujourd'hui — seules les classes `print:hidden` de Tailwind agissent, écran par écran.

- [ ] **Step 1 : Ajouter les règles**

Ajouter à la fin de `app/globals.css` :

```css
/* Impression des documents émis depuis Soinely — consentements, protocoles,
   fiches. Le rendu écran est pensé pour un téléphone tenu en tournée ; sur
   une feuille A4, ses fonds colorés et ses ombres coûtent de l'encre sans
   rien apporter. */
@media print {
  @page {
    size: A4;
    margin: 14mm;
  }

  body {
    background: #fff;
  }

  /* Aucune ombre à l'impression : elles se rendent en aplats gris sales. */
  [class*="shadow"] {
    box-shadow: none !important;
  }

  /* Une section ne doit pas se couper en deux au saut de page. */
  section,
  [data-bloc-coordonnees] {
    break-inside: avoid;
  }
}
```

- [ ] **Step 2 : Vérifier le build**

Run: `npx next build`
Expected: la compilation réussit.

- [ ] **Step 3 : Vérifier l'ensemble de la séquence CI, dans son ordre**

Run: `npm run lint`
Expected: 0 erreur.

Run: `npm run test`
Expected: toute la suite passe.

Run: `npm run build`
Expected: succès.

Run: `npx playwright test`
Expected: 5 tests passent.

- [ ] **Step 4 : Commit**

```bash
git add app/globals.css
git commit -m "feat(impression): regles @media print pour les documents A4"
```

---

## Note de fin

Ce plan couvre la spec
`docs/superpowers/specs/2026-08-11-coordonnees-praticien-impression-design.md`.

Restent explicitement hors périmètre, et ne doivent pas être ajoutés en
chemin : tout logo ou en-tête graphique personnalisé, toute génération de
PDF côté serveur, et toute modification du contenu des fiches ou de la
mention de source qu'elles affichent.
