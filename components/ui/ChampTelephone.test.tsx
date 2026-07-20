import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChampTelephone } from "./ChampTelephone";

describe("ChampTelephone", () => {
  it("combine l'indicatif par défaut (+33) et le numéro saisi dans le champ caché", () => {
    const { container } = render(<ChampTelephone name="telephone" label="Téléphone" />);

    const numero = screen.getByLabelText("Téléphone") as HTMLInputElement;
    fireEvent.change(numero, { target: { value: "0601020304" } });

    const champCache = container.querySelector('input[name="telephone"]') as HTMLInputElement;
    expect(champCache.value).toBe("+33 0601020304");
  });

  it("décompose une valeur existante avec indicatif Martinique", () => {
    const { container } = render(
      <ChampTelephone name="telephone" label="Téléphone" defaultValue="+596 0696112233" />
    );

    const bouton = screen.getByRole("button", { name: "Indicatif — Téléphone" });
    expect(bouton).toHaveTextContent("+596");

    const champCache = container.querySelector('input[name="telephone"]') as HTMLInputElement;
    expect(champCache.value).toBe("+596 0696112233");
  });

  it("change l'indicatif quand un autre pays est sélectionné", () => {
    const { container } = render(<ChampTelephone name="telephone" label="Téléphone" defaultValue="0601020304" />);

    const bouton = screen.getByRole("button", { name: "Indicatif — Téléphone" });
    fireEvent.click(bouton);
    fireEvent.click(screen.getByRole("option", { name: /\+590/ }));

    const champCache = container.querySelector('input[name="telephone"]') as HTMLInputElement;
    expect(champCache.value).toBe("+590 0601020304");
  });

  it("ferme la liste après sélection et rouvre au clic sur le bouton", () => {
    render(<ChampTelephone name="telephone" label="Téléphone" />);

    const bouton = screen.getByRole("button", { name: "Indicatif — Téléphone" });
    fireEvent.click(bouton);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("option", { name: /\+32/ }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
