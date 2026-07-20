import Link from "next/link";
import type { PatientComplet } from "@/lib/types/clinical";

interface CartePatientProps {
  patient: PatientComplet;
}

export function CartePatient({ patient }: CartePatientProps) {
  return (
    <Link
      href={`/patients/${patient.id}`}
      className="block rounded-card border border-navy/10 bg-white p-6 transition-colors hover:border-brand-violet"
    >
      <h2 className="text-lg font-semibold text-navy">{patient.nomComplet}</h2>
      <p className="mt-1 text-sm text-navy/60">{patient.adresse}</p>
    </Link>
  );
}
