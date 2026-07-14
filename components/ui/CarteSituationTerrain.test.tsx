import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CarteSituationTerrain } from "./CarteSituationTerrain";
import type { SituationTerrain } from "@/lib/types/clinical";

const situation: SituationTerrain = {
  id: "s1",
  titre: "Hypoglycémie chez un patient diabétique",
  observation: "Le patient présente des sueurs, des tremblements et une confusion légère.",
  verifications: [],
  causesPossibles: [],
  conduiteATenir: [],
  quandAvisMedical: "",
  sources: [],
  specialite: "idel",
  niveauConfiance: "valide",
  version: 1,
  published: true,
};

describe("CarteSituationTerrain", () => {
  it("affiche le titre, l'observation et un lien vers la page détail", () => {
    render(<CarteSituationTerrain situation={situation} />);

    expect(screen.getByText(situation.titre)).toBeInTheDocument();
    expect(screen.getByText(/sueurs, des tremblements/)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/situations/s1");
  });
});
