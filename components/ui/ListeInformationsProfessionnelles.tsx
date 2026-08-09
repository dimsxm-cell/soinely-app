"use client";

import { useMemo, useState } from "react";
import type { FicheDossierSoin } from "@/lib/types/clinical";
import { CarteFicheDossier } from "./CarteFicheDossier";
import { EnTeteExplorer } from "./EnTeteExplorer";

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
    <>
      <EnTeteExplorer
        actif="informations"
        titre="Infos pro"
        sous="Repères juridiques et déontologiques pour votre exercice, issus des fiches de l’Ordre National des Infirmiers."
        query={requete}
        onQuery={setRequete}
        placeholder="Rechercher une fiche…"
      />

      <div className="mx-auto max-w-2xl px-6 py-6">
        <div className="flex flex-col gap-3">
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
    </>
  );
}
