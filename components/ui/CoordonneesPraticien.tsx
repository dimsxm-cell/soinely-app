"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { CoordonneesPraticien } from "@/lib/data/profil";
import { enregistrerCoordonneesPraticienAction } from "@/lib/data/profil-actions";

/**
 * Coordonnées professionnelles imprimées sur les documents émis par l'IDEL.
 *
 * Trois pièces séparées, parce qu'elles se posent à des endroits différents
 * selon l'écran : le bloc en en-tête sur les documents patient, en pied de
 * page sur les fiches d'Explorer, et la barre d'impression ailleurs encore.
 * Elles partagent le même état modifiable par un contexte — c'est ce qui leur
 * permet de vivre à des endroits libres de l'arbre sans se passer de props.
 */

interface ContexteCoordonnees {
  coordonnees: CoordonneesPraticien;
  modifier: (champ: keyof CoordonneesPraticien, valeur: string) => void;
}

const Contexte = createContext<ContexteCoordonnees | null>(null);

function useCoordonnees(): ContexteCoordonnees {
  const contexte = useContext(Contexte);
  if (!contexte) {
    throw new Error("BlocCoordonneesPraticien et BarreImpressionPraticien doivent être placés dans FournisseurCoordonneesPraticien.");
  }
  return contexte;
}

export function FournisseurCoordonneesPraticien({
  initiales,
  children,
}: {
  initiales: CoordonneesPraticien;
  children: ReactNode;
}) {
  const [coordonnees, setCoordonnees] = useState(initiales);
  const modifier = (champ: keyof CoordonneesPraticien, valeur: string) =>
    setCoordonnees((c) => ({ ...c, [champ]: valeur }));

  return <Contexte.Provider value={{ coordonnees, modifier }}>{children}</Contexte.Provider>;
}

export function BlocCoordonneesPraticien({ className = "" }: { className?: string }) {
  const { coordonnees } = useCoordonnees();
  const { nom, adresse, codePostal, telephone, adeliRpps } = coordonnees;

  const lieu = [adresse, codePostal].filter(Boolean).join(", ");
  const lignes = [
    nom,
    lieu,
    telephone ? `Tél. ${telephone}` : "",
    adeliRpps ? `ADELI/RPPS ${adeliRpps}` : "",
  ].filter(Boolean);

  // Un profil entièrement vide ne doit pas laisser un cadre orphelin sur la
  // feuille imprimée.
  if (lignes.length === 0) return null;

  return (
    <div
      data-bloc-coordonnees
      className={`hidden print:block text-[12px] leading-relaxed text-navy/70 ${className}`}
    >
      {lignes.map((ligne) => (
        <div key={ligne} data-ligne-coordonnee>
          {ligne}
        </div>
      ))}
    </div>
  );
}

const CHAMPS: { clef: keyof CoordonneesPraticien; libelle: string }[] = [
  { clef: "nom", libelle: "Nom" },
  { clef: "adresse", libelle: "Adresse" },
  { clef: "codePostal", libelle: "Code postal" },
  { clef: "telephone", libelle: "Téléphone" },
  { clef: "adeliRpps", libelle: "ADELI / RPPS" },
];

export function BarreImpressionPraticien() {
  const { coordonnees, modifier } = useCoordonnees();
  // Ouvert par défaut : le but même de cette barre est de laisser vérifier
  // les coordonnées avant d'imprimer, pas de les cacher derrière un clic.
  const [ouvert, setOuvert] = useState(true);
  const [enregistrer, setEnregistrer] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Seuls les champs déjà renseignés sont proposés à la correction : cette
  // barre sert à corriger une coordonnée existante juste avant d'imprimer,
  // pas à compléter un profil — ça, c'est le rôle de l'écran /compte. Figé au
  // montage pour qu'un champ effacé pendant la saisie ne disparaisse pas du
  // panneau sous les doigts de l'IDEL.
  const [champsAffiches] = useState(() => CHAMPS.filter(({ clef }) => coordonnees[clef] !== ""));

  async function imprimer() {
    // L'enregistrement ne conditionne jamais l'impression : une écriture qui
    // échoue laisse la valeur saisie valable pour la feuille en cours.
    if (enregistrer) {
      const formData = new FormData();
      for (const { clef } of CHAMPS) formData.set(clef, coordonnees[clef]);
      const resultat = await enregistrerCoordonneesPraticienAction(formData);
      if (!resultat.succes) setMessage(resultat.erreur ?? "L'enregistrement a échoué.");
    }
    window.print();
  }

  return (
    <div data-barre-impression className="print:hidden flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        className="text-[13.5px] font-semibold text-brand-violet"
      >
        {ouvert ? "Masquer mes coordonnées" : "Vérifier mes coordonnées"}
      </button>

      {ouvert && (
        <div className="w-full max-w-[520px] rounded-[16px] border border-navy/10 bg-white p-4">
          <div className="flex flex-col gap-3">
            {champsAffiches.map(({ clef, libelle }) => (
              <div key={clef}>
                <label htmlFor={`coord-${clef}`} className="block text-[13px] text-navy/55">
                  {libelle}
                </label>
                <input
                  id={`coord-${clef}`}
                  type="text"
                  value={coordonnees[clef]}
                  onChange={(e) => modifier(clef, e.target.value)}
                  className="mt-1 w-full rounded-[12px] border border-navy/15 bg-white px-3 py-2 text-[15px] text-navy focus:border-brand-violet focus:outline-none focus:ring-2 focus:ring-brand-violet/30"
                />
              </div>
            ))}
          </div>

          <label className="mt-3 flex items-center gap-2 text-[13.5px] text-navy/70">
            <input
              type="checkbox"
              checked={enregistrer}
              onChange={(e) => setEnregistrer(e.target.checked)}
              className="h-4 w-4"
            />
            Enregistrer dans mon profil
          </label>

          {message && <p className="mt-2 text-[13px] text-danger">{message}</p>}
        </div>
      )}

      <button
        type="button"
        onClick={imprimer}
        className="btn-glace flex items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-brand-violet to-brand-rose px-5 py-3 text-[14.5px] font-semibold text-white shadow-[0_8px_20px_rgba(124,58,237,0.28)]"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9V2h12v7" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
        Imprimer
      </button>
    </div>
  );
}
