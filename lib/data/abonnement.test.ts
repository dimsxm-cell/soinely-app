import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("estDansEssaiGratuit", () => {
  it("retourne true si le compte a été créé il y a moins de 15 jours", async () => {
    const { estDansEssaiGratuit } = await import("./abonnement");

    const ilYA5Jours = new Date(Date.now() - 5 * 86_400_000).toISOString();

    expect(estDansEssaiGratuit(ilYA5Jours)).toBe(true);
  });

  it("retourne false si le compte a été créé il y a plus de 15 jours", async () => {
    const { estDansEssaiGratuit } = await import("./abonnement");

    const ilYA20Jours = new Date(Date.now() - 20 * 86_400_000).toISOString();

    expect(estDansEssaiGratuit(ilYA20Jours)).toBe(false);
  });
});

describe("getJoursRestantsEssaiGratuit", () => {
  it("calcule les jours restants avant la fin de l'essai gratuit", async () => {
    const { getJoursRestantsEssaiGratuit } = await import("./abonnement");

    const ilYA5Jours = new Date(Date.now() - 5 * 86_400_000).toISOString();

    expect(getJoursRestantsEssaiGratuit(ilYA5Jours)).toBe(10);
  });

  it("ne descend jamais en dessous de 0", async () => {
    const { getJoursRestantsEssaiGratuit } = await import("./abonnement");

    const ilYA30Jours = new Date(Date.now() - 30 * 86_400_000).toISOString();

    expect(getJoursRestantsEssaiGratuit(ilYA30Jours)).toBe(0);
  });
});

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
