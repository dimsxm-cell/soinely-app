import Link from "next/link";
import type { SituationTerrain } from "@/lib/types/clinical";

interface CarteSituationTerrainProps {
  situation: SituationTerrain;
}

export function CarteSituationTerrain({ situation }: CarteSituationTerrainProps) {
  return (
    <Link
      href={`/situations/${situation.id}`}
      className="block rounded-card border border-navy/10 bg-white p-6 hover:border-primary"
    >
      <div className="flex gap-4">
        <span className="rounded-full bg-navy/10 px-4 py-2 text-sm text-navy">
          {situation.specialite}
        </span>
        <span className="rounded-full bg-navy/10 px-4 py-2 text-sm text-navy">
          {situation.niveauConfiance}
        </span>
      </div>
      <h2 className="mt-4 text-xl font-semibold text-navy">{situation.titre}</h2>
      <p className="mt-2 line-clamp-2 text-navy/70">{situation.observation}</p>
    </Link>
  );
}
