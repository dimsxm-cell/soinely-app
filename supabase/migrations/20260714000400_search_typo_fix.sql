-- The trigram fallback in search_situations_terrain (20260714000300) used
-- similarity() on the whole titre+observation text, which dilutes badly
-- against a long document and failed to catch realistic typos (verified
-- live: "hypoglicemie" returned 0 results). word_similarity()/the <%
-- operator measure the best local match instead, which is what "does this
-- short query approximately match part of this document" actually needs.
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
    perform set_config('pg_trgm.word_similarity_threshold', '0.3', true);
    return query
      select s.*
      from public.situations_terrain s
      where s.published = true
        and search_query <% (s.titre || ' ' || s.observation)
      order by word_similarity(search_query, s.titre || ' ' || s.observation) desc
      limit 10;
  end if;
end;
$$ language plpgsql stable set search_path = public;
