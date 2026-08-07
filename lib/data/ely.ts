import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import type { ReponseEly, SituationTerrain } from "@/lib/types/clinical";
import { searchSituationsTerrain } from "@/lib/data/recherche";
import { getTourneeDuJour, getMissionsDuJour } from "@/lib/data/ma-journee";
import { filtrerNomsPatients } from "@/lib/ely-redaction";
import { synthetiserReponseEly } from "@/lib/data/ely-synthese";
import { journaliserEchec } from "@/lib/journal";

/**
 * Réponse d'Ely à une question : la fiche brute la mieux classée (repli
 * garanti), et une synthèse LLM quand elle a pu être produite en toute
 * sécurité. Le garde-fou est dans le try/catch : toute panne pendant la
 * détermination de la liste des patients du jour (pas de tournée, erreur
 * de lecture) empêche l'appel au LLM plutôt que de l'appeler sans filtrage.
 */
export async function obtenirReponseEly(
  supabase: SupabaseClient<Database>,
  question: string,
  idelId: string | null
): Promise<ReponseEly> {
  let situationBrute: SituationTerrain | null = null;
  let resultatRechercheReussi = false;

  try {
    const resultats = await searchSituationsTerrain(supabase, question);
    resultatRechercheReussi = true;
    situationBrute = resultats[0] ?? null;

    if (resultats.length === 0 || !idelId) {
      return { situationBrute, situationsSources: [], synthese: null };
    }

    const tournee = await getTourneeDuJour(supabase, idelId);
    if (!tournee) return { situationBrute, situationsSources: [], synthese: null };

    const missions = await getMissionsDuJour(supabase, tournee.id);
    const questionFiltree = filtrerNomsPatients(
      question,
      missions.map((m) => m.patientNom)
    );
    const situationsSources = resultats.slice(0, 3);
    const synthese = await synthetiserReponseEly(questionFiltree, situationsSources);

    return { situationBrute, situationsSources: synthese ? situationsSources : [], synthese };
  } catch (erreur) {
    journaliserEchec("obtenirReponseEly", erreur);
    // Si la recherche a échoué, repli complet (pas de situationBrute)
    // Sinon, repli avec situationBrute qu'on a pu déterminer
    return resultatRechercheReussi
      ? { situationBrute, situationsSources: [], synthese: null }
      : { situationBrute: null, situationsSources: [], synthese: null };
  }
}
