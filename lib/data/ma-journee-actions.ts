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

  if (!mission) return;

  const statutActuel = mission.statut as StatutMission;
  const transitionValide =
    TRANSITIONS_VALIDES[statutActuel] === nouveauStatut ||
    (statutActuel === "a_faire" && nouveauStatut === "absent");

  if (!transitionValide) return;

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

export async function updateTransmissionAction(formData: FormData): Promise<void> {
  const missionId = String(formData.get("missionId"));
  const transmission = String(formData.get("transmission"));

  const supabase = await createClient();

  const { data: mission } = await supabase
    .from("missions_du_jour")
    .select("id")
    .eq("id", missionId)
    .maybeSingle();

  if (!mission) return;

  await supabase.from("missions_du_jour").update({ transmission }).eq("id", missionId);

  revalidatePath(`/ma-journee/${missionId}`);
}

export async function updateRappelAction(formData: FormData): Promise<void> {
  const missionId = String(formData.get("missionId"));
  const rappel = String(formData.get("rappel"));

  const supabase = await createClient();

  const { data: mission } = await supabase
    .from("missions_du_jour")
    .select("id")
    .eq("id", missionId)
    .maybeSingle();

  if (!mission) return;

  await supabase.from("missions_du_jour").update({ rappel }).eq("id", missionId);

  revalidatePath(`/ma-journee/${missionId}`);
}

export async function uploadPhotoAction(formData: FormData): Promise<void> {
  const missionId = String(formData.get("missionId"));
  const photo = formData.get("photo");

  if (!(photo instanceof File) || photo.size === 0) return;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: mission } = await supabase
    .from("missions_du_jour")
    .select("id")
    .eq("id", missionId)
    .maybeSingle();

  if (!mission) return;

  const extension = photo.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/${missionId}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("photos-visites")
    .upload(path, photo, { upsert: true, contentType: photo.type });

  if (uploadError) return;

  await supabase.from("missions_du_jour").update({ photo_path: path }).eq("id", missionId);

  revalidatePath(`/ma-journee/${missionId}`);
}
