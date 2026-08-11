import { afterEach, describe, expect, it, vi } from "vitest";
import { formatDateDuJour, initialesUtilisateur } from "./format";

describe("initialesUtilisateur", () => {
  it("prend la premiere lettre du premier mot et la premiere lettre du dernier mot", () => {
    expect(initialesUtilisateur("Sophie Lambert")).toBe("SL");
  });

  it("gere un nom a un seul mot en prenant ses 2 premieres lettres", () => {
    expect(initialesUtilisateur("Madonna")).toBe("MA");
  });

  it("prend premier et dernier mot, pas premier et deuxieme, pour un nom a 3 mots", () => {
    expect(initialesUtilisateur("Marie Claire Dubois")).toBe("MD");
  });

  it("rend une chaine vide pour un nom vide", () => {
    expect(initialesUtilisateur("")).toBe("");
  });
});

describe("formatDateDuJour (deplacee depuis lib/accueil-vue.ts)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formate la date du jour en toutes lettres, capitalisee", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T09:00:00"));
    expect(formatDateDuJour()).toBe("Samedi 8 août");
  });
});
