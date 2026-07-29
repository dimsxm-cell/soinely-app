"use client";

import { useId, useState } from "react";

interface ChampFichierProps {
  name: string;
  ariaLabel: string;
  accept?: string;
  capture?: "user" | "environment";
  libelle?: string;
}

/**
 * Champ de sélection de fichier en français.
 *
 * Le bouton d'un `input[type=file]` natif affiche « Choose File » ou
 * « Parcourir… » selon la langue du navigateur, et non celle de la page :
 * son libellé est impossible à traduire. Le champ natif est donc masqué
 * visuellement (tout en restant accessible aux lecteurs d'écran) et piloté
 * par un label stylé en bouton. L'anneau de focus est reporté sur le label
 * via `peer-focus-visible` pour rester utilisable au clavier.
 */
export function ChampFichier({
  name,
  ariaLabel,
  accept,
  capture,
  libelle = "Choisir une photo",
}: ChampFichierProps) {
  const id = useId();
  const [nomFichier, setNomFichier] = useState<string | null>(null);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <input
        id={id}
        type="file"
        name={name}
        accept={accept}
        capture={capture}
        aria-label={ariaLabel}
        className="peer sr-only"
        onChange={(event) => setNomFichier(event.target.files?.[0]?.name ?? null)}
      />
      <label
        htmlFor={id}
        className="btn-glace-clair shrink-0 cursor-pointer rounded-[10px] border border-brand-violet/25 bg-brand-violet/10 px-3.5 py-2 text-[12.5px] font-semibold text-brand-violet peer-focus-visible:ring-2 peer-focus-visible:ring-brand-violet peer-focus-visible:ring-offset-2"
      >
        {libelle}
      </label>
      <span className="min-w-0 flex-1 truncate text-[12.5px] text-navy/55">
        {nomFichier ?? "Aucun fichier sélectionné"}
      </span>
    </div>
  );
}
