# Refonte visuelle de « Ma tournée » — Design

> **Pour les exécutants agentiques :** ce document est une spec. L'implémentation passe par superpowers:writing-plans puis superpowers:subagent-driven-development.

## Contexte

`/ma-tournee` est un écran déjà pleinement fonctionnel : en-tête de progression, 4 filtres (Tout/À faire/Alertes/Validés), cartes de mission avec badges de statut, boutons d'action réels (GPS/Waze, Appeler, Valider, Absent, annulations), calcul de facturation avec majorations. Ce chantier est une **refonte visuelle** de cet écran à partir d'un mockup produit dans Claude Design (`claude.ai/design`, projet « App design instructions », fichier `Ma tournée.dc.html`), **pas une reconstruction** — toute la logique métier existante est conservée.

Le mockup lui-même simplifie certains comportements réels (voir « Comportements à ne pas copier du mockup » plus bas) — sa valeur est dans la mise en page et le style visuel, pas dans sa logique d'interaction, écrite pour une démo autonome sans vraies données.

## Objectif

Adopter l'habillage visuel du mockup — en-tête violet dégradé avec anneau de progression circulaire, filtres en pilules intégrés à l'en-tête, cartes de mission redessinées, bouton flottant « Suivant » — **uniquement sur `/ma-tournee`**, sans toucher au reste de l'app, tout en conservant l'intégralité du comportement réel actuel. Une fonctionnalité réellement nouvelle est ajoutée : un badge de retard basé sur l'heure réelle de début du soin en cours (pas seulement décoratif comme dans le mockup).

## Portée de la nouvelle palette

Nouvelle teinte violette `#6d28d9` (au lieu de `#7C3AED`) et fond `#e9e7e2` (au lieu de `#F6F7F5`), **appliqués localement** aux trois composants qui n'existent que sur cet écran :

- `components/ui/EnTeteTournee.tsx`
- `components/ui/OngletsFiltresTournee.tsx`
- `components/ui/CarteMissionTournee.tsx`

Ces trois composants ne sont utilisés que par `app/(app)/ma-tournee/page.tsx` (vérifié — aucun autre écran ne les importe), donc les styliser directement ne fait courir aucun risque de fuite ailleurs. Les valeurs de couleur du mockup sont utilisées en dur (`style={{ }}` ou classes Tailwind arbitraires `bg-[#6d28d9]`), **pas** en modifiant `app/globals.css` — ces tokens globaux (`--color-brand-violet`, `--background`) ne changent pas.

**`components/layout/BarreNavigationBasse.tsx` (barre de navigation basse) n'est pas touchée** — elle est partagée par toute l'app, donc reste sur la palette actuelle (`#7C3AED`) même quand elle est affichée sous `/ma-tournee`. Seul le contenu au-dessus (en-tête + filtres + liste de missions) change de palette.

## Nouvelle donnée : heure de début réelle, pour un vrai badge de retard

Le mockup affiche un badge « 12 min de retard » figé et sans donnée réelle derrière. Pour le rendre réel :

