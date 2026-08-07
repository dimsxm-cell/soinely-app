import { render } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

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

describe("PersistanceRecherche", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockLocalStorage.clear();
  });

  it("restaure la dernière recherche depuis localStorage quand requeteActuelle est vide, sans naviguer", async () => {
    mockLocalStorage.setItem("ely_derniere_requete", "plaie infectée");
    const onRestaurer = vi.fn();

    const { PersistanceRecherche } = await import("./PersistanceRecherche");
    render(
      <PersistanceRecherche cle="ely_derniere_requete" requeteActuelle="" onRestaurer={onRestaurer} />
    );

    expect(onRestaurer).toHaveBeenCalledWith("plaie infectée");
  });

  it("sauvegarde la requete actuelle dans localStorage quand elle n'est pas vide", async () => {
    const onRestaurer = vi.fn();
    const { PersistanceRecherche } = await import("./PersistanceRecherche");
    render(
      <PersistanceRecherche cle="ely_derniere_requete" requeteActuelle="hypoglycémie" onRestaurer={onRestaurer} />
    );

    expect(mockLocalStorage.getItem("ely_derniere_requete")).toBe("hypoglycémie");
    expect(onRestaurer).not.toHaveBeenCalled();
  });

  it("ne restaure pas quand localStorage est vide et requeteActuelle est vide", async () => {
    const onRestaurer = vi.fn();
    const { PersistanceRecherche } = await import("./PersistanceRecherche");
    render(
      <PersistanceRecherche cle="ely_derniere_requete" requeteActuelle="" onRestaurer={onRestaurer} />
    );

    expect(onRestaurer).not.toHaveBeenCalled();
  });
});
