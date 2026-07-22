"use server";

import { createClient } from "@/lib/supabase/server";

export async function mettreAJourEcoutePermanenteAction(formData: FormData): Promise<void> {
  const activee = formData.get("ecoute_permanente_ely") === "on";
  const supabase = await createClient();
  await supabase.auth.updateUser({ data: { ecoute_permanente_ely: activee } });
}
