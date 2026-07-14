# Recherche Intelligente — Design

**Statut :** Approuvé par le fondateur (2026-07-14). Prochaine étape : plan d'implémentation.

## Contexte

Soinely est un copilote clinique pour IDEL (infirmiers libéraux à domicile). Le socle
technique (Next.js 16 + Supabase + Vercel) est en production. Le schéma clinique
(`situations_terrain`, `missions_cliniques`, `ngap_codes`) existe avec RLS, mais il n'y a
aucun moyen de le consulter dans l'app — seulement 2 lignes de contenu de test insérées
par le seed du socle.

La vision produit (SOINELY CORE — Clinical Knowledge Architecture) décrit une recherche
qui n'ouvre pas un document isolé mais un « écosystème clinique » : une Situation Terrain
liée à sa Mission Clinique, aux codes NGAP, aux recommandations HAS, etc. Ce chantier est
la première brique de cet écosystème : **rechercher une Situation Terrain et voir sa
Mission Clinique liée.** Les autres liens (NGAP, HAS, Copilote IA) sont volontairement
hors scope — voir Décisions ci-dessous.

## Décisions actées avec le fondateur

- **Direction produit confirmée :** Soinely reste un copilote clinique réservé aux IDEL
  (pas de marketplace patient — un document `SOINELY plan d'implémentation.pdf` décrivant
  une marketplace patient-cherche-infirmière a été identifié dans le dossier source et
  écarté comme non pertinent / brouillon obsolète).
- **Ordre des chantiers :** Recherche Intelligente d'abord, avant Situation Terrain
  (consultation dédiée) et Copilote Clinique.
- **Type de recherche :** texte (Postgres full-text + repli trigram), pas de recherche
  sémantique par embeddings — pas de dépendance IA externe pour ce chantier.
- **Périmètre du résultat :** Situation Terrain + Mission Clinique liée uniquement. Pas de
  liaison NGAP (aucune relation n'existe aujourd'hui entre `ngap_codes` et
  `missions_cliniques`/`situations_terrain` — création de cette relation hors scope).
- **Contenu :** les 2 Situations Terrain existantes (seed du socle) suffisent. La
  production de contenu clinique réel (rédaction, relecture, validation médicale) est un
  chantier séparé, avec son propre processus de validation.

## Architecture

Recherche plein-texte Postgres sur `situations_terrain`, avec repli trigram pour tolérer
les fautes de frappe. Un écran `/recherche` (protégé, authentifié) affiche les résultats ;
chaque résultat mène à une page détail `/situations/[id]` montrant la Situation Terrain
complète et sa Mission Clinique liée.

### Modèle de données (nouvelle migration)

- Colonne générée `search_vector tsvector` sur `situations_terrain`, combinant :
  - `titre` — poids A (fort)
  - `observation` — poids B
  - `causes_possibles`, `conduite_a_tenir` (jsonb, converties en texte) — poids C
  - config de recherche `french` (gère les variantes morphologiques : pansement/pansements).
- Index GIN sur `search_vector`.
- Extension `pg_trgm` activée. Index trigram (`gin_trgm_ops`) sur une expression
  `titre || ' ' || observation`.
- Aucune nouvelle policy RLS : `situations_terrain_select_published` (déjà
  `published = true and auth.role() = 'authenticated'`, ajoutée en Tâche 10) couvre la
  recherche comme la lecture directe.

### Routes et protection

- `proxy.ts` : ajouter `/recherche` et `/situations` à `PROTECTED_PATHS` et au `matcher`
  (même mécanisme que `/ma-journee` — non connecté → redirection `/login`).
- `/recherche` : formulaire de recherche (soumission → `?q=...` dans l'URL, pas de
  recherche instantanée en v1 — voir Alternatives écartées). Server Component qui lit
  `searchParams.q`.
- `/situations/[id]` : page détail d'une Situation Terrain.

### Couche données (`lib/data/recherche.ts`)

Suit le pattern déjà établi par `lib/data/ma-journee.ts` (mapping snake_case → camelCase,
testable avec un client Supabase simulé) :

```ts
searchSituationsTerrain(supabase: SupabaseClient, query: string): Promise<SituationTerrainResume[]>
getSituationTerrainDetail(supabase: SupabaseClient, id: string): Promise<SituationTerrainDetail | null>
```

