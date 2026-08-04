import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPatient, getSoinsPrescrits } from "@/lib/data/patients";
import { getOrdonnances } from "@/lib/data/ordonnances";
import { getVisitesPatient, type VisitePatient } from "@/lib/data/dossier-patient";
import { Ordonnances } from "@/components/ui/Ordonnances";
import { formatDateFr } from "@/lib/format";
import type { SoinPrescrit, StatutMission } from "@/lib/types/clinical";
import { IconeSoin } from "@/components/ui/IconeSoin";
import { EnTetePatientMobile } from "@/components/ui/EnTetePatientMobile";
import { OngletsPatient } from "@/components/ui/OngletsPatient";
import Link from "next/link";

const JOUR_LABEL = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

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

function decrireRecurrence(soin: SoinPrescrit): string {
  if (soin.frequenceType === "ponctuel") return `Le ${formatDateFr(soin.dateDebut)}`;
  if (soin.frequenceType === "quotidien") return "Tous les jours";
  if (soin.frequenceType === "tous_les_x_jours") return `Tous les ${soin.intervalleJours} jours`;
  return (soin.joursSemaine ?? []).map((jour) => JOUR_LABEL[jour]).join(", ");
}

function grouperParDate(visites: VisitePatient[]): [string, VisitePatient[]][] {
  const parDate = new Map<string, VisitePatient[]>();
  for (const visite of visites) {
    const liste = parDate.get(visite.date) ?? [];
    liste.push(visite);
    parDate.set(visite.date, liste);
  }
  return [...parDate.entries()];
}

