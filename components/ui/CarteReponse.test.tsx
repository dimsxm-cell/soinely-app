import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CarteReponse } from "./CarteReponse";
import type { SituationTerrain } from "@/lib/types/clinical";

const situation: SituationTerrain = {
  id: "s1",
  titre: "Hypoglycémie chez un patient diabétique",
  observation: "Le patient présente des sueurs, des tremblements et une confusion légère.",
  verifications: [],
  causesPossibles: [],
  conduiteATenir: [
    "Resucrage oral si conscient (15g de sucre)",
    "Recontrôler la glycémie 15 min après",
    "Ne jamais resucrer un patient inconscient par voie orale",
  ],
  quandAvisMedical: "",
  sources: [],
  specialite: "idel",
  niveauConfiance: "valide",
  version: 1,
  published: true,
};

describe("CarteReponse", () => {
  it("affiche le titre, l'observation, un aperçu de la conduite à tenir et un lien vers la fiche complète", () => {
    render(<CarteReponse situation={situation} />);

    expect(screen.getByText(situation.titre)).toBeInTheDocument();
    expect(screen.getByText(/sueurs, des tremblements/)).toBeInTheDocument();
    expect(
      screen.getByText("Resucrage oral si conscient (15g de sucre)")
    ).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/situations/s1");
  });

  it("n'affiche pas de liste si conduiteATenir est vide", () => {
    render(<CarteReponse situation={{ ...situation, conduiteATenir: [] }} />);

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
