import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient, getUtilisateurConnecte } from "@/lib/supabase/server";
import { getMissionDetail, getPhotoUrl } from "@/lib/data/ma-journee";
import { getContexteTarifaire } from "@/lib/data/ngap";
import { calculerDetailPassage } from "@/lib/facturation";
import { formaterEuros } from "@/lib/cotation";
import { formaterNomPropre } from "@/lib/format";
import {
  updateConsignesAction,
  updateMissionStatutAction,
  updateRappelAction,
  updateDistanceAction,
} from "@/lib/data/ma-journee-actions";
import { Button } from "@/components/ui/Button";
import { FormulaireAvecRetour } from "@/components/ui/FormulaireAvecRetour";
import { ChampTransmission } from "@/components/ui/ChampTransmission";
import { ChampPhotoVisite } from "@/components/ui/ChampPhotoVisite";
import { Chronometre } from "@/components/ui/Chronometre";
import { IconeSoin } from "@/components/ui/IconeSoin";
import { LienRetour } from "@/components/ui/LienRetour";
import type { StatutMission } from "@/lib/types/clinical";

const STATUT_LABEL: Record<StatutMission, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  terminee: "Terminée",
  absent: "Absente",
};

const STATUT_BADGE_CLASSES: Record<StatutMission, string> = {
  a_faire: "border border-navy/15 text-navy/60",
  en_cours: "bg-brand-violet/[0.12] text-brand-violet",
  terminee: "bg-teal/10 text-[#0E7E70]",
  absent: "bg-danger/10 text-danger",
};

const PROCHAIN_STATUT: Partial<Record<StatutMission, StatutMission>> = {
  a_faire: "en_cours",
  en_cours: "terminee",
};

const LIBELLE_ACTION: Partial<Record<StatutMission, string>> = {
  a_faire: "Commencer le soin",
  en_cours: "Terminer le soin",
};

