import { describe, expect, it } from "vitest";
import { filtrerNomsPatients } from "./ely-redaction";

describe("filtrerNomsPatients", () => {
  it("remplace le nom et le prénom d'un patient de la liste", () => {
    expect(filtrerNomsPatients("Madame Dupont a une plaie qui suinte", ["Jean Dupont"])).toBe(
      "Madame [patient] a une plaie qui suinte"
    );
  });

  it("ignore la casse", () => {
    expect(filtrerNomsPatients("DUPONT ne va pas bien", ["Jean Dupont"])).toBe(
      "[patient] ne va pas bien"
    );
  });

  it("ignore les accents, dans les deux sens", () => {
    expect(filtrerNomsPatients("Émilie a de la fièvre", ["Emilie Martin"])).toBe(
      "[patient] a de la fièvre"
    );
    expect(filtrerNomsPatients("Emilie a de la fièvre", ["Émilie Martin"])).toBe(
      "[patient] a de la fièvre"
    );
  });

  it("ne filtre pas les tokens de moins de 2 caractères", () => {
    expect(filtrerNomsPatients("Le patient a du mal à respirer", ["Anne A Dupont"])).toBe(
      "Le patient a du mal à respirer"
    );
  });

  it("ne remplace pas un mot qui contient seulement le token en sous-chaîne", () => {
    expect(filtrerNomsPatients("Elle mange une banane", ["Ana Petit"])).toBe(
      "Elle mange une banane"
    );
  });

  it("filtre plusieurs patients de la tournée du jour", () => {
    expect(
      filtrerNomsPatients("Dupont va bien mais Martin tousse", ["Jean Dupont", "Léa Martin"])
    ).toBe("[patient] va bien mais [patient] tousse");
  });

  it("renvoie la question inchangée sans patient dans la liste", () => {
    expect(filtrerNomsPatients("Une plaie qui s'infecte", [])).toBe("Une plaie qui s'infecte");
  });

  it("filtre les prénoms composés avec trait d'union (Marie-Claude)", () => {
    expect(filtrerNomsPatients("Marie-Claude a mal au dos", ["Marie-Claude Dubois"])).toBe(
      "[patient] a mal au dos"
    );
  });

  it("filtre les prénoms composés avec trait d'union (Jean-Baptiste)", () => {
    expect(filtrerNomsPatients("Jean-Baptiste tousse", ["Jean-Baptiste Roy"])).toBe(
      "[patient] tousse"
    );
  });

  it("filtre les noms avec apostrophe (O'Brien)", () => {
    expect(filtrerNomsPatients("Le fils de O'Brien pleure", ["O'Brien Marie"])).toBe(
      "Le fils de [patient] pleure"
    );
  });

  it("redacte un mot composé dont une seule partie correspond à un nom connu (nom d'usage marital)", () => {
    expect(filtrerNomsPatients("Madame Dupont-Legrand a une plaie", ["Jean Dupont"])).toBe(
      "Madame [patient] a une plaie"
    );
  });

  it("reconnaît l'apostrophe typographique (’) dans le nom du patient et dans la question", () => {
    expect(filtrerNomsPatients("Le fils de O’Brien pleure", ["O’Brien Marie"])).toBe(
      "Le fils de [patient] pleure"
    );
  });
});
