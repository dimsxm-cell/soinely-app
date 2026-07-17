# Abonnements & paiement (Stripe) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Après confirmation d'email, une IDEL choisit un plan (Solo 19€/mois
ou Cabinet 39€/mois), démarre un essai Stripe de 14 jours via Stripe
Checkout, et n'accède à `/ma-journee` (et au reste de l'app) que tant que
son abonnement est `essai` ou `actif`.

**Architecture:** Nouvelle table `abonnements` (un-à-un avec `profiles`),
écrite **uniquement** par un webhook Stripe signé (jamais directement par
l'utilisateur — RLS n'autorise que la lecture de sa propre ligne). Stripe
Checkout (page hébergée) gère la saisie carte et l'essai ; un webhook
(`app/api/webhooks/stripe/route.ts`) synchronise le statut à chaque
événement Stripe. `proxy.ts` (déjà chargé de bloquer les routes protégées
aux non-connectés) gagne une 2ᵉ vérification : abonnement actif/essai
requis, sinon redirection vers `/abonnement`.

**Tech Stack:** Next.js 16 (App Router, Server Components, Route
Handlers), Supabase (RLS + client `service_role` pour le webhook),
Stripe (SDK Node officiel `stripe`), TypeScript strict, Vitest.

Spec complète : `docs/superpowers/specs/2026-07-17-abonnements-paiement-design.md`.

## Global Constraints

- **`abonnements` n'est jamais écrite par un client authentifié** — seule
  policy RLS : `select` sur sa propre ligne (`auth.uid() = profile_id`).
  Toute écriture passe par le webhook Stripe, avec le client
  `service_role` (contourne RLS intentionnellement, c'est le seul endroit
  du projet où `service_role` est utilisé côté application — jusqu'ici
  uniquement utilisé par le contrôleur pour des scripts de vérification
  hors app).
- **Le webhook doit vérifier la signature Stripe** (`stripe.webhooks.constructEvent`
  avec `STRIPE_WEBHOOK_SECRET`) avant de traiter quoi que ce soit — un
  payload non signé correctement est rejeté avec un 400, jamais traité.
- **`createCheckoutSessionAction` ne modifie jamais `abonnements`
  directement** — elle crée seulement une session Stripe Checkout et
  redirige. Toute écriture en base arrive plus tard, via le webhook.
- **2 plans, mêmes fonctionnalités** — `plan` n'affecte que le prix
  Stripe utilisé et le libellé affiché, aucune fonctionnalité de l'app
  ne doit être conditionnée à `plan === 'cabinet'` vs `'solo'`.
