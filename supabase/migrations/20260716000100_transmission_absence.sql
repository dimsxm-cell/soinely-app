-- Transmission (texte) par visite.
alter table public.missions_du_jour
  add column transmission text;

-- Nouvelle branche de statut : "absent", accessible depuis a_faire.
alter table public.missions_du_jour
  drop constraint missions_du_jour_statut_check,
  add constraint missions_du_jour_statut_check
    check (statut in ('a_faire','en_cours','terminee','absent'));

-- Date de naissance, pour l'âge affiché sur la fiche patient.
alter table public.patients
  add column date_naissance date;
