import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPatient, getSoinsPrescrits } from "@/lib/data/patients";
import { getOrdonnances } from "@/lib/data/ordonnances";
import { Ordonnances } from "@/components/ui/Ordonnances";
import { formatDateFr } from "@/lib/format";
import type { SoinPrescrit } from "@/lib/types/clinical";
import { IconeSoin } from "@/components/ui/IconeSoin";
import { EnTetePatientMobile } from "@/components/ui/EnTetePatientMobile";
import { OngletsPatient } from "@/components/ui/OngletsPatient";
import Link from "next/link";

const JOUR_LABEL = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function decrireRecurrence(soin: SoinPrescrit): string {
  if (soin.frequenceType === "ponctuel") return `Le ${formatDateFr(soin.dateDebut)}`;
  if (soin.frequenceType === "quotidien") return "Tous les jours";
  if (soin.frequenceType === "tous_les_x_jours") return `Tous les ${soin.intervalleJours} jours`;
  return (soin.joursSemaine ?? []).map((jour) => JOUR_LABEL[jour]).join(", ");
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
  const [patient, soins, ordonnances] = await Promise.all([
    getPatient(supabase, id),
    getSoinsPrescrits(supabase, id),
    getOrdonnances(supabase, id),
  ]);

  if (!patient) notFound();

  const actifs = soins.filter((soin) => soin.actif);
  const arretes = soins.filter((soin) => !soin.actif);

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      {/* ── Header iOS violet ── */}
      <EnTetePatientMobile patient={patient} soins={soins} />

      {/* ── Onglets de navigation ── */}
      <div
        className="sticky top-0 z-20 px-4 py-3"
        style={{
          background: "linear-gradient(160deg, #2D1557 0%, #3B1D72 100%)",
        }}
      >
        <OngletsPatient patientId={patient.id} />
      </div>

      {/* ── Contenu : Soins ── */}
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-5 pb-32">

        {/* Protocoles en cours */}
        <section>
          <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.07em] text-navy/45">
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
            <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.07em] text-navy/45">
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

        {/* Ordonnances */}
        <Ordonnances patientId={patient.id} ordonnances={ordonnances} />

        {/* Soins arrêtés */}
        {arretes.length > 0 && (
          <section>
            <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.07em] text-navy/35">
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
          className="btn-glace flex w-full items-center justify-center rounded-[16px] py-4 text-[15.5px] font-bold tracking-[-0.2px] text-white"
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
