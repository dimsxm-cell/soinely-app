# Refonte visuelle de « Accueil » (`/ma-journee`) — Design

> **Pour les exécutants agentiques :** ce document est une spec. L'implémentation passe par superpowers:writing-plans puis superpowers:subagent-driven-development.

## Contexte

`/ma-journee` est l'écran « Accueil » de l'app (déjà labellisé ainsi dans `BarreNavigationBasse`) : salutation, recherche, 4 stats de tournée (Patients/Injections/Pansements/Glycémies), checklist matériel, bouton « Réorganiser ma tournée », liste des missions du jour avec actions réelles (Démarrer/Terminer via `updateMissionStatutAction`, flux `a_faire → en_cours → terminee`). Ce chantier est une **refonte visuelle** à partir du mockup Claude Design `Acceuil.dc.html` (projet « Soinely APP Premium »), dans la continuité de la refonte déjà livrée sur `/ma-tournee` (même palette, même méthode) — **pas une reconstruction**.

Le mockup est une démo autonome, avec sa propre coquille d'app (barre du haut avec logo/recherche/avatar, barre d'onglets et bouton chat flottant en bas) — sa valeur est dans le contenu propre à l'écran (bandeau + stats + timeline), pas dans cette coquille, qui **fait doublon avec le layout réel** :

- `BarreSuperieure` (logo, recherche → `/recherche`, avatar → `/compte`) est déjà rendue globalement par `app/(app)/layout.tsx`.
- `BarreNavigationBasse` (Accueil/Ma tournée/Ely/Patients/Explorer, avec un onglet Ely central) est déjà rendue globalement par le même layout.

Ces deux éléments du mockup ne sont donc **pas repris** — seul le contenu de page en dessous change.

## Objectif

Adopter l'habillage visuel du mockup — bandeau dégradé violet avec salutation, mascotte Ely et pastilles de stats, bandeau de conseil Ely, timeline des missions redessinée, bouton flottant d'action rapide — sur `/ma-journee` uniquement, en conservant l'intégralité du comportement réel actuel (recherche, réorganisation, matériel, Démarrer/Terminer). Deux éléments réellement nouveaux, à partir de données déjà réelles dans l'app : un bandeau de conseil dynamique (texte dérivé de l'état de la tournée, pas d'appel LLM) et une stat « Km » calculée (somme des distances déjà stockées par mission).

## Portée de la nouvelle palette

Même palette que `/ma-tournee` (source : le même projet Claude Design) — `#6d28d9`, dégradé d'en-tête `linear-gradient(168deg,#221b33 0%,#2c1f47 58%,#3a2260 100%)`, accent `#a855f7` — **appliquée localement** à :

- `components/ui/EnTeteAccueil.tsx` (nouveau)
- `components/ui/CarteMission.tsx` (existant, restylé en place)

`CarteMission` n'est utilisé que par `app/(app)/ma-journee/page.tsx` (vérifié — aucun autre écran ne l'importe), donc le restyler directement ne fait courir aucun risque de fuite ailleurs.

**Non touchés**, comme pour Ma tournée : `app/globals.css` (tokens globaux), `BarreNavigationBasse.tsx`, et le fond de page (`bg-[#F6F7F5]` sur le `<main>` de `/ma-journee` — le mockup utilise `#e9e7e2` mais cette valeur reste scopée aux deux composants ci-dessus, pas à la page).

## Nouvelle donnée réelle : stat « Km »

Chaque mission a déjà une distance routière réelle depuis le cabinet (`distance_km`, éventuellement corrigée à la main dans `distance_km_corrigee`), calculée à la génération de la tournée (`lib/data/generation-tournee.ts`, `lib/distance.ts`). C'est une distance **aller simple cabinet → patient**, pas un itinéraire séquentiel patient-à-patient.

- `calculerKmTournee(missions: MissionTourneeVue[]): number | null` (nouvelle fonction pure, `lib/tournee-vue.ts` ou équivalent partagé) : somme `distanceKmCorrigee ?? distanceKm ?? 0` sur toutes les missions du jour, arrondie à l'entier. Renvoie `null` si aucune mission n'a de distance connue (aucun `distanceKm` ni `distanceKmCorrigee` non nul) — dans ce cas, affichage `—`.
- Affiché tel quel comme kilométrage approximatif de la journée — ce n'est pas l'itinéraire réel optimisé, mais une vraie donnée, pas une valeur inventée.

## Ce qui change visuellement

### `EnTeteAccueil.tsx` (nouveau composant)

