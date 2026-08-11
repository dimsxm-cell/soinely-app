import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  BarreImpressionPraticien,
  BlocCoordonneesPraticien,
  FournisseurCoordonneesPraticien,
} from "./CoordonneesPraticien";
import type { CoordonneesPraticien } from "@/lib/data/profil";

vi.mock("@/lib/data/profil-actions", () => ({
  enregistrerCoordonneesPraticienAction: vi.fn(async () => ({ succes: true })),
}));

const COMPLETES: CoordonneesPraticien = {
  nom: "Sophie Lambert",
  adresse: "15 rue Schoelcher",
  codePostal: "97110",
  telephone: "0690123456",
  adeliRpps: "971234567",
};

function rendre(initiales: CoordonneesPraticien) {
  return render(
    <FournisseurCoordonneesPraticien initiales={initiales}>
      <BlocCoordonneesPraticien />
      <BarreImpressionPraticien />
    </FournisseurCoordonneesPraticien>
  );
}

describe("BlocCoordonneesPraticien", () => {
  it("affiche les coordonnees completes", () => {
    rendre(COMPLETES);
    expect(screen.getByText("Sophie Lambert")).toBeInTheDocument();
    expect(screen.getByText(/15 rue Schoelcher/)).toBeInTheDocument();
    expect(screen.getByText(/0690123456/)).toBeInTheDocument();
    expect(screen.getByText(/971234567/)).toBeInTheDocument();
  });

  it("n'affiche que les champs renseignes, sans ligne vide", () => {
    const { container } = rendre({ ...COMPLETES, telephone: "", adeliRpps: "" });
    expect(screen.getByText("Sophie Lambert")).toBeInTheDocument();
    expect(screen.queryByText(/ADELI/)).not.toBeInTheDocument();
    expect(container.querySelectorAll("[data-ligne-coordonnee]")).toHaveLength(2);
  });

  it("ne rend rien du tout quand aucun champ n'est renseigne", () => {
    const { container } = rendre({ nom: "", adresse: "", codePostal: "", telephone: "", adeliRpps: "" });
    expect(container.querySelector("[data-bloc-coordonnees]")).not.toBeInTheDocument();
  });

  it("reste invisible a l'ecran et n'apparait qu'a l'impression", () => {
    const { container } = rendre(COMPLETES);
    expect(container.querySelector("[data-bloc-coordonnees]")).toHaveClass("hidden", "print:block");
  });
});

describe("BarreImpressionPraticien", () => {
  it("pre-remplit les champs depuis le profil", () => {
    rendre(COMPLETES);
    expect(screen.getByLabelText("Nom")).toHaveValue("Sophie Lambert");
    expect(screen.getByLabelText("Téléphone")).toHaveValue("0690123456");
  });

  it("une modification se repercute immediatement sur le bloc imprime", () => {
    rendre(COMPLETES);
    fireEvent.change(screen.getByLabelText("Téléphone"), { target: { value: "0590000000" } });
    expect(screen.getByText(/0590000000/)).toBeInTheDocument();
    expect(screen.queryByText(/0690123456/)).not.toBeInTheDocument();
  });

  it("n'ecrit pas dans le profil quand la case n'est pas cochee", async () => {
    const { enregistrerCoordonneesPraticienAction } = await import("@/lib/data/profil-actions");
    rendre(COMPLETES);
    fireEvent.click(screen.getByRole("button", { name: /imprimer/i }));
    expect(enregistrerCoordonneesPraticienAction).not.toHaveBeenCalled();
  });

  it("est masquee a l'impression", () => {
    const { container } = rendre(COMPLETES);
    expect(container.querySelector("[data-barre-impression]")).toHaveClass("print:hidden");
  });
});
