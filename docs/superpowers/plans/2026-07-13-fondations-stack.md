# Soinely — Fondations techniques (Supabase + GitHub + Vercel) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en place le socle technique complet de Soinely — dépôt Git, CI/CD, base de données Supabase avec sécurité au niveau ligne (RLS), authentification, design system de base, et un premier écran réel ("Ma Journée") connecté à des données Supabase véritables — déployé en production sur Vercel.

**Architecture:** Application web Next.js 14 (App Router, TypeScript) déployée sur Vercel, avec Supabase comme backend unique (Postgres + Auth + RLS, pas d'API custom séparée au stade fondation). GitHub héberge le code ; chaque tâche est une branche + Pull Request ; GitHub Actions exécute lint/typecheck/tests sur chaque PR ; Vercel déploie automatiquement une preview par PR et la production à chaque merge sur `main`.

**Tech Stack:** Next.js 14 (App Router) · TypeScript strict · Tailwind CSS · @supabase/supabase-js + @supabase/ssr · Vitest + Testing Library · Playwright · GitHub Actions · Vercel · Supabase (Postgres / Auth / Row Level Security).

## Global Constraints

- TypeScript en mode `strict`, aucun `any` implicite toléré.
- RLS (Row Level Security) activée sur **toutes** les tables Supabase dès leur création — aucune table n'est accessible sans policy explicite.
- Aucun secret (clé `service_role`, mot de passe DB) n'est jamais commité — uniquement dans `.env.local` (ignoré par Git) et déclaré (vide) dans `.env.example`.
- Palette et typographie du design system Soinely respectées : bleu primaire `#2563EB`, navy `#0F172A`, teal `#14B8A6`, succès `#22C55E`, vigilance `#F59E0B`, urgence `#EF4444`, police Inter, grille d'espacement en base 8 px.
- Cible d'accessibilité WCAG 2.2 AA (zones tactiles ≥ 44×44 px, contrastes suffisants).
- Le contenu clinique (Situations Terrain, Missions, NGAP) n'est **jamais** modifiable par un compte utilisateur final — seule une clé `service_role` (script d'administration / seed) peut y écrire. Un IDEL ne peut lire que du contenu `published = true`.
- Projet Supabase créé en région **UE (Frankfurt / eu-central-1)** pour la résidence des données — voir note de conformité ci-dessous.

## Note de conformité — à lire avant de commencer

Supabase (hébergé sur AWS) et Vercel ne sont **pas certifiés HDS** (Hébergement de Données de Santé, obligatoire en France pour des données de santé à caractère personnel identifiant un patient). Ce socle est adapté tant que Soinely reste un outil de référence clinique pour professionnels (comptes IDEL, contenu clinique générique, statistiques de tournée non nominatives côté patient) — c'est le périmètre couvert par ce plan. Le jour où une donnée personnelle de santé d'un **patient** identifié est stockée (dossier patient, historique de soins nominatif), un hébergeur certifié HDS deviendra obligatoire et une migration devra être planifiée séparément. Choisir la région Supabase UE dès maintenant limite déjà l'exposition RGPD en attendant cette décision.

---

## Répartition entre les 3 agents

| Agent | Rôle | Tâches |
|---|---|---|
| **Agent A — Données & Sécurité** | Schéma Supabase, RLS, auth, contenu clinique de départ | Tâches 3, 4 |
| **Agent B — Interface** | Design system, écrans, formulaires | Tâches 6, 7, 8 |
| **Agent C — Fondations & Intégration** | Repo, CI/CD, déploiement, client Supabase partagé, tests end-to-end | Tâches 1, 2, 5, 9 |

**Protocole de collaboration :** une tâche = une branche (`feat/task-N-slug`) = une Pull Request sur GitHub. Aucun agent ne fusionne sa propre PR sans relecture croisée (par un autre agent ou par vous) — cf. la revue à deux étapes de `superpowers:subagent-driven-development`. Vercel génère un déploiement de preview par PR : à vérifier visuellement avant fusion. Chaque merge sur `main` déploie automatiquement en production.

