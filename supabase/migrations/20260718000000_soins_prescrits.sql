-- Fiche patient complète.
alter table public.patients
  add column medecin_nom text,
  add column medecin_telephone text,
  add column contact_urgence_nom text,
  add column contact_urgence_telephone text,
  add column antecedents text,
  add column traitements_en_cours text;

-- Soins prescrits : récurrence détachée des missions concrètes.
create table public.soins_prescrits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  idel_id uuid not null references public.profiles(id) on delete cascade,
  type_soin text not null,
  frequence_type text not null check (frequence_type in ('jours_semaine', 'tous_les_x_jours', 'quotidien', 'ponctuel')),
  jours_semaine int[],
  intervalle_jours int,
  heures time[] not null,
  date_debut date not null default current_date,
  date_fin date,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  check (
    (frequence_type = 'jours_semaine' and jours_semaine is not null and intervalle_jours is null)
    or (frequence_type = 'tous_les_x_jours' and intervalle_jours is not null and jours_semaine is null)
    or (frequence_type in ('quotidien', 'ponctuel') and jours_semaine is null and intervalle_jours is null)
  )
);

alter table public.soins_prescrits enable row level security;

create policy "soins_prescrits_owner_all" on public.soins_prescrits
  for all using (auth.uid() = idel_id) with check (auth.uid() = idel_id);
