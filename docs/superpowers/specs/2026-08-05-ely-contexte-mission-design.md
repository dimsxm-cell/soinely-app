# Ely — Conscience du contexte de mission — Design

**Statut :** Design validé en dialogue avec la fondatrice (2026-08-05).

## Contexte

`docs/superpowers/specs/2026-07-14-copilote-clinique-design.md` avait explicitement
reporté la conscience contextuelle d'Ely ("Smart Context" : mission en cours,
historique, favoris) à un chantier futur, au motif qu'"aucun écran ne permet
aujourd'hui de voir/ouvrir une mission individuelle". Ce n'est plus vrai :
`app/(app)/ma-journee/[missionId]/page.tsx` existe désormais et affiche le
détail d'une mission (patient, type de soin, statut, etc.).

Ce chantier couvre uniquement le premier tiers de "Smart Context" — la
mission en cours. L'historique des échanges et les favoris restent hors
scope, ce sont des chantiers indépendants (persistance de données, pas
affichage).

## Décisions actées avec la fondatrice

- **Portée : savoir pour quel patient/mission, rien de plus.** Pas de
  croisement avec les allergies/antécédents du patient, pas d'ajustement du
  moteur de recherche — chantier d'affichage et de navigation, pas de
  logique clinique nouvelle.
- **Affichage seul, aucun pré-remplissage du champ de question.** Le rappel
  visuel ("Pour [Patient] · [Soin]") reste au-dessus du chat ; l'IDEL tape
  sa question normalement, à vide.
- **Point d'entrée : lien "Demander à Ely" à côté de "Voir la fiche du
  patient"** sur `ma-journee/[missionId]/page.tsx`, même style visuel,
  cohérent avec le lien déjà présent pour "en savoir plus sur ce patient".
- **Transport par paramètres d'URL directs** (`?patient=...&soin=...`),
  pas par `missionId` : les deux valeurs sont déjà connues sur la page de
  mission (`MissionDetail.patientNom`, `MissionDetail.typeSoin`), donc
  aucun aller-retour serveur supplémentaire n'est nécessaire côté `/ely`.
  Cohérent avec le paramètre `?q=` déjà utilisé par cette page pour la
  question elle-même.
