# Ma tournée — Finitions (lot E) — Design

**Statut :** Design validé en dialogue avec la fondatrice (2026-07-30).

## Contexte

`app/(app)/ma-tournee/page.tsx` a été livrée au commit `7b6c447` par un agent
externe (Antigravity / Claude Sonnet 4.6) et laissée inachevée. La maquette de
référence est le fichier `Ma Tournée.md` à la racine — malgré son extension,
c'est un artifact HTML bundlé (1,3 Mo) qui se rend dans un navigateur.

Comparaison de la maquette au code livré, huit écarts :

| Écart | Maquette | Page livrée |
|---|---|---|
| Stats d'en-tête | Reste · Fin est. · **Km** · **Cotation €** | Reste · Fin est. · Patients |
| Bandeau de retard | « 12 min de retard cumulé — Mme Chevalier prévenue » | absent |
| Actes par mission | **plusieurs** chips cotés NGAP (`AIS 3 toilette`, `AMI 1 insuline`) | un seul chip `typeSoin` |
| Distance | « 12 rue des Lilas · **1,2 km** » | adresse seule |
| Motif d'absence | encart ambre sur la carte | rien |
| Consignes d'accès | pied de carte gris, après un pointillé | encart ambre, mêlé aux alertes |
| Alertes cliniques | rouge = allergie, ambre = suivi | rouge = allergies, ambre = consignes |
| Numéro d'étape | aucun | prop `numero` calculée, jamais affichée |

Six de ces huit écarts réclament des données absentes de la base :
`missions_du_jour` porte **un seul** `type_soin`, sans cotation, sans distance,
sans heure réelle de passage, sans motif d'absence. Le chantier a donc été
découpé en cinq lots livrables séparément :

- **A** — actes multiples et cotation NGAP (migration + reprise de `generation-tournee.ts`)
- **B** — distance par mission et stat « Km »
- **C** — heures réelles de passage, retard cumulé, « Fin est. » fiable
- **D** — motif d'absence et correction d'un statut validé (aujourd'hui irréversible)
- **E** — finitions sans migration ← **le présent document**

## Décisions actées avec la fondatrice

- **`patients.consignes` porte l'accès et la logistique** (code portail, étage,
  chien, présence de la famille), pas la vigilance clinique. Le champ passe donc
  en pied de carte, comme dans la maquette.
- **Conséquence assumée : plus aucun encart ambre sur la page** tant que les
  lots A–D n'apportent pas de source d'alerte de suivi. Les allergies restent en
  rouge.
- **Le filtre « Alertes » ne compte plus que les allergies** — une consigne
  d'accès n'est pas une alerte.
- **L'en-tête garde ses trois colonnes** (Reste · Fin est. · Patients) ; Km et
  Cotation attendent les lots B et A.
- **La page est découpée en composants extraits.** `page.tsx` fait 620 lignes et
  empile trois composants, huit helpers purs et la récupération de données ; ce
  lot modifie justement la carte et doit la tester. Next n'autorisant pas
  d'exports arbitraires depuis un fichier `page.tsx`, sans extraction les
  helpers et la carte resteraient intestables.

## Architecture

### 1. `lib/tournee-vue.ts` (nouveau)

Helpers de présentation purs, sans I/O — même statut que `lib/format.ts`, et
volontairement **hors de `lib/data/`** qui porte les accès Supabase :

- type `Filtre` (`"tout" | "a_faire" | "alertes" | "valides"`)
- `filtrerMissions(missions, filtre)`
- `compterMissions(missions)` — le comptage `alertes` ne retient que
  `patientAllergies`
- `estimerHeureFin(missions)` — `null` quand aucune mission ne reste
- `calculerAge(dateNaissance)`, `getInitiales(nomComplet)`,
  `getCouleurAvatar(id)`, `formatHeure(iso)`, `formatDateTournee()`
- constantes `STATUT_LABEL`, `STATUT_BADGE`

Ces fonctions sont déplacées telles quelles depuis `page.tsx`, sans changement
de comportement, à deux exceptions près : `filtrerMissions` et
`compterMissions` retiennent désormais les seules missions avec allergie pour
`alertes`, là où elles acceptaient aussi les consignes. Les deux doivent
changer ensemble, sans quoi le badge de l'onglet annoncerait un nombre que la
liste filtrée ne montrerait pas.

