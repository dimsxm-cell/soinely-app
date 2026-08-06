# Matériel du jour — Design

**Statut :** Design validé en dialogue avec la fondatrice (2026-08-06).

## Contexte

Un audit du projet (2026-08-05) a repéré un écart marketing du même type que
celui déjà traité pour la réorganisation de tournée :
`components/marketing/JourneeAvecSoinely.tsx` promet, dans son storyboard
"Une journée avec Soinely", une checklist "Matériel à préparer" (le matin)
et "Matériel vérifié" (le soir) — aux côtés d'items qui existent déjà
réellement dans l'app (ordonnances scannées, photos classées, transmissions
envoyées, réorganisation de tournée). Aucune fonctionnalité de matériel
n'existe.

Contrairement au chantier de réorganisation de tournée, la fondatrice a
choisi ici de construire la version fidèle à la promesse plutôt qu'une
version réduite : une liste de matériel déduite intelligemment des actes
planifiés du jour, pas une simple checklist libre.

## Décisions actées avec la fondatrice

- **Liste intelligente, pas une checklist manuelle.** Le matériel nécessaire
  est calculé à partir des actes réellement planifiés aujourd'hui (ex. 3
  pansements simples → quantités de compresses, sérum physiologique,
  pansements en conséquence), pas saisi à la main par l'IDEL.
- **Correspondance acte → matériel composée par défaut, à réviser.** Faute
  d'une source de référence fournie par la fondatrice, la correspondance
  ci-dessous a été composée à partir du catalogue NGAP déjà présent dans
  l'app. Comme le reste du contenu clinique de l'app (situations terrain,
  dossier de soins), elle est marquée `niveau_confiance: brouillon` —
  seule la fondatrice, infirmière de métier, peut la valider.
- **Une seule liste par jour, pas par patient.** Le storyboard marketing
  montre une ligne unique "Matériel à préparer" / "Matériel vérifié" par
  jour — la fonctionnalité agrège tous les actes de la tournée en une
  liste, cohérent avec cette présentation.
- **Emplacement : une carte sur `/ma-journee`**, juste après les cartes de
  statistiques existantes (Patients/Injections/Pansements/Glycémies) et
  avant la liste des missions du jour — même position que le bouton
  "Réorganiser ma tournée" du chantier précédent.
- **Validation en un seul geste.** Un bouton "J'ai tout préparé" coche la
  liste entière d'un coup ; un second bouton "Tout vérifié", indépendant,
  fait de même pour la vérification du soir. Pas de case à cocher par
  article.

## Architecture

### 1. Correspondance actes → matériel (nouvelle table `materiel_ngap`)

```sql
create table public.materiel_ngap (
  id uuid primary key default gen_random_uuid(),
  ngap_code_id uuid not null references public.ngap_codes(id) on delete cascade,
  libelle text not null,
  quantite integer not null default 1,
  niveau_confiance text not null default 'brouillon'
    check (niveau_confiance in ('brouillon', 'relu', 'valide')),
  published boolean not null default true
);
```

Une ligne par (code NGAP, article de matériel) — `quantite` est la quantité
nécessaire pour UNE occurrence de l'acte. La correspondance initiale,
composée à partir du catalogue NGAP existant (`ngap_codes`) :

| Code NGAP | Matériel (libellé, quantité) |
|---|---|
| AMI 1 (injection SC/IM) | Seringue (1), aiguille (1), compresse antiseptique (1), container DASRI (1) |
| AMI 2 (pansement simple) | Compresses stériles (4), sérum physiologique (1), pansement adhésif (1), gants à usage unique (1 paire) |
| AMI 4 (pansement lourd) | Compresses stériles (6), sérum physiologique (1), pansement absorbant (1), gants à usage unique (1 paire), set de détersion (1) |
| AMI 9 (perfusion courte) | Nécessaire à perfusion (1), cathéter court (1), pansement transparent (1), garrot (1) |
| AMI 14 (perfusion longue) | Nécessaire à perfusion (1), cathéter (1), pansement transparent (1), garrot (1), potence/support (1) |
| AIS 3 (toilette/habillage) | Gants à usage unique (1 paire), gant de toilette (1), produit de toilette (1) |
| BSA / BSB / BSC (forfaits) | Aucun — le matériel vient des actes techniques associés, pas du forfait |
| TLS / TLD / TLL (téléconsultation) | Aucun |
| DI 1,2 / DI 2,5 (bilan de soins) | Aucun |

Les codes sans ligne dans `materiel_ngap` sont simplement absents de la
liste générée — aucune erreur, aucun article vide.

### 2. État de validation (deux nouvelles colonnes sur `tournees`)

```sql
alter table public.tournees
  add column if not exists materiel_prepare boolean not null default false,
  add column if not exists materiel_verifie boolean not null default false;
```

Une tournée = une ligne par jour (`genererTourneeDuJour`) : ces deux
colonnes repartent naturellement à `false` chaque nouveau jour, sans code
supplémentaire.

