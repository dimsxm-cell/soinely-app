import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const usePathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

describe("BarreSuperieure", () => {
  it("affiche le lien vers Ma journée, Rechercher et Mon compte", async () => {
    usePathnameMock.mockReturnValue("/ma-journee");
    const { BarreSuperieure } = await import("./BarreSuperieure");

    render(<BarreSuperieure />);

    expect(screen.getByRole("link", { name: /Soinely/ })).toHaveAttribute("href", "/ma-journee");
    expect(screen.getByRole("link", { name: "Rechercher" })).toHaveAttribute("href", "/recherche");
    expect(screen.getByRole("link", { name: "Mon compte" })).toHaveAttribute("href", "/compte");
  });

  it("reste affichée sur la liste des patients et la création d'un patient", async () => {
    const { BarreSuperieure } = await import("./BarreSuperieure");

    usePathnameMock.mockReturnValue("/patients");
    const { unmount } = render(<BarreSuperieure />);
    expect(screen.getByRole("link", { name: "Mon compte" })).toBeInTheDocument();
    unmount();

    usePathnameMock.mockReturnValue("/patients/nouveau");
    render(<BarreSuperieure />);
    expect(screen.getByRole("link", { name: "Mon compte" })).toBeInTheDocument();
  });

  it("disparaît sur la fiche patient, qui porte déjà son propre en-tête", async () => {
    const { BarreSuperieure } = await import("./BarreSuperieure");

    usePathnameMock.mockReturnValue("/patients/p1");
    const { container, unmount } = render(<BarreSuperieure />);
    expect(container).toBeEmptyDOMElement();
    unmount();

    usePathnameMock.mockReturnValue("/patients/p1/prescriptions");
    const { container: container2 } = render(<BarreSuperieure />);
    expect(container2).toBeEmptyDOMElement();
  });
});
