"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import {
  creerReconnaissanceVocale,
  lireSupportVocalClient,
  lireSupportVocalServeur,
  souscrireSupportVocal,
} from "@/lib/reconnaissance-vocale";

interface ChampRechercheVocaleProps {
  defaultValue: string;
  placeholder: string;
  ariaLabel: string;
}

export function ChampRechercheVocale({ defaultValue, placeholder, ariaLabel }: ChampRechercheVocaleProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [ecoute, setEcoute] = useState(false);
  const supporte = useSyncExternalStore(
    souscrireSupportVocal,
    lireSupportVocalClient,
    lireSupportVocalServeur
  );

  function demarrerEcoute() {
    const recognition = creerReconnaissanceVocale();
    if (!recognition) return;

    recognition.onstart = () => setEcoute(true);
    recognition.onend = () => setEcoute(false);
    recognition.onerror = () => setEcoute(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript && inputRef.current) {
        inputRef.current.value = transcript;
        inputRef.current.focus();
      }
    };

    recognition.start();
  }

  return (
    <div className="flex min-h-[44px] flex-1 items-center gap-1 rounded-card border border-navy/20 bg-white pr-1.5">
      <input
        ref={inputRef}
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="min-h-[44px] flex-1 border-0 bg-transparent px-4 py-2 text-navy outline-none"
      />
      {supporte && (
        <button
          type="button"
          onClick={demarrerEcoute}
          aria-label="Dicter la question au micro"
          aria-pressed={ecoute}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base transition-colors ${
            ecoute ? "bg-danger/15 text-danger" : "bg-navy/5 text-navy hover:bg-navy/10"
          }`}
        >
          <span aria-hidden="true">🎤</span>
        </button>
      )}
    </div>
  );
}
