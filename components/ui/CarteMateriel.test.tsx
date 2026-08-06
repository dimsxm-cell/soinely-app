import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CarteMateriel } from "./CarteMateriel";

vi.mock("@/lib/data/materiel-actions", () => ({
  updateMaterielAction: vi.fn(),
}));

vi.mock("@/components/ui/BadgeNiveauConfiance", () => ({
  BadgeNiveauConfiance: ({ niveau }: { niveau: string }) => <span>{niveau}</span>,
}));

const items = [
  { libelle: "Compresses stériles", quantite: 8 },
  { libelle: "Seringue", quantite: 2 },
];

describe("CarteMateriel", () => {
  it("affiche les articles avec leurs quantités", () => {
    render(<CarteMateriel items={items} tourneeId="t1" prepare={false} verifie={false} />);

    expect(screen.getByText("Compresses stériles")).toBeInTheDocument();
    expect(screen.getByText("×8")).toBeInTheDocument();
    expect(screen.getByText("Seringue")).toBeInTheDocument();
    expect(screen.getByText("×2")).toBeInTheDocument();
  });

  it("affiche le bouton non coché quand prepare est faux", () => {
    render(<CarteMateriel items={items} tourneeId="t1" prepare={false} verifie={false} />);
    expect(screen.getByRole("button", { name: "J'ai tout préparé" })).toBeInTheDocument();
  });

  it("affiche le bouton coché quand prepare est vrai", () => {
    render(<CarteMateriel items={items} tourneeId="t1" prepare={true} verifie={false} />);
    expect(screen.getByRole("button", { name: "✓ Préparé" })).toBeInTheDocument();
  });

  it("les deux boutons basculent indépendamment", () => {
    render(<CarteMateriel items={items} tourneeId="t1" prepare={true} verifie={false} />);
    expect(screen.getByRole("button", { name: "✓ Préparé" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tout vérifié" })).toBeInTheDocument();
  });

  it("affiche le badge de niveau de confiance 'brouillon'", () => {
    render(<CarteMateriel items={items} tourneeId="t1" prepare={false} verifie={false} />);
    expect(screen.getByText("brouillon")).toBeInTheDocument();
  });
});
