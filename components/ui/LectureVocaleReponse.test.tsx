import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LectureVocaleReponse } from "./LectureVocaleReponse";

class FakeSpeechSynthesisUtterance {
  text: string;
  lang = "";
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

let currentUtterance: FakeSpeechSynthesisUtterance | null = null;
const speakMock = vi.fn((utterance: FakeSpeechSynthesisUtterance) => {
  currentUtterance = utterance;
});
const cancelMock = vi.fn();

beforeEach(() => {
  currentUtterance = null;
  speakMock.mockClear();
  cancelMock.mockClear();
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

describe("LectureVocaleReponse", () => {
  it("lance la lecture au montage et affiche le bouton Couper", async () => {
    render(<LectureVocaleReponse texte="Bonjour, ceci est un test." />);

    expect(speakMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("button", { name: /Couper/i })).toBeInTheDocument();
  });

  it("cache le bouton une fois la lecture terminée (onend)", async () => {
    render(<LectureVocaleReponse texte="Bonjour" />);
    await screen.findByRole("button", { name: /Couper/i });

    act(() => {
      currentUtterance?.onend?.();
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Couper/i })).not.toBeInTheDocument();
    });
  });

  it("coupe la lecture au clic sur le bouton", async () => {
    render(<LectureVocaleReponse texte="Bonjour" />);
    const bouton = await screen.findByRole("button", { name: /Couper/i });

    fireEvent.click(bouton);

    expect(cancelMock).toHaveBeenCalled();
  });

  it("ne rend rien si la synthèse vocale n'est pas supportée", () => {
    Reflect.deleteProperty(window, "speechSynthesis");

    const { container } = render(<LectureVocaleReponse texte="Bonjour" />);

    expect(speakMock).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it("ne rend rien et ne lit rien si le texte est vide", () => {
    const { container } = render(<LectureVocaleReponse texte="   " />);

    expect(speakMock).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });
});