- `searchSituationsTerrain` : requête primaire via
  `websearch_to_tsquery('french', query)` contre `search_vector`, classée par `ts_rank`.
  Si 0 résultat, requête de repli : `similarity(titre || ' ' || observation, query) > 0.2`,
  classée par similarité décroissante, limitée à 10 résultats.
- `getSituationTerrainDetail` : sélectionne la Situation Terrain par `id`, puis ses
  Missions Cliniques liées via `situation_terrain_id` (0, 1 ou plusieurs missions
  possibles — le schéma n'impose pas l'unicité).
- Types : étendre `lib/types/clinical.ts` si nécessaire (le type `SituationTerrain`
  existant couvre déjà tous les champs de la table).

### Composants UI

- Un composant de résultat de recherche (titre, extrait d'`observation` tronqué, badges
  `specialite`/`niveauConfiance`), suivant le style des composants existants
  (`components/ui/CarteInformation.tsx`, tokens Tailwind `rounded-card`, `bg-navy/10`,
  etc. — pas de nouvelle échelle de couleurs).
- Un layout de page détail affichant les champs de la Situation Terrain dans un ordre
  clinique logique : observation → vérifications → causes possibles → conduite à tenir →
  quand demander un avis médical → sources ; puis la ou les Missions Cliniques liées
  (étapes, durée estimée).

## Gestion des cas limites

- Champ de recherche vide à l'affichage initial de `/recherche` : aucune recherche
  lancée, pas de message d'erreur — juste le formulaire.
- Recherche sans résultat : message « aucun résultat pour cette recherche », pas une
  page cassée.
- Situation Terrain sans Mission Clinique liée (cas réel du seed : "Pansement qui saigne
  de façon inhabituelle" n'a aucune mission liée) : la section Mission Clinique est
  simplement absente de la page détail, sans erreur.
- `id` inconnu ou correspondant à une Situation Terrain non publiée dans
  `/situations/[id]` : `notFound()` (404 Next.js), pas de fuite d'information sur
  l'existence de contenu non publié.

## Tests

- Vitest : mapping snake_case → camelCase de `searchSituationsTerrain` et
  `getSituationTerrainDetail`, avec un client Supabase simulé (même pattern que
  `lib/data/ma-journee.test.ts`).
- Playwright (smoke) : recherche "hypoglycémie" sur `/recherche` → au moins un résultat
  affiché → clic sur le résultat → page `/situations/[id]` affiche le contenu attendu
  (observation, conduite à tenir, mission liée "Prise en charge hypoglycémie").
- Pas de test de charge / performance sur le GIN — hors scope à ce stade (2 lignes de
  contenu).

## Alternatives écartées

- **Recherche sémantique (embeddings + IA) :** rejetée pour ce chantier — dépendance à un
  fournisseur d'embeddings (coût, latence, nouvelle clé API) pour un bénéfice faible tant
  que le contenu clinique reste à 2-3 lignes. Réévaluable une fois la production de
  contenu clinique réel lancée.
- **Filtrage côté client (fetch tout + filtre JS) :** rejetée — ne passe pas à l'échelle,
  contourne RLS pour l'affichage (même si RLS reste correcte côté serveur), et devrait
  être reconstruite dès que le volume de contenu grandit. Pas une base solide.
- **Recherche instantanée (as-you-type, debounce) :** écartée pour la v1 au profit d'une
  recherche par soumission de formulaire (`?q=...`) — évite d'ajouter un Route Handler et
  une gestion de debounce côté client pour un gain d'UX marginal à ce stade. Amélioration
  naturelle pour une v2 si l'usage le justifie.
- **Nouvelle table de liaison `missions_cliniques` ↔ `ngap_codes` :** écartée pour ce
  chantier (décision produit du fondateur) — le lien NGAP dans l'écosystème clinique
  viendra dans un chantier ultérieur dédié.

## Hors scope (rappel)

- Production de contenu clinique réel (rédaction, relecture, validation médicale).
- Recherche sémantique / IA.
- Liaison NGAP.
- Copilote Clinique (assistant IA contextuel) — chantier suivant, dépend de ce que ce
  chantier construit (Situation Terrain consultable + recherche).
