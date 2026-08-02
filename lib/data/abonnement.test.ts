import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

// Les cas se calculent depuis la durée plutôt que de la coder en dur : ces
// tests doivent vérifier la règle, pas la valeur du moment. Passer l'essai de
// quinze jours à un an ne doit pas les faire échouer.
function ilYA(jours: number): string {
  return new Date(Date.now() - jours * 86_400_000).toISOString();
}

describe("estDansEssaiGratuit", () => {
  it("retourne true pendant l'essai", async () => {
    const { estDansEssaiGratuit, DUREE_ESSAI_GRATUIT_JOURS } = await import("./abonnement");

    expect(estDansEssaiGratuit(ilYA(DUREE_ESSAI_GRATUIT_JOURS - 1))).toBe(true);
  });

  it("retourne true le jour même de l'inscription", async () => {
    const { estDansEssaiGratuit } = await import("./abonnement");

    expect(estDansEssaiGratuit(ilYA(0))).toBe(true);
  });

  it("retourne false une fois l'essai écoulé", async () => {
    const { estDansEssaiGratuit, DUREE_ESSAI_GRATUIT_JOURS } = await import("./abonnement");

    expect(estDansEssaiGratuit(ilYA(DUREE_ESSAI_GRATUIT_JOURS + 5))).toBe(false);
  });

  it("retourne false le jour où l'essai expire", async () => {
    // Frontière exacte : au terme du délai, l'accès bascule. C'est ce jour-là
    // que le testeur voit la page d'abonnement.
    const { estDansEssaiGratuit, DUREE_ESSAI_GRATUIT_JOURS } = await import("./abonnement");

    expect(estDansEssaiGratuit(ilYA(DUREE_ESSAI_GRATUIT_JOURS))).toBe(false);
  });
});

describe("getJoursRestantsEssaiGratuit", () => {
  it("calcule les jours restants avant la fin de l'essai gratuit", async () => {
    const { getJoursRestantsEssaiGratuit, DUREE_ESSAI_GRATUIT_JOURS } = await import("./abonnement");

    expect(getJoursRestantsEssaiGratuit(ilYA(5))).toBe(DUREE_ESSAI_GRATUIT_JOURS - 5);
  });

  it("ne descend jamais en dessous de 0", async () => {
    // Un compte largement au-delà de l'essai rend zéro, jamais un négatif qui
    // s'afficherait tel quel dans « Essai jusqu'au… ».
    const { getJoursRestantsEssaiGratuit, DUREE_ESSAI_GRATUIT_JOURS } = await import("./abonnement");

    expect(getJoursRestantsEssaiGratuit(ilYA(DUREE_ESSAI_GRATUIT_JOURS * 2))).toBe(0);
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
