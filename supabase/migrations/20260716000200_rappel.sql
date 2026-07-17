-- Rappel (texte) laissé par l'IDEL pour la prochaine visite du patient.
alter table public.missions_du_jour
  add column rappel text;
