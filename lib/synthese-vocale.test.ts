import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  couperLecture,
  lireSupportSyntheseClient,
  lireSupportSyntheseServeur,
  lireTexteAVoixHaute,
} from "./synthese-vocale";

class FakeSpeechSynthesisUtterance {
  text: string;
  lang = "";
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

const speakMock = vi.fn();
const cancelMock = vi.fn();

beforeEach(() => {
  speakMock.mockReset();
  cancelMock.mockReset();
  window.SpeechSynthesisUtterance = FakeSpeechSynthesisUtterance as never;
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { speak: speakMock, cancel: cancelMock },
  });
});

afterEach(() => {
  Reflect.deleteProperty(window, "SpeechSynthesisUtterance");
  Reflect.deleteProperty(window, "speechSynthesis");
});

describe("lireSupportSyntheseClient", () => {
  it("retourne true quand window.speechSynthesis existe", () => {
    expect(lireSupportSyntheseClient()).toBe(true);
  });

  it("retourne false quand window.speechSynthesis est absent", () => {
    Reflect.deleteProperty(window, "speechSynthesis");
    expect(lireSupportSyntheseClient()).toBe(false);
  });
});

describe("lireSupportSyntheseServeur", () => {
  it("retourne toujours false (rendu serveur)", () => {
    expect(lireSupportSyntheseServeur()).toBe(false);
  });
});

describe("lireTexteAVoixHaute", () => {
  it("crée un utterance en français et le passe à speechSynthesis.speak", () => {
    const onDebut = vi.fn();
    const onFin = vi.fn();
    lireTexteAVoixHaute("Bonjour", onDebut, onFin);

    expect(speakMock).toHaveBeenCalledTimes(1);
    const utterance = speakMock.mock.calls[0][0] as FakeSpeechSynthesisUtterance;
    expect(utterance.text).toBe("Bonjour");
    expect(utterance.lang).toBe("fr-FR");
  });

  it("appelle onDebut quand la lecture démarre réellement (onstart)", () => {
    const onDebut = vi.fn();
    const onFin = vi.fn();
    lireTexteAVoixHaute("Bonjour", onDebut, onFin);

    const utterance = speakMock.mock.calls[0][0] as FakeSpeechSynthesisUtterance;
    utterance.onstart?.();

    expect(onDebut).toHaveBeenCalledTimes(1);
  });

  it("appelle onFin quand la lecture se termine normalement (onend)", () => {
    const onDebut = vi.fn();
    const onFin = vi.fn();
    lireTexteAVoixHaute("Bonjour", onDebut, onFin);

    const utterance = speakMock.mock.calls[0][0] as FakeSpeechSynthesisUtterance;
    utterance.onend?.();

    expect(onFin).toHaveBeenCalledTimes(1);
  });

  it("appelle onFin aussi en cas d'erreur (onerror, ex. coupure manuelle)", () => {
    const onDebut = vi.fn();
    const onFin = vi.fn();
    lireTexteAVoixHaute("Bonjour", onDebut, onFin);

    const utterance = speakMock.mock.calls[0][0] as FakeSpeechSynthesisUtterance;
    utterance.onerror?.();

    expect(onFin).toHaveBeenCalledTimes(1);
  });
});

describe("couperLecture", () => {
  it("appelle speechSynthesis.cancel", () => {
    couperLecture();
    expect(cancelMock).toHaveBeenCalledTimes(1);
  });
});
