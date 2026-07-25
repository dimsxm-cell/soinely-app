"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const MOIS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];
const JOURS_FR = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

function formatFr(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

interface SelecteurDateProps {
  name: string;
  label: string;
  valeur: string;
  onChange: (iso: string) => void;
  hint?: string;
}

export function SelecteurDate({ name, label, valeur, onChange, hint }: SelecteurDateProps) {
  const [ouvert, setOuvert] = useState(false);
  const aujourdhui = useMemo(() => new Date(), []);
  const [annee, setAnnee] = useState(() => (valeur ? Number(valeur.slice(0, 4)) : aujourdhui.getFullYear()));
  const [mois, setMois] = useState(() => (valeur ? Number(valeur.slice(5, 7)) - 1 : aujourdhui.getMonth()));
  const conteneurRef = useRef<HTMLDivElement>(null);

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

  function ouvrir() {
    if (valeur) {
      setAnnee(Number(valeur.slice(0, 4)));
      setMois(Number(valeur.slice(5, 7)) - 1);
    }
    setOuvert((o) => !o);
  }

  function naviguer(delta: number) {
    let m = mois + delta;
    let a = annee;
    if (m < 0) {
      m = 11;
      a -= 1;
    } else if (m > 11) {
      m = 0;
      a += 1;
    }
    setMois(m);
    setAnnee(a);
  }

  function choisirJour(jour: number) {
    onChange(`${annee}-${String(mois + 1).padStart(2, "0")}-${String(jour).padStart(2, "0")}`);
    setOuvert(false);
  }

  function surAujourdhui() {
    const y = aujourdhui.getFullYear();
    const m = aujourdhui.getMonth();
    const d = aujourdhui.getDate();
    setAnnee(y);
    setMois(m);
    onChange(`${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    setOuvert(false);
  }

  const [selY, selM, selD] = valeur ? valeur.split("-").map(Number) : [0, 0, 0];
  const todayY = aujourdhui.getFullYear();
  const todayM = aujourdhui.getMonth();
  const todayD = aujourdhui.getDate();

  const premierJourSemaine = (new Date(annee, mois, 1).getDay() + 6) % 7;
  const joursDansMois = new Date(annee, mois + 1, 0).getDate();
  const joursDansMoisPrecedent = new Date(annee, mois, 0).getDate();

  const cellules: { n: number; horsMois: boolean; selectionne: boolean; aujourdhui: boolean }[] = [];
  for (let k = 0; k < premierJourSemaine; k++) {
    cellules.push({ n: joursDansMoisPrecedent - premierJourSemaine + 1 + k, horsMois: true, selectionne: false, aujourdhui: false });
  }
  for (let d = 1; d <= joursDansMois; d++) {
    cellules.push({
      n: d,
      horsMois: false,
      selectionne: annee === selY && mois === selM - 1 && d === selD,
      aujourdhui: annee === todayY && mois === todayM && d === todayD,
    });
  }
  const restant = (7 - (cellules.length % 7)) % 7;
  for (let k = 1; k <= restant; k++) {
    cellules.push({ n: k, horsMois: true, selectionne: false, aujourdhui: false });
  }

  const annees: number[] = [];
  for (let y = annee - 6; y <= annee + 6; y++) {
    if (y < 1900 || y > todayY + 1) continue;
    annees.push(y);
  }

  return (
    <div ref={conteneurRef} className="relative">
      <button
        type="button"
        onClick={ouvrir}
        className="flex w-full items-center justify-between gap-2.5 rounded-[14px] border border-[#d9d4ea] bg-[#F6F7F5] px-4 py-3.5 text-left text-[15px]"
      >
        <span className={valeur ? "text-navy" : "text-navy/40"}>{valeur ? formatFr(valeur) : "jj/mm/aaaa"}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[17px] w-[17px] shrink-0 text-brand-violet">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      </button>
      <input type="hidden" name={name} value={valeur} />

      {hint && <p className="mt-1.5 text-[12px] leading-snug text-navy/40">{hint}</p>}

      {ouvert && (
        <div className="panneau-cosmique absolute left-0 right-0 top-[calc(100%+8px)] z-30">
          <div className="relative flex items-center justify-between p-4 pb-1">
            <button
              type="button"
              onClick={() => naviguer(-1)}
              aria-label={`Mois précédent — ${label}`}
              className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[#a855f7]/30 bg-white/[0.06]"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[15px] w-[15px] text-[#c9a6ff]">
                <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="text-center">
              <p className="font-mono text-[15px] font-semibold uppercase tracking-[0.04em] text-[#f1e9ff]">
                {MOIS_FR[mois]} {annee}
              </p>
              <p className="mt-0.5 font-mono text-[10px] tracking-[0.14em] text-[#9d7fd6]">SÉLECTION DE DATE</p>
            </div>
            <button
              type="button"
              onClick={() => naviguer(1)}
              aria-label={`Mois suivant — ${label}`}
              className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[#a855f7]/30 bg-white/[0.06]"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[15px] w-[15px] text-[#c9a6ff]">
                <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className="relative flex gap-1.5 overflow-x-auto px-4 pb-0.5 pt-2.5">
            {annees.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setAnnee(y)}
                className={`option-cosmique shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[11.5px] font-semibold ${
                  y === annee
                    ? "border-[#a855f7]/60 bg-[#a855f7]/[0.28] text-[#f1e9ff]"
                    : "border-[#a855f7]/15 bg-white/[0.04] text-[#a894c9]"
                }`}
              >
                {y}
              </button>
            ))}
          </div>

          <div className="relative grid grid-cols-7 gap-0.5 px-3.5 pb-0.5 pt-3">
            {JOURS_FR.map((j) => (
              <div key={j} className="pb-1.5 text-center font-mono text-[10.5px] font-semibold tracking-[0.06em] text-[#7c6a9e]">
                {j}
              </div>
            ))}
          </div>
          <div className="relative grid grid-cols-7 gap-1 px-3.5 pb-3.5">
            {cellules.map((c, i) => (
              <button
                key={i}
                type="button"
                disabled={c.horsMois}
                onClick={() => !c.horsMois && choisirJour(c.n)}
                className={`aspect-square rounded-full font-mono text-[13px] font-semibold ${
                  c.horsMois
                    ? "cursor-default text-[#3d3350]"
                    : c.selectionne
                      ? "border border-white/30 bg-gradient-to-br from-brand-violet to-[#c026d3] text-white shadow-[0_0_0_3px_rgba(168,85,247,0.28),0_0_16px_rgba(168,85,247,0.55)]"
                      : c.aujourdhui
                        ? "option-cosmique border border-[#a855f7]/50 bg-[#a855f7]/[0.14] text-[#d9c3ff]"
                        : "option-cosmique border border-transparent text-[#e4d9ff]"
                }`}
              >
                {c.n}
              </button>
            ))}
          </div>

          <div className="relative flex justify-center border-t border-[#a855f7]/[0.18] py-2.5">
            <button type="button" onClick={surAujourdhui} className="text-[12.5px] font-semibold tracking-[0.03em] text-[#c9a6ff]">
              Aujourd&apos;hui
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
