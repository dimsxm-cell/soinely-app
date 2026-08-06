import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getMaterielDuJour", () => {
  it("agrège les quantités de plusieurs occurrences du même code", async () => {
    const inMock = vi.fn().mockResolvedValue({
      data: [
        { ngap_code_id: "code-ami2", libelle: "Compresses stériles", quantite: 4 },
        { ngap_code_id: "code-ami2", libelle: "Sérum physiologique", quantite: 1 },
      ],
      error: null,
    });

    const fakeClient = {
      from: (table: string) => {
        if (table === "missions_du_jour") {
          return {
            select: () => ({
              eq: () =>
                Promise.resolve({
                  data: [
                    { actes_mission: [{ ngap_code_id: "code-ami2" }] },
                    { actes_mission: [{ ngap_code_id: "code-ami2" }] },
                  ],
                  error: null,
                }),
            }),
          };
        }
        if (table === "materiel_ngap") {
          return { select: () => ({ in: inMock }) };
        }
        throw new Error(`Table non attendue dans ce test : ${table}`);
      },
    } as unknown as SupabaseClient;

    const { getMaterielDuJour } = await import("./materiel");
    const items = await getMaterielDuJour(fakeClient, "t1");

    expect(items).toEqual([
      { libelle: "Compresses stériles", quantite: 8 },
      { libelle: "Sérum physiologique", quantite: 2 },
    ]);
    // Un seul code distinct interrogé, malgré deux occurrences.
    expect(inMock).toHaveBeenCalledWith("ngap_code_id", ["code-ami2"]);
  });

  it("ignore les actes sans code NGAP", async () => {
    const fakeClient = {
      from: (table: string) => {
        if (table === "missions_du_jour") {
          return {
            select: () => ({
              eq: () =>
                Promise.resolve({
                  data: [{ actes_mission: [{ ngap_code_id: null }] }],
                  error: null,
                }),
            }),
          };
        }
        if (table === "materiel_ngap") {
          return { select: () => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
        }
        throw new Error(`Table non attendue dans ce test : ${table}`);
      },
    } as unknown as SupabaseClient;

    const { getMaterielDuJour } = await import("./materiel");
    expect(await getMaterielDuJour(fakeClient, "t1")).toEqual([]);
  });

  it("rend une liste vide sans acte du jour", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
      }),
    } as unknown as SupabaseClient;

    const { getMaterielDuJour } = await import("./materiel");
    expect(await getMaterielDuJour(fakeClient, "t1")).toEqual([]);
  });

  it("ignore un code NGAP sans matériel associé", async () => {
    const fakeClient = {
      from: (table: string) => {
        if (table === "missions_du_jour") {
          return {
            select: () => ({
              eq: () =>
                Promise.resolve({
                  data: [{ actes_mission: [{ ngap_code_id: "code-bsa" }] }],
                  error: null,
                }),
            }),
          };
        }
        if (table === "materiel_ngap") {
          return { select: () => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
        }
        throw new Error(`Table non attendue dans ce test : ${table}`);
      },
    } as unknown as SupabaseClient;

    const { getMaterielDuJour } = await import("./materiel");
    expect(await getMaterielDuJour(fakeClient, "t1")).toEqual([]);
  });
});
