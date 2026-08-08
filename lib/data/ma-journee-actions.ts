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

export async function updateMissionStatutAction(formData: FormData): Promise<ResultatEcriture> {
  const missionId = String(formData.get("missionId"));
  const nouveauStatut = String(formData.get("nouveauStatut")) as StatutMission;

  const supabase = await createClient();

  const { data: mission } = await supabase
    .from("missions_du_jour")
    .select("statut")
    .eq("id", missionId)
    .maybeSingle();

  if (!mission) return { succes: false, erreur: "Passage introuvable." };

  const statutActuel = mission.statut as StatutMission;

  // L'accès optionnel protège d'un statut inattendu venu de la base : sans lui,
  // une valeur hors des quatre connues ferait planter l'action au lieu de la
  // refuser. TypeScript garantit les clés, pas la donnée lue.
  if (!TRANSITIONS_VALIDES[statutActuel]?.includes(nouveauStatut)) {
    // Le passage a changé d'état ailleurs — deuxième onglet, ou appui
    // répété : le dire évite de croire que le bouton ne marche pas.
    return { succes: false, erreur: "Ce passage a déjà changé d'état. Rafraîchissez la page." };
  }

  // Revenir à « à faire » efface le motif d'absence : conservé, il décrirait
  // une absence qui n'existe plus.
  const misAJour =
    nouveauStatut === "a_faire"
      ? { statut: nouveauStatut, motif_absence: null }
      : nouveauStatut === "en_cours"
        ? { statut: nouveauStatut, heure_debut_reelle: new Date().toISOString() }
        : { statut: nouveauStatut };

  // Le filtre sur le statut lu referme la fenêtre entre la lecture et
  // l'écriture : si une autre requête a fait bouger le statut entre-temps,
  // la mise à jour ne trouve plus de ligne à modifier plutôt que d'écraser
  // un état qu'elle n'a pas vérifié.
  const { error } = await supabase
    .from("missions_du_jour")
    .update(misAJour)
    .eq("id", missionId)
    .eq("statut", statutActuel);

  if (error) {
    journaliserEchec("updateMissionStatutAction", error);
    return { succes: false, erreur: `Le changement a échoué : ${error.message}` };
  }

  revalidatePath("/ma-journee");
  revalidatePath("/ma-tournee");
  revalidatePath(`/ma-journee/${missionId}`);
  return { succes: true };
}

export async function updateMotifAbsenceAction(formData: FormData): Promise<ResultatEcriture> {
  const missionId = String(formData.get("missionId"));
  const motif = String(formData.get("motif") ?? "").trim() || null;

  const supabase = await createClient();

  const { data: mission } = await supabase
    .from("missions_du_jour")
    .select("statut")
    .eq("id", missionId)
    .maybeSingle();

  // Un motif n'a de sens que sur une absence : ailleurs, il resterait une
  // explication orpheline qu'aucun écran n'afficherait.
  if (!mission) return { succes: false, erreur: "Passage introuvable." };
  if (mission.statut !== "absent") {
    return { succes: false, erreur: "Ce passage n'est plus marqué absent." };
  }

  // Le filtre sur le statut referme la fenêtre entre la lecture et
  // l'écriture : si une annulation d'absence est arrivée entre-temps, le
  // motif ne se dépose plus sur une mission redevenue « à faire », où il
  // resterait invisible jusqu'à ressurgir lors d'une prochaine absence.
  const { error } = await supabase
    .from("missions_du_jour")
    .update({ motif_absence: motif })
    .eq("id", missionId)
    .eq("statut", "absent");

  if (error) {
    journaliserEchec("updateMotifAbsenceAction", error);
    return { succes: false, erreur: `Enregistrement impossible : ${error.message}` };
  }

  revalidatePath("/ma-journee");
  revalidatePath("/ma-tournee");
  revalidatePath(`/ma-journee/${missionId}`);
  return { succes: true };
}

export async function updateConsignesAction(formData: FormData): Promise<ResultatEcriture> {
  const missionId = String(formData.get("missionId"));
  const consignes = String(formData.get("consignes"));

  const supabase = await createClient();

  const { data: mission } = await supabase
    .from("missions_du_jour")
    .select("patient_id")
    .eq("id", missionId)
    .maybeSingle();

  if (!mission) return { succes: false, erreur: "Passage introuvable." };

  const { error } = await supabase
    .from("patients")
    .update({ consignes })
    .eq("id", mission.patient_id);

  if (error) {
    journaliserEchec("updateConsignesAction", error);
    return { succes: false, erreur: `Enregistrement impossible : ${error.message}` };
  }

  revalidatePath(`/ma-journee/${missionId}`);
  return { succes: true };
}

export interface ResultatEcriture {
  succes: boolean;
  erreur?: string;
}

/**
 * Enregistre la transmission d'une visite.
 *
 * Le seul texte de l'application que rien ne permet de retrouver s'il se
 * perd : une observation clinique écrite au chevet du patient ne se réécrit
 * pas de mémoire trois semaines plus tard. L'échec doit donc se voir à
 * l'instant, tant que le texte est encore à l'écran.
 */
