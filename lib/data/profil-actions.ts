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
