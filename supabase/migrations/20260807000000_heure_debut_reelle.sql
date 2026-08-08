-- Heure réelle de début d'un soin, capturée au moment où le statut passe
-- à « en cours ». Sert à calculer un retard par rapport à heure_prevue,
-- figé au démarrage plutôt que recalculé en continu pendant le soin.
alter table public.missions_du_jour
  add column if not exists heure_debut_reelle timestamptz;
