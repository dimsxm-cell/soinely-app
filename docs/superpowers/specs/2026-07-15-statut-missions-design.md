# Changement de statut des missions (v1) — Design

**Statut :** Approuvé par le fondateur (2026-07-15). Prochaine étape : plan d'implémentation.

## Contexte

Le chantier "Missions du jour v1" a rendu la liste des missions du jour
consultable sur `/ma-journee`, mais en lecture seule — aucune mutation
n'existait encore dans l'application (seul `signInAction`, une écriture sur
`auth.users` via Supabase Auth, existait jusqu'ici ; aucune écriture directe
sur une table métier). Ce chantier est la première mutation "métier" du
projet et débloque, à terme, un Copilote contextuel capable de savoir quelle
mission l'IDEL réalise (`statut = 'en_cours'`).

## Décisions actées avec le fondateur

- **Progression à sens unique.** Un bouton qui avance d'une étape :
  à faire → en cours → terminée. Pas de sélecteur libre, pas de retour en
  arrière depuis l'interface.
- **Aucune confirmation avant "Terminer".** Le risque de clic accidentel
  est accepté pour cette v1 — priorité à la rapidité d'usage sur le
  terrain. Une correction resterait possible côté base de données si
  nécessaire.
- **Robustesse côté serveur malgré l'absence de confirmation côté UI.** Le
  Server Action revalide la transition demandée contre le statut réel
  actuellement en base (pas seulement ce que le formulaire soumet), pour
  qu'une requête modifiée à la main ne puisse pas imposer une transition
  invalide (ex. reculer un statut, ou sauter directement à "terminée").
  C'est une mesure de robustesse serveur, pas une friction ajoutée à
  l'usage normal.

## Architecture

### Server Action (`lib/data/ma-journee-actions.ts`, nouveau fichier)

Fichier séparé de `lib/data/ma-journee.ts` (qui reste dédié aux lectures,
sans directive `"use server"`) pour ne pas mélanger lectures pures et
mutation dans un même fichier marqué Server Action.

```ts
updateMissionStatutAction(formData: FormData): Promise<void>
```

- Lit `missionId` et `nouveauStatut` depuis le `FormData`.
- Relit le statut actuel de la mission en base (`select statut ... eq id`).
- N'applique la mise à jour que si la transition est l'une des deux
  légales (`a_faire → en_cours` ou `en_cours → terminee`) — sinon, ne fait
  rien silencieusement (pas d'erreur affichée, cohérent avec l'absence de
  confirmation : un clic "en retard" sur un état déjà changé ne doit pas
  planter l'écran).
- Aucune nouvelle migration, aucune nouvelle policy RLS — la policy
  existante `missions_du_jour_owner_all` (`for all using/with check`)
  couvre déjà l'UPDATE, scopée via `tournee_id → idel_id`.
- `revalidatePath("/ma-journee")` après une mise à jour réussie, pour que
  l'écran reflète le nouveau statut.

### `CarteMission` (composant existant, modifié)

- Garde tout son rendu actuel (patient, type de soin, heure, badge de
  statut) inchangé.
- Ajoute, à côté du badge, un formulaire avec deux champs cachés
  (`missionId`, `nouveauStatut`) et un bouton dont le libellé dépend du
  statut actuel ("Démarrer" si à faire, "Terminer" si en cours, aucun
  bouton si déjà terminée).
- Utilise directement `updateMissionStatutAction` importée depuis
  `lib/data/ma-journee-actions.ts` — pas de prop d'action à faire
  transiter depuis la page, cohérent avec le fait que `CarteMission`
  importe déjà des types depuis `lib/`.

## Gestion des cas limites

- Mission déjà "terminée" : aucun bouton affiché, cohérent avec la
  progression à sens unique.
- Transition invalide soumise (statut déjà changé entre-temps, ou requête
  modifiée à la main) : l'action ne fait rien, la page se réaffiche avec
  l'état réel en base — pas de crash, pas de message d'erreur intrusif.
- Aucun changement au comportement pour une tournée sans mission ou sans
  tournée du tout (déjà géré par le chantier précédent).

## Tests

- Vitest : `updateMissionStatutAction` — transition valide appliquée +
  `revalidatePath` appelé ; transition invalide (statut actuel ne
  correspond pas) → aucune écriture. Client Supabase simulé, même pattern
  que `app/login/actions.test.ts`.
- Vitest : `CarteMission` (fichier existant, étendu) — bouton "Démarrer"
  présent et correctement configuré pour `a_faire`, "Terminer" pour
  `en_cours`, aucun bouton pour `terminee`.
- Pas de nouveau test e2e Playwright — aucune nouvelle route, le
  comportement authentifié est vérifié manuellement (voir ci-dessous).

## Vérification manuelle

Après déploiement, le contrôleur (avec autorisation) vérifiera contre les
missions de test déjà en base (insérées lors du chantier précédent) :
appeler l'action pour une transition légale confirme le changement en
base ; tenter une transition illégale (ex. `terminee → a_faire`, ou
sauter directement à `terminee` depuis `a_faire`) confirme qu'elle est
rejetée silencieusement.

## Alternatives écartées

- **Sélecteur libre avec les 3 statuts :** écarté — plus de surface
  d'erreur (marquer par erreur "terminée" puis devoir corriger), sens
  unique jugé plus fidèle au déroulé réel d'une visite.
- **Confirmation avant "Terminer" :** écartée pour cette v1 — friction
  jugée non justifiée par le risque, qui reste corrigeable côté base si
  nécessaire.
- **Passer l'action en prop à `CarteMission` (au lieu d'un import
  direct) :** écarté — `CarteMission` importe déjà des types depuis
  `lib/`, importer l'action depuis `lib/data/ma-journee-actions.ts` reste
  dans la même direction de dépendance (components/ui → lib), pas
  d'inversion de couche à éviter ici.

## Hors scope (rappel)

- Détection automatique de la "mission en cours" par un futur Copilote —
  ce chantier fournit la donnée (`statut = 'en_cours'` désormais réel et
  actionnable), pas la logique de Copilote elle-même.
- Toute autre mutation (créer/supprimer une mission, modifier
  patient/heure/type de soin).
