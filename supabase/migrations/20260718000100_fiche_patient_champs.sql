-- Numéro de sécurité sociale et note rapide sur le soin principal.
alter table public.patients
  add column numero_secu text,
  add column note_soin text;

-- "Contact d'urgence" devient "Personne de confiance" (terminologie
-- administrative correcte, distincte d'un simple numéro à appeler en cas
-- d'urgence).
alter table public.patients
  rename column contact_urgence_nom to personne_confiance_nom;

alter table public.patients
  rename column contact_urgence_telephone to personne_confiance_telephone;
