import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OngletsExplorer } from "./OngletsExplorer";

describe("OngletsExplorer", () => {
  it("renders both tab labels as links to their routes", () => {
    render(<OngletsExplorer actif="situations" />);

    const situations = screen.getByRole("link", { name: "Situations Terrain" });
    const dossier = screen.getByRole("link", { name: "Dossier de soins" });

    expect(situations).toHaveAttribute("href", "/situations");
    expect(dossier).toHaveAttribute("href", "/situations/dossier");
  });

  it("marks the active tab with aria-current", () => {
    render(<OngletsExplorer actif="dossier" />);

    expect(screen.getByRole("link", { name: "Dossier de soins" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Situations Terrain" })).not.toHaveAttribute("aria-current");
  });
});