**Graphe de dépendances (parallélisme réel) :**

```
Jour 1        Agent C : Tâche 1 (scaffold) ──► Tâche 2 (repo + CI + Vercel)
              Agent A : Tâche 3 (schéma + RLS) ──► Tâche 4 (auth trigger + seed)   [démarre en parallèle, indépendant du scaffold]
              Agent B : attend la fin de la Tâche 1, puis Tâche 6 (design tokens)

Jour 2        Agent C : Tâche 5 (client Supabase + middleware)   [dépend de Tâche 2]
              Agent B : Tâche 7 (login/signup)                   [dépend de Tâches 5 + 6]

Jour 3        Agent B : Tâche 8 (écran Ma Journée, données réelles)  [dépend de Tâches 3 + 5 + 6]
              Agent C : Tâche 9 (e2e + déploiement prod)             [dépend de Tâches 7 + 8]
```

---

## Tâche 0 : Créer les comptes (action manuelle, hors agents)

Aucun agent ne peut créer de compte à votre place. À faire une seule fois, avant de lancer la Tâche 1.

- [ ] **Étape 1 : Compte GitHub**
  Aller sur github.com, créer un compte (ou se connecter) avec `dimsxm@gmail.com`. Installer GitHub CLI si absent : `winget install --id GitHub.cli` (Windows), puis `gh auth login` (choisir HTTPS + navigateur).

- [ ] **Étape 2 : Compte + projet Supabase**
  Aller sur supabase.com → se connecter avec GitHub → **New project**. Nom : `soinely-app`. Région : **Frankfurt (eu-central-1)**. Générer un mot de passe DB fort et le conserver dans un gestionnaire de mots de passe. Attendre la fin du provisioning (~2 min). Puis **Project Settings → API** : noter `Project URL`, `anon public key`, `service_role key` (ce dernier ne sort jamais du gestionnaire de secrets).

