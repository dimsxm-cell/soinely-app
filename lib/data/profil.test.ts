import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { getCoordonneesPraticien } from "./profil";

interface RequeteObservee {
  table?: string;
  colonnes?: string;
  filtre?: { colonne: string; valeur: unknown };
}

/**
 * Faux client Supabase qui retient ce qu'on lui demande.
 *
 * Ignorer les arguments laissait passer la régression la plus grave possible
 * ici : une lecture qui perdrait son `.eq("id", userId)` — donc le filtre
 * utilisateur, sur des données de santé — rendait les quatre tests verts.
 */
function clientAvec(data: unknown, error: unknown = null) {
  const requete: RequeteObservee = {};

  const client = {
    from: (table: string) => {
      requete.table = table;
      return {
        select: (colonnes: string) => {
          requete.colonnes = colonnes;
          return {
            eq: (colonne: string, valeur: unknown) => {
              requete.filtre = { colonne, valeur };
              return {
                maybeSingle: async () => ({ data, error }),
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient<Database>;

  return { client, requete };
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
  it("ne lit que la ligne de l'utilisatrice demandee", async () => {
    const { client, requete } = clientAvec({ full_name: "Sophie Lambert" });

    await getCoordonneesPraticien(client, "u1");

    expect(requete.table).toBe("profiles");
    expect(requete.colonnes).toBe("full_name, adresse_cabinet, code_postal, telephone, adeli_rpps");
    // Sans ce filtre, la lecture rendrait la premiere ligne venue de la table
    // — les coordonnees d'une autre IDEL, imprimees sur les documents de
    // celle-ci.
    expect(requete.filtre).toEqual({ colonne: "id", valeur: "u1" });
  });

  it("rend les coordonnees completes", async () => {
    const { client } = clientAvec({
      full_name: "Sophie Lambert",
      adresse_cabinet: "15 rue Schoelcher",
      code_postal: "97110",
      telephone: "0690123456",
      adeli_rpps: "971234567",
    });
    const c = await getCoordonneesPraticien(client, "u1");
    expect(c).toEqual({
      nom: "Sophie Lambert",
      adresse: "15 rue Schoelcher",
      codePostal: "97110",
      telephone: "0690123456",
      adeliRpps: "971234567",
    });
  });

  it("remplace les champs absents par une chaine vide, jamais null", async () => {
    const { client } = clientAvec({
      full_name: "Sophie Lambert",
      adresse_cabinet: null,
      code_postal: null,
      telephone: null,
      adeli_rpps: null,
    });
    const c = await getCoordonneesPraticien(client, "u1");
    expect(c).toEqual({
      nom: "Sophie Lambert",
      adresse: "",
      codePostal: "",
      telephone: "",
      adeliRpps: "",
    });
  });

  it("rend des champs vides quand le profil est introuvable", async () => {
    const { client, requete } = clientAvec(null);
    const c = await getCoordonneesPraticien(client, "inconnu");
    expect(c).toEqual({ nom: "", adresse: "", codePostal: "", telephone: "", adeliRpps: "" });
    expect(requete.filtre).toEqual({ colonne: "id", valeur: "inconnu" });
  });

  it("rend des champs vides et journalise en cas d'erreur", async () => {
    const { client } = clientAvec(null, { message: "boom" });
    const c = await getCoordonneesPraticien(client, "u1");
    expect(c.nom).toBe("");
  });
});
