import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PiedDePageMarketing } from "./PiedDePageMarketing";

describe("PiedDePageMarketing", () => {
  it("n'affiche plus l'affirmation de conformite RGPD", () => {
    render(<PiedDePageMarketing />);
    expect(screen.queryByText(/conforme RGPD/i)).not.toBeInTheDocument();
  });

  it("affiche le logo et le copyright", () => {
    render(<PiedDePageMarketing />);
    expect(screen.getByText("SOINELY")).toBeInTheDocument();
    expect(screen.getByText(`© SOINELY ${new Date().getFullYear()}`)).toBeInTheDocument();
  });
});
