-- Dépublie tout le contenu clinique non relu qui avait été inséré avec
-- published = true malgré niveau_confiance = 'brouillon' (migrations
-- 20260725000000, 20260725010000, 20260725020000). Corrige un écart avec
-- la règle établie : rien de non validé ne doit être visible des IDEL
-- ni servi à Ely. Les lignes valide/relu ne sont pas affectées.
update public.situations_terrain
  set published = false
  where niveau_confiance = 'brouillon' and published = true;

update public.fiches_dossier_soins
  set published = false
  where niveau_confiance = 'brouillon' and published = true;
