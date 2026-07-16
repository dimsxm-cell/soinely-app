import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMissionDetail } from "@/lib/data/ma-journee";
import { updateConsignesAction, updateMissionStatutAction } from "@/lib/data/ma-journee-actions";
import { Button } from "@/components/ui/Button";
import type { StatutMission } from "@/lib/types/clinical";

const STATUT_LABEL: Record<StatutMission, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  terminee: "Terminée",
};

const PROCHAIN_STATUT: Partial<Record<StatutMission, StatutMission>> = {
  a_faire: "en_cours",
  en_cours: "terminee",
};

const LIBELLE_ACTION: Partial<Record<StatutMission, string>> = {
  a_faire: "Commencer le soin",
  en_cours: "Terminer",
};

export default async function ArriveePatientPage({
  params,
}: {
  params: Promise<{ missionId: string }>;
}) {
  const { missionId } = await params;
  const supabase = await createClient();
  const mission = await getMissionDetail(supabase, missionId);

  if (!mission) notFound();

  const prochainStatut = PROCHAIN_STATUT[mission.statut];
  const itineraireHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mission.patient.adresse)}`;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <Link href="/ma-journee" className="text-primary hover:underline">
          ‹ Ma journée
        </Link>
        <span className="rounded-full bg-navy/5 px-3 py-1 text-xs font-medium text-navy">
          {STATUT_LABEL[mission.statut]}
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-navy">{mission.patientNom}</h1>
        <p className="mt-1 text-navy/60">{mission.heurePrevue}</p>
      </div>

      <div className="rounded-card border border-navy/10 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase text-navy/60">Adresse</p>
            <p className="mt-1 text-navy">{mission.patient.adresse}</p>
          </div>
          <a href={itineraireHref} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary">Itinéraire</Button>
          </a>
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium uppercase text-navy/60">Téléphone</p>
          <p className="mt-1 text-navy">{mission.patient.telephone}</p>
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium uppercase text-navy/60">Acte prévu</p>
          <p className="mt-1 text-navy">{mission.typeSoin}</p>
        </div>
      </div>

      {mission.patient.allergies && (
        <section className="rounded-card border border-danger/30 bg-danger/5 p-6">
          <p className="text-xs font-medium uppercase text-danger">Allergie</p>
          <p className="mt-1 text-navy">{mission.patient.allergies}</p>
        </section>
      )}

      <section className="rounded-card border border-navy/10 bg-white p-6">
        <p className="text-xs font-medium uppercase text-navy/60">Consignes</p>
        <form action={updateConsignesAction} className="mt-2 flex flex-col gap-3">
          <input type="hidden" name="missionId" value={mission.id} />
          <textarea
            name="consignes"
            defaultValue={mission.patient.consignes ?? ""}
            rows={3}
            className="rounded-card border border-navy/10 p-3 text-navy"
          />
          <Button type="submit" variant="tertiary" className="self-start">
            Enregistrer
          </Button>
        </form>
      </section>

      {prochainStatut && (
        <form action={updateMissionStatutAction}>
          <input type="hidden" name="missionId" value={mission.id} />
          <input type="hidden" name="nouveauStatut" value={prochainStatut} />
          <Button type="submit" variant="primary" className="w-full">
            {LIBELLE_ACTION[mission.statut]}
          </Button>
        </form>
      )}
    </main>
  );
}
