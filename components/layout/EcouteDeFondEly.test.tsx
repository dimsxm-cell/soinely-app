import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EcouteDeFondEly } from "./EcouteDeFondEly";
import { acquerirMicrophone, _reinitialiserVerrouPourTests } from "@/lib/verrou-microphone";
import type { SpeechRecognitionEvent } from "@/lib/reconnaissance-vocale";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

let instances: FakeSpeechRecognition[] = [];

class FakeSpeechRecognition {
  lang = "";
  interimResults = false;
  maxAlternatives = 1;
  continuous = false;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
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
  const results: Record<number, Record<number, { transcript: string }>> & { length: number } = {
    0: { 0: { transcript } },
    length: 1,
  };
  return { results } as unknown as SpeechRecognitionEvent;
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
  vi.useFakeTimers();
  instances = [];
  currentUtterance = null;
  pushMock.mockClear();
  speakMock.mockClear();
  cancelMock.mockClear();
  vibrateMock.mockClear();
  _reinitialiserVerrouPourTests();
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

describe("EcouteDeFondEly", () => {
  it("ne démarre pas l'écoute si le réglage est désactivé", () => {
    render(<EcouteDeFondEly ecoutePermanenteActivee={false} />);
    expect(instances).toHaveLength(0);
  });

  it("ne démarre pas l'écoute si le navigateur ne supporte pas la reconnaissance vocale", () => {
    Reflect.deleteProperty(window, "SpeechRecognition");
    render(<EcouteDeFondEly ecoutePermanenteActivee={true} />);
    expect(instances).toHaveLength(0);
  });

  it("démarre une écoute continue quand le réglage est activé et le support présent", () => {
    render(<EcouteDeFondEly ecoutePermanenteActivee={true} />);

    expect(instances).toHaveLength(1);
    expect(derniereInstance().continuous).toBe(true);
    expect(derniereInstance().start).toHaveBeenCalled();
  });

  it("détecte la phrase d'activation et déclenche vibration puis « Je t'écoute »", () => {
    render(<EcouteDeFondEly ecoutePermanenteActivee={true} />);

    act(() => {
      derniereInstance().onresult?.(evenementTranscript("Dis-moi Ely"));
    });

    expect(vibrateMock).toHaveBeenCalledWith(50);
    expect(speakMock).toHaveBeenCalledTimes(1);
    expect(currentUtterance?.text).toBe("Je t'écoute");
  });

  it("ignore une transcription qui ne contient pas la phrase d'activation", () => {
    render(<EcouteDeFondEly ecoutePermanenteActivee={true} />);

    act(() => {
      derniereInstance().onresult?.(evenementTranscript("le patient va bien"));
    });

    expect(vibrateMock).not.toHaveBeenCalled();
    expect(speakMock).not.toHaveBeenCalled();
  });

  it("démarre l'écoute de la question une fois la salutation terminée", () => {
    render(<EcouteDeFondEly ecoutePermanenteActivee={true} />);
    act(() => {
      derniereInstance().onresult?.(evenementTranscript("dis moi ely"));
    });
    act(() => {
      currentUtterance?.onend?.();
    });

    expect(instances).toHaveLength(2);
    expect(derniereInstance().continuous).toBe(false);
    expect(derniereInstance().start).toHaveBeenCalled();
  });

  it("navigue vers /ely avec la question captée", () => {
    render(<EcouteDeFondEly ecoutePermanenteActivee={true} />);
    act(() => {
      derniereInstance().onresult?.(evenementTranscript("dis moi ely"));
    });
    act(() => {
      currentUtterance?.onend?.();
    });
    act(() => {
      derniereInstance().onresult?.(evenementTranscript("le patient a une plaie"));
    });

    expect(pushMock).toHaveBeenCalledWith("/ely?q=le%20patient%20a%20une%20plaie");
  });

  it("dit un message de repli si la question n'est pas comprise", () => {
    render(<EcouteDeFondEly ecoutePermanenteActivee={true} />);
    act(() => {
      derniereInstance().onresult?.(evenementTranscript("dis moi ely"));
    });
    act(() => {
      currentUtterance?.onend?.();
    });
    act(() => {
      derniereInstance().onerror?.({ error: "no-speech" });
    });

    expect(speakMock).toHaveBeenCalledTimes(2);
    expect(currentUtterance?.text).toBe("Je n'ai pas compris, réessaie.");
  });

  it("relance l'écoute du mot d'activation après une fin naturelle", () => {
    render(<EcouteDeFondEly ecoutePermanenteActivee={true} />);
    act(() => {
      derniereInstance().onend?.();
    });

    expect(instances).toHaveLength(2);
    expect(derniereInstance().continuous).toBe(true);
  });

  it("arrête définitivement sans boucle si la permission est refusée", () => {
    render(<EcouteDeFondEly ecoutePermanenteActivee={true} />);
    act(() => {
      derniereInstance().onerror?.({ error: "not-allowed" });
    });
    act(() => {
      derniereInstance().onend?.();
    });

    expect(instances).toHaveLength(1);
  });

  it("retente après un délai si le verrou micro est déjà pris", () => {
    acquerirMicrophone("dictee", vi.fn());

    render(<EcouteDeFondEly ecoutePermanenteActivee={true} />);
    expect(instances).toHaveLength(0);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(instances).toHaveLength(0);
  });

  it("démarre dès que le verrou micro se libère, à la prochaine tentative", () => {
    acquerirMicrophone("dictee", vi.fn());

    render(<EcouteDeFondEly ecoutePermanenteActivee={true} />);
    expect(instances).toHaveLength(0);

    act(() => {
      _reinitialiserVerrouPourTests();
      vi.advanceTimersByTime(2000);
    });

    expect(instances).toHaveLength(1);
  });

  it("arrête et libère le verrou micro au démontage", () => {
    const { unmount } = render(<EcouteDeFondEly ecoutePermanenteActivee={true} />);
    const instance = derniereInstance();

    unmount();

    expect(instance.stop).toHaveBeenCalled();
    expect(acquerirMicrophone("dictee", vi.fn())).toBe(true);
  });

  it("ignore les callbacks obsolètes d'une instance remplacée (stale-instance guard)", () => {
    render(<EcouteDeFondEly ecoutePermanenteActivee={true} />);
    const phase1Instance = derniereInstance();

    // Déclenche la phrase d'activation (phase 1)
    act(() => {
      phase1Instance.onresult?.(evenementTranscript("dis moi ely"));
    });
    expect(instances).toHaveLength(1);

    // Simule la fin de "Je t'écoute" (phase 2 démarre)
    act(() => {
      currentUtterance?.onend?.();
    });
    expect(instances).toHaveLength(2);
    const phase2Instance = derniereInstance();

    // Simule le callback onend retardé de phase 1 (race condition réelle)
    act(() => {
      phase1Instance.onend?.();
    });

    // Vérifie qu'aucune 3e instance n'a été créée (le stale onend n'a pas redémarré la boucle)
    expect(instances).toHaveLength(2);

    // Vérifie que phase 2 fonctionne toujours correctement
    act(() => {
      phase2Instance.onresult?.(evenementTranscript("le patient a une plaie"));
    });
    expect(pushMock).toHaveBeenCalledWith("/ely?q=le%20patient%20a%20une%20plaie");
  });

  it("arrête définitivement (phase 2) si permission refusée à phase 2", () => {
    render(<EcouteDeFondEly ecoutePermanenteActivee={true} />);
    act(() => {
      derniereInstance().onresult?.(evenementTranscript("dis moi ely"));
    });
    act(() => {
      currentUtterance?.onend?.();
    });

    const phase2Instance = derniereInstance();
    speakMock.mockClear(); // Réinitialise pour isoler les appels phase 2

    // Simule permission refusée en phase 2
    act(() => {
      phase2Instance.onerror?.({ error: "not-allowed" });
    });

    expect(speakMock).not.toHaveBeenCalled(); // Pas de fallback

    // Simule la fin naturelle de phase 2
    act(() => {
      phase2Instance.onend?.();
    });

    // Vérifie qu'aucune nouvelle instance n'est créée (boucle arrêtée)
    expect(instances).toHaveLength(2);
  });
});
