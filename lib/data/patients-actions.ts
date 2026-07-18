"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function champTexteOuNull(formData: FormData, nom: string): string | null {
  const valeur = String(formData.get(nom) ?? "");
  return valeur || null;
}

export async function createPatientAction(formData: FormData): Promise<void> {
  const nomComplet = String(formData.get("nomComplet") ?? "");
  const adresse = String(formData.get("adresse") ?? "");
  const telephone = String(formData.get("telephone") ?? "");

  if (!nomComplet || !adresse || !telephone) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: patient, error } = await supabase
    .from("patients")
    .insert({
      idel_id: user.id,
      nom_complet: nomComplet,
      adresse,
      telephone,
      date_naissance: champTexteOuNull(formData, "dateNaissance"),
      allergies: champTexteOuNull(formData, "allergies"),
      consignes: champTexteOuNull(formData, "consignes"),
      medecin_nom: champTexteOuNull(formData, "medecinNom"),
      medecin_telephone: champTexteOuNull(formData, "medecinTelephone"),
      contact_urgence_nom: champTexteOuNull(formData, "contactUrgenceNom"),
      contact_urgence_telephone: champTexteOuNull(formData, "contactUrgenceTelephone"),
      antecedents: champTexteOuNull(formData, "antecedents"),
      traitements_en_cours: champTexteOuNull(formData, "traitementsEnCours"),
    })
    .select("id")
    .single();

  if (error || !patient) return;

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

  await supabase
    .from("patients")
    .update({
      nom_complet: nomComplet,
      adresse,
      telephone,
      date_naissance: champTexteOuNull(formData, "dateNaissance"),
      allergies: champTexteOuNull(formData, "allergies"),
      consignes: champTexteOuNull(formData, "consignes"),
      medecin_nom: champTexteOuNull(formData, "medecinNom"),
      medecin_telephone: champTexteOuNull(formData, "medecinTelephone"),
      contact_urgence_nom: champTexteOuNull(formData, "contactUrgenceNom"),
      contact_urgence_telephone: champTexteOuNull(formData, "contactUrgenceTelephone"),
      antecedents: champTexteOuNull(formData, "antecedents"),
      traitements_en_cours: champTexteOuNull(formData, "traitementsEnCours"),
    })
    .eq("id", patientId);

  revalidatePath(`/patients/${patientId}`);
}