export async function updateTransmissionAction(formData: FormData): Promise<ResultatEcriture> {
  const missionId = String(formData.get("missionId"));
  const transmission = String(formData.get("transmission"));

  const supabase = await createClient();

  const { data: mission } = await supabase
    .from("missions_du_jour")
    .select("id")
    .eq("id", missionId)
    .maybeSingle();

  if (!mission) return { succes: false, erreur: "Passage introuvable." };

  const { data, error } = await supabase
    .from("missions_du_jour")
    .update({ transmission })
    .eq("id", missionId)
    .select("id");

  if (error) {
    journaliserEchec("updateTransmissionAction", error);
    return { succes: false, erreur: `Enregistrement impossible : ${error.message}. Gardez votre texte.` };
  }

  // Une écriture qui ne touche aucune ligne ne lève pas d'erreur : sans ce
  // contrôle, un refus de la sécurité passerait pour un enregistrement.
  if (!data || data.length === 0) {
    return { succes: false, erreur: "Rien n'a été enregistré. Gardez votre texte et signalez-le." };
  }

  revalidatePath(`/ma-journee/${missionId}`);
  return { succes: true };
}

export async function updateRappelAction(formData: FormData): Promise<ResultatEcriture> {
  const missionId = String(formData.get("missionId"));
  const rappel = String(formData.get("rappel"));

  const supabase = await createClient();

  const { data: mission } = await supabase
    .from("missions_du_jour")
    .select("id")
    .eq("id", missionId)
    .maybeSingle();

  if (!mission) return { succes: false, erreur: "Passage introuvable." };

  const { error } = await supabase
    .from("missions_du_jour")
    .update({ rappel })
    .eq("id", missionId);

  if (error) {
    journaliserEchec("updateRappelAction", error);
    return { succes: false, erreur: `Enregistrement impossible : ${error.message}` };
  }

  revalidatePath(`/ma-journee/${missionId}`);
  return { succes: true };
}

/**
 * Corrige la distance d'un passage.
 *
 * La NGAP demande la distance réellement parcourue. L'itinéraire calculé
 * ignore le détour par la pharmacie, la route barrée ou le second passage dans
 * la journée : quand l'IDEL corrige, c'est elle qui a raison, et sa saisie
 * prime sur le calcul.
 *
 * Un champ vidé efface la correction et rend la main au calcul, plutôt que
 * d'enregistrer un zéro qui supprimerait les kilomètres sans le dire.
 */
export async function updateDistanceAction(formData: FormData): Promise<ResultatEcriture> {
  const missionId = String(formData.get("missionId"));
  const saisi = String(formData.get("distanceKm") ?? "").trim();

  // La virgule est ce qu'on tape sur un clavier français.
  const normalise = saisi.replace(",", ".");
  const distance = saisi === "" ? null : Number(normalise);

  if (distance !== null && (!Number.isFinite(distance) || distance < 0)) {
    return { succes: false, erreur: `Distance invalide : « ${saisi} ». Attendu un nombre de kilomètres.` };
  }

  const supabase = await createClient();

  const { data: mission } = await supabase
    .from("missions_du_jour")
    .select("id")
    .eq("id", missionId)
    .maybeSingle();

  if (!mission) return { succes: false, erreur: "Passage introuvable." };

  const { error } = await supabase
    .from("missions_du_jour")
    .update({ distance_km_corrigee: distance })
    .eq("id", missionId);

  if (error) {
    journaliserEchec("updateDistanceAction", error);
    return { succes: false, erreur: `Enregistrement impossible : ${error.message}` };
  }

  revalidatePath(`/ma-journee/${missionId}`);
  // Le total de la tournée change avec les kilomètres du passage.
  revalidatePath("/ma-tournee");
  return { succes: true };
}

/**
 * Joint une photo de suivi à une visite.
 *
 * Une plaie photographiée au domicile ne se rephotographie pas le lendemain :
 * l'état du jour est perdu si l'envoi échoue sans le dire. Chaque refus se
 * nomme donc, tant que l'IDEL est encore devant le patient.
 */
export async function uploadPhotoAction(formData: FormData): Promise<ResultatEcriture> {
  const missionId = String(formData.get("missionId"));
  const photo = formData.get("photo");

  if (!(photo instanceof File) || photo.size === 0) {
    return { succes: false, erreur: "Choisissez une photo." };
  }

  // Le bucket refuse au-delà de dix mégaoctets : le dire ici évite un envoi
  // long qui échouera de toute façon, sur un réseau de tournée.
  if (photo.size > 10 * 1024 * 1024) {
    return { succes: false, erreur: "Photo trop lourde : 10 Mo au maximum." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { succes: false, erreur: "Vous devez être connectée." };

  const { data: mission } = await supabase
    .from("missions_du_jour")
    .select("id")
    .eq("id", missionId)
    .maybeSingle();

  if (!mission) return { succes: false, erreur: "Passage introuvable." };

  const extension = photo.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/${missionId}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("photos-visites")
    .upload(path, photo, { upsert: true, contentType: photo.type });

  if (uploadError) {
    journaliserEchec("uploadPhotoAction", uploadError);
    return { succes: false, erreur: "L'envoi a échoué. Vérifiez votre réseau et réessayez." };
  }

  const { error } = await supabase
    .from("missions_du_jour")
    .update({ photo_path: path })
    .eq("id", missionId);

  if (error) {
    journaliserEchec("uploadPhotoAction", error);
    return { succes: false, erreur: `La photo est envoyée mais n'a pas pu être rattachée : ${error.message}` };
  }

  revalidatePath(`/ma-journee/${missionId}`);
  return { succes: true };
}
