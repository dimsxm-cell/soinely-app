# Navigation vers le patient suivant — Design

**Statut :** Design validé en dialogue avec le fondateur (2026-07-16). Reste
à valider : ce document écrit, avant de passer au plan d'implémentation.

## Contexte

Troisième des 4 mini-chantiers issus de "le geste de fin de soin" (les 2
premiers — transmission/dernière transmission et absence — ont été livrés
par `docs/superpowers/specs/2026-07-16-fiche-patient-v2-design.md`, fusionné
sur `main`). Le document source décrit qu'après avoir terminé une visite, le
flux propose "Patient suivant ?" puis lance la navigation automatiquement.

État actuel exploité par ce chantier :
- `missions_du_jour` est déjà triable par `heure_prevue` au sein d'une
  tournée (`getMissionsDuJour`, déjà utilisé sur `/ma-journee`).
- Les statuts `a_faire`/`en_cours`/`terminee`/`absent` existent déjà
  (`missions_du_jour.statut`).
- `/ma-journee/[missionId]` a déjà une zone vide une fois le statut
  `terminee` ou `absent` atteint : `PROCHAIN_STATUT` n'a pas d'entrée pour
  ces deux statuts, donc le bloc de bouton d'action ne rend plus rien
  (`app/ma-journee/[missionId]/page.tsx:161-180`).
- Chaque fiche patient a déjà son propre bouton Itinéraire (lien Google
  Maps universel construit depuis `patients.adresse`) — pas besoin de le
  dupliquer, il suffit d'amener l'IDEL sur la fiche du patient suivant.

## Décisions actées avec le fondateur

- **"Patient suivant" = la prochaine mission `a_faire` de la même tournée,
  triée par `heure_prevue` croissant, la première trouvée** — pas "la
  suivante dans l'ordre des visites faites". Ça gère naturellement le cas
  où l'IDEL termine ses visites dans le désordre (retard, urgence) : le
  patient suivant proposé reste toujours le plus urgent restant, jamais un
  patient déjà vu.
- **Calculé seulement quand c'est pertinent** — uniquement quand le statut
  de la mission consultée est `terminee` ou `absent`. Pas de requête
  supplémentaire quand la mission est encore `a_faire`/`en_cours`.
- **Geste : lien explicite, pas de redirection automatique sans clic.** Le
  document source évoque une navigation "automatique", mais rediriger sans
  action de l'IDEL retirerait la possibilité de relire une dernière fois la
  fiche courante (consignes, allergie) avant de partir. Le lien amène vers
  la fiche complète du patient suivant (consignes, allergie, bouton
  Itinéraire déjà là) plutôt que de lancer directement une app de
  navigation externe — cohérent avec le fait qu'aucune fiche n'a
  aujourd'hui de raccourci Itinéraire "depuis l'extérieur" de la fiche.
- **Aucun état de "fin de tournée" élaboré pour cette v1.** Si aucune
  mission `a_faire` ne reste dans la tournée, un message d'une ligne
  confirme qu'il n'y a plus personne à voir — pas d'écran dédié, pas de
  récapitulatif de la journée.

## Architecture

### Types (`lib/types/clinical.ts`, modifié)

Nouveau type `ProchaineMission` et nouveau champ sur `MissionDetail` :

```ts
export interface ProchaineMission {
  id: string;
  patientNom: string;
  heurePrevue: string;
}

export interface MissionDetail extends MissionDuJour {
  patient: Patient;
  transmission: string | null;
  derniereTransmission: string | null;
  prochaineMission: ProchaineMission | null;
}
```

`tourneeId` n'est pas exposé sur `MissionDetail` : il n'est utile qu'en
interne à `getMissionDetail` pour retrouver le patient suivant, l'écran n'en
a jamais besoin directement.

### Couche données (`lib/data/ma-journee.ts`, modifié)

