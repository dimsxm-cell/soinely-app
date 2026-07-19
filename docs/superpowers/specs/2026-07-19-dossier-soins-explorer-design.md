# Dossier de soins infirmiers dans Explorer — Design

**Statut :** Design validé en dialogue avec la fondatrice (2026-07-19). Reste
à valider : ce document écrit, avant de passer au plan d'implémentation.

## Contexte

La fondatrice (Marie-Christine Vaïtilingon, IDEL) a fourni son propre
dossier de soins infirmiers papier (`Dossier pdf.pdf`, 39 pages scannées,
cabinet Vaïtilingon) et a montré une capture d'écran de l'onglet **Explorer**
de l'app déjà en fonctionnement (bottom nav : Accueil / Patients / + /
Explorer / Ely), qui pointe vers `/situations` et affiche aujourd'hui
uniquement les Situations Terrain. Elle veut que ce dossier de soins soit
consultable depuis Explorer, à côté des Situations Terrain.

Ce document a été préparé en amont en éclatant le PDF source en 30 fiches
individuelles (rangées dans `SOINELY DOC/Dossier de Soins Infirmiers
(fiches)/` sur sa machine, hors du dépôt) selon les 9 sections que la
fondatrice avait déjà définies elle-même comme intercalaires de son
classeur : Identification du patient, Traitements, Surveillance clinique,
Protocoles d'urgence (conduites à tenir), Transmissions infirmières,
Prescriptions et liaisons médicales, Administratif, Allergies & alertes,
Contacts utiles.

La demande initiale (message vocal) couvrait 4 chantiers ; celui-ci ne
traite que le premier — les 3 autres (nom de l'infirmière dynamique sur les
fiches, personnalisation des couleurs, personnage/avatar) sont hors scope
ici, traités dans des specs séparées.

## Décisions actées avec la fondatrice

- **Deux onglets dans Explorer**, pas trois : "Situations Terrain" (existant,
  inchangé) et "Dossier de soins" (nouveau). Aucune distinction "rôle propre"
  / "sur prescription médicale" en tant qu'onglets séparés — cette
  information, si utile, vivra plus tard à l'intérieur de chaque fiche, pas
  comme structure de navigation.
- **Contenu en lecture seule pour cette v1** : chaque fiche s'ouvre comme une
  fiche de référence structurée (même esprit que le détail d'une Situation
  Terrain), pas comme un formulaire remplissable lié à un patient. Digitaliser
  les fiches de suivi (tableaux jour par jour, cases à cocher liées à un
  patient) est un chantier bien plus large, explicitement différé.
- **Nouvelle table dédiée** (`fiches_dossier_soins`) plutôt que de réutiliser
  `situations_terrain` — la forme du contenu ne correspond qu'aux 6 fiches
  "conduite à tenir" ; les fiches d'échelle (Braden, EVA douleur...) et les
  fiches administratives ont une forme différente. Voir Alternatives
  écartées.
- **Toutes les fiches sont publiées dès l'insertion** (`published = true`)
  mais taguées `niveau_confiance = 'brouillon'` — visibles immédiatement dans
  l'app pour que la fondatrice les valide elle-même (le badge
  brouillon/relu/valide existe déjà dans l'UI des Situations Terrain). Elle
  passera chaque fiche à `'valide'` (mise à jour SQL directe, comme pour le
  contenu Situations Terrain existant) au fur et à mesure de sa relecture.
