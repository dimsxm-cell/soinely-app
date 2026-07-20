"use client";

import { useState, useSyncExternalStore } from "react";
import {
  creerReconnaissanceVocale,
  lireSupportVocalClient,
  lireSupportVocalServeur,
  souscrireSupportVocal,
} from "@/lib/reconnaissance-vocale";

interface ChampAvecDicteeProps {
  name: string;
  label: string;
  defaultValue?: string | null;
  required?: boolean;
  multiligne?: boolean;
  rows?: number;
  placeholder?: string;
}

export function ChampAvecDictee({
  name,
  label,
  defaultValue,
  required,
  multiligne,
  rows = 2,
  placeholder,
}: ChampAvecDicteeProps) {
  const [valeur, setValeur] = useState(defaultValue ?? "");
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
      if (!transcript) return;
      setValeur((precedente) => {
        if (!multiligne) return transcript;
        return precedente ? `${precedente} ${transcript}` : transcript;
      });
    };

    recognition.start();
  }

  const classeChamp = "min-w-0 flex-1 rounded-card border border-navy/20 p-2 text-navy";

  return (
    <label className="flex flex-col gap-1 text-sm text-navy">
      {label}
      <div className="flex gap-2">
        {multiligne ? (
          <textarea
            name={name}
            value={valeur}
            onChange={(event) => setValeur(event.target.value)}
            required={required}
            rows={rows}
            placeholder={placeholder}
            className={classeChamp}
          />
        ) : (
          <input
            name={name}
            value={valeur}
            onChange={(event) => setValeur(event.target.value)}
            required={required}
            placeholder={placeholder}
            className={classeChamp}
          />
        )}
        {supporte && (
          <button
            type="button"
            onClick={demarrerEcoute}
            aria-label={`Dicter — ${label}`}
            aria-pressed={ecoute}
            className={`flex h-[44px] w-[44px] shrink-0 items-center justify-center self-start rounded-card text-base transition-colors ${
              ecoute ? "bg-danger/15 text-danger" : "bg-navy/5 text-navy hover:bg-navy/10"
            }`}
          >
            <span aria-hidden="true">🎤</span>
          </button>
        )}
      </div>
    </label>
  );
}
