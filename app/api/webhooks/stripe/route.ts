import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

const STATUT_PAR_STRIPE: Record<string, string> = {
  trialing: "essai",
  active: "actif",
  past_due: "impaye",
  unpaid: "impaye",
  incomplete: "impaye",
  incomplete_expired: "annule",
  canceled: "annule",
};

function getPlan(priceId: string): "solo" | "cabinet" {
  return priceId === process.env.STRIPE_PRICE_ID_CABINET ? "cabinet" : "solo";
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const profileId = session.client_reference_id;

    if (profileId && session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
      const item = subscription.items.data[0];
      const priceId = item.price.id;

      const { error } = await supabase.from("abonnements").upsert(
        {
          profile_id: profileId,
          plan: getPlan(priceId),
          statut: STATUT_PAR_STRIPE[subscription.status] ?? "essai",
          stripe_customer_id: String(session.customer),
          stripe_subscription_id: String(session.subscription),
          essai_fin: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
          periode_fin: new Date(item.current_period_end * 1000).toISOString(),
        },
        { onConflict: "profile_id" }
      );

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const item = subscription.items.data[0];

    const { error } = await supabase
      .from("abonnements")
      .update({
        statut: STATUT_PAR_STRIPE[subscription.status] ?? "annule",
        periode_fin: new Date(item.current_period_end * 1000).toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
