"use client";

import { useEffect } from "react";

interface PersistanceRechercheProps {
  cle: string;
  requeteActuelle: string;
  onRestaurer: (texte: string) => void;
}

export function PersistanceRecherche({ cle, requeteActuelle, onRestaurer }: PersistanceRechercheProps) {
  useEffect(() => {
    if (requeteActuelle) {
      window.localStorage.setItem(cle, requeteActuelle);
      return;
    }

    const derniereRequete = window.localStorage.getItem(cle);
    if (derniereRequete) {
      onRestaurer(derniereRequete);
    }
  }, [cle, requeteActuelle, onRestaurer]);

  return null;
}
