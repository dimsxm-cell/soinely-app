import { afterEach, describe, expect, it, vi } from "vitest";
import { synthetiserReponseEly } from "./ely-synthese";
import type { SituationTerrain } from "@/lib/types/clinical";

function situation(overrides: Partial<SituationTerrain> = {}): SituationTerrain {
  return {
    id: "s1",
    titre: "Plaie qui s'infecte",
    observation: "Rougeur et chaleur locale.",
    verifications: ["Vérifier la fièvre", "Vérifier l'écoulement"],
    causesPossibles: [],
    conduiteATenir: ["Nettoyer la plaie", "Contacter le médecin"],
    quandAvisMedical: "Si fièvre ou extension de la rougeur.",
    sources: [],
    specialite: "Plaies",
    niveauConfiance: "valide",
    version: 1,
    published: true,
    ...overrides,
  };
}

function reponseOutil(input: Record<string, unknown>) {
  return new Response(
    JSON.stringify({ content: [{ type: "tool_use", name: "structurer_reponse", input }] }),
    { status: 200 }
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("synthetiserReponseEly", () => {
  it("ne tente aucun appel réseau sans clé API configurée", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const appelReseau = vi.spyOn(globalThis, "fetch");

    expect(await synthetiserReponseEly("une question", [situation()])).toBeNull();
    expect(appelReseau).not.toHaveBeenCalled();
  });

  it("ne tente aucun appel réseau sans fiche fournie", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "cle-de-test");
    const appelReseau = vi.spyOn(globalThis, "fetch");

    expect(await synthetiserReponseEly("une question", [])).toBeNull();
    expect(appelReseau).not.toHaveBeenCalled();
  });

  it("renvoie la synthèse validée quand le LLM répond correctement", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "cle-de-test");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      reponseOutil({
        situationComprise: "Plaie avec rougeur, sans fièvre déclarée.",
        informationsManquantes: ["Présence de fièvre ?"],
        controlesRetenus: ["Vérifier la fièvre"],
        signesAlerteRetenus: ["Si fièvre ou extension de la rougeur."],
        actionsRetenues: ["Nettoyer la plaie"],
        fichesUtiliseesIds: ["s1"],
      })
    );

    const synthese = await synthetiserReponseEly("une question filtrée", [situation()]);

    expect(synthese).toEqual({
      situationComprise: "Plaie avec rougeur, sans fièvre déclarée.",
      informationsManquantes: ["Présence de fièvre ?"],
      controlesRetenus: ["Vérifier la fièvre"],
      signesAlerteRetenus: ["Si fièvre ou extension de la rougeur."],
      actionsRetenues: ["Nettoyer la plaie"],
      fichesUtiliseesIds: ["s1"],
    });
  });

  it("supprime tout contrôle qui n'existe pas mot pour mot dans les fiches fournies", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "cle-de-test");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      reponseOutil({
        situationComprise: "Résumé.",
        informationsManquantes: [],
        controlesRetenus: ["Vérifier la fièvre", "Contrôle inventé qui n'existe dans aucune fiche"],
        signesAlerteRetenus: [],
        actionsRetenues: ["Nettoyer la plaie"],
        fichesUtiliseesIds: ["s1"],
      })
    );

    const synthese = await synthetiserReponseEly("une question", [situation()]);

    expect(synthese?.controlesRetenus).toEqual(["Vérifier la fièvre"]);
  });

  it("supprime les ids de fiches qui n'ont pas été envoyées au LLM", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "cle-de-test");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      reponseOutil({
        situationComprise: "Résumé.",
        informationsManquantes: [],
        controlesRetenus: ["Vérifier la fièvre"],
        signesAlerteRetenus: [],
        actionsRetenues: [],
        fichesUtiliseesIds: ["s1", "id-jamais-envoye"],
      })
    );

    const synthese = await synthetiserReponseEly("une question", [situation({ id: "s1" })]);

    expect(synthese?.fichesUtiliseesIds).toEqual(["s1"]);
  });

  it("échoue quand les trois champs sourcés sont vides après validation", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "cle-de-test");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      reponseOutil({
        situationComprise: "Résumé.",
        informationsManquantes: ["Manque tout"],
        controlesRetenus: ["Contrôle inventé"],
        signesAlerteRetenus: ["Signe inventé"],
        actionsRetenues: ["Action inventée"],
        fichesUtiliseesIds: ["s1"],
      })
    );

    expect(await synthetiserReponseEly("une question", [situation()])).toBeNull();
  });

  it("échoue sur une réponse HTTP non 2xx", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "cle-de-test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }));

    expect(await synthetiserReponseEly("une question", [situation()])).toBeNull();
  });

  it("échoue quand le réseau est coupé", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "cle-de-test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("fetch failed"));

    expect(await synthetiserReponseEly("une question", [situation()])).toBeNull();
  });

  it("échoue sur une réponse sans bloc tool_use", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "cle-de-test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ content: [{ type: "text", text: "pas du JSON structuré" }] }), {
        status: 200,
      })
    );

    expect(await synthetiserReponseEly("une question", [situation()])).toBeNull();
  });
});
