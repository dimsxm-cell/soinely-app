-- Bucket de stockage pour la photo de profil de l'IDEL (privé, jamais
-- public — servi uniquement via URLs signées à la demande, même principe
-- que photos-visites).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 5242880, array['image/jpeg','image/png','image/webp']);

-- RLS sur storage.objects : chaque IDEL ne peut lire/écrire que sa propre
-- photo, identifiée par le premier segment du chemin (idel_id).
create policy "avatars_owner_all" on storage.objects
  for all
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Le chemin du fichier est stocké dans les métadonnées utilisateur
-- (auth.users.raw_user_meta_data.avatar_path) — pas de colonne dédiée,
-- pas d'URL stockée puisque les URLs signées expirent.
