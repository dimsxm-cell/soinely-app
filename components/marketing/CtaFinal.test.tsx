import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CtaFinal } from "./CtaFinal";
import { DUREE_ESSAI_GRATUIT_JOURS } from "@/lib/data/abonnement";

describe("CtaFinal", () => {
  it("affiche le texte exact de la spec et le CTA vers /login", () => {
    render(<CtaFinal />);
    expect(screen.getByText("Vous prenez soin de vos patients.")).toBeInTheDocument();
    expect(screen.getByText("ELY prend soin de votre journée.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /rejoindre la bêta privée/i })).toHaveAttribute("href", "/login");
    expect(
      screen.getByText(`Gratuit ${DUREE_ESSAI_GRATUIT_JOURS} jours • Sans engagement`)
    ).toBeInTheDocument();
  });
});
