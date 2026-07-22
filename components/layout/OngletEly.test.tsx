import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OngletEly } from "./OngletEly";
import type { SpeechRecognitionEvent } from "@/lib/reconnaissance-vocale";
import { acquerirMicrophone, _reinitialiserVerrouPourTests } from "@/lib/verrou-microphone";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

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

let currentUtterance: FakeSpeechSynthesisUtterance | null = null;
const speakMock = vi.fn((utterance: FakeSpeechSynthesisUtterance) => {
  currentUtterance = utterance;
});
const cancelMock = vi.fn();
const vibrateMock = vi.fn();

beforeEach(() => {
  _reinitialiserVerrouPourTests();
  vi.useFakeTimers();
  instances = [];
  currentUtterance = null;
  pushMock.mockClear();
  speakMock.mockClear();
  cancelMock.mockClear();
  vibrateMock.mockClear();
  window.SpeechRecognition = FakeSpeechRecognition as never;
  window.SpeechSynthesisUtterance = FakeSpeechSynthesisUtterance as never;
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { speak: speakMock, cancel: cancelMock },
  });
  Object.defineProperty(window.navigator, "vibrate", {
    configurable: true,
    value: vibrateMock,
  });
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(window, "SpeechRecognition");
  Reflect.deleteProperty(window, "SpeechSynthesisUtterance");
  Reflect.deleteProperty(window, "speechSynthesis");
  Reflect.deleteProperty(window.navigator, "vibrate");
});

