import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("getAbonnement", () => {
  it("retourne l'abonnement du profil s'il existe", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: { plan: "solo", statut: "essai" }, error: null }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getAbonnement } = await import("./abonnement");
    const abonnement = await getAbonnement(fakeClient, "p1");

    expect(abonnement).toEqual({ plan: "solo", statut: "essai" });
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
