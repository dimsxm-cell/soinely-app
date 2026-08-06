import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { echouer } from "@/lib/journal";

export interface MaterielItem {
  libelle: string;
  quantite: number;
}

type MissionAvecActes = { actes_mission: { ngap_code_id: string | null }[] };
type MaterielRow = { ngap_code_id: string; libelle: string; quantite: number };

/**
 * Matériel nécessaire pour la tournée du jour, déduit des actes planifiés
 * et agrégé par article (quantités sommées sur toutes les occurrences).
 *
 * Les actes sans code NGAP, ou dont le code n'a pas de matériel associé
 * dans materiel_ngap, sont simplement absents du résultat — pas d'erreur.
 */
export async function getMaterielDuJour(
  supabase: SupabaseClient<Database>,
  tourneeId: string
): Promise<MaterielItem[]> {
  const { data, error } = await supabase
    .from("missions_du_jour")
    .select("actes_mission(ngap_code_id)")
    .eq("tournee_id", tourneeId);

  if (error) echouer("getMaterielDuJour", error);
  if (!data) return [];

  const codeIds = (data as MissionAvecActes[])
    .flatMap((mission) => mission.actes_mission)
    .map((acte) => acte.ngap_code_id)
    .filter((id): id is string => id !== null);

  if (codeIds.length === 0) return [];

  const { data: materiel, error: materielError } = await supabase
    .from("materiel_ngap")
    .select("ngap_code_id, libelle, quantite")
    .in("ngap_code_id", [...new Set(codeIds)]);

  if (materielError) echouer("getMaterielDuJour", materielError);
  if (!materiel) return [];

  const totaux = new Map<string, number>();
  for (const codeId of codeIds) {
    for (const item of materiel as MaterielRow[]) {
      if (item.ngap_code_id === codeId) {
        totaux.set(item.libelle, (totaux.get(item.libelle) ?? 0) + item.quantite);
      }
    }
  }

  return [...totaux.entries()]
    .map(([libelle, quantite]) => ({ libelle, quantite }))
    .sort((a, b) => a.libelle.localeCompare(b.libelle));
}
