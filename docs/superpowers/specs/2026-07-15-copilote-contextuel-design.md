# Copilote contextuel v2 (conscience de la mission en cours) — Design

**Statut :** Décidé par le contrôleur avec autorisation permanente du fondateur
("prend toi meme les decisions accept tous les reponses 1- (recommander)",
2026-07-15). Prochaine étape : plan d'implémentation.

## Contexte

Le chantier "Statut missions v1" a rendu `statut = 'en_cours'` réel et
actionnable — jusque-là, cette valeur ne pouvait jamais apparaître en usage
normal puisque rien ne permettait de la définir. C'était le prérequis
explicitement identifié lors du chantier Copilote Clinique v1 pour bâtir un
"Copilote contextuel" conscient de la mission en cours de l'IDEL — la
première brique de la vision "Smart Context" (Mission actuelle + Situation
Terrain + Recherche + HUB + Historique + Favoris).

Cette v2 se limite volontairement à la seule dimension "Mission actuelle" —
Historique, Favoris et HUB restent hors scope, comme prévu.

## Décisions

- **Portée : uniquement la mission `en_cours`.** Un lien "Contexte
  clinique" apparaît sur la carte de la mission en cours dans Ma Journée —
  pas sur les autres missions (à faire / terminée), pour lesquelles
  "contexte immédiat" n'a pas de sens.
- **Deux chemins selon les données disponibles, sans nouvelle table :**
  - Si la mission a un `mission_clinique_id` (lien direct vers un
    protocole clinique), le lien mène **directement** à la page détail de
    la Situation Terrain correspondante (`/situations/[id]`, déjà
    construite) via `missions_cliniques.situation_terrain_id` — aucune
    recherche nécessaire, contenu garanti pertinent.
  - Sinon, le lien mène à `/copilote?q={type_soin}` — une recherche
    pré-remplie avec le type de soin de la mission (ex. "Pansement"),
    réutilisant l'écran Copilote déjà construit tel quel (il lit déjà
    `searchParams.q`).
- **Une seule requête avec jointure imbriquée Supabase**
  (`missions_cliniques(situation_terrain_id)`) pour résoudre le lien
  direct sans requête supplémentaire — la relation existe déjà via la
  clé étrangère `missions_du_jour.mission_clinique_id`.
- **Robustesse :** si plusieurs missions étaient `en_cours` simultanément
  (le schéma ne l'empêche pas, même si l'usage normal ne le produit pas),
  la requête ne doit pas planter — prendre la première trouvée plutôt que
  d'utiliser `.maybeSingle()` (qui lèverait une erreur sur plusieurs
  lignes).

## Architecture

### Couche données (`lib/data/ma-journee.ts`, fichier existant)

```ts
getMissionEnCoursHref(supabase: SupabaseClient, tourneeId: string): Promise<{ missionId: string; href: string } | null>
```

- Requête : `missions_du_jour` filtrée sur `tournee_id` et
  `statut = 'en_cours'`, avec une jointure imbriquée
  `missions_cliniques(situation_terrain_id)`, limitée à 1 résultat.
- Si aucune mission en cours : `null`.
- Si `missions_cliniques` est présent (donc `situation_terrain_id`
  résolu) : `href = "/situations/{situationTerrainId}"`.
- Sinon : `href = "/copilote?q={encodeURIComponent(typeSoin)}"`.

### `CarteMission` (composant existant, étendu)

- Nouvelle prop optionnelle `contexteHref?: string`.
- Si fournie, affiche un lien "Contexte clinique" (bouton `variant="tertiary"`)
  à côté du badge de statut et du bouton de progression existant.
- Si absente (cas de toutes les missions autres que la mission en cours),
  aucun changement visuel — comportement actuel préservé à l'identique.

### Écran `/ma-journee` (fichier existant, modifié)

- Appelle `getMissionEnCoursHref(supabase, tournee.id)` en plus de
  `getMissionsDuJour` (uniquement si une tournée existe).
- En rendant la liste des missions, passe `contexteHref` à `CarteMission`
  uniquement pour la mission dont l'id correspond à celui retourné par
  `getMissionEnCoursHref` — toutes les autres cartes restent inchangées.

## Gestion des cas limites

- Aucune mission en cours : aucun lien "Contexte clinique" nulle part,
  comportement de l'écran inchangé par rapport à aujourd'hui.
- Mission en cours sans `mission_clinique_id` : lien vers
  `/copilote?q={type_soin}` — réutilise le comportement déjà testé de
  l'écran Copilote (recherche sans résultat gérée proprement s'il n'y a
  pas de contenu correspondant).
- Mission en cours avec `mission_clinique_id` pointant vers une Mission
  Clinique dont `situation_terrain_id` serait `null` (rare, mais le champ
  est nullable en base) : traité comme "pas de lien direct" — repli sur la
  recherche par type de soin plutôt que de générer un lien cassé vers
  `/situations/null`.
- Plusieurs missions `en_cours` simultanément (édge case non empêché par
  le schéma) : la requête prend la première trouvée sans planter.

## Tests

- Vitest : `getMissionEnCoursHref` — lien direct (mission_clinique_id
  résolu), lien de recherche (aucun lien), aucune mission en cours →
  `null`. Client Supabase simulé, même pattern que les fonctions
  existantes de ce fichier.
- Vitest : `CarteMission` (étendu) — lien "Contexte clinique" présent et
  correctement pointé quand `contexteHref` est fourni ; absent sinon.
- Pas de nouveau test e2e Playwright — aucune nouvelle route, comportement
  authentifié vérifié manuellement (voir ci-dessous).

## Vérification manuelle

Après déploiement, avec les missions de test déjà en base : marquer une
mission comme "en cours" (déjà possible depuis le chantier précédent),
puis vérifier que le lien "Contexte clinique" pointe correctement soit
vers `/situations/[id]` (pour la mission liée à "Prise en charge
hypoglycémie", si son `mission_clinique_id` est renseigné), soit vers
`/copilote?q=...` pour une mission sans lien direct.

## Alternatives écartées

- **Historique / Favoris / HUB :** hors scope, non requis pour ce
  premier pas de conscience contextuelle.
- **Lien "Contexte clinique" sur toutes les missions, pas seulement
  `en_cours` :** écarté — n'apporte rien pour une mission "à faire" ou
  "terminée" ; ajoute du bruit visuel sans valeur.
- **Génération de réponse par IA à partir du contexte :** toujours hors
  scope, cohérent avec la décision "zéro IA générative" actée pour le
  Copilote v1.
