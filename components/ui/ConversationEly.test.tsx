import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReponseEly, SituationTerrain, SyntheseEly } from "@/lib/types/clinical";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

function situation(overrides: Partial<SituationTerrain> = {}): SituationTerrain {
  return {
    id: "s1",
    titre: "Hypoglycémie",
    observation: "Le patient présente des sueurs et des tremblements.",
    verifications: [],
    causesPossibles: [],
    conduiteATenir: ["Resucrage immédiat"],
    quandAvisMedical: "Si pas d'amélioration en 15 minutes.",
    sources: [],
    specialite: "Diabétologie",
    niveauConfiance: "valide",
    version: 1,
    published: true,
    ...overrides,
  };
}

function synthese(overrides: Partial<SyntheseEly> = {}): SyntheseEly {
  return {
    situationComprise: "Le patient présente des signes d'hypoglycémie.",
    informationsManquantes: [],
    controlesRetenus: [],
    signesAlerteRetenus: [],
    actionsRetenues: ["Resucrage immédiat"],
    fichesUtiliseesIds: ["s1"],
    ...overrides,
  };
}

function reponseBrute(situationBrute: SituationTerrain | null): ReponseEly {
  return { situationBrute, situationsSources: [], synthese: null };
}

function reponseSynthetisee(overrides: Partial<SyntheseEly> = {}): ReponseEly {
  return {
    situationBrute: situation(),
    situationsSources: [situation()],
    synthese: synthese(overrides),
  };
}

describe("ConversationEly — repli sur la fiche brute", () => {
  it("affiche le badge Brouillon pour une situation non relue", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(
      <ConversationEly
        requeteInitiale="arrêt cardio-respiratoire"
        reponseInitiale={reponseBrute(situation({ niveauConfiance: "brouillon" }))}
      />
    );

    expect(screen.getByText("Brouillon")).toBeInTheDocument();
  });

  it("affiche le badge Validé pour une situation relue et validée", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(
      <ConversationEly
        requeteInitiale="hypoglycémie"
        reponseInitiale={reponseBrute(situation({ niveauConfiance: "valide" }))}
      />
    );

    expect(screen.getByText("Validé")).toBeInTheDocument();
  });

  it("n'affiche aucun badge quand aucune situation n'est trouvée", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(<ConversationEly requeteInitiale="question sans réponse" reponseInitiale={reponseBrute(null)} />);

    expect(screen.queryByText("Brouillon")).not.toBeInTheDocument();
    expect(screen.queryByText("Relu")).not.toBeInTheDocument();
    expect(screen.queryByText("Validé")).not.toBeInTheDocument();
  });
});

describe("ConversationEly — synthèse IA", () => {
  it("affiche le badge Synthèse IA et le contenu structuré", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(
      <ConversationEly
        requeteInitiale="que faire en cas d'hypoglycémie"
        reponseInitiale={reponseSynthetisee({
          controlesRetenus: ["Vérifier la glycémie"],
          signesAlerteRetenus: ["Si pas d'amélioration en 15 minutes."],
        })}
      />
    );

    expect(screen.getByText("Synthèse IA")).toBeInTheDocument();
    expect(screen.getByText("Le patient présente des signes d'hypoglycémie.")).toBeInTheDocument();
    expect(screen.getByText("Vérifier la glycémie")).toBeInTheDocument();
    expect(screen.getByText("Resucrage immédiat")).toBeInTheDocument();
    expect(screen.getByText("Si pas d'amélioration en 15 minutes.")).toBeInTheDocument();
  });

  it("liste les fiches sources citées, avec leur propre niveau de confiance", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(
      <ConversationEly
        requeteInitiale="que faire en cas d'hypoglycémie"
        reponseInitiale={reponseSynthetisee()}
      />
    );

    expect(screen.getByText("Hypoglycémie")).toBeInTheDocument();
    expect(screen.getByText("Validé")).toBeInTheDocument();
  });

  it("n'affiche que les fiches sources citées dans fichesUtiliseesIds, pas les autres fiches sources", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    const fichecitee = situation({ id: "s1", titre: "Hypoglycémie" });
    const ficheNonCitee = situation({ id: "s2", titre: "Malaise vagal" });
    render(
      <ConversationEly
        requeteInitiale="que faire en cas d'hypoglycémie"
        reponseInitiale={{
          situationBrute: fichecitee,
          situationsSources: [fichecitee, ficheNonCitee],
          synthese: synthese({ fichesUtiliseesIds: ["s1"] }),
        }}
      />
    );

    expect(screen.getByText("Hypoglycémie")).toBeInTheDocument();
    expect(screen.queryByText("Malaise vagal")).not.toBeInTheDocument();
  });

  it("n'affiche pas le badge Synthèse IA en l'absence de synthèse", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(
      <ConversationEly requeteInitiale="hypoglycémie" reponseInitiale={reponseBrute(situation())} />
    );

    expect(screen.queryByText("Synthèse IA")).not.toBeInTheDocument();
  });
});

