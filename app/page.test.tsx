import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "./page";

describe("Home page", () => {
  it("renders the Soinely brand in the header", () => {
    render(<Page />);
    expect(screen.getByText("SOINELY")).toBeInTheDocument();
  });

  it("links the primary CTAs to /login", () => {
    render(<Page />);
    const ctas = [
      screen.getByRole("link", { name: /demander une démo/i }),
      screen.getByRole("link", { name: /essayer gratuitement/i }),
      screen.getByRole("link", { name: /rejoindre la liste d'attente/i }),
    ];
    for (const cta of ctas) {
      expect(cta).toHaveAttribute("href", "/login");
    }
  });
});
