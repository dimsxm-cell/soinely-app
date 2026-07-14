import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("getTourneeDuJour", () => {
  it("mappe les colonnes snake_case Supabase vers le type Tournee", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    id: "t1",
                    date: "2026-07-13",
                    nb_patients: 21,
                    nb_injections: 14,
                    nb_pansements: 8,
                    nb_glycemies: 6,
                    temps_estime_min: 435,
                  },
                  error: null,
                }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getTourneeDuJour } = await import("./ma-journee");
    const tournee = await getTourneeDuJour(fakeClient, "user-1");

    expect(tournee).toEqual({
      id: "t1",
      date: "2026-07-13",
      nbPatients: 21,
      nbInjections: 14,
      nbPansements: 8,
      nbGlycemies: 6,
      tempsEstimeMin: 435,
    });
  });
});