describe("ConversationEly — rappel de limite", () => {
  it("affiche le rappel de limite dès le départ, sans message", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(<ConversationEly requeteInitiale="" reponseInitiale={reponseBrute(null)} />);

    expect(
      screen.getByText("Ely t'aide à analyser la situation ; la décision et la responsabilité restent à toi.")
    ).toBeInTheDocument();
  });
});

describe("ConversationEly — contexte de mission", () => {
  it("affiche le patient et le soin quand les deux sont fournis", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(
      <ConversationEly
        requeteInitiale=""
        reponseInitiale={reponseBrute(null)}
        patientContexte="Marie Dupont"
        soinContexte="Pansement"
      />
    );

    expect(screen.getByText("Pour Marie Dupont · Pansement")).toBeInTheDocument();
  });

  it("affiche le patient seul sans point médian quand soinContexte est absent", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(
      <ConversationEly requeteInitiale="" reponseInitiale={reponseBrute(null)} patientContexte="Marie Dupont" />
    );

    expect(screen.getByText("Pour Marie Dupont")).toBeInTheDocument();
    expect(screen.getByText("Pour Marie Dupont")).toHaveTextContent(/^Pour Marie Dupont$/);
  });

  it("n'affiche aucun rappel de patient quand patientContexte est absent (comportement par défaut)", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(<ConversationEly requeteInitiale="" reponseInitiale={reponseBrute(null)} />);

    expect(screen.queryByText(/^Pour /)).not.toBeInTheDocument();
  });
});

describe("ConversationEly — restauration de la dernière recherche", () => {
  const mockLocalStorage = {
    store: {} as Record<string, string>,
    getItem: (key: string) => mockLocalStorage.store[key] ?? null,
    setItem: (key: string, value: string) => {
      mockLocalStorage.store[key] = value;
    },
    clear: () => {
      mockLocalStorage.store = {};
    },
    removeItem: (key: string) => {
      delete mockLocalStorage.store[key];
    },
    key: (index: number) => {
      const keys = Object.keys(mockLocalStorage.store);
      return keys[index] ?? null;
    },
    get length() {
      return Object.keys(mockLocalStorage.store).length;
    },
  };

  vi.stubGlobal("localStorage", mockLocalStorage);

  beforeEach(() => {
    mockLocalStorage.clear();
  });

  afterEach(() => {
    mockLocalStorage.clear();
  });

  it("restaure la dernière question dans le champ de saisie quand patientContexte est absent, sans relancer de recherche", async () => {
    mockLocalStorage.setItem("ely_derniere_requete", "plaie infectée");

    const { ConversationEly } = await import("./ConversationEly");
    render(<ConversationEly requeteInitiale="" reponseInitiale={reponseBrute(null)} />);

    expect(screen.getByLabelText("Poser une question à Ely")).toHaveValue("plaie infectée");
  });

  it("ne restaure pas la dernière question quand patientContexte est présent (lien profond patient-spécifique)", async () => {
    mockLocalStorage.setItem("ely_derniere_requete", "plaie infectée");

    const { ConversationEly } = await import("./ConversationEly");
    render(
      <ConversationEly
        requeteInitiale=""
        reponseInitiale={reponseBrute(null)}
        patientContexte="Marie Dupont"
      />
    );

    expect(screen.getByLabelText("Poser une question à Ely")).toHaveValue("");
  });
});
