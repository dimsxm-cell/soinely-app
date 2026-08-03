"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { journaliserEchec } from "@/lib/journal";

const BUCKET_ORDONNANCES = "ordonnances";

/** Types acceptés, alignés sur ceux que le bucket autorise. */
const TYPES_ACCEPTES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/** 10 Mo, la limite du bucket. Une photo de téléphone en fait 2 à 5. */
const TAILLE_MAX_OCTETS = 10 * 1024 * 1024;

export interface ResultatOrdonnance {
  succes: boolean;
  erreur?: string;
}

/**
 * Enregistre la photo d'une ordonnance.
 *
 * Le fichier vit dans un bucket privé, sous un chemin commençant par
 * l'identifiant de l'IDEL : c'est ce préfixe que la politique de sécurité
 * vérifie. Nommé avec un horodatage plutôt qu'avec le nom d'origine, pour que
 * deux photos prises à la suite ne s'écrasent pas.
 */
export async function ajouterOrdonnanceAction(
  formData: FormData
): Promise<ResultatOrdonnance> {
  const patientId = String(formData.get("patientId") ?? "");
  const fichier = formData.get("fichier");

  if (!patientId) return { succes: false, erreur: "Patient introuvable." };
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { succes: false, erreur: "Choisissez une photo ou un PDF." };
  }

  if (!TYPES_ACCEPTES.includes(fichier.type)) {
    return { succes: false, erreur: "Format accepté : photo JPEG, PNG, WEBP ou PDF." };
  }

  if (fichier.size > TAILLE_MAX_OCTETS) {
    return { succes: false, erreur: "Fichier trop lourd : 10 Mo au maximum." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { succes: false, erreur: "Vous devez être connectée." };

  // Le patient est relu pour s'assurer qu'il appartient bien à cette IDEL :
  // la politique de sécurité le ferait aussi, mais un refus silencieux est
  // plus difficile à comprendre qu'un message.
  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .maybeSingle();

  if (!patient) return { succes: false, erreur: "Patient introuvable." };

  const extension = fichier.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${user.id}/${patientId}/${Date.now()}.${extension}`;

  const { error: erreurEnvoi } = await supabase.storage
    .from(BUCKET_ORDONNANCES)
    .upload(path, fichier, { contentType: fichier.type });

  if (erreurEnvoi) {
    journaliserEchec("ajouterOrdonnanceAction (envoi)", erreurEnvoi);
    return { succes: false, erreur: "L'envoi a échoué. Vérifiez votre connexion et réessayez." };
  }

  const datePrescription = String(formData.get("datePrescription") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  const { error } = await supabase.from("ordonnances").insert({
    patient_id: patientId,
    idel_id: user.id,
    fichier_path: path,
    date_prescription: datePrescription === "" ? null : datePrescription,
    note: note === "" ? null : note,
  });

  if (error) {
    // Le fichier est retiré : le laisser sans sa ligne le rendrait invisible
    // et impossible à supprimer depuis l'application.
    await supabase.storage.from(BUCKET_ORDONNANCES).remove([path]);
    journaliserEchec("ajouterOrdonnanceAction (enregistrement)", error);
    return { succes: false, erreur: "L'enregistrement a échoué. Réessayez." };
  }

  revalidatePath(`/patients/${patientId}/prescriptions`);
  return { succes: true };
}

/** Supprime une ordonnance, son fichier avec elle. */
export async function supprimerOrdonnanceAction(formData: FormData): Promise<void> {
  const ordonnanceId = String(formData.get("ordonnanceId") ?? "");
  const patientId = String(formData.get("patientId") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: ordonnance } = await supabase
    .from("ordonnances")
    .select("fichier_path")
    .eq("id", ordonnanceId)
    .maybeSingle();

  if (!ordonnance) return;

  // Le fichier d'abord : si la ligne partait la première, un échec ici
  // laisserait un fichier orphelin que plus rien ne désigne.
  const { error: erreurFichier } = await supabase.storage
    .from(BUCKET_ORDONNANCES)
    .remove([ordonnance.fichier_path]);

  if (erreurFichier) journaliserEchec("supprimerOrdonnanceAction (fichier)", erreurFichier);

  const { error } = await supabase.from("ordonnances").delete().eq("id", ordonnanceId);

  if (error) journaliserEchec("supprimerOrdonnanceAction", error);

  revalidatePath(`/patients/${patientId}/prescriptions`);
}
