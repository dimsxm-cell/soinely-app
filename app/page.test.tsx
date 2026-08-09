import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import Page from "./page";

describe("Home page", () => {
  it("renders the Soinely brand in the header", () => {
    render(<Page />);
    const header = screen.getByRole("banner");
    expect(within(header).getByText("SOINELY")).toBeInTheDocument();
  });

  it("links the primary CTAs to /login with consistent beta copy", () => {
    render(<Page />);
    const ctas = screen.getAllByRole("link", { name: /rejoindre la bêta privée/i });
    expect(ctas.length).toBeGreaterThanOrEqual(4); // header, hero, liste d'attente, CTA final
    for (const cta of ctas) {
      expect(cta).toHaveAttribute("href", "/login");
    }
  });

  it("le hero propose un CTA secondaire vers la démonstration", () => {
    render(<Page />);
    expect(screen.getByRole("link", { name: /voir soinely en action/i })).toHaveAttribute("href", "#demo");
  });
});
