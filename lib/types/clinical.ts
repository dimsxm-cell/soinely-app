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
