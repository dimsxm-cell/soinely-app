"use server";

import { createClient } from "@/lib/supabase/server";
import { searchSituationsTerrain } from "@/lib/data/recherche";
import type { SituationTerrain } from "@/lib/types/clinical";

export async function poserQuestionElyAction(question: string): Promise<SituationTerrain | null> {
  const supabase = await createClient();
  const resultats = await searchSituationsTerrain(supabase, question);
  return resultats[0] ?? null;
}