function CarteSoin({ soin, actif }: { soin: SoinPrescrit; actif: boolean }) {
  return (
    <div
      className={`flex items-start gap-3.5 rounded-[16px] border bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ${
        actif ? "border-navy/[0.07]" : "border-navy/[0.05] opacity-65"
      }`}
    >
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-brand-violet/[0.10]"
      >
        <IconeSoin typeSoin={soin.typeSoin} className="h-5 w-5 text-brand-violet" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-navy">
          {soin.ngapCode ? `${soin.ngapCode} — ` : ""}{soin.typeSoin}
        </p>
        <p className="mt-0.5 text-[13px] text-navy/55">
          {decrireRecurrence(soin)} · {soin.heures.join(", ")}
        </p>
        <p className="mt-1 text-[12px] text-navy/35">
          Depuis le {formatDateFr(soin.dateDebut)}
          {soin.dateFin ? ` — jusqu'au ${formatDateFr(soin.dateFin)}` : ""}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
          actif
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-navy/5 text-navy/40 border border-navy/10"
        }`}
      >
        {actif ? "Actif" : "Arrêté"}
      </span>
    </div>
  );
}

export default async function FichePrescriptionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [patient, soins, ordonnances, visites] = await Promise.all([
    getPatient(supabase, id),
    getSoinsPrescrits(supabase, id),
    getOrdonnances(supabase, id),
    getVisitesPatient(supabase, id),
  ]);

  if (!patient) notFound();

  const actifs = soins.filter((soin) => soin.actif);
  const arretes = soins.filter((soin) => !soin.actif);

  const journees = grouperParDate(visites);
  const realisees = visites.filter((v) => v.statut === "terminee").length;
  const manquees = visites.filter((v) => v.statut === "absent").length;
  const transmissions = visites.filter(
    (v) => v.transmission?.trim() || v.rappel?.trim() || v.photoPath
  );

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      {/* ── Header iOS violet ── */}
      <EnTetePatientMobile patient={patient} soins={soins} visites={visites} />

      {/* ── Onglets de navigation ── */}
      <div
        className="sticky top-0 z-20 px-4 py-3"
        style={{
          background: "linear-gradient(160deg, #2D1557 0%, #3B1D72 100%)",
        }}
      >
        <div className="mx-auto max-w-xl">
          <OngletsPatient patientId={patient.id} />
        </div>
      </div>

      {/* ── Contenu : Soins ── */}
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-5 pb-32">

        {/* Protocoles en cours */}
        <section>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-navy/45">
            Protocoles en cours ({actifs.length})
          </p>
          {actifs.length > 0 ? (
            <div className="flex flex-col gap-3">
              {actifs.map((soin) => (
                <CarteSoin key={soin.id} soin={soin} actif />
              ))}
            </div>
          ) : (
            <div className="rounded-[16px] bg-white p-6 text-center shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
              <p className="text-[14.5px] text-navy/50">Aucun soin actif pour ce patient.</p>
              <p className="mt-1 text-[12.5px] text-navy/35">Ajoutez un premier soin ci-dessous.</p>
            </div>
          )}
        </section>

        {/* Consignes liées aux soins */}
        {(patient.noteSoin || patient.consignes || patient.allergies) && (
          <section className="rounded-[20px] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-navy/45">
              Consignes
            </p>
            <div className="flex flex-col gap-2.5 text-[14px] leading-relaxed text-navy/75">
              {patient.allergies && (
                <p>
                  <span className="font-semibold text-danger">⚠ Allergies : </span>
                  {patient.allergies}
                </p>
              )}
              {patient.noteSoin && (
                <p>
                  <span className="font-semibold text-navy">Soin : </span>
                  {patient.noteSoin}
                </p>
              )}
              {patient.consignes && (
                <p>
                  <span className="font-semibold text-navy">Consignes : </span>
                  {patient.consignes}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Historique des passages */}
        <section>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-navy/45">
            Historique des passages ({visites.length})
          </p>
          {visites.length > 0 ? (
            <>
              <div className="mb-3 grid grid-cols-3 gap-3">
                {[
                  { label: "Passages", valeur: visites.length },
                  { label: "Réalisés", valeur: realisees },
                  { label: "Absences", valeur: manquees },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[16px] bg-white p-4 text-center shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
                  >
                    <p className="text-[22px] font-bold leading-none tracking-tight text-navy">{stat.valeur}</p>
                    <p className="mt-1 text-[11px] text-navy/50">{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-4">
                {journees.map(([date, duJour]) => (
                  <div key={date}>
                    <p className="mb-2 text-[12px] font-semibold text-navy/45">
                      {date ? formatDateFr(date) : "Date inconnue"}
                    </p>
                    <div className="flex flex-col gap-2">
                      {duJour.map((visite) => (
                        <div
                          key={visite.id}
                          className="flex items-center gap-3 rounded-[14px] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
                        >
                          <span
                            aria-hidden="true"
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${POINT_CLASSES[visite.statut]}`}
                          />
                          <span className="shrink-0 text-[13px] font-bold tabular-nums text-navy/55">
                            {visite.heurePrevue.slice(0, 5)}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[14px] text-navy">{visite.typeSoin}</span>
                          <span
                            className={`shrink-0 rounded-[10px] px-2.5 py-1 text-[11px] font-semibold ${STATUT_CLASSES[visite.statut]}`}
                          >
                            {STATUT_LABEL[visite.statut]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-[16px] bg-white p-6 text-center shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
              <p className="text-[14.5px] text-navy/50">Aucun passage enregistré pour ce patient.</p>
              <p className="mt-1 text-[12.5px] text-navy/35">L&apos;historique se remplit au fil des tournées.</p>
            </div>
          )}
        </section>

        {/* Transmissions */}
        {transmissions.length > 0 && (
          <section>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-navy/45">
              Transmissions ({transmissions.length})
            </p>
            <div className="flex flex-col gap-3">
              {transmissions.map((visite) => (
                <article
                  key={visite.id}
                  className="rounded-[16px] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
                >
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="text-[13.5px] font-semibold text-navy">
                      {visite.date ? formatDateFr(visite.date) : "Date inconnue"}
                    </span>
                    <span className="text-[12.5px] tabular-nums text-navy/45">{visite.heurePrevue.slice(0, 5)}</span>
                    <span className="rounded-[10px] bg-brand-violet/[0.12] px-2.5 py-1 text-[11px] font-semibold text-brand-violet">
                      {visite.typeSoin}
                    </span>
                  </div>

                  {visite.transmission?.trim() && (
                    <p className="mt-2.5 whitespace-pre-line text-[14px] leading-relaxed text-navy/85">
                      {visite.transmission}
                    </p>
                  )}

                  {visite.rappel?.trim() && (
                    <div className="mt-2.5 rounded-[12px] border border-warning/40 bg-warning/[0.07] px-3.5 py-2.5">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#8a5a00]">Rappel</p>
                      <p className="mt-0.5 text-[13.5px] leading-relaxed text-navy/80">{visite.rappel}</p>
                    </div>
                  )}

                  {visite.photoPath && (
                    <p className="mt-2.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-violet">
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
                    className="mt-2.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-violet"
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
          </section>
        )}

        {/* Ordonnances */}
        <Ordonnances patientId={patient.id} ordonnances={ordonnances} />

        {/* Soins arrêtés */}
        {arretes.length > 0 && (
          <section>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-navy/35">
              Soins arrêtés ({arretes.length})
            </p>
            <div className="flex flex-col gap-3">
              {arretes.map((soin) => (
                <CarteSoin key={soin.id} soin={soin} actif={false} />
              ))}
            </div>
          </section>
        )}

        <p className="text-center text-[12.5px] text-navy/40">
          Les soins s&apos;ajoutent et s&apos;arrêtent depuis la fiche Identité du patient.
        </p>
      </div>

      {/* Bouton Enregistrer flottant */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-10 px-4 pb-3">
        <Link
          href={`/patients/${patient.id}`}
          className="btn-glace flex w-full items-center justify-center rounded-[16px] py-4 text-[15px] font-bold tracking-[-0.2px] text-white"
          style={{
            background: "linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)",
          }}
        >
          Enregistrer la fiche
        </Link>
      </div>
    </main>
  );
}
