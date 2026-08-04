"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface OngletPatientProps {
  patientId: string;
}

const ONGLETS = [
  { label: "Identité", href: (id: string) => `/patients/${id}` },
  { label: "Soins", href: (id: string) => `/patients/${id}/prescriptions` },
  { label: "Documents", href: (id: string) => `/patients/${id}/documents` },
];

/**
 * Barre d'onglets de navigation entre les sections de la fiche patient.
 * Navigation par URL : Identité / Soins / Documents.
 */
export function OngletsPatient({ patientId }: OngletPatientProps) {
  const pathname = usePathname();

  function estActif(href: string): boolean {
    // La page Identité est la racine exacte
    if (href === `/patients/${patientId}`) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <div
      className="flex gap-1 rounded-[14px] p-1.5"
      style={{
        background: "rgba(255,255,255,0.10)",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
      role="tablist"
      aria-label="Sections de la fiche patient"
    >
      {ONGLETS.map((onglet) => {
        const href = onglet.href(patientId);
        const actif = estActif(href);
        return (
          <Link
            key={onglet.label}
            href={href}
            role="tab"
            aria-selected={actif}
            className={`flex-1 rounded-[10px] py-2 text-center text-[12.5px] transition-all duration-200 ${
              actif
                ? "bg-white font-bold text-[#1A0A2E] shadow-[0_1px_4px_rgba(0,0,0,0.15)]"
                : "font-semibold text-white/70 hover:text-white"
            }`}
          >
            {onglet.label}
          </Link>
        );
      })}
    </div>
  );
}
