-- Catalogue fourni par la fondatrice le 2026-07-30, source albus.fr.
-- Ces valeurs sont datées : une revalorisation NGAP doit repartir de cette date.
insert into public.ngap_codes (code, libelle, cotation, conditions, lettre_cle, coefficient) values
  ('AMI 1',  'Injection sous-cutanée ou intramusculaire',        3.15,  'Sur prescription médicale',                                          'AMI', 1),
  ('AMI 2',  'Pansement simple',                                 6.30,  'Soin technique courant sur plaie simple',                             'AMI', 2),
  ('AMI 4',  'Pansement lourd et complexe',                     12.60,  'Plaie nécessitant des conditions d''asepsie rigoureuses',             'AMI', 4),
  ('AMI 9',  'Pose de perfusion courte (≤ 1h)',                 28.35,  'Perfusion intraveineuse sur une durée inférieure ou égale à 1 heure', 'AMI', 9),
  ('AMI 14', 'Pose de perfusion longue (> 1h)',                 44.10,  'Perfusion nécessitant une surveillance continue de plus d''une heure', 'AMI', 14),
  ('AIS 3',  'Actes infirmiers de soins (ex. toilette, habillage)', 7.95, 'Pour un patient dépendant (selon critères transitoires / spécifiques)', 'AIS', 3),
  ('BSA',    'Forfait journalier prise en charge légère',       13.00,  'Patient dépendant ayant une charge en soins légère',                  'BSA', null),
  ('BSB',    'Forfait journalier prise en charge intermédiaire', 18.20, 'Patient dépendant ayant une charge en soins intermédiaire',           'BSB', null),
  ('TLS',    'Accompagnement téléconsultation (soin prévu)',    10.00,  'Cumulable avec un autre soin réalisé lors de la même séance',         'TLS', null),
  ('TLD',    'Accompagnement téléconsultation (à domicile)',    15.00,  'Réalisé à domicile sans autre soin, majorations de déplacement possibles', 'TLD', null)
on conflict (code) do update set
  libelle     = excluded.libelle,
  cotation    = excluded.cotation,
  conditions  = excluded.conditions,
  lettre_cle  = excluded.lettre_cle,
  coefficient = excluded.coefficient;
