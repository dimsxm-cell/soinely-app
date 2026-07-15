# Liste des missions du jour (v1) — Design

**Statut :** Approuvé par le fondateur (2026-07-15). Prochaine étape : plan d'implémentation.

## Contexte

L'écran `/ma-journee` affiche déjà les statistiques agrégées de la tournée du
jour (nb patients, injections, pansements, glycémies), mais ne montre jamais
les missions individuelles qui composent cette tournée. Le composant
`components/ui/CarteMission.tsx` existe et est entièrement fonctionnel
(labels de statut, classes de couleur) depuis le socle technique, mais n'est
utilisé nulle part dans l'application — signalé comme lacune par deux revues
finales successives (Recherche Intelligente, Copilote Clinique).

Ce chantier corrige cette lacune et sert aussi de **prérequis** pour un futur
Copilote contextuel ("Smart Context" — conscience de la mission en cours),
explicitement reporté lors du chantier Copilote Clinique faute de cet écran.

## Décisions actées avec le fondateur

- **Lecture seule pour cette v1.** Pas de changement de statut (à faire → en
  cours → terminée) depuis cet écran — ce sera un chantier séparé, avec ses
  propres mutations, Server Action et tests. Cette v1 se limite à
  l'affichage.
- **Emplacement : directement sur `/ma-journee`**, sous la grille de
  statistiques existante — pas un nouvel écran séparé. Cohérent avec ce que
  l'écran "Ma Journée" promet déjà par son nom.
- **Pas de navigation depuis une carte de mission.** `mission_clinique_id`
  existe en base (lien vers le protocole clinique de `missions_cliniques`),
  mais aucune page détail dédiée à une Mission Clinique n'existe encore
  (`/situations/[id]` affiche des missions liées, mais pas l'inverse). Voir
  une mission cliquer vers son protocole est hors scope pour cette v1.

## Architecture

Aucune nouvelle table, aucune nouvelle policy RLS. La policy existante
`missions_du_jour_owner_all` (`supabase/migrations/20260714000000_core_schema.sql`)
scope déjà l'accès via `tournee_id → idel_id` — cette v1 ne fait que lire.

### Couche données (`lib/data/ma-journee.ts`, fichier existant)

```ts
getMissionsDuJour(supabase: SupabaseClient, tourneeId: string): Promise<MissionDuJour[]>
```

- Requête : `select * from missions_du_jour where tournee_id = ? order by heure_prevue`.
- Mapping snake_case → camelCase, même pattern que `getTourneeDuJour` déjà
  dans ce fichier (fonction voisine, même domaine — pas de nouveau fichier).
- Le type `MissionDuJour` existe déjà dans `lib/types/clinical.ts`, aucun
  changement de type nécessaire.

### Écran `/ma-journee` (fichier existant, modifié)

- Si une tournée existe : récupérer aussi ses missions
  (`getMissionsDuJour(supabase, tournee.id)`).
- Afficher la liste des missions (triées par heure) sous la grille de
  statistiques, chaque mission via `CarteMission` (déjà construit,
  inchangé).
- Cas limite : tournée existante mais zéro mission → message distinct de
  celui déjà utilisé pour "aucune tournée" (voir Cas limites).

## Gestion des cas limites

- Pas de tournée aujourd'hui : comportement inchangé (message déjà
  existant "Aucune tournée enregistrée pour aujourd'hui.").
- Tournée existante, zéro mission : nouveau message « Aucune mission
  prévue pour aujourd'hui. ».
- Tournée existante avec missions : liste triée chronologiquement par
  `heure_prevue`.
- Une mission avec `mission_clinique_id` null (pas de protocole lié) :
  `CarteMission` n'affiche déjà rien de spécifique à ce champ — aucun
  changement nécessaire, le composant existant gère déjà ce cas
  implicitement (il n'affiche pas le lien).

## Tests

- Vitest : `getMissionsDuJour` (mapping snake_case → camelCase, même
  pattern que le test existant de `getTourneeDuJour`).
- Vitest : `CarteMission` — aucun test n'existe pour ce composant
  aujourd'hui bien qu'il soit déjà utilisé en production après ce
  chantier ; ce chantier ajoute son premier test (rendu patient/soin/heure,
  label + classe de couleur par statut).
- Pas de nouveau test e2e Playwright dédié — `/ma-journee` est déjà couvert
  par la protection de route existante (`proxy.ts`) ; ce chantier n'ajoute
  aucune nouvelle route.

## Vérification manuelle

Aucune donnée `missions_du_jour` n'existe aujourd'hui dans le projet
Supabase distant (le seed du socle n'en a jamais inséré). La vérification
manuelle post-déploiement nécessitera d'insérer quelques missions de test
réelles pour la tournée du compte de test (`test-idel@soinely.dev`) via
l'API Admin/REST, avec autorisation explicite du fondateur — même pattern
que les vérifications précédentes.

## Alternatives écartées

- **Changement de statut interactif :** écarté pour cette v1 — ajoute des
  mutations, un Server Action, et une surface de test significativement
  plus large. Chantier futur naturel une fois l'affichage validé.
- **Nouvel écran dédié (`/missions`) séparé de Ma Journée :** écarté —
  fragmenterait inutilement la vue "ma journée" en deux écrans alors qu'un
  seul répond déjà à l'intention de l'utilisateur.
- **Carte de mission cliquable vers son protocole clinique :** écarté —
  nécessiterait une nouvelle page détail pour Mission Clinique qui n'existe
  pas encore. Chantier futur.

## Hors scope (rappel)

- Changement de statut d'une mission.
- Page détail pour une Mission Clinique / son protocole.
- Conscience contextuelle du Copilote (dépend de cet écran, mais reste un
  chantier séparé une fois celui-ci livré).
