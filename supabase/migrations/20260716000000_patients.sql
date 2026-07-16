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
