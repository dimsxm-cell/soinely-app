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
  ),
  (
    'Chute à domicile sans traumatisme apparent',
    'Le patient a chuté à son domicile ; il ne rapporte pas de douleur ni de plaie visible mais reste inquiet.',
    '["Interroger sur les circonstances de la chute (malaise, trébuchement)", "Rechercher une douleur, une déformation ou un hématome", "Vérifier la prise récente de médicaments hypotenseurs ou sédatifs"]',
    '["Trouble de l''équilibre ou de la marche", "Hypotension orthostatique", "Environnement à risque (tapis, éclairage)"]',
    '["Ne pas relever le patient en urgence si douleur ou suspicion de fracture", "Surveiller les constantes si disponible", "Noter la chute et les circonstances dans le dossier de soins"]',
    'Si douleur, déformation, perte de connaissance ou confusion post-chute, ou chutes à répétition.',
    '["HAS - Prévention des chutes chez la personne âgée"]',
    'valide',
    true
  ),
  (
    'Fièvre chez un patient âgé',
    'Le patient présente une température supérieure à 38°C sans point d''appel évident.',
    '["Mesurer la température avec un thermomètre fiable", "Rechercher des signes associés (toux, brûlures urinaires, rougeur cutanée)", "Vérifier l''hydratation et l''état général"]',
    '["Infection urinaire", "Infection respiratoire", "Effet secondaire d''un traitement récent"]',
    '["Favoriser l''hydratation", "Surveiller l''évolution de la température", "Noter la température et les signes associés dans le dossier"]',
    'Si fièvre supérieure à 38,5°C persistante, confusion, ou altération de l''état général.',
    '["HAS - Prise en charge de la fièvre chez la personne âgée"]',
    'valide',
    true
  ),
  (
    'Constipation chez un patient alité',
    'Le patient n''a pas eu de selles depuis plus de 3 jours et signale une gêne abdominale.',
    '["Interroger sur la fréquence habituelle du transit", "Rechercher une douleur ou un ballonnement abdominal", "Vérifier l''hydratation et les traitements en cours (opioïdes, fer)"]',
    '["Alitement prolongé", "Traitement constipant (opioïdes, certains antalgiques)", "Hydratation insuffisante"]',
    '["Favoriser l''hydratation et, si possible, la mobilisation", "Signaler au médecin traitant pour envisager un traitement laxatif", "Noter la date des dernières selles dans le dossier"]',
    'Si douleur abdominale intense, vomissements, ou absence de selles depuis plus de 5 jours.',
    '["HAS - Prise en charge de la constipation chez la personne âgée"]',
    'valide',
    true
  ),
  (
    'Douleur thoracique',
    'Le patient signale une douleur thoracique apparue brutalement.',
    '["Évaluer la localisation, l''intensité et l''irradiation de la douleur", "Rechercher une dyspnée, des sueurs ou des nausées associées", "Prendre le pouls et la tension artérielle si disponible"]',
    '["Origine cardiaque (à ne jamais exclure en premier)", "Origine musculo-squelettique", "Anxiété ou crise d''angoisse"]',
    '["Installer le patient en position semi-assise, au repos", "Ne jamais laisser le patient seul", "Appeler le 15 sans délai en cas de doute"]',
    'Systématiquement et en urgence — toute douleur thoracique brutale doit être considérée comme potentiellement grave jusqu''à preuve du contraire.',
    '["HAS - Douleur thoracique aiguë"]',
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
