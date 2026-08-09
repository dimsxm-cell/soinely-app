import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CtaFinal } from "./CtaFinal";

describe("CtaFinal", () => {
  it("affiche le texte exact de la spec et le CTA vers /login", () => {
    render(<CtaFinal />);
    expect(screen.getByText("Vous prenez soin de vos patients.")).toBeInTheDocument();
    expect(screen.getByText("ELY prend soin de votre journée.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /rejoindre la bêta privée/i })).toHaveAttribute("href", "/login");
    expect(screen.getByText("Gratuit pendant la bêta • Sans engagement")).toBeInTheDocument();
  });
});
