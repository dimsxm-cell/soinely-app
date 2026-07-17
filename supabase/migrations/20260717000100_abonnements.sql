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

-- Seule policy : lecture de sa propre ligne. Aucune policy d'écriture —
-- toute écriture passe par le webhook Stripe via le client service_role,
-- qui contourne RLS. Un utilisateur ne doit jamais pouvoir se donner
-- lui-même un statut "actif".
create policy "abonnements_owner_select" on public.abonnements
  for select using (auth.uid() = profile_id);
