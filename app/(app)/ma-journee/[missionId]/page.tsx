import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMissionDetail, getPhotoUrl } from "@/lib/data/ma-journee";
import {
  updateConsignesAction,
  updateMissionStatutAction,
  updateRappelAction,
  updateTransmissionAction,
  uploadPhotoAction,
} from "@/lib/data/ma-journee-actions";
import { Button } from "@/components/ui/Button";
import type { StatutMission } from "@/lib/types/clinical";

const STATUT_LABEL: Record<StatutMission, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  terminee: "Terminée",
  absent: "Absente",
};

const PROCHAIN_STATUT: Partial<Record<StatutMission, StatutMission>> = {
  a_faire: "en_cours",
  en_cours: "terminee",
};

const LIBELLE_ACTION: Partial<Record<StatutMission, string>> = {
  a_faire: "Commencer le soin",
  en_cours: "Terminer",
};

function calculerAge(dateNaissance: string): number {
  const naissance = new Date(dateNaissance);
  const aujourdHui = new Date();
  let age = aujourdHui.getFullYear() - naissance.getFullYear();
  const anniversairePasse =
    aujourdHui.getMonth() > naissance.getMonth() ||
    (aujourdHui.getMonth() === naissance.getMonth() && aujourdHui.getDate() >= naissance.getDate());
  if (!anniversairePasse) age -= 1;
  return age;
}

export default async function ArriveePatientPage({
  params,
}: {
  params: Promise<{ missionId: string }>;
}) {
  const { missionId } = await params;
  const supabase = await createClient();
  const mission = await getMissionDetail(supabase, missionId);

  if (!mission) notFound();

  const photoUrl = mission.photoPath ? await getPhotoUrl(supabase, mission.photoPath) : null;
  const dernierePhotoUrl = mission.dernierePhotoPath
    ? await getPhotoUrl(supabase, mission.dernierePhotoPath)
    : null;

  const prochainStatut = PROCHAIN_STATUT[mission.statut];
  const peutMarquerAbsent = mission.statut === "a_faire";
  const peutEcrireTransmission = mission.statut === "en_cours" || mission.statut === "terminee";
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
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-semibold text-navy">{mission.patientNom}</h1>
          {mission.patient.dateNaissance && (
            <span className="text-sm text-navy/60">{calculerAge(mission.patient.dateNaissance)} ans</span>
          )}
        </div>
        <p className="mt-1 text-navy/60">{mission.heurePrevue}</p>
      </div>

      <div className="flex gap-3">
        <a href={`tel:${mission.patient.telephone}`} className="flex-1">
          <Button variant="secondary" className="w-full">
            Appeler
          </Button>
        </a>
        <a href={`sms:${mission.patient.telephone}`} className="flex-1">
          <Button variant="secondary" className="w-full">
            SMS
          </Button>
        </a>
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

      {mission.dernierRappel && (
        <section className="rounded-card border border-warning/30 bg-warning/5 p-6">
          <p className="text-xs font-medium uppercase text-warning">Rappel de la dernière visite</p>
          <p className="mt-1 text-navy">{mission.dernierRappel}</p>
        </section>
      )}

      {mission.derniereTransmission && (
        <section className="rounded-card border border-navy/10 bg-navy/5 p-6">
          <p className="text-xs font-medium uppercase text-navy/60">Dernière transmission</p>
          <p className="mt-1 text-navy">{mission.derniereTransmission}</p>
        </section>
      )}

      {dernierePhotoUrl && (
        <section className="rounded-card border border-navy/10 bg-navy/5 p-6">
          <p className="text-xs font-medium uppercase text-navy/60">Dernière photo</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- URL signée à courte durée de vie, incompatible avec le cache de next/image */}
          <img
            src={dernierePhotoUrl}
            alt="Photo de la visite précédente"
            className="mt-2 max-w-full rounded-card"
          />
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

      {peutEcrireTransmission && (
        <section className="rounded-card border border-navy/10 bg-white p-6">
          <p className="text-xs font-medium uppercase text-navy/60">Transmission de cette visite</p>
          <form action={updateTransmissionAction} className="mt-2 flex flex-col gap-3">
            <input type="hidden" name="missionId" value={mission.id} />
            <textarea
              name="transmission"
              defaultValue={mission.transmission ?? ""}
              rows={3}
              className="rounded-card border border-navy/10 p-3 text-navy"
            />
            <Button type="submit" variant="tertiary" className="self-start">
              Enregistrer
            </Button>
          </form>
        </section>
      )}

      {peutEcrireTransmission && (
        <section className="rounded-card border border-navy/10 bg-white p-6">
          <p className="text-xs font-medium uppercase text-navy/60">Rappel pour la prochaine visite</p>
          <form action={updateRappelAction} className="mt-2 flex flex-col gap-3">
            <input type="hidden" name="missionId" value={mission.id} />
            <textarea
              name="rappel"
              defaultValue={mission.rappel ?? ""}
              rows={3}
              className="rounded-card border border-navy/10 p-3 text-navy"
            />
            <Button type="submit" variant="tertiary" className="self-start">
              Enregistrer
            </Button>
          </form>
        </section>
      )}

      {peutEcrireTransmission && (
        <section className="rounded-card border border-navy/10 bg-white p-6">
          <p className="text-xs font-medium uppercase text-navy/60">Photo de cette visite</p>
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- URL signée à courte durée de vie, incompatible avec le cache de next/image
            <img
              src={photoUrl}
              alt="Photo envoyée pour cette visite"
              className="mt-2 max-w-full rounded-card"
            />
          )}
          <form action={uploadPhotoAction} className="mt-2 flex flex-col gap-3">
            <input type="hidden" name="missionId" value={mission.id} />
            <input type="file" name="photo" accept="image/*" capture="environment" />
            <Button type="submit" variant="tertiary" className="self-start">
              Envoyer
            </Button>
          </form>
        </section>
      )}

      {prochainStatut ? (
        <div className="flex gap-3">
          {peutMarquerAbsent && (
            <form action={updateMissionStatutAction} className="flex-1">
              <input type="hidden" name="missionId" value={mission.id} />
              <input type="hidden" name="nouveauStatut" value="absent" />
              <Button type="submit" variant="secondary" className="w-full">
                Absence
              </Button>
            </form>
          )}
          <form action={updateMissionStatutAction} className="flex-1">
            <input type="hidden" name="missionId" value={mission.id} />
            <input type="hidden" name="nouveauStatut" value={prochainStatut} />
            <Button type="submit" variant="primary" className="w-full">
              {LIBELLE_ACTION[mission.statut]}
            </Button>
          </form>
        </div>
      ) : (
        <section className="rounded-card border border-navy/10 bg-white p-6">
          {mission.prochaineMission ? (
            <>
              <p className="text-xs font-medium uppercase text-navy/60">Patient suivant</p>
              <p className="mt-1 text-navy">
                {mission.prochaineMission.patientNom} · {mission.prochaineMission.heurePrevue}
              </p>
              <Link href={`/ma-journee/${mission.prochaineMission.id}`} className="mt-3 inline-block">
                <Button variant="primary">Voir la fiche</Button>
              </Link>
            </>
          ) : (
            <p className="text-navy/60">Aucun autre patient à voir aujourd&apos;hui.</p>
          )}
        </section>
      )}
    </main>
  );
}