- Fond : même dégradé que `EnTeteTournee`.
- Salutation réelle (« Bonjour »/« Bonsoir » selon l'heure + prénom, logique déjà présente dans `page.tsx` via `formatSalutation`/`formaterNomPropre`) + date réelle (`formatDateDuJour`, déjà existant) + mascotte Ely (image déjà utilisée sur la page actuelle).
- 4 pastilles de stats : **Visites** (nombre total de missions du jour), **Faites** (`terminee` OU `absent` — même règle que « valides » sur Ma tournée), **Restantes** (`a_faire` OU `en_cours` — même règle que Ma tournée), **Km** (voir section précédente).
- Bandeau de conseil Ely, texte dérivé de l'état réel :
  - une mission `en_cours` existe → « Soin en cours chez {nom} — pensez à la transmission avant de partir. »
  - sinon, une mission `a_faire` existe (la première dans l'ordre déjà renvoyé par `getMissionsDuJour`, `ordre_visite` puis `heure_prevue`) → « Prochaine visite : {nom} à {heure}. » (pas de temps de trajet inventé — contrairement au mockup qui affiche « Comptez 12 min de trajet », donnée fictive)
  - sinon (aucune mission restante) → « Tournée bouclée. Vos transmissions sont à jour, bonne journée. »
- Recherche : le champ `<input name="q">` existant (formulaire GET, filtrage côté serveur via `?q=`) est **conservé tel quel dans son comportement**, seulement reskinné avec le style du mockup — pas de bascule d'affichage cliquable (le mockup masque le champ derrière une icône ; on garde le champ toujours visible comme aujourd'hui, pour ne pas introduire un nouvel état d'interaction non demandé).

### `CarteMission.tsx` (restylé en place)

- Même traitement que `CarteMissionTournee` : badges de statut et avatar dans la nouvelle palette violette, chips d'actes en pilule claire, carte `en_cours` avec bordure violette.
- **Comportement inchangé** : mêmes boutons (Démarrer/Terminer), mêmes cibles (`/ma-journee/{id}`, lien contexte clinique), même flux de statut (`a_faire → en_cours → terminee`), pas de bouton « Absent » ici (n'existe pas sur cet écran aujourd'hui — pas ajouté).

## Nouvel élément : bouton flottant d'action rapide

Au-dessus de `BarreNavigationBasse` (`bottom-[calc(4rem+env(safe-area-inset-bottom,0px))]`, même correctif que celui posé sur Ma tournée) :

- Une mission `en_cours` existe → « Terminer le soin en cours » — déclenche réellement `updateMissionStatutAction` (`en_cours → terminee`), comme le bouton équivalent sur la carte.
- Sinon, une mission `a_faire` existe → « Démarrer · {nom} » — déclenche réellement `updateMissionStatutAction` (`a_faire → en_cours`) sur la première mission à faire, dans l'ordre déjà renvoyé par `getMissionsDuJour` (tri `ordre_visite` puis `heure_prevue` — aucun tri supplémentaire à ajouter).
- Sinon (aucune mission restante), le bouton est absent.

Contrairement au bouton « Suivant » de Ma tournée (qui fait défiler jusqu'à la carte), celui-ci **agit directement** — c'est une vraie action, pas une simple ancre, cohérent avec le fait que ce bandeau résume déjà toute l'information nécessaire (nom, heure).

## Ce qui est écarté du mockup

- Barre du haut du mockup (logo, recherche, avatar) et barre d'onglets + bouton chat flottant — doublons avec le layout global (`BarreSuperieure`, `BarreNavigationBasse`).
- Les écrans « Ma tournée / Patients / Explorer » simulés dans le même canvas — pure démo de prototype, la vraie nav mène déjà aux vraies pages.
- Bouton « + » (ajouter une mission) — aucune action réelle disponible pour l'instant ; sera ajouté avec le sous-projet « création de mission facturée » (voir Hors scope).
- Modale « Nouvelle mission » du mockup — même raison.
- Temps de trajet inventé dans le conseil Ely (« Comptez 12 min de trajet »).

## Conservé tel quel (existant, absent du mockup)

- Bouton « Réorganiser ma tournée » (`reorganiserTourneeAction`), sous la timeline, visible dans les mêmes conditions qu'aujourd'hui (≥ 2 missions à faire).
- Checklist Matériel (`CarteMateriel`), sous la timeline.

## Hors scope

- Sous-projet séparé : création de mission depuis l'accueil avec facturation NGAP réelle (sélecteur de codes NGAP à concevoir — n'existe pas encore dans l'app). Brainstormé séparément, après livraison de ce chantier.
- Itinéraire réel optimisé entre visites (la stat Km reste une approximation aller simple par mission).
- Tout changement à `BarreSuperieure` ou `BarreNavigationBasse`.
- Tout changement aux tokens globaux (`app/globals.css`).

## Tests

- `calculerKmTournee` : somme correcte avec un mélange de `distanceKm`/`distanceKmCorrigee`/valeurs nulles ; `null` si aucune mission n'a de distance.
- Comptage `Faites`/`Restantes` dans `EnTeteAccueil` : mêmes règles que Ma tournée (`terminee`/`absent` vs `a_faire`/`en_cours`), vérifié par des missions de tous statuts.
- Texte du conseil Ely : les trois cas (en cours / prochaine visite / tournée bouclée), pas de mention de temps de trajet.
- Bouton flottant : libellé et action selon l'état (Terminer / Démarrer / absent), déclenche bien `updateMissionStatutAction` avec les bons paramètres.
- Rendu de `CarteMission` : pas de régression sur les boutons Démarrer/Terminer existants, mêmes tests déjà en place à faire passer avec les nouvelles classes.
- Non-régression : `Réorganiser ma tournée` et `CarteMateriel` toujours affichés dans les mêmes conditions qu'aujourd'hui.
