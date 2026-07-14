import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("searchSituationsTerrain", () => {
  it("retourne un tableau vide pour une recherche vide, sans appeler la RPC", async () => {
    const rpc = vi.fn();
    const fakeClient = { rpc } as unknown as SupabaseClient;

    const { searchSituationsTerrain } = await import("./recherche");
    const result = await searchSituationsTerrain(fakeClient, "   ");

    expect(result).toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("mappe les colonnes snake_case de la RPC vers SituationTerrain", async () => {
    const fakeClient = {
      rpc: (fn: string, args: Record<string, unknown>) => {
        expect(fn).toBe("search_situations_terrain");
        expect(args).toEqual({ search_query: "hypoglycémie" });
        return Promise.resolve({
          data: [
            {
              id: "s1",
              titre: "Hypoglycémie chez un patient diabétique",
              observation: "Sueurs, tremblements.",
              verifications: ["Mesurer la glycémie"],
              causes_possibles: ["Insuline surdosée"],
              conduite_a_tenir: ["Resucrage oral"],
              quand_avis_medical: "Si la glycémie reste basse.",
              sources: ["HAS"],
              specialite: "idel",
              niveau_confiance: "valide",
              version: 1,
              published: true,
            },
          ],
          error: null,
        });
      },
    } as unknown as SupabaseClient;

    const { searchSituationsTerrain } = await import("./recherche");
    const result = await searchSituationsTerrain(fakeClient, "hypoglycémie");

    expect(result).toEqual([
      {
        id: "s1",
        titre: "Hypoglycémie chez un patient diabétique",
        observation: "Sueurs, tremblements.",
        verifications: ["Mesurer la glycémie"],
        causesPossibles: ["Insuline surdosée"],
        conduiteATenir: ["Resucrage oral"],
        quandAvisMedical: "Si la glycémie reste basse.",
        sources: ["HAS"],
        specialite: "idel",
        niveauConfiance: "valide",
        version: 1,
        published: true,
      },
    ]);
  });

  it("retourne un tableau vide si la RPC renvoie une erreur", async () => {
    const fakeClient = {
      rpc: () => Promise.resolve({ data: null, error: { message: "boom" } }),
    } as unknown as SupabaseClient;

    const { searchSituationsTerrain } = await import("./recherche");
    const result = await searchSituationsTerrain(fakeClient, "test");

    expect(result).toEqual([]);
  });
});

describe("getSituationTerrainDetail", () => {
  it("retourne null si la situation n'existe pas ou n'est pas publiée", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getSituationTerrainDetail } = await import("./recherche");
    const result = await getSituationTerrainDetail(fakeClient, "unknown");

    expect(result).toBeNull();
  });

  it("mappe la situation et ses missions cliniques liées", async () => {
    const fakeClient = {
      from: (table: string) => {
        if (table === "situations_terrain") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () =>
                    Promise.resolve({
                      data: {
                        id: "s1",
                        titre: "Hypoglycémie chez un patient diabétique",
                        observation: "Sueurs, tremblements.",
                        verifications: ["Mesurer la glycémie"],
                        causes_possibles: ["Insuline surdosée"],
                        conduite_a_tenir: ["Resucrage oral"],
                        quand_avis_medical: "Si la glycémie reste basse.",
                        sources: ["HAS"],
                        specialite: "idel",
                        niveau_confiance: "valide",
                        version: 1,
                        published: true,
                      },
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              eq: () =>
                Promise.resolve({
                  data: [
                    {
                      id: "m1",
                      titre: "Prise en charge hypoglycémie",
                      situation_terrain_id: "s1",
                      etapes: [{ titre: "Évaluation", description: "Mesurer la glycémie" }],
                      duree_estimee_min: 20,
                      published: true,
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        };
      },
    } as unknown as SupabaseClient;

    const { getSituationTerrainDetail } = await import("./recherche");
    const result = await getSituationTerrainDetail(fakeClient, "s1");

    expect(result).toEqual({
      id: "s1",
      titre: "Hypoglycémie chez un patient diabétique",
      observation: "Sueurs, tremblements.",
      verifications: ["Mesurer la glycémie"],
      causesPossibles: ["Insuline surdosée"],
      conduiteATenir: ["Resucrage oral"],
      quandAvisMedical: "Si la glycémie reste basse.",
      sources: ["HAS"],
      specialite: "idel",
      niveauConfiance: "valide",
      version: 1,
      published: true,
      missions: [
        {
          id: "m1",
          titre: "Prise en charge hypoglycémie",
          situationTerrainId: "s1",
          etapes: [{ titre: "Évaluation", description: "Mesurer la glycémie" }],
          dureeEstimeeMin: 20,
          published: true,
        },
      ],
    });
  });
});
