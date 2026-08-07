import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BadgeSyntheseIA } from "./BadgeSyntheseIA";

describe("BadgeSyntheseIA", () => {
  it("affiche le texte Synthèse IA", () => {
    render(<BadgeSyntheseIA />);
    expect(screen.getByText("Synthèse IA")).toBeInTheDocument();
  });
});