### 3. Agrégation (`lib/data/materiel.ts`)

```ts
export interface MaterielItem {
  libelle: string;
  quantite: number;
}

export async function getMaterielDuJour(
  supabase: SupabaseClient<Database>,
  tourneeId: string
): Promise<MaterielItem[]>
```

Récupère tous les `actes_mission` des missions de la tournée (jointure
`missions_du_jour` → `actes_mission`), pour chaque acte avec un
`ngap_code_id` renseigné, joint `materiel_ngap` sur ce code. Additionne les
quantités par `libelle` (ex. 3 pansements simples → 12 compresses en une
seule ligne "Compresses stériles ×12"), trie le résultat par libellé.
Retourne un tableau vide si aucun acte du jour n'a de matériel associé — la
carte ne s'affiche alors pas du tout côté UI (pas de section vide).

### 4. Interface (`/ma-journee`)

Nouvelle carte "Matériel du jour" entre le bloc de statistiques
(`CarteInformation`) et le titre "Missions du jour", visible seulement si
`getMaterielDuJour` retourne au moins un article. Liste les articles
(`libelle ×quantite`), puis deux boutons côte à côte :
- "J'ai tout préparé" → devient "✓ Préparé" une fois cliqué (écrit
  `materiel_prepare = true` sur la tournée du jour).
- "Tout vérifié" → même mécanique indépendante, écrit
  `materiel_verifie = true`.

Nouvelle Server Action `updateMaterielAction` dans `lib/data/materiel.ts`
(ou `lib/data/ma-journee-actions.ts`, à trancher au moment du plan selon la
taille du fichier existant), suivant le patron `ResultatEcriture` déjà en
place — prend `tourneeId` et le champ à cocher (`prepare` ou `verifie`).

## Cas limites

- **Aucun acte du jour n'a de matériel associé** (ex. journée uniquement en
  téléconsultation ou forfaits BSI) : la carte ne s'affiche pas — rien à
  préparer, pas de section vide déroutante.
- **Un acte sans `ngap_code_id`** (soin sans code catalogué) : ignoré par
  l'agrégation, comme les codes sans ligne `materiel_ngap`.
- **Réorganisation de tournée en cours de journée** (chantier précédent) :
  n'affecte pas la liste de matériel — elle dépend des actes prévus, pas de
  leur ordre de passage.
- **Rechargement de la page après avoir coché "Préparé"** : l'état persiste
  (colonne sur `tournees`), le bouton reste "✓ Préparé" jusqu'au lendemain
  (nouvelle tournée, nouvelle ligne, colonnes reparties à `false`).

## Tests

- `getMaterielDuJour` : agrège correctement plusieurs occurrences du même
  code (quantités sommées) ; ignore les actes sans `ngap_code_id` et les
  codes sans ligne `materiel_ngap` ; retourne un tableau vide pour une
  tournée sans matériel nécessaire.
- `updateMaterielAction` : écrit le bon champ (`materiel_prepare` ou
  `materiel_verifie`) sans toucher l'autre ; erreur explicite si la
  tournée n'existe pas.
- Carte "Matériel du jour" : ne s'affiche pas si la liste est vide ; affiche
  les articles et boutons sinon ; les deux boutons basculent
  indépendamment leur état visuel.

## Vérification manuelle

Sur une tournée du jour avec des actes de pansement/injection planifiés,
confirmer que la carte "Matériel du jour" affiche une liste cohérente
(quantités sommées correctement), que les deux boutons fonctionnent
indépendamment, et que l'état persiste après rechargement de la page. Sur
une tournée sans acte technique (uniquement forfaits/téléconsultation),
confirmer que la carte ne s'affiche pas.

## Alternatives écartées

- **Checklist manuelle libre** (l'IDEL saisit elle-même ses items) : écartée
  par la fondatrice — moins fidèle à la promesse marketing d'une liste
  "intelligente" déduite des soins du jour.
- **Case à cocher par article** : écartée pour rester cohérente avec le
  storyboard marketing, qui montre une seule ligne "Matériel" par jour, pas
  un détail article par article dans l'interface de validation.
- **Gestion de stock avec quantités en inventaire** : hors scope — la
  fonctionnalité indique ce qu'il faut préparer/vérifier pour la journée,
  elle ne suit pas un stock permanent ni des seuils de réapprovisionnement.

## Hors scope

- Gestion de stock ou d'inventaire permanent.
- Correspondance acte → matériel pour des actes hors du catalogue NGAP
  actuel de l'app (ex. soins de stomie, sondages — absents du catalogue
  `ngap_codes` aujourd'hui).
- Personnalisation de la correspondance acte → matériel par l'IDEL
  elle-même (ajout/suppression d'articles) — la correspondance reste un
  contenu de référence géré par la fondatrice, au même titre que le
  catalogue NGAP ou les situations terrain.
