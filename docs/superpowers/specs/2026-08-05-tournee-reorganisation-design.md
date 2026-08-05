# Tenir la promesse marketing (réorganisation de tournée) — Design

**Statut :** Design validé en dialogue avec la fondatrice (2026-08-05).

## Contexte

Troisième et dernier chantier d'une série de 3 améliorations du copilote Ely
(après le badge de fiabilité, PR #49, et la conscience du contexte de
mission, PR #50).

La landing page de Soinely promet une fonctionnalité qui n'existe nulle part
dans l'app : détection automatique d'un embouteillage, réorganisation
instantanée de la tournée, et un gain chiffré ("18 minutes", "jusqu'à 1h par
jour"). Le texte exact, retrouvé dans plusieurs composants marketing :

- `Hero.tsx:390` — *"Un embouteillage est détecté sur votre route. Je peux
  réorganiser votre tournée et vous faire gagner 18 minutes."* + bouton
  *"Optimiser ma tournée"*.
- `JourneeAvecSoinely.tsx:122-123` — *"Embouteillage détecté... + 18 min de
  retard. Souhaitez-vous optimiser votre tournée ?"* + bouton *"Optimiser"*.
- `EnTempsReel.tsx:33` — *"Trafic, urgence, annulation de patient… SOINELY
  réorganise, recalcule et vous propose toujours la meilleure option."*
- `RangeeFonctionnalites.tsx:5,38` — *"Des tournées optimisées qui s'adaptent
  en temps réel"*, *"ELY réorganise pour vous"*.
- `VideoDemo.tsx:4` — *"Tournée optimisée"*.

Côté app réelle : `lib/data/generation-tournee.ts` ordonne les missions
uniquement par `heure_prevue` (l'heure prescrite sur le soin), sans aucun
algorithme d'ordonnancement. `lib/distance.ts` calcule une distance
point-à-point cabinet→patient via OpenRouteService (avec repli local par
Haversine), utilisée uniquement pour la cotation kilométrique (IK) — pas
pour du trafic, ni pour réordonner une tournée. Aucune détection
d'embouteillage, aucun bouton "Optimiser", aucune fonctionnalité de
réordonnancement n'existe.

Tenir la promesse littérale — trafic temps réel détecté automatiquement,
avec un gain de temps mesuré — demanderait une API de trafic payante
(Google/Mapbox/TomTom/HERE) avec coût récurrent, ou un suivi GPS continu de
l'IDEL pendant sa conduite : deux investissements d'infrastructure d'un tout
autre ordre de grandeur que les deux chantiers précédents. Ce chantier
retient une version plus modeste mais réellement fonctionnelle, qui couvre
honnêtement l'esprit de la promesse sans ces investissements.

## Décisions actées avec la fondatrice

- **Deux fonctionnalités réelles, combinées** : un lien de navigation Waze
  par visite (délègue le trafic temps réel à Waze, qui le fait déjà très
  bien, gratuitement) + un bouton de réorganisation manuelle de l'ordre des
  visites restantes (déclenché par l'IDEL, pas de détection automatique).
- **Pas d'API de trafic tierce, pas de suivi GPS continu.** Écartés pour
  leur coût récurrent et leur lourdeur d'infrastructure, disproportionnés
  pour ce chantier.
- **La réorganisation crée un nouvel ordre de visite, distinct de l'heure
  prescrite.** `heure_prevue` (issue des horaires prescrits sur les soins)
  n'est jamais réécrite automatiquement — elle peut correspondre à une
  contrainte médicale (ex. horaire d'injection). Un nouveau champ porte
  l'ordre de passage suggéré.
- **Point de départ du calcul : la dernière visite commencée/terminée**,
  pas la position GPS actuelle. Aucune permission ni service supplémentaire
  requis ; hypothèse raisonnable pour une tournée à domicile séquentielle.
  Le cabinet sert de point de départ si la tournée n'a pas encore commencé.
- **Le discours marketing est réécrit**, pas seulement complété : les
  passages qui promettent une détection automatique et un gain chiffré
  précis sont remplacés par une description fidèle des deux fonctionnalités
  livrées.

## Architecture

### 1. Lien "Naviguer avec Waze"

Sur `app/(app)/ma-journee/[missionId]/page.tsx`, un 4ᵉ lien dans le bloc
"Dossier du patient", après "Voir la fiche du patient" et "Demander à Ely" :

```tsx
<Link
  href={hrefWaze(mission.patient)}
  className="row-lift mt-2.5 flex items-center justify-between rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)]"
>
  <span className="text-[15px] font-semibold text-navy">Naviguer avec Waze</span>
  {/* même chevron SVG que les liens voisins */}
</Link>
```

`hrefWaze` construit `https://waze.com/ul?ll=<lat>,<lon>&navigate=yes`
quand le patient est géocodé (`patients.latitude`/`longitude`, déjà
utilisées par `lib/data/generation-tournee.ts` pour la cotation
kilométrique), et se rabat sur `https://waze.com/ul?q=<adresse
encodée>&navigate=yes` sinon. Format vérifié directement auprès de la
documentation développeur Waze : lien universel, fonctionne comme un
`<a href>` simple sans SDK, et Waze gère lui-même le repli vers sa version
web si l'app n'est pas installée.

`getMissionDetail` (`lib/data/ma-journee.ts`) doit sélectionner
`patients.latitude`/`patients.longitude` en plus des colonnes déjà lues, et
`MissionDetail.patient` (`lib/types/clinical.ts`) gagne deux champs
optionnels `latitude: number | null` et `longitude: number | null`.

### 2. Réorganisation manuelle de l'ordre des visites

**Schéma.** Nouvelle migration SQL (suivant le patron de
`supabase/migrations/20260801000300_kilometrage.sql`) :

```sql
alter table public.missions_du_jour
  add column if not exists ordre_visite integer;

comment on column public.missions_du_jour.ordre_visite is
  'Ordre de passage suggéré par la réorganisation manuelle. Nul tant
  qu''aucune réorganisation n''a eu lieu — l''affichage se rabat alors sur
  heure_prevue. Ne remplace jamais heure_prevue, qui reste l''horaire
  prescrit du soin.';
```

**Tri.** `getMissionsDuJour` et `getMissionsTourneeVue` (`lib/data/ma-journee.ts`)
trient par `ordre_visite` quand il est renseigné, sinon par `heure_prevue`
comme aujourd'hui — via `.order("ordre_visite", { nullsFirst: true })
.order("heure_prevue")`. Les valeurs nulles (missions déjà `terminee`/
`en_cours`, jamais touchées par la réorganisation, et tant qu'aucune
réorganisation n'a eu lieu) passent en premier, triées entre elles par
`heure_prevue` — donc avant les missions `a_faire` fraîchement numérotées,
ce qui reproduit le tri actuel tant qu'aucune ligne n'a de `ordre_visite`,
et place les visites déjà faites avant les visites à venir une fois la
tournée réorganisée. `MissionDuJour` gagne un champ
`ordreVisite: number | null`.

**Algorithme.** Nouvelle fonction `calculerOrdreVisites` (dans
`lib/data/generation-tournee.ts`, à côté de `calculerDistancesDepuisCabinet`
qu'elle réutilise en partie) :

1. Charger les missions `statut = 'a_faire'` de la tournée avec leurs
   patients (`latitude`, `longitude`).
2. Mettre de côté les patients non géocodés (aucune distance calculable pour
   eux) — ils recevront les derniers numéros de la séquence, après tous les
   patients géocodés, plutôt que de rester à `ordre_visite` nul : un
   `ordre_visite` nul est réservé aux missions jamais touchées par une
   réorganisation (`terminee`/`en_cours`, voir Tri ci-dessous), et y mêler
   une mission `a_faire` la ferait trier avec les visites déjà faites.
3. Point de départ : le patient de la mission `en_cours` s'il y en a une,
   sinon celui de la mission `terminee` la plus récente (par
   `heure_prevue`), sinon les coordonnées du cabinet
   (`profiles.cabinet_latitude/longitude`).
4. Plus-proche-voisin glouton sur les seuls patients géocodés : depuis le
   point courant, choisir la mission restante la plus proche
   (`calculerDistanceRoutiereKm`, appels en parallèle à chaque étape via
   `Promise.all`), l'ajouter à l'ordre, la retirer des candidates, répéter
   jusqu'à épuisement.
5. Ajouter les missions non géocodées (étape 2) à la suite, dans un ordre
   arbitraire stable (ex. leur ordre de lecture initial).
6. Retourner la liste des `missionId` dans le nouvel ordre — géocodées
   d'abord dans l'ordre calculé, non géocodées ensuite.

**Action.** Nouvelle Server Action `reorganiserTourneeAction` dans
`lib/data/ma-journee-actions.ts`, suivant le patron de
`updateMissionStatutAction` (même type de retour `ResultatEcriture`) :
appelle `calculerOrdreVisites`, écrit `ordre_visite` (1, 2, 3…) sur chaque
mission `a_faire` de la tournée du jour, `revalidatePath("/ma-journee")` et
`revalidatePath("/ma-tournee")`. Si aucun patient restant n'est géocodé
(coordonnées manquantes partout, y compris l'origine), retourne une erreur
plutôt qu'un ordre arbitraire : `{ succes: false, erreur: "Pas assez
d'adresses localisées pour réorganiser la tournée." }`.

**UI.** Bouton "Réorganiser ma tournée" en haut de la liste "Missions du
jour" sur `app/(app)/ma-journee/page.tsx`, via `FormulaireAvecRetour`
(même composant que les autres actions de la page, avec son affichage
d'erreur déjà intégré) — visible seulement s'il reste au moins deux
missions `a_faire`. `CarteMission` (`components/ui/CarteMission.tsx`) gagne
un petit badge numéroté dans sa colonne de gauche (à côté du point de
statut) quand `mission.ordreVisite` n'est pas nul, pour que l'ordre affiché
reste lisible même s'il ne suit plus `heure_prevue`.

### 3. Réalignement du discours marketing

Les passages relevés dans "Contexte" sont réécrits pour décrire
fidèlement les deux fonctionnalités livrées — réorganisation en un geste
et navigation Waze en temps réel — sans promettre de détection automatique
ni de gain chiffré non mesuré. Exemple pour `Hero.tsx` : remplacer *"Un
embouteillage est détecté sur votre route. Je peux réorganiser votre
tournée et vous faire gagner 18 minutes."* par une formulation du type
*"Un imprévu sur la route ? Réorganisez votre tournée en un geste, et
laissez Waze vous guider en temps réel."* — le détail exact de chaque
réécriture (5 fichiers) sera arrêté au moment du plan, fichier par fichier,
en conservant le ton et la structure visuelle existants (mêmes composants,
mêmes tailles, seul le texte change).

## Cas limites

- **Patient sans coordonnées géocodées** (lien Waze) : repli sur
  `q=<adresse>` — toujours un lien fonctionnel, jamais un lien mort.
- **Patient sans coordonnées géocodées** (réorganisation) : exclu du calcul
  de proximité, reçoit un `ordre_visite` en fin de séquence plutôt que de
  faire échouer toute la réorganisation ou de rester à `ordre_visite` nul
  (qui le ferait trier avec les visites déjà faites, voir Tri).
- **Aucune mission `terminee`/`en_cours`** (tournée pas commencée) : origine
  = cabinet. Si le cabinet n'est pas non plus géocodé, comportement identique
  au cas "aucun patient géocodé" ci-dessus côté action.
- **Une seule mission `a_faire` restante, ou zéro** : rien à réordonner, le
  bouton est masqué (pas d'état d'erreur à gérer côté action).
- **Réorganisation relancée plusieurs fois dans la journée** : chaque appel
  recalcule depuis la situation actuelle (nouvelle origine si une visite a
  été terminée entre-temps) et réécrit `ordre_visite` sur les seules
  missions encore `a_faire` — idempotent, pas d'accumulation d'état.
- **OpenRouteService indisponible** : `calculerDistanceRoutiereKm` se rabat
  déjà sur l'estimation locale (Haversine + coefficient de sinuosité,
  `lib/distance.ts`) — la réorganisation continue de fonctionner, avec une
  précision moindre.

## Tests

- `calculerOrdreVisites` (nouveau, dans le fichier de test de
  `generation-tournee.ts`) : ordre correct sur un jeu de patients géocodés
  avec une origine connue ; patients non géocodés relégués en fin de liste
  sans faire échouer le calcul ; origine = cabinet quand aucune mission
  n'est commencée ; liste vide ou à un élément retournée telle quelle.
- `reorganiserTourneeAction` : écrit `ordre_visite` dans le bon ordre sur
  les missions `a_faire` uniquement ; erreur explicite si aucune coordonnée
  disponible ; ne touche pas `heure_prevue`.
- `hrefWaze` (ou fonction équivalente) : URL avec `ll=` quand géocodé, URL
  avec `q=` sinon, encodage correct de l'adresse.
- `CarteMission` : badge numéroté affiché quand `ordreVisite` est fourni,
  absent sinon (régression du comportement actuel).
- Pas de test pour les changements de copie marketing (texte statique, pas
  de logique).

## Vérification manuelle

Sur une tournée avec plusieurs missions `a_faire` et des patients géocodés,
cliquer "Réorganiser ma tournée" sur `/ma-journee` et confirmer que l'ordre
d'affichage change, que les badges numérotés apparaissent, et que les
heures affichées (`heure_prevue`) restent inchangées. Ouvrir une mission et
cliquer "Naviguer avec Waze", confirmer l'ouverture de Waze routé vers la
bonne adresse (ou son équivalent web si l'app n'est pas installée sur la
machine de test). Vérifier visuellement les 5 sections marketing modifiées
sur la landing page.

## Alternatives écartées

- **API de trafic tierce (Google/Mapbox/TomTom/HERE) pour une détection
  automatique** : écartée pour son coût récurrent et la facturation à
  mettre en place, disproportionnés pour ce chantier. Resterait un chantier
  à part entière si retenue plus tard.
- **Suivi GPS continu de l'IDEL** : écarté pour la question de confiance et
  de vie privée qu'il soulève, et la lourdeur d'implémentation (permission
  navigateur, gestion batterie) pour un bénéfice incertain.
- **Position GPS ponctuelle au moment du clic** : plus précise que "dernière
  visite terminée" si l'IDEL est bloquée ailleurs qu'à proximité de son
  dernier arrêt, mais ajoute une invite de permission à chaque usage pour un
  gain marginal dans le cas courant. Écartée pour rester simple ; peut
  redevenir pertinente si l'usage réel montre que l'hypothèse "elle est près
  de sa dernière visite" est trop souvent fausse.
- **Waze pour l'itinéraire multi-arrêts** : vérifié auprès de la
  documentation officielle, les deep links Waze ne supportent qu'une seule
  destination et ne renvoient aucune donnée (ETA, trafic) à l'app appelante.
  Waze reste utile uniquement pour le trajet vers UNE visite à la fois.
- **Réécrire `heure_prevue` au lieu d'ajouter `ordre_visite`** : écartée par
  la fondatrice — `heure_prevue` peut porter une contrainte médicale
  prescrite, qu'un algorithme de proximité n'a pas à modifier.
- **Algorithme d'optimisation plus poussé (2-opt, etc.)** : le plus-proche-
  voisin glouton suffit pour le nombre de visites d'une tournée d'IDEL
  (généralement moins de 15) ; un raffinement resterait possible plus tard
  sans changer l'architecture (même point d'entrée, meilleur calcul interne).

## Hors scope

- Détection automatique d'un imprévu (trafic, urgence) — le déclenchement
  reste manuel dans ce chantier.
- Toute intégration d'API de trafic ou de service de cartographie payant.
- Réordonnancement des missions déjà `terminee` ou `absent`.
- Modification de `heure_prevue` par quelque mécanisme que ce soit.
