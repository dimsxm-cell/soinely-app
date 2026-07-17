# Abonnements & paiement (Stripe) — Design

**Statut :** Design en cours de validation avec le fondateur (2026-07-17).
Décisions structurantes déjà actées (portée "cabinet", type d'essai
gratuit, prestataire de paiement). Reste à valider : ce document écrit,
avant de passer au plan d'implémentation.

## Contexte

Suite à un schéma de référence générale ("App Structure" : Landing page →
Signup → Payments → App) partagé par le fondateur — pas un cahier des
charges strict, mais qui a servi de déclencheur pour cadrer l'étape
"Payments", absente aujourd'hui de l'app (n'importe quel compte confirmé
accède directement à `/ma-journee`, aucune notion d'abonnement).

Ce chantier suit directement "Inscription et réinitialisation de mot de
passe" (fusionné sur `main`, PR #38) — la partie "Signup" du même schéma.

## Décisions actées avec le fondateur

- **2 offres, comptes toujours séparés.** "Cabinet infirmier IDEL" (39€/mois)
  n'implique **aucun partage de données** entre IDEL — chaque compte reste
  aussi isolé qu'aujourd'hui (RLS par `idel_id`, inchangée). C'est une
  distinction tarifaire/marketing, pas une notion d'équipe ou
  d'organisation. Aucun changement au modèle de données existant
  (patients, tournées, missions).
  - **Solo** : 19€/mois après essai.
  - **Cabinet** : 39€/mois après essai. Mêmes fonctionnalités que Solo —
    seul le prix et le libellé changent (positionnement pour un cabinet
    qui prend en charge l'abonnement d'une IDEL, pas un changement de
    périmètre technique).
- **Essai gratuit limité dans le temps** (14 jours), pas un palier gratuit
  permanent. Accès complet pendant l'essai, puis passage automatique en
  facturation à la fin des 14 jours si un moyen de paiement est enregistré
  — sinon, accès bloqué jusqu'à ce qu'un plan soit choisi.
- **Stripe** comme prestataire de paiement — Stripe Checkout (page hébergée,
  aucune donnée de carte ne transite par nos serveurs), Stripe gère
  l'essai (`trial_period_days`), le renouvellement récurrent, et les
  échecs de paiement.
- **Où se place le choix de plan** : après confirmation de l'email
  (`/auth/callback` réussi), si le compte n'a pas encore d'abonnement
  Stripe, redirection vers une page de choix de plan avant d'accéder à
  `/ma-journee` — reproduit l'ordre du schéma de référence
  (Signup → Payments → App).

## Architecture

### Migration (nouvelle)

Nouvelle table `public.abonnements`, un-à-un avec `profiles` :

```sql
create table public.abonnements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  plan text not null check (plan in ('solo', 'cabinet')),
  statut text not null default 'essai' check (statut in ('essai', 'actif', 'impaye', 'annule')),
  stripe_customer_id text,
  stripe_subscription_id text,
  essai_fin timestamptz,
  periode_fin timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.abonnements enable row level security;

create policy "abonnements_owner_select" on public.abonnements
  for select using (auth.uid() = profile_id);
```

Aucune policy d'écriture pour l'utilisateur — **seul le webhook Stripe
(via `service_role`, qui contourne RLS) écrit dans cette table.** Un
utilisateur ne doit jamais pouvoir modifier son propre statut
d'abonnement directement ; il ne peut que le lire (pour l'affichage) et
déclencher un Checkout Stripe (qui, lui, ne modifie la table qu'au retour
du webhook signé).

### Couche données / Server Actions (nouveau : `lib/data/abonnement.ts`, `lib/data/abonnement-actions.ts`)

- `getAbonnement(supabase, profileId)` : lit la ligne `abonnements` du
  profil courant (ou `null` si elle n'existe pas encore — compte tout
  juste confirmé, pas encore passé par le choix de plan).
- `createCheckoutSessionAction(formData)` : lit `plan` (`solo`/`cabinet`)
  depuis le formulaire, crée un client Stripe si `stripe_customer_id`
  n'existe pas encore, crée une session Stripe Checkout
  (`mode: 'subscription'`, `subscription_data: { trial_period_days: 14 }`,
  le bon Price ID selon le plan), redirige vers l'URL Checkout retournée
  par Stripe.

### Webhook Stripe (nouveau : `app/api/webhooks/stripe/route.ts`)

Route Handler `POST`, vérifie la signature Stripe (`stripe-signature`
header + secret de webhook), traite au minimum :
- `checkout.session.completed` : crée/complète la ligne `abonnements`
  (`stripe_customer_id`, `stripe_subscription_id`, `plan`, `statut = 'essai'`,
  `essai_fin`).
- `customer.subscription.updated` : synchronise `statut`
  (`trialing`→`essai`, `active`→`actif`, `past_due`→`impaye`,
  `canceled`→`annule`) et `periode_fin`.
- `customer.subscription.deleted` : `statut = 'annule'`.

