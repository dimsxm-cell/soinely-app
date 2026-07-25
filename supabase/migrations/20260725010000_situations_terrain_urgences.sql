-- Les 8 fiches "conduite à tenir" insérées par erreur dans fiches_dossier_soins
-- (migration précédente) sont retirées : ce contenu est une situation clinique
-- ("problème" + conduite à tenir), donc il doit vivre dans situations_terrain,
-- au même titre que les situations déjà présentes (hypoglycémie, chute, douleur
-- thoracique...), pas dans le Dossier de soins.
delete from public.fiches_dossier_soins
where section in ('protocoles_urgence', 'surveillance_clinique')
  and titre in (
    'Protocoles d''urgence — gestes de premiers secours',
    'Conduite à tenir en cas d''hypoglycémie ou d''hyperglycémie',
    'Conduite à tenir en cas d''hypotension ou d''hypertension',
    'Conduite à tenir en cas de constipation ou de diarrhée',
    'Conduite à tenir en cas de douleur',
    'Conduite à tenir à domicile — jéjunostomie, gastrostomie ou sonde naso-gastrique',
    'Conduite à tenir en cas de déshydratation',
    'Évaluation du risque d''escarre — score de Braden'
  );

-- Même contenu, redécoupé en situations individuelles (une situation = un
-- problème clinique précis) pour correspondre au grain déjà utilisé par
-- situations_terrain. Sources : dossier de soins infirmiers du Cabinet
-- Vaïtilingon (IDEL), niveau de confiance "brouillon" en attente de relecture.
insert into public.situations_terrain
  (titre, observation, verifications, causes_possibles, conduite_a_tenir, quand_avis_medical, sources, niveau_confiance, published)
