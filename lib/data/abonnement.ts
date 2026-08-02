import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import type { Abonnement, PlanAbonnement, StatutAbonnement } from "@/lib/types/abonnement";
import { journaliserEchec } from "@/lib/journal";

/**
 * Durée de l'essai gratuit, en jours.
 *
 * Un an pendant la bêta privée. La page d'accueil promet « accès complet à
 * toutes les fonctionnalités pendant la bêta, sans frais » : à quinze jours,
 * chaque testeur se heurtait à la page d'abonnement deux semaines après son
 * inscription, ce que rien ne lui avait annoncé.
 *
 * L'essai se comptant depuis la création du compte, changer ce nombre vaut
 * pour tous les comptes existants, sans reprise de données.
 *
 * À ramener à 15 le jour où les paiements s'ouvrent.
 */
export const DUREE_ESSAI_GRATUIT_JOURS = 365;

export function getJoursRestantsEssaiGratuit(dateCreationCompte: string): number {
  const joursEcoules = (Date.now() - new Date(dateCreationCompte).getTime()) / 86_400_000;
  return Math.max(0, Math.ceil(DUREE_ESSAI_GRATUIT_JOURS - joursEcoules));
}

export function estDansEssaiGratuit(dateCreationCompte: string): boolean {
  return getJoursRestantsEssaiGratuit(dateCreationCompte) > 0;
}

export async function getAbonnement(
  supabase: SupabaseClient<Database>,
  profileId: string
): Promise<Abonnement | null> {
  const { data, error } = await supabase
    .from("abonnements")
    .select("plan, statut, essai_fin, periode_fin, stripe_customer_id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) journaliserEchec("getAbonnement", error);
  if (error || !data) return null;

  return {
    plan: data.plan as PlanAbonnement,
    statut: data.statut as StatutAbonnement,
    essaiFin: data.essai_fin,
    periodeFin: data.periode_fin,
    stripeCustomerId: data.stripe_customer_id,
  };
}
