"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calculerOrdreVisites, type VisiteAPositionner } from "@/lib/data/generation-tournee";
import type { ResultatEcriture } from "@/lib/data/ma-journee-actions";
import type { Coordonnees } from "@/lib/geocodage";
import { journaliserEchec } from "@/lib/journal";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type PatientCoordsRow = { latitude: number | null; longitude: number | null };

function coordsDepuisEmbed(embed: unknown): PatientCoordsRow | null {
  if (!embed) return null;
  return Array.isArray(embed) ? ((embed[0] as PatientCoordsRow) ?? null) : (embed as PatientCoordsRow);
}

/**
 * Point de départ du calcul : la mission en cours, sinon la dernière
 * terminée, sinon le cabinet. Jamais la position GPS actuelle — décision
 * actée pour ne demander aucune permission supplémentaire.
 */
async function trouverOrigine(
  supabase: SupabaseServerClient,
  tourneeId: string,
  idelId: string
): Promise<Coordonnees | null> {
  const { data: enCours, error: enCoursError } = await supabase
    .from("missions_du_jour")
    .select("patients(latitude, longitude)")
    .eq("tournee_id", tourneeId)
    .eq("statut", "en_cours")
    .limit(1)
    .maybeSingle();

  if (enCoursError) {
    journaliserEchec("trouverOrigine", enCoursError);
  }

  const coordsEnCours = coordsDepuisEmbed((enCours as { patients: unknown } | null)?.patients);
  if (coordsEnCours?.latitude != null && coordsEnCours.longitude != null) {
    return { latitude: coordsEnCours.latitude, longitude: coordsEnCours.longitude };
  }

  const { data: derniereTerminee, error: derniereTermineeError } = await supabase
    .from("missions_du_jour")
    .select("patients(latitude, longitude)")
    .eq("tournee_id", tourneeId)
    .eq("statut", "terminee")
    .order("heure_prevue", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (derniereTermineeError) {
    journaliserEchec("trouverOrigine", derniereTermineeError);
  }

  const coordsTerminee = coordsDepuisEmbed((derniereTerminee as { patients: unknown } | null)?.patients);
  if (coordsTerminee?.latitude != null && coordsTerminee.longitude != null) {
    return { latitude: coordsTerminee.latitude, longitude: coordsTerminee.longitude };
  }

  const { data: profil, error: profilError } = await supabase
    .from("profiles")
    .select("cabinet_latitude, cabinet_longitude")
    .eq("id", idelId)
    .maybeSingle();

  if (profilError) {
    journaliserEchec("trouverOrigine", profilError);
  }

  const p = profil as { cabinet_latitude: number | null; cabinet_longitude: number | null } | null;
  if (p?.cabinet_latitude != null && p.cabinet_longitude != null) {
    return { latitude: p.cabinet_latitude, longitude: p.cabinet_longitude };
  }

  return null;
}

/**
 * Recalcule et écrit l'ordre de passage des visites restantes du jour.
 *
 * Déclenchement manuel uniquement — aucune détection automatique
 * d'imprévu. `heure_prevue` n'est jamais modifiée.
 */
export async function reorganiserTourneeAction(formData: FormData): Promise<ResultatEcriture> {
  const tourneeId = String(formData.get("tourneeId"));

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { succes: false, erreur: "Vous devez être connectée." };

  const { data: aFaire, error: aFaireError } = await supabase
    .from("missions_du_jour")
    .select("id, patients(latitude, longitude)")
    .eq("tournee_id", tourneeId)
    .eq("statut", "a_faire");

  if (aFaireError) {
    journaliserEchec("reorganiserTourneeAction", aFaireError);
    return { succes: false, erreur: `La réorganisation a échoué : ${aFaireError.message}` };
  }

  const missions = (aFaire ?? []) as { id: string; patients: unknown }[];
  if (missions.length < 2) {
    return { succes: false, erreur: "Il faut au moins deux visites à faire pour réorganiser la tournée." };
  }

  const origine = await trouverOrigine(supabase, tourneeId, user.id);
  if (!origine) {
    return { succes: false, erreur: "Pas assez d'adresses localisées pour réorganiser la tournée." };
  }

  const visites: VisiteAPositionner[] = missions.map((mission) => {
    const coords = coordsDepuisEmbed(mission.patients);
    return {
      missionId: mission.id,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
    };
  });

  const ordre = await calculerOrdreVisites(origine, visites);

  // Une mission numérotée puis terminée (ou passée en cours, ou absente)
  // entre deux réorganisations garderait sinon son ancien ordre_visite : deux
  // missions afficheraient le même numéro, et la terminée s'intercalerait
  // parmi les visites à venir dans le tri de /ma-journee. Invariant documenté
  // dans lib/data/ma-journee.ts : hors "à faire", ordre_visite reste nul.
  const { error: resetError } = await supabase
    .from("missions_du_jour")
    .update({ ordre_visite: null })
    .eq("tournee_id", tourneeId)
    .neq("statut", "a_faire");

  if (resetError) {
    journaliserEchec("reorganiserTourneeAction — remise a zero", resetError);
    return { succes: false, erreur: "La réorganisation a échoué. Réessayez." };
  }

  const resultats = await Promise.all(
    ordre.map((missionId, index) =>
      supabase.from("missions_du_jour").update({ ordre_visite: index + 1 }).eq("id", missionId)
    )
  );

  const echec = resultats.find((r) => (r as { error: unknown }).error);
  if (echec) {
    journaliserEchec("reorganiserTourneeAction — écriture de l'ordre", (echec as { error: unknown }).error);
    return { succes: false, erreur: "La réorganisation a partiellement échoué. Réessayez." };
  }

  revalidatePath("/ma-journee");
  revalidatePath("/ma-tournee");
  return { succes: true };
}
