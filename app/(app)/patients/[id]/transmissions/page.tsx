import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPatient } from "@/lib/data/patients";
import { getVisitesPatient } from "@/lib/data/dossier-patient";
import { formatDateFr } from "@/lib/format";
import { EnTeteFichePatient } from "@/components/ui/EnTeteFichePatient";

export default async function FicheTransmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [patient, visites] = await Promise.all([getPatient(supabase, id), getVisitesPatient(supabase, id)]);

  if (!patient) notFound();

  // Seules les visites porteuses d'une note ont leur place ici.
  const avecNote = visites.filter(
    (visite) => visite.transmission?.trim() || visite.rappel?.trim() || visite.photoPath
  );

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10 sm:py-14">
        <EnTeteFichePatient
          patientId={patient.id}
          patientNom={patient.nomComplet}
          titre="Transmissions"
          sousTitre="Notes consignées lors des visites, de la plus récente à la plus ancienne."
        />

        {avecNote.length > 0 ? (
          <div className="flex flex-col gap-3">
            {avecNote.map((visite) => (
              <article
                key={visite.id}
                className="rounded-[18px] border border-navy/[0.08] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,.04)]"
              >
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="text-[14px] font-semibold text-navy">
                    {visite.date ? formatDateFr(visite.date) : "Date inconnue"}
                  </span>
                  <span className="text-[13px] tabular-nums text-navy/45">{visite.heurePrevue.slice(0, 5)}</span>
                  <span className="rounded-[10px] bg-brand-violet/[0.12] px-2.5 py-1 text-[11.5px] font-semibold text-brand-violet">
                    {visite.typeSoin}
                  </span>
                </div>

                {visite.transmission?.trim() && (
                  <p className="mt-3 whitespace-pre-line text-[14.5px] leading-relaxed text-navy/85">
                    {visite.transmission}
                  </p>
                )}

                {visite.rappel?.trim() && (
                  <div className="mt-3 rounded-[12px] border border-warning/40 bg-warning/[0.07] px-3.5 py-2.5">
                    <p className="text-[11.5px] font-bold uppercase tracking-wide text-[#8a5a00]">Rappel</p>
                    <p className="mt-0.5 text-[14px] leading-relaxed text-navy/80">{visite.rappel}</p>
                  </div>
                )}

                {visite.photoPath && (
                  <p className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-brand-violet">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
                      <path
                        d="M3 7a2 2 0 0 1 2-2h3l2-2h4l2 2h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="1.8" fill="none" />
                    </svg>
                    Une photo a été jointe à cette visite
                  </p>
                )}

                <Link
                  href={`/ma-journee/${visite.id}`}
                  className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-violet"
                >
                  Ouvrir la visite
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5">
                    <path
                      d="m9 18 6-6-6-6"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-[14.5px] text-navy/55">
            Aucune transmission pour ce patient. Les notes saisies pendant une visite apparaîtront ici.
          </p>
        )}
      </div>
    </main>
  );
}
