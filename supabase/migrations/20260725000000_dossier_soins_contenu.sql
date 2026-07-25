-- Ajoute la section "informations_professionnelles" (fiches juridiques/déontologiques
-- pour l'infirmier lui-même, distinctes des sections orientées suivi du patient).
alter table public.fiches_dossier_soins
  drop constraint fiches_dossier_soins_section_check;

alter table public.fiches_dossier_soins
  add constraint fiches_dossier_soins_section_check check (section in (
    'identification_patient',
    'traitements',
    'surveillance_clinique',
    'protocoles_urgence',
    'transmissions_infirmieres',
    'prescriptions_liaisons_medicales',
    'administratif',
    'allergies_alertes',
    'contacts_utiles',
    'informations_professionnelles'
  ));

-- Fiches de référence cliniques (conduites à tenir), section protocoles_urgence
-- et surveillance_clinique. Sources : dossier de soins infirmiers du Cabinet
-- Vaïtilingon (IDEL), niveau de confiance "brouillon" en attente de relecture.
insert into public.fiches_dossier_soins
  (section, titre, resume, contenu, sources, ordre, niveau_confiance, published)
values
  (
    'protocoles_urgence',
    'Protocoles d''urgence — gestes de premiers secours',
    'Conduites à tenir immédiates face aux principales situations d''urgence à domicile.',
    '[
      {"titre":"Appel des secours","items":["Composer le 15","Préciser : lieu, situation, état du patient"]},
      {"titre":"Arrêt cardio-respiratoire","items":["Alerter, masser, défibriller","Suivre le protocole du chariot d''urgence"]},
      {"titre":"Détresse respiratoire","items":["Position demi-assise","Oxygène si prescrit","Surveillance rapprochée — alerter le médecin"]},
      {"titre":"Choc / hypotension","items":["Allonger, surélever les jambes","Surveillance des paramètres","Alerter le médecin"]},
      {"titre":"Convulsions","items":["Sécuriser l''environnement","Protéger les voies aériennes","Noter l''heure de début — alerter"]}
    ]',
    '["Cabinet infirmier Vaïtilingon — dossier de soins infirmiers"]',
    1,
    'brouillon',
    true
  ),
  (
    'protocoles_urgence',
    'Conduite à tenir en cas d''hypoglycémie ou d''hyperglycémie',
    'Repérer les signes et réagir face à une hypoglycémie (< 0,70 g/L) ou une hyperglycémie (> 2,50 g/L).',
    '[
      {"titre":"Hypoglycémie — patient conscient","items":["Contrôler immédiatement la glycémie capillaire","Administrer 15 à 20 g de sucre rapide (3 morceaux de sucre, 150-200 ml de jus de fruit, soda sucré ou gel de glucose)","Recontrôler la glycémie après 15 minutes","Si persistance < 0,70 g/L : renouveler 15 g de sucre","Une fois la glycémie > 0,70 g/L : donner une collation si le repas est à plus d''1 heure"]},
      {"titre":"Hypoglycémie — patient inconscient","items":["Ne jamais faire boire","Position latérale de sécurité","Appeler immédiatement le 15 (SAMU)","Administrer le glucagon selon le protocole si disponible et prescrit","Surveiller respiration et conscience jusqu''à l''arrivée des secours"]},
      {"titre":"Hyperglycémie","items":["Contrôler la glycémie","Vérifier si un protocole d''insuline est prescrit","Faire boire régulièrement de l''eau","Rechercher la cause (oubli d''insuline, infection, fièvre, erreur alimentaire)","Surveiller la température et l''état clinique"]},
      {"titre":"Appeler le médecin rapidement si","items":["Glycémie persistante > 3 g/L","Vomissements","Cétones positives","Altération de l''état général"]},
      {"titre":"Appeler le 15 immédiatement si","items":["Perte de connaissance","Convulsions","Coma","Difficulté respiratoire importante","Patient impossible à réveiller"]}
    ]',
    '["Cabinet infirmier Vaïtilingon — fiche pratique urgence diabétique"]',
    2,
    'brouillon',
    true
  ),
  (
    'protocoles_urgence',
    'Conduite à tenir en cas d''hypotension ou d''hypertension',
    'Signes d''alerte et gestes à réaliser face à une tension artérielle anormalement basse ou élevée.',
    '[
      {"titre":"Hypotension — signes d''alerte","items":["Étourdissements, vertiges","Faiblesse, fatigue","Pâleur, peau froide et moite","Pouls rapide et faible"]},
      {"titre":"Hypotension — conduite à tenir","items":["Allonger le patient, jambes surélevées","Surveiller la conscience, la respiration et le pouls","Rechercher et traiter la cause (hémorragie, déshydratation, infection...)","Appeler le médecin rapidement si pas d''amélioration, trouble de la conscience ou suspicion de choc"]},
      {"titre":"Hypertension — signes d''alerte","items":["Céphalées intenses, vertiges, troubles visuels","Douleur thoracique, essoufflement","Nausées, vomissements"]},
      {"titre":"Hypertension — conduite à tenir","items":["Installer le patient en position assise, au repos","Surveiller la tension artérielle","Rechercher et traiter la cause (stress, douleur, oubli de traitement...)","Appeler le médecin rapidement si tension ≥ 180/110 mmHg persistante, douleur thoracique ou troubles neurologiques"]}
    ]',
    '["Cabinet infirmier Vaïtilingon — fiche pratique urgence"]',
    3,
    'brouillon',
    true
  ),
  (
    'protocoles_urgence',
    'Conduite à tenir en cas de constipation ou de diarrhée',
    'Signes à reconnaître, mesures non médicamenteuses et seuils d''alerte pour chacun des deux troubles du transit.',
    '[
      {"titre":"Constipation — signes à reconnaître","items":["Selles rares, dures, sèches (< 3 selles/semaine)","Efforts à la défécation, sensation d''évacuation incomplète","Ballonnements, douleurs abdominales"]},
      {"titre":"Constipation — conduite à tenir","items":["Évaluer fréquence des selles, hydratation, alimentation et traitements en cours","Encourager hydratation, activité physique et alimentation riche en fibres","Alerter le médecin si absence de selles > 3 jours, douleurs importantes, vomissements ou sang dans les selles"]},
      {"titre":"Diarrhée — signes à reconnaître","items":["Selles liquides ou molles ≥ 3 fois/jour","Douleurs abdominales, nausées","Signes de déshydratation possibles"]},
      {"titre":"Diarrhée — conduite à tenir","items":["Encourager la prise régulière de boissons (eau, solution de réhydratation orale)","Adapter l''alimentation (repas légers, pauvres en fibres)","Alerter le médecin si diarrhée > 48 h, fièvre > 38,5°C, sang dans les selles ou signes de déshydratation"]}
    ]',
    '["Cabinet infirmier Vaïtilingon — fiche pratique, selon les recommandations HAS"]',
    4,
    'brouillon',
    true
  ),
  (
    'protocoles_urgence',
    'Conduite à tenir en cas de douleur',
    'Démarche d''évaluation de la douleur (localisation, intensité, type) et étapes de prise en charge et de réévaluation.',
    '[
      {"titre":"Évaluation de la douleur","items":["Faire indiquer au patient la localisation de la douleur","Évaluer l''intensité avec une échelle numérique de 0 (aucune douleur) à 10 (douleur extrême)","Préciser le type (brûlure, piqûre, pression, étirement, crampe)"]},
      {"titre":"Conduite à tenir","items":["Rechercher la cause de la douleur","Évaluer l''intensité et les caractéristiques","Appliquer les moyens antalgiques prescrits","Mettre en place des mesures non médicamenteuses si possible (installation confortable, chaud/froid, relaxation)","Réévaluer la douleur après 30 à 60 minutes","Tracer l''évaluation, les actions réalisées et la réévaluation"]},
      {"titre":"Signes d''alerte — prévenir le médecin","items":["Douleur brutale et intense","Douleur thoracique ou abdominale intense","Douleur accompagnée de fièvre, sueurs, malaise","Douleur ne cédant pas au traitement ou aggravation rapide"]}
    ]',
    '["Cabinet infirmier Vaïtilingon — fiche pratique"]',
    5,
    'brouillon',
    true
  ),
  (
    'protocoles_urgence',
    'Conduite à tenir à domicile — jéjunostomie, gastrostomie ou sonde naso-gastrique',
    'Soins quotidiens, vérifications, complications possibles et signes d''alerte pour chacun des trois types d''abord.',
    '[
      {"titre":"Soins du site et vérification","items":["Nettoyer le pourtour avec sérum physiologique et compresse stérile, sécher soigneusement","Vérifier la fixation et la mobilité de la sonde (jéjunostomie, gastrostomie) ou la mesure et la fixation (sonde naso-gastrique)","Rincer avec 30 ml d''eau tiède avant/après utilisation, sans jamais forcer"]},
      {"titre":"Surveillance clinique","items":["Tolérance digestive : nausées, vomissements, distension, douleur, diarrhée, constipation","État de la peau autour du point de sortie","Température si signe infectieux local"]},
      {"titre":"Complications possibles","items":["Obstruction de la sonde : ne pas forcer, rincer doucement à l''eau tiède, prévenir si échec","Sonde déplacée ou sortie : ne pas réintégrer, protéger le site, prévenir le médecin en urgence","Infection locale : nettoyer, prévenir rapidement le médecin"]},
      {"titre":"Signes d''alerte — appeler le médecin ou l''IDE en urgence","items":["Fièvre ≥ 38°C","Distension abdominale importante ou sonde complètement sortie","Débit gastrique important et inhabituel, difficulté respiratoire, toux, inhalation"]}
    ]',
    '["Cabinet infirmier Vaïtilingon — fiche de conduite à tenir à domicile"]',
    6,
    'brouillon',
    true
  ),
  (
    'protocoles_urgence',
    'Conduite à tenir en cas de déshydratation',
    'Signes de déshydratation, causes fréquentes, conduite à tenir et conseils d''hydratation au quotidien.',
    '[
      {"titre":"Causes fréquentes","items":["Apports hydriques insuffisants","Fièvre, transpiration importante, diarrhées, vomissements","Prise de diurétiques, pathologies chroniques, canicule"]},
      {"titre":"Signes à surveiller","items":["Bouche sèche, yeux creux, pli cutané","Urines foncées et peu abondantes, fatigue inhabituelle","Confusion, agitation, somnolence"]},
      {"titre":"Conduite à tenir","items":["Évaluer les signes de déshydratation et la cause possible","Proposer à boire régulièrement par petites quantités","Surveiller la quantité bue, les urines, les signes cliniques et la température","Alerter le médecin si aggravation ou absence d''amélioration"]},
      {"titre":"Signes de gravité — appeler le médecin rapidement","items":["Troubles de la conscience","Hypotension (TA < 90/60 mmHg), tachycardie > 120/min","Absence d''urines > 12 h"]}
    ]',
    '["Cabinet infirmier Vaïtilingon — fiche pratique, selon les recommandations HAS"]',
    7,
    'brouillon',
    true
  ),
  (
    'surveillance_clinique',
    'Évaluation du risque d''escarre — score de Braden',
    'Les 6 critères du score de Braden, interprétation du score total et mesures de prévention selon le niveau de risque.',
    '[
      {"titre":"Les 6 critères évalués","items":["Perception sensorielle : capacité à répondre à une gêne liée à la pression","Exposition à l''humidité : degré d''exposition de la peau à l''humidité","Activité : degré d''activité physique","Mobilité : capacité à changer et contrôler la position du corps","Nutrition : habitudes nutritionnelles habituelles","Frottements et cisaillements : problème de frottement sur la peau"]},
      {"titre":"Interprétation du score total (sur 23)","items":["19 à 23 points : risque faible","15 à 18 points : risque modéré","13 à 14 points : risque élevé","≤ 12 points : risque très élevé"]},
      {"titre":"Mesures de prévention selon le risque","items":["Risque faible : information du patient, surveillance cutanée quotidienne, hydratation cutanée, mobilisation régulière","Risque modéré : changements de position réguliers, matelas/oreiller adaptés si besoin, surveillance accrue","Risque élevé et très élevé : changes de position toutes les 2 heures, matelas à air ou surmatelas adapté, protection cutanée renforcée, évaluation pluridisciplinaire si besoin"]},
      {"titre":"Quand réévaluer","items":["À l''admission du patient","Au minimum une fois par mois","À chaque changement de l''état de santé ou après tout événement intercurrent"]}
    ]',
    '["Cabinet infirmier Vaïtilingon — fiche d''évaluation, selon les recommandations HAS"]',
    1,
    'brouillon',
    true
  );

