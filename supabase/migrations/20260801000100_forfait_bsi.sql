-- Forfait de dépendance (BSI) et actes dérogatoires.
--
-- Chez un patient pris en charge sous forfait journalier, un acte technique ne
-- se cote plus en AMI mais en AMX, à 50 % de son coefficient. Continuer à le
-- coter en AMI est la première source d'erreur relevée chez les IDEL — et
-- l'inverse est vrai : appliquer le 50 % à un acte qui fait partie des
-- dérogations revient à se sous-facturer.
--
-- Deux informations manquaient pour trancher : quels patients sont sous
-- forfait, et quels actes y échappent.

-- ── Forfait journalier du patient ───────────────────────────────────────────
-- Nul par défaut : la très grande majorité des patients n'est pas sous BSI, et
-- l'absence de forfait laisse la cotation en AMI, telle qu'elle est
-- aujourd'hui.
alter table public.patients
  add column if not exists forfait_bsi text
  check (forfait_bsi is null or forfait_bsi in ('BSA', 'BSB', 'BSC'));

comment on column public.patients.forfait_bsi is
  'Forfait journalier de dépendance issu du BSI. Bascule les actes techniques du patient en AMX à 50 % du coefficient, hors actes dérogatoires.';

-- ── Actes échappant à la bascule AMX ────────────────────────────────────────
-- Article A12 du titre XVI : ces actes restent facturables à taux plein en sus
-- du forfait.
alter table public.ngap_codes
  add column if not exists derogatoire_bsi boolean not null default false;

comment on column public.ngap_codes.derogatoire_bsi is
  'Acte facturable à taux plein en sus d''un forfait de dépendance (article A12 du titre XVI) : pansements lourds et complexes, perfusions, ponction veineuse, surveillance de l''article 5 ter.';

update public.ngap_codes
   set derogatoire_bsi = true
 where code in (
   'AMI 4',   -- Pansement lourd et complexe avec détersion
   'AMI 9',   -- Perfusion courte
   'AMI 14'   -- Perfusion longue
 );
