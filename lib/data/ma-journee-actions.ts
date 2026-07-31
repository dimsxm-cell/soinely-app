"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { StatutMission } from "@/lib/types/clinical";
import { journaliserEchec } from "@/lib/journal";

// Chaque statut liste ses suites possibles. Les deux retours vers « à faire »
// rattrapent l'appui de trop sur « Valider » ou « Absent », geste fait à une
// main sur le pas d'une porte. Passer directement de « validé » à « absent »
// n'est volontairement pas offert.
const TRANSITIONS_VALIDES: Record<StatutMission, StatutMission[]> = {
  a_faire: ["en_cours", "absent"],
  en_cours: ["terminee"],
  terminee: ["a_faire"],
  absent: ["a_faire"],
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

  // L'accès optionnel protège d'un statut inattendu venu de la base : sans lui,
  // une valeur hors des quatre connues ferait planter l'action au lieu de la
  // refuser. TypeScript garantit les clés, pas la donnée lue.
  if (!TRANSITIONS_VALIDES[statutActuel]?.includes(nouveauStatut)) return;

  // Revenir à « à faire » efface le motif d'absence : conservé, il décrirait
  // une absence qui n'existe plus.
  const misAJour =
    nouveauStatut === "a_faire"
      ? { statut: nouveauStatut, motif_absence: null }
      : { statut: nouveauStatut };

  const { error } = await supabase
    .from("missions_du_jour")
    .update(misAJour)
    .eq("id", missionId);

  if (error) journaliserEchec("updateMissionStatutAction", error);

  revalidatePath("/ma-journee");
  revalidatePath("/ma-tournee");
  revalidatePath(`/ma-journee/${missionId}`);
}

export async function updateMotifAbsenceAction(formData: FormData): Promise<void> {
  const missionId = String(formData.get("missionId"));
  const motif = String(formData.get("motif") ?? "") || null;

  const supabase = await createClient();

  const { data: mission } = await supabase
    .from("missions_du_jour")
    .select("statut")
    .eq("id", missionId)
    .maybeSingle();

  // Un motif n'a de sens que sur une absence : ailleurs, il resterait une
  // explication orpheline qu'aucun écran n'afficherait.
  if (!mission || mission.statut !== "absent") return;

  const { error } = await supabase
    .from("missions_du_jour")
    .update({ motif_absence: motif })
    .eq("id", missionId);

  if (error) journaliserEchec("updateMotifAbsenceAction", error);

  revalidatePath("/ma-journee");
  revalidatePath("/ma-tournee");
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

  const { error } = await supabase
    .from("patients")
    .update({ consignes })
    .eq("id", mission.patient_id);

  if (error) journaliserEchec("updateConsignesAction", error);

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

  const { error } = await supabase
    .from("missions_du_jour")
    .update({ transmission })
    .eq("id", missionId);

  if (error) journaliserEchec("updateTransmissionAction", error);

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

  const { error } = await supabase
    .from("missions_du_jour")
    .update({ rappel })
    .eq("id", missionId);

  if (error) journaliserEchec("updateRappelAction", error);

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

  if (uploadError) {
    journaliserEchec("uploadPhotoAction", uploadError);
    return;
  }

  const { error } = await supabase
    .from("missions_du_jour")
    .update({ photo_path: path })
    .eq("id", missionId);

  if (error) journaliserEchec("uploadPhotoAction", error);

  revalidatePath(`/ma-journee/${missionId}`);
}
