import { afterEach, describe, expect, it } from "vitest";
import {
  creerReconnaissanceVocale,
  lireSupportVocalClient,
  lireSupportVocalServeur,
  souscrireSupportVocal,
} from "./reconnaissance-vocale";

class FakeSpeechRecognition {
  lang = "";
  interimResults = false;
  maxAlternatives = 1;
  continuous = false;
}

afterEach(() => {
  Reflect.deleteProperty(window, "SpeechRecognition");
  Reflect.deleteProperty(window, "webkitSpeechRecognition");
});

describe("lireSupportVocalClient", () => {
  it("retourne false si aucune API de reconnaissance n'est disponible", () => {
    expect(lireSupportVocalClient()).toBe(false);
  });

  it("retourne true si SpeechRecognition est disponible", () => {
    window.SpeechRecognition = FakeSpeechRecognition as never;
    expect(lireSupportVocalClient()).toBe(true);
  });

  it("retourne true si seul webkitSpeechRecognition est disponible", () => {
    window.webkitSpeechRecognition = FakeSpeechRecognition as never;
    expect(lireSupportVocalClient()).toBe(true);
  });
});

describe("lireSupportVocalServeur", () => {
  it("retourne toujours false", () => {
    expect(lireSupportVocalServeur()).toBe(false);
  });
});

describe("souscrireSupportVocal", () => {
  it("retourne une fonction de désinscription sans effet", () => {
    const desinscrire = souscrireSupportVocal();
    expect(() => desinscrire()).not.toThrow();
  });
});

describe("creerReconnaissanceVocale", () => {
  it("retourne null si aucune API n'est disponible", () => {
    expect(creerReconnaissanceVocale()).toBeNull();
  });

  it("configure la reconnaissance en français, résultat unique, non continue par défaut", () => {
    window.SpeechRecognition = FakeSpeechRecognition as never;

    const recognition = creerReconnaissanceVocale();

    expect(recognition?.lang).toBe("fr-FR");
    expect(recognition?.interimResults).toBe(false);
    expect(recognition?.maxAlternatives).toBe(1);
    expect(recognition?.continuous).toBe(false);
  });

  it("active l'écoute continue quand demandé", () => {
    window.SpeechRecognition = FakeSpeechRecognition as never;

    const recognition = creerReconnaissanceVocale({ continuous: true });

    expect(recognition?.continuous).toBe(true);
  });
});
