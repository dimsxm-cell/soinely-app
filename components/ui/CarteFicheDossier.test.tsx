import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CarteFicheDossier } from "./CarteFicheDossier";
import type { FicheDossierSoin } from "@/lib/types/clinical";

const fiche: FicheDossierSoin = {
  id: "11111111-1111-1111-1111-111111111111",
  section: "protocoles_urgence",
  titre: "Douleur — conduite à tenir",
  resume: "Évaluation de la douleur et conduite à tenir.",
  contenu: [],
  sources: ["HAS"],
  ordre: 1,
  niveauConfiance: "brouillon",
  version: 1,
  published: true,
};

describe("CarteFicheDossier", () => {
  it("links to the fiche detail page and shows titre, resume and niveauConfiance badge", () => {
    render(<CarteFicheDossier fiche={fiche} />);

    const lien = screen.getByRole("link");
    expect(lien).toHaveAttribute("href", "/situations/dossier/11111111-1111-1111-1111-111111111111");
    expect(screen.getByText("Douleur — conduite à tenir")).toBeInTheDocument();
    expect(screen.getByText("Évaluation de la douleur et conduite à tenir.")).toBeInTheDocument();
    expect(screen.getByText("brouillon")).toBeInTheDocument();
  });
});
