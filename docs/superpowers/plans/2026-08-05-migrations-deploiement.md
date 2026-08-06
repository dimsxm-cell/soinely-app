# Filet de sécurité pour le déploiement des migrations Supabase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un job CI qui échoue bruyamment si des migrations locales ne sont pas appliquées à la base de production Supabase.

**Architecture:** Un nouveau job dans `.github/workflows/ci.yml`, déclenché uniquement sur push vers `main` après le succès de `build-and-test`, qui compare `local`/`remote` via `supabase migration list --output-format json` et fait échouer la build en cas d'écart.

**Tech Stack:** GitHub Actions, Supabase CLI (déjà en devDependency), `jq` (préinstallé sur `ubuntu-latest`).

## Global Constraints

- Le job ne s'exécute que sur push vers `main`, jamais sur une pull request.
- Le job ne réapplique aucune migration lui-même — Supabase Branching reste le seul acteur qui écrit sur le schéma de production (spec : Décision actée).
- Le ref du projet (`jeqrajpqbquewevjmond`) reste en clair dans le fichier — non sensible, déjà visible dans `NEXT_PUBLIC_SUPABASE_URL`.
- Le secret GitHub `SUPABASE_ACCESS_TOKEN` est déjà créé par la fondatrice — ne pas le redemander.

---

### Task 1: Job de vérification des migrations dans la CI

**Files:**
- Modify: `.github/workflows/ci.yml` (fichier entier, 26 lignes actuelles)

**Interfaces:**
- Aucune — changement de configuration CI, aucun code applicatif ne dépend de ce job.

- [ ] **Step 1: Ajouter le nouveau job**

Le fichier actuel se termine à la ligne 26 par le job `build-and-test`. Ajouter le nouveau job juste après, à la racine de `jobs:` (même niveau d'indentation que `build-and-test:`).

Avant (fichier complet) :
```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
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
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
```

Après (fichier complet) :
```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
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
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test

  verifie-migrations-supabase:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: build-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - name: Verifie que les migrations locales sont appliquees en production
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
        run: |
          npx supabase link --project-ref jeqrajpqbquewevjmond
          RESULTAT=$(npx supabase migration list --linked --output-format json)
          DESYNC=$(echo "$RESULTAT" | jq -r '[.migrations[] | select(.local != .remote)] | .[].local')
          if [ -n "$DESYNC" ]; then
            echo "::error::Migration(s) non appliquee(s) en production : $DESYNC"
            echo "Voir docs/superpowers/specs/2026-08-05-migrations-deploiement-design.md pour la procedure de reparation (supabase migration repair)."
            exit 1
          fi
          echo "Toutes les migrations sont synchronisees avec la production."
```

- [ ] **Step 2: Vérifier la syntaxe YAML**

Run: `npx js-yaml .github/workflows/ci.yml`
Expected: aucune erreur imprimée (la commande affiche le YAML parsé sans lever d'exception ; une erreur de syntaxe produirait un message `YAMLException` avec le numéro de ligne fautif)

- [ ] **Step 3: Relire la cohérence du nouveau job**

Vérifier à l'œil que : `if:` porte bien sur `github.event_name == 'push' && github.ref == 'refs/heads/main'` (pas sur `pull_request`), `needs: build-and-test` est présent, `SUPABASE_ACCESS_TOKEN` est lu depuis `secrets.` (jamais écrit en clair), et le ref du projet est exactement `jeqrajpqbquewevjmond` (celui confirmé avec la fondatrice sur le tableau de bord).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci(supabase): ajoute une verification des migrations non appliquees en production"
```

- [ ] **Step 5: Pousser et observer le run réel**

```bash
git push origin main
```

Ouvrir l'onglet **Actions** du dépôt GitHub (`https://github.com/dimsxm-cell/soinely-app/actions`). Attendre que le workflow `CI` se déclenche sur ce commit.

Expected : le job `build-and-test` passe (comme avant), puis le nouveau job `verifie-migrations-supabase` se déclenche et passe au vert, avec dans ses logs la ligne "Toutes les migrations sont synchronisees avec la production." — ceci confirme à la fois que le nouveau job fonctionne ET que Supabase Branching redéploie proprement depuis la réparation du registre faite plus tôt dans la journée (le push lui-même déclenche un nouveau run Supabase Branching, observable séparément sur `https://supabase.com/dashboard/project/jeqrajpqbquewevjmond/branches`).

Si le job échoue avec un message `Migration(s) non appliquee(s)` : s'arrêter et investiguer avant de continuer — cela signifierait qu'une migration a été ajoutée depuis la réparation sans être appliquée, ou que la réparation n'a pas pleinement pris.

## Vérification manuelle

Décrite dans le Step 5 ci-dessus — c'est la seule vérification de ce plan, il n'y a pas de test unitaire pour un changement de configuration CI (cohérent avec la spec, section Tests).
