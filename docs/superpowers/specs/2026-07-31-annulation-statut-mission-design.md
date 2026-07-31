# Annuler un statut de mission et motiver une absence (lot D) — Design

**Statut :** Design validé en dialogue avec la fondatrice (2026-07-31).

## Contexte

`lib/data/ma-journee-actions.ts` n'autorise aujourd'hui que trois transitions :

```ts
const TRANSITIONS_VALIDES: Partial<Record<StatutMission, StatutMission>> = {
  a_faire: "en_cours",
  en_cours: "terminee",
};
```

plus un cas particulier écrit à part pour `a_faire → absent`. **Aucun retour
n'existe.** Un appui de trop sur « Valider » ou sur « Absent » est définitif :
la carte passe à 55 % d'opacité, perd ses boutons, et rien dans l'application ne
permet de revenir dessus. Sur une tournée, ce geste se fait à une main, sur le
pas d'une porte — l'erreur de manipulation n'est pas une hypothèse d'école.

La maquette (`Ma Tournée.md`) montre par ailleurs une absence motivée
(« Absente — signalé au médecin traitant ») en encart ambre sur la carte, mais
`missions_du_jour` n'a aucune colonne pour ce motif.

## Décisions actées avec la fondatrice

- **L'annulation ramène à « À faire »**, sans autre destination : une mission
  validée ou marquée absente redevient à faire, et la tournée reprend son cours.
  Passer directement de « Validé » à « Absent » n'est pas offert — deux gestes
  valent mieux qu'une bascule qu'on déclenche par erreur.
- **Aucune trace d'audit.** Ni auteur, ni horodatage, ni statut précédent
  conservés : la fondatrice a écarté cette exigence pour ce lot.
- **Le motif d'absence est facultatif et se saisit sur la carte**, juste après
  avoir marqué l'absence. Marquer absent reste un geste unique ; préciser
  pourquoi en est un second, qu'on peut ignorer.
- **Annuler une absence efface son motif** : conservé, il décrirait une absence
  qui n'existe plus.
- **Pas de liste de motifs prédéfinis** dans ce lot. La fondatrice fournira ses
  motifs fréquents si elle veut des boutons ; ils ne seront pas devinés.

## Architecture

### 1. Migration `supabase/migrations/20260731000000_motif_absence.sql`

```sql
-- Motif facultatif d'une absence, saisi depuis la carte de tournée après avoir
-- marqué la mission absente.
alter table public.missions_du_jour
  add column motif_absence text;
```

Aucune autre modification de schéma : la contrainte de statut accepte déjà les
quatre valeurs depuis `20260716000100_transmission_absence.sql`.

### 2. `lib/data/ma-journee-actions.ts` (modifié)

`TRANSITIONS_VALIDES` passe d'un successeur unique à une liste, ce qui absorbe
le cas particulier aujourd'hui écrit à part :

```ts
const TRANSITIONS_VALIDES: Record<StatutMission, StatutMission[]> = {
  a_faire: ["en_cours", "absent"],
  en_cours: ["terminee"],
  terminee: ["a_faire"],
  absent: ["a_faire"],
};
```

`updateMissionStatutAction` teste l'appartenance à la liste. Quand la transition
vise `a_faire`, elle écrit également `motif_absence: null` dans le même `update`.

Nouvelle action voisine :

```ts
export async function updateMotifAbsenceAction(formData: FormData): Promise<void>
```

Elle lit `missionId` et `motif`, relit le statut de la mission, **n'écrit que si
celui-ci vaut `absent`**, puis enregistre le motif (`null` si le champ est vide)
et revalide les mêmes chemins que ses voisines. Comme toutes les actions depuis
le chantier « erreurs visibles », elle journalise son échec sans lever.

### 3. `components/ui/CarteMissionTournee.tsx` (modifié)

Les statuts `terminee` et `absent` n'affichent aujourd'hui aucune action. Ils en
reçoivent chacun une, dans le bloc d'actions existant :

- **`terminee`** — un bouton « Annuler la validation », discret : c'est une
  correction, pas une action courante.
- **`absent`** — l'encart ambre de la maquette, portant le motif quand il
  existe ; un champ de saisie prérempli avec ce motif et son bouton
  « Enregistrer le motif » ; un bouton « Annuler l'absence ».

Les deux boutons d'annulation passent par `updateMissionStatutAction` avec
`nouveauStatut = "a_faire"`, dans des formulaires frères — jamais imbriqués.

La carte conserve son opacité réduite sur ces deux statuts : la mission reste
visuellement close, l'annulation est offerte sans être mise en avant.

### 4. `lib/data/ma-journee.ts` (modifié)

`MissionTourneeVue` gagne `motifAbsence: string | null`, lu dans la requête
existante de `getMissionsTourneeVue`. C'est la seule lecture concernée : l'écran
d'arrivée chez le patient n'affiche pas le motif dans ce lot.

## Tests

- `lib/data/ma-journee-actions.test.ts`
  - les quatre transitions autorisées aboutissent (`a_faire → en_cours`,
    `a_faire → absent`, `en_cours → terminee`, et les deux retours vers
    `a_faire`) ;
  - une transition non autorisée n'écrit rien — notamment `terminee → absent`,
    qui doit passer par « À faire » ;
  - l'annulation d'une absence écrit `motif_absence: null` dans le même `update` ;
  - `updateMotifAbsenceAction` enregistre le motif sur une mission absente,
    n'écrit rien sur une mission d'un autre statut, et écrit `null` quand le
    champ est vide.
- `components/ui/CarteMissionTournee.test.tsx`
  - une mission validée affiche « Annuler la validation » et rien d'autre ;
  - une mission absente affiche son motif, le champ de saisie et
    « Annuler l'absence » ;
  - une mission absente sans motif affiche le champ vide, sans encart vide ;
  - les statuts `a_faire` et `en_cours` gardent exactement les actions qu'ils
    ont aujourd'hui.
- `lib/data/ma-journee.test.ts` — `getMissionsTourneeVue` remonte
  `motifAbsence`, à `null` quand la colonne est vide.

## Hors périmètre

La trace d'audit, les motifs prédéfinis, la correction depuis
`/ma-journee/[missionId]`, et l'affichage du motif ailleurs que sur la carte de
tournée.

## Vérification

- `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` — propres
- La migration n'est **pas** appliquée par ce chantier : la fondatrice décide du
  moment, comme pour le lot A1.

  **L'ordre importe plus qu'avant.** `getMissionsTourneeVue` lira désormais
  `motif_absence` ; tant que la colonne n'existe pas, cette lecture échoue. Et
  depuis le chantier « erreurs visibles », une lecture critique qui échoue ne
  rend plus une liste vide : elle lève, et la page affiche l'écran d'erreur.
  Déployer ce code avant la migration ne donnera donc plus une tournée
  silencieusement vide — comme le 31 juillet — mais une page franchement en
  erreur. C'est le comportement voulu, et c'est aussi la raison pour laquelle la
  migration doit passer **avant** le déploiement, pas après.
- Relecture par la fondatrice : valider une mission, l'annuler, la marquer
  absente, saisir un motif, l'annuler, et vérifier que le motif a disparu
