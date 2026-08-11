# Coordonnées du praticien à l'impression — design

## Contexte

Une IDEL qui imprime un document depuis Soinely — un consentement patient,
un protocole d'urgence — doit pouvoir y faire figurer ses coordonnées
professionnelles. Aujourd'hui rien ne les porte : les documents sortent de
l'imprimante sans identifier qui les a émis.

## État constaté

**Impression.** Quatre écrans seulement sont imprimables, les documents
patient (`consentement`, `renoncement`, `identite`,
`fin-de-prise-en-charge`), via `components/ui/BoutonImprimer.tsx` — un
`window.print()` avec `print:hidden` sur le bouton lui-même.
`BarreSuperieure` et `BarreNavigationBasse` portent aussi `print:hidden`.
`app/globals.css` ne contient **aucune** règle `@media print`.

Les fiches d'Explorer (`/situations/dossier/[id]`, `/situations/[id]`,
`/situations/informations-professionnelles/[id]`) ne sont **pas**
imprimables — alors que ce sont elles que visait la demande. La
fonctionnalité implique donc de les rendre imprimables.

**Profil.** `public.profiles` porte `full_name`, `adresse_cabinet` et
`code_postal`. Il n'y a **aucun numéro de téléphone**. Le numéro
ADELI/RPPS est collecté à l'inscription (`app/login/actions.ts`) mais
stocké uniquement dans les métadonnées d'authentification : jamais
réaffiché, jamais modifiable — une faute de frappe y est définitive.

## Décisions prises

| Question | Décision |
|---|---|
| Contenu du bloc | Nom, adresse, téléphone **et** ADELI/RPPS |
| Périmètre | Tout ce qui est imprimable, fiches d'Explorer incluses |
| Source des valeurs | Le profil, pré-remplies |
| Modification ponctuelle | Éphémère, avec case « enregistrer dans mon profil » |
| Placement, documents patient | En-tête |
| Placement, fiches Explorer | Pied de page, **sous la source de la fiche** |

Le placement en pied de page sur les fiches d'Explorer répond à un risque
précis : ces fiches sont du contenu de référence partagé — protocoles,
repères juridiques issus des fiches de l'Ordre National des Infirmiers.
Des coordonnées en tête d'un tel document se liraient comme une signature,
laissant croire que l'IDEL en est l'autrice. En pied de page, sous la
mention d'origine, elles indiquent qui a imprimé sans rien s'attribuer.

## Architecture

### Base de données

Une migration ajoute à `public.profiles` :

- `telephone text` — nouveau champ, vide par défaut ;
- `adeli_rpps text` — repris depuis
  `auth.users.raw_user_meta_data->>'adeli_rpps'` pour les comptes
  existants, afin de ne perdre aucune saisie déjà faite.

Le bloc imprimé lit ensuite une source unique, et les deux champs
deviennent modifiables depuis `/compte`.

### Composants

Trois pièces distinctes, parce qu'elles se placent à des endroits
différents de la page selon l'écran :

**`FournisseurCoordonneesPraticien`** (client) — porte l'état modifiable,
initialisé depuis le profil, et l'expose par un contexte React. Le
contexte est justifié ici, et non un simple passage de props : le bloc
imprimé et l'éditeur doivent partager la même valeur tout en vivant à des
endroits libres de l'arbre.

**`BlocCoordonneesPraticien`** (client) — le bloc imprimé. Invisible à
l'écran, visible à l'impression (`hidden print:block`). N'affiche que les
champs renseignés : un profil sans téléphone ne laisse pas de ligne vide.
Chaque page le pose où il doit apparaître.

**`BarreImpressionPraticien`** (client) — le panneau de modification, les
champs, la case « enregistrer dans mon profil » et le bouton d'impression.
Masqué à l'impression. Remplace `BoutonImprimer` sur les écrans concernés ;
`BoutonImprimer` reste en place partout où aucune coordonnée n'est requise.

### Accès aux données

`lib/data/profil.ts` gagne `getCoordonneesPraticien(supabase, userId)`,
qui rend `{ nom, adresse, codePostal, telephone, adeliRpps }`. Chaque page
imprimable l'appelle et passe le résultat au fournisseur.

L'enregistrement dans le profil passe par une Server Action, suivant le
motif déjà en place pour `FormulaireCabinet` — modification éphémère par
défaut, écriture en base seulement si la case est cochée.

### Impression

Les trois pages de détail d'Explorer gagnent `BarreImpressionPraticien` et
`BlocCoordonneesPraticien`. `app/globals.css` reçoit les règles
`@media print` qui manquent : marges de page, suppression des ombres et
des fonds décoratifs, et rupture de page propre.

## Erreurs

Un profil incomplet n'est pas une erreur : le bloc omet les lignes vides.
Un échec d'enregistrement dans le profil n'empêche pas d'imprimer — la
modification reste valable pour l'impression en cours, et le message
d'erreur suit le motif de `FormulaireAvecRetour` déjà utilisé ailleurs.

## Tests

- `getCoordonneesPraticien` : profil complet, profil sans téléphone,
  profil sans ADELI/RPPS, utilisateur inconnu.
- `BlocCoordonneesPraticien` : n'affiche que les champs renseignés ;
  porte bien `hidden print:block` ; aucune ligne vide sur profil partiel.
- `BarreImpressionPraticien` : pré-remplissage depuis le profil, une
  modification met à jour le bloc, la case décochée n'écrit pas en base.
- La migration est couverte par le CI existant
  (`verifie-migrations-supabase`).

## Hors périmètre

- Aucune modification du contenu des fiches ni de la source affichée : les
  coordonnées s'ajoutent sous la mention d'origine, sans s'y substituer.
- Aucun logo ni en-tête graphique personnalisé — seulement du texte.
- Aucune génération de PDF : on s'appuie sur l'impression du navigateur,
  comme les quatre documents patient le font déjà.
