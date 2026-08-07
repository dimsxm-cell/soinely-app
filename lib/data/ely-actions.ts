"use server";

import { createClient, getUtilisateurConnecte } from "@/lib/supabase/server";
import { obtenirReponseEly } from "@/lib/data/ely";
import type { ReponseEly } from "@/lib/types/clinical";

export async function poserQuestionElyAction(question: string): Promise<ReponseEly> {
  const supabase = await createClient();
  const user = await getUtilisateurConnecte();
  return obtenirReponseEly(supabase, question, user?.id ?? null);
}
