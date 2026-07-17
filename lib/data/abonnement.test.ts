import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("getAbonnement", () => {
  it("retourne l'abonnement du profil s'il existe", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: {
                  plan: "solo",
                  statut: "essai",
                  essai_fin: "2026-07-31T00:00:00.000Z",
                  periode_fin: "2026-07-31T00:00:00.000Z",
                  stripe_customer_id: "cus_1",
                },
                error: null,
              }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getAbonnement } = await import("./abonnement");
    const abonnement = await getAbonnement(fakeClient, "p1");

    expect(abonnement).toEqual({
      plan: "solo",
      statut: "essai",
      essaiFin: "2026-07-31T00:00:00.000Z",
      periodeFin: "2026-07-31T00:00:00.000Z",
      stripeCustomerId: "cus_1",
    });
  });

  it("retourne null si le profil n'a pas encore d'abonnement", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getAbonnement } = await import("./abonnement");
    const abonnement = await getAbonnement(fakeClient, "p1");

    expect(abonnement).toBeNull();
  });
});
