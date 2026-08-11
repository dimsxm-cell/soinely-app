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

  // Champs libres : ni format ni longueur imposés. Un numéro se note « 0690 12
  // 34 56 » comme « +590690123456 », et un ADELI comme un RPPS n'ont pas la
  // même longueur — refuser une saisie ici ferait perdre une coordonnée juste
  // parce qu'elle est écrite autrement.
  const telephoneSaisi = String(formData.get("telephone") ?? "").trim();
  const telephone = telephoneSaisi === "" ? null : telephoneSaisi;

  const adeliSaisi = String(formData.get("adeliRpps") ?? "").trim();
  const adeliRpps = adeliSaisi === "" ? null : adeliSaisi;

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
      telephone,
      adeli_rpps: adeliRpps,
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

/**
 * Enregistre les coordonnées imprimables dans le profil, à la demande.
 *
 * Distincte de `enregistrerCabinetAction` : celle-ci géocode l'adresse, ce qui
 * n'a pas lieu d'être quand l'IDEL corrige une coordonnée juste avant
 * d'imprimer. Un échec ici n'empêche pas d'imprimer — la valeur saisie reste
 * valable pour l'impression en cours.
 */
export async function enregistrerCoordonneesPraticienAction(
  formData: FormData
): Promise<ResultatCabinet> {
  const valeurOuNull = (clef: string) => {
    const v = String(formData.get(clef) ?? "").trim();
    return v === "" ? null : v;
  };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { succes: false, erreur: "Vous devez être connectée." };

  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: String(formData.get("nom") ?? "").trim() || user.email || "",
      adresse_cabinet: valeurOuNull("adresse"),
      code_postal: valeurOuNull("codePostal"),
      telephone: valeurOuNull("telephone"),
      adeli_rpps: valeurOuNull("adeliRpps"),
    })
    .eq("id", user.id)
    .select("id");

  if (error) {
    journaliserEchec("enregistrerCoordonneesPraticienAction", error);
    return { succes: false, erreur: `L'enregistrement a échoué : ${error.message}` };
  }

  if (!data || data.length === 0) {
    return { succes: false, erreur: "Votre profil est introuvable. Signalez-le, il doit être recréé." };
  }

  revalidatePath("/compte");
  return { succes: true };
}
