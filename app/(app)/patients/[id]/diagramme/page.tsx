import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPatient } from "@/lib/data/patients";
import { getVisitesPatient, type VisitePatient } from "@/lib/data/dossier-patient";
import { formatDateFr } from "@/lib/format";
import type { StatutMission } from "@/lib/types/clinical";
import { EnTeteFichePatient } from "@/components/ui/EnTeteFichePatient";

const STATUT_LABEL: Record<StatutMission, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  terminee: "Terminée",
  absent: "Absente",
};

const STATUT_CLASSES: Record<StatutMission, string> = {
  a_faire: "bg-navy/5 text-navy/50",
  en_cours: "bg-brand-violet/[0.12] text-brand-violet",
  terminee: "bg-teal/10 text-[#0E7E70]",
  absent: "bg-danger/10 text-danger",
};

const POINT_CLASSES: Record<StatutMission, string> = {
  a_faire: "bg-navy/20",
  en_cours: "bg-brand-violet",
  terminee: "bg-[#1a7f37]",
  absent: "bg-danger",
};

function grouperParDate(visites: VisitePatient[]): [string, VisitePatient[]][] {
  const parDate = new Map<string, VisitePatient[]>();
  for (const visite of visites) {
    const liste = parDate.get(visite.date) ?? [];
    liste.push(visite);
    parDate.set(visite.date, liste);
  }
  return [...parDate.entries()];
}

export default async function FicheDiagrammePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [patient, visites] = await Promise.all([getPatient(supabase, id), getVisitesPatient(supabase, id)]);

  if (!patient) notFound();

  const journees = grouperParDate(visites);
  const realisees = visites.filter((v) => v.statut === "terminee").length;
  const manquees = visites.filter((v) => v.statut === "absent").length;

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10 sm:py-14">
        <EnTeteFichePatient
          patientId={patient.id}
          patientNom={patient.nomComplet}
          titre="Diagramme de soins"
          sousTitre="Historique des passages, jour par jour."
        />

        {visites.length > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Passages", valeur: visites.length },
                { label: "Réalisés", valeur: realisees },
                { label: "Absences", valeur: manquees },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[16px] border border-navy/[0.08] bg-white p-4 text-center shadow-[0_1px_2px_rgba(15,23,42,.04)]"
                >
                  <p className="font-display text-[26px] font-bold leading-none tracking-tight text-navy">
                    {stat.valeur}
                  </p>
                  <p className="mt-1 text-[12px] text-navy/50">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-5">
              {journees.map(([date, duJour]) => (
                <section key={date}>
                  <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-navy/45">
                    {date ? formatDateFr(date) : "Date inconnue"}
                  </p>
                  <div className="mt-2.5 flex flex-col gap-2.5">
                    {duJour.map((visite) => (
                      <div
                        key={visite.id}
                        className="flex items-center gap-3 rounded-[14px] border border-navy/[0.06] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,.04)]"
                      >
                        <span
                          aria-hidden="true"
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${POINT_CLASSES[visite.statut]}`}
                        />
                        <span className="shrink-0 text-[13px] font-bold tabular-nums text-navy/55">
                          {visite.heurePrevue.slice(0, 5)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[14.5px] text-navy">{visite.typeSoin}</span>
                        <span
                          className={`shrink-0 rounded-[10px] px-2.5 py-1 text-[11.5px] font-semibold ${STATUT_CLASSES[visite.statut]}`}
                        >
                          {STATUT_LABEL[visite.statut]}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-[14.5px] text-navy/55">
            Aucun passage enregistré pour ce patient. L&apos;historique se remplit au fil des tournées.
          </p>
        )}
      </div>
    </main>
  );
}
