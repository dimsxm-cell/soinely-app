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