values
  (
    'Arrêt cardio-respiratoire',
    'Le patient est inconscient, ne réagit pas et ne respire pas normalement.',
    '["Vérifier l''absence de réponse et de respiration normale", "Appeler à l''aide et demander le matériel d''urgence disponible"]',
    '["Arrêt cardiaque", "Arrêt respiratoire", "Étouffement"]',
    '["Alerter immédiatement le 15", "Débuter le massage cardiaque", "Utiliser un défibrillateur si disponible", "Suivre le protocole du chariot d''urgence jusqu''à l''arrivée des secours"]',
    'Systématiquement et en urgence absolue — appeler le 15 sans délai.',
    '["Cabinet infirmier Vaïtilingon — protocoles d''urgence"]',
    'brouillon',
    true
  ),
  (
    'Détresse respiratoire aiguë',
    'Le patient présente une gêne respiratoire importante, un essoufflement ou une respiration rapide et difficile.',
    '["Évaluer la fréquence respiratoire et la coloration (lèvres, extrémités)", "Rechercher une cause déclenchante (crise d''asthme, encombrement, anxiété)"]',
    '["Décompensation respiratoire chronique", "Crise d''asthme", "Encombrement bronchique", "Œdème aigu du poumon"]',
    '["Installer le patient en position demi-assise", "Administrer l''oxygène si prescrit", "Surveillance rapprochée et alerter le médecin"]',
    'Si la gêne respiratoire s''aggrave, si la coloration devient bleutée (cyanose), ou en l''absence d''amélioration rapide — appeler le 15.',
    '["Cabinet infirmier Vaïtilingon — protocoles d''urgence"]',
    'brouillon',
    true
  ),
  (
    'Choc ou hypotension sévère',
    'Le patient est pâle, avec un pouls rapide et faible, et présente des signes de malaise général.',
    '["Prendre la tension artérielle et le pouls", "Rechercher une cause (hémorragie, déshydratation, infection)"]',
    '["Hémorragie", "Déshydratation sévère", "Infection sévère (choc septique)", "Réaction allergique"]',
    '["Allonger le patient et surélever les jambes", "Surveiller la conscience, la respiration et le pouls", "Rechercher et traiter la cause si possible", "Alerter le médecin sans délai"]',
    'Immédiatement — en cas de trouble de la conscience, de pouls très rapide ou très faible, ou de suspicion de choc, appeler le 15.',
    '["Cabinet infirmier Vaïtilingon — protocoles d''urgence"]',
    'brouillon',
    true
  ),
  (
    'Convulsions',
    'Le patient présente des mouvements involontaires et saccadés, avec ou sans perte de connaissance.',
    '["Noter l''heure de début et la durée des convulsions", "Observer le déroulement (membres concernés, perte de connaissance)"]',
    '["Épilepsie connue", "Hypoglycémie", "Fièvre élevée (chez l''enfant)", "Sevrage ou intoxication"]',
    '["Sécuriser l''environnement du patient (écarter les objets dangereux)", "Protéger les voies aériennes, ne rien mettre dans la bouche", "Ne pas contenir les mouvements", "Alerter le 15"]',
    'Systématiquement — appeler le 15, en particulier si les convulsions durent plus de quelques minutes ou se répètent.',
    '["Cabinet infirmier Vaïtilingon — protocoles d''urgence"]',
    'brouillon',
    true
  ),
  (
    'Hyperglycémie chez un patient diabétique',
    'Le patient présente une soif importante, une bouche sèche, des urines fréquentes et une fatigue inhabituelle ; la glycémie capillaire est supérieure à 2,50 g/L.',
    '["Contrôler la glycémie capillaire", "Vérifier si un protocole d''insuline est prescrit", "Rechercher une cause (oubli d''insuline, infection, fièvre, erreur alimentaire)"]',
    '["Oubli ou sous-dosage d''insuline", "Infection ou fièvre", "Erreur alimentaire", "Corticothérapie"]',
    '["Faire boire régulièrement de l''eau, sauf contre-indication", "Suivre le protocole d''insuline si prescrit", "Contrôler la température", "Surveiller l''état clinique et recontrôler la glycémie"]',
    'Appeler le médecin si la glycémie reste persistante au-dessus de 3 g/L, en cas de vomissements ou d''altération de l''état général ; appeler le 15 en cas de perte de connaissance, convulsions, coma ou difficulté respiratoire importante.',
    '["Cabinet infirmier Vaïtilingon — fiche pratique urgence diabétique"]',
    'brouillon',
    true
  ),
  (
    'Hypotension artérielle',
    'Le patient signale des étourdissements, une faiblesse ou une sensation de tête qui tourne, sans signe de choc franc.',
    '["Prendre la tension artérielle et le pouls", "Rechercher une cause (déshydratation, changement de position brutal, traitement récent)"]',
    '["Hypotension orthostatique", "Déshydratation", "Effet secondaire d''un traitement (antihypertenseur)"]',
    '["Allonger le patient, jambes surélevées", "Surveiller la conscience, la respiration et le pouls", "Rechercher et traiter la cause"]',
    'Si pas d''amélioration rapide, trouble de la conscience, ou pouls très rapide ou très faible.',
    '["Cabinet infirmier Vaïtilingon — fiche pratique urgence"]',
    'brouillon',
    true
  ),
  (
    'Hypertension artérielle sévère',
    'Le patient présente des céphalées intenses, des vertiges ou des troubles visuels, avec une tension artérielle élevée (≥ 180/110 mmHg).',
    '["Prendre la tension artérielle", "Rechercher une cause (stress, douleur, oubli de traitement)"]',
    '["Oubli du traitement antihypertenseur", "Stress ou douleur aiguë", "Poussée hypertensive"]',
    '["Installer le patient en position assise, au repos", "Surveiller la tension artérielle", "Rechercher et traiter la cause"]',
    'Si la tension reste ≥ 180/110 mmHg de façon persistante, en cas de douleur thoracique, troubles neurologiques ou essoufflement important — appeler le médecin ou le 15.',
    '["Cabinet infirmier Vaïtilingon — fiche pratique urgence"]',
    'brouillon',
    true
  ),
  (
    'Diarrhée aiguë',
    'Le patient présente des selles liquides ou molles à répétition (3 fois par jour ou plus), avec parfois des douleurs abdominales.',
    '["Évaluer la fréquence et l''aspect des selles", "Rechercher fièvre, douleurs, signes de déshydratation"]',
    '["Infection digestive", "Effet secondaire d''un traitement (antibiotique)", "Intolérance alimentaire"]',
    '["Encourager la prise régulière de boissons (eau, solution de réhydratation orale)", "Adapter l''alimentation (repas légers, pauvres en fibres)", "Surveiller température, diurèse et état général"]',
    'Si diarrhée de plus de 48 heures, fièvre supérieure à 38,5°C, sang dans les selles ou signes de déshydratation.',
    '["Cabinet infirmier Vaïtilingon — fiche pratique, selon les recommandations HAS"]',
    'brouillon',
    true
  ),
  (
    'Douleur non soulagée par le traitement habituel',
    'Le patient signale une douleur persistante malgré la prise de son traitement antalgique habituel.',
    '["Évaluer la localisation, l''intensité (échelle de 0 à 10) et le type de douleur", "Vérifier la bonne prise du traitement antalgique prescrit"]',
    '["Traitement antalgique sous-dosé", "Aggravation d''une pathologie existante", "Nouvelle cause de douleur"]',
    '["Rechercher la cause de la douleur", "Appliquer les moyens antalgiques prescrits", "Mettre en place des mesures non médicamenteuses si possible", "Réévaluer la douleur après 30 à 60 minutes et tracer l''évolution"]',
    'Si la douleur est brutale et intense, accompagnée de fièvre ou de malaise, ou si elle ne cède pas au traitement — prévenir le médecin.',
    '["Cabinet infirmier Vaïtilingon — fiche pratique"]',
    'brouillon',
    true
  ),
  (
    'Sonde d''alimentation déplacée, obstruée ou site infecté',
    'Le patient porteur d''une sonde d''alimentation (jéjunostomie, gastrostomie ou sonde naso-gastrique) présente une anomalie au niveau de la sonde ou du point d''insertion.',
    '["Vérifier la fixation et la mobilité de la sonde", "Observer le point de sortie (rougeur, écoulement, douleur)", "Vérifier la perméabilité de la sonde"]',
    '["Sonde déplacée ou partiellement sortie", "Obstruction de la sonde", "Infection locale au point d''insertion"]',
    '["Ne pas forcer ni réintégrer une sonde déplacée", "Rincer doucement à l''eau tiède en cas de résistance au rinçage, sans forcer", "Protéger et nettoyer le site", "Prévenir le médecin ou l''IDE référent"]',
    'En urgence si fièvre ≥ 38°C, distension abdominale importante, sonde complètement sortie, débit gastrique inhabituel ou difficulté respiratoire.',
    '["Cabinet infirmier Vaïtilingon — fiche de conduite à tenir à domicile"]',
    'brouillon',
    true
  ),
  (
    'Déshydratation chez un patient à domicile',
    'Le patient présente une bouche sèche, des yeux creux, une fatigue inhabituelle et des urines foncées et peu abondantes.',
    '["Rechercher la cause (fièvre, diarrhée, vomissements, apports hydriques insuffisants)", "Évaluer les signes cliniques (pli cutané, urines, état de conscience)"]',
    '["Apports hydriques insuffisants", "Fièvre, diarrhée ou vomissements", "Canicule ou fortes chaleurs", "Prise de diurétiques"]',
    '["Proposer à boire régulièrement par petites quantités", "Surveiller la quantité bue, les urines et la température", "Rechercher et traiter la cause si possible"]',
    'En urgence en cas de troubles de la conscience, hypotension, tachycardie supérieure à 120/min ou absence d''urines depuis plus de 12 heures.',
    '["Cabinet infirmier Vaïtilingon — fiche pratique, selon les recommandations HAS"]',
    'brouillon',
    true
  ),
  (
    'Risque d''escarre élevé repéré à l''évaluation',
    'L''évaluation du risque d''escarre (score de Braden) situe le patient en risque élevé ou très élevé (score ≤ 14 sur 23).',
    '["Évaluer les 6 critères du score de Braden : perception sensorielle, exposition à l''humidité, activité, mobilité, nutrition, frottements/cisaillements", "Calculer le score total sur 23"]',
    '["Alitement prolongé", "Dénutrition", "Incontinence", "Perte de mobilité"]',
    '["Changer la position du patient toutes les 2 heures", "Mettre en place un matelas à air ou un surmatelas adapté", "Renforcer la protection cutanée", "Réévaluer le score au moins une fois par mois ou à chaque changement d''état"]',
    'Si le score reste ≤ 12 malgré les mesures, ou en cas d''apparition de rougeur persistante ou de lésion cutanée.',
    '["Cabinet infirmier Vaïtilingon — évaluation, selon les recommandations HAS"]',
    'brouillon',
    true
  );
