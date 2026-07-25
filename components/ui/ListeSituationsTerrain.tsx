"use client";

import { useMemo, useState } from "react";
import type { SituationTerrain } from "@/lib/types/clinical";
import { CarteSituationTerrain } from "./CarteSituationTerrain";

interface ListeSituationsTerrainProps {
  situations: SituationTerrain[];
}

export function ListeSituationsTerrain({ situations }: ListeSituationsTerrainProps) {
  const [requete, setRequete] = useState("");

  const visibles = useMemo(() => {
    const q = requete.trim().toLowerCase();
    if (!q) return situations;
    return situations.filter(
      (s) => s.titre.toLowerCase().includes(q) || s.observation.toLowerCase().includes(q)
    );
  }, [situations, requete]);

  return (
    <div>
      <input
        type="search"
        value={requete}
        onChange={(event) => setRequete(event.target.value)}
        placeholder="Rechercher une situation..."
        aria-label="Rechercher une situation"
        className="mt-4 min-h-[48px] w-full rounded-[14px] border border-navy/10 bg-white px-4 text-[15px] text-navy placeholder:text-navy/40"
      />

      <div className="mt-4 flex flex-col gap-4">
        {visibles.map((situation) => (
          <CarteSituationTerrain key={situation.id} situation={situation} />
        ))}

        {visibles.length === 0 && (
          <p className="py-7 text-center text-navy/50">
            {requete ? "Aucune situation ne correspond." : "Aucune situation disponible pour le moment."}
          </p>
        )}
      </div>
    </div>
  );
}
