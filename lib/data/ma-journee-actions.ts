"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { StatutMission } from "@/lib/types/clinical";

const TRANSITIONS_VALIDES: Partial<Record<StatutMission, StatutMission>> = {
  a_faire: "en_cours",
  en_cours: "terminee",
};

export async function updateMissionStatutAction(formData: FormData): Promise<void> {
  const missionId = String(formData.get("missionId"));
  const nouveauStatut = String(formData.get("nouveauStatut")) as StatutMission;

  const supabase = await createClient();

  const { data: mission } = await supabase
    .from("missions_du_jour")
    .select("statut")
    .eq("id", missionId)
    .maybeSingle();

  if (!mission || TRANSITIONS_VALIDES[mission.statut as StatutMission] !== nouveauStatut) {
    return;
  }

  await supabase.from("missions_du_jour").update({ statut: nouveauStatut }).eq("id", missionId);

  revalidatePath("/ma-journee");
  revalidatePath(`/ma-journee/${missionId}`);
}

export async function updateConsignesAction(formData: FormData): Promise<void> {
  const missionId = String(formData.get("missionId"));
  const consignes = String(formData.get("consignes"));

  const supabase = await createClient();

  const { data: mission } = await supabase
    .from("missions_du_jour")
    .select("patient_id")
    .eq("id", missionId)
    .maybeSingle();

  if (!mission) return;

  await supabase.from("patients").update({ consignes }).eq("id", mission.patient_id);

  revalidatePath(`/ma-journee/${missionId}`);
}
