import { render } from "@testing-library/react";
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
  usePathname: () => "/ely",
}));

describe("PersistanceRecherche", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    mockReplaceCall = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockLocalStorage.clear();
    mockReplaceCall = null;
  });

  it("restaure la dernière recherche depuis localStorage quand requeteActuelle est vide", async () => {
    mockLocalStorage.setItem("ely_derniere_requete", "plaie infectée");

    const { PersistanceRecherche } = await import("./PersistanceRecherche");
    render(
      <PersistanceRecherche cle="ely_derniere_requete" requeteActuelle="" />
    );

    expect(mockReplaceCall).toBe("/ely?q=plaie%20infect%C3%A9e");
  });

  it("sauvegarde la requete actuelle dans localStorage quand elle n'est pas vide", async () => {
    const { PersistanceRecherche } = await import("./PersistanceRecherche");
    render(
      <PersistanceRecherche cle="ely_derniere_requete" requeteActuelle="hypoglycémie" />
    );

    expect(mockLocalStorage.getItem("ely_derniere_requete")).toBe("hypoglycémie");
  });

  it("ne restaure pas quand localStorage est vide et requeteActuelle est vide", async () => {
    const { PersistanceRecherche } = await import("./PersistanceRecherche");
    render(
      <PersistanceRecherche cle="ely_derniere_requete" requeteActuelle="" />
    );

    expect(mockReplaceCall).toBeNull();
  });
});
