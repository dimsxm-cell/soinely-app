export type PlanAbonnement = "solo" | "cabinet";
export type StatutAbonnement = "essai" | "actif" | "impaye" | "annule";

export interface Abonnement {
  plan: PlanAbonnement;
  statut: StatutAbonnement;
  essaiFin: string | null;
  periodeFin: string | null;
  stripeCustomerId: string | null;
}
