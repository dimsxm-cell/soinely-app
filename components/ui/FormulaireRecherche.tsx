"use client";

import { useState } from "react";
import { PersistanceRecherche } from "@/components/ui/PersistanceRecherche";
import { Button } from "@/components/ui/Button";

interface FormulaireRechercheProps {
  requeteInitiale: string;
}

export function FormulaireRecherche({ requeteInitiale }: FormulaireRechercheProps) {
  const [requete, setRequete] = useState(requeteInitiale);

  return (
    <>
      <PersistanceRecherche cle="recherche_derniere_requete" requeteActuelle={requeteInitiale} onRestaurer={setRequete} />
      <form method="GET" className="flex gap-3">
        <input
          type="search"
          name="q"
          value={requete}
          onChange={(event) => setRequete(event.target.value)}
          placeholder="Ex. : la perfusion ne passe plus"
          aria-label="Rechercher une situation terrain"
          className="min-h-[44px] flex-1 rounded-card border border-navy/20 bg-white px-4 py-2 text-navy"
        />
        <Button type="submit">Rechercher</Button>
      </form>
    </>
  );
}
