-- Sexe du patient, dérivable du numéro de sécurité sociale (1er chiffre du NIR).
alter table public.patients
  add column sexe text check (sexe in ('homme', 'femme'));
