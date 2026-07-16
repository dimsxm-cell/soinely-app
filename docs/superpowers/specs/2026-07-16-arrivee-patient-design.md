# Écran "Arrivée chez le patient" (v1) — Design

**Statut :** Design validé en dialogue avec le fondateur (mockup + ajustements,
2026-07-16). Reste à valider : ce document écrit, avant de passer au plan
d'implémentation.

## Contexte

Ce chantier vient d'une session de brainstorming produit séparée (l'IDEL
fondatrice jouant son propre rôle face à un assistant), qui a identifié
l'écran "Arrivée chez le patient" comme l'écran le plus utilisé du parcours
d'une tournée : dès que l'IDEL se gare devant chez le patient, tout doit être
visible sans recherche — nom, heure, adresse, téléphone, acte prévu,
allergies, consignes.

Aujourd'hui, `missions_du_jour` n'a qu'un `patient_label` en texte libre,
ressaisi à chaque mission, sans identité persistante entre les jours.
Adresse, téléphone, allergies et consignes n'existent nulle part en base.

Ce document couvre le premier des trois éléments identifiés dans la session
source. Les deux autres — le geste complet de fin de soin (transmission,
photo, rappel, navigation automatique vers le patient suivant) et la
réorganisation de l'app en modules "journée" — sont des chantiers séparés,
non traités ici.

## Décisions actées avec le fondateur

- **Nouvelle table `patients`, persistante**, propriétaire = `idel_id` —
  plutôt que d'ajouter adresse/téléphone/allergies/consignes directement sur
  `missions_du_jour`. Un patient vu plusieurs fois n'exige la saisie de ses
  consignes et allergies qu'une fois.
- **`missions_du_jour.patient_label` est remplacé par `patient_id`**, pas
  ajouté en parallèle — remplacement net, cohérent avec le fait que ce champ
  n'a jamais porté de données de production réelles (seulement des
  fixtures de test insérées manuellement lors des chantiers précédents).
- **Écran dédié `/ma-journee/[missionId]`**, pas une expansion inline de
  `CarteMission` sur Ma Journée — cohérent avec le vocabulaire de la session
  source ("écran Arrivée chez le patient") et évite de surcharger une liste
  pensée comme compacte.
