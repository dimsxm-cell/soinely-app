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

interface SaisiesProfessionnelles {
  /** Absent : la colonne `full_name` n'est pas touchée. */
  nom?: string;
  codePostal: string;
  adresse: string;
  telephone: string;
  adeliRpps: string;
}

/**
 * Écrit les coordonnées professionnelles du profil.
 *
 * Partagée par les deux points d'entrée — l'écran /compte et la barre
 * d'impression — parce qu'aucune des gardes qu'elle porte n'est propre à l'un
 * ou à l'autre. Le code postal fixe la zone tarifaire : amputé, il range le
 * cabinet en métropole et sous-cote les actes d'une IDEL des DOM de près de
 * 5 % sans rien signaler. L'adresse est l'origine des trajets : changée sans
 * re-géocodage, elle laisse les indemnités kilométriques partir de l'ancien
 * cabinet. Ces deux gardes n'ont d'abord existé que sur le chemin /compte,
 * que la barre d'impression contournait.
 */
async function enregistrerProfilProfessionnel(
  saisies: SaisiesProfessionnelles,
  nomAction: string
): Promise<ResultatCabinet> {
  // Les espaces d'une saisie au doigt ne doivent pas faire échouer un code
  // postal par ailleurs correct.
  const saisi = saisies.codePostal.replace(/\s/g, "");

  // Cinq chiffres, ou rien. Une saisie partielle rangerait le cabinet en
  // métropole par défaut, ce qui fausserait tous les montants sans le dire.
  const codePostal = /^\d{5}$/.test(saisi) ? saisi : null;
  if (saisi !== "" && codePostal === null) {
    return { succes: false, erreur: "Le code postal doit comporter cinq chiffres." };
  }

  const adresseSaisie = saisies.adresse.trim();
  const adresseCabinet = adresseSaisie === "" ? null : adresseSaisie;

  // Champs libres : ni format ni longueur imposés. Un numéro se note « 0690 12
  // 34 56 » comme « +590690123456 », et un ADELI comme un RPPS n'ont pas la
  // même longueur — refuser une saisie ici ferait perdre une coordonnée juste
  // parce qu'elle est écrite autrement.
  const telephoneSaisi = saisies.telephone.trim();
  const telephone = telephoneSaisi === "" ? null : telephoneSaisi;

  const adeliSaisi = saisies.adeliRpps.trim();
  const adeliRpps = adeliSaisi === "" ? null : adeliSaisi;

  // Un nom vidé n'efface pas celui du profil : `full_name` est `not null`, et
  // la feuille sortirait sans nom professionnel — ou avec l'adresse e-mail à
  // sa place, imprimée sous les yeux du patient.
  const nomSaisi = saisies.nom?.trim();
  const nom = nomSaisi ? nomSaisi : null;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { succes: false, erreur: "Vous devez être connectée." };

  // L'adresse est géocodée à la saisie, et non à chaque calcul de tournée :
  // celle d'un cabinet ne bouge pas. Si elle n'est pas située, la position est
  // effacée plutôt que laissée à l'ancienne, qui pointerait ailleurs.
  // `geocoderAdresse` ne lève jamais : réseau coupé, elle rend `null`.
  const position = adresseCabinet ? await geocoderAdresse(adresseCabinet) : null;

  // `select` après l'écriture : un update qui ne trouve aucune ligne ne lève
  // pas d'erreur. Sans ce retour, un profil absent passerait pour un
  // enregistrement réussi, et le champ reviendrait vide sans explication.
  const { data, error } = await supabase
    .from("profiles")
    .update({
      ...(nom === null ? {} : { full_name: nom }),
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
    journaliserEchec(nomAction, error);
    return { succes: false, erreur: `L'enregistrement a échoué : ${error.message}` };
  }

  if (!data || data.length === 0) {
    return {
      succes: false,
      erreur: "Votre profil est introuvable. Signalez-le, il doit être recréé.",
    };
  }

  // Le nom de l'IDEL est imprimé deux fois sur la même feuille : le bloc de
  // coordonnées le lit dans `profiles`, l'en-tête et le bloc signature dans
  // les métadonnées d'authentification. Sans cette propagation, un nom corrigé
  // ici sortirait à un endroit et l'ancien à l'autre — sur le bloc que le
  // patient signe.
  if (nom !== null) {
    try {
      const { error: erreurMetadonnees } = await supabase.auth.updateUser({
        data: { full_name: nom },
      });
      // Le profil, lui, est déjà écrit. Annoncer un échec ferait recommencer
      // une IDEL pour rien ; le journal garde la trace de la désynchronisation.
      if (erreurMetadonnees) journaliserEchec(`${nomAction} (métadonnées)`, erreurMetadonnees);
    } catch (erreur) {
      journaliserEchec(`${nomAction} (métadonnées)`, erreur);
    }
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
  // L'écran /compte ne modifie pas le nom : `nom` reste absent, et la colonne
  // `full_name` hors de l'update.
  return enregistrerProfilProfessionnel(
    {
      codePostal: String(formData.get("codePostal") ?? ""),
      adresse: String(formData.get("adresseCabinet") ?? ""),
      telephone: String(formData.get("telephone") ?? ""),
      adeliRpps: String(formData.get("adeliRpps") ?? ""),
    },
    "enregistrerCabinetAction"
  );
}

/**
 * Enregistre les coordonnées imprimables dans le profil, à la demande.
 *
 * Mêmes règles que `enregistrerCabinetAction` — elle écrit les mêmes colonnes,
 * qui gouvernent les mêmes montants. Ne s'en distingue que par le nom, qu'elle
 * seule peut modifier, et par les noms des champs du formulaire.
 *
 * Un échec ici n'empêche pas d'imprimer : la barre d'impression appelle cette
 * action dans un `try/catch/finally` dont le `finally` lance `window.print()`.
 */
export async function enregistrerCoordonneesPraticienAction(
  formData: FormData
): Promise<ResultatCabinet> {
  return enregistrerProfilProfessionnel(
    {
      nom: String(formData.get("nom") ?? ""),
      codePostal: String(formData.get("codePostal") ?? ""),
      adresse: String(formData.get("adresse") ?? ""),
      telephone: String(formData.get("telephone") ?? ""),
      adeliRpps: String(formData.get("adeliRpps") ?? ""),
    },
    "enregistrerCoordonneesPraticienAction"
  );
}