Nouvelle fonction privée (non exportée, même statut que
`getDerniereTransmission` aujourd'hui) :

```ts
async function getProchaineMission(
  supabase: SupabaseClient<Database>,
  tourneeId: string
): Promise<ProchaineMission | null>
```

Requête : `missions_du_jour` filtrée par `tournee_id` égal et `statut`
égal à `a_faire`, triée par `heure_prevue` croissant, limitée à 1 résultat,
avec le nom du patient joint (`patients(nom_complet)`). Retourne `null` si
aucune ligne ou en cas d'erreur — même comportement de dégradation
silencieuse que `getMissionEnCoursHref`/`getTourneeDuJour`.

`getMissionDetail` (existant) est étendu :
- sélectionne aussi `tournee_id` sur la mission (nouveau, non exposé en
  sortie — voir Types ci-dessus) ;
- une fois le statut connu, appelle `getProchaineMission` seulement si
  `statut === "terminee" || statut === "absent"` ; sinon `prochaineMission`
  vaut `null` sans requête.

Point d'attention pour le plan d'implémentation : cette nouvelle requête
partage la table `missions_du_jour` et un embed `patients(...)` avec les
deux requêtes déjà présentes dans `getMissionDetail` (la mission elle-même,
et `getDerniereTransmission`) — les tests unitaires existants distinguent
ces requêtes par le contenu de la chaîne passée à `.select(...)`
(`ma-journee.test.ts:165-186`) ; la nouvelle requête aura besoin d'une
distinction équivalente (par exemple la présence de `heure_prevue` sans
`patient_id`, ou un mock à 3 branches plutôt que 2).

### Écran `/ma-journee/[missionId]` (existant, modifié)

Dans le bloc conditionnel existant sur `prochainStatut`
(`app/ma-journee/[missionId]/page.tsx:161`), qui aujourd'hui ne rend rien
quand le statut est `terminee`/`absent` : ajoute une branche alternative
(zone qui n'a jamais de contenu aujourd'hui pour ces deux statuts) :

- si `mission.prochaineMission` n'est pas `null` : un bloc "Patient
  suivant" (même style de carte que les autres sections de la fiche) avec
  le nom, l'heure prévue, et un lien `<Link href={\`/ma-journee/${id}\`}>`
  vers la fiche complète de ce patient ;
- sinon (aucune mission `a_faire` restante dans la tournée) : un message
  d'une ligne, "Aucun autre patient à voir aujourd'hui."

## Gestion des cas limites

- Mission consultée encore `a_faire`/`en_cours` : `prochaineMission` vaut
  toujours `null`, aucun bloc "Patient suivant" ne s'affiche (zone occupée
  par le bouton d'action habituel, comportement inchangé).
- La tournée n'a plus aucune mission `a_faire` (dernière visite du jour, ou
  toutes les autres sont déjà `terminee`/`absent`) : message "Aucun autre
  patient à voir aujourd'hui.", pas de bloc vide, pas de lien mort.
- Plusieurs missions `a_faire` à la même `heure_prevue` : l'ordre entre
  elles n'est pas garanti (aucune clé de tri secondaire) — accepté, cas
  limite déjà non géré ailleurs dans l'app (`getMissionsDuJour` a le même
  comportement).
- Mission `a_faire` retrouvée appartenant à une tournée différente (autre
  IDEL, autre jour) : impossible par construction, la requête filtre par
  `tournee_id` égal à celui de la mission consultée, et `tournees_owner_all`
  empêche de toute façon de lire la tournée d'une autre IDEL.

## Tests

- Vitest : `getMissionDetail` — nouveaux cas : statut `terminee` avec une
  mission `a_faire` disponible dans la même tournée (retourne la bonne,
  la plus proche par `heure_prevue`, pas nécessairement la première
  insérée) ; statut `terminee` sans aucune mission `a_faire` restante
  (`prochaineMission` à `null`) ; statut `absent` avec une mission
  disponible ; statut `a_faire`/`en_cours` (aucune requête supplémentaire
  attendue, `prochaineMission` à `null` sans avoir besoin de mocker cette
  requête).
- Pas de nouveau test dédié pour `app/ma-journee/[missionId]/page.tsx` —
  cohérent avec la convention déjà établie sur cet écran (aucun test direct
  depuis sa création).
- Pas de nouveau test e2e Playwright dédié — même écran déjà couvert,
  aucune nouvelle route.

## Vérification manuelle

Après déploiement, avec autorisation explicite du fondateur : sur la
tournée de test déjà en place, marquer une mission `terminee` (ou
`absent`) alors qu'il reste au moins une mission `a_faire` plus tardive
dans la même tournée, et confirmer que le bloc "Patient suivant" affiche
la bonne mission (la plus proche par heure, pas la suivante par ordre
d'ID) ; marquer toutes les missions restantes comme vues et confirmer que
le message "Aucun autre patient à voir aujourd'hui." apparaît à la
dernière ; suivre le lien "Patient suivant" et confirmer l'arrivée sur la
bonne fiche.

## Alternatives écartées

- **Redirection automatique sans clic** (la formulation "automatiquement"
  du document source, prise au pied de la lettre) : écartée — retirerait
  la possibilité de relire la fiche courante avant de partir, et romprait
  avec le fait qu'aucun autre geste de l'app ne redirige sans action
  explicite de l'IDEL.
- **Lancer directement l'itinéraire externe (Google Maps) vers le patient
  suivant, en sautant sa fiche** : écartée — la fiche du patient suivant
  contient des informations utiles avant de partir (allergie, consignes),
  et son bouton Itinéraire existe déjà ; dupliquer ce lien ailleurs
  n'apporte rien.
- **Écran dédié "Fin de tournée"** (récapitulatif de la journée une fois
  toutes les missions vues) : écarté pour cette v1 — un message d'une
  ligne suffit à fermer la boucle ; un futur module dédié pourrait le
  remplacer plus tard si le besoin apparaît.
- **"Patient suivant" = ordre d'insertion ou position dans la liste** au
  lieu de tri par `heure_prevue` : écartée — ne reflèterait pas l'ordre
  réel de la tournée dès qu'une visite est faite en retard ou dans le
  désordre.

## Hors scope (rappel)

- Photo, rappel — 2 des 4 mini-chantiers de "geste de fin de soin", non
  traités ici.
- Tout écran ou notification de fin de tournée (voir Alternatives
  écartées).
- Lancement automatique d'une app de navigation externe (voir Alternatives
  écartées) — le bouton Itinéraire existant sur la fiche du patient suivant
  couvre ce besoin une fois qu'on y est arrivé.