-- Fiches juridiques et déontologiques pour l'infirmier (section
-- informations_professionnelles), issues des fiches publiées par l'Ordre
-- National des Infirmiers. Résumés informatifs, ne remplacent pas un conseil
-- juridique personnalisé.
insert into public.fiches_dossier_soins
  (section, titre, resume, contenu, sources, ordre, niveau_confiance, published)
values
  (
    'informations_professionnelles',
    'Le secret professionnel',
    'Le secret professionnel s''impose à tout infirmier et protège l''intimité du patient ; sa violation est punie pénalement et peut être sanctionnée par l''Ordre.',
    '[
      {"titre":"Principe","items":["Le secret couvre toutes les informations venues à la connaissance de l''infirmier dans l''exercice de sa profession, quel que soit son mode d''exercice","Il est général et absolu : ni le patient, ni un tiers ne peut en dispenser l''infirmier"]},
      {"titre":"Aménagements","items":["Le secret partagé est possible entre professionnels d''une même équipe de soins, pour les informations strictement utiles à la coordination des soins","Hors équipe de soins, le partage nécessite le consentement préalable du patient"]},
      {"titre":"Levée du secret","items":["Signalement possible en cas de sévices, privations ou maltraitances sur un mineur ou une personne vulnérable","Information des ayants droit d''un patient décédé possible pour connaître les causes du décès, défendre sa mémoire ou faire valoir leurs droits"]},
      {"titre":"Sanctions","items":["1 an d''emprisonnement et 15 000 € d''amende en cas de révélation punissable (article 226-13 du Code pénal)","Sanction disciplinaire ordinale possible : avertissement, blâme, interdiction d''exercer, radiation"]}
    ]',
    '["Ordre National des Infirmiers — Le secret professionnel"]',
    1,
    'brouillon',
    true
  ),
  (
    'informations_professionnelles',
    'Le refus ou l''interruption de soins par l''infirmier libéral',
    'Un infirmier libéral ne peut refuser ou interrompre des soins pour un motif discriminatoire ; en dehors de l''urgence, il peut le faire pour une raison professionnelle ou personnelle, à condition de respecter une procédure précise.',
    '[
      {"titre":"Principe","items":["Aucun refus de soins ne peut être fondé sur un motif discriminatoire (origine, sexe, état de santé, situation sociale...)","La continuité des soins doit être assurée quelles que soient les circonstances"]},
      {"titre":"Interruption autorisée","items":["Hors urgence, l''infirmier peut refuser ou interrompre des soins pour une raison professionnelle ou personnelle affectant la qualité, la sécurité ou l''efficacité de la prise en charge"]},
      {"titre":"Procédure à respecter","items":["Expliquer au patient les raisons de l''interruption, dans la mesure du possible","Orienter le patient vers un confrère ou une structure adaptée et transmettre les informations utiles à la poursuite des soins","Informer dans les meilleurs délais le médecin prescripteur"]}
    ]',
    '["Ordre National des Infirmiers — Le refus ou l''interruption de soins par l''infirmier libéral"]',
    2,
    'brouillon',
    true
  ),
  (
    'informations_professionnelles',
    'Le remplacement de l''infirmier exerçant à titre libéral',
    'Le remplacement permet à un infirmier libéral indisponible de confier temporairement sa patientèle à un confrère, dans un cadre contractuel et déontologique précis.',
    '[
      {"titre":"Conditions","items":["Un contrat écrit est obligatoire au-delà de 24 h de remplacement, ou en cas de remplacements répétés de moins de 24 h","Le remplaçant doit être inscrit à l''Ordre, assuré en responsabilité civile professionnelle, et ne peut remplacer plus de deux infirmiers à la fois"]},
      {"titre":"Pendant le remplacement","items":["L''infirmier remplacé doit s''abstenir de toute activité professionnelle infirmière","Le remplaçant exerce en toute indépendance, sous sa propre responsabilité"]},
      {"titre":"Après le remplacement","items":["Le remplaçant abandonne l''ensemble de ses activités auprès de la patientèle du remplacé","Une clause de non-concurrence limitée dans le temps et l''espace peut s''appliquer après un remplacement de plus de 3 mois"]}
    ]',
    '["Ordre National des Infirmiers — Le remplacement de l''infirmier exerçant à titre libéral"]',
    3,
    'brouillon',
    true
  ),
  (
    'informations_professionnelles',
    'La collaboration en libéral',
    'Le contrat de collaboration libérale permet à un infirmier d''exercer auprès d''un confrère titulaire tout en développant sa propre patientèle, en toute indépendance professionnelle.',
    '[
      {"titre":"Mentions obligatoires du contrat","items":["Sa durée et les conditions de renouvellement","Les modalités de rémunération","Les conditions permettant au collaborateur de développer sa patientèle personnelle","Les conditions et modalités de rupture, avec un délai de préavis","Les modalités de suspension (maladie, maternité, paternité, adoption)"]},
      {"titre":"Indépendance professionnelle","items":["Le collaborateur exerce sans lien de subordination ; à défaut, le contrat peut être requalifié en contrat de travail"]},
      {"titre":"Bon à savoir","items":["Le contrat doit être transmis au Conseil départemental de l''Ordre dans le délai d''un mois suivant sa signature"]}
    ]',
    '["Ordre National des Infirmiers — Le contrat de collaboration entre infirmiers libéraux"]',
    4,
    'brouillon',
    true
  ),
  (
    'informations_professionnelles',
    'Les modalités de l''exercice des infirmiers en pratique avancée (IPA)',
    'L''infirmier en pratique avancée (IPA) dispose de compétences élargies dans un domaine d''intervention défini, sous conditions de diplôme, d''expérience et d''enregistrement auprès de l''Ordre.',
    '[
      {"titre":"Domaines d''intervention","items":["Pathologies chroniques stabilisées, prévention et polypathologies courantes en soins primaires","Oncologie et hémato-oncologie","Maladie rénale chronique, dialyse, transplantation rénale","Psychiatrie et santé mentale","Urgences, dans un établissement disposant de l''autorisation correspondante"]},
      {"titre":"Conditions d''exercice","items":["Diplôme d''État d''infirmier en pratique avancée dans le domaine concerné","Trois années minimum d''exercice infirmier en équivalent temps plein","Enregistrement auprès de l''Ordre"]},
      {"titre":"Exercice en site distinct","items":["L''IPA libéral déjà installé qui souhaite exercer sur un site distinct doit solliciter une autorisation auprès du Conseil départemental de l''Ordre"]}
    ]',
    '["Ordre National des Infirmiers — Les modalités de l''exercice des infirmiers en pratique avancée"]',
    5,
    'brouillon',
    true
  ),
  (
    'informations_professionnelles',
    'Les centres médicaux de soins immédiat (CMSI)',
    'Les CMSI accueillent des demandes de soins non programmés en dehors de l''urgence vitale ; en l''absence de cadre juridique propre, les infirmiers qui y exercent restent soumis au Code de déontologie.',
    '[
      {"titre":"Cadre","items":["Les CMSI ne sont pas dotés d''un cadre juridique propre à ce jour ; le Code de déontologie s''applique aux infirmiers qui y exercent","Un infirmier déjà installé qui souhaite exercer au sein d''un CMSI doit solliciter une autorisation d''exercice en site distinct"]},
      {"titre":"Limites de la mission","items":["Les patients ne doivent être vus que dans le cadre de l''urgence non vitale, sans suivi proposé a posteriori","Le CMSI ne doit pas conseiller un infirmier en particulier pour le suivi du patient"]},
      {"titre":"Règles à respecter","items":["Interdiction du partage d''honoraires et du compérage","Respect de la réglementation sur le remplacement et de l''indépendance professionnelle"]}
    ]',
    '["Ordre National des Infirmiers — Les Centres Médicaux de Soins Immédiat : cadre juridique et déontologie"]',
    6,
    'brouillon',
    true
  ),
  (
    'informations_professionnelles',
    'La retranscription des prescriptions médicales',
    'L''infirmier n''est pas autorisé à retranscrire une prescription médicale ; en dehors de l''urgence, toute prescription doit être écrite, datée et signée directement par le médecin.',
    '[
      {"titre":"Principe","items":["Hors urgence, la prescription médicale orale est interdite : elle doit être écrite, qualitative et quantitative, datée et signée par le médecin","L''infirmier n''est pas autorisé à retranscrire une prescription médicale, y compris pour un renouvellement ou pour constituer le dossier du patient"]},
      {"titre":"Conséquence","items":["En cas de retranscription, la responsabilité de l''infirmier peut être engagée sur les plans disciplinaire, civil et pénal"]},
      {"titre":"Bon à savoir","items":["La prescription électronique (ordonnance numérique) permet au médecin de dématérialiser sa prescription, sans transférer la responsabilité de rédaction à l''infirmier"]}
    ]',
    '["Ordre National des Infirmiers — Position relative à la retranscription des prescriptions médicales par l''infirmier"]',
    7,
    'brouillon',
    true
  ),
  (
    'informations_professionnelles',
    'Le développement professionnel continu (DPC)',
    'Le DPC est une obligation de formation continue que chaque infirmier doit justifier sur une période de trois ans, comprenant formation, évaluation des pratiques et gestion des risques.',
    '[
      {"titre":"Obligation","items":["Chaque infirmier doit justifier, sur une période de trois ans, de son engagement dans une démarche de DPC comportant au moins deux types d''actions parmi : formation continue, évaluation et amélioration des pratiques, gestion des risques","L''engagement dans une démarche d''accréditation vaut engagement dans une démarche de DPC"]},
      {"titre":"Suivi","items":["Un document de traçabilité électronique, mis à disposition sur le site de l''ANDPC, retrace les actions suivies par chaque professionnel","L''infirmier justifie de son engagement auprès du Conseil de l''Ordre dont il dépend"]},
      {"titre":"Financement","items":["L''ANDPC prend en charge les frais pédagogiques et une indemnisation pour perte de revenus, pour les infirmiers libéraux conventionnés"]},
      {"titre":"Depuis 2023","items":["Le DPC s''inscrit désormais dans la certification périodique des infirmiers, à réaliser sur une période de six ans"]}
    ]',
    '["Ordre National des Infirmiers — Le développement professionnel continu"]',
    8,
    'brouillon',
    true
  ),
  (
    'informations_professionnelles',
    'Le cumul d''activités dans le secteur public et le secteur privé',
    'Le cumul d''une activité publique (fonction publique) avec une activité infirmière libérale est encadré : il nécessite une autorisation de l''employeur et le passage à temps partiel.',
    '[
      {"titre":"Fonctionnaires","items":["Le principe général est l''interdiction de cumuler un emploi public à temps complet avec une activité privée lucrative","L''exercice libéral (y compris comme remplaçant) nécessite une autorisation de cumul d''activités et une autorisation de service à temps partiel, au moins à mi-temps","La demande doit être adressée par écrit au moins 3 mois avant le début de l''activité libérale"]},
      {"titre":"Secteur privé (salariés)","items":["Le cumul est possible sous réserve du respect des durées maximales de travail, d''une éventuelle clause d''exclusivité et de l''obligation de loyauté envers l''employeur"]},
      {"titre":"Sanctions","items":["Le non-respect de l''interdiction de cumul expose à des sanctions administratives, pénales (prise illégale d''intérêts) et disciplinaires ordinales"]}
    ]',
    '["Ordre National des Infirmiers — Le cumul d''activités dans le secteur public et le secteur privé"]',
    9,
    'brouillon',
    true
  ),
  (
    'informations_professionnelles',
    'La vaccination antigrippale',
    'L''infirmier peut réaliser l''injection du vaccin antigrippal, y compris en primo-vaccination, sans prescription pour certains patients majeurs éligibles définis par arrêté.',
    '[
      {"titre":"Compétences de l''infirmier","items":["L''infirmier peut pratiquer l''injection du vaccin antigrippal, y compris la première injection, sans prescription ni protocole, pour les personnes majeures pour lesquelles la vaccination est recommandée dans le calendrier vaccinal","Cette possibilité exclut les personnes ayant des antécédents de réaction allergique sévère à l''ovalbumine ou à une vaccination antérieure"]},
      {"titre":"Patients mineurs","items":["Un patient mineur ne peut être vacciné par un infirmier que sur prescription médicale préalable"]},
      {"titre":"Traçabilité","items":["L''infirmier doit consigner dans le dossier de soins l''identité du patient, la date de vaccination et le numéro de lot du vaccin","Il doit déclarer au centre de pharmacovigilance tout effet indésirable porté à sa connaissance"]},
      {"titre":"Lieu d''exercice","items":["L''exercice forain (vacciner hors de son cabinet, par exemple en entreprise) est en principe interdit ; une autorisation temporaire du Conseil départemental de l''Ordre peut être accordée pour une campagne de vaccination","Il est interdit de vacciner au sein d''une officine de pharmacie"]}
    ]',
    '["Ordre National des Infirmiers — Rôle de l''infirmier en matière de vaccination antigrippale"]',
    10,
    'brouillon',
    true
  );
