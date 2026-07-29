import Link from "next/link";

const DOSSIERS = [
  { label: "Administratif", valeur: "Fiche complète", chemin: "administratif", gradient: "from-[#b06ae0] to-[#8b3fd6]", icone: "admin" },
  { label: "Prescriptions", valeur: "Soins actifs", chemin: "prescriptions", gradient: "from-[#f2ad5c] to-[#e0863a]", icone: "rx" },
  { label: "Diagramme de soins", valeur: "Historique", chemin: "diagramme", gradient: "from-[#7db8ea] to-[#4f97dd]", icone: "chart" },
  { label: "Transmissions", valeur: "Notes de visite", chemin: "transmissions", gradient: "from-[#e86ab0] to-[#d63f97]", icone: "msg" },
] as const;

const CHEMINS_ICONE: Record<(typeof DOSSIERS)[number]["icone"], string> = {
  admin: "M3 4h18v16H3z M9 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M15 8h3 M15 12h3 M7.5 16.5c.6-1.4 3.4-1.4 4 0",
  rx: "M8 2h8v4H8z M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 12h6 M9 16h4",
  chart: "M3 3v18h18 M7 14l3-4 3 3 4-6",
  msg: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
};

interface TuilesDossierPatientProps {
  patientId: string;
  className?: string;
}

export function TuilesDossierPatient({ patientId, className = "" }: TuilesDossierPatientProps) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      {DOSSIERS.map((dossier) => (
        <Link
          key={dossier.label}
          href={`/patients/${patientId}/${dossier.chemin}`}
          className={`tile-bounce flex h-[110px] flex-col justify-between rounded-2xl bg-gradient-to-br p-3.5 shadow-[0_10px_20px_rgba(0,0,0,0.12)] ${dossier.gradient}`}
        >
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-white/25">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[19px] w-[19px] text-white">
              <path d={CHEMINS_ICONE[dossier.icone]} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span>
            <span className="block text-[12.5px] font-semibold leading-tight text-white/90">{dossier.label}</span>
            <span className="mt-0.5 block text-[16px] font-bold tracking-tight text-white">{dossier.valeur}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
