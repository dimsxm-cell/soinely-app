import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { journaliserEchec } from "@/lib/journal";
import type { ContexteTarifaire } from "@/lib/cotation";
import { determinerZone, type ValeursLettresCles } from "@/lib/zone-tarifaire";

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

/**
 * De quoi tarifer les actes d'une IDEL : la zone de son cabinet et la valeur
 * des lettres-clés.
 *
 * Ne lève jamais. Une nomenclature illisible ne doit pas emporter la page de
 * tournée avec elle : sans valeurs, le calcul se rabat sur les montants figés
 * du catalogue, c'est-à-dire les tarifs métropole. C'est aussi l'état normal
 * tant que la migration `zone_tarifaire` n'est pas appliquée.
 */
export async function getContexteTarifaire(
  supabase: SupabaseClient<Database>,
  idelId: string
): Promise<ContexteTarifaire> {
  const [profil, lettres] = await Promise.all([
    supabase.from("profiles").select("code_postal").eq("id", idelId).maybeSingle(),
    supabase.from("ngap_lettres_cles").select("lettre_cle, valeur_metropole, valeur_dom"),
  ]);

  if (profil.error) journaliserEchec("getContexteTarifaire (profil)", profil.error);
  if (lettres.error) journaliserEchec("getContexteTarifaire (lettres-clés)", lettres.error);

  const valeurs: ValeursLettresCles = new Map(
    (lettres.data ?? []).map((row) => [
      row.lettre_cle,
      {
        lettreCle: row.lettre_cle,
        valeurMetropole: Number(row.valeur_metropole),
        valeurDom: Number(row.valeur_dom),
      },
    ])
  );

  return { zone: determinerZone(profil.data?.code_postal), valeurs };
}
