"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  creerReconnaissanceVocale,
  lireSupportVocalClient,
  lireSupportVocalServeur,
  souscrireSupportVocal,
} from "@/lib/reconnaissance-vocale";
import { acquerirMicrophoneForce, relacherMicrophone } from "@/lib/verrou-microphone";
import { DrapeauPays, type CodePays } from "./DrapeauPays";

const INDICATIFS: { code: string; pays: string; drapeau: CodePays }[] = [
  { code: "+33", pays: "France", drapeau: "fr" },
  { code: "+590", pays: "Guadeloupe / Saint-Martin / Saint-Barthélemy", drapeau: "fr" },
  { code: "+596", pays: "Martinique", drapeau: "fr" },
  { code: "+594", pays: "Guyane", drapeau: "fr" },
  { code: "+262", pays: "Réunion / Mayotte", drapeau: "fr" },
  { code: "+508", pays: "Saint-Pierre-et-Miquelon", drapeau: "fr" },
  { code: "+687", pays: "Nouvelle-Calédonie", drapeau: "fr" },
  { code: "+689", pays: "Polynésie française", drapeau: "fr" },
  { code: "+32", pays: "Belgique", drapeau: "be" },
  { code: "+41", pays: "Suisse", drapeau: "ch" },
  { code: "+352", pays: "Luxembourg", drapeau: "lu" },
  { code: "+377", pays: "Monaco", drapeau: "mc" },
  { code: "+1", pays: "Canada", drapeau: "ca" },
];

function decomposerTelephone(valeur: string | undefined | null): { indicatif: string; numero: string } {
  if (!valeur) return { indicatif: "+33", numero: "" };
  const trouve = INDICATIFS.find((i) => valeur.startsWith(`${i.code} `));
  if (trouve) return { indicatif: trouve.code, numero: valeur.slice(trouve.code.length + 1) };
  return { indicatif: "+33", numero: valeur };
}

interface ChampTelephoneProps {
  name: string;
  label: string;
  defaultValue?: string | null;
  required?: boolean;
}

export function ChampTelephone({ name, label, defaultValue, required }: ChampTelephoneProps) {
  const initial = decomposerTelephone(defaultValue);
  const [indicatif, setIndicatif] = useState(initial.indicatif);
  const [numero, setNumero] = useState(initial.numero);
  const [ouvert, setOuvert] = useState(false);
  const [ecoute, setEcoute] = useState(false);
  const conteneurRef = useRef<HTMLDivElement>(null);

  const selection = INDICATIFS.find((i) => i.code === indicatif) ?? INDICATIFS[0];
  const labelIndicatif = `Indicatif — ${label}`;

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
      const chiffres = transcript.replace(/\D/g, "");
      if (!chiffres) return;
      setNumero((precedent) => (precedent ? `${precedent}${chiffres}` : chiffres));
    };

    recognition.start();
  }

  useEffect(() => {
    if (!ouvert) return;

    function surClicDehors(event: MouseEvent) {
      if (conteneurRef.current && !conteneurRef.current.contains(event.target as Node)) {
        setOuvert(false);
      }
    }

    document.addEventListener("mousedown", surClicDehors);
    return () => document.removeEventListener("mousedown", surClicDehors);
  }, [ouvert]);

  return (
    <div className="flex flex-col gap-[7px] text-[12.5px] font-semibold tracking-[0.02em] text-[#3d3956]">
      <span>{label}</span>
      <div className="flex gap-2">
        <div ref={conteneurRef} className="relative shrink-0">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={ouvert}
            aria-label={labelIndicatif}
            onClick={() => setOuvert((o) => !o)}
            className="flex h-full items-center gap-1.5 rounded-[14px] border border-[#d9d4ea] bg-[#F6F7F5] px-3 py-3.5 text-[15px] font-normal text-navy"
          >
            <DrapeauPays code={selection.drapeau} />
            <span className="text-navy/60">{selection.code}</span>
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-3 w-3 shrink-0 text-brand-violet transition-transform"
              style={{ transform: ouvert ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {ouvert && (
            <ul
              role="listbox"
              className="panneau-cosmique absolute left-0 top-[calc(100%+8px)] z-30 max-h-64 w-max min-w-[190px] overflow-y-auto p-2"
            >
              {INDICATIFS.map((i) => (
                <li key={i.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i.code === indicatif}
                    title={i.pays}
                    onClick={() => {
                      setIndicatif(i.code);
                      setOuvert(false);
                    }}
                    className={`option-cosmique relative flex w-full items-center gap-2 rounded-[11px] px-2.5 py-2 text-left text-[13.5px] font-semibold ${
                      i.code === indicatif ? "bg-[#a855f7]/[0.28] text-[#f1e9ff]" : "text-[#e4d9ff]"
                    }`}
                  >
                    <DrapeauPays code={i.drapeau} />
                    {i.pays}
                    <span className="ml-auto text-[#a894c9]">{i.code}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <input
          type="tel"
          aria-label={label}
          value={numero}
          onChange={(event) => setNumero(event.target.value)}
          required={required}
          className="min-w-0 flex-1 rounded-[14px] border border-[#d9d4ea] bg-[#F6F7F5] p-3.5 text-[15px] font-normal text-navy"
        />
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
            <span aria-hidden="true">🎤</span>
          </button>
        )}
      </div>
      <input type="hidden" name={name} value={numero ? `${indicatif} ${numero}` : ""} />
    </div>
  );
}
