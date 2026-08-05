-- Ordre de passage suggéré par la réorganisation manuelle de tournée.
--
-- Distinct de heure_prevue, qui reste l'horaire prescrit du soin et peut
-- porter une contrainte médicale (ex. horaire d'injection) — un algorithme
-- de proximité n'a pas à le modifier.

alter table public.missions_du_jour
  add column if not exists ordre_visite integer;

comment on column public.missions_du_jour.ordre_visite is
  'Ordre de passage suggéré par la réorganisation manuelle. Nul tant qu''aucune réorganisation n''a eu lieu — l''affichage se rabat alors sur heure_prevue. Ne remplace jamais heure_prevue, qui reste l''horaire prescrit du soin.';
