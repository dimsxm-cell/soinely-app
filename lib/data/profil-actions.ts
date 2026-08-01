"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { journaliserEchec } from "@/lib/journal";

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
 * Enregistre le code postal du cabinet.
 *
 * Il ne sert pas à écrire une adresse mais à déterminer la zone tarifaire :
 * les tarifs NGAP des DOM sont supérieurs à ceux de la métropole, et sans
 * cette information une IDEL de Guadeloupe verrait ses actes sous-évalués de
 * près de 5 % sans que rien ne le signale.
 */
export async function enregistrerCodePostalAction(formData: FormData): Promise<void> {
  const saisi = String(formData.get("codePostal") ?? "").trim();

  // Cinq chiffres, ou rien. Une saisie partielle rangerait le cabinet en
  // métropole par défaut, ce qui est plus discret qu'un refus mais fausserait
  // tous les montants — mieux vaut ne rien enregistrer.
  const codePostal = /^\d{5}$/.test(saisi) ? saisi : null;
  if (saisi !== "" && codePostal === null) return;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { error } = await supabase
    .from("profiles")
    .update({ code_postal: codePostal })
    .eq("id", user.id);

  if (error) {
    journaliserEchec("enregistrerCodePostalAction", error);
    return;
  }

  revalidatePath("/compte");
  // La tournée affiche les montants : ils changent avec la zone.
  revalidatePath("/ma-tournee");
}
