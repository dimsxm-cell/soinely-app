import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OngletsFiltresTournee } from "./OngletsFiltresTournee";

const counts = { tout: 8, a_faire: 5, alertes: 3, valides: 2 };

describe("OngletsFiltresTournee", () => {
  it("affiche les quatre onglets avec leur comptage", () => {
    render(<OngletsFiltresTournee filtre="tout" counts={counts} />);

    expect(screen.getByRole("link", { name: /Tout/ })).toHaveTextContent("8");
    expect(screen.getByRole("link", { name: /À faire/ })).toHaveTextContent("5");
    expect(screen.getByRole("link", { name: /Alertes/ })).toHaveTextContent("3");
    expect(screen.getByRole("link", { name: /Validés/ })).toHaveTextContent("2");
  });

  it("marque l'onglet actif pour les lecteurs d'écran", () => {
    render(<OngletsFiltresTournee filtre="alertes" counts={counts} />);

    expect(screen.getByRole("link", { name: /Alertes/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Tout/ })).not.toHaveAttribute("aria-current");
  });

  it("« Tout » revient à la page sans paramètre, les autres filtrent", () => {
    render(<OngletsFiltresTournee filtre="tout" counts={counts} />);

    expect(screen.getByRole("link", { name: /Tout/ })).toHaveAttribute("href", "/ma-tournee");
    expect(screen.getByRole("link", { name: /À faire/ })).toHaveAttribute(
      "href",
      "/ma-tournee?filtre=a_faire"
    );
    expect(screen.getByRole("link", { name: /Validés/ })).toHaveAttribute(
      "href",
      "/ma-tournee?filtre=valides"
    );
  });
});
