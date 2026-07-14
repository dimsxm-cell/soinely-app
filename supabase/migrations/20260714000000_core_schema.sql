create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'idel' check (role in ('idel', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create table public.situations_terrain (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  observation text not null,
  verifications jsonb not null default '[]',
  causes_possibles jsonb not null default '[]',
  conduite_a_tenir jsonb not null default '[]',
  quand_avis_medical text not null,
  sources jsonb not null default '[]',
  specialite text not null default 'idel',
  niveau_confiance text not null default 'valide' check (niveau_confiance in ('brouillon','relu','valide')),
  version int not null default 1,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.situations_terrain enable row level security;

create policy "situations_terrain_select_published" on public.situations_terrain
  for select using (published = true);

create table public.missions_cliniques (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  situation_terrain_id uuid references public.situations_terrain(id),
  etapes jsonb not null default '[]',
  duree_estimee_min int not null default 15,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.missions_cliniques enable row level security;

create policy "missions_cliniques_select_published" on public.missions_cliniques
  for select using (published = true);

create table public.ngap_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  libelle text not null,
  cotation numeric(6,2) not null,
  conditions text
);

alter table public.ngap_codes enable row level security;

create policy "ngap_codes_select_all" on public.ngap_codes
  for select using (true);

create table public.tournees (
  id uuid primary key default gen_random_uuid(),
  idel_id uuid not null references public.profiles(id) on delete cascade,
  date date not null default current_date,
  nb_patients int not null default 0,
  nb_injections int not null default 0,
  nb_pansements int not null default 0,
  nb_glycemies int not null default 0,
  temps_estime_min int not null default 0,
  unique (idel_id, date)
);

alter table public.tournees enable row level security;

create policy "tournees_owner_all" on public.tournees
  for all using (auth.uid() = idel_id) with check (auth.uid() = idel_id);

create table public.missions_du_jour (
  id uuid primary key default gen_random_uuid(),
  tournee_id uuid not null references public.tournees(id) on delete cascade,
  patient_label text not null,
  type_soin text not null,
  heure_prevue time not null,
  statut text not null default 'a_faire' check (statut in ('a_faire','en_cours','terminee')),
  mission_clinique_id uuid references public.missions_cliniques(id)
);

alter table public.missions_du_jour enable row level security;

create policy "missions_du_jour_owner_all" on public.missions_du_jour
  for all using (
    auth.uid() = (select idel_id from public.tournees where id = tournee_id)
  ) with check (
    auth.uid() = (select idel_id from public.tournees where id = tournee_id)
  );