- **`proxy.ts`** : la vérification d'abonnement s'ajoute **après** la
  vérification d'authentification existante, ne la remplace pas.
  `/abonnement` et `/abonnement/succes` restent hors du `matcher` (comme
  `/login` aujourd'hui) — accessibles sans abonnement actif, sinon
  personne ne pourrait jamais en souscrire un.
- `SupabaseClient<Database>` partout côté client utilisateur ; le client
  `service_role` est un type distinct (voir Tâche 2), jamais mélangé
  avec le client utilisateur normal.
- **`npm run build` est une étape obligatoire** dans chaque tâche.
- Pas de nouveau test e2e Playwright pour le Checkout Stripe lui-même
  (hors de portée sans environnement Stripe réel).
- **Aucune tâche de ce plan n'a besoin de vraies clés Stripe pour
  compiler/tester** — tous les appels Stripe sont mockés dans les tests.
  Les vraies clés ne sont nécessaires qu'à la vérification manuelle
  finale (Tâche 6, avec autorisation explicite du fondateur).

---

### Task 1: Migration — table abonnements

**Files:**
- Create: `supabase/migrations/20260717000100_abonnements.sql`

**Interfaces:**
- Produces : table `public.abonnements` (colonnes : `id`, `profile_id`,
  `plan`, `statut`, `stripe_customer_id`, `stripe_subscription_id`,
  `essai_fin`, `periode_fin`, `created_at`, `updated_at`) + policy
  `abonnements_owner_select` — consommées par les Tâches 2-5.

- [ ] **Step 1: Écrire la migration**

Créer `supabase/migrations/20260717000100_abonnements.sql` :

```sql
create table public.abonnements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  plan text not null check (plan in ('solo', 'cabinet')),
  statut text not null default 'essai' check (statut in ('essai', 'actif', 'impaye', 'annule')),
  stripe_customer_id text,
  stripe_subscription_id text,
  essai_fin timestamptz,
  periode_fin timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.abonnements enable row level security;

-- Seule policy : lecture de sa propre ligne. Aucune policy d'écriture —
-- toute écriture passe par le webhook Stripe via le client service_role,
-- qui contourne RLS. Un utilisateur ne doit jamais pouvoir se donner
-- lui-même un statut "actif".
create policy "abonnements_owner_select" on public.abonnements
  for select using (auth.uid() = profile_id);
```

- [ ] **Step 2: Vérifier par relecture**

Relire le fichier créé et le comparer ligne à ligne au bloc SQL
ci-dessus. Confirmer qu'aucune policy `insert`/`update`/`delete` n'est
présente (c'est volontaire, pas un oubli). Aucune commande à exécuter
ici — migration appliquée au projet distant séparément, avec
autorisation explicite du fondateur.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260717000100_abonnements.sql
git commit -m "feat(db): table abonnements (essai/actif/impaye/annule)"
```

---

### Task 2: SDK Stripe + client Supabase admin + types

**Files:**
- Modify: `package.json` (ajout dépendance `stripe`)
- Create: `lib/supabase/admin.ts`
- Modify: `lib/types/database.types.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces : `createAdminClient(): SupabaseClient<Database>` (client
  `service_role`, bypass RLS) — consommée par la Tâche 4 (webhook) ;
  `Database["public"]["Tables"]["abonnements"]` complet — consommé par
  les Tâches 3-5.

- [ ] **Step 1: Installer le SDK Stripe**

Run: `npm install stripe`
Expected: `stripe` ajouté à `dependencies` dans `package.json`.

- [ ] **Step 2: Créer le client Supabase admin (`lib/supabase/admin.ts`)**

```ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

// Client service_role : contourne RLS. Réservé au webhook Stripe
// (app/api/webhooks/stripe/route.ts) — jamais utilisé pour une requête
// initiée par un utilisateur, jamais exposé au navigateur.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

- [ ] **Step 3: Étendre les types générés (`lib/types/database.types.ts`)**

Dans le bloc `public.Tables`, ajouter (ordre alphabétique, avant
`missions_cliniques`) :

```ts
      abonnements: {
        Row: {
          id: string
          profile_id: string
          plan: string
          statut: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          essai_fin: string | null
          periode_fin: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          plan: string
          statut?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          essai_fin?: string | null
          periode_fin?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          plan?: string
          statut?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          essai_fin?: string | null
          periode_fin?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "abonnements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
```

- [ ] **Step 4: Documenter les variables d'environnement (`.env.example`)**

Remplacer le contenu de `.env.example` par :

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_SOLO=
STRIPE_PRICE_ID_CABINET=
```

- [ ] **Step 5: Vérifier la compilation**

Run: `npm run build`
Expected: PASS (0 erreur TypeScript) — `STRIPE_SECRET_KEY` etc. ne sont
pas encore lus par du code à ce stade, seule la table de types et le
client admin existent.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/supabase/admin.ts lib/types/database.types.ts .env.example
git commit -m "feat(abonnements): SDK Stripe, client Supabase admin, types"
```

---

### Task 3: Couche données + Server Action de Checkout

**Files:**
- Create: `lib/data/abonnement.ts`
- Create: `lib/data/abonnement.test.ts`
- Create: `lib/data/abonnement-actions.ts`
- Create: `lib/data/abonnement-actions.test.ts`

**Interfaces:**
- Consomme : la table de la Tâche 1, les types de la Tâche 2.
- Produces : `getAbonnement(supabase, profileId): Promise<Abonnement | null>`,
  `createCheckoutSessionAction(formData): Promise<void>` — consommées par
  les Tâches 5 (proxy) et 6 (écran).
- `Abonnement` (nouveau type, `lib/types/clinical.ts` ou un nouveau
  `lib/types/abonnement.ts` — ce plan choisit un fichier dédié pour ne
  pas mélanger avec les types cliniques) :

```ts
export type PlanAbonnement = "solo" | "cabinet";
export type StatutAbonnement = "essai" | "actif" | "impaye" | "annule";

export interface Abonnement {
  plan: PlanAbonnement;
  statut: StatutAbonnement;
}
```

- [ ] **Step 1: Écrire le type (`lib/types/abonnement.ts`)**

```ts
export type PlanAbonnement = "solo" | "cabinet";
export type StatutAbonnement = "essai" | "actif" | "impaye" | "annule";

export interface Abonnement {
  plan: PlanAbonnement;
  statut: StatutAbonnement;
}
```

- [ ] **Step 2: Écrire le test qui échoue d'abord (`lib/data/abonnement.test.ts`)**

```ts
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("getAbonnement", () => {
  it("retourne l'abonnement du profil s'il existe", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: { plan: "solo", statut: "essai" }, error: null }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getAbonnement } = await import("./abonnement");
    const abonnement = await getAbonnement(fakeClient, "p1");

    expect(abonnement).toEqual({ plan: "solo", statut: "essai" });
  });

  it("retourne null si le profil n'a pas encore d'abonnement", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getAbonnement } = await import("./abonnement");
    const abonnement = await getAbonnement(fakeClient, "p1");

    expect(abonnement).toBeNull();
  });
});
```

- [ ] **Step 3: Lancer le test et vérifier qu'il échoue**

Run: `npx vitest run lib/data/abonnement.test.ts`
Expected: FAIL — `./abonnement` n'existe pas encore.

- [ ] **Step 4: Implémenter (`lib/data/abonnement.ts`)**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import type { Abonnement, PlanAbonnement, StatutAbonnement } from "@/lib/types/abonnement";

export async function getAbonnement(
  supabase: SupabaseClient<Database>,
  profileId: string
): Promise<Abonnement | null> {
  const { data, error } = await supabase
    .from("abonnements")
    .select("plan, statut")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    plan: data.plan as PlanAbonnement,
    statut: data.statut as StatutAbonnement,
  };
}
```

