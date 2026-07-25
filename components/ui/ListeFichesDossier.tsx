"use client";

import { useMemo, useState } from "react";
import type { FicheDossierSoin, SectionDossierSoin } from "@/lib/types/clinical";
import { CarteFicheDossier } from "./CarteFicheDossier";

interface Section {
  valeur: SectionDossierSoin;
  label: string;
}

interface ListeFichesDossierProps {
  sections: Section[];
  fiches: FicheDossierSoin[];
}

export function ListeFichesDossier({ sections, fiches }: ListeFichesDossierProps) {
  const [requete, setRequete] = useState("");

  const fichesVisibles = useMemo(() => {
    const q = requete.trim().toLowerCase();
    if (!q) return fiches;
    return fiches.filter(
      (f) => f.titre.toLowerCase().includes(q) || f.resume.toLowerCase().includes(q)
    );
  }, [fiches, requete]);

  const sectionsAvecFiches = sections
    .map((section) => ({ ...section, fiches: fichesVisibles.filter((f) => f.section === section.valeur) }))
    .filter((section) => section.fiches.length > 0);

  return (
    <div>
      <input
        type="search"
        value={requete}
        onChange={(event) => setRequete(event.target.value)}
        placeholder="Rechercher un document..."
        aria-label="Rechercher un document"
        className="mt-4 min-h-[48px] w-full rounded-[14px] border border-navy/10 bg-white px-4 text-[15px] text-navy placeholder:text-navy/40"
      />

      {sectionsAvecFiches.length > 0 ? (
        <div className="mt-6 flex flex-col gap-8">
          {sectionsAvecFiches.map((section) => (
            <div key={section.valeur} className="flex flex-col gap-3">
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-navy/45">{section.label}</h2>
              <div className="flex flex-col gap-3">
                {section.fiches.map((fiche) => (
                  <CarteFicheDossier key={fiche.id} fiche={fiche} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-7 text-center text-navy/50">
          {requete ? "Aucun document ne correspond." : "Aucune fiche disponible pour le moment."}
        </p>
      )}
    </div>
  );
}
