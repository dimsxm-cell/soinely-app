import { fireEvent, render, screen, within } from "@testing-library/react";
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
    const bloc = container.querySelector<HTMLElement>("[data-bloc-coordonnees]")!;
    expect(within(bloc).getByText("Sophie Lambert")).toBeInTheDocument();
    // Porté sur le bloc imprimé, et non sur tout le rendu : l'éditeur affiche
    // en permanence un libellé « ADELI / RPPS », pour qu'un champ vide puisse
    // justement être rempli avant d'imprimer.
    expect(within(bloc).queryByText(/ADELI/)).not.toBeInTheDocument();
    expect(bloc.querySelectorAll("[data-ligne-coordonnee]")).toHaveLength(2);
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

  it("permet de renseigner un champ vide, sans passer par l'ecran compte", () => {
    const { container } = rendre({ ...COMPLETES, telephone: "" });
    const champ = screen.getByLabelText("Téléphone");
    expect(champ).toHaveValue("");

    fireEvent.change(champ, { target: { value: "0590112233" } });

    const bloc = container.querySelector<HTMLElement>("[data-bloc-coordonnees]")!;
    expect(within(bloc).getByText(/0590112233/)).toBeInTheDocument();
  });

  it("imprime meme quand l'enregistrement echoue proprement", async () => {
    const { enregistrerCoordonneesPraticienAction } = await import("@/lib/data/profil-actions");
    vi.mocked(enregistrerCoordonneesPraticienAction).mockResolvedValueOnce({
      succes: false,
      erreur: "Profil introuvable.",
    });
    const imprimerSpy = vi.spyOn(window, "print").mockImplementation(() => {});

    rendre(COMPLETES);
    fireEvent.click(screen.getByLabelText(/enregistrer dans mon profil/i));
    fireEvent.click(screen.getByRole("button", { name: /imprimer/i }));

    await vi.waitFor(() => expect(imprimerSpy).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Profil introuvable.")).toBeInTheDocument();
    imprimerSpy.mockRestore();
  });

  it("imprime meme quand l'enregistrement rejette, reseau coupe en tournee", async () => {
    const { enregistrerCoordonneesPraticienAction } = await import("@/lib/data/profil-actions");
    vi.mocked(enregistrerCoordonneesPraticienAction).mockRejectedValueOnce(new Error("offline"));
    const imprimerSpy = vi.spyOn(window, "print").mockImplementation(() => {});

    rendre(COMPLETES);
    fireEvent.click(screen.getByLabelText(/enregistrer dans mon profil/i));
    fireEvent.click(screen.getByRole("button", { name: /imprimer/i }));

    await vi.waitFor(() => expect(imprimerSpy).toHaveBeenCalledTimes(1));
    imprimerSpy.mockRestore();
  });

  it("est masquee a l'impression", () => {
    const { container } = rendre(COMPLETES);
    expect(container.querySelector("[data-barre-impression]")).toHaveClass("print:hidden");
  });
});
