-- Users may update their own profile row (RLS), but only the full_name
-- column — role changes must go through service_role (admin tooling),
-- never the client, to prevent self-escalation via a direct REST PATCH.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

drop policy "situations_terrain_select_published" on public.situations_terrain;
create policy "situations_terrain_select_published" on public.situations_terrain
  for select using (published = true and auth.role() = 'authenticated');

drop policy "missions_cliniques_select_published" on public.missions_cliniques;
create policy "missions_cliniques_select_published" on public.missions_cliniques
  for select using (published = true and auth.role() = 'authenticated');
