"use client";

import { IconeMicro } from "@/components/ui/IconeMicro";
import { useState, useSyncExternalStore } from "react";
import {
  creerReconnaissanceVocale,
  lireSupportVocalClient,
  lireSupportVocalServeur,
  souscrireSupportVocal,
} from "@/lib/reconnaissance-vocale";
import { acquerirMicrophoneForce, relacherMicrophone } from "@/lib/verrou-microphone";

interface ChampAvecDicteeProps {
  name: string;
  label: string;
  defaultValue?: string | null;
  value?: string;
  onChange?: (valeur: string) => void;
  required?: boolean;
  multiligne?: boolean;
  rows?: number;
  placeholder?: string;
}

export function ChampAvecDictee({
  name,
  label,
  defaultValue,
  value: valeurControlee,
  onChange: surChangementControle,
  required,
  multiligne,
  rows = 2,
  placeholder,
}: ChampAvecDicteeProps) {
  const controle = valeurControlee !== undefined;
  const [valeurInterne, setValeurInterne] = useState(defaultValue ?? "");
  const [ecoute, setEcoute] = useState(false);
  const valeur = controle ? valeurControlee : valeurInterne;

  function setValeur(next: string | ((precedente: string) => string)) {
    const prochaine = typeof next === "function" ? next(valeur) : next;
    if (controle) {
      surChangementControle?.(prochaine);
    } else {
      setValeurInterne(prochaine);
    }
  }
  const supporte = useSyncExternalStore(
    souscrireSupportVocal,
    lireSupportVocalClient,
    lireSupportVocalServeur
  );

  function demarrerEcoute() {
    const recognition = creerReconnaissanceVocale();
    if (!recognition) return;

    acquerirMicrophoneForce("dictee", () => recognition.stop());

    recognition.onstart = () => setEcoute(true);
    recognition.onend = () => {
      relacherMicrophone("dictee");
      setEcoute(false);
    };
    recognition.onerror = () => {
      relacherMicrophone("dictee");
      setEcoute(false);
    };
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

  const classeChamp =
    "min-w-0 flex-1 rounded-[14px] border border-[#d9d4ea] bg-[#F6F7F5] p-3.5 text-[15px] text-navy placeholder:text-navy/40";

  return (
    <label className="flex flex-col gap-[7px] text-[12.5px] font-semibold tracking-[0.02em] text-[#3d3956]">
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
            className={`baguette flex h-[38px] w-[38px] shrink-0 items-center justify-center self-start rounded-full border text-base ${
              ecoute
                ? "border-danger/30 bg-danger/15 text-danger"
                : "border-brand-violet/20 bg-gradient-to-br from-brand-violet/[0.14] to-brand-rose/[0.14] text-brand-violet"
            }`}
          >
            <IconeMicro />
          </button>
        )}
      </div>
    </label>
  );
}
