import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import type { FrequenceSoin, PatientComplet, SoinPrescrit } from "@/lib/types/clinical";

const CHAMPS_PATIENT =
  "id, nom_complet, adresse, telephone, allergies, consignes, date_naissance, medecin_nom, medecin_telephone, contact_urgence_nom, contact_urgence_telephone, antecedents, traitements_en_cours";

type PatientRow = {
  id: string;
  nom_complet: string;
  adresse: string;
  telephone: string;
  allergies: string | null;
  consignes: string | null;
  date_naissance: string | null;
  medecin_nom: string | null;
  medecin_telephone: string | null;
  contact_urgence_nom: string | null;
  contact_urgence_telephone: string | null;
  antecedents: string | null;
  traitements_en_cours: string | null;
};

function mapPatientRow(row: PatientRow): PatientComplet {
  return {
    id: row.id,
    nomComplet: row.nom_complet,
    adresse: row.adresse,
    telephone: row.telephone,
    allergies: row.allergies,
    consignes: row.consignes,
    dateNaissance: row.date_naissance,
    medecinNom: row.medecin_nom,
    medecinTelephone: row.medecin_telephone,
    contactUrgenceNom: row.contact_urgence_nom,
    contactUrgenceTelephone: row.contact_urgence_telephone,
    antecedents: row.antecedents,
    traitementsEnCours: row.traitements_en_cours,
  };
}

export async function getPatients(
  supabase: SupabaseClient<Database>,
  idelId: string
): Promise<PatientComplet[]> {
  const { data, error } = await supabase
    .from("patients")
    .select(CHAMPS_PATIENT)
    .eq("idel_id", idelId)
    .order("nom_complet");

  if (error || !data) return [];

  return (data as PatientRow[]).map(mapPatientRow);
}

export async function getPatient(
  supabase: SupabaseClient<Database>,
  patientId: string
): Promise<PatientComplet | null> {
  const { data, error } = await supabase
    .from("patients")
    .select(CHAMPS_PATIENT)
    .eq("id", patientId)
    .maybeSingle();

  if (error || !data) return null;

  return mapPatientRow(data as PatientRow);
}

export async function getSoinsPrescrits(
  supabase: SupabaseClient<Database>,
  patientId: string
): Promise<SoinPrescrit[]> {
  const { data, error } = await supabase
    .from("soins_prescrits")
    .select(
      "id, patient_id, type_soin, frequence_type, jours_semaine, intervalle_jours, heures, date_debut, date_fin, actif"
    )
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    patientId: row.patient_id,
    typeSoin: row.type_soin,
    frequenceType: row.frequence_type as FrequenceSoin,
    joursSemaine: row.jours_semaine,
    intervalleJours: row.intervalle_jours,
    heures: row.heures,
    dateDebut: row.date_debut,
    dateFin: row.date_fin,
    actif: row.actif,
  }));
}
