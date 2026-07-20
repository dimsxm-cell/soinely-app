"use client";

import { useState } from "react";
import type { Sexe } from "@/lib/types/clinical";

const MOIS_VALIDES = new Set(Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")));

export function deriverIdentiteDepuisNir(numeroSecu: string): {
  dateNaissance: string | null;
  sexe: Sexe | null;
} {
  const chiffres = numeroSecu.replace(/\s/g, "");
  if (!/^\d{13,15}$/.test(chiffres)) return { dateNaissance: null, sexe: null };

  const premierChiffre = chiffres[0];
  const sexe: Sexe | null = premierChiffre === "1" ? "homme" : premierChiffre === "2" ? "femme" : null;

  const annee2Chiffres = chiffres.slice(1, 3);
  const mois = chiffres.slice(3, 5);

  let dateNaissance: string | null = null;
  if (MOIS_VALIDES.has(mois)) {
    const anneeActuelle = new Date().getFullYear();
    const siecle = Math.floor(anneeActuelle / 100) * 100;
    let annee = siecle + Number(annee2Chiffres);
    if (annee > anneeActuelle) annee -= 100;
    dateNaissance = `${annee}-${mois}-01`;
  }

  return { dateNaissance, sexe };
}

interface ChampsIdentiteProps {
  defaultNumeroSecu?: string | null;
  defaultDateNaissance?: string | null;
  defaultSexe?: Sexe | null;
}

export function ChampsIdentite({ defaultNumeroSecu, defaultDateNaissance, defaultSexe }: ChampsIdentiteProps) {
  const [numeroSecu, setNumeroSecu] = useState(defaultNumeroSecu ?? "");
  const [dateNaissance, setDateNaissance] = useState(defaultDateNaissance ?? "");
  const [sexe, setSexe] = useState<string>(defaultSexe ?? "");

  function surChangementNumeroSecu(valeur: string) {
    setNumeroSecu(valeur);
    const derive = deriverIdentiteDepuisNir(valeur);
    if (derive.dateNaissance) setDateNaissance(derive.dateNaissance);
    if (derive.sexe) setSexe(derive.sexe);
  }

  return (
    <>
      <label className="flex flex-col gap-1 text-sm text-navy">
        Numéro de sécurité sociale
        <input
          name="numeroSecu"
          value={numeroSecu}
          onChange={(event) => surChangementNumeroSecu(event.target.value)}
          className="rounded-card border border-navy/20 p-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-navy">
        Date de naissance
        <input
          type="date"
          name="dateNaissance"
          value={dateNaissance}
          onChange={(event) => setDateNaissance(event.target.value)}
          className="rounded-card border border-navy/20 p-2"
        />
        <span className="text-xs text-navy/45">
          Année et mois déduits du numéro de sécu — vérifiez le jour exact.
        </span>
      </label>
      <label className="flex flex-col gap-1 text-sm text-navy">
        Sexe
        <select
          name="sexe"
          value={sexe}
          onChange={(event) => setSexe(event.target.value)}
          className="rounded-card border border-navy/20 bg-white p-2"
        >
          <option value="">Non renseigné</option>
          <option value="homme">Homme</option>
          <option value="femme">Femme</option>
        </select>
      </label>
    </>
  );
}
