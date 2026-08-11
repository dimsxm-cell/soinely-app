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

-- ── Droit d'écrire ces deux colonnes ────────────────────────────────────────
-- `security_fixes` a révoqué l'update au niveau de la table avant de le rendre
-- colonne par colonne. En PostgreSQL, une colonne créée après une révocation
-- au niveau table n'hérite d'aucun privilège : sans ce grant, l'update de
-- `enregistrerCabinetAction` — qui porte désormais telephone et adeli_rpps —
-- serait refusé en entier. Plus aucun enregistrement possible depuis /compte,
-- pas même le code postal : « permission denied for table profiles », sans
-- que rien ne désigne la colonne fautive.
--
-- `droits_cabinet` (20260803000100) avait déjà corrigé exactement ce défaut
-- pour le code postal et l'adresse. Même forme, liste complétée.
--
-- La liste reste explicite plutôt que d'accorder la table entière : `role` et
-- `id` doivent continuer d'échapper à l'utilisatrice.
grant update (
  full_name,
  code_postal,
  adresse_cabinet,
  cabinet_latitude,
  cabinet_longitude,
  telephone,
  adeli_rpps
) on public.profiles to authenticated;

-- ── Le numéro ADELI de l'inscription atteint enfin le profil ────────────────
-- La reprise ci-dessus ne couvre que les comptes existants. Le trigger
-- n'insérait que `id` et `full_name`, alors que l'inscription
-- (app/login/actions.ts) dépose aussi `adeli_rpps` dans les métadonnées : une
-- IDEL qui s'inscrit demain retrouverait le champ vide dans /compte et vide
-- sur ses feuilles — le défaut même que cette migration corrige pour le passé.
--
-- Reprise fidèle de la définition de `auth_trigger` (20260714000100) : seule
-- l'insertion change. `security definer` est indispensable — le trigger écrit
-- dans public.profiles au nom d'une session qui n'existe pas encore — et
-- `search_path` reste fixé, faute de quoi un schéma en avant-plan pourrait
-- détourner la table visée.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, adeli_rpps)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    -- `nullif` : l'inscription dépose une chaîne vide quand le champ n'est pas
    -- rempli, et une chaîne vide s'imprimerait comme un numéro absent tout en
    -- bloquant la reprise ci-dessus, qui ne rattrape que les `null`.
    nullif(new.raw_user_meta_data->>'adeli_rpps', '')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;
