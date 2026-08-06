-- Matériel du jour : correspondance code NGAP -> article de matériel, et
-- état de validation quotidien (préparation le matin, vérification le
-- soir) de la tournée.
--
-- Contenu de niveau_confiance 'brouillon' : composé à partir du catalogue
-- NGAP existant, faute de source de référence fournie à la conception —
-- à relire et corriger par la fondatrice, infirmière de métier.

create table public.materiel_ngap (
  id uuid primary key default gen_random_uuid(),
  ngap_code_id uuid not null references public.ngap_codes(id) on delete cascade,
  libelle text not null,
  quantite integer not null default 1,
  niveau_confiance text not null default 'brouillon'
    check (niveau_confiance in ('brouillon', 'relu', 'valide')),
  published boolean not null default false
);

comment on table public.materiel_ngap is
  'Matériel infirmier nécessaire par occurrence d''un acte NGAP, pour la liste "Matériel du jour" de /ma-journee. Contenu brouillon, à valider par la fondatrice.';

create index materiel_ngap_ngap_code_id_idx on public.materiel_ngap (ngap_code_id);

alter table public.materiel_ngap enable row level security;

-- Nomenclature publique, comme le catalogue ngap_codes : ne porte aucune
-- donnée de patient.
create policy "materiel_ngap_select_published" on public.materiel_ngap
  for select using (published = true and auth.role() = 'authenticated');

-- ── Correspondance initiale ──────────────────────────────────────────────
-- AMI 1 — Injection sous-cutanée ou intramusculaire
insert into public.materiel_ngap (ngap_code_id, libelle, quantite, published)
select id, 'Seringue', 1, true from public.ngap_codes where code = 'AMI 1'
union all
select id, 'Aiguille', 1, true from public.ngap_codes where code = 'AMI 1'
union all
select id, 'Compresse antiseptique', 1, true from public.ngap_codes where code = 'AMI 1'
union all
select id, 'Container DASRI', 1, true from public.ngap_codes where code = 'AMI 1'
-- AMI 2 — Pansement simple
union all
select id, 'Compresses stériles', 4, true from public.ngap_codes where code = 'AMI 2'
union all
select id, 'Sérum physiologique', 1, true from public.ngap_codes where code = 'AMI 2'
union all
select id, 'Pansement adhésif', 1, true from public.ngap_codes where code = 'AMI 2'
union all
select id, 'Gants à usage unique', 1, true from public.ngap_codes where code = 'AMI 2'
-- AMI 4 — Pansement lourd et complexe
union all
select id, 'Compresses stériles', 6, true from public.ngap_codes where code = 'AMI 4'
union all
select id, 'Sérum physiologique', 1, true from public.ngap_codes where code = 'AMI 4'
union all
select id, 'Pansement absorbant', 1, true from public.ngap_codes where code = 'AMI 4'
union all
select id, 'Gants à usage unique', 1, true from public.ngap_codes where code = 'AMI 4'
union all
select id, 'Set de détersion', 1, true from public.ngap_codes where code = 'AMI 4'
-- AMI 9 — Pose de perfusion courte
union all
select id, 'Nécessaire à perfusion', 1, true from public.ngap_codes where code = 'AMI 9'
union all
select id, 'Cathéter court', 1, true from public.ngap_codes where code = 'AMI 9'
union all
select id, 'Pansement transparent', 1, true from public.ngap_codes where code = 'AMI 9'
union all
select id, 'Garrot', 1, true from public.ngap_codes where code = 'AMI 9'
-- AMI 14 — Pose de perfusion longue
union all
select id, 'Nécessaire à perfusion', 1, true from public.ngap_codes where code = 'AMI 14'
union all
select id, 'Cathéter', 1, true from public.ngap_codes where code = 'AMI 14'
union all
select id, 'Pansement transparent', 1, true from public.ngap_codes where code = 'AMI 14'
union all
select id, 'Garrot', 1, true from public.ngap_codes where code = 'AMI 14'
union all
select id, 'Potence ou support', 1, true from public.ngap_codes where code = 'AMI 14'
-- AIS 3 — Actes infirmiers de soins (toilette, habillage)
union all
select id, 'Gants à usage unique', 1, true from public.ngap_codes where code = 'AIS 3'
union all
select id, 'Gant de toilette', 1, true from public.ngap_codes where code = 'AIS 3'
union all
select id, 'Produit de toilette', 1, true from public.ngap_codes where code = 'AIS 3';

-- ── État de validation quotidien de la tournée ───────────────────────────
alter table public.tournees
  add column if not exists materiel_prepare boolean not null default false,
  add column if not exists materiel_verifie boolean not null default false;

comment on column public.tournees.materiel_prepare is
  'Vrai si l''IDEL a confirmé avoir préparé le matériel du jour. Repart à faux à chaque nouvelle tournée (une ligne par jour).';

comment on column public.tournees.materiel_verifie is
  'Vrai si l''IDEL a confirmé avoir vérifié le matériel en fin de journée. Indépendant de materiel_prepare.';