- Nouvelle colonne `missions_du_jour.heure_debut_reelle timestamptz null` — écrite inconditionnellement à chaque transition vers `en_cours` (dans `updateMissionStatutAction`, `lib/data/ma-journee-actions.ts`, écriture simple, pas de vérification « déjà posée »). Si une mission repasse en cours après une annulation (`terminee → a_faire → en_cours`), la valeur est réécrite avec la nouvelle heure de démarrage — le retard doit refléter la reprise actuelle, pas une tentative annulée.
- Le retard est un **fait figé au démarrage**, pas un compteur qui grossit pendant le soin : `retard = heure_debut_reelle − (date de la tournée + heure_prevue)`, en minutes, arrondi. Si négatif ou nul, pas de retard — aucun badge.
- Calcul dans une fonction pure ajoutée à `lib/tournee-vue.ts` : `calculerRetardMinutes(mission: MissionTourneeVue, dateTournee: string): number | null` — retourne `null` si le statut n'est pas `en_cours`, si `heureDebutReelle` est absente, ou si le retard calculé est ≤ 0.
- Affiché uniquement sur la mission actuellement `en_cours` (celle dans l'en-tête, comme dans le mockup) — pas sur les autres cartes.

## Ce qui change visuellement

### `EnTeteTournee.tsx`

- Fond : dégradé `linear-gradient(168deg,#221b33 0%,#2c1f47 58%,#3a2260 100%)` au lieu du navy uni `#0A1628`.
- Anneau de progression circulaire (SVG, `stroke-dasharray`/`stroke-dashoffset`) au lieu de la barre horizontale — même donnée (`valides`/`total`), **mêmes règles de comptage que l'app actuelle** : `valides` = `terminee` OU `absent` (pas seulement `terminee` comme dans le mockup — voir section suivante), `restants` = `a_faire` OU `en_cours`.
- Le nom du soin en cours (`nowStop`) et le sous-titre (« En cours depuis {heure} · {adresse} ») s'affichent à côté de l'anneau quand une mission est `en_cours` ; sinon, texte de repli (« Tournée à jour » / « N restants, aucun en cours » / « Tous les soins validés »), sur le modèle du mockup.
- Badge de retard (voir section précédente) et « Fin estimée » affichés en chips sous le nom, quand pertinents.
- Montant facturable réduit à une pastille parmi trois stats (Reste / Km / Cotation), au lieu de la grosse ligne actuelle — le montant total (`montantActes + montantMajorations`) reste calculé identiquement, seule sa mise en avant visuelle change. Le détail des majorations séparé disparaît de l'en-tête (il reste visible par mission dans chaque carte, comme aujourd'hui).
- La stat « Km » n'a pas de source de données réelle aujourd'hui (pas de distance cumulée calculée pour la tournée) — **affichée comme `—`, jamais une valeur inventée.**
- Rend `<OngletsFiltresTournee>` en interne, en bas de son propre dégradé (voir ci-dessous), au lieu que `page.tsx` le rende séparément.

### `OngletsFiltresTournee.tsx`

- Reste un composant à part (propre fichier, propres tests), mais n'est plus rendu directement par `page.tsx` — il est rendu **à l'intérieur** de `EnTeteTournee`, dans la continuité visuelle du dégradé (pas de barre blanche séparée en dessous).
- Style pilule sur fond semi-transparent sombre, onglet actif en blanc plein — reprend l'esthétique du mockup.
- **Libellés et logique de filtrage inchangés** : Tout / À faire / Alertes / Validés, `<Link>` vers `?filtre=...` exactement comme aujourd'hui (le mockup utilise des libellés différents — Reste, Fait — mais la logique sous-jacente est déjà identique ; on garde les libellés actuels plutôt que d'introduire un changement de vocabulaire non demandé).

### `CarteMissionTournee.tsx`

