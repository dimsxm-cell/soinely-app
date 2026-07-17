# Photo jointe à la visite — Design

**Statut :** Design validé en dialogue avec le fondateur (2026-07-17). Reste
à valider : ce document écrit, avant de passer au plan d'implémentation.

## Contexte

Dernier des 4 mini-chantiers de "geste de fin de soin" (transmission/
dernière transmission et absence livrés par
`docs/superpowers/specs/2026-07-16-fiche-patient-v2-design.md` ; navigation
vers le patient suivant et rappel pour la prochaine visite livrés
respectivement par
`docs/superpowers/specs/2026-07-16-navigation-patient-suivant-design.md`
et `docs/superpowers/specs/2026-07-16-rappel-prochaine-visite-design.md`).

Comme "rappel", "photo" n'avait pas de description écrite dans les
mockups existants — clarifié en direct avec le fondateur au démarrage de
ce chantier.

Techniquement, c'est le chantier le plus différent des 3 précédents :
c'est la première fois que l'app stocke des fichiers (toutes les données
jusqu'ici sont des lignes de table Postgres). Ça introduit Supabase
Storage, absent du reste du projet.

**Remarque actée avec le fondateur, sans changer la décision déjà prise**
([[project_stack_hds_pivot]]) : une photo de plaie est une donnée de
santé nettement plus sensible qu'un champ texte — c'est le premier
chantier où le type de donnée manipulé se rapproche de ce que le pivot
HDS visait à couvrir. Ça ne déclenche pas la clause de révision du pivot
(pas de vraie donnée patient impliquée, toujours des fixtures de test),
mais le traitement demandé ci-dessous (bucket privé, URLs signées) reflète
cette sensibilité dès cette v1 plutôt que de la traiter en dette technique
plus tard.

## Décisions actées avec le fondateur

- **Une seule photo par visite.** Un nouvel envoi remplace l'ancienne
  (upsert) — pas de galerie, pas d'historique de versions. Cohérent avec
  le rythme des 3 mini-chantiers précédents (une v1 volontairement
  étroite).
- **Affiche aussi la photo de la visite précédente** ("dernière photo"),
  même mécanisme que "dernière transmission"/"dernier rappel" — utile pour
  comparer l'évolution d'une plaie d'une visite à l'autre.
- **Bucket Supabase Storage privé, jamais public.** Les photos sont
  servies via des URLs signées, générées à la demande et valables
  quelques minutes seulement — jamais une URL stockée ou durable. Reflète
  le même principe que le RLS déjà appliqué à toutes les autres données
  patient : l'accès passe toujours par une vérification d'identité, jamais
  par la possession d'un lien.
- **Envoi via formulaire natif** (`<input type="file">`), pas de
  composant client — cohérent avec le reste de l'app (`/ma-journee` et
  ses sous-écrans n'ont aucun `"use client"`, seul `/login` en a un).
  `capture="environment"` sur l'input pour proposer l'appareil photo en
  priorité sur mobile, tout en acceptant aussi la galerie.
- **Mêmes conditions de visibilité pour l'envoi que transmission/rappel** :
  visible seulement si le statut de la mission est `en_cours` ou
  `terminee`.
- **"Dernière photo" toujours affichée si elle existe**, sans condition de
  statut — même logique que "dernière transmission"/"dernier rappel".

## Architecture

### Migration (nouvelle)

```sql
-- Bucket de stockage pour les photos jointes aux visites (privé, jamais
-- public — servi uniquement via URLs signées à la demande).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos-visites', 'photos-visites', false, 10485760, array['image/jpeg','image/png','image/webp']);

-- RLS sur storage.objects : chaque IDEL ne peut lire/écrire que ses
-- propres fichiers, identifiés par le premier segment du chemin
-- (idel_id) — même principe que missions_du_jour_owner_all/
-- patients_owner_all, appliqué ici au stockage de fichiers.
create policy "photos_visites_owner_all" on storage.objects
  for all
  using (bucket_id = 'photos-visites' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'photos-visites' and (storage.foldername(name))[1] = auth.uid()::text);

-- Chemin du fichier dans le bucket (pas une URL — les URLs signées sont
-- générées à la demande, jamais stockées puisqu'elles expirent).
alter table public.missions_du_jour
  add column photo_path text;
```

`file_size_limit` : 10 Mo (10485760 octets), généreux pour une photo de
téléphone tout en évitant un envoi disproportionné. `allowed_mime_types`
restreint aux formats image courants — un envoi d'un autre type de
fichier est rejeté par Supabase Storage lui-même, avant même d'atteindre
le code de l'app.

`storage.objects` a RLS activée par défaut sur tout projet Supabase (pas
besoin d'un `alter table ... enable row level security` explicite, à la
différence des tables `public.*`).

Convention de chemin : `{idel_id}/{missionId}.{extension}` — un fichier
par mission, le remplacement (upsert) écrase le fichier existant au même
chemin.

### Types (`lib/types/clinical.ts`, modifié)

`MissionDetail` gagne deux champs, symétriques à
`transmission`/`derniereTransmission` — mais stockant un **chemin**, pas
une URL :

```ts
export interface MissionDetail extends MissionDuJour {
  // ...champs existants...
  photoPath: string | null;
  dernierePhotoPath: string | null;
}
```

### Couche données (`lib/data/ma-journee.ts`, modifié)

- Nouvelle fonction privée `getDernierePhoto`, calquée exactement sur
  `getDerniereTransmission`/`getDernierRappel` (même patient, exclut la
  mission courante, filtre les lignes où `photo_path` n'est pas vide,
  triée par date de tournée puis heure décroissante, garde la plus
  récente).
- `getMissionDetail` (existant) est étendu : sélectionne aussi
  `photo_path` sur la mission courante, appelle `getDernierePhoto` sans
  condition de statut (comme les deux mécanismes déjà en place).
- **Nouvelle fonction exportée `getPhotoUrl(supabase, path)`** : appelle
  `supabase.storage.from("photos-visites").createSignedUrl(path, 300)`
  (5 minutes de validité) et retourne l'URL signée, ou `null` en cas
  d'erreur (fichier supprimé manuellement, bucket mal configuré, etc.).
  **Volontairement séparée de `getMissionDetail`** : une URL signée est un
  artefact d'affichage à durée de vie courte, pas une donnée de mission —
  `getMissionDetail` continue de ne retourner que des chemins stables.
  C'est l'écran qui résout `photoPath`/`dernierePhotoPath` en URLs
  affichables, seulement quand chacun n'est pas vide.

### Server Actions (`lib/data/ma-journee-actions.ts`, modifié)

Nouvelle `uploadPhotoAction(formData)` :
1. Lit `missionId` et le fichier (`formData.get("photo")`) ; ne fait rien
   si ce n'est pas un `File` ou s'il est vide.
2. Récupère l'utilisateur authentifié (`supabase.auth.getUser()`) — son
   `id` sert de premier segment du chemin, condition pour que la policy
   RLS sur `storage.objects` accepte l'écriture.
3. Vérifie que la mission existe (même garde que les autres actions).
4. Envoie le fichier vers `photos-visites` au chemin
   `{userId}/{missionId}.{extension}` avec `upsert: true`.
5. Si l'envoi réussit, met à jour `missions_du_jour.photo_path` avec ce
   chemin, puis revalide `/ma-journee/[missionId]`.
6. Si l'envoi échoue (erreur Storage), ne touche pas la base — pas de
   chemin orphelin pointant vers un fichier jamais réellement stocké.

### Écran `/ma-journee/[missionId]` (existant, modifié)

Dans le composant serveur, après avoir récupéré `mission`, résout les
URLs signées si les chemins existent :

```ts
const photoUrl = mission.photoPath ? await getPhotoUrl(supabase, mission.photoPath) : null;
const dernierePhotoUrl = mission.dernierePhotoPath ? await getPhotoUrl(supabase, mission.dernierePhotoPath) : null;
```

Deux ajouts à l'écran :

1. **Bloc "Dernière photo"** (lecture seule, `dernierePhotoUrl` non nul) :
   positionné après le bloc "Dernière transmission" (donc après le bloc
   "Rappel de la dernière visite" du chantier précédent) — regroupe les 3
   informations "ce qui s'est passé la dernière fois" côte à côte, dans
   l'ordre où elles ont été livrées. Affiche l'image (`<img>`, pas de
   zoom/plein écran pour cette v1).
2. **Bloc "Photo de cette visite"** (upload, visible si
   `peutEcrireTransmission`) : positionné après le bloc "Rappel pour la
   prochaine visite", donc en dernier des blocs d'écriture avant les
   boutons d'action. Si `photoUrl` existe déjà, l'affiche au-dessus du
   formulaire d'envoi (pour montrer ce qui est déjà enregistré avant d'en
   envoyer une autre). Formulaire : `<input type="file" name="photo"
   accept="image/*" capture="environment">` + bouton "Envoyer", soumis à
   `uploadPhotoAction`.

