-- Coordonnées professionnelles imprimables sur les documents émis depuis
-- Soinely. Le téléphone n'existait nulle part. Le numéro ADELI/RPPS était
-- collecté à l'inscription (app/login/actions.ts) mais rangé dans les seules
-- métadonnées d'authentification : jamais réaffiché, jamais modifiable — une
-- faute de frappe y était définitive.
alter table public.profiles
  add column if not exists telephone text,
  add column if not exists adeli_rpps text;

comment on column public.profiles.telephone is
  'Téléphone professionnel, imprimé sur les documents émis par l''IDEL.';
comment on column public.profiles.adeli_rpps is
  'Identifiant professionnel ADELI ou RPPS. Repris des métadonnées d''authentification, où l''inscription le déposait sans permettre de le corriger.';

-- Reprise des saisies déjà faites à l'inscription, pour n'en perdre aucune.
update public.profiles p
   set adeli_rpps = u.raw_user_meta_data ->> 'adeli_rpps'
  from auth.users u
 where u.id = p.id
   and p.adeli_rpps is null
   and nullif(u.raw_user_meta_data ->> 'adeli_rpps', '') is not null;
