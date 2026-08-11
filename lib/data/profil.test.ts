import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { getCoordonneesPraticien } from "./profil";

function clientAvec(data: unknown, error: unknown = null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data, error }),
        }),
      }),
    }),
  } as unknown as SupabaseClient<Database>;
}

describe("getAvatarUrl", () => {
  it("retourne l'URL signée si Supabase Storage répond sans erreur", async () => {
    const fakeClient = {
      storage: {
        from: () => ({
          createSignedUrl: () =>
            Promise.resolve({ data: { signedUrl: "https://example.supabase.co/signed/u1/avatar.jpg" }, error: null }),
        }),
      },
    } as unknown as SupabaseClient;

    const { getAvatarUrl } = await import("./profil");
    const url = await getAvatarUrl(fakeClient, "u1/avatar.jpg");

    expect(url).toBe("https://example.supabase.co/signed/u1/avatar.jpg");
  });

  it("retourne null si Supabase Storage renvoie une erreur", async () => {
    const fakeClient = {
      storage: {
        from: () => ({
          createSignedUrl: () => Promise.resolve({ data: null, error: { message: "not found" } }),
        }),
      },
    } as unknown as SupabaseClient;

    const { getAvatarUrl } = await import("./profil");
    const url = await getAvatarUrl(fakeClient, "u1/inconnu.jpg");

    expect(url).toBeNull();
  });
});

describe("getCoordonneesPraticien", () => {
  it("rend les coordonnees completes", async () => {
    const c = await getCoordonneesPraticien(
      clientAvec({
        full_name: "Sophie Lambert",
        adresse_cabinet: "15 rue Schoelcher",
        code_postal: "97110",
        telephone: "0690123456",
        adeli_rpps: "971234567",
      }),
      "u1"
    );
    expect(c).toEqual({
      nom: "Sophie Lambert",
      adresse: "15 rue Schoelcher",
      codePostal: "97110",
      telephone: "0690123456",
      adeliRpps: "971234567",
    });
  });

  it("remplace les champs absents par une chaine vide, jamais null", async () => {
    const c = await getCoordonneesPraticien(
      clientAvec({
        full_name: "Sophie Lambert",
        adresse_cabinet: null,
        code_postal: null,
        telephone: null,
        adeli_rpps: null,
      }),
      "u1"
    );
    expect(c).toEqual({
      nom: "Sophie Lambert",
      adresse: "",
      codePostal: "",
      telephone: "",
      adeliRpps: "",
    });
  });

  it("rend des champs vides quand le profil est introuvable", async () => {
    const c = await getCoordonneesPraticien(clientAvec(null), "inconnu");
    expect(c).toEqual({ nom: "", adresse: "", codePostal: "", telephone: "", adeliRpps: "" });
  });

  it("rend des champs vides et journalise en cas d'erreur", async () => {
    const c = await getCoordonneesPraticien(clientAvec(null, { message: "boom" }), "u1");
    expect(c.nom).toBe("");
  });
});
