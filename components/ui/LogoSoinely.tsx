/**
 * Logo Soinely : un cœur portant une croix médicale, d'après la charte.
 *
 * Deux formes, celles de la charte :
 *  - « icone » : cœur violet, croix blanche — pour les usages discrets ;
 *  - « carre » : cœur blanc sur carré violet, croix violette — la déclinaison
 *    retenue pour le titre du site.
 *
 * La croix est évidée du cœur : elle prend la couleur du fond, jamais la
 * sienne. C'est ce qui la rend lisible dans les deux sens.
 *
 * Le tracé est une reconstruction vectorielle d'après la planche de charte.
 * Le violet est celui de la charte (#6A4CFF), et non le brand-violet de
 * l'application : la charte gouverne le logo, l'interface garde ses couleurs.
 *
 * Les couleurs passent par `style` et non par des classes : Tailwind ne
 * compile pas une classe construite par interpolation.
 */

const VIOLET_CHARTE = "#6A4CFF";
const BLANC = "#FFFFFF";

function CoeurCroix({ coeur, croix }: { coeur: string; croix: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className="h-full w-full">
      <path
        d="M24 42S5 29.5 5 17.6C5 11.2 9.9 6 16 6c3.7 0 7 1.9 8 4.8C25 7.9 28.3 6 32 6c6.1 0 11 5.2 11 11.6C43 29.5 24 42 24 42Z"
        fill={coeur}
      />
      <path d="M30 12h6v5h5v6h-5v5h-6v-5h-5v-6h5v-5Z" fill={croix} />
    </svg>
  );
}

interface LogoSoinelyProps {
  /** Taille du logo. Par défaut `h-6 w-6`. */
  className?: string;
  /** Forme retenue. « icone » par défaut. */
  variante?: "icone" | "carre";
}

export function LogoSoinely({ className = "h-6 w-6", variante = "icone" }: LogoSoinelyProps) {
  if (variante === "carre") {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-[28%] ${className}`}
        style={{ backgroundColor: VIOLET_CHARTE }}
      >
        <span className="block h-[62%] w-[62%]">
          <CoeurCroix coeur={BLANC} croix={VIOLET_CHARTE} />
        </span>
      </span>
    );
  }

  return (
    <span className={`inline-block shrink-0 ${className}`}>
      <CoeurCroix coeur={VIOLET_CHARTE} croix={BLANC} />
    </span>
  );
}