- Avatar : carré arrondi (`border-radius` ~13px) au lieu de rond, dégradé violet + texte blanc quand `en_cours`, teinte violette pâle sinon — remplace la palette actuelle par patient (`getCouleurAvatar`, palette multicolore) par une teinte unique cohérente avec la nouvelle identité violette de l'écran. `getCouleurAvatar` (`lib/tournee-vue.ts`) n'a aucun autre appelant dans le dépôt (vérifié) — le plan la supprime avec sa palette `PALETTE_AVATAR`, plutôt que de laisser du code mort.
- Carte `en_cours` : bordure violette + léger effet de halo animé (`box-shadow` pulsé), comme le mockup.
- Carte `terminee`/`absent` : opacité réduite, comme aujourd'hui (le mécanisme actuel — opacité sur les blocs internes, pas sur le conteneur entier, pour ne pas geler les futurs correctifs — est conservé tel quel, seule la valeur de teinte change).
- Badges de statut : mêmes 4 états, nouvelles couleurs assorties à la palette violette (`en_cours` notamment).
- Chips d'actes : style « pilule claire avec code NGAP en gras », repris du mockup.
- Alertes (allergie) : encart avec icône, repris du mockup (icône triangle SVG au lieu de l'emoji ⚠️ actuel) — **reste strictement scopé à `patientAllergies`**, aucune autre catégorie d'alerte n'est inventée (le mockup montre des alertes sur des sujets sans source de donnée réelle — sonde à changer, absence signalée — qui ne sont pas répliquées ici).
- Note de bas de carte (`patientConsignes`) : style encart clair repris du mockup, remplace le texte simple actuel en pied de carte.

## Comportements à ne pas copier du mockup

Le mockup est une démo autonome avec sa propre logique d'état simplifiée. Ces différences sont **intentionnelles** — la vraie logique de l'app prime :

- **Transition de statut** : dans le mockup, « Valider le soin » (a_faire) saute directement à *terminée*. Dans l'app réelle, « Valider le soin » démarre le soin (`a_faire → en_cours`) ; un second bouton « Valider », visible seulement en cours, le termine (`en_cours → terminee`). On garde le vrai flux à 4 étapes (`a_faire`/`en_cours`/`terminee`/`absent`), avec les annulations existantes (« Annuler la validation », « Annuler l'absence »).
- **Comptage de progression** : le mockup ne compte que `terminee` comme « fait » ; l'app compte `terminee` OU `absent` (une absence est une visite traitée, pas un blocage). On garde la règle actuelle.
- **Alertes** : le mockup illustre plusieurs types d'alerte sans source de donnée réelle (sonde, absence signalée). Seule l'allergie (`patientAllergies`) est une vraie alerte aujourd'hui — on n'en invente pas d'autres.
- **Lien contexte clinique** (`contexteHref`) : absent du mockup, conservé tel quel dans la carte.

## Nouveaux éléments empruntés au mockup

- **Bouton flottant « Suivant — {nom} · {heure} »** au-dessus de la barre de navigation, visible seulement s'il reste une mission `a_faire` (la première par ordre de passage). Au clic : défilement (scroll) jusqu'à la carte correspondante — pas de navigation de page, pas de nouvelle logique serveur.
- **Anneau de progression circulaire** dans l'en-tête (remplace la barre).

## Hors scope

- Changement des tokens globaux (`app/globals.css`) ou de tout autre écran.
- Restylage de `BarreNavigationBasse.tsx`.
- Distance kilométrique réelle de la tournée (affichée `—`).
- Toute nouvelle catégorie d'alerte au-delà de l'allergie.
- Changement du flux de statut ou des règles de comptage de progression.

## Tests

- `calculerRetardMinutes` : mission `en_cours` avec `heureDebutReelle` postérieure à `heurePrevue` → minutes positives ; antérieure ou égale → `null` ; statut différent de `en_cours` → `null` ; `heureDebutReelle` absente → `null`.
- `updateMissionStatutAction` : transition vers `en_cours` enregistre `heure_debut_reelle` ; toute autre transition (vers `terminee`, `absent`, ou retour à `a_faire`) ne la touche pas ; une seconde transition vers `en_cours` (après un `terminee → a_faire`) réécrit la valeur avec la nouvelle heure.
- Rendu de `EnTeteTournee` : anneau proportionnel aux comptes, badge retard affiché seulement si `calculerRetardMinutes` renvoie une valeur positive, stat Km toujours `—`.
- Rendu de `CarteMissionTournee` : nouvelles couleurs par statut, alerte allergie toujours affichée si `patientAllergies` renseigné, aucune régression sur les boutons d'action existants (GPS/Waze, Appeler, Valider, Absent, annulations) — tests déjà existants à faire passer sans régression, seules les classes CSS attendues changent.
- Bouton « Suivant » : présent seulement s'il reste une mission `a_faire`, absent si toutes les missions sont traitées.
