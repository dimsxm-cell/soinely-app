import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPatient, getSoinsPrescrits } from "@/lib/data/patients";
import { formatDateFr } from "@/lib/format";
import type { SoinPrescrit } from "@/lib/types/clinical";
import { EnTeteFichePatient } from "@/components/ui/EnTeteFichePatient";
import { IconeSoin } from "@/components/ui/IconeSoin";

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
      className={`flex items-start gap-3 rounded-[16px] border bg-white p-4 ${
        actif ? "border-navy/[0.08] shadow-[0_1px_2px_rgba(15,23,42,.04)]" : "border-navy/[0.06] opacity-70"
      }`}
    >
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-brand-violet/[0.12]"
      >
        <IconeSoin typeSoin={soin.typeSoin} className="h-5 w-5 text-brand-violet" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15.5px] font-semibold text-navy">{soin.typeSoin}</p>
        <p className="mt-0.5 text-[13.5px] text-navy/55">
          {decrireRecurrence(soin)} · {soin.heures.join(", ")}
        </p>
        <p className="mt-1 text-[12.5px] text-navy/40">
          Depuis le {formatDateFr(soin.dateDebut)}
          {soin.dateFin ? ` — jusqu'au ${formatDateFr(soin.dateFin)}` : ""}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-[10px] px-2.5 py-1 text-[11.5px] font-semibold ${
          actif ? "bg-teal/10 text-[#0E7E70]" : "bg-navy/5 text-navy/45"
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
  const [patient, soins] = await Promise.all([getPatient(supabase, id), getSoinsPrescrits(supabase, id)]);

  if (!patient) notFound();

  const actifs = soins.filter((soin) => soin.actif);
  const arretes = soins.filter((soin) => !soin.actif);

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10 sm:py-14">
        <EnTeteFichePatient
          patientId={patient.id}
          patientNom={patient.nomComplet}
          titre="Prescriptions"
          sousTitre="Soins prescrits, leur récurrence et leurs horaires."
        />

        <section>
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-navy/45">
            Soins actifs ({actifs.length})
          </p>
          {actifs.length > 0 ? (
            <div className="mt-3 flex flex-col gap-3">
              {actifs.map((soin) => (
                <CarteSoin key={soin.id} soin={soin} actif />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-[14.5px] text-navy/55">Aucun soin actif pour ce patient.</p>
          )}
        </section>

        {arretes.length > 0 && (
          <section>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-navy/45">
              Soins arrêtés ({arretes.length})
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {arretes.map((soin) => (
                <CarteSoin key={soin.id} soin={soin} actif={false} />
              ))}
            </div>
          </section>
        )}

        {(patient.noteSoin || patient.consignes || patient.allergies) && (
          <section className="rounded-[18px] border border-navy/10 bg-white p-6">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-brand-violet">
              Consignes liées aux soins
            </h2>
            <div className="mt-3 flex flex-col gap-3 text-[14.5px] leading-relaxed text-navy/80">
              {patient.allergies && (
                <p>
                  <span className="font-semibold text-navy">Allergies : </span>
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

        <p className="text-center text-[13px] text-navy/45">
          Les soins s&apos;ajoutent et s&apos;arrêtent depuis la fiche du patient.
        </p>
      </div>
    </main>
  );
}
