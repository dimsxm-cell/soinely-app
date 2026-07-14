create extension if not exists "pg_trgm";

alter table public.situations_terrain
  add column search_vector tsvector;

-- Colonne maintenue par trigger (et non "generated always as ... stored") car
-- to_tsvector(regconfig, text) est STABLE, pas IMMUTABLE, et Postgres interdit
-- les expressions non-immutables dans une colonne générée.
create or replace function public.situations_terrain_search_vector_update()
returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('french', coalesce(new.titre, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(new.observation, '')), 'B') ||
    setweight(to_tsvector(
      'french',
      coalesce(new.causes_possibles::text, '') || ' ' || coalesce(new.conduite_a_tenir::text, '')
    ), 'C');
  return new;
end;
$$ language plpgsql set search_path = public;

create trigger situations_terrain_search_vector_trigger
  before insert or update on public.situations_terrain
  for each row execute function public.situations_terrain_search_vector_update();

-- Backfill : le trigger ne s'applique qu'aux futurs insert/update, il faut donc
-- forcer une passe sur les lignes du seed (Tâche 4 du socle) déjà en base.
update public.situations_terrain set updated_at = updated_at;

create index situations_terrain_search_vector_idx
  on public.situations_terrain using gin (search_vector);

create index situations_terrain_trigram_idx
  on public.situations_terrain using gin ((titre || ' ' || observation) gin_trgm_ops);

-- SECURITY INVOKER (par défaut, pas de "security definer") : la fonction
-- s'exécute avec les droits de l'appelant, donc la policy RLS
-- situations_terrain_select_published continue de filtrer chaque ligne renvoyée.
create or replace function public.search_situations_terrain(search_query text)
returns setof public.situations_terrain as $$
begin
  return query
    select s.*
    from public.situations_terrain s
    where s.published = true
      and s.search_vector @@ websearch_to_tsquery('french', search_query)
    order by ts_rank(s.search_vector, websearch_to_tsquery('french', search_query)) desc
    limit 10;

  if not found then
    return query
      select s.*
      from public.situations_terrain s
      where s.published = true
        and similarity(s.titre || ' ' || s.observation, search_query) > 0.2
      order by similarity(s.titre || ' ' || s.observation, search_query) desc
      limit 10;
  end if;
end;
$$ language plpgsql stable set search_path = public;

revoke execute on function public.search_situations_terrain(text) from public;
grant execute on function public.search_situations_terrain(text) to authenticated;
