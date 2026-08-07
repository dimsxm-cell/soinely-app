import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import type { SituationTerrain } from "@/lib/types/clinical";

const searchSituationsTerrainMock = vi.fn();
const getTourneeDuJourMock = vi.fn();
const getMissionsDuJourMock = vi.fn();
const filtrerNomsPatientsMock = vi.fn();
const synthetiserReponseElyMock = vi.fn();

vi.mock("@/lib/data/recherche", () => ({
  searchSituationsTerrain: (...args: unknown[]) => searchSituationsTerrainMock(...args),
}));
vi.mock("@/lib/data/ma-journee", () => ({
  getTourneeDuJour: (...args: unknown[]) => getTourneeDuJourMock(...args),
  getMissionsDuJour: (...args: unknown[]) => getMissionsDuJourMock(...args),
}));
vi.mock("@/lib/ely-redaction", () => ({
  filtrerNomsPatients: (...args: unknown[]) => filtrerNomsPatientsMock(...args),
}));
vi.mock("@/lib/data/ely-synthese", () => ({
  synthetiserReponseEly: (...args: unknown[]) => synthetiserReponseElyMock(...args),
}));

const supabase = {} as SupabaseClient<Database>;

function situation(overrides: Partial<SituationTerrain> = {}): SituationTerrain {
  return {
    id: "s1",
    titre: "Hypoglycémie",
    observation: "obs",
    verifications: [],
    causesPossibles: [],
    conduiteATenir: [],
    quandAvisMedical: "avis",
    sources: [],
    specialite: "Diabétologie",
    niveauConfiance: "valide",
    version: 1,
    published: true,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  searchSituationsTerrainMock.mockReset();
  getTourneeDuJourMock.mockReset();
  getMissionsDuJourMock.mockReset();
  filtrerNomsPatientsMock.mockReset();
  synthetiserReponseElyMock.mockReset();
});

describe("obtenirReponseEly", () => {
  it("ne tente rien de plus sans résultat de recherche", async () => {
    const { obtenirReponseEly } = await import("./ely");
    searchSituationsTerrainMock.mockResolvedValue([]);

    const reponse = await obtenirReponseEly(supabase, "question", "idel-1");

    expect(reponse).toEqual({ situationBrute: null, situationsSources: [], synthese: null });
    expect(getTourneeDuJourMock).not.toHaveBeenCalled();
    expect(synthetiserReponseElyMock).not.toHaveBeenCalled();
  });

  it("se rabat complètement quand la recherche elle-même échoue", async () => {
    const { obtenirReponseEly } = await import("./ely");
    searchSituationsTerrainMock.mockRejectedValue(new Error("panne réseau"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const reponse = await obtenirReponseEly(supabase, "question", "idel-1");

    expect(reponse).toEqual({ situationBrute: null, situationsSources: [], synthese: null });
    expect(getTourneeDuJourMock).not.toHaveBeenCalled();
    expect(synthetiserReponseElyMock).not.toHaveBeenCalled();
  });

  it("ne synthétise pas sans infirmière identifiée", async () => {
    const { obtenirReponseEly } = await import("./ely");
    const s1 = situation();
    searchSituationsTerrainMock.mockResolvedValue([s1]);

    const reponse = await obtenirReponseEly(supabase, "question", null);

    expect(reponse).toEqual({ situationBrute: s1, situationsSources: [], synthese: null });
    expect(getTourneeDuJourMock).not.toHaveBeenCalled();
    expect(synthetiserReponseElyMock).not.toHaveBeenCalled();
  });

  it("ne synthétise pas sans tournée du jour", async () => {
    const { obtenirReponseEly } = await import("./ely");
    const s1 = situation();
    searchSituationsTerrainMock.mockResolvedValue([s1]);
    getTourneeDuJourMock.mockResolvedValue(null);

    const reponse = await obtenirReponseEly(supabase, "question", "idel-1");

    expect(reponse).toEqual({ situationBrute: s1, situationsSources: [], synthese: null });
    expect(synthetiserReponseElyMock).not.toHaveBeenCalled();
  });

  it("se rabat sans appeler le LLM quand la récupération des missions échoue", async () => {
    const { obtenirReponseEly } = await import("./ely");
    const s1 = situation();
    searchSituationsTerrainMock.mockResolvedValue([s1]);
    getTourneeDuJourMock.mockResolvedValue({ id: "tournee-1" });
    getMissionsDuJourMock.mockRejectedValue(new Error("panne"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const reponse = await obtenirReponseEly(supabase, "question", "idel-1");

    expect(reponse).toEqual({ situationBrute: s1, situationsSources: [], synthese: null });
    expect(synthetiserReponseElyMock).not.toHaveBeenCalled();
  });

  it("filtre la question et synthétise avec les 3 meilleurs résultats au plus", async () => {
    const { obtenirReponseEly } = await import("./ely");
    const s1 = situation({ id: "s1" });
    const s2 = situation({ id: "s2" });
    const s3 = situation({ id: "s3" });
    const s4 = situation({ id: "s4" });
    searchSituationsTerrainMock.mockResolvedValue([s1, s2, s3, s4]);
    getTourneeDuJourMock.mockResolvedValue({ id: "tournee-1" });
    getMissionsDuJourMock.mockResolvedValue([{ patientNom: "Jean Dupont" }]);
    filtrerNomsPatientsMock.mockReturnValue("question filtrée");
    const synthese = {
      situationComprise: "...",
      informationsManquantes: [],
      controlesRetenus: ["c1"],
      signesAlerteRetenus: [],
      actionsRetenues: [],
      fichesUtiliseesIds: ["s1"],
    };
    synthetiserReponseElyMock.mockResolvedValue(synthese);

    const reponse = await obtenirReponseEly(supabase, "question", "idel-1");

    expect(filtrerNomsPatientsMock).toHaveBeenCalledWith("question", ["Jean Dupont"]);
    expect(synthetiserReponseElyMock).toHaveBeenCalledWith("question filtrée", [s1, s2, s3]);
    expect(reponse).toEqual({ situationBrute: s1, situationsSources: [s1, s2, s3], synthese });
  });

  it("garde situationsSources vide quand la synthèse échoue malgré un filtrage réussi", async () => {
    const { obtenirReponseEly } = await import("./ely");
    const s1 = situation();
    searchSituationsTerrainMock.mockResolvedValue([s1]);
    getTourneeDuJourMock.mockResolvedValue({ id: "tournee-1" });
    getMissionsDuJourMock.mockResolvedValue([]);
    filtrerNomsPatientsMock.mockReturnValue("question");
    synthetiserReponseElyMock.mockResolvedValue(null);

    const reponse = await obtenirReponseEly(supabase, "question", "idel-1");

    expect(reponse).toEqual({ situationBrute: s1, situationsSources: [], synthese: null });
  });
});
