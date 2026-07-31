import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { journaliserEchec } from "@/lib/journal";

export interface CodeNgap {
  id: string;
  code: string;
  libelle: string;
}

export async function getCodesNgap(supabase: SupabaseClient<Database>): Promise<CodeNgap[]> {
  // Tri sur la lettre-clé puis le coefficient, et non sur le code affiché :
  // « AMI 14 » se rangerait entre « AMI 1 » et « AMI 2 », un tri texte
  // comparant les chiffres caractère par caractère. Les forfaits (BSA, BSB,
  // TLS, TLD) n'ont pas de coefficient et restent ordonnés par leur lettre.
  const { data, error } = await supabase
    .from("ngap_codes")
    .select("id, code, libelle")
    .order("lettre_cle")
    .order("coefficient");

  if (error) journaliserEchec("getCodesNgap", error);
  if (error || !data) return [];

  return data.map((row) => ({ id: row.id, code: row.code, libelle: row.libelle }));
}
