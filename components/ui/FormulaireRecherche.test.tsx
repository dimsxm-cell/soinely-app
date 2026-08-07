import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock localStorage
const mockLocalStorage = {
  store: {} as Record<string, string>,
  getItem: (key: string) => mockLocalStorage.store[key] ?? null,
  setItem: (key: string, value: string) => {
    mockLocalStorage.store[key] = value;
  },
  clear: () => {
    mockLocalStorage.store = {};
  },
  removeItem: (key: string) => {
    delete mockLocalStorage.store[key];
  },
  key: (index: number) => {
    const keys = Object.keys(mockLocalStorage.store);
    return keys[index] ?? null;
  },
  get length() {
    return Object.keys(mockLocalStorage.store).length;
  },
};

vi.stubGlobal("localStorage", mockLocalStorage);

// Track mock calls
let mockReplaceCall: string | null = null;

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: (path: string) => {
      mockReplaceCall = path;
    },
  }),
  usePathname: () => "/recherche",
}));

describe("FormulaireRecherche", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    mockReplaceCall = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockLocalStorage.clear();
    mockReplaceCall = null;
  });

  it("restaure la dernière recherche depuis localStorage et relance automatiquement la recherche (navigation)", async () => {
    mockLocalStorage.setItem("recherche_derniere_requete", "plaie infectée");

    const { FormulaireRecherche } = await import("./FormulaireRecherche");
    render(<FormulaireRecherche requeteInitiale="" />);

    expect(mockReplaceCall).toBe("/recherche?q=plaie%20infect%C3%A9e");
  });

  it("remplit aussi le champ de saisie avec la valeur restaurée", async () => {
    mockLocalStorage.setItem("recherche_derniere_requete", "plaie infectée");

    const { FormulaireRecherche } = await import("./FormulaireRecherche");
    render(<FormulaireRecherche requeteInitiale="" />);

    expect(screen.getByLabelText("Rechercher une situation terrain")).toHaveValue("plaie infectée");
  });

  it("sauvegarde la requete actuelle dans localStorage quand elle n'est pas vide, sans naviguer", async () => {
    const { FormulaireRecherche } = await import("./FormulaireRecherche");
    render(<FormulaireRecherche requeteInitiale="hypoglycémie" />);

    expect(mockLocalStorage.getItem("recherche_derniere_requete")).toBe("hypoglycémie");
    expect(mockReplaceCall).toBeNull();
  });

  it("ne restaure pas et ne navigue pas quand localStorage est vide et requeteInitiale est vide", async () => {
    const { FormulaireRecherche } = await import("./FormulaireRecherche");
    render(<FormulaireRecherche requeteInitiale="" />);

    expect(mockReplaceCall).toBeNull();
  });
});