- **Pas de PDF joint dans cette v1** : le contenu est retranscrit en texte
  structuré, pas de lien vers le PDF original (aucun stockage Supabase
  configuré pour ça aujourd'hui). Peut être ajouté plus tard comme complément
  (voir Alternatives écartées).
- **Sections vides masquées** : "Allergies & alertes" et "Contacts utiles"
  n'ont aujourd'hui aucune fiche dédiée dans le document source (uniquement
  des intercalaires visuels sans contenu propre) — ces sections n'apparaissent
  pas dans la liste tant qu'aucune fiche n'y est rattachée.

## Architecture

### Migration (nouvelle)

```sql
create table public.fiches_dossier_soins (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in (
    'identification_patient',
    'traitements',
    'surveillance_clinique',
    'protocoles_urgence',
    'transmissions_infirmieres',
    'prescriptions_liaisons_medicales',
    'administratif',
    'allergies_alertes',
    'contacts_utiles'
  )),
  titre text not null,
  resume text not null,
  contenu jsonb not null default '[]',
  sources jsonb not null default '[]',
  ordre int not null default 0,
  niveau_confiance text not null default 'brouillon' check (niveau_confiance in ('brouillon','relu','valide')),
  version int not null default 1,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fiches_dossier_soins enable row level security;

create policy "fiches_dossier_soins_select_published" on public.fiches_dossier_soins
  for select using (published = true and auth.role() = 'authenticated');
```

`contenu` est un tableau de blocs `{ "titre": string, "items": string[] }` —
ex. pour une fiche CAT : `[{"titre": "Signes d'alerte", "items": [...]},
{"titre": "Conduite à tenir", "items": [...]}]`. Même logique jsonb "liste de
chaînes" que `verifications`/`causes_possibles` sur `situations_terrain`,
juste enveloppée dans des blocs titrés pour s'adapter à des fiches dont les
sections varient (une échelle n'a pas les mêmes rubriques qu'un protocole
d'urgence ou qu'une fiche administrative).

`ordre` sert à conserver l'ordre du classeur physique à l'intérieur d'une
même section (ex. dans "Surveillance clinique", EVA douleur avant Score de
Braden avant TP-INR, etc.), `titre` restant libre plutôt qu'alphabétique.

### Types (`lib/types/clinical.ts`, modifié)

```ts
export type SectionDossierSoin =
  | "identification_patient"
  | "traitements"
  | "surveillance_clinique"
  | "protocoles_urgence"
  | "transmissions_infirmieres"
  | "prescriptions_liaisons_medicales"
  | "administratif"
  | "allergies_alertes"
  | "contacts_utiles";

export interface BlocContenuFiche {
  titre: string;
  items: string[];
}

export interface FicheDossierSoin {
  id: string;
  section: SectionDossierSoin;
  titre: string;
  resume: string;
  contenu: BlocContenuFiche[];
  sources: string[];
  ordre: number;
  niveauConfiance: NiveauConfiance;
  version: number;
  published: boolean;
}
```

Réutilise `NiveauConfiance` (déjà défini pour `SituationTerrain`).

### Couche données (nouveau : `lib/data/dossierSoins.ts`)

- `SECTIONS_DOSSIER_SOINS: { valeur: SectionDossierSoin; label: string }[]` —
  liste ordonnée fixe (ordre du classeur), utilisée par la page liste pour le
  regroupement et les intitulés affichés (ex. `protocoles_urgence` →
  "Protocoles d'urgence (conduites à tenir)").
- `mapFicheDossierSoin(row)` — même pattern que `mapSituationTerrain`.
- `getAllFichesDossierSoins(supabase): Promise<FicheDossierSoin[]>` — `select
  * from fiches_dossier_soins where published = true order by section,
  ordre`.
- `getFicheDossierDetail(supabase, id): Promise<FicheDossierSoin | null>` —
  `select * ... eq('id', id) eq('published', true) maybeSingle()`.

Le regroupement par section pour l'affichage se fait dans la page (simple
`reduce` sur la liste triée), pas dans la couche données — évite une
fonction supplémentaire pour un simple groupement d'affichage.

### Composants (nouveau)

- `components/ui/OngletsExplorer.tsx` — barre de 2 onglets, server component
  (pas de `"use client"`, pas de `usePathname` : l'onglet actif est passé en
  prop par la page, comme `actif: "situations" | "dossier"`), liens vers
  `/situations` et `/situations/dossier`.
- `components/ui/CarteFicheDossier.tsx` — carte de liste : badge
  `niveauConfiance`, titre, `resume` (2 lignes, `line-clamp-2`), lien vers
  `/situations/dossier/[id]`. Même structure visuelle que
  `CarteSituationTerrain` (badges en haut, titre, texte), sans le badge
  `specialite` (pas de notion de spécialité ici).

### Pages

- **`app/(app)/situations/page.tsx` (modifié)** : ajoute `<OngletsExplorer
  actif="situations" />` juste sous le conteneur principal, avant le `<h1>` —
  reste du contenu inchangé.
- **`app/(app)/situations/dossier/page.tsx` (nouveau)** : `<OngletsExplorer
  actif="dossier" />`, `<h1>Dossier de soins</h1>`, appelle
  `getAllFichesDossierSoins`, regroupe par section dans l'ordre de
  `SECTIONS_DOSSIER_SOINS` (sections sans fiche omises), affiche un `<h2>`
  par section suivi des `CarteFicheDossier` correspondantes. Message
  "Aucune fiche disponible pour le moment." si la liste complète est vide.
- **`app/(app)/situations/dossier/[id]/page.tsx` (nouveau)** : `notFound()`
  si absente ; affiche titre, badge `niveauConfiance`, chaque bloc de
  `contenu` comme une `<section>` avec `<h2>{bloc.titre}</h2>` et une liste à
  puces des `items`, puis une section "Sources" (même style que la page
  détail Situation Terrain), `LienRetour` vers `/situations/dossier`.