- [ ] **Step 5: Lancer le test et vérifier qu'il passe**

Run: `npx vitest run lib/data/abonnement.test.ts`
Expected: PASS (2/2)

- [ ] **Step 6: Écrire les tests de l'action de Checkout qui échouent d'abord (`lib/data/abonnement-actions.test.ts`)**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const eqSelectMock = vi.fn();
const selectMock = vi.fn(() => ({ eq: () => ({ maybeSingle: eqSelectMock }) }));
const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  }),
}));

vi.mock("next/headers", () => ({
  headers: () => new Map([["origin", "https://soinely.app"]]),
}));

const checkoutSessionsCreateMock = vi.fn();
vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => ({
    checkout: { sessions: { create: checkoutSessionsCreateMock } },
  })),
}));

const redirectMock = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_PRICE_ID_SOLO = "price_solo_test";
  process.env.STRIPE_PRICE_ID_CABINET = "price_cabinet_test";
});

describe("createCheckoutSessionAction", () => {
  it("crée une session Checkout avec le bon prix et redirige vers son URL", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1", email: "marie@example.com" } } });
    eqSelectMock.mockResolvedValue({ data: null, error: null });
    checkoutSessionsCreateMock.mockResolvedValue({ url: "https://checkout.stripe.com/session_123" });

    const { createCheckoutSessionAction } = await import("./abonnement-actions");

    const formData = new FormData();
    formData.set("plan", "solo");

    await createCheckoutSessionAction(formData);

    expect(checkoutSessionsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        client_reference_id: "u1",
        line_items: [{ price: "price_solo_test", quantity: 1 }],
        subscription_data: { trial_period_days: 14 },
        success_url: "https://soinely.app/abonnement/succes",
        cancel_url: "https://soinely.app/abonnement",
      })
    );
    expect(redirectMock).toHaveBeenCalledWith("https://checkout.stripe.com/session_123");
  });

  it("utilise le prix cabinet quand plan=cabinet", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1", email: "marie@example.com" } } });
    eqSelectMock.mockResolvedValue({ data: null, error: null });
    checkoutSessionsCreateMock.mockResolvedValue({ url: "https://checkout.stripe.com/session_456" });

    const { createCheckoutSessionAction } = await import("./abonnement-actions");

    const formData = new FormData();
    formData.set("plan", "cabinet");

    await createCheckoutSessionAction(formData);

    expect(checkoutSessionsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ line_items: [{ price: "price_cabinet_test", quantity: 1 }] })
    );
  });

  it("réutilise le stripe_customer_id existant s'il y en a déjà un", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1", email: "marie@example.com" } } });
    eqSelectMock.mockResolvedValue({ data: { stripe_customer_id: "cus_existant" }, error: null });
    checkoutSessionsCreateMock.mockResolvedValue({ url: "https://checkout.stripe.com/session_789" });

    const { createCheckoutSessionAction } = await import("./abonnement-actions");

    const formData = new FormData();
    formData.set("plan", "solo");

    await createCheckoutSessionAction(formData);

    expect(checkoutSessionsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_existant" })
    );
  });

  it("ne fait rien si l'utilisateur n'est pas authentifié", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const { createCheckoutSessionAction } = await import("./abonnement-actions");

    const formData = new FormData();
    formData.set("plan", "solo");

    await createCheckoutSessionAction(formData);

    expect(checkoutSessionsCreateMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("ne fait rien si le plan est inconnu", async () => {
    const { createCheckoutSessionAction } = await import("./abonnement-actions");

    const formData = new FormData();
    formData.set("plan", "inconnu");

    await createCheckoutSessionAction(formData);

    expect(checkoutSessionsCreateMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 7: Lancer les tests et vérifier qu'ils échouent**

Run: `npx vitest run lib/data/abonnement-actions.test.ts`
Expected: FAIL — `./abonnement-actions` n'existe pas encore.

- [ ] **Step 8: Implémenter (`lib/data/abonnement-actions.ts`)**

```ts
"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import type { PlanAbonnement } from "@/lib/types/abonnement";

function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

function getPriceId(plan: string): string | null {
  if (plan === "solo") return process.env.STRIPE_PRICE_ID_SOLO ?? null;
  if (plan === "cabinet") return process.env.STRIPE_PRICE_ID_CABINET ?? null;
  return null;
}

export async function createCheckoutSessionAction(formData: FormData): Promise<void> {
  const plan = String(formData.get("plan")) as PlanAbonnement;
  const priceId = getPriceId(plan);

  if (!priceId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: abonnementExistant } = await supabase
    .from("abonnements")
    .select("stripe_customer_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: abonnementExistant?.stripe_customer_id ?? undefined,
    customer_email: abonnementExistant?.stripe_customer_id ? undefined : user.email,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { trial_period_days: 14 },
    success_url: `${origin}/abonnement/succes`,
    cancel_url: `${origin}/abonnement`,
  });

  if (session.url) {
    redirect(session.url);
  }
}
```

- [ ] **Step 9: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run lib/data/abonnement-actions.test.ts`
Expected: PASS (5/5)

- [ ] **Step 10: Vérifier la compilation et le lint**

Run: `npm run build`
Expected: PASS (0 erreur TypeScript)

Run: `npx eslint lib/types/abonnement.ts lib/data/abonnement.ts lib/data/abonnement-actions.ts`
Expected: PASS (0 erreur)

- [ ] **Step 11: Commit**

```bash
git add lib/types/abonnement.ts lib/data/abonnement.ts lib/data/abonnement.test.ts lib/data/abonnement-actions.ts lib/data/abonnement-actions.test.ts
git commit -m "feat(abonnements): getAbonnement + createCheckoutSessionAction"
```

---

### Task 4: Webhook Stripe

**Files:**
- Create: `app/api/webhooks/stripe/route.ts`
- Create: `app/api/webhooks/stripe/route.test.ts`

**Interfaces:**
- Consomme : `createAdminClient` (Tâche 2).
- Produces : endpoint `POST /api/webhooks/stripe`, configuré côté
  dashboard Stripe par le fondateur à la vérification manuelle (Tâche 6).

- [ ] **Step 1: Écrire les tests qui échouent d'abord**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const constructEventMock = vi.fn();
const subscriptionsRetrieveMock = vi.fn();
vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => ({
    webhooks: { constructEvent: constructEventMock },
    subscriptions: { retrieve: subscriptionsRetrieveMock },
  })),
}));

const upsertMock = vi.fn(() => Promise.resolve({ error: null }));
const eqUpdateMock = vi.fn(() => Promise.resolve({ error: null }));
const updateMock = vi.fn(() => ({ eq: eqUpdateMock }));
const fromMock = vi.fn(() => ({ upsert: upsertMock, update: updateMock }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  process.env.STRIPE_PRICE_ID_SOLO = "price_solo_test";
  process.env.STRIPE_PRICE_ID_CABINET = "price_cabinet_test";
});

function fakeRequest(body: string, signature: string | null) {
  return new Request("https://soinely.app/api/webhooks/stripe", {
    method: "POST",
    headers: signature ? { "stripe-signature": signature } : {},
    body,
  });
}

describe("POST /api/webhooks/stripe", () => {
  it("rejette une requête sans en-tête de signature", async () => {
    const { POST } = await import("./route");

    const response = await POST(fakeRequest("{}", null));

    expect(response.status).toBe(400);
    expect(constructEventMock).not.toHaveBeenCalled();
  });

  it("rejette un payload dont la signature ne vérifie pas", async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error("signature invalide");
    });

    const { POST } = await import("./route");

    const response = await POST(fakeRequest("{}", "sig_invalide"));

    expect(response.status).toBe(400);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("checkout.session.completed : crée/complète la ligne abonnements avec le bon plan", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          client_reference_id: "u1",
          customer: "cus_1",
          subscription: "sub_1",
        },
      },
    });
    subscriptionsRetrieveMock.mockResolvedValue({
      status: "trialing",
      trial_end: 1750000000,
      current_period_end: 1751000000,
      items: { data: [{ price: { id: "price_cabinet_test" } }] },
    });

    const { POST } = await import("./route");

    const response = await POST(fakeRequest("{}", "sig_valide"));

    expect(response.status).toBe(200);
    expect(fromMock).toHaveBeenCalledWith("abonnements");
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_id: "u1",
        plan: "cabinet",
        statut: "essai",
        stripe_customer_id: "cus_1",
        stripe_subscription_id: "sub_1",
      }),
      { onConflict: "profile_id" }
    );
  });

  it("customer.subscription.updated : synchronise le statut sur stripe_subscription_id", async () => {
    constructEventMock.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1",
          status: "past_due",
          current_period_end: 1751000000,
        },
      },
    });

    const { POST } = await import("./route");

    const response = await POST(fakeRequest("{}", "sig_valide"));

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ statut: "impaye" })
    );
    expect(eqUpdateMock).toHaveBeenCalledWith("stripe_subscription_id", "sub_1");
  });

  it("customer.subscription.deleted : passe le statut à annule", async () => {
    constructEventMock.mockReturnValue({
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_1",
          status: "canceled",
          current_period_end: 1751000000,
        },
      },
    });

    const { POST } = await import("./route");

    const response = await POST(fakeRequest("{}", "sig_valide"));

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ statut: "annule" })
    );
  });
});
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npx vitest run app/api/webhooks/stripe/route.test.ts`
Expected: FAIL — `./route` n'existe pas encore.

- [ ] **Step 3: Implémenter (`app/api/webhooks/stripe/route.ts`)**

```ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

const STATUT_PAR_STRIPE: Record<string, string> = {
  trialing: "essai",
  active: "actif",
  past_due: "impaye",
  unpaid: "impaye",
  incomplete: "impaye",
  incomplete_expired: "annule",
  canceled: "annule",
};

function getPlan(priceId: string): "solo" | "cabinet" {
  return priceId === process.env.STRIPE_PRICE_ID_CABINET ? "cabinet" : "solo";
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const profileId = session.client_reference_id;

    if (profileId && session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
      const priceId = subscription.items.data[0].price.id;

      await supabase.from("abonnements").upsert(
        {
          profile_id: profileId,
          plan: getPlan(priceId),
          statut: STATUT_PAR_STRIPE[subscription.status] ?? "essai",
          stripe_customer_id: String(session.customer),
          stripe_subscription_id: String(session.subscription),
          essai_fin: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
          periode_fin: new Date(subscription.current_period_end * 1000).toISOString(),
        },
        { onConflict: "profile_id" }
      );
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;

    await supabase
      .from("abonnements")
      .update({
        statut: STATUT_PAR_STRIPE[subscription.status] ?? "annule",
        periode_fin: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id);
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run app/api/webhooks/stripe/route.test.ts`
Expected: PASS (5/5)

- [ ] **Step 5: Vérifier la compilation et le lint**

Run: `npm run build`
Expected: PASS (0 erreur TypeScript)

Run: `npx eslint app/api/webhooks/stripe/route.ts`
Expected: PASS (0 erreur)

- [ ] **Step 6: Commit**

```bash
git add app/api/webhooks/stripe/route.ts app/api/webhooks/stripe/route.test.ts
git commit -m "feat(abonnements): webhook Stripe (checkout + mises à jour d'abonnement)"
```

---

### Task 5: Garde d'accès dans proxy.ts

**Files:**
- Modify: `proxy.ts`
- Create: `proxy.test.ts`

**Interfaces:**
- Consomme : `getAbonnement` (Tâche 3) — attention, `proxy.ts` tourne en
  environnement Edge ; `getAbonnement` utilise uniquement
  `supabase.from(...)`, compatible Edge (déjà le cas pour
  `supabase.auth.getUser()` existant dans ce fichier).

Point d'attention : `proxy.ts` n'a aujourd'hui aucun test (fichier non
testé jusqu'ici dans ce projet). Ce plan introduit son premier test,
avec un mock de `createServerClient` de `@supabase/ssr`.

- [ ] **Step 1: Écrire le test qui échoue d'abord (`proxy.test.ts`)**

```ts
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getUserMock = vi.fn();
const eqSelectMock = vi.fn();
const selectMock = vi.fn(() => ({ eq: () => ({ maybeSingle: eqSelectMock }) }));
const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  }),
}));

describe("proxy", () => {
  it("redirige vers /login si non connecté sur une route protégée", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const { proxy } = await import("./proxy");
    const request = new NextRequest("https://soinely.app/ma-journee");

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("redirige vers /abonnement si connecté mais sans abonnement essai/actif", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    eqSelectMock.mockResolvedValue({ data: { statut: "impaye" }, error: null });

    const { proxy } = await import("./proxy");
    const request = new NextRequest("https://soinely.app/ma-journee");

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/abonnement");
  });

  it("redirige vers /abonnement si connecté et aucune ligne abonnements n'existe encore", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    eqSelectMock.mockResolvedValue({ data: null, error: null });

    const { proxy } = await import("./proxy");
    const request = new NextRequest("https://soinely.app/ma-journee");

    const response = await proxy(request);

    expect(response.headers.get("location")).toContain("/abonnement");
  });

  it("laisse passer si connecté avec un abonnement en essai", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    eqSelectMock.mockResolvedValue({ data: { statut: "essai" }, error: null });

    const { proxy } = await import("./proxy");
    const request = new NextRequest("https://soinely.app/ma-journee");

    const response = await proxy(request);

    expect(response.status).toBe(200);
  });

  it("laisse passer si connecté avec un abonnement actif", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    eqSelectMock.mockResolvedValue({ data: { statut: "actif" }, error: null });

    const { proxy } = await import("./proxy");
    const request = new NextRequest("https://soinely.app/ma-journee");

    const response = await proxy(request);

    expect(response.status).toBe(200);
  });

  it("ne vérifie pas l'abonnement sur une route non protégée", async () => {
    const { proxy } = await import("./proxy");
    const request = new NextRequest("https://soinely.app/login");

    const response = await proxy(request);

    expect(getUserMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });
});
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npx vitest run proxy.test.ts`
Expected: FAIL — la garde d'abonnement n'existe pas encore, seule la
garde d'authentification tourne.

- [ ] **Step 3: Implémenter**

Remplacer entièrement le contenu de `proxy.ts` par :

```ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAbonnement } from "@/lib/data/abonnement";

const PROTECTED_PATHS = ["/ma-journee", "/recherche", "/situations", "/ely"];

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const isProtected = PROTECTED_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (!isProtected) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const abonnement = await getAbonnement(supabase, user.id);
  const acces = abonnement?.statut === "essai" || abonnement?.statut === "actif";

  if (!acces) {
    return NextResponse.redirect(new URL("/abonnement", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/ma-journee/:path*",
    "/recherche/:path*",
    "/situations/:path*",
    "/ely/:path*",
  ],
};
```

`getAbonnement` est générique sur `SupabaseClient<Database>` (Tâche 3) —
il fonctionne aussi bien avec le client construit par
`lib/supabase/server.ts` que celui construit ici directement par
`createServerClient` (nécessaire dans `proxy.ts` pour la gestion des
cookies spécifique au middleware Edge). Pas de duplication de la requête.

- [ ] **Step 4: Lancer le test et vérifier qu'il passe**

Run: `npx vitest run proxy.test.ts`
Expected: PASS (6/6)

- [ ] **Step 5: Vérifier la compilation et le lint**

Run: `npm run build`
Expected: PASS (0 erreur TypeScript)

Run: `npx eslint proxy.ts`
Expected: PASS (0 erreur)

- [ ] **Step 6: Lancer la suite complète**

Run: `npm test`
Expected: PASS (tous les tests existants + ceux des tâches précédentes,
aucune régression)

- [ ] **Step 7: Commit**

```bash
git add proxy.ts proxy.test.ts
git commit -m "feat(abonnements): garde d'accès essai/actif dans proxy.ts"
```

---

### Task 6: Écrans — choix de plan + confirmation

**Files:**
- Create: `app/abonnement/page.tsx`
- Create: `app/abonnement/succes/page.tsx`

**Interfaces:**
- Consomme : `createCheckoutSessionAction` (Tâche 3), `getAbonnement`
  (Tâche 3, pour l'écran de succès).

- [ ] **Step 1: Page de choix de plan (`app/abonnement/page.tsx`)**

```tsx
import { createCheckoutSessionAction } from "@/lib/data/abonnement-actions";
import { Button } from "@/components/ui/Button";

const PLANS = [
  {
    id: "solo",
    nom: "Solo",
    prix: "19€/mois",
    description: "Pour une IDEL indépendante.",
  },
  {
    id: "cabinet",
    nom: "Cabinet",
    prix: "39€/mois",
    description: "Pour un cabinet infirmier IDEL.",
  },
] as const;

export default function AbonnementPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Choisissez votre offre</h1>
        <p className="mt-1 text-navy/60">14 jours d&apos;essai gratuit, sans engagement.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PLANS.map((plan) => (
          <div key={plan.id} className="flex flex-col gap-3 rounded-card border border-navy/10 bg-white p-6">
            <div>
              <p className="text-lg font-semibold text-navy">{plan.nom}</p>
              <p className="text-2xl font-semibold text-navy">{plan.prix}</p>
              <p className="mt-1 text-sm text-navy/60">{plan.description}</p>
            </div>
            <form action={createCheckoutSessionAction}>
              <input type="hidden" name="plan" value={plan.id} />
              <Button type="submit" className="w-full">
                Commencer l&apos;essai gratuit
              </Button>
            </form>
          </div>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Page de confirmation (`app/abonnement/succes/page.tsx`)**

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function AbonnementSuccesPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold text-navy">Essai démarré</h1>
      <p className="text-navy/60">
        Votre essai gratuit de 14 jours a bien démarré. Vous pouvez dès maintenant accéder à votre journée.
      </p>
      <Link href="/ma-journee">
        <Button>Accéder à Ma Journée</Button>
      </Link>
    </main>
  );
}
```

Pas de logique dans cette page pour cette v1 : la synchronisation réelle
de l'abonnement vient du webhook (Tâche 4), qui arrive généralement avant
ou juste après cette redirection. Si l'IDEL clique "Accéder à Ma Journée"
avant que le webhook soit traité, `proxy.ts` la renverrait vers
`/abonnement` — cas limite accepté pour cette v1 (voir spec, "Gestion des
cas limites"), pas de logique d'attente/polling ajoutée.

- [ ] **Step 3: Vérifier la compilation et le lint**

Run: `npm run build`
Expected: PASS (0 erreur TypeScript), routes `/abonnement` et
`/abonnement/succes` listées.

Run: `npx eslint app/abonnement/page.tsx app/abonnement/succes/page.tsx`
Expected: PASS (0 erreur)

- [ ] **Step 4: Lancer la suite complète**

Run: `npm test`
Expected: PASS (tous les tests existants + ceux des tâches précédentes,
aucune régression)

- [ ] **Step 5: Commit**

```bash
git add app/abonnement
git commit -m "feat(abonnements): écrans de choix de plan et de confirmation"
```

- [ ] **Step 6: Vérification manuelle post-déploiement (contrôleur, avec autorisation explicite du fondateur — ET clés Stripe test fournies)**

**Préalable bloquant :** le fondateur doit avoir créé un compte Stripe
(mode test), créé 2 objets Price (Solo/Cabinet), et fourni
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_SOLO`,
`STRIPE_PRICE_ID_CABINET` (dans `.env.local`, pas collées dans le chat).
Le webhook doit être configuré (Stripe CLI en local avec `stripe listen
--forward-to localhost:3000/api/webhooks/stripe`, ou un tunnel/déploiement
réel avec l'URL enregistrée côté dashboard Stripe).

Une fois ces prérequis en place et les 4 migrations en attente appliquées
(dont celle de la Tâche 1 de ce plan) : créer un compte de test complet
(inscription → confirmation email → `/abonnement` → Checkout test avec
une carte de test Stripe → webhook reçu → accès à `/ma-journee`).
Confirmer qu'un compte sans abonnement est bien bloqué sur `/abonnement`
et ne peut pas accéder à `/ma-journee` en tapant l'URL directement.

---

## Résultat à la fin de ce plan

Une IDEL confirmée doit choisir un plan (Solo ou Cabinet) et démarrer un
essai Stripe de 14 jours avant d'accéder à l'app. Le statut de son
abonnement est entièrement piloté par Stripe via webhook signé — aucune
écriture cliente possible sur `abonnements`. `proxy.ts` bloque l'accès à
toute route protégée tant que l'abonnement n'est pas `essai` ou `actif`.