describe("OngletEly", () => {
  it("un tap court ne déclenche pas la séquence vocale", () => {
    render(<OngletEly actif={false} />);
    const lien = screen.getByRole("link", { name: /Ely/ });

    fireEvent.pointerDown(lien);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.pointerUp(lien);
    fireEvent.click(lien);

    expect(vibrateMock).not.toHaveBeenCalled();
    expect(speakMock).not.toHaveBeenCalled();
  });

  it("relâcher avant le seuil annule le minuteur, même si on attend ensuite", () => {
    render(<OngletEly actif={false} />);
    const lien = screen.getByRole("link", { name: /Ely/ });

    fireEvent.pointerDown(lien);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.pointerUp(lien);
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(vibrateMock).not.toHaveBeenCalled();
    expect(speakMock).not.toHaveBeenCalled();
  });

  it("un appui long déclenche une vibration puis « Je t'écoute »", () => {
    render(<OngletEly actif={false} />);
    const lien = screen.getByRole("link", { name: /Ely/ });

    fireEvent.pointerDown(lien);
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(vibrateMock).toHaveBeenCalledWith(50);
    expect(speakMock).toHaveBeenCalledTimes(1);
    expect(currentUtterance?.text).toBe("Je t'écoute");
  });

  it("démarre l'écoute de la question une fois la salutation terminée", () => {
    render(<OngletEly actif={false} />);
    const lien = screen.getByRole("link", { name: /Ely/ });

    fireEvent.pointerDown(lien);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => {
      currentUtterance?.onend?.();
    });

    expect(instances).toHaveLength(1);
    expect(derniereInstance().start).toHaveBeenCalled();
  });

  it("un second appui long pendant une séquence en cours est ignoré", () => {
    render(<OngletEly actif={false} />);
    const lien = screen.getByRole("link", { name: /Ely/ });

    // Premier appui long
    fireEvent.pointerDown(lien);
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(vibrateMock).toHaveBeenCalledTimes(1);
    expect(speakMock).toHaveBeenCalledTimes(1);

    // Second appui long pendant que la séquence est en cours
    fireEvent.pointerDown(lien);
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Vérifier que vibrate et speak n'ont pas été appelés une seconde fois
    expect(vibrateMock).toHaveBeenCalledTimes(1);
    expect(speakMock).toHaveBeenCalledTimes(1);
  });

  it("un second pointerDown avant le seuil remplace le minuteur précédent (un seul déclenchement)", () => {
    render(<OngletEly actif={false} />);
    const lien = screen.getByRole("link", { name: /Ely/ });

    // Premier doigt pose un minuteur
    fireEvent.pointerDown(lien);
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Second doigt pose un minuteur sans relâcher le premier (multi-touch)
    fireEvent.pointerDown(lien);
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Seul le minuteur du second appui doit avoir survécu : une seule séquence démarre
    expect(vibrateMock).toHaveBeenCalledTimes(1);
    expect(speakMock).toHaveBeenCalledTimes(1);
  });

  it("navigue vers /ely avec la question captée en paramètre", () => {
    render(<OngletEly actif={false} />);
    const lien = screen.getByRole("link", { name: /Ely/ });

    fireEvent.pointerDown(lien);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => {
      currentUtterance?.onend?.();
    });
    act(() => {
      derniereInstance().onresult?.(evenementTranscript("le patient a une plaie qui s'infecte"));
    });

    expect(pushMock).toHaveBeenCalledWith("/ely?q=le%20patient%20a%20une%20plaie%20qui%20s'infecte");
  });

  it("dit un message de repli si rien n'est compris", () => {
    render(<OngletEly actif={false} />);
    const lien = screen.getByRole("link", { name: /Ely/ });

    fireEvent.pointerDown(lien);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => {
      currentUtterance?.onend?.();
    });
    act(() => {
      derniereInstance().onerror?.();
    });

    expect(speakMock).toHaveBeenCalledTimes(2);
    expect(currentUtterance?.text).toBe("Je n'ai pas compris, réessaie.");
  });

  it("un tap pendant la séquence arrête tout", () => {
    render(<OngletEly actif={false} />);
    const lien = screen.getByRole("link", { name: /Ely/ });

    fireEvent.pointerDown(lien);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.pointerUp(lien);
    fireEvent.click(lien);

    act(() => {
      currentUtterance?.onend?.();
    });

    fireEvent.pointerDown(lien);
    fireEvent.pointerUp(lien);
    fireEvent.click(lien);

    expect(cancelMock).toHaveBeenCalled();
    expect(derniereInstance().stop).toHaveBeenCalled();
  });

  it("sur un navigateur sans reconnaissance vocale, l'appui long ne fait rien", () => {
    Reflect.deleteProperty(window, "SpeechRecognition");
    render(<OngletEly actif={false} />);
    const lien = screen.getByRole("link", { name: /Ely/ });

    fireEvent.pointerDown(lien);
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(vibrateMock).not.toHaveBeenCalled();
    expect(speakMock).not.toHaveBeenCalled();
  });

  it("affiche aria-current=page quand actif est vrai", () => {
    render(<OngletEly actif={true} />);
    expect(screen.getByRole("link", { name: /Ely/ })).toHaveAttribute("aria-current", "page");
  });

  it("acquiert le verrou micro pendant l'écoute de la question", () => {
    render(<OngletEly actif={false} />);
    const lien = screen.getByRole("link", { name: /Ely/ });

    fireEvent.pointerDown(lien);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => {
      currentUtterance?.onend?.();
    });

    expect(acquerirMicrophone("dictee", vi.fn())).toBe(false);
  });

  it("libère le verrou micro une fois l'écoute terminée", () => {
    render(<OngletEly actif={false} />);
    const lien = screen.getByRole("link", { name: /Ely/ });

    fireEvent.pointerDown(lien);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => {
      currentUtterance?.onend?.();
    });
    act(() => {
      derniereInstance().onresult?.(evenementTranscript("test"));
      derniereInstance().onend?.();
    });

    expect(acquerirMicrophone("dictee", vi.fn())).toBe(true);
  });

  it("vole le verrou micro à l'écoute de fond si elle le détient déjà", () => {
    const libererEcouteDeFond = vi.fn();
    acquerirMicrophone("ecoute-fond", libererEcouteDeFond);

    render(<OngletEly actif={false} />);
    const lien = screen.getByRole("link", { name: /Ely/ });

    fireEvent.pointerDown(lien);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => {
      currentUtterance?.onend?.();
    });

    expect(libererEcouteDeFond).toHaveBeenCalledTimes(1);
  });
});
