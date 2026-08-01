-- Majorations et indemnité de déplacement.
--
-- « Prise séparément chaque majoration paraît minime, mais cumulée sur une
-- année de tournées, elle représente souvent plusieurs centaines d'euros de
-- manque à gagner. » Elles ne se réclament pas après coup : une majoration
-- oubliée le jour même est perdue.
--
-- Elles rejoignent la table des lettres-clés, dont elles ont exactement la
-- forme : une valeur, éventuellement distincte selon la zone. Aucune ne l'est
-- aujourd'hui, mais rien ne dit qu'aucune ne le sera.

insert into public.ngap_lettres_cles (lettre_cle, libelle, valeur_metropole, valeur_dom) values
  ('MAU', 'Majoration acte unique (AMI 1 ou AMI 1,5 isolé)',       1.35,  1.35),
  ('MCI', 'Majoration de coordination infirmière (soin complexe)', 5.00,  5.00),
  ('MIE', 'Majoration enfant de moins de 7 ans',                   3.15,  3.15),
  ('MN',  'Majoration de nuit (20h-23h et 5h-8h)',                 9.15,  9.15),
  ('MNP', 'Majoration de nuit profonde (23h-5h)',                 18.30, 18.30),
  ('MDF', 'Majoration dimanche et jours fériés',                   8.50,  8.50),
  ('IFD', 'Indemnité forfaitaire de déplacement',                  2.75,  2.75)
on conflict (lettre_cle) do update set
  libelle          = excluded.libelle,
  valeur_metropole = excluded.valeur_metropole,
  valeur_dom       = excluded.valeur_dom;

-- ── Actes ouvrant droit à la majoration de coordination ─────────────────────
-- La MCI rémunère la coordination et la traçabilité sur les soins complexes.
-- Les soins palliatifs y ouvrent droit aussi, mais rien dans le modèle ne
-- permet de les reconnaître : ils resteront à la charge de l'IDEL, qui les
-- ajoutera à la main sur sa feuille de soins.
alter table public.ngap_codes
  add column if not exists eligible_mci boolean not null default false;

comment on column public.ngap_codes.eligible_mci is
  'Acte ouvrant droit à la majoration de coordination infirmière : pansements lourds, perfusions sous surveillance organisée.';

update public.ngap_codes
   set eligible_mci = true
 where code in ('AMI 4', 'AMI 9', 'AMI 14');
