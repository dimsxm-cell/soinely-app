"use client";

import { useEffect, useRef, useState } from "react";
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
  const conteneurRef = useRef<HTMLDivElement>(null);

  const selection = INDICATIFS.find((i) => i.code === indicatif) ?? INDICATIFS[0];
  const labelIndicatif = `Indicatif — ${label}`;

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
    <div className="flex flex-col gap-1 text-sm text-navy">
      <span>{label}</span>
      <div className="flex gap-2">
        <div ref={conteneurRef} className="relative">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={ouvert}
            aria-label={labelIndicatif}
            onClick={() => setOuvert((o) => !o)}
            className="flex h-full items-center gap-1.5 rounded-card border border-navy/20 bg-white px-2 py-2 text-sm text-navy"
          >
            <DrapeauPays code={selection.drapeau} />
            {selection.code}
          </button>
          {ouvert && (
            <ul
              role="listbox"
              className="absolute z-10 mt-1 max-h-56 w-max overflow-y-auto rounded-card border border-navy/20 bg-white py-1 shadow-lg"
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
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-navy/5 ${
                      i.code === indicatif ? "bg-navy/5 font-medium" : ""
                    }`}
                  >
                    <DrapeauPays code={i.drapeau} />
                    {i.code}
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
          className="min-w-0 flex-1 rounded-card border border-navy/20 p-2 text-navy"
        />
      </div>
      <input type="hidden" name={name} value={numero ? `${indicatif} ${numero}` : ""} />
    </div>
  );
}
