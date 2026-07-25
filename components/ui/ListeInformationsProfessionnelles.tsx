"use client";

import { useMemo, useState } from "react";
import type { FicheDossierSoin } from "@/lib/types/clinical";
import { CarteFicheDossier } from "./CarteFicheDossier";

interface ListeInformationsProfessionnellesProps {
  fiches: FicheDossierSoin[];
}

export function ListeInformationsProfessionnelles({ fiches }: ListeInformationsProfessionnellesProps) {
  const [requete, setRequete] = useState("");

  const fichesVisibles = useMemo(() => {
    const q = requete.trim().toLowerCase();
    if (!q) return fiches;
    return fiches.filter(
      (f) => f.titre.toLowerCase().includes(q) || f.resume.toLowerCase().includes(q)
    );
  }, [fiches, requete]);

  return (
    <div>
      <input
        type="search"
        value={requete}
        onChange={(event) => setRequete(event.target.value)}
        placeholder="Rechercher une fiche..."
        aria-label="Rechercher une fiche juridique"
        className="mt-4 min-h-[48px] w-full rounded-[14px] border border-navy/10 bg-white px-4 text-[15px] text-navy placeholder:text-navy/40"
      />

      <div className="mt-4 flex flex-col gap-3">
        {fichesVisibles.map((fiche) => (
          <CarteFicheDossier key={fiche.id} fiche={fiche} base="/situations/informations-professionnelles" />
        ))}

        {fichesVisibles.length === 0 && (
          <p className="py-7 text-center text-navy/50">
            {requete ? "Aucune fiche ne correspond." : "Aucune fiche disponible pour le moment."}
          </p>
        )}
      </div>
    </div>
  );
}
