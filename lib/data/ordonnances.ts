import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { journaliserEchec } from "@/lib/journal";

const BUCKET_ORDONNANCES = "ordonnances";

/**
 * Durée de vie d'une URL signée, en secondes.
 *
 * Une heure : le temps de consulter l'ordonnance pendant la visite, sans
 * qu'un lien copié reste ouvert indéfiniment sur une donnée de santé.
 */
const DUREE_URL_SIGNEE_S = 3600;

export interface Ordonnance {
  id: string;
  /** URL signée, temporaire. `null` si le fichier n'a pas pu être servi. */
  url: string | null;
  /** Vrai pour un PDF, qui ne s'affiche pas comme une image. */
  estPdf: boolean;
  datePrescription: string | null;
  note: string | null;
  ajouteeLe: string;
}

/**
 * Ordonnances d'un patient, de la plus récente à la plus ancienne.
 *
 * Ne lève jamais : une ordonnance illisible ne doit pas emporter la page de
 * prescriptions, qui porte aussi les soins en cours.
 */
export async function getOrdonnances(
  supabase: SupabaseClient<Database>,
  patientId: string
): Promise<Ordonnance[]> {
  const { data, error } = await supabase
    .from("ordonnances")
    .select("id, fichier_path, date_prescription, note, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (error) journaliserEchec("getOrdonnances", error);
  if (!data || data.length === 0) return [];

  // Les URL sont signées en une fois : une requête par ordonnance ferait
  // autant d'allers-retours que de photos.
  const { data: signees, error: erreurSignature } = await supabase.storage
    .from(BUCKET_ORDONNANCES)
    .createSignedUrls(
      data.map((row) => row.fichier_path),
      DUREE_URL_SIGNEE_S
    );

  if (erreurSignature) journaliserEchec("getOrdonnances (signature)", erreurSignature);

  const urlParChemin = new Map(
    (signees ?? []).map((signee) => [signee.path ?? "", signee.signedUrl])
  );

  return data.map((row) => ({
    id: row.id,
    url: urlParChemin.get(row.fichier_path) ?? null,
    estPdf: row.fichier_path.toLowerCase().endsWith(".pdf"),
    datePrescription: row.date_prescription,
    note: row.note,
    ajouteeLe: row.created_at,
  }));
}
