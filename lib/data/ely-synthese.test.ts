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
      })
    );

    const synthese = await synthetiserReponseEly("une question", [situation()]);

    expect(synthese?.controlesRetenus).toEqual(["Vérifier la fièvre"]);
  });

  it("calcule fichesUtiliseesIds à partir du contenu réellement retenu, pas de ce que renvoie le LLM", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "cle-de-test");
    const ficheA = situation({
      id: "A",
      verifications: ["Vérifier la fièvre"],
      quandAvisMedical: "Si fièvre ou extension de la rougeur.",
      conduiteATenir: ["Nettoyer la plaie"],
      niveauConfiance: "valide",
    });
    const ficheB = situation({
      id: "B",
      titre: "Autre fiche",
      verifications: ["Vérifier la tension"],
      quandAvisMedical: "Si tension basse.",
      conduiteATenir: ["Allonger le patient"],
      niveauConfiance: "brouillon",
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      reponseOutil({
        situationComprise: "Résumé.",
        informationsManquantes: [],
        // Le contenu retenu vient réellement de la fiche B (brouillon), mais
        // le LLM prétend (à tort, ou sans qu'on lui demande) que c'est la
        // fiche A (validée) qui a servi. On ne doit pas le croire.
        controlesRetenus: ["Vérifier la tension"],
        signesAlerteRetenus: [],
        actionsRetenues: [],
        fichesUtiliseesIds: ["A"],
      })
    );

    const synthese = await synthetiserReponseEly("une question", [ficheA, ficheB]);

    expect(synthese?.fichesUtiliseesIds).toEqual(["B"]);
  });

  it("exclut de fichesUtiliseesIds une fiche envoyée au LLM dont aucun contenu n'a été retenu", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "cle-de-test");
    const ficheUtile = situation({ id: "s1" });
    const ficheIgnoree = situation({
      id: "s2",
      titre: "Fiche non pertinente",
      verifications: ["Vérifier la tension"],
      quandAvisMedical: "Si tension basse.",
      conduiteATenir: ["Allonger le patient"],
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      reponseOutil({
        situationComprise: "Résumé.",
        informationsManquantes: [],
        controlesRetenus: ["Vérifier la fièvre"],
        signesAlerteRetenus: [],
        actionsRetenues: [],
      })
    );

    const synthese = await synthetiserReponseEly("une question", [ficheUtile, ficheIgnoree]);

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
