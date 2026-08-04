"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { journaliserEchec } from "@/lib/journal";
import { geocoderAdresse } from "@/lib/geocodage";

const BUCKET_AVATARS = "avatars";

export interface ResultatCabinet {
  succes: boolean;
  erreur?: string;
}

/**
 * Change la photo de profil.
 *
 * Renonçait sans un mot : la photo choisie restait affichée dans le champ,
 * l'ancienne restait à l'écran, et rien ne disait laquelle des deux avait
 * gagné.
 */
export async function uploadAvatarAction(formData: FormData): Promise<ResultatCabinet> {
  const photo = formData.get("photo");

  if (!(photo instanceof File) || photo.size === 0) {
    return { succes: false, erreur: "Choisissez une photo." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { succes: false, erreur: "Vous devez être connectée." };

  const extension = photo.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/avatar.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_AVATARS)
    .upload(path, photo, { upsert: true, contentType: photo.type });

  if (uploadError) {
    journaliserEchec("uploadAvatarAction", uploadError);
    return { succes: false, erreur: "L'envoi a échoué. Vérifiez votre réseau et réessayez." };
  }

  const { error } = await supabase.auth.updateUser({ data: { avatar_path: path } });

  if (error) {
    journaliserEchec("uploadAvatarAction", error);
    return { succes: false, erreur: `La photo est envoyée mais n'a pas pu être rattachée : ${error.message}` };
  }

  revalidatePath("/compte");
  return { succes: true };
}

/**
 * Enregistre le cabinet : son code postal et son adresse.
 *
 * Les deux gouvernent des montants distincts. Le code postal fixe la zone
 * tarifaire — sans lui, une IDEL de Guadeloupe verrait ses actes sous-évalués
 * de près de 5 % sans que rien ne le signale. L'adresse est l'origine des
 * trajets, donc des indemnités kilométriques.
 */
export async function enregistrerCabinetAction(
  formData: FormData
): Promise<ResultatCabinet> {
  // Les espaces d'une saisie au doigt ne doivent pas faire échouer un code
  // postal par ailleurs correct.
  const saisi = String(formData.get("codePostal") ?? "").replace(/\s/g, "");

  // Cinq chiffres, ou rien. Une saisie partielle rangerait le cabinet en
  // métropole par défaut, ce qui fausserait tous les montants sans le dire.
  const codePostal = /^\d{5}$/.test(saisi) ? saisi : null;
  if (saisi !== "" && codePostal === null) {
    return { succes: false, erreur: "Le code postal doit comporter cinq chiffres." };
  }

  const adresseSaisie = String(formData.get("adresseCabinet") ?? "").trim();
  const adresseCabinet = adresseSaisie === "" ? null : adresseSaisie;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { succes: false, erreur: "Vous devez être connectée." };

  // L'adresse est géocodée à la saisie, et non à chaque calcul de tournée :
  // celle d'un cabinet ne bouge pas. Si elle n'est pas située, la position est
  // effacée plutôt que laissée à l'ancienne, qui pointerait ailleurs.
  const position = adresseCabinet ? await geocoderAdresse(adresseCabinet) : null;

  // `select` après l'écriture : un update qui ne trouve aucune ligne ne lève
  // pas d'erreur. Sans ce retour, un profil absent passerait pour un
  // enregistrement réussi, et le champ reviendrait vide sans explication.
  const { data, error } = await supabase
    .from("profiles")
    .update({
      code_postal: codePostal,
      adresse_cabinet: adresseCabinet,
      cabinet_latitude: position?.latitude ?? null,
      cabinet_longitude: position?.longitude ?? null,
    })
    .eq("id", user.id)
    .select("id");

  if (error) {
    journaliserEchec("enregistrerCabinetAction", error);
    return { succes: false, erreur: `L'enregistrement a échoué : ${error.message}` };
  }

  if (!data || data.length === 0) {
    return {
      succes: false,
      erreur: "Votre profil est introuvable. Signalez-le, il doit être recréé.",
    };
  }

  revalidatePath("/compte");
  // La tournée affiche les montants : ils changent avec la zone et l'origine
  // des trajets.
  revalidatePath("/ma-tournee");

  if (adresseCabinet && !position) {
    return {
      succes: true,
      erreur: "Adresse enregistrée, mais non localisée : vos kilomètres ne seront pas comptés.",
    };
  }

  return { succes: true };
}
