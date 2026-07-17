import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import type { Abonnement, PlanAbonnement, StatutAbonnement } from "@/lib/types/abonnement";

export async function getAbonnement(
  supabase: SupabaseClient<Database>,
  profileId: string
): Promise<Abonnement | null> {
  const { data, error } = await supabase
    .from("abonnements")
    .select("plan, statut, essai_fin, periode_fin, stripe_customer_id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    plan: data.plan as PlanAbonnement,
    statut: data.statut as StatutAbonnement,
    essaiFin: data.essai_fin,
    periodeFin: data.periode_fin,
    stripeCustomerId: data.stripe_customer_id,
  };
}
