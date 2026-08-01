"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FrequenceSoin } from "@/lib/types/clinical";
import { journaliserEchec } from "@/lib/journal";

function champTexteOuNull(formData: FormData, nom: string): string | null {
  const valeur = String(formData.get(nom) ?? "");
  return valeur || null;
}

const FORFAITS_BSI = new Set(["BSA", "BSB", "BSC"]);

/**
 * Forfait retenu, ou null. La valeur vient d une liste fermée : une saisie
 * hors liste ferait echouer l ecriture entiere sur la contrainte SQL, alors
 * qu elle ne doit qu etre ignoree.
 */
function forfaitBsiValide(formData: FormData): string | null {
  const saisi = String(formData.get("forfaitBsi") ?? "").trim();
  return FORFAITS_BSI.has(saisi) ? saisi : null;
}

export async function createPatientAction(
  formData: FormData
): Promise<{ success: true } | { success: false; error: string }> {
  const nomComplet = String(formData.get("nomComplet") ?? "");
  const adresse = String(formData.get("adresse") ?? "");
  const telephone = String(formData.get("telephone") ?? "");

  if (!nomComplet || !adresse || !telephone) {
    return { success: false, error: "Le nom, l'adresse et le téléphone sont obligatoires." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Vous devez être connectée pour créer un patient." };
  }

  const { data: patient, error } = await supabase
    .from("patients")
    .insert({
      idel_id: user.id,
      nom_complet: nomComplet,
      adresse,
      telephone,
      date_naissance: champTexteOuNull(formData, "dateNaissance"),
      numero_secu: champTexteOuNull(formData, "numeroSecu"),
      sexe: champTexteOuNull(formData, "sexe"),
      allergies: champTexteOuNull(formData, "allergies"),
      consignes: champTexteOuNull(formData, "consignes"),
      forfait_bsi: forfaitBsiValide(formData),
      medecin_nom: champTexteOuNull(formData, "medecinNom"),
      medecin_telephone: champTexteOuNull(formData, "medecinTelephone"),
      personne_confiance_nom: champTexteOuNull(formData, "personneConfianceNom"),
      personne_confiance_telephone: champTexteOuNull(formData, "personneConfianceTelephone"),
      note_soin: champTexteOuNull(formData, "noteSoin"),
      antecedents: champTexteOuNull(formData, "antecedents"),
      traitements_en_cours: champTexteOuNull(formData, "traitementsEnCours"),
    })
    .select("id")
    .single();

  if (error) journaliserEchec("createPatientAction", error);
  if (error || !patient) {
    return { success: false, error: error?.message ?? "La création du patient a échoué." };
  }

  revalidatePath("/patients");
  redirect(`/patients/${patient.id}`);
}

export async function updatePatientAction(formData: FormData): Promise<void> {
  const patientId = String(formData.get("patientId") ?? "");
  const nomComplet = String(formData.get("nomComplet") ?? "");
  const adresse = String(formData.get("adresse") ?? "");
  const telephone = String(formData.get("telephone") ?? "");

  if (!nomComplet || !adresse || !telephone) return;

  const supabase = await createClient();

  const { error } = await supabase
    .from("patients")
    .update({
      nom_complet: nomComplet,
      adresse,
      telephone,
      date_naissance: champTexteOuNull(formData, "dateNaissance"),
      numero_secu: champTexteOuNull(formData, "numeroSecu"),
      sexe: champTexteOuNull(formData, "sexe"),
      allergies: champTexteOuNull(formData, "allergies"),
      consignes: champTexteOuNull(formData, "consignes"),
      forfait_bsi: forfaitBsiValide(formData),
      medecin_nom: champTexteOuNull(formData, "medecinNom"),
      medecin_telephone: champTexteOuNull(formData, "medecinTelephone"),
      personne_confiance_nom: champTexteOuNull(formData, "personneConfianceNom"),
      personne_confiance_telephone: champTexteOuNull(formData, "personneConfianceTelephone"),
      note_soin: champTexteOuNull(formData, "noteSoin"),
      antecedents: champTexteOuNull(formData, "antecedents"),
      traitements_en_cours: champTexteOuNull(formData, "traitementsEnCours"),
    })
    .eq("id", patientId);

  if (error) journaliserEchec("updatePatientAction", error);

  revalidatePath(`/patients/${patientId}`);
}

export async function createSoinPrescritAction(formData: FormData): Promise<void> {
  const patientId = String(formData.get("patientId") ?? "");
  const typeSoin = String(formData.get("typeSoin") ?? "");
  const frequenceType = String(formData.get("frequenceType") ?? "") as FrequenceSoin;
  const heuresBrut = String(formData.get("heures") ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  const dateDebut = String(formData.get("dateDebut") ?? "");
  const dateFin = champTexteOuNull(formData, "dateFin");
  // Cotation facultative : un soin peut exister sans code NGAP.
  const ngapCodeId = champTexteOuNull(formData, "ngapCodeId");

  const heuresValides = heuresBrut.length > 0 && heuresBrut.every((h) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h));

  if (!patientId || !typeSoin || !frequenceType || !dateDebut || !heuresValides) return;
  if (dateFin && dateFin < dateDebut) return;

  let joursSemaine: number[] | null = null;
  let intervalleJours: number | null = null;

  if (frequenceType === "jours_semaine") {
    joursSemaine = formData.getAll("joursSemaine").map(Number);
    if (joursSemaine.length === 0) return;
  } else if (frequenceType === "tous_les_x_jours") {
    const valeur = Number(formData.get("intervalleJours"));
    if (!valeur || valeur < 1) return;
    intervalleJours = valeur;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { error } = await supabase
    .from("soins_prescrits")
    .insert({
      patient_id: patientId,
      idel_id: user.id,
      type_soin: typeSoin,
      frequence_type: frequenceType,
      jours_semaine: joursSemaine,
      intervalle_jours: intervalleJours,
      heures: heuresBrut,
      date_debut: dateDebut,
      date_fin: dateFin,
      ngap_code_id: ngapCodeId,
    })
    .select("id")
    .single();

  if (error) journaliserEchec("createSoinPrescritAction", error);
  if (error) return;

  revalidatePath(`/patients/${patientId}`);
}

export async function arreterSoinPrescritAction(formData: FormData): Promise<void> {
  const soinId = String(formData.get("soinId"));
  const patientId = String(formData.get("patientId"));

  const supabase = await createClient();

  const { error } = await supabase.from("soins_prescrits").update({ actif: false }).eq("id", soinId);

  if (error) journaliserEchec("arreterSoinPrescritAction", error);

  revalidatePath(`/patients/${patientId}`);
}

export async function coterSoinPrescritAction(formData: FormData): Promise<void> {
  const soinId = champTexteOuNull(formData, "soinId");
  const patientId = champTexteOuNull(formData, "patientId");

  if (!soinId || !patientId) return;

  // Cotation facultative : l'option vide décote le soin. Une chaîne vide
  // violerait la clé étrangère vers ngap_codes.
  const ngapCodeId = champTexteOuNull(formData, "ngapCodeId");

  const supabase = await createClient();

  // La propriété du soin est garantie par la politique RLS
  // soins_prescrits_owner_all : la redoubler ici laisserait croire que la
  // sécurité se joue dans ce fichier.
  const { error } = await supabase
    .from("soins_prescrits")
    .update({ ngap_code_id: ngapCodeId })
    .eq("id", soinId);

  if (error) journaliserEchec("coterSoinPrescritAction", error);

  revalidatePath(`/patients/${patientId}`);
}