- [ ] **Étape 3 : Compte Vercel**
  Aller sur vercel.com → **Sign up** avec le même compte GitHub (facilite l'intégration automatique).

- [ ] **Étape 4 : Vérification**
  Confirmer que vous disposez bien de : un token `gh` authentifié, une URL + 2 clés Supabase, un compte Vercel connecté à GitHub. Sans ces trois éléments, les tâches suivantes bloqueront.

---

## Tâche 1 : Scaffold du projet Next.js (Agent C)

**Files:**
- Create: `soinely-app/` (projet Next.js complet généré par l'outil)
- Create: `soinely-app/vitest.config.ts`
- Create: `soinely-app/vitest.setup.ts`
- Test: `soinely-app/app/page.test.tsx`

**Interfaces:**
- Consumes: rien (première tâche)
- Produces: squelette Next.js fonctionnel avec `npm run dev`, `npm run build`, `npm run lint`, `npm run test` opérationnels — toutes les tâches suivantes en dépendent.

- [ ] **Step 1: Générer le projet**

```bash
cd "/c/Users/HP/OneDrive/Documents/Soinely/soinely-app"
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
```

Si des prompts interactifs apparaissent malgré les flags (versions récentes ajoutent parfois une question Turbopack), répondre **No** à toute option non listée ci-dessus.

- [ ] **Step 2: Installer les outils de test**

```bash
npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Configurer Vitest**

`vitest.config.ts` :

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

`vitest.setup.ts` :

```ts
import "@testing-library/jest-dom/vitest";
```

Ajouter le script dans `package.json` (section `"scripts"`) :

```json
"test": "vitest run"
```

- [ ] **Step 4: Write the failing test**

`app/page.test.tsx` :

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "./page";

describe("Home page", () => {
  it("renders the Soinely name", () => {
    render(<Page />);
    expect(screen.getByText(/soinely/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npm run test`
Expected: FAIL — le texte "Soinely" n'existe pas encore dans la page générée par défaut.

- [ ] **Step 6: Rendre le test vert**

Remplacer le contenu de `app/page.tsx` par :

```tsx
export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-2xl font-semibold">Soinely</h1>
    </main>
  );
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm run test`
Expected: PASS (1 test)

- [ ] **Step 8: Vérifier que le build passe**

Run: `npm run build`
Expected: build réussi sans erreur TypeScript.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Vitest"
```

---

## Tâche 2 : Dépôt GitHub, CI et déploiement Vercel (Agent C)

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.env.example`
- Modify: `.gitignore` (vérifier présence de `.env*.local`, `.vercel`)

**Interfaces:**
- Consumes: squelette de la Tâche 1
- Produces: dépôt GitHub distant, pipeline CI, projet Vercel lié — prérequis pour toutes les Pull Requests suivantes.

- [ ] **Step 1: Créer le dépôt distant**

```bash
gh repo create soinely-app --private --source=. --remote=origin --push
```

- [ ] **Step 2: Déclarer les variables d'environnement attendues**

`.env.example` :

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 3: Vérifier `.gitignore`**

Confirmer que ces lignes sont présentes (create-next-app les ajoute par défaut) :

```
.env*.local
.vercel
```

- [ ] **Step 4: Écrire le pipeline CI**

`.github/workflows/ci.yml` :

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

- [ ] **Step 5: Lier le projet Vercel**

```bash
npm install -g vercel
vercel login
vercel link --yes
```

Puis déclarer les 3 variables d'environnement (valeurs récupérées à la Tâche 0, étape 2) pour les environnements Preview et Production :

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

(Chaque commande demande de coller la valeur — ne jamais coller `SUPABASE_SERVICE_ROLE_KEY` dans l'environnement `preview`, réservé au `anon key` uniquement.)

- [ ] **Step 6: Activer le déploiement automatique**

Dans le dashboard Vercel du projet, section **Git**, confirmer que le dépôt `soinely-app` est bien connecté (fait automatiquement par `vercel link` s'il détecte le remote GitHub).

- [ ] **Step 7: Vérifier que la CI passe**

```bash
git add -A
git commit -m "ci: add GitHub Actions pipeline and Vercel env template"
git push origin main
```

Run: `gh run watch`
Expected: le job `build-and-test` se termine en succès (✓ vert).

---

## Tâche 3 : Schéma Supabase — contenu clinique et RLS (Agent A)

**Files:**
- Create: `supabase/migrations/20260714000000_core_schema.sql`
- Create: `lib/types/clinical.ts`

**Interfaces:**
- Consumes: rien (indépendant du scaffold Next.js, nécessite uniquement Supabase CLI + Docker)
- Produces: tables `profiles`, `situations_terrain`, `missions_cliniques`, `ngap_codes`, `tournees`, `missions_du_jour` avec RLS ; types TypeScript `SituationTerrain`, `MissionClinique`, `NiveauConfiance`, `Tournee`, `MissionDuJour`, `StatutMission` consommés par les Tâches 8.

- [ ] **Step 1: Initialiser Supabase en local**

Prérequis : Docker Desktop installé et lancé.

```bash
npm install --save-dev supabase
npx supabase init
npx supabase start
```

Noter l'URL et la clé `anon` locales affichées (utilisées uniquement pour le développement local, différentes des clés du projet cloud).

- [ ] **Step 2: Écrire la migration du schéma**

`supabase/migrations/20260714000000_core_schema.sql` :

```sql
create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'idel' check (role in ('idel', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create table public.situations_terrain (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  observation text not null,
  verifications jsonb not null default '[]',
  causes_possibles jsonb not null default '[]',
  conduite_a_tenir jsonb not null default '[]',
  quand_avis_medical text not null,
  sources jsonb not null default '[]',
  specialite text not null default 'idel',
  niveau_confiance text not null default 'valide' check (niveau_confiance in ('brouillon','relu','valide')),
  version int not null default 1,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.situations_terrain enable row level security;

create policy "situations_terrain_select_published" on public.situations_terrain
  for select using (published = true);

create table public.missions_cliniques (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  situation_terrain_id uuid references public.situations_terrain(id),
  etapes jsonb not null default '[]',
  duree_estimee_min int not null default 15,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.missions_cliniques enable row level security;

create policy "missions_cliniques_select_published" on public.missions_cliniques
  for select using (published = true);

create table public.ngap_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  libelle text not null,
  cotation numeric(6,2) not null,
  conditions text
);

alter table public.ngap_codes enable row level security;

create policy "ngap_codes_select_all" on public.ngap_codes
  for select using (true);

create table public.tournees (
  id uuid primary key default gen_random_uuid(),
  idel_id uuid not null references public.profiles(id) on delete cascade,
  date date not null default current_date,
  nb_patients int not null default 0,
  nb_injections int not null default 0,
  nb_pansements int not null default 0,
  nb_glycemies int not null default 0,
  temps_estime_min int not null default 0,
  unique (idel_id, date)
);

alter table public.tournees enable row level security;

create policy "tournees_owner_all" on public.tournees
  for all using (auth.uid() = idel_id) with check (auth.uid() = idel_id);

create table public.missions_du_jour (
  id uuid primary key default gen_random_uuid(),
  tournee_id uuid not null references public.tournees(id) on delete cascade,
  patient_label text not null,
  type_soin text not null,
  heure_prevue time not null,
  statut text not null default 'a_faire' check (statut in ('a_faire','en_cours','terminee')),
  mission_clinique_id uuid references public.missions_cliniques(id)
);

alter table public.missions_du_jour enable row level security;

create policy "missions_du_jour_owner_all" on public.missions_du_jour
  for all using (
    auth.uid() = (select idel_id from public.tournees where id = tournee_id)
  ) with check (
    auth.uid() = (select idel_id from public.tournees where id = tournee_id)
  );
```

- [ ] **Step 3: Créer les types TypeScript partagés**

`lib/types/clinical.ts` :

```ts
export type NiveauConfiance = "brouillon" | "relu" | "valide";

export interface SituationTerrain {
  id: string;
  titre: string;
  observation: string;
  verifications: string[];
  causesPossibles: string[];
  conduiteATenir: string[];
  quandAvisMedical: string;
  sources: string[];
  specialite: string;
  niveauConfiance: NiveauConfiance;
  version: number;
  published: boolean;
}

export interface MissionClinique {
  id: string;
  titre: string;
  situationTerrainId: string | null;
  etapes: { titre: string; description: string }[];
  dureeEstimeeMin: number;
  published: boolean;
}

export type StatutMission = "a_faire" | "en_cours" | "terminee";

export interface MissionDuJour {
  id: string;
  patientLabel: string;
  typeSoin: string;
  heurePrevue: string;
  statut: StatutMission;
  missionCliniqueId: string | null;
}

export interface Tournee {
  id: string;
  date: string;
  nbPatients: number;
  nbInjections: number;
  nbPansements: number;
  nbGlycemies: number;
  tempsEstimeMin: number;
}
```

- [ ] **Step 4: Appliquer la migration et vérifier**

```bash
npx supabase db reset
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select table_name from information_schema.tables where table_schema='public' order by table_name;"
```

Expected: la liste contient `missions_cliniques`, `missions_du_jour`, `ngap_codes`, `profiles`, `situations_terrain`, `tournees`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260714000000_core_schema.sql lib/types/clinical.ts
git commit -m "feat(db): core clinical schema with row level security"
```

---

## Tâche 4 : Trigger d'inscription et contenu clinique de départ (Agent A)

**Files:**
- Create: `supabase/migrations/20260714000100_auth_trigger.sql`
- Create: `supabase/seed.sql`

**Interfaces:**
- Consumes: schéma de la Tâche 3
- Produces: création automatique d'un `profile` à l'inscription ; jeu de données clinique minimal pour développement/démo, consommé par la Tâche 8 pour tester l'écran Ma Journée.

- [ ] **Step 1: Écrire le trigger de création de profil**

`supabase/migrations/20260714000100_auth_trigger.sql` :

```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 2: Écrire le seed de contenu clinique**

`supabase/seed.sql` :

```sql
insert into public.situations_terrain
  (titre, observation, verifications, causes_possibles, conduite_a_tenir, quand_avis_medical, sources, niveau_confiance, published)
values
  (
    'Hypoglycémie chez un patient diabétique',
    'Le patient présente des sueurs, des tremblements et une confusion légère.',
    '["Mesurer la glycémie capillaire", "Vérifier l''état de conscience", "Vérifier la prise du dernier repas et du traitement"]',
    '["Injection d''insuline surdosée", "Repas sauté ou insuffisant", "Effort physique inhabituel"]',
    '["Resucrage oral si conscient (15g de sucre)", "Recontrôler la glycémie 15 min après", "Ne jamais resucrer un patient inconscient par voie orale"]',
    'Si la glycémie reste basse après 2 resucrages ou si le patient perd connaissance.',
    '["HAS - Prise en charge du patient diabétique"]',
    'valide',
    true
  ),
  (
    'Pansement qui saigne de façon inhabituelle',
    'Le pansement est imbibé de sang de façon plus importante que lors des soins précédents.',
    '["Évaluer l''abondance et la couleur du saignement", "Vérifier la prise d''anticoagulants", "Contrôler les constantes si disponible"]',
    '["Traitement anticoagulant récent", "Plaie plus profonde que prévu", "Reprise d''un geste chirurgical"]',
    '["Compression manuelle prolongée", "Pansement compressif propre", "Surveillance rapprochée de l''évolution"]',
    'Si le saignement ne cède pas après compression ou si des signes de choc apparaissent.',
    '["SF2H - Prise en charge des plaies"]',
    'valide',
    true
  );

insert into public.missions_cliniques (titre, situation_terrain_id, etapes, duree_estimee_min, published)
select
  'Prise en charge hypoglycémie',
  id,
  '[{"titre":"Évaluation","description":"Mesurer la glycémie et l''état de conscience"},{"titre":"Resucrage","description":"Administrer 15g de sucre si conscient"},{"titre":"Surveillance","description":"Recontrôler la glycémie 15 minutes après"},{"titre":"Traçabilité","description":"Noter la valeur et l''action dans le dossier"}]',
  20,
  true
from public.situations_terrain where titre = 'Hypoglycémie chez un patient diabétique';

insert into public.ngap_codes (code, libelle, cotation, conditions) values
  ('AMI 4', 'Pansement lourd et complexe', 6.30, 'Sur prescription médicale'),
  ('AMI 1', 'Injection sous-cutanée ou intramusculaire', 3.15, null);
```

- [ ] **Step 3: Appliquer et vérifier**

```bash
npx supabase db reset
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select titre, published from public.situations_terrain;"
```

Expected: 2 lignes, `published = t` pour les deux.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260714000100_auth_trigger.sql supabase/seed.sql
git commit -m "feat(db): profile auto-creation trigger and starter clinical content"
```

---

## Tâche 5 : Client Supabase et protection des routes (Agent C)

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `middleware.ts`
- Test: `lib/supabase/client.test.ts`

**Interfaces:**
- Consumes: variables d'environnement de la Tâche 2 (`.env.example`)
- Produces: `createClient()` (navigateur) et `createClient()` (serveur), utilisés par les Tâches 7 et 8 ; redirection automatique vers `/login` pour les routes protégées.

- [ ] **Step 1: Installer les dépendances Supabase**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Write the failing test**

`lib/supabase/client.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";

describe("createClient (browser)", () => {
  it("creates a client exposing the auth API", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

    const { createClient } = await import("./client");
    const client = createClient();

    expect(client).toBeDefined();
    expect(typeof client.auth.signInWithPassword).toBe("function");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test`
Expected: FAIL avec "Cannot find module './client'"

- [ ] **Step 4: Implémenter le client navigateur**

`lib/supabase/client.ts` :

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test`
Expected: PASS

- [ ] **Step 6: Implémenter le client serveur**

`lib/supabase/server.ts` :

```ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
}
```

- [ ] **Step 7: Implémenter le middleware de protection des routes**

`middleware.ts` :

```ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/ma-journee"];

export async function middleware(request: NextRequest) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/ma-journee/:path*"],
};
```

- [ ] **Step 8: Vérifier le build**

Run: `npm run build`
Expected: succès sans erreur TypeScript.

- [ ] **Step 9: Commit**

```bash
git add lib/supabase middleware.ts
git commit -m "feat(auth): supabase client helpers and protected route middleware"
```

---

## Tâche 6 : Design tokens et composants de base (Agent B)

**Files:**
- Modify: `tailwind.config.ts`
- Create: `components/ui/Button.tsx`
- Create: `components/ui/CarteInformation.tsx`
- Create: `components/ui/CarteMission.tsx`
- Test: `components/ui/CarteInformation.test.tsx`

**Interfaces:**
- Consumes: rien (dépend seulement du scaffold de la Tâche 1)
- Produces: `Button`, `CarteInformation`, `CarteMission` — consommés par les Tâches 7 et 8.

- [ ] **Step 1: Déclarer les tokens du design system**

`tailwind.config.ts` (ajouter dans `theme.extend`) :

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#2563EB",
        navy: "#0F172A",
        teal: "#14B8A6",
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      spacing: {
        "1": "8px",
        "2": "16px",
        "3": "24px",
        "4": "32px",
        "6": "48px",
        "8": "64px",
      },
      borderRadius: {
        card: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: Write the failing test**

`components/ui/CarteInformation.test.tsx` :

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CarteInformation } from "./CarteInformation";

describe("CarteInformation", () => {
  it("affiche le label et la valeur", () => {
    render(<CarteInformation label="Patients" value={21} />);
    expect(screen.getByText("Patients")).toBeInTheDocument();
    expect(screen.getByText("21")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test`
Expected: FAIL avec "Cannot find module './CarteInformation'"

- [ ] **Step 4: Implémenter les composants**

`components/ui/Button.tsx` :

```tsx
import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "tertiary" | "danger";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary/90",
  secondary: "bg-white text-primary border border-primary hover:bg-primary/5",
  tertiary: "bg-transparent text-primary hover:underline",
  danger: "bg-danger text-white hover:bg-danger/90",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`min-h-[44px] rounded-card px-3 py-2 font-medium transition-colors ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
```

`components/ui/CarteInformation.tsx` :

```tsx
interface CarteInformationProps {
  label: string;
  value: string | number;
}

export function CarteInformation({ label, value }: CarteInformationProps) {
  return (
    <div className="rounded-card border border-navy/10 bg-white p-3">
      <p className="text-sm text-navy/60">{label}</p>
      <p className="text-2xl font-semibold text-navy">{value}</p>
    </div>
  );
}
```

`components/ui/CarteMission.tsx` :

```tsx
import type { MissionDuJour } from "@/lib/types/clinical";

const STATUT_LABEL: Record<MissionDuJour["statut"], string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  terminee: "Terminée",
};

const STATUT_CLASSES: Record<MissionDuJour["statut"], string> = {
  a_faire: "bg-navy/5 text-navy",
  en_cours: "bg-warning/10 text-warning",
  terminee: "bg-success/10 text-success",
};

export function CarteMission({ mission }: { mission: MissionDuJour }) {
  return (
    <div className="flex items-center justify-between rounded-card border border-navy/10 bg-white p-3">
      <div>
        <p className="font-medium text-navy">{mission.patientLabel}</p>
        <p className="text-sm text-navy/60">
          {mission.typeSoin} · {mission.heurePrevue}
        </p>
      </div>
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUT_CLASSES[mission.statut]}`}>
        {STATUT_LABEL[mission.statut]}
      </span>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.ts components/ui
git commit -m "feat(ui): design tokens and base components (Button, CarteInformation, CarteMission)"
```

---

## Tâche 7 : Connexion et inscription (Agent B)

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/login/actions.ts`
- Test: `app/login/actions.test.ts`

**Interfaces:**
- Consumes: `createClient()` serveur (Tâche 5), `Button` (Tâche 6)
- Produces: route `/login` fonctionnelle, action `signInAction` consommée implicitement par le middleware (redirection après connexion).

- [ ] **Step 1: Write the failing test**

`app/login/actions.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

describe("signInAction", () => {
  it("retourne success quand Supabase ne renvoie pas d'erreur", async () => {
    const { signInAction } = await import("./actions");

    const formData = new FormData();
    formData.set("email", "idel@example.com");
    formData.set("password", "motdepasse123");

    const result = await signInAction(formData);

    expect(result).toEqual({ success: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test`
Expected: FAIL avec "Cannot find module './actions'"

- [ ] **Step 3: Implémenter l'action serveur**

`app/login/actions.ts` :

```ts
"use server";

import { createClient } from "@/lib/supabase/server";

export async function signInAction(
  formData: FormData
): Promise<{ success: true } | { success: false; error: string }> {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test`
Expected: PASS

- [ ] **Step 5: Implémenter la page de connexion**

`app/login/page.tsx` :

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { signInAction } from "./actions";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const result = await signInAction(formData);
    if (result.success) {
      router.push("/ma-journee");
    } else {
      setError(result.error);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-3 p-3">
      <h1 className="text-2xl font-semibold text-navy">Connexion</h1>
      <form action={handleSubmit} className="flex flex-col gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="Adresse email"
          className="min-h-[44px] rounded-card border border-navy/20 px-2"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Mot de passe"
          className="min-h-[44px] rounded-card border border-navy/20 px-2"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit">Se connecter</Button>
      </form>
    </main>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add app/login
git commit -m "feat(auth): login page and sign-in server action"
```

---

## Tâche 8 : Écran "Ma Journée" avec données réelles (Agent B)

**Files:**
- Create: `app/ma-journee/page.tsx`
- Create: `lib/data/ma-journee.ts`
- Test: `lib/data/ma-journee.test.ts`

**Interfaces:**
- Consumes: `createClient()` serveur (Tâche 5), types `Tournee`/`MissionDuJour` (Tâche 3), `CarteInformation`/`CarteMission` (Tâche 6)
- Produces: écran `/ma-journee` affichant les vraies statistiques du jour et la liste des missions — premier écran du MVP réellement fonctionnel.

- [ ] **Step 1: Write the failing test**

`lib/data/ma-journee.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("getTourneeDuJour", () => {
  it("mappe les colonnes snake_case Supabase vers le type Tournee", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    id: "t1",
                    date: "2026-07-13",
                    nb_patients: 21,
                    nb_injections: 14,
                    nb_pansements: 8,
                    nb_glycemies: 6,
                    temps_estime_min: 435,
                  },
                  error: null,
                }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getTourneeDuJour } = await import("./ma-journee");
    const tournee = await getTourneeDuJour(fakeClient, "user-1");

    expect(tournee).toEqual({
      id: "t1",
      date: "2026-07-13",
      nbPatients: 21,
      nbInjections: 14,
      nbPansements: 8,
      nbGlycemies: 6,
      tempsEstimeMin: 435,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test`
Expected: FAIL avec "Cannot find module './ma-journee'"

- [ ] **Step 3: Implémenter la fonction de récupération de données**

`lib/data/ma-journee.ts` :

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Tournee } from "@/lib/types/clinical";

export async function getTourneeDuJour(
  supabase: SupabaseClient,
  idelId: string
): Promise<Tournee | null> {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("tournees")
    .select("id, date, nb_patients, nb_injections, nb_pansements, nb_glycemies, temps_estime_min")
    .eq("idel_id", idelId)
    .eq("date", today)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    date: data.date,
    nbPatients: data.nb_patients,
    nbInjections: data.nb_injections,
    nbPansements: data.nb_pansements,
    nbGlycemies: data.nb_glycemies,
    tempsEstimeMin: data.temps_estime_min,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test`
Expected: PASS

- [ ] **Step 5: Implémenter l'écran**

`app/ma-journee/page.tsx` :

```tsx
import { createClient } from "@/lib/supabase/server";
import { getTourneeDuJour } from "@/lib/data/ma-journee";
import { CarteInformation } from "@/components/ui/CarteInformation";

export default async function MaJourneePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tournee = user ? await getTourneeDuJour(supabase, user.id) : null;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-3 p-3">
      <h1 className="text-2xl font-semibold text-navy">Ma Journée</h1>
      {tournee ? (
        <div className="grid grid-cols-2 gap-2">
          <CarteInformation label="Patients" value={tournee.nbPatients} />
          <CarteInformation label="Injections" value={tournee.nbInjections} />
          <CarteInformation label="Pansements" value={tournee.nbPansements} />
          <CarteInformation label="Glycémies" value={tournee.nbGlycemies} />
        </div>
      ) : (
        <p className="text-navy/60">Aucune tournée enregistrée pour aujourd'hui.</p>
      )}
    </main>
  );
}
```

- [ ] **Step 6: Vérification manuelle avec un compte réel**

```bash
npx supabase db reset
```

Créer un compte de test via la page `/login` (le formulaire ne gère que la connexion — utiliser temporairement `supabase.auth.signUp` via la console `npx supabase status` / Studio local sur `http://127.0.0.1:54323` pour créer un utilisateur, ou ajouter provisoirement un bouton d'inscription). Une fois l'utilisateur créé, insérer une tournée de test :

```sql
insert into public.tournees (idel_id, nb_patients, nb_injections, nb_pansements, nb_glycemies, temps_estime_min)
values ('<uuid-utilisateur-de-test>', 21, 14, 8, 6, 435);
```

Se connecter sur `/login`, vérifier la redirection vers `/ma-journee` et l'affichage des 4 cartes avec les bonnes valeurs.

- [ ] **Step 7: Commit**

```bash
git add app/ma-journee lib/data
git commit -m "feat(ma-journee): real Supabase data on the home screen"
```

---

## Tâche 9 : Test end-to-end et vérification du déploiement (Agent C)

**Files:**
- Create: `e2e/smoke.spec.ts`
- Create: `playwright.config.ts`

**Interfaces:**
- Consumes: routes `/login` et `/ma-journee` (Tâches 7, 8), middleware (Tâche 5)
- Produces: garde-fou automatisé exécuté en CI, confirmation que le socle est déployé et fonctionnel en production.

- [ ] **Step 1: Installer Playwright**

```bash
npm install --save-dev @playwright/test
npx playwright install --with-deps chromium
```

- [ ] **Step 2: Configurer Playwright**

`playwright.config.ts` :

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
  use: {
    baseURL: "http://localhost:3000",
  },
});
```

- [ ] **Step 3: Write the failing test**

`e2e/smoke.spec.ts` :

```ts
import { test, expect } from "@playwright/test";

test("un visiteur non connecté est redirigé de /ma-journee vers /login", async ({ page }) => {
  await page.goto("/ma-journee");
  await expect(page).toHaveURL(/\/login/);
});

test("la page de connexion affiche le formulaire", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByPlaceholder("Adresse email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx playwright test`
Expected: FAIL — le serveur de dev n'a pas encore les variables d'environnement Supabase locales chargées (`.env.local` absent).

Créer `.env.local` (jamais commité) avec les valeurs locales affichées par `npx supabase status`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx playwright test`
Expected: PASS (2 tests)

- [ ] **Step 6: Ajouter Playwright à la CI**

Modifier `.github/workflows/ci.yml`, ajouter après l'étape `npm run build` :

```yaml
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
```

- [ ] **Step 7: Fusionner et vérifier la production**

```bash
git add e2e playwright.config.ts .github/workflows/ci.yml
git commit -m "test(e2e): smoke tests for auth redirect and login form"
git push origin main
```

Run: `gh run watch`
Expected: pipeline vert. Puis ouvrir l'URL de production Vercel (`vercel ls` pour la retrouver) et confirmer que `/login` s'affiche correctement et que `/ma-journee` redirige bien vers `/login` en production.

---

## Résultat à la fin de ce plan

Un dépôt GitHub privé, une CI qui valide chaque Pull Request, une base Supabase avec schéma clinique sécurisé par RLS, un écran de connexion et un écran "Ma Journée" affichant de vraies données — déployés en production sur Vercel. C'est le socle sur lequel les plans suivants (Recherche Intelligente, Situation Terrain, Copilote Clinique) viendront s'ajouter, un par un, en suivant le même format.
