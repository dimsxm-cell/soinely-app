-- Zone tarifaire : les tarifs NGAP ne sont pas les mêmes en métropole et dans
-- les DOM. Une IDEL de Guadeloupe facture l'AMI 3,30 € là où la métropole le
-- facture 3,15 € — près de 5 % d'écart, invisible et permanent.
--
-- Deux changements pour y répondre :
--   1. le tarif se calcule désormais valeur de lettre-clé × coefficient, au
--      lieu d'être figé au centime près dans ngap_codes.cotation ;
--   2. la valeur de la lettre-clé dépend de la zone, déduite du code postal
--      du cabinet.
--
-- Tarifs au 2026-08-01, source : NGAP IDEL 2026. Une revalorisation ne touche
-- plus qu'à cette table, jamais aux codes eux-mêmes.

-- ── Code postal du cabinet ──────────────────────────────────────────────────
-- Nullable : les profils existants n'en ont pas. Sans lui, la métropole
-- s'applique par défaut, ce qui est le cas de la très grande majorité.
alter table public.profiles
  add column if not exists code_postal text;

comment on column public.profiles.code_postal is
  'Code postal du cabinet. Détermine la zone tarifaire NGAP (métropole ou DOM).';

-- ── Valeur des lettres-clés par zone ────────────────────────────────────────
create table if not exists public.ngap_lettres_cles (
  lettre_cle text primary key,
  libelle text not null,
  valeur_metropole numeric(6,2) not null,
  valeur_dom numeric(6,2) not null
);

alter table public.ngap_lettres_cles enable row level security;

-- Même politique que le catalogue des codes : la nomenclature est publique,
-- elle ne porte aucune donnée de patient.
drop policy if exists "ngap_lettres_cles_select_all" on public.ngap_lettres_cles;
create policy "ngap_lettres_cles_select_all" on public.ngap_lettres_cles
  for select using (true);

insert into public.ngap_lettres_cles (lettre_cle, libelle, valeur_metropole, valeur_dom) values
  ('AMI', 'Acte technique infirmier, hors dépendance',                  3.15,  3.30),
  ('AMX', 'Acte technique en sus d''un forfait de dépendance (BSI)',    3.15,  3.30),
  ('AIS', 'Acte infirmier de soins (confort, hygiène)',                 2.65,  2.70),
  ('BSA', 'Forfait journalier de dépendance légère',                   13.00, 13.25),
  ('BSB', 'Forfait journalier de dépendance intermédiaire',            18.20, 18.55),
  ('BSC', 'Forfait journalier de dépendance lourde',                   28.70, 29.25),
  ('DI',  'Démarche de soins infirmiers (bilan de soins)',             10.00, 10.00),
  ('TLS', 'Accompagnement téléconsultation, soin déjà prévu',          10.00, 10.00),
  ('TLL', 'Accompagnement téléconsultation en lieu dédié',             12.00, 12.00),
  ('TLD', 'Accompagnement téléconsultation à domicile',                15.00, 15.00),
  ('TMI', 'Acte réalisé à distance',                                    3.15,  3.30)
on conflict (lettre_cle) do update set
  libelle          = excluded.libelle,
  valeur_metropole = excluded.valeur_metropole,
  valeur_dom       = excluded.valeur_dom;

-- ── Codes manquants au catalogue ────────────────────────────────────────────
-- La colonne cotation reste renseignée en tarif métropole : elle sert de
-- repli si la lettre-clé d'un code venait à manquer de la table ci-dessus.
insert into public.ngap_codes (code, libelle, cotation, conditions, lettre_cle, coefficient) values
  ('BSC',     'Forfait journalier prise en charge lourde',       28.70, 'Patient dépendant ayant une charge en soins lourde, sur BSI validé', 'BSC', null),
  ('TLL',     'Accompagnement téléconsultation (lieu dédié)',    12.00, 'Réalisé hors domicile, dans un lieu dédié à la téléconsultation',    'TLL', null),
  ('DI 2,5',  'Bilan de soins infirmiers initial',               25.00, 'Première évaluation du patient, sur prescription',                   'DI',  2.5),
  ('DI 1,2',  'Bilan de soins infirmiers de renouvellement',     12.00, 'Renouvellement annuel ou bilan intermédiaire, deux maximum par an',  'DI',  1.2)
on conflict (code) do update set
  libelle     = excluded.libelle,
  cotation    = excluded.cotation,
  conditions  = excluded.conditions,
  lettre_cle  = excluded.lettre_cle,
  coefficient = excluded.coefficient;
