import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { journaliserEchec } from "@/lib/journal";

const BUCKET_AVATARS = "avatars";

export async function getAvatarUrl(
  supabase: SupabaseClient<Database>,
  path: string
): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET_AVATARS).createSignedUrl(path, 300);

  if (error) journaliserEchec("getAvatarUrl", error);
  if (error || !data) return null;

  return data.signedUrl;
}

export interface CoordonneesPraticien {
  nom: string;
  adresse: string;
  codePostal: string;
  telephone: string;
  adeliRpps: string;
}

const COORDONNEES_VIDES: CoordonneesPraticien = {
  nom: "",
  adresse: "",
  codePostal: "",
  telephone: "",
  adeliRpps: "",
};

/**
 * Coordonnées professionnelles imprimées sur les documents émis par l'IDEL.
 *
 * Rend toujours un objet, jamais `null` : un profil incomplet n'est pas une
 * erreur, et le bloc imprimé n'a ainsi qu'un seul cas à traiter — une chaîne
 * vide se teste, un `null` se serait propagé jusqu'au rendu.
 */
export async function getCoordonneesPraticien(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<CoordonneesPraticien> {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, adresse_cabinet, code_postal, telephone, adeli_rpps")
    .eq("id", userId)
    .maybeSingle();

  if (error) journaliserEchec("getCoordonneesPraticien", error);
  if (error || !data) return COORDONNEES_VIDES;

  return {
    nom: data.full_name ?? "",
    adresse: data.adresse_cabinet ?? "",
    codePostal: data.code_postal ?? "",
    telephone: data.telephone ?? "",
    adeliRpps: data.adeli_rpps ?? "",
  };
}
