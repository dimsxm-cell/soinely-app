import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import type {
  BlocContenuFiche,
  FicheDossierSoin,
  NiveauConfiance,
  SectionDossierSoin,
} from "@/lib/types/clinical";

type FicheDossierSoinRow = Database["public"]["Tables"]["fiches_dossier_soins"]["Row"];

export const SECTIONS_DOSSIER_SOINS: { valeur: SectionDossierSoin; label: string }[] = [
  { valeur: "identification_patient", label: "Identification du patient" },
  { valeur: "traitements", label: "Traitements" },
  { valeur: "surveillance_clinique", label: "Surveillance clinique" },
  { valeur: "protocoles_urgence", label: "Protocoles d'urgence (conduites à tenir)" },
  { valeur: "transmissions_infirmieres", label: "Transmissions infirmières" },
  { valeur: "prescriptions_liaisons_medicales", label: "Prescriptions et liaisons médicales" },
  { valeur: "administratif", label: "Administratif" },
  { valeur: "allergies_alertes", label: "Allergies et alertes" },
  { valeur: "contacts_utiles", label: "Contacts utiles" },
];

function mapFicheDossierSoin(row: FicheDossierSoinRow): FicheDossierSoin {
  return {
    id: row.id,
    section: row.section as SectionDossierSoin,
    titre: row.titre,
    resume: row.resume,
    contenu: row.contenu as unknown as BlocContenuFiche[],
    sources: row.sources as string[],
    ordre: row.ordre,
    niveauConfiance: row.niveau_confiance as NiveauConfiance,
    version: row.version,
    published: row.published,
  };
}

export async function getAllFichesDossierSoins(
  supabase: SupabaseClient<Database>
): Promise<FicheDossierSoin[]> {
  const { data, error } = await supabase
    .from("fiches_dossier_soins")
    .select("*")
    .eq("published", true)
    .order("section")
    .order("ordre");

  if (error || !data) return [];

  return data.map(mapFicheDossierSoin);
}

export async function getFicheDossierDetail(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<FicheDossierSoin | null> {
  const { data, error } = await supabase
    .from("fiches_dossier_soins")
    .select("*")
    .eq("id", id)
    .eq("published", true)
    .maybeSingle();

  if (error || !data) return null;

  return mapFicheDossierSoin(data);
}
