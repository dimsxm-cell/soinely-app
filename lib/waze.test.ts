import { describe, expect, it } from "vitest";
import { hrefWaze } from "./waze";

describe("hrefWaze", () => {
  it("utilise les coordonnées quand elles sont disponibles", () => {
    const href = hrefWaze({ latitude: 48.8566, longitude: 2.3522, adresse: "1 rue de Rivoli, Paris" });
    expect(href).toBe("https://waze.com/ul?navigate=yes&ll=48.8566%2C2.3522");
  });

  it("se rabat sur l'adresse quand les coordonnées sont absentes", () => {
    const href = hrefWaze({ latitude: null, longitude: null, adresse: "12 rue des Lilas, 75011 Paris" });
    expect(href).toBe("https://waze.com/ul?navigate=yes&q=12+rue+des+Lilas%2C+75011+Paris");
  });

  it("se rabat sur l'adresse si seule la longitude manque", () => {
    const href = hrefWaze({ latitude: 48.8566, longitude: null, adresse: "Adresse partielle" });
    expect(href).toBe("https://waze.com/ul?navigate=yes&q=Adresse+partielle");
  });
});
