# Situation Terrain — liste/navigation — Design

**Statut :** Décidé par le contrôleur avec autorisation permanente du fondateur.
Prochaine étape : plan d'implémentation.

## Contexte

`/situations/[id]` (page détail) et la recherche (`/recherche`, `/copilote`)
existent déjà, mais il n'y a aucun moyen de parcourir l'ensemble des
Situations Terrain sans taper une requête. Ce chantier ajoute cet écran de
navigation dédié.

## Décisions

- **Nouvel écran `/situations`** (liste), distinct de `/situations/[id]`
  (détail, déjà existant, inchangé).
- **Contenu :** toutes les Situations Terrain publiées, triées
  alphabétiquement par titre. Réutilise `CarteSituationTerrain` (déjà
  construit, inchangé) pour chaque élément.
- **Pas de filtre par spécialité** pour cette v1 — tout le contenu actuel
  est `idel`, un filtre serait prématuré tant qu'il n'y a pas de contenu
  d'autres spécialités.
- **Lien de navigation dès le départ** : un bouton "Parcourir" ajouté sur
  Ma Journée, à côté de "Rechercher" et "Copilote" — corrige dès la
  conception le point manqué (et rajouté après coup) sur les deux
  chantiers précédents.
- **Aucune nouvelle policy RLS** — `situations_terrain_select_published`
  (`published = true and auth.role() = 'authenticated'`) couvre déjà cette
  lecture.

## Architecture

### Couche données (`lib/data/recherche.ts`, fichier existant)

```ts
getAllSituationsTerrain(supabase: SupabaseClient<Database>): Promise<SituationTerrain[]>
```

- `select * from situations_terrain where published = true order by titre`.
- Réutilise `mapSituationTerrain` (déjà défini dans ce fichier).

### Écran `/situations` (nouveau, protégé)

- `proxy.ts` : **aucune modification nécessaire.** `PROTECTED_PATHS`
  contient déjà `"/situations"` (utilisé via `startsWith`), et
  `config.matcher` contient déjà `"/situations/:path*"` — confirmé en
  lisant `proxy.ts` (2026-07-15) : le pattern Next.js `:path*` couvre zéro
  ou plusieurs segments, donc `/situations` (route bare, nouvelle) est
  déjà protégée par l'entrée existante ajoutée pour `/situations/[id]`.
- Server Component simple : appelle `getAllSituationsTerrain`, affiche la
  liste via `CarteSituationTerrain` ; message si aucune situation publiée.

### Ma Journée (modifié)

- Ajoute un troisième bouton "Parcourir" → `/situations`, à côté de
  "Rechercher" et "Copilote".

## Gestion des cas limites

- Aucune situation publiée : message « Aucune situation disponible pour
  le moment. » — cas peu probable en pratique mais à gérer proprement.

## Tests

- Vitest : `getAllSituationsTerrain` (mapping, tri), même pattern que les
  fonctions existantes de ce fichier.
- Pas de nouveau test de composant — `CarteSituationTerrain` déjà testé.
- Pas de nouveau test e2e dédié — `/situations` est déjà couverte par la
  même entrée `matcher`/`PROTECTED_PATHS` que `/situations/[id]` (confirmé
  en lisant `proxy.ts`, pas supposé) ; le comportement de redirection non
  authentifiée est structurellement identique à ce qui est déjà testé.

## Alternatives écartées

- **Filtre par spécialité :** hors scope pour cette v1, prématuré avec le
  volume de contenu actuel.
- **Pagination :** hors scope — volume de contenu trop faible pour le
  justifier aujourd'hui.
