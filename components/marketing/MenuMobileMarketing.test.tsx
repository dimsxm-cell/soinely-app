import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MenuMobileMarketing } from "./MenuMobileMarketing";

const LIENS = [
  { href: "#feat", label: "Fonctionnalités" },
  { href: "#ely", label: "ELY, votre copilote" },
];

describe("MenuMobileMarketing", () => {
  it("le panneau est fermé par défaut", () => {
    render(<MenuMobileMarketing liens={LIENS} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
  });

  it("s'ouvre au clic sur le bouton burger et liste les liens", () => {
    render(<MenuMobileMarketing liens={LIENS} />);
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fonctionnalités" })).toHaveAttribute("href", "#feat");
    expect(screen.getByRole("link", { name: "ELY, votre copilote" })).toHaveAttribute("href", "#ely");
    expect(screen.getByRole("link", { name: /rejoindre la bêta privée/i })).toHaveAttribute("href", "/login");
  });

  it("se ferme au clic sur un lien", () => {
    render(<MenuMobileMarketing liens={LIENS} />);
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("link", { name: "Fonctionnalités" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("se ferme à la touche Échap", () => {
    render(<MenuMobileMarketing liens={LIENS} />);
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
