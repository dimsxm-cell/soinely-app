"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getAbonnement } from "@/lib/data/abonnement";
import type { PlanAbonnement } from "@/lib/types/abonnement";

function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-06-24.dahlia" });
}

function getPriceId(plan: string): string | null {
  if (plan === "solo") return process.env.STRIPE_PRICE_ID_SOLO ?? null;
  if (plan === "cabinet") return process.env.STRIPE_PRICE_ID_CABINET ?? null;
  return null;
}

export async function createCheckoutSessionAction(formData: FormData): Promise<void> {
  const plan = String(formData.get("plan")) as PlanAbonnement;
  const priceId = getPriceId(plan);

  if (!priceId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: abonnementExistant } = await supabase
    .from("abonnements")
    .select("stripe_customer_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: abonnementExistant?.stripe_customer_id ?? undefined,
    customer_email: abonnementExistant?.stripe_customer_id ? undefined : user.email,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { trial_period_days: 14 },
    success_url: `${origin}/abonnement/succes`,
    cancel_url: `${origin}/abonnement`,
  });

  if (session.url) {
    redirect(session.url);
  }
}

export async function createBillingPortalSessionAction(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const abonnement = await getAbonnement(supabase, user.id);

  if (!abonnement?.stripeCustomerId) return;

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: abonnement.stripeCustomerId,
    return_url: `${origin}/compte`,
  });

  redirect(session.url);
}
