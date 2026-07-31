import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

export interface CodeNgap {
  id: string;
  code: string;
  libelle: string;
}

export async function getCodesNgap(supabase: SupabaseClient<Database>): Promise<CodeNgap[]> {
  const { data, error } = await supabase
    .from("ngap_codes")
    .select("id, code, libelle")
    .order("code");

  if (error || !data) return [];

  return data.map((row) => ({ id: row.id, code: row.code, libelle: row.libelle }));
}
