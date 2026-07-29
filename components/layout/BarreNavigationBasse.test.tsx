import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const usePathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
  useRouter: () => ({ push: vi.fn() }),
}));

describe("BarreNavigationBasse", () => {
  it("affiche les 5 destinations, Ely occupant la place centrale", async () => {
    usePathnameMock.mockReturnValue("/ma-journee");
    const { BarreNavigationBasse } = await import("./BarreNavigationBasse");

    render(<BarreNavigationBasse />);

    expect(screen.getByRole("link", { name: /Accueil/ })).toHaveAttribute("href", "/ma-journee");
    expect(screen.getByRole("link", { name: /Ma tournée/ })).toHaveAttribute("href", "/ma-tournee");
    expect(screen.getByRole("link", { name: /Patients/ })).toHaveAttribute("href", "/patients");
    // Explorer ouvre directement sur « Dossier de soins », son premier onglet.
    expect(screen.getByRole("link", { name: /Explorer/ })).toHaveAttribute("href", "/situations/dossier");
    expect(screen.getByRole("link", { name: /Ely/ })).toHaveAttribute("href", "/ely");
  });

  it("garde l'onglet Explorer actif sur les autres sous-onglets de la section", async () => {
    usePathnameMock.mockReturnValue("/situations/informations-professionnelles");
    const { BarreNavigationBasse } = await import("./BarreNavigationBasse");

    render(<BarreNavigationBasse />);

    expect(screen.getByRole("link", { name: /Explorer/ })).toHaveAttribute("aria-current", "page");
  });

  it("marque l'onglet correspondant à la page courante comme actif", async () => {
    usePathnameMock.mockReturnValue("/patients");
    const { BarreNavigationBasse } = await import("./BarreNavigationBasse");

    render(<BarreNavigationBasse />);

    expect(screen.getByRole("link", { name: /Patients/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Accueil/ })).not.toHaveAttribute("aria-current");
  });

  it("marque l'onglet Patients actif aussi sur une sous-page (/patients/p1)", async () => {
    usePathnameMock.mockReturnValue("/patients/p1");
    const { BarreNavigationBasse } = await import("./BarreNavigationBasse");

    render(<BarreNavigationBasse />);

    expect(screen.getByRole("link", { name: /Patients/ })).toHaveAttribute("aria-current", "page");
  });
});
