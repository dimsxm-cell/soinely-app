"use client";

import { useMemo, useState } from "react";
import type { FicheDossierSoin, SectionDossierSoin } from "@/lib/types/clinical";
import { CarteFicheDossier } from "./CarteFicheDossier";
import { EnTeteExplorer } from "./EnTeteExplorer";

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
    <>
      <EnTeteExplorer
        actif="dossier"
        titre="Dossier de soins"
        sous="Ordonnances, comptes-rendus et protocoles de référence."
        query={requete}
        onQuery={setRequete}
        placeholder="Rechercher un document…"
      />

      <div className="mx-auto max-w-2xl px-6 py-6">
        {sectionsAvecFiches.length > 0 ? (
          <div className="flex flex-col gap-8">
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
    </>
  );
}
