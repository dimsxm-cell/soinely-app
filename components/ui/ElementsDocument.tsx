import type { ReactNode } from "react";
import { LogoSoinely } from "@/components/ui/LogoSoinely";
import { formatDateFr, formaterNomPropre } from "@/lib/format";

interface EnTeteDocumentProps {
  titreDocument: string;
  sousTitre?: string;
  nomIdel: string;
  patient: { nomComplet: string; dateNaissance: string | null; adresse: string; telephone: string };
}

export function EnTeteDocument({ titreDocument, sousTitre, nomIdel, patient }: EnTeteDocumentProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between border-b border-navy/10 pb-4">
        <div className="flex items-center gap-2">
          <LogoSoinely className="h-6 w-6" />
          <span className="font-display text-lg font-bold text-navy">Soinely</span>
        </div>
        <div className="text-right text-[13px] text-navy/60">
          <p className="font-semibold text-navy">{formaterNomPropre(nomIdel)}</p>
          <p>Infirmier(ère) diplômé(e) d&apos;État</p>
        </div>
      </div>

      <h1 className="mt-6 font-display text-[26px] font-bold text-navy">{titreDocument}</h1>
      {sousTitre && <p className="mt-1 text-[14px] text-navy/60">{sousTitre}</p>}

      <div className="mt-5 grid grid-cols-2 gap-4 rounded-[16px] border border-navy/10 bg-[#F6F7F5] p-4 text-[13.5px]">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-navy/45">Patient</p>
          <p className="mt-1 font-semibold text-navy">{formaterNomPropre(patient.nomComplet)}</p>
          {patient.dateNaissance && <p className="text-navy/70">Né(e) le {formatDateFr(patient.dateNaissance)}</p>}
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-navy/45">Coordonnées</p>
          <p className="text-navy/70">{patient.adresse || "—"}</p>
          <p className="text-navy/70">{patient.telephone || "—"}</p>
        </div>
      </div>
    </div>
  );
}

export function CaseACocher({ label }: { label: string }) {
  return (
    <li className="flex items-start gap-2.5 text-[14px] leading-relaxed text-navy/80">
      <span aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 rounded-[4px] border border-navy/30" />
      {label}
    </li>
  );
}

interface BlocSignatureProps {
  titre: string;
  nom?: string;
  sousTitre?: string;
}

export function BlocSignature({ titre, nom, sousTitre }: BlocSignatureProps) {
  return (
    <div className="flex flex-col gap-1 rounded-[14px] border border-navy/10 p-4">
      <p className="text-[12px] font-bold uppercase tracking-wide text-navy/45">{titre}</p>
      {sousTitre && <p className="text-[11.5px] text-navy/45">{sousTitre}</p>}
      <p className="mt-1 text-[13.5px] text-navy/70">Nom : {nom ? formaterNomPropre(nom) : "……………………………………"}</p>
      <p className="text-[13.5px] text-navy/70">Date : ……… / ……… / …………</p>
      <div className="mt-3 h-16 rounded-[10px] border border-dashed border-navy/20" />
    </div>
  );
}

export function TitreSection({ children }: { children: ReactNode }) {
  return <h2 className="text-[13px] font-bold uppercase tracking-wide text-navy/45">{children}</h2>;
}
