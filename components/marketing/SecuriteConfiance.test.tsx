import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SecuriteConfiance } from "./SecuriteConfiance";

describe("SecuriteConfiance", () => {
  it("utilise la formulation sûre de la spec, sans affirmation de conformité non validée", () => {
    render(<SecuriteConfiance />);
    expect(
      screen.getByText("Conçu avec la confidentialité et la protection des données comme exigences de base.")
    ).toBeInTheDocument();
    expect(screen.queryByText(/conforme RGPD/i)).not.toBeInTheDocument();
  });

  it("porte l'ancre #securite pour le lien de navigation du header", () => {
    const { container } = render(<SecuriteConfiance />);
    expect(container.querySelector("section#securite")).toBeInTheDocument();
  });
});
