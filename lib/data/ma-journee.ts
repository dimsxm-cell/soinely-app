import type { SupabaseClient } from "@supabase/supabase-js";
import type { MissionDuJour, Tournee } from "@/lib/types/clinical";

export async function getTourneeDuJour(
  supabase: SupabaseClient,
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
  supabase: SupabaseClient,
  tourneeId: string
): Promise<MissionDuJour[]> {
  const { data, error } = await supabase
    .from("missions_du_jour")
    .select("id, patient_label, type_soin, heure_prevue, statut, mission_clinique_id")
    .eq("tournee_id", tourneeId)
    .order("heure_prevue");

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    patientLabel: row.patient_label,
    typeSoin: row.type_soin,
    heurePrevue: row.heure_prevue,
    statut: row.statut,
    missionCliniqueId: row.mission_clinique_id,
  }));
}

export async function getMissionEnCoursHref(
  supabase: SupabaseClient,
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
  const situationTerrainId = (
    mission.missions_cliniques as { situation_terrain_id: string | null } | null
  )?.situation_terrain_id;

  const href = situationTerrainId
    ? `/situations/${situationTerrainId}`
    : `/copilote?q=${encodeURIComponent(mission.type_soin)}`;

  return { missionId: mission.id, href };
}
