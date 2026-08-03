-- Photographies d'ordonnances.
--
-- Une IDEL reçoit ses prescriptions sur papier. Sans moyen de les conserver
-- dans l'application, elle en garde une photo dans sa galerie personnelle,
-- mêlée à ses photos privées — ou elle rappelle le médecin au moindre doute
-- sur une posologie.
--
-- Rattachées au patient et non à un soin : une même ordonnance en couvre
-- souvent plusieurs, et se lit d'un bloc.

-- ── Stockage ────────────────────────────────────────────────────────────────
-- Privé, comme les photos de visite : ce sont des données de santé, elles ne
-- doivent jamais être atteignables par une URL devinable. La lecture passe par
-- des URL signées à durée de vie courte.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ordonnances',
  'ordonnances',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- Chaque IDEL n'atteint que ses propres fichiers, identifiés par le premier
-- segment du chemin — même principe que le bucket des photos de visite.
drop policy if exists "ordonnances_owner_all" on storage.objects;
create policy "ordonnances_owner_all" on storage.objects
  for all
  using (bucket_id = 'ordonnances' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'ordonnances' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── Table ───────────────────────────────────────────────────────────────────
create table if not exists public.ordonnances (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  idel_id uuid not null references public.profiles(id) on delete cascade,
  -- Chemin dans le bucket, jamais une URL : les URL signées expirent, les
  -- stocker reviendrait à conserver des liens morts.
  fichier_path text not null,
  -- Date portée par l'ordonnance elle-même, qui n'est pas celle de la photo :
  -- une prescription se photographie parfois plusieurs jours après.
  date_prescription date,
  note text,
  created_at timestamptz not null default now()
);

comment on table public.ordonnances is
  'Photographies des prescriptions papier, rattachées au patient.';

create index if not exists ordonnances_patient_idx
  on public.ordonnances (patient_id, created_at desc);

alter table public.ordonnances enable row level security;

drop policy if exists "ordonnances_owner_all" on public.ordonnances;
create policy "ordonnances_owner_all" on public.ordonnances
  for all
  using (auth.uid() = idel_id)
  with check (auth.uid() = idel_id);
