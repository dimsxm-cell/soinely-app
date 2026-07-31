import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

// Le catalogue se lit avec deux tris enchaînés : le faux client rend donc un
// objet portant `order` au premier niveau, et la promesse au second.
function fakeClientCatalogue(resultat: { data: unknown; error: unknown }) {
  const orderCoefficientMock = vi.fn(() => Promise.resolve(resultat));
  const orderLettreMock = vi.fn(() => ({ order: orderCoefficientMock }));

  const fakeClient = {
    from: () => ({ select: () => ({ order: orderLettreMock }) }),
  } as unknown as SupabaseClient;

  return { fakeClient, orderLettreMock, orderCoefficientMock };
}

describe("getCodesNgap", () => {
  it("mappe les colonnes", async () => {
    const { fakeClient } = fakeClientCatalogue({
      data: [
        { id: "c1", code: "AIS 3", libelle: "Actes infirmiers de soins" },
        { id: "c2", code: "AMI 1", libelle: "Injection" },
      ],
      error: null,
    });

    const { getCodesNgap } = await import("./ngap");
    const codes = await getCodesNgap(fakeClient);

    expect(codes).toEqual([
      { id: "c1", code: "AIS 3", libelle: "Actes infirmiers de soins" },
      { id: "c2", code: "AMI 1", libelle: "Injection" },
    ]);
  });

  it("trie par lettre-clé puis par coefficient, et non par le code affiché", async () => {
    const { fakeClient, orderLettreMock, orderCoefficientMock } = fakeClientCatalogue({
      data: [],
      error: null,
    });

    const { getCodesNgap } = await import("./ngap");
    await getCodesNgap(fakeClient);

    // Trier sur `code` rangerait « AMI 14 » entre « AMI 1 » et « AMI 2 »,
    // le tri texte comparant les chiffres caractère par caractère.
    expect(orderLettreMock).toHaveBeenCalledWith("lettre_cle");
    expect(orderCoefficientMock).toHaveBeenCalledWith("coefficient");
  });

  it("rend une liste vide quand la lecture échoue", async () => {
    const { fakeClient } = fakeClientCatalogue({ data: null, error: { message: "boom" } });

    const { getCodesNgap } = await import("./ngap");
    expect(await getCodesNgap(fakeClient)).toEqual([]);
  });
});
