-- Une mission est un passage : le détail coté vit dans actes_mission, tandis
-- que missions_du_jour.type_soin reste le libellé de synthèse lu par le
-- dossier patient, le diagramme de soins et les transmissions.
create table public.actes_mission (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions_du_jour(id) on delete cascade,
  libelle text not null,
  ngap_code_id uuid references public.ngap_codes(id),
  ordre int not null default 0
);

create index actes_mission_mission_id_idx on public.actes_mission(mission_id);

alter table public.actes_mission enable row level security;

create policy "actes_mission_owner_all" on public.actes_mission
  for all using (
    auth.uid() = (
      select t.idel_id
      from public.tournees t
      join public.missions_du_jour m on m.tournee_id = t.id
      where m.id = mission_id
    )
  ) with check (
    auth.uid() = (
      select t.idel_id
      from public.tournees t
      join public.missions_du_jour m on m.tournee_id = t.id
      where m.id = mission_id
    )
  );

alter table public.soins_prescrits
  add column ngap_code_id uuid references public.ngap_codes(id);

-- La règle de cumul du lot suivant classe les actes d'une même séance.
-- Ces colonnes sont ajoutées maintenant, pendant qu'on écrit les lignes du
-- catalogue : redécouper la chaîne « AMI 4 » à l'exécution échouerait sur
-- BSA, BSB, TLS et TLD, qui n'ont pas de coefficient.
alter table public.ngap_codes
  add column lettre_cle text,
  add column coefficient numeric(5,2);

-- Reprise de l'historique : un acte par mission existante, sans fusion des
-- passages passés.
insert into public.actes_mission (mission_id, libelle, ordre)
select id, type_soin, 0 from public.missions_du_jour;
