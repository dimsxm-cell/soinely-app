import Image from "next/image";
import { RubanLemniscateHero } from "@/components/ui/RubanLemniscateHero";

export function EnTeteEly({
  aDesMessages,
  onReset,
  nombreFiches,
}: {
  aDesMessages: boolean;
  onReset: () => void;
  nombreFiches: number;
}) {
  return (
    <div className="relative overflow-hidden bg-[linear-gradient(168deg,#221b33_0%,#2c1f47_58%,#3a2260_100%)] px-5 pb-4 pt-6 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-24 h-[280px] w-[280px] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,.4),transparent_68%)]"
      />
      <RubanLemniscateHero />
      <div className="relative mx-auto flex max-w-2xl items-center gap-3">
        <span className="relative h-[46px] w-[46px] shrink-0 overflow-hidden rounded-full border border-white/20 bg-[linear-gradient(140deg,#a855f7,#6d28d9)]">
          <Image
            src="/marketing/ely-colibri-heureux.webp"
            alt="ELY"
            width={323}
            height={304}
            className="h-full w-full object-cover object-[center_42%]"
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[22px] font-bold leading-none tracking-tight">ELY</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#b3aacd]">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" />
            Assistant de tournée
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={!aDesMessages}
          aria-label="Nouvelle conversation"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[17px] w-[17px]">
            <path
              d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
              stroke="#e9e2fb"
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M3 3v5h5" stroke="#e9e2fb" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="relative mx-auto mt-4 grid max-w-2xl grid-cols-2 gap-2">
        <div className="rounded-[14px] border border-white/10 bg-white/[0.07] px-2.5 py-2.5">
          <p className="font-display text-[17px] font-bold leading-none">24/7</p>
          <p className="mt-1.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9d94b8]">Disponible</p>
        </div>
        <div className="rounded-[14px] border border-white/10 bg-white/[0.07] px-2.5 py-2.5">
          <p className="font-display text-[17px] font-bold leading-none tabular-nums">{nombreFiches}</p>
          <p className="mt-1.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9d94b8]">Fiches</p>
        </div>
      </div>
    </div>
  );
}
