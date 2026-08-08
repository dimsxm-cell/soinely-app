export type NiveauConfiance = "brouillon" | "relu" | "valide";

export interface SituationTerrain {
  id: string;
  titre: string;
  observation: string;
  verifications: string[];
  causesPossibles: string[];
  conduiteATenir: string[];
  quandAvisMedical: string;
  sources: string[];
  specialite: string;
  niveauConfiance: NiveauConfiance;
  version: number;
  published: boolean;
}

export interface MissionClinique {
  id: string;
  titre: string;
  situationTerrainId: string | null;
  etapes: { titre: string; description: string }[];
  dureeEstimeeMin: number;
  published: boolean;
}

export type StatutMission = "a_faire" | "en_cours" | "terminee" | "absent";

export interface Patient {
  id: string;
  nomComplet: string;
  adresse: string;
  telephone: string;
  allergies: string | null;
  consignes: string | null;
  dateNaissance: string | null;
  /**
   * Position géocodée du domicile, ou `null`/absente si l'adresse n'a pas pu
   * être localisée. Optionnelle côté type pour ne pas casser les objets
   * `Patient` déjà construits ailleurs (tests notamment).
   */
  latitude?: number | null;
  longitude?: number | null;
}

export type Sexe = "homme" | "femme";

export interface PatientComplet extends Patient {
  /**
   * Forfait journalier de dépendance (BSA, BSB, BSC) issu du BSI, ou `null`.
   * Sa présence bascule les actes techniques du patient en AMX à 50 %.
   */
  forfaitBsi: string | null;
  numeroSecu: string | null;
  sexe: Sexe | null;
  medecinNom: string | null;
  medecinTelephone: string | null;
  personneConfianceNom: string | null;
  personneConfianceTelephone: string | null;
  noteSoin: string | null;
  antecedents: string | null;
  traitementsEnCours: string | null;
}

export type FrequenceSoin = "jours_semaine" | "tous_les_x_jours" | "quotidien" | "ponctuel";

export interface SoinPrescrit {
  id: string;
  patientId: string;
  typeSoin: string;
  frequenceType: FrequenceSoin;
  joursSemaine: number[] | null;
  intervalleJours: number | null;
  heures: string[];
  dateDebut: string;
  dateFin: string | null;
  actif: boolean;
  ngapCodeId: string | null;
  ngapCode: string | null;
}

export interface ProchaineMission {
  id: string;
  patientNom: string;
  heurePrevue: string;
}

export interface MissionDuJour {
  id: string;
  patientId: string;
  patientNom: string;
  typeSoin: string;
  heurePrevue: string;
  statut: StatutMission;
  missionCliniqueId: string | null;
  /**
   * Ordre de passage suggéré par la réorganisation manuelle, ou `null` tant
   * qu'aucune réorganisation n'a eu lieu. Optionnel côté type pour ne pas
   * casser les objets `MissionDuJour` déjà construits ailleurs (tests
   * notamment) — toujours renseigné en pratique par `getMissionsDuJour`.
   */
  ordreVisite?: number | null;
  /**
   * Distance routière depuis le cabinet, aller simple, et sa correction
   * manuelle éventuelle. Optionnelles côté type pour la même raison que
   * `ordreVisite` — toujours renseignées en pratique par `getMissionsDuJour`.
   */
  distanceKm?: number | null;
  distanceKmCorrigee?: number | null;
}

export interface ActeVue {
  libelle: string;
  code: string | null;
  /**
   * Tarif de l'acte en euros, tel que le catalogue NGAP le porte. `null` pour
   * un acte sans code : il reste affiché, mais ne compte dans aucun total.
   */
  cotation: number | null;
  /** Lettre-clé du code (AMI, AIS, TLS…), qui gouverne la règle de cumul. */
  lettreCle: string | null;
  /**
   * Coefficient de l'acte. C'est lui, et non le tarif, qui classe les actes
   * d'une séance : l'article 11B raisonne en coefficients.
   */
  coefficient: number | null;
  /**
   * Acte facturable à taux plein en sus d'un forfait de dépendance, au titre
   * de l'article A12 du titre XVI. Les autres basculent en AMX à 50 %.
   */
  derogatoireBsi: boolean;
  /**
   * Acte ouvrant droit à la majoration de coordination infirmière.
   */
  eligibleMci: boolean;
}

export interface MissionDetail extends MissionDuJour {
  patient: Patient;
  /**
   * Forfait de dépendance du patient, qui gouverne la cotation de ses actes.
   */
  patientForfaitBsi: string | null;
  /** Date de la tournée, dont dépendent les majorations dimanche et fériés. */
  dateTournee: string;
  /** Distance routière depuis le cabinet, aller simple. */
  distanceKm: number | null;
  /** Distance corrigée à la main, qui prime sur la précédente. */
  distanceKmCorrigee: number | null;
  /** Actes cotés du passage. */
  actes: ActeVue[];
  transmission: string | null;
  derniereTransmission: string | null;
  rappel: string | null;
  dernierRappel: string | null;
  photoPath: string | null;
  dernierePhotoPath: string | null;
  prochaineMission: ProchaineMission | null;
}

export interface Tournee {
  id: string;
  date: string;
  nbPatients: number;
  nbInjections: number;
  nbPansements: number;
  nbGlycemies: number;
  tempsEstimeMin: number;
  materielPrepare: boolean;
  materielVerifie: boolean;
}

export interface SituationTerrainDetail extends SituationTerrain {
  missions: MissionClinique[];
}

export type SectionDossierSoin =
  | "identification_patient"
  | "traitements"
  | "surveillance_clinique"
  | "protocoles_urgence"
  | "transmissions_infirmieres"
  | "prescriptions_liaisons_medicales"
  | "administratif"
  | "allergies_alertes"
  | "contacts_utiles"
  | "informations_professionnelles";

export interface BlocContenuFiche {
  titre: string;
  items: string[];
}

export interface FicheDossierSoin {
  id: string;
  section: SectionDossierSoin;
  titre: string;
  resume: string;
  contenu: BlocContenuFiche[];
  sources: string[];
  ordre: number;
  niveauConfiance: NiveauConfiance;
  version: number;
  published: boolean;
}

export interface SyntheseEly {
  situationComprise: string;
  informationsManquantes: string[];
  controlesRetenus: string[];
  signesAlerteRetenus: string[];
  actionsRetenues: string[];
  fichesUtiliseesIds: string[];
}

export interface ReponseEly {
  situationBrute: SituationTerrain | null;
  situationsSources: SituationTerrain[];
  synthese: SyntheseEly | null;
}
