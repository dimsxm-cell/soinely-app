import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const usePathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

describe("BarreSuperieure", () => {
  it("affiche le lien vers Ma journée, Rechercher et Mon compte", async () => {
    usePathnameMock.mockReturnValue("/compte");
    const { BarreSuperieure } = await import("./BarreSuperieure");

    render(<BarreSuperieure />);

    expect(screen.getByRole("link", { name: /Soinely/ })).toHaveAttribute("href", "/ma-journee");
    expect(screen.getByRole("link", { name: "Rechercher" })).toHaveAttribute("href", "/recherche");
    expect(screen.getByRole("link", { name: "Mon compte" })).toHaveAttribute("href", "/compte");
  });

  it("disparaît sur toute la zone /patients, qui porte désormais son propre en-tête", async () => {
    const { BarreSuperieure } = await import("./BarreSuperieure");

    for (const pathname of ["/patients", "/patients/nouveau", "/patients/p1", "/patients/p1/prescriptions"]) {
      usePathnameMock.mockReturnValue(pathname);
      const { container, unmount } = render(<BarreSuperieure />);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });

  it("disparaît sur Accueil et Ma tournée, qui portent désormais leur propre logo et profil", async () => {
    const { BarreSuperieure } = await import("./BarreSuperieure");

    usePathnameMock.mockReturnValue("/ma-journee");
    const { container, unmount } = render(<BarreSuperieure />);
    expect(container).toBeEmptyDOMElement();
    unmount();

    usePathnameMock.mockReturnValue("/ma-tournee");
    const { container: container2, unmount: unmount2 } = render(<BarreSuperieure />);
    expect(container2).toBeEmptyDOMElement();
    unmount2();

    // Une sous-route de /ma-journee (fiche mission) n'a pas de bandeau
    // violet : la barre globale doit y rester visible.
    usePathnameMock.mockReturnValue("/ma-journee/m1");
    render(<BarreSuperieure />);
    expect(screen.getByRole("link", { name: "Mon compte" })).toBeInTheDocument();
  });

  it("disparaît sur Ely, qui porte désormais son propre bandeau violet", async () => {
    const { BarreSuperieure } = await import("./BarreSuperieure");

    usePathnameMock.mockReturnValue("/ely");
    const { container } = render(<BarreSuperieure />);
    expect(container).toBeEmptyDOMElement();
  });

  it("disparaît sur les 3 listes d'Explorer, mais reste sur leurs fiches de détail", async () => {
    const { BarreSuperieure } = await import("./BarreSuperieure");

    for (const pathname of ["/situations", "/situations/dossier", "/situations/informations-professionnelles"]) {
      usePathnameMock.mockReturnValue(pathname);
      const { container, unmount } = render(<BarreSuperieure />);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }

    usePathnameMock.mockReturnValue("/situations/s1");
    render(<BarreSuperieure />);
    expect(screen.getByRole("link", { name: "Mon compte" })).toBeInTheDocument();
  });
});