function initiales(nomComplet: string): string {
  return nomComplet
    .split(" ")
    .filter(Boolean)
    .map((mot) => mot[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatNaissance(dateNaissance: string): string {
  return new Date(dateNaissance).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

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

  // Le passage est coté ici comme il l'est dans la tournée : mêmes règles,
  // même zone tarifaire, donc les deux écrans ne peuvent pas diverger.
  const utilisateur = await getUtilisateurConnecte();
  const contexteTarifaire = utilisateur
    ? await getContexteTarifaire(supabase, utilisateur.id)
    : { zone: "metropole" as const, valeurs: new Map() };
  const detailFacturation = calculerDetailPassage(
    { ...mission, patientDateNaissance: mission.patient.dateNaissance },
    mission.dateTournee,
    contexteTarifaire
  );

  const photoUrl = mission.photoPath ? await getPhotoUrl(supabase, mission.photoPath) : null;
  const dernierePhotoUrl = mission.dernierePhotoPath
    ? await getPhotoUrl(supabase, mission.dernierePhotoPath)
    : null;

  const prochainStatut = PROCHAIN_STATUT[mission.statut];
  const peutMarquerAbsent = mission.statut === "a_faire";
  const peutEcrireTransmission = mission.statut === "en_cours" || mission.statut === "terminee";
  const enCours = mission.statut === "en_cours";
  const absente = mission.statut === "absent";
  const itineraireHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mission.patient.adresse)}`;

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto flex max-w-2xl flex-col gap-5 px-6 py-6 sm:py-10">
        <div className="flex items-center justify-between">
          <LienRetour href="/ma-journee" label="Ma journée" />
          {absente ? (
            <FormulaireAvecRetour action={updateMissionStatutAction} messageSucces="Passage mis à jour.">
              <input type="hidden" name="missionId" value={mission.id} />
              <input type="hidden" name="nouveauStatut" value="a_faire" />
              <button
                type="submit"
                className="rounded-full bg-danger/10 px-3.5 py-1.5 text-[12.5px] font-semibold text-danger"
              >
                Annuler l&apos;absence
              </button>
            </FormulaireAvecRetour>
          ) : (
            <span className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${STATUT_BADGE_CLASSES[mission.statut]}`}>
              {STATUT_LABEL[mission.statut]}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3.5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-violet to-purple-500 text-[17px] font-bold text-white shadow-[0_4px_12px_rgba(0,0,0,0.14)] ring-2 ring-white">
            {initiales(mission.patientNom)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <h1 className="font-display text-[26px] font-semibold tracking-tight">
                {formaterNomPropre(mission.patientNom)}
              </h1>
              {mission.patient.dateNaissance && (
                <span className="whitespace-nowrap text-[13.5px] text-navy/45">
                  {formatNaissance(mission.patient.dateNaissance)} · {calculerAge(mission.patient.dateNaissance)} ans
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[18px] border border-navy/[0.06] bg-white p-4 shadow-[0_8px_22px_rgba(80,50,140,0.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-navy/45">
            Acte prévu · {mission.heurePrevue.slice(0, 5)}
          </p>
          <div className="mt-2.5 flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-violet/10">
              <IconeSoin typeSoin={mission.typeSoin} className="h-6 w-6 text-brand-violet" />
            </span>
            <p className="font-display text-[19px] font-semibold tracking-tight">{mission.typeSoin}</p>
          </div>

          {/* Le détail coté du passage. Il figure sur la carte de tournée : le
              faire disparaître ici, sur la page où le soin se valide, obligeait
              à revenir en arrière pour savoir ce qui sera facturé. */}
          {mission.actes.length > 0 && (
            <div className="mt-3 border-t border-navy/[0.06] pt-3">
              <ul className="flex flex-col gap-1.5">
                {mission.actes.map((acte, index) => (
                  <li
                    key={`${acte.libelle}-${index}`}
                    className="flex items-baseline justify-between gap-3 text-[13.5px]"
                  >
                    <span className="min-w-0">
                      {acte.code && (
                        <span className="font-bold text-navy/80">{acte.code} </span>
                      )}
                      <span className="text-navy/60">{acte.libelle}</span>
                    </span>
                  </li>
                ))}
              </ul>

              {detailFacturation.total > 0 && (
                <p className="mt-3 flex items-baseline justify-between gap-3 text-[13px] text-navy/45">
                  <span>
                    {detailFacturation.majorations.total > 0
                      ? `dont ${formaterEuros(detailFacturation.majorations.total)} de majorations`
                      : "Facturable"}
                  </span>
                  <span className="font-bold tabular-nums text-navy/75">
                    {formaterEuros(detailFacturation.total)}
                  </span>
                </p>
              )}

              {/* Correction du kilométrage. La NGAP demande la distance
                  réellement parcourue : l'itinéraire calculé ignore le détour
                  par la pharmacie comme la route barrée. */}
              <FormulaireAvecRetour
                action={updateDistanceAction}
                messageSucces="Distance enregistrée."
                className="mt-3 flex flex-wrap items-center gap-2 border-t border-navy/[0.06] pt-3"
              >
                <input type="hidden" name="missionId" value={mission.id} />
                <label htmlFor="distanceKm" className="text-[13px] text-navy/45">
                  Trajet aller
                </label>
                <input
                  id="distanceKm"
                  name="distanceKm"
                  type="text"
                  inputMode="decimal"
                  defaultValue={mission.distanceKmCorrigee ?? ""}
                  placeholder={
                    mission.distanceKm !== null ? String(mission.distanceKm) : "—"
                  }
                  className="w-[74px] rounded-[10px] border border-navy/15 bg-white px-2.5 py-1.5 text-[13.5px] tabular-nums text-navy placeholder:text-navy/30 focus:border-brand-violet focus:outline-none focus:ring-2 focus:ring-brand-violet/25"
                />
                <span className="text-[13px] text-navy/45">km</span>
                <Button type="submit" variant="tertiary" className="!min-h-0 shrink-0 !px-0 !py-0">
                  Corriger
                </Button>
                {detailFacturation.majorations.kilometres > 0 && (
                  <span className="text-[12.5px] tabular-nums text-navy/40">
                    {formaterEuros(detailFacturation.majorations.kilometres)} d&apos;indemnités
                  </span>
                )}
              </FormulaireAvecRetour>
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          <a
            href={`tel:${mission.patient.telephone}`}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-navy/[0.06] bg-white py-3 text-center shadow-[0_1px_2px_rgba(15,23,42,.04)]"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[21px] w-[21px] text-brand-violet">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[11.5px] font-semibold text-brand-violet">Appeler</span>
          </a>
          <a
            href={itineraireHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-navy/[0.06] bg-white py-3 text-center shadow-[0_1px_2px_rgba(15,23,42,.04)]"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[21px] w-[21px] text-brand-violet">
              <polygon points="3 11 22 2 13 21 11 13 3 11" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[11.5px] font-semibold text-brand-violet">Itinéraire</span>
          </a>
          <a
            href={`sms:${mission.patient.telephone}`}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-navy/[0.06] bg-white py-3 text-center shadow-[0_1px_2px_rgba(15,23,42,.04)]"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[21px] w-[21px] text-brand-violet">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[11.5px] font-semibold text-brand-violet">SMS</span>
          </a>
          {peutMarquerAbsent ? (
            <FormulaireAvecRetour action={updateMissionStatutAction} messageSucces="Passage mis à jour.">
              <input type="hidden" name="missionId" value={mission.id} />
              <input type="hidden" name="nouveauStatut" value="absent" />
              <button
                type="submit"
                className="flex w-full flex-col items-center gap-1.5 rounded-2xl border border-navy/[0.06] bg-white py-3 text-center shadow-[0_1px_2px_rgba(15,23,42,.04)]"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[21px] w-[21px] text-danger">
                  <path d="M12 9v4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <path d="M12 17h.01" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
                <span className="text-[11.5px] font-semibold text-danger">Absence</span>
              </button>
            </FormulaireAvecRetour>
          ) : (
            <span className="flex flex-col items-center gap-1.5 rounded-2xl border border-navy/[0.06] bg-white py-3 text-center opacity-40 shadow-[0_1px_2px_rgba(15,23,42,.04)]">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[21px] w-[21px] text-navy/40">
                <path d="M12 9v4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                <path d="M12 17h.01" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
              <span className="text-[11.5px] font-semibold text-navy/40">Absence</span>
            </span>
          )}
        </div>

        {absente && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-danger/20 bg-danger/5 px-3.5 py-3">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[19px] w-[19px] shrink-0 text-danger">
              <path d="M12 9v4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M12 17h.01" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
            <p className="text-[14.5px] font-semibold leading-snug text-danger">
              Absent(e) — le patient n&apos;a pas pu être vu à l&apos;heure prévue.
            </p>
          </div>
        )}

        <div className="flex items-start gap-2.5 text-[15px] text-navy">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 h-[18px] w-[18px] shrink-0 text-navy/45">
            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
          {mission.patient.adresse}
        </div>

        {mission.patient.allergies && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-danger/20 bg-danger/5 px-3.5 py-3">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-danger">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 9v4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M12 17h.01" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
            <p className="text-[14.5px] font-semibold text-danger">{mission.patient.allergies}</p>
          </div>
        )}

        {mission.dernierRappel && (
          <div className="rounded-2xl border border-warning/25 bg-warning/5 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-warning">
              Rappel de la dernière visite
            </p>
            <p className="mt-1 text-[14.5px] text-navy">{mission.dernierRappel}</p>
          </div>
        )}

        {mission.derniereTransmission && (
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-navy/45">
              Dernière transmission
            </p>
            <p className="mt-1 text-[14.5px] text-navy">{mission.derniereTransmission}</p>
          </div>
        )}

        {dernierePhotoUrl && (
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-navy/45">Dernière photo</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- URL signée à courte durée de vie, incompatible avec le cache de next/image */}
            <img src={dernierePhotoUrl} alt="Photo de la visite précédente" className="mt-2 max-w-full rounded-xl" />
          </div>
        )}

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-navy/45">Soins de la visite</p>
          <div className="mt-2 flex items-center gap-2.5 rounded-2xl border border-navy/[0.06] bg-white px-3.5 py-3">
            <IconeSoin typeSoin={mission.typeSoin} className="h-[18px] w-[18px] shrink-0 text-navy/45" />
            <p className="text-[15.5px] font-semibold tracking-tight">{mission.typeSoin}</p>
            <span className="ml-auto text-[12px] text-navy/35">prescrit</span>
          </div>
        </div>

        {enCours && <Chronometre />}

        <div className="rounded-2xl border border-navy/[0.06] bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-navy/45">Consignes</p>
          <FormulaireAvecRetour action={updateConsignesAction} messageSucces="Consignes enregistrées." className="mt-2 flex flex-col gap-3">
            <input type="hidden" name="missionId" value={mission.id} />
            <textarea
              name="consignes"
              defaultValue={mission.patient.consignes ?? ""}
              rows={3}
              className="rounded-[12px] border border-navy/10 bg-[#F6F7F5] p-3 text-[15px] text-navy"
            />
            <Button type="submit" variant="tertiary" className="self-start !min-h-0 !px-0 !py-0">
              Enregistrer
            </Button>
          </FormulaireAvecRetour>
        </div>

        {peutEcrireTransmission && (
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-navy/45">
              Transmission de cette visite
            </p>
            <ChampTransmission missionId={mission.id} transmission={mission.transmission} />
          </div>
        )}

        {peutEcrireTransmission && (
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-navy/45">
              Rappel pour la prochaine visite
            </p>
            <FormulaireAvecRetour action={updateRappelAction} messageSucces="Rappel enregistré." className="mt-2 flex flex-col gap-3">
              <input type="hidden" name="missionId" value={mission.id} />
              <textarea
                name="rappel"
                defaultValue={mission.rappel ?? ""}
                rows={3}
                className="rounded-[12px] border border-navy/10 bg-[#F6F7F5] p-3 text-[15px] text-navy"
              />
              <Button type="submit" variant="tertiary" className="self-start !min-h-0 !px-0 !py-0">
                Enregistrer
              </Button>
            </FormulaireAvecRetour>
          </div>
        )}

        {peutEcrireTransmission && (
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-navy/45">
              Photo de cette visite
            </p>
            {photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- URL signée à courte durée de vie, incompatible avec le cache de next/image
              <img src={photoUrl} alt="Photo envoyée pour cette visite" className="mt-2 max-w-full rounded-xl" />
            )}
            <ChampPhotoVisite missionId={mission.id} />
          </div>
        )}

        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-navy/45">
            Dossier du patient
          </p>
          <Link
            href={`/patients/${mission.patient.id}`}
            className="row-lift flex items-center justify-between rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)]"
          >
            <span className="text-[15px] font-semibold text-navy">Voir la fiche du patient</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[19px] w-[19px] shrink-0 text-navy/25">
              <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>

        {prochainStatut ? (
          <FormulaireAvecRetour action={updateMissionStatutAction} messageSucces="Passage mis à jour.">
            <input type="hidden" name="missionId" value={mission.id} />
            <input type="hidden" name="nouveauStatut" value={prochainStatut} />
            <button
              type="submit"
              className="w-full rounded-full bg-gradient-to-r from-brand-violet to-purple-500 py-4 text-[17px] font-semibold tracking-tight text-white shadow-[0_8px_20px_rgba(124,58,237,0.32)]"
            >
              {LIBELLE_ACTION[mission.statut]}
            </button>
          </FormulaireAvecRetour>
        ) : (
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-4">
            {mission.prochaineMission ? (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-navy/45">
                  Patient suivant
                </p>
                <p className="mt-1 text-[15px] text-navy">
                  {formaterNomPropre(mission.prochaineMission.patientNom)} ·{" "}
                  {mission.prochaineMission.heurePrevue.slice(0, 5)}
                </p>
                <Link href={`/ma-journee/${mission.prochaineMission.id}`} className="mt-3 inline-block">
                  <Button variant="primary">Voir la fiche</Button>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Image
                  src="/marketing/ely-accompagnement-portrait.png"
                  alt=""
                  width={200}
                  height={200}
                  className="h-16 w-16 shrink-0 object-contain"
                />
                <p className="text-navy/60">Aucun autre patient à voir aujourd&apos;hui.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