## Gestion des cas limites

- `photoPath`/`dernierePhotoPath` vides : aucun bloc affiché, pas de bloc
  vide (même convention que transmission/rappel).
- `getPhotoUrl` retourne `null` (fichier supprimé manuellement du bucket,
  erreur Storage) alors que `photoPath` existe en base : le bloc
  correspondant ne s'affiche pas — dégradation silencieuse, cohérente avec
  le reste de la couche données de ce fichier (aucune fonction n'expose
  ses erreurs à l'écran).
- Envoi d'un fichier trop lourd ou d'un type non autorisé : rejeté par la
  configuration du bucket (`file_size_limit`/`allowed_mime_types`) avant
  d'atteindre `missions_du_jour` — `uploadPhotoAction` ne met rien à jour
  dans ce cas (erreur Storage = pas d'écriture en base, cf. Server
  Actions ci-dessus). Pas de message d'erreur affiché à l'IDEL pour cette
  v1 (cohérent avec le reste de l'app : aucune action existante n'affiche
  de message d'erreur).
- Ré-envoi d'une photo pour la même visite : remplace l'ancienne au même
  chemin (upsert) — l'ancien fichier n'existe plus après un nouvel envoi
  réussi.
- Extension de fichier absente ou inattendue (ex : capture mobile sans
  extension claire) : `photo.name.split(".").pop() ?? "jpg"` — un
  fallback simple, pas de détection de type par contenu pour cette v1.

## Tests

- Vitest : `getMissionDetail` — nouveaux champs `photoPath`/
  `dernierePhotoPath` mappés correctement ; `getDernierePhoto` suit les
  mêmes 2 cas de test déjà établis pour `getDerniereTransmission`/
  `getDernierRappel` (une visite précédente pertinente, aucune).
- Vitest : `getPhotoUrl` (nouveau) — retourne l'URL signée si
  `createSignedUrl` réussit, `null` si erreur. Premier test de ce fichier
  à mocker `supabase.storage.from(...)` plutôt que
  `supabase.from(...)` — nouveau pattern de mock à établir dans le plan
  d'implémentation (distinct de tout ce qui existe déjà dans
  `ma-journee.test.ts`).
- Vitest : `uploadPhotoAction` (nouveau) — envoie le fichier puis met à
  jour `photo_path` et revalide si tout réussit ; ne met rien à jour si
  la mission n'existe pas, si l'entrée n'est pas un fichier, ou si
  l'envoi Storage échoue. Mock à deux niveaux : `supabase.from(...)`
  (existant) et `supabase.storage.from(...).upload(...)` (nouveau) et
  `supabase.auth.getUser()` (nouveau — première action de ce fichier à
  avoir besoin de l'identité de l'utilisateur, les autres dérivent tout
  de `missionId`).
- Pas de nouveau test e2e Playwright dédié — même écran déjà couvert,
  aucune nouvelle route. (Un vrai envoi de fichier bout-en-bout resterait
  de toute façon hors de portée de Playwright sans un vrai navigateur
  avec accès fichier, non configuré dans ce projet.)

## Vérification manuelle

Après déploiement, avec autorisation explicite du fondateur — et une fois
la migration de ce chantier appliquée (s'ajoute aux 3 déjà en attente,
voir `.superpowers/sdd/progress.md`) : envoyer une photo de test sur une
mission `en_cours`/`terminee`, confirmer qu'elle s'affiche immédiatement ;
créer une seconde mission pour le même patient et confirmer que "Dernière
photo" s'affiche correctement sur cette 2ᵉ mission ; ré-envoyer une photo
sur la même mission et confirmer que l'ancienne est bien remplacée (pas
juste ajoutée) ; confirmer qu'une IDEL différente ne peut pas voir les
photos de cette IDEL de test (vérification RLS storage, pas seulement RLS
table).

