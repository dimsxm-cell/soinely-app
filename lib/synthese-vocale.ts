declare global {
  interface Window {
    SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
  }
}

export function lireSupportSyntheseClient(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function lireSupportSyntheseServeur(): boolean {
  return false;
}

export function souscrireSupportSynthese() {
  return () => {};
}

export function lireTexteAVoixHaute(texte: string, onDebut: () => void, onFin: () => void): void {
  const utterance = new SpeechSynthesisUtterance(texte);
  utterance.lang = "fr-FR";
  utterance.onstart = onDebut;
  utterance.onend = onFin;
  utterance.onerror = onFin;
  window.speechSynthesis.speak(utterance);
}

export function couperLecture(): void {
  window.speechSynthesis.cancel();
}