Utilise le client Supabase `service_role` (jamais le client utilisateur —
un webhook n'a pas de session utilisateur) pour écrire dans
`abonnements`, seule écriture autorisée sur cette table.

### Contrôle d'accès (`proxy.ts`, modifié)

Après la vérification d'authentification existante, si la route est
protégée et que l'utilisateur est connecté : vérifier qu'un abonnement
avec `statut in ('essai', 'actif')` existe pour ce profil. Sinon,
redirection vers `/abonnement` (page de choix de plan) plutôt que
`/ma-journee`.

### Écrans (nouveaux)

- `/abonnement` : deux cartes de plan (Solo 19€, Cabinet 39€), bouton
  "Commencer l'essai gratuit de 14 jours" par plan → soumet
  `createCheckoutSessionAction` → redirection Stripe Checkout.
- Page de retour Checkout (`/abonnement/succes` ou paramètre de requête
  sur `/ma-journee`) : Stripe redirige ici après un Checkout réussi ;
  affiche une confirmation, puis lien vers `/ma-journee` (l'abonnement
  sera déjà à jour via le webhook, qui arrive généralement avant ou juste
  après la redirection navigateur).

## Gestion des cas limites

- Webhook reçu avant que l'utilisateur soit redirigé (race condition
  normale) : sans conséquence, `proxy.ts` relit `abonnements` à chaque
  requête protégée, donc l'accès se débloque dès que la ligne existe,
  peu importe l'ordre exact d'arrivée.
- Essai expiré sans moyen de paiement enregistré : Stripe marque
  l'abonnement `incomplete_expired` ou similaire selon la configuration
  — traité comme `impaye` côté webhook, accès bloqué, retour à
  `/abonnement`.
- Paiement échoué après la période d'essai (carte refusée) : `statut =
  'impaye'`, accès bloqué jusqu'à mise à jour du moyen de paiement (portail
  client Stripe, pas construit dans ce chantier — voir Hors scope).
- Compte confirmé (post-inscription) mais jamais passé par `/abonnement` :
  `getAbonnement` renvoie `null`, `proxy.ts` traite l'absence de ligne
  comme "pas d'accès", redirige vers `/abonnement`.

## Tests

- Vitest : `getAbonnement` (ligne trouvée, ligne absente → `null`).
- Vitest : `createCheckoutSessionAction` — mock du client Stripe,
  vérifie le bon Price ID selon le plan, la bonne configuration
  `trial_period_days`.
- Vitest : handler webhook — un test par type d'événement traité,
  vérifie la vérification de signature (rejette un payload non signé
  correctement) et le bon mapping de statut.
- Vitest : logique de garde dans `proxy.ts` — accès autorisé si
  `statut in ('essai','actif')`, refusé sinon.
- Pas de test e2e Playwright pour le Checkout Stripe lui-même (hors de
  portée sans un vrai environnement Stripe test).

## Vérification manuelle

**Bloquant avant tout test réel : le fondateur doit créer un compte
Stripe (mode test) et fournir les clés API test** (`STRIPE_SECRET_KEY`,
clé publique, secret de webhook) — je n'ai aucun moyen de les générer
moi-même, même chose que pour les identifiants Supabase déjà rencontrés
sur ce projet. Une fois les clés fournies : créer les 2 Price Stripe
(Solo/Cabinet) en mode test, configurer le endpoint webhook (via Stripe
CLI en local ou un tunnel), puis dérouler un essai complet (inscription
→ choix de plan → Checkout test → webhook reçu → accès à `/ma-journee`).

## Alternatives écartées

- **Palier gratuit permanent** : écarté — le fondateur veut un essai
  limité dans le temps, pas un free tier indéfini.
- **Notion de "cabinet" avec données partagées** : écartée pour ce
  chantier — gros changement d'architecture (RLS, permissions d'équipe),
  aucun besoin exprimé au-delà d'un tarif différent. À reconsidérer
  séparément si le besoin de collaboration multi-IDEL apparaît vraiment.
- **Portail client Stripe (gestion carte/facture par l'IDEL elle-même)** :
  écarté pour cette v1 — l'abonnement se crée et se renouvelle
  automatiquement, mais changer de carte ou annuler nécessiterait pour
  l'instant de contacter le support. À ajouter si le besoin devient réel.
- **Gestion explicite de la TVA** (Stripe Tax, exonération, etc.) : hors
  scope pour cette v1 — les prix (19€/39€) sont traités comme des
  montants affichés simples, sans logique de taxe dédiée. À trancher
  avant un vrai lancement commercial.

## Hors scope (rappel)

- Portail client Stripe, gestion de la TVA (voir Alternatives écartées).
- Notion d'équipe/cabinet avec données partagées.
- Changement de plan en cours d'abonnement (upgrade/downgrade Solo ↔
  Cabinet) — v1 se limite à choisir un plan une fois à l'inscription.
- Factures téléchargeables, relances par email personnalisées au-delà de
  ce que Stripe envoie par défaut.
