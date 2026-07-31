import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("getCodesNgap", () => {
  it("mappe les colonnes et trie par code", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          order: () =>
            Promise.resolve({
              data: [
                { id: "c1", code: "AIS 3", libelle: "Actes infirmiers de soins" },
                { id: "c2", code: "AMI 1", libelle: "Injection" },
              ],
              error: null,
            }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getCodesNgap } = await import("./ngap");
    const codes = await getCodesNgap(fakeClient);

    expect(codes).toEqual([
      { id: "c1", code: "AIS 3", libelle: "Actes infirmiers de soins" },
      { id: "c2", code: "AMI 1", libelle: "Injection" },
    ]);
  });

  it("rend une liste vide quand la lecture échoue", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          order: () => Promise.resolve({ data: null, error: { message: "boom" } }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getCodesNgap } = await import("./ngap");
    expect(await getCodesNgap(fakeClient)).toEqual([]);
  });
});
