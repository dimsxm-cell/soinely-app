# Rendre les erreurs de lecture visibles — Design

**Statut :** Design validé en dialogue avec la fondatrice (2026-07-31).

## Contexte

Le 31 juillet 2026, la page Ma tournée affichait « 3 patients » et aucune
mission. La cause était une table absente de la base — les migrations du lot A1
n'avaient pas encore été appliquées — mais rien ne le disait : `getMissionsTourneeVue`
répond `return []` quand Supabase renvoie une erreur, exactement comme lorsqu'il
n'y a réellement aucune mission. Il a fallu instrumenter le code à la main, en
local, pour lire le message `PGRST200` qui donnait la réponse en une ligne.

État des lieux mesuré :

- **21 sites** dans `lib/data/` avalent une erreur, dont 9 par `return []` et
  9 par `return null` ;
- **aucun `console.*`** dans tout le code applicatif : le silence est total ;
- **aucun `error.tsx`, aucun `not-found.tsx`**, aucune instrumentation.

Le risque n'est pas seulement de perdre du temps en diagnostic. Sur le terrain,
une IDEL qui ouvre l'application devant la porte d'un patient et lit « Aucune
mission » peut repartir en croyant sa tournée terminée, alors que celle-ci est
simplement illisible.

## Décisions actées avec la fondatrice

- **« Absent » et « en panne » ne doivent jamais se ressembler**, mais ils ne
  doivent pas non plus être confondus dans l'autre sens : une journée sans
  tournée est un fait métier normal, pas une erreur. Seule une erreur Supabase
  déclenche l'écran d'erreur ; l'absence continue de rendre `null` ou `[]`.
- **Les lectures critiques lèvent** au lieu de rendre un vide trompeur : celles
  qui alimentent la tournée, les missions et les patients.
- **Les lectures secondaires gardent leur repli** et se contentent de
  journaliser : une recherche qui échoue n'a pas à noircir l'écran.
- **Toutes journalisent**, critiques ou non.

## Architecture

### 1. `lib/journal.ts` (nouveau)

```ts
export function journaliserEchec(contexte: string, erreur: unknown): void
```

Écrit sur `console.error` avec un préfixe repérable (`[soinely]`) et le contexte
appelant, de sorte qu'une recherche dans les journaux serveur — terminal en
développement, journaux Vercel en production — mène directement à la fonction
fautive. Le module ne dépend de rien : ni de Supabase, ni de Next.

### 2. Lectures critiques : journaliser puis lever

`lib/data/ma-journee.ts`
- `lireTourneeDuJour` — lève sur erreur ; `data` nul **sans** erreur reste `null`,
  c'est une journée sans tournée
- `getMissionsDuJour`
- `getMissionsTourneeVue`
- `getMissionDetail` — lève sur erreur ; mission introuvable reste `null`, la
  page appelle déjà `notFound()`

`lib/data/generation-tournee.ts`
- `genererTourneeDuJour` — lève lorsque la lecture des soins prescrits échoue.
  C'est le chemin qui, le 31 juillet, aurait produit une absence de tournée sans
  la moindre trace. Ses deux annulations existantes (échec d'insertion des
  missions, puis des actes) lèvent également après avoir supprimé la tournée.

`lib/data/patients.ts`
- `getPatients`, `getPatient` — lève sur erreur ; patient introuvable reste `null`
- `getSoinsPrescrits`

L'erreur levée porte un message en français nommant la lecture concernée, et
l'erreur Supabase d'origine en `cause`.

### 3. `app/(app)/error.tsx` (nouveau)

Frontière d'erreur couvrant tout l'espace connecté. Elle est rendue à
l'intérieur du layout, donc la barre de navigation reste disponible : l'IDEL
n'est jamais bloquée sur un cul-de-sac.

Contenu : un titre « Impossible de charger ces données », une phrase indiquant
que la connexion ou le serveur n'a pas répondu et que les données ne sont pas
perdues, un bouton « Réessayer » appelant `reset()`.

**Ce fichier est un composant client** (`"use client"`), Next l'imposant pour
toute frontière d'erreur. C'est la seule dérogation à la règle « tout en
composant serveur » du projet, et elle est structurelle.

### 4. Lectures secondaires : journaliser, garder le repli

`getMissionEnCoursHref`, `getPhotoUrl`, `lib/data/recherche.ts`,
`lib/data/dossierSoins.ts`, `lib/data/dossier-patient.ts`, `lib/data/ngap.ts`,
`lib/data/profil.ts`, `lib/data/abonnement.ts`, et les actions serveur de
`lib/data/patients-actions.ts`. Comportement inchangé à l'écran ; une ligne dans
le journal en plus.

Cas particulier : `lib/data/ngap.ts` conserve son repli **et** son garde-fou du
lot précédent — un catalogue vide masque le formulaire de cotation plutôt que
de laisser effacer un code.

## Tests

- `lib/journal.test.ts` — `journaliserEchec` écrit sur `console.error` en portant
  le contexte reçu ; l'espion est restauré après chaque test.
- Pour **chaque** lecture critique, deux tests : elle lève quand Supabase renvoie
  une erreur, et elle rend `null` ou `[]` quand la donnée est légitimement
  absente. C'est cette paire qui garantit qu'on n'a pas remplacé un mensonge par
  un autre.
- Des tests existants affirment aujourd'hui le comportement silencieux des
  fonctions qui deviennent critiques. Ils sont **réécrits, jamais supprimés** :
  - `lib/data/ma-journee.test.ts:199` — « retourne un tableau vide en cas
    d'erreur » devient « lève en cas d'erreur » ;
  - `lib/data/generation-tournee.test.ts` — les quatre tests d'échec
    (« n'insère aucune tournée si la lecture des soins échoue », les deux
    annulations sur insertion, et le garde de rattachement des actes) attendent
    désormais un rejet **en plus** de vérifier leur effet actuel. La tournée
    doit toujours être supprimée avant que l'erreur ne remonte : l'annulation
    reste le comportement, lever n'en est que la trace.
- Les tests des lectures secondaires restent inchangés : leur repli est toujours
  le comportement attendu.

Pas de test de `app/(app)/error.tsx` : le projet ne teste pas le rendu des
pages.

## Hors périmètre

Le résultat typé (succès/échec) sur les vingt et une lectures, l'envoi des
erreurs vers un service de supervision externe, `not-found.tsx`, et
`global-error.tsx`.

## Vérification

- `npm test` — toute la suite passe, les nouveaux tests inclus
- `npm run lint`, `npx tsc --noEmit`, `npm run build` — propres
- Relecture par la fondatrice : **renommer temporairement une table** lue par la
  page (ou en révoquer le droit de lecture), ouvrir Ma tournée, constater
  l'écran d'erreur et non une tournée vide.

  Couper le réseau de l'appareil ne prouverait rien : ces lectures s'exécutent
  du serveur Next vers Supabase, donc la coupure tuerait la requête du document
  elle-même et le navigateur afficherait sa page hors ligne sans jamais
  atteindre la frontière d'erreur. Seule une lecture qui échoue **côté serveur**
  reproduit l'incident du 31 juillet.
