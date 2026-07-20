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
}

export interface PatientComplet extends Patient {
  medecinNom: string | null;
  medecinTelephone: string | null;
  contactUrgenceNom: string | null;
  contactUrgenceTelephone: string | null;
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
}

export interface MissionDetail extends MissionDuJour {
  patient: Patient;
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
  | "contacts_utiles";

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
