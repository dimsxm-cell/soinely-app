"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PatientComplet } from "@/lib/types/clinical";
import { formaterNomPropre } from "@/lib/format";
import { EnTeteListePatients } from "@/components/ui/EnTeteListePatients";

function initiales(nomComplet: string): string {
  const sansTitre = nomComplet.replace(/^(Mme|M\.|Mr|Mlle)\s+/i, "").trim();
  const mots = sansTitre.split(/\s+/).filter(Boolean);
  return mots
    .slice(0, 2)
    .map((mot) => mot[0])
    .join("")
    .toUpperCase();
}

interface ListePatientsProps {
  patients: PatientComplet[];
  prochaineVisiteParPatient: Record<string, string>;
  avatarUrl?: string | null;
}

export function ListePatients({ patients, prochaineVisiteParPatient, avatarUrl }: ListePatientsProps) {
  const [requete, setRequete] = useState("");

  const patientsVisibles = useMemo(() => {
    const q = requete.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) => p.nomComplet.toLowerCase().includes(q) || p.adresse.toLowerCase().includes(q)
    );
  }, [patients, requete]);

  const nombreAujourdhui = Object.keys(prochaineVisiteParPatient).length;
  const nombreAlertes = patients.filter((p) => p.allergies && p.allergies.trim()).length;

  return (
    <>
      <EnTeteListePatients
        avatarUrl={avatarUrl}
        nombrePatients={patients.length}
        nombreAujourdhui={nombreAujourdhui}
        nombreAlertes={nombreAlertes}
        query={requete}
        onQuery={setRequete}
      />

      <div className="mx-auto max-w-2xl px-6 py-6">
        <div className="flex flex-col gap-3">
          {patientsVisibles.map((patient) => {
            const prochaineHeure = prochaineVisiteParPatient[patient.id];

            return (
              <Link
                key={patient.id}
                href={`/patients/${patient.id}`}
                className="row-lift flex w-full items-center gap-3.5 rounded-2xl border border-navy/[0.06] bg-white p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,.04)]"
              >
                <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-brand-violet/[0.12] text-[15px] font-semibold text-brand-violet">
                  {initiales(patient.nomComplet) || "?"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16.5px] font-semibold tracking-tight text-navy">
                    {formaterNomPropre(patient.nomComplet)}
                  </span>
                  <span className="block truncate text-[13.5px] text-navy/50">{patient.adresse || "—"}</span>
                </span>
                {prochaineHeure && (
                  <span className="shrink-0 whitespace-nowrap rounded-[10px] bg-brand-violet/[0.12] px-2.5 py-1 text-[12px] font-semibold text-brand-violet">
                    {prochaineHeure.slice(0, 5)}
                  </span>
                )}
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[19px] w-[19px] shrink-0 text-navy/25">
                  <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            );
          })}

          {patientsVisibles.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-7 text-center">
              <Image
                src="/marketing/ely-colibri-rassurant.webp"
                alt=""
                width={297}
                height={301}
                className="h-16 w-16 object-contain"
              />
              <p className="text-navy/50">
                {requete ? "Aucun patient ne correspond." : "Aucun patient enregistré pour le moment."}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-10 mx-auto max-w-2xl px-6">
        <Link
          href="/patients/nouveau"
          className="btn-glace flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-violet to-brand-rose text-[15px] font-bold text-white shadow-[0_10px_22px_rgba(109,40,217,.3)]"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[17px] w-[17px]">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Ajouter un patient
        </Link>
      </div>
    </>
  );
}
