import { describe, expect, it } from "vitest";
import { estJourFerie, estJourMajore, joursFeries } from "./jours-feries";

describe("joursFeries", () => {
  it("compte onze jours fériés en métropole", () => {
    expect(joursFeries(2026).size).toBe(11);
  });

  it("en compte treize dans les DOM", () => {
    // Vendredi saint et abolition de l'esclavage s'ajoutent aux onze autres.
    expect(joursFeries(2026, "dom").size).toBe(13);
  });

  it.each([
    [2026, "2026-04-06", "lundi de Pâques"],
    [2026, "2026-05-14", "Ascension"],
    [2026, "2026-05-25", "lundi de Pentecôte"],
    [2025, "2025-04-21", "lundi de Pâques"],
    [2025, "2025-05-29", "Ascension"],
    [2024, "2024-04-01", "lundi de Pâques"],
  ])("place correctement les fêtes mobiles de %s : %s", (annee, date) => {
    expect(joursFeries(annee).has(date)).toBe(true);
  });

  it("retient les fêtes fixes", () => {
    const feries = joursFeries(2026);
    for (const date of [
      "2026-01-01",
      "2026-05-01",
      "2026-05-08",
      "2026-07-14",
      "2026-08-15",
      "2026-11-01",
      "2026-11-11",
      "2026-12-25",
    ]) {
      expect(feries.has(date)).toBe(true);
    }
  });
});

describe("estJourFerie", () => {
  it("reconnaît un férié métropolitain", () => {
    expect(estJourFerie("2026-05-08")).toBe(true);
  });

  it("ne majore pas un jour ordinaire", () => {
    expect(estJourFerie("2026-05-07")).toBe(false);
  });

  it("reconnaît l'abolition de l'esclavage en Guadeloupe, ignorée en métropole", () => {
    expect(estJourFerie("2026-05-27", "dom")).toBe(true);
    expect(estJourFerie("2026-05-27")).toBe(false);
  });

  it("reconnaît le Vendredi saint dans les DOM seulement", () => {
    // Pâques 2026 tombe le 5 avril : le Vendredi saint est le 3.
    expect(estJourFerie("2026-04-03", "dom")).toBe(true);
    expect(estJourFerie("2026-04-03")).toBe(false);
  });
});

describe("estJourMajore", () => {
  it("majore un dimanche", () => {
    // 2026-08-02 est un dimanche.
    expect(estJourMajore("2026-08-02")).toBe(true);
  });

  it("ne majore pas un samedi, la NGAP le réservant aux appels d'urgence", () => {
    // 2026-08-01 est un samedi. Rien ici ne distingue une urgence d'une
    // tournée ordinaire : majorer d'office exposerait à un indu.
    expect(estJourMajore("2026-08-01")).toBe(false);
  });

  it("majore un férié tombant en semaine", () => {
    // Le 14 juillet 2026 est un mardi.
    expect(estJourMajore("2026-07-14")).toBe(true);
  });

  it("ne majore pas un mardi ordinaire", () => {
    expect(estJourMajore("2026-07-07")).toBe(false);
  });

  it("majore le 27 mai en Guadeloupe, un mercredi ordinaire en métropole", () => {
    expect(estJourMajore("2026-05-27", "dom")).toBe(true);
    expect(estJourMajore("2026-05-27")).toBe(false);
  });

  it("lit le bon jour quel que soit le fuseau de la machine", () => {
    // Une date interprétée à minuit local basculerait au samedi sous un
    // décalage négatif. Ce dimanche doit le rester partout.
    expect(estJourMajore("2026-08-02")).toBe(true);
  });
});
