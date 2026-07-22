export interface SpeechRecognitionResultItem {
  transcript: string;
}

export interface SpeechRecognitionEvent extends Event {
  results: { [index: number]: { [index: number]: SpeechRecognitionResultItem } };
}

export interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

export interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function souscrireSupportVocal() {
  return () => {};
}

export function lireSupportVocalClient(): boolean {
  return Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition);
}

export function lireSupportVocalServeur(): boolean {
  return false;
}

export interface OptionsReconnaissanceVocale {
  continuous?: boolean;
}

export function creerReconnaissanceVocale(
  options: OptionsReconnaissanceVocale = {}
): SpeechRecognitionInstance | null {
  const SpeechRecognitionClass = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!SpeechRecognitionClass) return null;

  const recognition = new SpeechRecognitionClass();
  recognition.lang = "fr-FR";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = options.continuous ?? false;
  return recognition;
}
