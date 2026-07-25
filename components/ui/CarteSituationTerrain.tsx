import Link from "next/link";
import type { SituationTerrain } from "@/lib/types/clinical";
import { BadgeNiveauConfiance } from "./BadgeNiveauConfiance";

interface CarteSituationTerrainProps {
  situation: SituationTerrain;
}

export function CarteSituationTerrain({ situation }: CarteSituationTerrainProps) {
  return (
    <Link
      href={`/situations/${situation.id}`}
      className="row-lift block rounded-[18px] border border-navy/[0.06] bg-white p-[18px] shadow-[0_8px_22px_rgba(80,50,140,.1)]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-navy/5 px-2.5 py-1 text-[11.5px] font-semibold text-navy/60">
          {situation.specialite}
        </span>
        <BadgeNiveauConfiance niveau={situation.niveauConfiance} />
      </div>
      <h2 className="mt-3 font-display text-[18.5px] font-bold leading-tight tracking-tight text-navy">
        {situation.titre}
      </h2>
      <p className="mt-1.5 line-clamp-2 text-[14.5px] leading-relaxed text-navy/60">{situation.observation}</p>
      <div className="mt-3 flex items-center gap-1.5 text-[13.5px] font-semibold text-brand-violet">
        Voir la conduite à tenir
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </div>
    </Link>
  );
}
