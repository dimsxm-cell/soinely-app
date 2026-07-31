-- Motif facultatif d'une absence, saisi depuis la carte de tournée après avoir
-- marqué la mission absente. Revenir à « À faire » le remet à null : conservé,
-- il décrirait une absence qui n'existe plus.
alter table public.missions_du_jour
  add column motif_absence text;
