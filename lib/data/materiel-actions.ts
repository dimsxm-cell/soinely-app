"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ResultatEcriture } from "@/lib/data/ma-journee-actions";
import { journaliserEchec } from "@/lib/journal";

/**
 * Coche l'un des deux états quotidiens du matériel (préparé / vérifié),
 * indépendamment l'un de l'autre. Repartent à faux le lendemain, avec la
 * nouvelle ligne de tournée du jour.
 */
export async function updateMaterielAction(formData: FormData): Promise<ResultatEcriture> {
  const tourneeId = String(formData.get("tourneeId"));
  const champ = String(formData.get("champ"));

  if (champ !== "prepare" && champ !== "verifie") {
    return { succes: false, erreur: "Champ invalide." };
  }

  const supabase = await createClient();

  const updateData = champ === "prepare"
    ? { materiel_prepare: true }
    : { materiel_verifie: true };

  const { error } = await supabase
    .from("tournees")
    .update(updateData)
    .eq("id", tourneeId);

  if (error) {
    journaliserEchec("updateMaterielAction", error);
    return { succes: false, erreur: `Enregistrement impossible : ${error.message}` };
  }

  revalidatePath("/ma-journee");
  return { succes: true };
}
