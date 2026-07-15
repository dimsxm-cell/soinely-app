import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import type {
  MissionClinique,
  NiveauConfiance,
  SituationTerrain,
  SituationTerrainDetail,
} from "@/lib/types/clinical";

type SituationTerrainRow = Database["public"]["Tables"]["situations_terrain"]["Row"];
type MissionCliniqueRow = Database["public"]["Tables"]["missions_cliniques"]["Row"];

function mapSituationTerrain(row: SituationTerrainRow): SituationTerrain {
  return {
    id: row.id,
    titre: row.titre,
    observation: row.observation,
    verifications: row.verifications as string[],
    causesPossibles: row.causes_possibles as string[],
    conduiteATenir: row.conduite_a_tenir as string[],
    quandAvisMedical: row.quand_avis_medical,
    sources: row.sources as string[],
    specialite: row.specialite,
    niveauConfiance: row.niveau_confiance as NiveauConfiance,
    version: row.version,
    published: row.published,
  };
}

function mapMissionClinique(row: MissionCliniqueRow): MissionClinique {
  return {
    id: row.id,
    titre: row.titre,
    situationTerrainId: row.situation_terrain_id,
    etapes: row.etapes as { titre: string; description: string }[],
    dureeEstimeeMin: row.duree_estimee_min,
    published: row.published,
  };
}

export async function searchSituationsTerrain(
  supabase: SupabaseClient<Database>,
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
  supabase: SupabaseClient<Database>,
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
