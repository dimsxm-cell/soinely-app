-- Peuple les 8 sections du Dossier de soins orientées suivi du patient
-- (traitements, surveillance clinique, identification patient, transmissions
-- infirmières, prescriptions et liaisons médicales, administratif, allergies
-- et alertes, contacts utiles), à partir du reste du dossier de soins
-- infirmiers du Cabinet Vaïtilingon (IDEL) — hors conduites à tenir déjà
-- transférées dans situations_terrain. Les mentions propres à ce cabinet
-- (nom, SIRET, adresse) ont été retirées : contenu générique, réutilisable
-- par toute infirmière. Niveau de confiance "brouillon" en attente de relecture.

insert into public.fiches_dossier_soins
  (section, titre, resume, contenu, sources, ordre, niveau_confiance, published)
values
  (
    'traitements',
    'Fiche de traitement — tableau des prescriptions',
    'Modèle de tableau pour consigner les prescriptions en cours : nom, forme, quantité par prise et durée.',
    '[
      {"titre":"À renseigner pour chaque prescription","items":["Nom du médicament et forme (comprimé, gélule, injection...)","Quantité prescrite le matin, le midi, le soir et la nuit","Date de prescription et durée du traitement"]},
      {"titre":"Bon usage","items":["Vérifier la concordance avec l''ordonnance à chaque renouvellement","Signaler tout changement au médecin traitant"]}
    ]',
    '["Cabinet infirmier — modèle de fiche traitement"]',
    1,
    'brouillon',
    true
  ),
  (
    'traitements',
    'Diagramme de traitement — suivi quotidien des prises',
    'Grille mensuelle pour tracer les prises effectuées matin, midi et soir, avec le paraphe de l''infirmière.',
    '[
      {"titre":"Utilisation","items":["Une ligne par jour du mois, une colonne par moment de prise (matin, midi, soir)","L''infirmière signe ou paraphe après chaque prise réalisée"]},
      {"titre":"Objectif","items":["Assurer la traçabilité de l''observance du traitement","Repérer rapidement un oubli ou une rupture de prise"]}
    ]',
    '["Cabinet infirmier — dossier de soins infirmiers"]',
    2,
    'brouillon',
    true
  ),
  (
    'traitements',
    'Types de traitements suivis à domicile',
    'Catégories de traitements couramment pris en charge par l''infirmier à domicile.',
    '[
      {"titre":"Catégories","items":["Traitement habituel (per os)","Insuline","Injections (sous-cutanées, intramusculaires)","Pansements"]}
    ]',
    '["Cabinet infirmier — dossier de soins infirmiers"]',
    3,
    'brouillon',
    true
  ),
  (
    'surveillance_clinique',
    'Paramètres de surveillance clinique courants',
    'Principaux paramètres à surveiller régulièrement chez un patient suivi à domicile.',
    '[
      {"titre":"Paramètres","items":["Glycémie","Tension artérielle","Poids","Température","Saturation en oxygène","Fréquence cardiaque"]}
    ]',
    '["Cabinet infirmier — dossier de soins infirmiers"]',
    1,
    'brouillon',
    true
  ),
  (
    'surveillance_clinique',
    'Suivi de la douleur — échelle EVA quotidienne',
    'Grille de suivi quotidien de la douleur (échelle numérique de 0 à 10), au repos et à l''effort.',
    '[
      {"titre":"Évaluation","items":["Noter la douleur au repos et à l''effort, matin et soir","Utiliser l''échelle numérique de 0 (aucune douleur) à 10 (douleur extrême)"]},
      {"titre":"À consigner","items":["Traitement antalgique donné et dose","Effet obtenu sur 10 (0 = aucun, 10 = soulagement complet)","Observations : évolution, facteurs aggravants ou soulageants"]}
    ]',
    '["Cabinet infirmier — fiche de surveillance quotidienne, selon les recommandations HAS"]',
    2,
    'brouillon',
    true
  ),
  (
    'surveillance_clinique',
    'Surveillance mensuelle des éliminations',
    'Suivi quotidien de l''hydratation, de la diurèse et du transit intestinal sur un mois, selon les recommandations HAS.',
    '[
      {"titre":"Élimination urinaire","items":["Quantité bue et diurèse estimée sur 24h","Aspect des urines : très clair, jaune pâle, jaune foncé, ambré (consulter rapidement si rouge ou rosé)"]},
      {"titre":"Élimination intestinale","items":["Nombre de selles par 24h et consistance selon l''échelle de Bristol (1 à 7)","Douleurs abdominales (EVA/10) et type de transit : normal, constipé ou diarrhée"]}
    ]',
    '["Cabinet infirmier — fiche de surveillance mensuelle, selon les recommandations HAS"]',
    3,
    'brouillon',
    true
  ),
  (
    'surveillance_clinique',
    'Surveillance digestive mensuelle',
    'Suivi mensuel de l''appétit, l''hydratation, la tolérance digestive et le transit, selon les recommandations HAS.',
    '[
      {"titre":"À suivre chaque jour","items":["Appétit et hydratation (quantité bue)","Nausées, vomissements et douleurs abdominales (EVA/10)","Ballonnements et transit intestinal (normal, constipé, diarrhée)"]},
      {"titre":"En cas de stomie ou sonde digestive","items":["Noter toute observation particulière (douleurs, inconfort, résidus)"]}
    ]',
    '["Cabinet infirmier — fiche de surveillance digestive, selon les recommandations HAS"]',
    4,
    'brouillon',
    true
  ),
  (
    'surveillance_clinique',
    'Surveillance hebdomadaire de perfusion',
    'Points à vérifier chaque jour chez un patient porteur d''une perfusion (voie d''abord, traitement, point de ponction, tolérance).',
    '[
      {"titre":"À vérifier chaque jour","items":["Voie d''abord (voie veineuse périphérique ou chambre implantable) et présence d''une PICC line","Point de ponction : reflux sanguin, douleur","Tolérance au traitement, y compris pour les traitements morphiniques"]},
      {"titre":"Traçabilité","items":["Date et heure de pose","Changement d''aiguille","Paraphe de l''infirmière à chaque passage"]}
    ]',
    '["Cabinet infirmier — fiche de surveillance de perfusion hebdomadaire"]',
    5,
    'brouillon',
    true
  ),
  (
    'surveillance_clinique',
    'Suivi hebdomadaire — patient porteur d''une sonde d''alimentation',
    'Surveillance quotidienne d''un patient alimenté par sonde (naso-gastrique, gastrostomie, jéjunostomie) : état général, tolérance, point d''insertion.',
    '[
      {"titre":"Surveillance quotidienne","items":["État général, poids si possible, température","Tolérance digestive : nausées, vomissements, diarrhée ou constipation","État du point d''insertion : sonde perméable, fixation correcte, rougeur, écoulement, douleur"]},
      {"titre":"Signes d''alerte","items":["Fièvre ≥ 38°C","Sonde déplacée, arrachée ou obstruction persistante","Douleur abdominale importante ou détresse respiratoire (fausse route)"]}
    ]',
    '["Cabinet infirmier — fiche de suivi hebdomadaire, patient porteur d''une sonde d''alimentation"]',
    6,
    'brouillon',
    true
  ),
  (
    'surveillance_clinique',
    'Suivi du diabète — glycémies et insuline',
    'Suivi journalier des glycémies (matin, midi, soir) et des injections d''insuline, avec observations en cas d''hypo ou d''hyperglycémie.',
    '[
      {"titre":"À consigner à chaque contrôle","items":["Glycémie (g/L), type d''insuline et dose (UI)","Observations en cas d''hypoglycémie ou d''hyperglycémie"]},
      {"titre":"Repères usuels","items":["Glycémie cible à jeun : 0,80 à 1,10 g/L","Hypoglycémie : 0,50 à 0,70 g/L","Hyperglycémie : supérieure à 1,30 g/L"]}
    ]',
    '["Cabinet infirmier — suivi diabète journalier"]',
    7,
    'brouillon',
    true
  ),
  (
    'surveillance_clinique',
    'Suivi du diabète — hémoglobine glyquée (HbA1c)',
    'Suivi des objectifs glycémiques et du dosage de l''hémoglobine glyquée (HbA1c) dans le temps.',
    '[
      {"titre":"Objectifs à définir avec le médecin","items":["Objectif glycémique à jeun","Objectif glycémique post-prandial","Objectif d''hémoglobine glyquée (HbA1c), généralement inférieur à 7%"]},
      {"titre":"Suivi","items":["Noter la date et le taux à chaque dosage d''HbA1c"]}
    ]',
    '["Cabinet infirmier — suivi du diabète HbA1c"]',
    8,
    'brouillon',
    true
  ),
  (
    'surveillance_clinique',
    'Surveillance de la tension artérielle',
    'Suivi matin et soir de la tension artérielle, du pouls, du poids et de la température, avec repérage des seuils à risque.',
    '[
      {"titre":"À mesurer","items":["Tension systolique et diastolique, matin et soir","Pouls, poids et température si besoin"]},
      {"titre":"Repères usuels","items":["Inférieure à 120/80 mmHg : tension optimale","120-130/80-89 mmHg : normale haute","Supérieure à 140/90 mmHg : hypertension artérielle constatée"]}
    ]',
    '["Cabinet infirmier — surveillance tension artérielle"]',
    9,
    'brouillon',
    true
  ),
  (
    'surveillance_clinique',
    'Contrôle TP — INR',
    'Suivi des dosages de TP (%) et d''INR chez un patient sous anticoagulant, avec le traitement et les constantes associées.',
    '[
      {"titre":"À consigner à chaque bilan","items":["Date du bilan sanguin, TP (%) et INR","Traitement anticoagulant en cours et dose","Toute modification du traitement décidée par le médecin"]}
    ]',
    '["Cabinet infirmier — fiche de contrôle TP-INR"]',
    10,
    'brouillon',
    true
  ),
  (
    'surveillance_clinique',
    'Soins d''hygiène quotidienne — fiche de suivi mensuel',
    'Suivi mensuel de la réalisation des soins d''hygiène (toilette, douche, soins de bouche...) et de l''autonomie du patient.',
    '[
      {"titre":"Soins suivis","items":["Toilette complète ou partielle, douche, bain","Soins de bouche, rasage, hygiène intime, habillage","Hydratation de la peau, soins des ongles"]},
      {"titre":"Évaluation de l''autonomie","items":["Déplacements, lever, transferts, toilette, habillage, alimentation, continence","Cotée : autonome, aide partielle ou dépendant"]}
    ]',
    '["Cabinet infirmier — fiche mensuelle de réalisation et de surveillance"]',
    11,
    'brouillon',
    true
  ),
  (
    'surveillance_clinique',
    'Surveillance clinique hebdomadaire — patient insulino-traité de plus de 75 ans',
    'Séance hebdomadaire de surveillance et de prévention pour un patient diabétique insulino-traité âgé, sur 4 semaines.',
    '[
      {"titre":"État général","items":["Glycémie capillaire, tension artérielle, pouls","Observance du régime, du traitement et préparation du pilulier"]},
      {"titre":"Dépistage des complications","items":["Hypoglycémies, problèmes neurologiques, infectieux ou cutanés","Problèmes aux pieds, à l''hygiène ou de chaussage"]}
    ]',
    '["Cabinet infirmier — séance hebdomadaire de surveillance clinique"]',
    12,
    'brouillon',
    true
  ),
  (
    'surveillance_clinique',
    'Surveillance d''une plaie chronique',
    'Suivi de l''évolution d''une plaie chronique ou d''une escarre : aspect, mesures, douleur et signes d''infection.',
    '[
      {"titre":"À évaluer à chaque pansement","items":["Aspect coloriel de la plaie en % : nécrose, fibrine, bourgeon, cicatrisation, épithélialisation","Surface (cm²) et profondeur (cm)","Douleur (permanente, intermittente ou en cours de soin) sur une échelle de 0 à 10"]},
      {"titre":"Signes d''infection — alerter le médecin","items":["Rougeur, chaleur, œdème","Douleur augmentée, écoulement purulent, odeur, fièvre"]}
    ]',
    '["Cabinet infirmier — surveillance de plaie chronique"]',
    13,
    'brouillon',
    true
  ),
  (
    'identification_patient',
    'Identité du patient et éléments du dossier',
    'Informations d''identité et de prise en charge à réunir à l''ouverture du dossier de soins d''un patient.',
    '[
      {"titre":"Identité du patient","items":["Nom, prénom, date de naissance, adresse, téléphone","Médecin traitant, numéro de sécurité sociale, mutuelle, ALD ou prise en charge"]},
      {"titre":"Suivi médical","items":["Antécédents médicaux et chirurgicaux, allergies et intolérances","Traitements en cours (notamment hypertension, diabète), groupe sanguin"]},
      {"titre":"Entourage","items":["Personne de confiance et lien avec le patient","Contact d''urgence"]}
    ]',
    '["Cabinet infirmier — dossier de soins infirmiers, selon les recommandations HAS"]',
    1,
    'brouillon',
    true
  ),
  (
    'identification_patient',
    'Macrocible d''accueil',
    'Synthèse initiale à l''accueil d''un nouveau patient : autonomie, antécédents, soins et fréquence de passage.',
    '[
      {"titre":"Éléments à recueillir","items":["Âge, antécédents, niveau d''autonomie, appareillage éventuel","Diagnostic médical et soins infirmiers à réaliser","Fréquence des passages et intervention éventuelle d''un kinésithérapeute","Situation familiale et environnement"]}
    ]',
    '["Cabinet infirmier — macrocible accueil"]',
    2,
    'brouillon',
    true
  ),
  (
    'transmissions_infirmieres',
    'Transmissions infirmières — principes',
    'Les transmissions infirmières assurent la continuité de l''information entre professionnels intervenant auprès du même patient.',
    '[
      {"titre":"Contenu attendu","items":["Observations sur l''état du patient","Transmissions ciblées sur un problème précis","Évolution depuis la dernière visite","Relais donné au professionnel suivant"]}
    ]',
    '["Cabinet infirmier — dossier de soins infirmiers"]',
    1,
    'brouillon',
    true
  ),
  (
    'transmissions_infirmieres',
    'Fiche de transmissions ciblées',
    'Modèle pour tracer, à chaque passage, une cible précise (problème identifié) et la transmission associée.',
    '[
      {"titre":"À renseigner","items":["Date du passage","Cible identifiée et transmission correspondante","Nom et prénom de l''intervenant"]}
    ]',
    '["Cabinet infirmier — fiche de transmissions ciblées"]',
    2,
    'brouillon',
    true
  ),
  (
    'prescriptions_liaisons_medicales',
    'Prescriptions et liaisons médicales — principes',
    'Les échanges avec le médecin traitant portent sur les ordonnances, les liaisons médicales et les protocoles de soins.',
    '[
      {"titre":"Domaines couverts","items":["Ordonnances","Liaisons médicales","Protocoles de soins"]}
    ]',
    '["Cabinet infirmier — dossier de soins infirmiers"]',
    1,
    'brouillon',
    true
  ),
  (
    'prescriptions_liaisons_medicales',
    'Fiche de liaison médicale',
    'Modèle pour tracer les échanges avec le médecin traitant concernant un patient : date, contenu, signature.',
    '[
      {"titre":"À renseigner","items":["Identité du patient et du médecin","Date, contenu de la liaison et signature"]}
    ]',
    '["Cabinet infirmier — fiche de liaison médicale"]',
    2,
    'brouillon',
    true
  ),
  (
    'administratif',
    'Éléments administratifs du dossier de soins',
    'Catégories d''informations administratives à conserver dans le dossier de soins d''un patient.',
    '[
      {"titre":"À suivre","items":["Affection de longue durée (ALD)","Mutuelle","Consentements recueillis","Directives anticipées","Documents divers"]}
    ]',
    '["Cabinet infirmier — dossier de soins infirmiers"]',
    1,
    'brouillon',
    true
  ),
  (
    'administratif',
    'Consentement éclairé et personne de confiance',
    'Le patient doit recevoir une information claire avant de consentir aux soins, et peut désigner une personne de confiance, selon les recommandations HAS.',
    '[
      {"titre":"Information à délivrer avant le consentement","items":["Les soins infirmiers réalisés à domicile et les bénéfices attendus","Les risques éventuels et les modalités de surveillance","Le droit de poser des questions et de retirer son consentement à tout moment"]},
      {"titre":"Personne de confiance (article L1111-6 du Code de la santé publique)","items":["Peut être un conjoint, un enfant, un parent, un frère ou une sœur, un ami ou un tuteur","Ses coordonnées sont consignées dans le dossier"]},
      {"titre":"Partage d''informations","items":["Le patient autorise, ou non, le partage d''informations utiles à la continuité des soins entre les professionnels impliqués (médecin, infirmier, pharmacien, kinésithérapeute...)"]}
    ]',
    '["Cabinet infirmier — fiche de consentement éclairé, selon les recommandations HAS"]',
    2,
    'brouillon',
    true
  ),
  (
    'administratif',
    'Fin de prise en charge',
    'Éléments à formaliser à la fin d''une prise en charge infirmière : motif, évaluation, transmission des informations.',
    '[
      {"titre":"Motifs possibles","items":["Objectifs thérapeutiques atteints","Amélioration ou stabilisation de l''état de santé","Hospitalisation, transfert vers un autre professionnel ou décès"]},
      {"titre":"À transmettre","items":["Bilan des soins réalisés et recommandations à poursuivre","Documents remis au patient (ordonnances, compte-rendu, conseils)","Transmission au médecin traitant, à une autre structure ou à l''entourage"]}
    ]',
    '["Cabinet infirmier — fiche de fin de prise en charge, selon les recommandations HAS"]',
    3,
    'brouillon',
    true
  ),
  (
    'administratif',
    'Attestation de renoncement à des soins infirmiers',
    'Un patient (ou son représentant légal) peut renoncer à la poursuite de soins infirmiers après avoir été informé des risques, en dégageant l''infirmier de sa responsabilité pour ce motif.',
    '[
      {"titre":"Éléments de l''attestation","items":["Identité du patient ou de son représentant légal","Reconnaissance d''avoir été informé des risques liés à l''arrêt des soins","Date d''effet de l''interruption et signature"]}
    ]',
    '["Cabinet infirmier — attestation de renoncement de soins infirmiers"]',
    4,
    'brouillon',
    true
  ),
  (
    'allergies_alertes',
    'Allergies et alertes — à consigner dans le dossier',
    'Catégories d''informations à surveiller et signaler pour la sécurité du patient.',
    '[
      {"titre":"À consigner","items":["Allergies connues (médicamenteuses, alimentaires, autres)","Points de vigilance particuliers","Précautions à prendre lors des soins"]}
    ]',
    '["Cabinet infirmier — dossier de soins infirmiers"]',
    1,
    'brouillon',
    true
  ),
  (
    'contacts_utiles',
    'Contacts utiles à avoir sous la main',
    'Catégories de contacts à réunir pour assurer la coordination des soins et réagir rapidement en cas de besoin.',
    '[
      {"titre":"À réunir","items":["Équipe infirmière référente","Médecin référent et secrétariat","Numéros d''urgence : SAMU (15), Pompiers (18), numéro d''urgence européen (112)","Assistante sociale, service de psychologie, diététique si besoin"]}
    ]',
    '["Cabinet infirmier — contacts utiles"]',
    1,
    'brouillon',
    true
  );
