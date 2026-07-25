import Link from "next/link";
import type { FicheDossierSoin, SectionDossierSoin } from "@/lib/types/clinical";
import { SECTIONS_DOSSIER_SOINS } from "@/lib/data/dossierSoins";
import { BadgeNiveauConfiance } from "./BadgeNiveauConfiance";

const PROPS_ICONE = {
  width: 21,
  height: 21,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

function IconeSection({ section }: { section: SectionDossierSoin }) {
  switch (section) {
    case "traitements":
      return (
        <svg {...PROPS_ICONE}>
          <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
          <path d="m8.5 8.5 7 7" />
        </svg>
      );
    case "protocoles_urgence":
    case "allergies_alertes":
      return (
        <svg {...PROPS_ICONE}>
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "surveillance_clinique":
      return (
        <svg {...PROPS_ICONE}>
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      );
    case "transmissions_infirmieres":
      return (
        <svg {...PROPS_ICONE}>
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
          <path d="M14 2v5h5" />
          <path d="M8 13h8" />
          <path d="M8 17h5" />
        </svg>
      );
    case "prescriptions_liaisons_medicales":
      return (
        <svg {...PROPS_ICONE}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "identification_patient":
      return (
        <svg {...PROPS_ICONE}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
        </svg>
      );
    case "contacts_utiles":
      return (
        <svg {...PROPS_ICONE}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      );
    case "administratif":
    default:
      return (
        <svg {...PROPS_ICONE}>
          <path d="M3 7v13h18V7" />
          <path d="M3 7l3-4h12l3 4" />
          <path d="M3 7h18" />
        </svg>
      );
  }
}

interface CarteFicheDossierProps {
  fiche: FicheDossierSoin;
}

export function CarteFicheDossier({ fiche }: CarteFicheDossierProps) {
  const labelSection = SECTIONS_DOSSIER_SOINS.find((s) => s.valeur === fiche.section)?.label ?? "";

  return (
    <Link
      href={`/situations/dossier/${fiche.id}`}
      className="row-lift flex items-center gap-3.5 rounded-[18px] border border-navy/[0.06] bg-white p-[18px] shadow-[0_8px_22px_rgba(80,50,140,.1)]"
    >
      <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[13px] bg-brand-violet/[0.12] text-brand-violet">
        <IconeSection section={fiche.section} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold tracking-tight text-navy">{fiche.titre}</span>
        <span className="mt-0.5 block truncate text-[13px] text-navy/50">{labelSection}</span>
      </span>
      <BadgeNiveauConfiance niveau={fiche.niveauConfiance} />
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#c4bfd0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </Link>
  );
}
