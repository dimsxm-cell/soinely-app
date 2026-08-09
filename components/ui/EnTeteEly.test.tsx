import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EnTeteEly } from "./EnTeteEly";

describe("EnTeteEly", () => {
  it("affiche le nombre de fiches transmis", () => {
    render(<EnTeteEly aDesMessages={false} onReset={vi.fn()} nombreFiches={12} />);

    expect(screen.getByText("Fiches").parentElement).toHaveTextContent("12");
  });

  it("désactive le bouton Nouvelle conversation sans messages", () => {
    render(<EnTeteEly aDesMessages={false} onReset={vi.fn()} nombreFiches={0} />);

    expect(screen.getByRole("button", { name: "Nouvelle conversation" })).toBeDisabled();
  });

  it("déclenche onReset au clic quand des messages existent", () => {
    const onReset = vi.fn();
    render(<EnTeteEly aDesMessages onReset={onReset} nombreFiches={0} />);

    const bouton = screen.getByRole("button", { name: "Nouvelle conversation" });
    expect(bouton).not.toBeDisabled();
    bouton.click();

    expect(onReset).toHaveBeenCalledOnce();
  });
});
