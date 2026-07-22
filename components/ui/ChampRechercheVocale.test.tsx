import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChampRechercheVocale } from "./ChampRechercheVocale";
import { acquerirMicrophone, _reinitialiserVerrouPourTests } from "@/lib/verrou-microphone";
import type { SpeechRecognitionEvent } from "@/lib/reconnaissance-vocale";

let instances: FakeSpeechRecognition[] = [];

class FakeSpeechRecognition {
  lang = "";
  interimResults = false;
  maxAlternatives = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
  start = vi.fn();
  stop = vi.fn();

  constructor() {
    instances.push(this);
  }
}

function derniereInstance(): FakeSpeechRecognition {
  return instances[instances.length - 1];
}

function evenementTranscript(transcript: string): SpeechRecognitionEvent {
  return { results: { 0: { 0: { transcript } } } } as unknown as SpeechRecognitionEvent;
}

beforeEach(() => {
  instances = [];
  _reinitialiserVerrouPourTests();
});

afterEach(() => {
  Reflect.deleteProperty(window, "SpeechRecognition");
});

describe("ChampRechercheVocale", () => {
  it("affiche un champ de recherche avec la valeur par défaut", () => {
    render(<ChampRechercheVocale defaultValue="plaie infectée" placeholder="Poser une question" ariaLabel="Question" />);
    expect(screen.getByLabelText("Question")).toHaveValue("plaie infectée");
  });

  it("ne montre pas le bouton micro si la reconnaissance vocale n'est pas supportée", () => {
    render(<ChampRechercheVocale defaultValue="" placeholder="Poser une question" ariaLabel="Question" />);
    expect(screen.queryByRole("button", { name: /Dicter/i })).not.toBeInTheDocument();
  });

  it("remplace la valeur du champ avec la dictée", () => {
    window.SpeechRecognition = FakeSpeechRecognition as never;

    render(<ChampRechercheVocale defaultValue="" placeholder="Poser une question" ariaLabel="Question" />);
    fireEvent.click(screen.getByRole("button", { name: "Dicter la question au micro" }));

    act(() => {
      derniereInstance().onresult?.(evenementTranscript("le patient a une plaie qui s'infecte"));
    });

    expect(screen.getByLabelText("Question")).toHaveValue("le patient a une plaie qui s'infecte");
  });

  it("vole le verrou micro à un autre détenteur au clic sur le micro", () => {
    window.SpeechRecognition = FakeSpeechRecognition as never;
    const libererAutre = vi.fn();
    acquerirMicrophone("ecoute-fond", libererAutre);

    render(<ChampRechercheVocale defaultValue="" placeholder="Poser une question" ariaLabel="Question" />);
    fireEvent.click(screen.getByRole("button", { name: "Dicter la question au micro" }));

    expect(libererAutre).toHaveBeenCalledTimes(1);
    expect(derniereInstance().start).toHaveBeenCalled();
  });

  it("libère le verrou micro une fois la dictée terminée", () => {
    window.SpeechRecognition = FakeSpeechRecognition as never;

    render(<ChampRechercheVocale defaultValue="" placeholder="Poser une question" ariaLabel="Question" />);
    fireEvent.click(screen.getByRole("button", { name: "Dicter la question au micro" }));
    act(() => {
      derniereInstance().onend?.();
    });

    expect(acquerirMicrophone("dictee", vi.fn())).toBe(true);
  });
});
