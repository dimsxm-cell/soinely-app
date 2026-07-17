import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import type {
  MissionDetail,
  MissionDuJour,
  ProchaineMission,
  StatutMission,
  Tournee,
} from "@/lib/types/clinical";

export async function getTourneeDuJour(
  supabase: SupabaseClient<Database>,
  idelId: string
): Promise<Tournee | null> {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("tournees")
    .select("id, date, nb_patients, nb_injections, nb_pansements, nb_glycemies, temps_estime_min")
    .eq("idel_id", idelId)
    .eq("date", today)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    date: data.date,
    nbPatients: data.nb_patients,
    nbInjections: data.nb_injections,
    nbPansements: data.nb_pansements,
    nbGlycemies: data.nb_glycemies,
    tempsEstimeMin: data.temps_estime_min,
  };
}

export async function getMissionsDuJour(
  supabase: SupabaseClient<Database>,
  tourneeId: string
): Promise<MissionDuJour[]> {
  const { data, error } = await supabase
    .from("missions_du_jour")
    .select("id, patient_id, type_soin, heure_prevue, statut, mission_clinique_id, patients(nom_complet)")
    .eq("tournee_id", tourneeId)
    .order("heure_prevue");

  if (error || !data) return [];

  return data.map((row) => {
    const patientEmbed = row.patients as unknown;
    const patient = Array.isArray(patientEmbed)
      ? (patientEmbed[0] as { nom_complet: string })
      : (patientEmbed as { nom_complet: string });

    return {
      id: row.id,
      patientId: row.patient_id,
      patientNom: patient.nom_complet,
      typeSoin: row.type_soin,
      heurePrevue: row.heure_prevue,
      statut: row.statut as StatutMission,
      missionCliniqueId: row.mission_clinique_id,
    };
  });
}

async function getDerniereTransmission(
  supabase: SupabaseClient<Database>,
  patientId: string,
  missionIdActuelle: string
): Promise<string | null> {
  const { data } = await supabase
    .from("missions_du_jour")
    .select("transmission, heure_prevue, tournees(date)")
    .eq("patient_id", patientId)
    .neq("id", missionIdActuelle)
    .not("transmission", "is", null);

  if (!data || data.length === 0) return null;

  type CandidatRow = { transmission: string | null; heure_prevue: string; tournees: unknown };
  const avecDate = (data as CandidatRow[]).map((row) => {
    const tourneeEmbed = row.tournees;
    const tournee = Array.isArray(tourneeEmbed)
      ? (tourneeEmbed[0] as { date: string } | undefined)
      : (tourneeEmbed as { date: string } | null);
    return { transmission: row.transmission, dateHeure: `${tournee?.date ?? ""}T${row.heure_prevue}` };
  });

  avecDate.sort((a, b) => b.dateHeure.localeCompare(a.dateHeure));

  return avecDate[0].transmission;
}

async function getDernierRappel(
  supabase: SupabaseClient<Database>,
  patientId: string,
  missionIdActuelle: string
): Promise<string | null> {
  const { data } = await supabase
    .from("missions_du_jour")
    .select("rappel, heure_prevue, tournees(date)")
    .eq("patient_id", patientId)
    .neq("id", missionIdActuelle)
    .not("rappel", "is", null);

  if (!data || data.length === 0) return null;

  type CandidatRow = { rappel: string | null; heure_prevue: string; tournees: unknown };
  const avecDate = (data as CandidatRow[]).map((row) => {
    const tourneeEmbed = row.tournees;
    const tournee = Array.isArray(tourneeEmbed)
      ? (tourneeEmbed[0] as { date: string } | undefined)
      : (tourneeEmbed as { date: string } | null);
    return { rappel: row.rappel, dateHeure: `${tournee?.date ?? ""}T${row.heure_prevue}` };
  });

  avecDate.sort((a, b) => b.dateHeure.localeCompare(a.dateHeure));

  return avecDate[0].rappel;
}

