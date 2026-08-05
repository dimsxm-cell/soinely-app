import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SituationTerrain } from "@/lib/types/clinical";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock scrollIntoView for jsdom, which doesn't provide it by default
Element.prototype.scrollIntoView = vi.fn();

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

describe("ConversationEly", () => {
  it("affiche le badge Brouillon pour une situation non relue", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(
      <ConversationEly
        requeteInitiale="arrêt cardio-respiratoire"
        situationInitiale={situation({ niveauConfiance: "brouillon" })}
      />
    );

    expect(screen.getByText("Brouillon")).toBeInTheDocument();
  });

  it("affiche le badge Validé pour une situation relue et validée", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(
      <ConversationEly
        requeteInitiale="hypoglycémie"
        situationInitiale={situation({ niveauConfiance: "valide" })}
      />
    );

    expect(screen.getByText("Validé")).toBeInTheDocument();
  });

  it("n'affiche aucun badge quand aucune situation n'est trouvée", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(<ConversationEly requeteInitiale="question sans réponse" situationInitiale={null} />);

    expect(screen.queryByText("Brouillon")).not.toBeInTheDocument();
    expect(screen.queryByText("Relu")).not.toBeInTheDocument();
    expect(screen.queryByText("Validé")).not.toBeInTheDocument();
  });
});
