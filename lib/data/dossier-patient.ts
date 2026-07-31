import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import type { StatutMission } from "@/lib/types/clinical";
import { journaliserEchec } from "@/lib/journal";

/** Une visite passée ou prévue pour un patient, avec ce qui y a été consigné. */
export interface VisitePatient {
  id: string;
  date: string;
  heurePrevue: string;
  typeSoin: string;
  statut: StatutMission;
  transmission: string | null;
  rappel: string | null;
  photoPath: string | null;
}

type LigneVisite = {
  id: string;
  type_soin: string;
  heure_prevue: string;
  statut: string;
  transmission: string | null;
  rappel: string | null;
  photo_path: string | null;
  tournees: unknown;
};

function lireDateTournee(embed: unknown): string {
  // Supabase renvoie la table liée tantôt comme objet, tantôt comme tableau
  // selon la forme de la requête : les deux cas sont traités ici.
  const tournee = Array.isArray(embed) ? embed[0] : embed;
  return (tournee as { date?: string } | null)?.date ?? "";
}

/**
 * Toutes les visites d'un patient, de la plus récente à la plus ancienne.
 *
 * Sert à la fois au diagramme de soins (historique des passages) et aux
 * transmissions (ce que l'infirmier a noté lors de chaque visite).
 */
export async function getVisitesPatient(
  supabase: SupabaseClient<Database>,
  patientId: string
): Promise<VisitePatient[]> {
  const { data, error } = await supabase
    .from("missions_du_jour")
    .select("id, type_soin, heure_prevue, statut, transmission, rappel, photo_path, tournees(date)")
    .eq("patient_id", patientId);

  if (error) journaliserEchec("getVisitesPatient", error);
  if (error || !data) return [];

  return (data as LigneVisite[])
    .map((ligne) => ({
      id: ligne.id,
      date: lireDateTournee(ligne.tournees),
      heurePrevue: ligne.heure_prevue,
      typeSoin: ligne.type_soin,
      statut: ligne.statut as StatutMission,
      transmission: ligne.transmission,
      rappel: ligne.rappel,
      photoPath: ligne.photo_path,
    }))
    .sort((a, b) => (b.date + b.heurePrevue).localeCompare(a.date + a.heurePrevue));
}