async function getProchaineMission(
  supabase: SupabaseClient<Database>,
  tourneeId: string
): Promise<ProchaineMission | null> {
  const { data, error } = await supabase
    .from("missions_du_jour")
    .select("id, heure_prevue, patients(nom_complet)")
    .eq("tournee_id", tourneeId)
    .eq("statut", "a_faire")
    .order("heure_prevue")
    .limit(1);

  if (error || !data || data.length === 0) return null;

  const row = data[0];
  const patientEmbed = row.patients as unknown;
  const patient = Array.isArray(patientEmbed)
    ? (patientEmbed[0] as { nom_complet: string })
    : (patientEmbed as { nom_complet: string });

  return {
    id: row.id,
    patientNom: patient.nom_complet,
    heurePrevue: row.heure_prevue,
  };
}

export async function getMissionDetail(
  supabase: SupabaseClient<Database>,
  missionId: string
): Promise<MissionDetail | null> {
  const { data, error } = await supabase
    .from("missions_du_jour")
    .select(
      "id, patient_id, tournee_id, type_soin, heure_prevue, statut, mission_clinique_id, transmission, rappel, patients(id, nom_complet, adresse, telephone, allergies, consignes, date_naissance)"
    )
    .eq("id", missionId)
    .maybeSingle();

  if (error || !data) return null;

  const patientEmbed = data.patients as unknown;
  type PatientRow = {
    id: string;
    nom_complet: string;
    adresse: string;
    telephone: string;
    allergies: string | null;
    consignes: string | null;
    date_naissance: string | null;
  };
  const patientRow = Array.isArray(patientEmbed)
    ? (patientEmbed[0] as PatientRow)
    : (patientEmbed as PatientRow);

  const derniereTransmission = await getDerniereTransmission(supabase, data.patient_id, missionId);
  const dernierRappel = await getDernierRappel(supabase, data.patient_id, missionId);

  const statut = data.statut as StatutMission;
  const prochaineMission =
    statut === "terminee" || statut === "absent"
      ? await getProchaineMission(supabase, data.tournee_id)
      : null;

  return {
    id: data.id,
    patientId: data.patient_id,
    patientNom: patientRow.nom_complet,
    typeSoin: data.type_soin,
    heurePrevue: data.heure_prevue,
    statut,
    missionCliniqueId: data.mission_clinique_id,
    transmission: data.transmission,
    derniereTransmission,
    rappel: data.rappel,
    dernierRappel,
    prochaineMission,
    patient: {
      id: patientRow.id,
      nomComplet: patientRow.nom_complet,
      adresse: patientRow.adresse,
      telephone: patientRow.telephone,
      allergies: patientRow.allergies,
      consignes: patientRow.consignes,
      dateNaissance: patientRow.date_naissance,
    },
  };
}

export async function getMissionEnCoursHref(
  supabase: SupabaseClient<Database>,
  tourneeId: string
): Promise<{ missionId: string; href: string } | null> {
  const { data, error } = await supabase
    .from("missions_du_jour")
    .select("id, type_soin, mission_clinique_id, missions_cliniques(situation_terrain_id)")
    .eq("tournee_id", tourneeId)
    .eq("statut", "en_cours")
    .limit(1);

  if (error || !data || data.length === 0) return null;

  const mission = data[0];
  const missionsCliniquesEmbed = mission.missions_cliniques as unknown;
  const missionClinique = Array.isArray(missionsCliniquesEmbed)
    ? (missionsCliniquesEmbed[0] as { situation_terrain_id: string | null } | undefined)
    : (missionsCliniquesEmbed as { situation_terrain_id: string | null } | null);
  const situationTerrainId = missionClinique?.situation_terrain_id;

  const href = situationTerrainId
    ? `/situations/${situationTerrainId}`
    : `/copilote?q=${encodeURIComponent(mission.type_soin)}`;

  return { missionId: mission.id, href };
}
