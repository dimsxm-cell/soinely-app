"use client";

import { useEffect, useRef, useState } from "react";
import type { Sexe } from "@/lib/types/clinical";
import { SelecteurDate } from "./SelecteurDate";

const MOIS_VALIDES = new Set(Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")));

export function deriverIdentiteDepuisNir(numeroSecu: string): {
  dateNaissance: string | null;
  sexe: Sexe | null;
} {
  const chiffres = numeroSecu.replace(/\s/g, "");
  if (!/^\d{13,15}$/.test(chiffres)) return { dateNaissance: null, sexe: null };

  const premierChiffre = chiffres[0];
  const sexe: Sexe | null = premierChiffre === "1" ? "homme" : premierChiffre === "2" ? "femme" : null;

  const annee2Chiffres = chiffres.slice(1, 3);
  const mois = chiffres.slice(3, 5);

  let dateNaissance: string | null = null;
  if (MOIS_VALIDES.has(mois)) {
    const anneeActuelle = new Date().getFullYear();
    const siecle = Math.floor(anneeActuelle / 100) * 100;
    let annee = siecle + Number(annee2Chiffres);
    if (annee > anneeActuelle) annee -= 100;
    dateNaissance = `${annee}-${mois}-01`;
  }

  return { dateNaissance, sexe };
}

const OPTIONS_SEXE: { valeur: string; label: string }[] = [
  { valeur: "", label: "Non renseigné" },
  { valeur: "femme", label: "Féminin" },
  { valeur: "homme", label: "Masculin" },
];

interface ChampsIdentiteProps {
  defaultNumeroSecu?: string | null;
  defaultDateNaissance?: string | null;
  defaultSexe?: Sexe | null;
}

export function ChampsIdentite({ defaultNumeroSecu, defaultDateNaissance, defaultSexe }: ChampsIdentiteProps) {
  const [numeroSecu, setNumeroSecu] = useState(defaultNumeroSecu ?? "");
  const [dateNaissance, setDateNaissance] = useState(defaultDateNaissance ?? "");
  const [sexe, setSexe] = useState<string>(defaultSexe ?? "");
  const [ouvertSexe, setOuvertSexe] = useState(false);
  const conteneurSexeRef = useRef<HTMLDivElement>(null);

  function surChangementNumeroSecu(valeur: string) {
    setNumeroSecu(valeur);
    const derive = deriverIdentiteDepuisNir(valeur);
    if (derive.dateNaissance) setDateNaissance(derive.dateNaissance);
    if (derive.sexe) setSexe(derive.sexe);
  }

  useEffect(() => {
    if (!ouvertSexe) return;
    function surClicDehors(event: MouseEvent) {
      if (conteneurSexeRef.current && !conteneurSexeRef.current.contains(event.target as Node)) {
        setOuvertSexe(false);
      }
    }
    document.addEventListener("mousedown", surClicDehors);
    return () => document.removeEventListener("mousedown", surClicDehors);
  }, [ouvertSexe]);

  const optionSexeActive = OPTIONS_SEXE.find((o) => o.valeur === sexe) ?? OPTIONS_SEXE[0];

  return (
    <>
      <label className="flex flex-col gap-[7px] text-[12.5px] font-semibold tracking-[0.02em] text-[#3d3956]">
        Numéro de sécurité sociale
        <input
          name="numeroSecu"
          value={numeroSecu}
          onChange={(event) => surChangementNumeroSecu(event.target.value)}
          className="rounded-[14px] border border-[#d9d4ea] bg-[#F6F7F5] p-3.5 text-[15px] font-normal text-navy"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelecteurDate
          name="dateNaissance"
          label="Date de naissance"
          valeur={dateNaissance}
          onChange={setDateNaissance}
          hint="Année et mois déduits du numéro de sécu — vérifiez le jour exact."
        />

        <div ref={conteneurSexeRef} className="relative flex flex-col gap-[7px] text-[12.5px] font-semibold tracking-[0.02em] text-[#3d3956]">
          Sexe
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={ouvertSexe}
            onClick={() => setOuvertSexe((o) => !o)}
            className="flex w-full items-center justify-between gap-2.5 rounded-[14px] border border-[#d9d4ea] bg-[#F6F7F5] px-4 py-3.5 text-left text-[15px] font-normal"
          >
            <span className={sexe ? "text-navy" : "text-navy/40"}>{optionSexeActive.label}</span>
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-[15px] w-[15px] shrink-0 text-brand-violet transition-transform"
              style={{ transform: ouvertSexe ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <input type="hidden" name="sexe" value={sexe} />

          {ouvertSexe && (
            <div className="panneau-cosmique absolute left-0 right-0 top-[calc(100%+8px)] z-20 p-2">
              {OPTIONS_SEXE.map((o) => (
                <button
                  key={o.valeur}
                  type="button"
                  role="option"
                  aria-selected={o.valeur === sexe}
                  onClick={() => {
                    setSexe(o.valeur);
                    setOuvertSexe(false);
                  }}
                  className={`option-cosmique flex w-full items-center rounded-[11px] px-3 py-2.5 text-left text-[13.5px] font-semibold ${
                    o.valeur === sexe ? "bg-[#a855f7]/[0.28] text-[#f1e9ff]" : "text-[#e4d9ff]"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
