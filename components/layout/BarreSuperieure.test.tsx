import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BarreSuperieure } from "./BarreSuperieure";

describe("BarreSuperieure", () => {
  it("affiche le lien vers Ma journée, Rechercher et Mon compte", () => {
    render(<BarreSuperieure />);

    expect(screen.getByRole("link", { name: /Soinely/ })).toHaveAttribute("href", "/ma-journee");
    expect(screen.getByRole("link", { name: "Rechercher" })).toHaveAttribute("href", "/recherche");
    expect(screen.getByRole("link", { name: "Mon compte" })).toHaveAttribute("href", "/compte");
  });
});
