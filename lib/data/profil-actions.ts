"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { journaliserEchec } from "@/lib/journal";
import { geocoderAdresse } from "@/lib/geocodage";

const BUCKET_AVATARS = "avatars";

export async function uploadAvatarAction(formData: FormData): Promise<void> {
  const photo = formData.get("photo");

  if (!(photo instanceof File) || photo.size === 0) return;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const extension = photo.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/avatar.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_AVATARS)
    .upload(path, photo, { upsert: true, contentType: photo.type });

  if (uploadError) {
    journaliserEchec("uploadAvatarAction", uploadError);
    return;
  }

  const { error } = await supabase.auth.updateUser({ data: { avatar_path: path } });

  if (error) journaliserEchec("uploadAvatarAction", error);

  revalidatePath("/compte");
}

/**
 * Enregistre le cabinet : son code postal et son adresse.
 *
 * Les deux gouvernent des montants distincts. Le code postal fixe la zone
 * tarifaire — sans lui, une IDEL de Guadeloupe verrait ses actes sous-évalués
 * de près de 5 % sans que rien ne le signale. L'adresse est l'origine des
 * trajets, donc des indemnités kilométriques.
 */
export async function enregistrerCabinetAction(formData: FormData): Promise<void> {
  const saisi = String(formData.get("codePostal") ?? "").trim();

  // Cinq chiffres, ou rien. Une saisie partielle rangerait le cabinet en
  // métropole par défaut, ce qui est plus discret qu'un refus mais fausserait
  // tous les montants — mieux vaut ne rien enregistrer.
  const codePostal = /^\d{5}$/.test(saisi) ? saisi : null;
  if (saisi !== "" && codePostal === null) return;

  const adresseSaisie = String(formData.get("adresseCabinet") ?? "").trim();
  const adresseCabinet = adresseSaisie === "" ? null : adresseSaisie;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // L'adresse est géocodée à la saisie, et non à chaque calcul de tournée :
  // celle d'un cabinet ne bouge pas. Si elle n'est pas située, la position est
  // effacée plutôt que laissée à l'ancienne, qui pointerait ailleurs.
  const position = adresseCabinet ? await geocoderAdresse(adresseCabinet) : null;

  const { error } = await supabase
    .from("profiles")
    .update({
      code_postal: codePostal,
      adresse_cabinet: adresseCabinet,
      cabinet_latitude: position?.latitude ?? null,
      cabinet_longitude: position?.longitude ?? null,
    })
    .eq("id", user.id);

  if (error) {
    journaliserEchec("enregistrerCabinetAction", error);
    return;
  }

  revalidatePath("/compte");
  // La tournée affiche les montants : ils changent avec la zone et l'origine
  // des trajets.
  revalidatePath("/ma-tournee");
}
