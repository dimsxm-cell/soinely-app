-- Droit de modifier les colonnes du cabinet.
--
-- `security_fixes` limitait volontairement l'écriture de profiles à la seule
-- colonne full_name : sans cette restriction, une utilisatrice pourrait
-- modifier son propre `role` et s'octroyer les droits d'administration.
--
-- Les colonnes ajoutées depuis — code postal et adresse du cabinet — n'ont
-- jamais été couvertes par ce droit. La politique de sécurité autorisait
-- l'écriture, le privilège la refusait : « permission denied for table
-- profiles », sans que rien ne désigne la colonne fautive.
--
-- La liste reste explicite plutôt que d'accorder la table entière : `role` et
-- `id` doivent continuer d'échapper à l'utilisatrice.
grant update (
  full_name,
  code_postal,
  adresse_cabinet,
  cabinet_latitude,
  cabinet_longitude
) on public.profiles to authenticated;
