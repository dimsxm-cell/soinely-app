import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MissionClinique,
  SituationTerrain,
  SituationTerrainDetail,
} from "@/lib/types/clinical";

function mapSituationTerrain(row: any): SituationTerrain {
  return {
    id: row.id,
    titre: row.titre,
    observation: row.observation,
    verifications: row.verifications,
    causesPossibles: row.causes_possibles,
    conduiteATenir: row.conduite_a_tenir,
    quandAvisMedical: row.quand_avis_medical,
    sources: row.sources,
    specialite: row.specialite,
    niveauConfiance: row.niveau_confiance,
    version: row.version,
    published: row.published,
  };
}

function mapMissionClinique(row: any): MissionClinique {
  return {
    id: row.id,
    titre: row.titre,
    situationTerrainId: row.situation_terrain_id,
    etapes: row.etapes,
    dureeEstimeeMin: row.duree_estimee_min,
    published: row.published,
  };
}

export async function searchSituationsTerrain(
  supabase: SupabaseClient,
  query: string
): Promise<SituationTerrain[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data, error } = await supabase.rpc("search_situations_terrain", {
    search_query: trimmed,
  });

  if (error || !data) return [];

  return data.map(mapSituationTerrain);
}

export async function getSituationTerrainDetail(
  supabase: SupabaseClient,
  id: string
): Promise<SituationTerrainDetail | null> {
  const { data: situation, error: situationError } = await supabase
    .from("situations_terrain")
    .select("*")
    .eq("id", id)
    .eq("published", true)
    .maybeSingle();

  if (situationError || !situation) return null;

  const { data: missions, error: missionsError } = await supabase
    .from("missions_cliniques")
    .select("*")
    .eq("situation_terrain_id", id)
    .eq("published", true);

  return {
    ...mapSituationTerrain(situation),
    missions: missionsError || !missions ? [] : missions.map(mapMissionClinique),
  };
}