- **Comportement par défaut inchangé.** Arriver sur `/ely` sans ces
  paramètres (lien depuis l'onglet de navigation, appui long, etc.)
  n'affiche aucun rappel — identique à aujourd'hui.

## Architecture

### 1. `app/(app)/ma-journee/[missionId]/page.tsx` (modifié)

Nouveau lien juste après le bloc "Dossier du patient" existant (voir
`Link href={`/patients/${mission.patient.id}`}`, ajouté lors d'un chantier
précédent), même style :

```tsx
<Link
  href={`/ely?patient=${encodeURIComponent(mission.patientNom)}&soin=${encodeURIComponent(mission.typeSoin)}`}
  className="row-lift mt-2.5 flex items-center justify-between rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)]"
>
  <span className="text-[15px] font-semibold text-navy">Demander à Ely</span>
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[19px] w-[19px] shrink-0 text-navy/25">
    <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
</Link>
```

`mission.patientNom` et `mission.typeSoin` viennent de `MissionDetail`
(`lib/types/clinical.ts:84-85`, via `MissionDuJour`), déjà chargés par
`getMissionDetail` pour le reste de la page — aucune donnée nouvelle à
récupérer.

### 2. `app/(app)/ely/page.tsx` (modifié)

Lit deux nouveaux paramètres de recherche et les transmet tels quels :

```tsx
export default async function ElyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; patient?: string; soin?: string }>;
}) {
  const { q, patient, soin } = await searchParams;
  // ...logique existante pour q/situationInitiale inchangée...

  return (
    <ConversationEly
      requeteInitiale={q ?? ""}
      situationInitiale={situationInitiale}
      patientContexte={patient ?? null}
      soinContexte={soin ?? null}
    />
  );
}
```

### 3. `components/ui/ConversationEly.tsx` (modifié)

Deux nouvelles props optionnelles, un petit bloc d'affichage sous l'en-tête
existant (juste après le `<div className="flex items-center justify-between border-b ...">`
qui contient déjà "ELY" et le bouton nouvelle conversation) :

```tsx
interface ConversationElyProps {
  requeteInitiale: string;
  situationInitiale: SituationTerrain | null;
  patientContexte?: string | null;
  soinContexte?: string | null;
}

export function ConversationEly({
  requeteInitiale,
  situationInitiale,
  patientContexte,
  soinContexte,
}: ConversationElyProps) {
  // ...état existant inchangé...

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-navy/10 pb-4">
        {/* ...en-tête existant, inchangé... */}
      </div>

      {patientContexte && (
        <p className="mt-3 text-[13px] font-semibold text-navy/55">
          Pour {patientContexte}
          {soinContexte ? ` · ${soinContexte}` : ""}
        </p>
      )}

      {/* ...reste du composant inchangé... */}
```

Le rappel ne s'affiche que si `patientContexte` est fourni ; `soinContexte`
seul (sans patient) ne déclenche rien — ce cas ne se produit pas depuis le
seul point d'entrée créé par ce chantier, mais la garde reste cohérente
avec le principe "un rappel sans savoir de qui on parle n'a pas de sens".

## Cas limites

- **Nom de patient ou type de soin contenant des caractères spéciaux**
  (apostrophe, accent) : `encodeURIComponent` côté lien, décodage
  automatique par Next.js côté `searchParams` — même mécanisme déjà
  éprouvé pour `?q=`.
- **Navigation vers `/ely` par un autre chemin** (onglet de navigation,
  appui long, mot d'activation) : `patient`/`soin` absents, aucun rappel
  affiché — comportement actuel préservé sans modification supplémentaire.
- **Bouton "Nouvelle conversation"** (`nouvelleConversation()`, déjà
  existant) : fait un `router.replace("/ely")`, donc repart sans les
  paramètres de contexte — le rappel "Pour ..." disparaît avec le reste de
  la conversation. Comportement cohérent avec le fait de "recommencer à
  zéro" ; non modifié par ce chantier.

## Tests

- `components/ui/ConversationEly.test.tsx` (fichier existant, complété) :
  une nouvelle situation `patientContexte="Marie Dupont"` +
  `soinContexte="Pansement"` affiche "Pour Marie Dupont · Pansement" ;
  `patientContexte` seul (sans `soinContexte`) affiche "Pour Marie Dupont"
  sans point médian ni "undefined" ; sans `patientContexte`, aucun texte
  "Pour " n'apparaît (comportement par défaut préservé, régression contre
  les tests déjà existants du fichier).
- Pas de nouveau test pour `app/(app)/ely/page.tsx` ni pour la fiche de
  mission au-delà de la couverture existante — ce sont des Server
  Components qui transmettent des chaînes telles quelles, sans logique
  propre à tester (le comportement réel est vérifié via les tests de
  `ConversationEly` ci-dessus, qui couvrent la seule logique conditionnelle
  du chantier).

## Vérification manuelle

Depuis `/ma-journee`, ouvrir une mission du jour, cliquer "Demander à Ely",
confirmer que le rappel "Pour [Patient] · [Soin]" s'affiche et que le champ
de question est vide. Poser une question, confirmer que la réponse
fonctionne normalement. Cliquer "Nouvelle conversation", confirmer que le
rappel disparaît.

## Alternatives écartées

- **Transport par `missionId` avec lookup serveur côté `/ely`** : écarté —
  ajoute un aller-retour Supabase et une question de contrôle d'accès
  (vérifier que la mission appartient bien à l'IDEL connectée) pour une
  fonctionnalité purement d'affichage ; les valeurs sont déjà disponibles
  en clair sur la page d'origine.
- **Pré-remplissage du champ de question** : écarté par la fondatrice —
  risque de polluer la recherche plein texte si l'IDEL ne l'efface pas
  avant de taper sa vraie question.
- **Croisement du contexte avec les allergies/antécédents du patient dans
  la réponse d'Ely** : écarté pour ce chantier — changerait la logique de
  réponse (pas seulement l'affichage), sujet à part si retenu plus tard.

## Hors scope (rappel)

- Historique des échanges par patient (favoris, questions passées).
- Toute adaptation du moteur de recherche ou du contenu des réponses en
  fonction du contexte.
- Le badge de fiabilité (`docs/superpowers/specs/2026-08-05-ely-badge-fiabilite-design.md`)
  — chantier indépendant, déjà en Pull Request séparée.
