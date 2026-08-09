"use client";

import { useMemo, useState } from "react";
import type { SituationTerrain } from "@/lib/types/clinical";
import { CarteSituationTerrain } from "./CarteSituationTerrain";
import { EnTeteExplorer } from "./EnTeteExplorer";

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
    <>
      <EnTeteExplorer
        actif="situations"
        titre="Situations Terrain"
        sous="Conduites à tenir pour les situations fréquentes en soins à domicile."
        query={requete}
        onQuery={setRequete}
        placeholder="Rechercher une situation…"
      />

      <div className="mx-auto max-w-2xl px-6 py-6">
        <div className="flex flex-col gap-4">
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
    </>
  );
}
