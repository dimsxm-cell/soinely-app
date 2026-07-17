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
