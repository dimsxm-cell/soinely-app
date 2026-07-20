import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LienRetour } from "./LienRetour";

describe("LienRetour", () => {
  it("affiche le label et pointe vers le bon href", () => {
    render(<LienRetour href="/ma-journee" label="Ma journée" />);

    const lien = screen.getByRole("link", { name: /Ma journée/ });
    expect(lien).toHaveAttribute("href", "/ma-journee");
  });
});