### Nav / `proxy.ts`

Aucun changement. `estActif()` dans `BarreNavigationBasse` utilise déjà
`pathname.startsWith(`${href}/`)`, donc `/situations/dossier` et
`/situations/dossier/[id]` gardent "Explorer" actif. `proxy.ts` protège déjà
tout ce qui commence par `/situations`.

## Gestion des cas limites

- Aucune fiche publiée du tout (avant l'insertion du contenu) : message
  "Aucune fiche disponible pour le moment.", même pattern que Situations
  Terrain.
- Section listée dans `SECTIONS_DOSSIER_SOINS` mais sans fiche publiée :
  omise de l'affichage (pas de titre de section vide).
- Fiche en `niveau_confiance = 'brouillon'` : visible normalement, badge
  affiché tel quel — aucune restriction d'accès liée à ce champ (seul
  `published` contrôle la visibilité, exactement comme Situations Terrain).
- Accès direct à `/situations/dossier/[id]` avec un id inexistant ou non
  publié : `notFound()` (même comportement que `/situations/[id]`).

## Tests

- Vitest (`lib/data/dossierSoins.ts`) : `mapFicheDossierSoin` (mapping
  snake_case → camelCase), `getAllFichesDossierSoins` (tri par section puis
  ordre, filtre `published`), `getFicheDossierDetail` (trouvée / absente /
  non publiée).
- Pas de nouveau test e2e Playwright dédié — pas de suite e2e existante
  couvrant `/situations` à étendre (cohérent avec l'absence de test e2e noté
  dans le design "Situation Terrain — liste/navigation").

## Vérification manuelle

Après la migration et l'insertion du contenu des 30 fiches, avec
autorisation explicite de la fondatrice : ouvrir `/situations`, confirmer que
la barre à deux onglets s'affiche et que "Situations Terrain" reste
identique à avant ; cliquer sur "Dossier de soins", confirmer que les
sections et fiches attendues apparaissent dans le bon ordre ; ouvrir une
fiche de chaque forme de contenu (une CAT, une échelle comme Braden, une
fiche administrative) et vérifier que les blocs s'affichent correctement ;
confirmer que les deux sections vides (Allergies & alertes, Contacts utiles)
n'apparaissent pas.

## Alternatives écartées

- **Réutiliser `situations_terrain`** pour tout le contenu du dossier de
  soins : écarté — sa forme fixe (`observation`, `verifications`,
  `causes_possibles`, `conduite_a_tenir`, `quand_avis_medical`) ne convient
  qu'aux 6 fiches "conduite à tenir" ; forcer les fiches d'échelle et
  administratives dans ce schéma aurait produit des champs vides ou
  détournés de leur sens.
- **Trois onglets (Situations Terrain / Rôle propre / Sur prescription)** :
  écarté par la fondatrice elle-même en faveur de deux onglets — la
  distinction rôle propre/prescription n'est pas structurante pour la
  navigation dans cette v1.
- **Formulaires remplissables liés à un patient** (au lieu de fiches de
  référence) : écarté pour cette v1 — chantier bien plus large (modèle de
  données par fiche, sauvegarde par patient, historique), à spécifier
  séparément si confirmé.
- **Joindre les PDF originaux** (stockage + téléchargement) : écarté pour
  cette v1 — aucun bucket Supabase Storage configuré aujourd'hui ; peut être
  ajouté en complément plus tard sans remettre en cause ce design (un champ
  `pdf_path` nullable suffirait).
- **Onglets en état client (`"use client"` + `usePathname`)**, comme la
  barre de navigation basse : écarté — les deux pages sont des routes
  distinctes déjà, l'onglet actif est connu statiquement par chaque page ;
  pas besoin de JS client pour ça, cohérent avec le reste de l'app
  (`/situations` et `/situations/[id]` sont déjà de purs server components).

## Hors scope (rappel)

- Nom de l'infirmière dynamique affiché sur les fiches (chantier 2, spec
  séparée).
- Personnalisation des couleurs (chantier 3, spec séparée).
- Personnage/avatar homme-femme (chantier 4, spec séparée).
- Distinction rôle propre / sur prescription médicale comme métadonnée par
  fiche (pourrait être ajoutée plus tard sans changer la structure de
  navigation actée ici).
- Formulaires remplissables liés à un patient pour les fiches de suivi
  (Braden, EVA douleur, etc.).
- Téléchargement/consultation du PDF original de chaque fiche.