## Alternatives écartées

- **Bucket public avec URL directe stockée en base** : écartée — la
  sensibilité de la donnée (photo de plaie) justifie le même niveau de
  protection que le reste des données patient, pas un lien "sécurité par
  l'obscurité".
- **Plusieurs photos par visite (galerie)** : écartée pour cette v1 —
  demanderait une table séparée plutôt qu'une colonne, cohérent avec le
  choix déjà fait pour "rappel" (rester sur le pattern le plus simple qui
  couvre le besoin décrit).
- **Composant client pour l'aperçu/recadrage avant envoi** : écartée —
  romprait avec la convention "aucun JS client" du reste de l'app pour un
  gain limité ; l'envoi natif suffit.
- **Compression/redimensionnement côté serveur avant stockage** : écartée
  pour cette v1 — le `file_size_limit` du bucket suffit à éviter les abus
  flagrants, l'optimisation de taille est une amélioration future si le
  volume de stockage devient un problème réel.

## Hors scope (rappel)

- Galerie de plusieurs photos par visite, suppression manuelle,
  zoom/plein écran, compression (voir Alternatives écartées).
- Message d'erreur affiché à l'IDEL en cas d'échec d'envoi (cohérent avec
  le reste de l'app pour cette v1).
- Ce chantier clôt les 4 mini-chantiers de "geste de fin de soin" —
  aucun mini-chantier connu ne reste après celui-ci dans cette série.
