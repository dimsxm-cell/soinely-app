-- Publie le contenu clinique rédigé par l'IDEL fondatrice, que la migration
-- 20260808000000 avait dépublié parce qu'il portait encore le niveau
-- « brouillon » (état « en attente de relecture », et non « auteur non
-- qualifié »).
--
-- L'autrice, infirmière libérale, a relu et validé ses propres fiches : elles
-- passent donc en niveau « valide » et redeviennent visibles des IDEL et
-- utilisables par Ely.
--
-- La règle posée en 20260808000000 reste entière : rien de non validé ne doit
-- être visible. Ces lignes ne sont plus « non validées » — c'est leur statut
-- qui change, pas la règle. Toute fiche insérée ultérieurement en
-- « brouillon » restera masquée par défaut.

update public.situations_terrain
  set niveau_confiance = 'valide',
      published = true
  where niveau_confiance = 'brouillon';

update public.fiches_dossier_soins
  set niveau_confiance = 'valide',
      published = true
  where niveau_confiance = 'brouillon';