### 2. `components/ui/EnTeteTournee.tsx` (nouveau)

L'en-tête sombre `#0A1628` : date, heure courante, compteur `validés/total`,
barre de progression (`role="progressbar"`, `aria-valuenow`), trois stats.
Props : `missions`, `tournee`. Aucun accès données.

### 3. `components/ui/OngletsFiltresTournee.tsx` (nouveau)

Les quatre filtres à badge de comptage. Props : `filtre`, `counts`.

- ajout de `aria-current="page"` sur l'onglet actif, par cohérence avec
  `OngletsExplorer.tsx`
- suppression du `overflow-x-auto` : le conteneur est déjà contraint en
  `max-w-2xl` et les quatre onglets tiennent sur une ligne ; `OngletsExplorer`
  avait déjà écarté le conteneur défilable au commit `5ca03ab`

### 4. `components/ui/CarteMissionTournee.tsx` (nouveau)

Colonne timeline (heure, durée, trait vertical) et carte patient. Props :
`mission`, `contexteHref`, `estDerniere`. La prop `numero` disparaît.

Changement de rendu — les consignes quittent l'encart ambre pour le **pied de
carte** :

- séparateur `border-t border-dashed border-navy/10`
- texte `text-[12.5px] text-navy/45`, sans icône ni fond coloré
- affiché quel que soit le statut de la mission, sous les actions quand il y en a

L'encart rouge des allergies est inchangé. Le reste de la carte (avatar à
initiales, badge de statut, chip du soin, lien de contexte clinique, les trois
branches d'actions) est déplacé tel quel.

### 5. `app/(app)/ma-tournee/page.tsx` (réduit)

Ne garde que la lecture de `searchParams`, les appels Supabase
(`getTourneeDuJour`, `getMissionsTourneeVue`, `getMissionEnCoursHref`),
l'assemblage des trois composants et l'état vide. Cible : ~80 lignes.

## Tests

Vitest et Testing Library, fichiers colocalisés selon la convention du projet
(`CarteMission.tsx` / `CarteMission.test.tsx`).

**`lib/tournee-vue.test.ts`**
- `filtrerMissions` : `a_faire` retient aussi `en_cours` ; `valides` retient
  aussi `absent` ; `alertes` ne retient que les missions avec allergie
- `compterMissions` : une mission avec consignes mais sans allergie **n'est pas**
  comptée dans `alertes`
- `estimerHeureFin` : heure de la dernière mission restante ; `null` quand tout
  est validé
- `calculerAge` : anniversaire déjà passé et pas encore passé dans l'année
- `getInitiales` : « Mme Dupont » → `DU`, « M. Martin » → `MA`
- `getCouleurAvatar` : deux appels avec le même identifiant donnent la même
  couleur

**`components/ui/CarteMissionTournee.test.tsx`**
- une allergie s'affiche en encart rouge
- des consignes s'affichent en pied de carte, **pas** en encart d'alerte
- `a_faire` → boutons « Valider le soin » et « Absent »
- `en_cours` → « GPS », « Appeler », « Valider »
- `terminee` et `absent` → aucun bouton d'action
- le lien GPS pointe sur `maps.google.com` avec l'adresse encodée, le lien
  d'appel sur `tel:` sans espaces

**`components/ui/EnTeteTournee.test.tsx`**
- compteur `validés/total` conforme aux missions passées en props
- `aria-valuenow` de la barre égal au pourcentage validé

**`components/ui/OngletsFiltresTournee.test.tsx`**
- chaque onglet affiche son comptage
- l'onglet actif porte `aria-current="page"`, les autres non
- « Tout » pointe sur `/ma-tournee`, les autres sur `/ma-tournee?filtre=…`

Pas de test e2e : les routes de l'app exigent une session Supabase et un
abonnement actif, indisponibles dans l'environnement de développement local.

## Hors périmètre

Km, cotation NGAP, actes multiples par mission, retard cumulé, motif d'absence,
correction d'une mission validée ou marquée absente par erreur — lots A à D.

## Vérification

- `npm test` — toute la suite passe, les nouveaux tests inclus
- `npm run lint` — aucun avertissement nouveau
- `npm run build` — la page compile
- Relecture visuelle de `/ma-tournee` par la fondatrice, comparée à la maquette
