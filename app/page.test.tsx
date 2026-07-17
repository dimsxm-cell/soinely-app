import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import Page from "./page";

describe("Home page", () => {
  it("renders the Soinely name in the nav", () => {
    render(<Page />);
    expect(within(screen.getByRole("navigation")).getByText("Soinely")).toBeInTheDocument();
  });

  it("links the signup CTA to /login", () => {
    render(<Page />);
    const ctas = screen.getAllByRole("link", { name: /créer mon compte/i });
    expect(ctas.length).toBeGreaterThan(0);
    for (const cta of ctas) {
      expect(cta).toHaveAttribute("href", "/login");
    }
  });
});
