-- Indemnités kilométriques.
--
-- La NGAP les compte depuis le domicile professionnel, aller et retour, sous
-- déduction d'un abattement. Trois informations manquaient : l'adresse du
-- cabinet, la position des patients, et la distance de chaque passage.
--
-- Les distances sont stockées et non recalculées à l'affichage : chaque
-- ouverture de la tournée déclencherait sinon une vingtaine d'appels réseau,
-- pour un résultat qui ne change pas.

-- ── Adresse du cabinet ──────────────────────────────────────────────────────
-- Point de départ des trajets. Ses coordonnées sont géocodées une fois, à la
-- saisie, et conservées : l'adresse d'un cabinet ne bouge pas.
alter table public.profiles
  add column if not exists adresse_cabinet text,
  add column if not exists cabinet_latitude double precision,
  add column if not exists cabinet_longitude double precision;

comment on column public.profiles.adresse_cabinet is
  'Adresse du domicile professionnel. Origine des trajets pour les indemnités kilométriques.';

-- ── Position des patients ───────────────────────────────────────────────────
-- Géocodées à la création ou à la modification de la fiche. Les conserver
-- évite de renvoyer l'adresse à chaque calcul de tournée.
alter table public.patients
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

comment on column public.patients.latitude is
  'Position géocodée du domicile, pour le calcul des distances. Nulle tant que l''adresse n''a pas pu être située.';

-- ── Distance d'un passage ───────────────────────────────────────────────────
-- Deux colonnes plutôt qu'une : la distance calculée reste visible même après
-- correction, et une correction survit à un recalcul de la tournée.
alter table public.missions_du_jour
  add column if not exists distance_km numeric(6,2),
  add column if not exists distance_km_corrigee numeric(6,2);

comment on column public.missions_du_jour.distance_km is
  'Distance routière depuis le cabinet, en kilomètres, aller simple. Calculée à la génération de la tournée.';

comment on column public.missions_du_jour.distance_km_corrigee is
  'Distance saisie à la main, qui prime sur la distance calculée. La NGAP demande la distance réellement parcourue.';

-- ── Tarifs kilométriques ────────────────────────────────────────────────────
-- IK à pied et à ski est la seule dont le montant diffère outre-mer.
insert into public.ngap_lettres_cles (lettre_cle, libelle, valeur_metropole, valeur_dom) values
  ('IK',   'Indemnité kilométrique en plaine',        0.35, 0.35),
  ('IKM',  'Indemnité kilométrique en montagne',      0.50, 0.50),
  ('IKP',  'Indemnité kilométrique à pied ou à ski',  3.40, 3.66)
on conflict (lettre_cle) do update set
  libelle          = excluded.libelle,
  valeur_metropole = excluded.valeur_metropole,
  valeur_dom       = excluded.valeur_dom;