- **Seul "Commencer le soin" est dans ce chantier.** Il réutilise la
  transition `a_faire → en_cours` déjà construite (chantier "Changement de
  statut des missions"), juste recontextualisée comme CTA principal de cet
  écran. "Patient absent" est hors scope — ajouterait une 4ᵉ valeur à
  `statut` et une branche de logique métier à concevoir (que devient une
  mission "absent" ensuite ?), chantier séparé.
- **"Dernière prescription" et "dernière transmission" sont hors scope** —
  dépendent de concepts (historique de prescriptions, historique de
  transmissions) qui n'existent pas du tout en base aujourd'hui et
  appartiennent au chantier "geste de fin de soin".
- **Bouton "Itinéraire"** (ajouté après revue du mockup) : lien universel
  Google Maps construit à partir de `patients.adresse`, pas de calcul de
  trajet côté app, pas de nouvelle donnée. Choisi plutôt qu'un lien Waze
  direct pour ne pas dépendre d'une app spécifique installée sur le
  téléphone de l'IDEL.
- **Pas de création/suppression de patient depuis l'UI** dans ce chantier —
  les patients seront insérés manuellement (API Admin) pour la
  vérification, même pattern que `missions_du_jour` aujourd'hui.

## Architecture

### Migration (nouvelle)

```sql
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  idel_id uuid not null references public.profiles(id) on delete cascade,
  nom_complet text not null,
  adresse text not null,
  telephone text not null,
  allergies text,
  consignes text,
  created_at timestamptz not null default now()
);

alter table public.patients enable row level security;

create policy "patients_owner_all" on public.patients
  for all using (auth.uid() = idel_id) with check (auth.uid() = idel_id);

-- Aucune fixture de test existante ne référence un patient réel (elle ne
-- porte que patient_label, en texte libre) — elles sont vidées ici plutôt
-- que de bloquer l'ajout d'une colonne not null sans défaut. Confirmé
-- disposable par précédent (chantiers "Missions du jour" et "Changement de
-- statut" : fixtures réinsérées manuellement à chaque vérification).
delete from public.missions_du_jour;

alter table public.missions_du_jour
  drop column patient_label,
  add column patient_id uuid not null references public.patients(id);
```

Cette migration vide `missions_du_jour` (voir commentaire SQL ci-dessus) —
voir Vérification manuelle pour la réinsertion des fixtures de test.

### Couche données (`lib/data/ma-journee.ts`, fichier existant)

```ts
getMissionsDuJour(supabase: SupabaseClient<Database>, tourneeId: string): Promise<MissionDuJour[]>
```

- Requête modifiée : `select *, patients(nom_complet)`, jointure via
  `patient_id`, triée par `heure_prevue` (inchangé).
- Mapping : `patients.nom_complet` → `patientNom` (remplace `patientLabel`).

```ts
getMissionDetail(supabase: SupabaseClient<Database>, missionId: string): Promise<MissionDetail | null>
```

- Nouvelle fonction. Requête : `select *, patients(*)` `.eq("id",
  missionId).single()`.
- La policy `missions_du_jour_owner_all` (existante) scope déjà l'accès à la
  mission via `tournee_id → idel_id` ; `patients_owner_all` (nouvelle) scope
  l'accès au patient joint via `idel_id`. Les deux doivent passer pour que la
  ligne soit visible — cohérent, un patient n'est visible que par l'IDEL qui
  l'a créé.
- `null` si la mission n'existe pas ou n'appartient pas à l'IDEL connectée
  (RLS filtre silencieusement, pas d'erreur).

### Types (`lib/types/clinical.ts`, fichier existant, modifié)

```ts
export interface Patient {
  id: string;
  nomComplet: string;
  adresse: string;
  telephone: string;
  allergies: string | null;
  consignes: string | null;
}

export interface MissionDuJour {
  id: string;
  patientId: string;
  patientNom: string; // remplace patientLabel
  typeSoin: string;
  heurePrevue: string;
  statut: StatutMission;
  missionCliniqueId: string | null;
}

export interface MissionDetail extends MissionDuJour {
  patient: Patient;
}
```

### Server Actions (`lib/data/ma-journee-actions.ts`, fichier existant, modifié)

```ts
updateMissionStatutAction(formData: FormData): Promise<void>  // existant
```

- Ajoute `revalidatePath(`/ma-journee/${missionId}`)` en plus du
  `revalidatePath("/ma-journee")` existant, pour que le nouvel écran détail
  reflète aussi le changement de statut s'il est ouvert.

```ts
updateConsignesAction(formData: FormData): Promise<void>  // nouveau
```

- Lit `missionId` et `consignes` depuis le `FormData`.
- Relit `patient_id` de la mission en base (`select patient_id from
  missions_du_jour where id = missionId`) — ne fait pas confiance à un
  `patientId` fourni par le client, même si RLS empêcherait de toute façon
  une écriture sur le patient d'un autre IDEL.
- `update patients set consignes = ? where id = patient_id` — la policy
  `patients_owner_all` couvre déjà cet UPDATE.
- `revalidatePath(`/ma-journee/${missionId}`)` après une mise à jour
  réussie.

### `CarteMission` (composant existant, modifié)

- Le bloc nom + soin + heure devient un `<Link href={`/ma-journee/${mission.id}`}>`,
  **frère** du formulaire de statut existant — jamais imbriqué dans un lien
  (même structure que le `contexteHref` déjà en place pour "Contexte
  clinique", qui est lui aussi un lien-frère du formulaire).
- `mission.patientLabel` → `mission.patientNom`.

### Écran `/ma-journee/[missionId]` (nouveau, protégé)

- `proxy.ts` : **aucune modification nécessaire** — `PROTECTED_PATHS`
  contient déjà `"/ma-journee"` (via `startsWith`) et `config.matcher`
  contient déjà `"/ma-journee/:path*"`, qui couvre ce nouveau segment
  dynamique.
- Server Component : appelle `getMissionDetail`. Si `null` →
  `notFound()`.
- Affiche, dans l'ordre : nom du patient + badge de statut ; heure prévue ;
  ligne adresse avec bouton "Itinéraire" (`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(patient.adresse)}`,
  `target="_blank"` `rel="noopener noreferrer"`) ; ligne téléphone ; ligne
  acte prévu (`typeSoin`) ; bloc allergie (affiché seulement si
  `patient.allergies` non vide) ; bloc consignes (`<form
  action={updateConsignesAction}>` avec un `<textarea>` pré-rempli de
  `patient.consignes`, un champ caché `missionId`, un bouton "Enregistrer") ;
  bouton de statut reprenant exactement la logique de `CarteMission`
  (`updateMissionStatutAction`, libellé "Commencer le soin" pour la
  transition `a_faire → en_cours` sur cet écran, "Terminer" pour `en_cours →
  terminee`, aucun bouton si `terminee`).

## Gestion des cas limites

- Mission introuvable ou n'appartenant pas à l'IDEL connectée →
  `notFound()`.
- `patient.allergies` vide ou `null` : bloc allergie non affiché — pas de
  bloc vide alarmant pour rien.
- `patient.consignes` `null` : `<textarea>` vide, pas de texte de
  substitution particulier.
- Bouton "Itinéraire" : ouvre un nouvel onglet/l'app de navigation du
  téléphone ; aucune gestion d'erreur côté app si l'adresse est mal formée —
  délégué au système d'exploitation et à Google Maps.
- Mission déjà "terminée" : aucun bouton de statut affiché sur cet écran non
  plus, cohérent avec `CarteMission`.

## Tests

- Vitest : `getMissionsDuJour` — test existant mis à jour pour la jointure
  `patients` et le mapping `patientNom`.
- Vitest : `getMissionDetail` — nouveau, mapping mission + patient complet,
  cas "non trouvé" (`null`).
- Vitest : `updateConsignesAction` — relit `patient_id`, met à jour
  `patients.consignes`, `revalidatePath` appelé. Client Supabase simulé,
  même pattern que `updateMissionStatutAction`.
- Vitest : `updateMissionStatutAction` — test existant étendu pour vérifier
  le `revalidatePath` supplémentaire.
- Vitest : `CarteMission` — test existant mis à jour pour `patientNom` et le
  lien vers `/ma-journee/[missionId]`.
- Pas de nouveau test e2e Playwright dédié — `/ma-journee/[missionId]` est
  déjà couvert par le matcher `/ma-journee/:path*` existant ; comportement
  de redirection non authentifiée structurellement identique à ce qui est
  déjà testé.

## Vérification manuelle

Toute mission de test actuellement en base (insérée lors des chantiers
précédents, référençant `patient_label`) ne survivra pas la migration telle
quelle. Après déploiement, avec autorisation explicite du fondateur : insérer
un ou plusieurs patients de test (via API Admin/REST) puis des missions de
test pointant vers `patient_id`, pour le compte `test-idel@soinely.dev` —
même pattern que les vérifications précédentes. Le contrôleur vérifiera
ensuite : l'écran `/ma-journee/[missionId]` affiche bien adresse/téléphone/
allergie/consignes du patient de test ; le bouton "Itinéraire" pointe vers
l'URL Google Maps attendue ; l'édition des consignes persiste en base et
réapparaît après rechargement ; le bouton "Commencer le soin" fait
progresser le statut comme depuis Ma Journée.

## Alternatives écartées

- **Colonnes ajoutées directement sur `missions_du_jour`** (au lieu d'une
  table `patients`) : écarté — obligerait à ressaisir consignes et
  allergies à chaque nouvelle mission du même patient, contraire à
  l'objectif de gain de temps qui motive tout ce chantier.
- **Expansion inline de `CarteMission` sur Ma Journée** : écarté —
  surchargerait une liste pensée comme compacte, surtout avec plusieurs
  missions par jour.
- **Bouton "Patient absent" avec un nouveau statut** : écarté pour ce
  chantier — élargirait la portée avec une branche de logique métier à
  concevoir (devenir d'une mission "absent"). Chantier futur naturel.
- **"Dernière prescription" / "dernière transmission"** : écartés —
  dépendent de concepts qui n'existent pas encore en base, appartiennent au
  chantier "geste de fin de soin".
- **Lien direct Waze, ou deux boutons Waze + Maps côte à côte** : écarté au
  profit du lien universel Google Maps — fonctionne sans dépendre d'une app
  spécifique installée sur le téléphone de l'IDEL.

## Hors scope (rappel)

- Création ou suppression d'un patient depuis l'UI.
- "Patient absent" et toute évolution du modèle de statut au-delà des trois
  valeurs existantes.
- "Dernière prescription" / "dernière transmission".
- Le geste complet de fin de soin (transmission, photo, rappel, navigation
  automatique vers le patient suivant) — chantier séparé.
- La réorganisation de l'app en modules "journée" (Avant la tournée / En
  tournée / Entre deux patients / Fin de tournée / Gestion du cabinet) —
  chantier séparé.
