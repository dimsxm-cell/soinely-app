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
