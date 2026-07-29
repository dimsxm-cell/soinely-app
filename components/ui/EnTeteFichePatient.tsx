import { formaterNomPropre } from "@/lib/format";
import { LienRetour } from "@/components/ui/LienRetour";

interface EnTeteFichePatientProps {
  patientId: string;
  patientNom: string;
  titre: string;
  sousTitre: string;
}

/** En-tête commun aux quatre fiches du dossier patient. */
export function EnTeteFichePatient({ patientId, patientNom, titre, sousTitre }: EnTeteFichePatientProps) {
  return (
    <div>
      <LienRetour href={`/patients/${patientId}`} label={formaterNomPropre(patientNom)} />
      <h1 className="mt-4 font-display text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]">
        {titre}
      </h1>
      <p className="mt-1.5 text-[14px] text-navy/50">{sousTitre}</p>
    </div>
  );
}
