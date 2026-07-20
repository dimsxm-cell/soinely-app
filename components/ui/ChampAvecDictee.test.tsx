import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChampAvecDictee } from "./ChampAvecDictee";
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

describe("ChampAvecDictee", () => {
  beforeEach(() => {
    instances = [];
  });

  afterEach(() => {
    Reflect.deleteProperty(window, "SpeechRecognition");
  });

  it("affiche un input simple avec la valeur par défaut", () => {
    render(<ChampAvecDictee name="nomComplet" label="Nom" defaultValue="Mme Dupont" />);
    expect(screen.getByLabelText("Nom")).toHaveValue("Mme Dupont");
  });

  it("affiche un textarea quand multiligne est activé", () => {
    render(<ChampAvecDictee name="consignes" label="Consignes" multiligne rows={3} />);
    expect(screen.getByLabelText("Consignes").tagName).toBe("TEXTAREA");
  });

  it("ne montre pas le bouton micro si la reconnaissance vocale n'est pas supportée", () => {
    render(<ChampAvecDictee name="adresse" label="Adresse" />);
    expect(screen.queryByRole("button", { name: /Dicter/i })).not.toBeInTheDocument();
  });

  it("remplace la valeur d'un champ simple avec la dictée", () => {
    window.SpeechRecognition = FakeSpeechRecognition as never;

    render(<ChampAvecDictee name="adresse" label="Adresse" defaultValue="ancienne adresse" />);
    fireEvent.click(screen.getByRole("button", { name: "Dicter — Adresse" }));

    const instance = derniereInstance();
    expect(instance.start).toHaveBeenCalled();
    act(() => {
      instance.onresult?.(evenementTranscript("12 rue de la Paix"));
    });

    expect(screen.getByLabelText("Adresse")).toHaveValue("12 rue de la Paix");
  });

  it("ajoute la dictée à la suite du texte existant pour un champ multiligne", () => {
    window.SpeechRecognition = FakeSpeechRecognition as never;

    render(<ChampAvecDictee name="consignes" label="Consignes" defaultValue="Note existante" multiligne />);
    fireEvent.click(screen.getByRole("button", { name: "Dicter — Consignes" }));

    act(() => {
      derniereInstance().onresult?.(evenementTranscript("nouvelle info"));
    });

    expect(screen.getByLabelText("Consignes")).toHaveValue("Note existante nouvelle info");
  });
});
