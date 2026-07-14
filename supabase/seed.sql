insert into public.situations_terrain
  (titre, observation, verifications, causes_possibles, conduite_a_tenir, quand_avis_medical, sources, niveau_confiance, published)
values
  (
    'Hypoglycémie chez un patient diabétique',
    'Le patient présente des sueurs, des tremblements et une confusion légère.',
    '["Mesurer la glycémie capillaire", "Vérifier l''état de conscience", "Vérifier la prise du dernier repas et du traitement"]',
    '["Injection d''insuline surdosée", "Repas sauté ou insuffisant", "Effort physique inhabituel"]',
    '["Resucrage oral si conscient (15g de sucre)", "Recontrôler la glycémie 15 min après", "Ne jamais resucrer un patient inconscient par voie orale"]',
    'Si la glycémie reste basse après 2 resucrages ou si le patient perd connaissance.',
    '["HAS - Prise en charge du patient diabétique"]',
    'valide',
    true
  ),
  (
    'Pansement qui saigne de façon inhabituelle',
    'Le pansement est imbibé de sang de façon plus importante que lors des soins précédents.',
    '["Évaluer l''abondance et la couleur du saignement", "Vérifier la prise d''anticoagulants", "Contrôler les constantes si disponible"]',
    '["Traitement anticoagulant récent", "Plaie plus profonde que prévu", "Reprise d''un geste chirurgical"]',
    '["Compression manuelle prolongée", "Pansement compressif propre", "Surveillance rapprochée de l''évolution"]',
    'Si le saignement ne cède pas après compression ou si des signes de choc apparaissent.',
    '["SF2H - Prise en charge des plaies"]',
    'valide',
    true
  );

insert into public.missions_cliniques (titre, situation_terrain_id, etapes, duree_estimee_min, published)
select
  'Prise en charge hypoglycémie',
  id,
  '[{"titre":"Évaluation","description":"Mesurer la glycémie et l''état de conscience"},{"titre":"Resucrage","description":"Administrer 15g de sucre si conscient"},{"titre":"Surveillance","description":"Recontrôler la glycémie 15 minutes après"},{"titre":"Traçabilité","description":"Noter la valeur et l''action dans le dossier"}]',
  20,
  true
from public.situations_terrain where titre = 'Hypoglycémie chez un patient diabétique';

insert into public.ngap_codes (code, libelle, cotation, conditions) values
  ('AMI 4', 'Pansement lourd et complexe', 6.30, 'Sur prescription médicale'),
  ('AMI 1', 'Injection sous-cutanée ou intramusculaire', 3.15, null);
