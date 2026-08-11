import Link from "next/link";
import Image from "next/image";
import { FondHeroViolet } from "@/components/ui/FondHeroViolet";
import { OngletsExplorer } from "@/components/ui/OngletsExplorer";

export function EnTeteExplorer({
  actif,
  titre,
  sous,
  query,
  onQuery,
  placeholder,
}: {
  actif: "situations" | "dossier" | "informations";
  titre: string;
  sous: string;
  query: string;
  onQuery: (valeur: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative isolate overflow-hidden bg-[linear-gradient(168deg,#221b33_0%,#2c1f47_58%,#3a2260_100%)] px-5 pb-4 pt-6 text-white">
      <FondHeroViolet />
      <div className="relative mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#b3aacd]">Ressources</span>
          <Link
            href="/ely"
            aria-label="Parler à ELY"
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10"
          >
            <Image
              src="/marketing/ely-colibri-heureux.webp"
              alt=""
              width={323}
              height={304}
              className="h-full w-full object-cover object-[center_42%]"
            />
          </Link>
        </div>

        <div className="mt-3.5">
          <OngletsExplorer actif={actif} />
        </div>

        <div className="mt-3.5">
          <p className="font-display text-[26px] font-bold leading-tight tracking-tight">{titre}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[#b3aacd]">{sous}</p>
        </div>

        <input
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="mt-3.5 min-h-[44px] w-full rounded-[13px] border border-white/[0.18] bg-white/10 px-3.5 text-[14px] font-medium text-white placeholder:text-[#c9c1de] focus:border-[#a855f7] focus:bg-white/[0.14] focus:outline-none"
        />
      </div>
    </div>
  );
}
