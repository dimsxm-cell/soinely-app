# Coter un soin prescrit existant — Design

**Statut :** Design validé en dialogue avec la fondatrice (2026-07-31).

## Contexte

Le lot A1 (`docs/superpowers/specs/2026-07-30-ma-tournee-actes-cotation-design.md`)
a introduit le rattachement d'un code NGAP à un soin prescrit, mais **seulement
à la création** : `createSoinPrescritAction` écrit `soins_prescrits.ngap_code_id`,
et rien d'autre ne l'écrit jamais.

Conséquence observée sur la base réelle après application des migrations : tous
les soins prescrits portent `ngap_code_id = null`, donc **aucun chip de la page
Ma tournée n'affiche de code**. La seule façon de coter un soin déjà enregistré
serait de l'arrêter et de le recréer, ce qui perdrait son historique et
décalerait son `created_at` — or cet horodatage détermine l'ordre des actes au
sein d'un passage.

Ce chantier ferme ce manque.

## Décisions actées avec la fondatrice

- **Un sélecteur par soin, dans la liste existante de la fiche patient.** La
  fondatrice a moins de dix soins prescrits actifs : un écran de rattrapage
  groupé, tous patients confondus, ne se justifie pas. Le sélecteur en ligne
  sert aussi bien le rattrapage initial que la correction ponctuelle d'un code
  saisi de travers.
- **La cotation prend effet à la tournée suivante.** Les actes de la tournée du
  jour sont déjà écrits, avec leur code figé à la génération. Ils ne sont pas
  repris : `actes_mission` ne conserve pas la prescription d'origine, seulement
  un libellé, et rapprocher les deux par correspondance de texte coterait à tort
  deux soins homonymes chez un même patient. L'interface l'annonce plutôt que de
  laisser la fondatrice chercher un chip qui ne viendra pas.
- **Aucune migration.** Le schéma du lot A1 suffit.
- **Décoter reste possible** : choisir l'option vide remet `ngap_code_id` à
  `null`.

## Architecture

### 1. `lib/data/patients-actions.ts` (modifié)

Nouvelle action serveur, voisine de `arreterSoinPrescritAction` :

```ts
export async function coterSoinPrescritAction(formData: FormData): Promise<void>
```

Elle lit `soinId`, `patientId` et `ngapCodeId`, sort sans rien écrire si `soinId`
ou `patientId` manque, puis mémorise `ngap_code_id` via l'helper existant
`champTexteOuNull` — une sélection vide devient `null` et non `""`, qui violerait
la clé étrangère vers `ngap_codes`. Elle termine par
`revalidatePath(`/patients/${patientId}`)`.

Aucune vérification de propriété n'est ajoutée : la politique RLS
`soins_prescrits_owner_all` interdit déjà à une IDEL de toucher le soin d'une
autre, et la dupliquer en code donnerait l'illusion que la sécurité vit là.

### 2. `app/(app)/patients/[id]/page.tsx` (modifié)

Dans la liste des soins actifs, chaque `<li>` reçoit un second formulaire, à
côté de celui du bouton « Arrêter » :

- un `<select name="ngapCodeId">` alimenté par `codesNgap`, **déjà chargé par la
  page** pour le formulaire de création — aucune requête supplémentaire ;
- `defaultValue={soin.ngapCodeId ?? ""}`, pour que le sélecteur affiche le code
  courant du soin et non un champ vide ;
- une première option `Aucune` de valeur vide ;
- un bouton « Enregistrer ».

Deux formulaires frères, jamais imbriqués : HTML interdit un `<form>` dans un
`<form>`, ce qui écarte d'emblée l'idée d'un bouton unique pour toute la liste.

La `<li>` passe en `flex-wrap` pour que le groupe sélecteur + boutons descende à
la ligne sur mobile au lieu de comprimer le libellé du soin.

Sous le titre « Soins prescrits », une phrase, une seule fois pour la section :

> Une cotation modifiée s'applique aux tournées générées à partir du lendemain.

### 3. Ce qui ne change pas

`lib/data/patients.ts` expose déjà `ngapCodeId` et `ngapCode` sur `SoinPrescrit`
depuis le lot A1 : la lecture n'a pas à bouger. La liste des soins arrêtés reste
sans sélecteur — coter un soin qu'on ne fait plus n'a pas de sens.

## Tests

`lib/data/patients-actions.test.ts`, dans un nouveau `describe("coterSoinPrescritAction")` :

- le code choisi est écrit sur le bon soin : `update` reçoit
  `{ ngap_code_id: "c-ais3" }` et `eq` cible `soinId` ;
- une sélection vide écrit `null`, jamais `""` ;
- un `soinId` absent ne déclenche aucune écriture ;
- le chemin passant appelle `revalidatePath` avec `/patients/<patientId>`.

Pas de test du JSX : le projet ne teste pas le rendu des pages, et ce chantier
n'introduit aucune raison d'en changer.

## Hors périmètre

La reprise des actes de la tournée du jour, l'écran de rattrapage groupé tous
patients confondus, et l'édition des autres champs d'un soin prescrit (type,
récurrence, heures). Le calcul d'un montant reste au lot A2.

## Vérification

- `npm test` — toute la suite passe, les nouveaux tests inclus
- `npm run lint` — aucun avertissement nouveau
- `npm run build` — la page compile
- Relecture par la fondatrice : coter un soin depuis une fiche patient, puis
  constater le chip coté sur la tournée du lendemain
