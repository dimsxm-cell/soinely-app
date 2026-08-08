import { FormulaireAvecRetour } from "@/components/ui/FormulaireAvecRetour";
import Link from "next/link";
import { IconeSoin } from "@/components/ui/IconeSoin";
import type { MissionTourneeVue } from "@/lib/data/ma-journee";
import { updateMissionStatutAction, updateMotifAbsenceAction } from "@/lib/data/ma-journee-actions";
import { formaterNomPropre } from "@/lib/format";
import { calculerDetailPassage } from "@/lib/facturation";
import { formaterEuros, type ContexteTarifaire } from "@/lib/cotation";
import { hrefWaze } from "@/lib/waze";
import { STATUT_LABEL, calculerAge, formatHeure, getInitiales } from "@/lib/tournee-vue";

const CLASSES_CHIP =
  "inline-flex items-center gap-1.5 rounded-[8px] bg-[#faf9fc] border border-[#ece8f2] px-2.5 py-1 text-[12px] font-medium text-[#3b3648]";

const STATUT_BADGE_VIOLET: Record<MissionTourneeVue["statut"], string> = {
  a_faire: "text-[#8d8798] bg-[rgba(141,135,152,.1)]",
  en_cours: "text-[#6d28d9] bg-[rgba(109,40,217,.11)] font-bold",
  terminee: "text-[#1a7f5a] bg-[rgba(26,127,90,.11)] font-semibold",
  absent: "text-[#c2410c] bg-[rgba(194,65,12,.11)] font-semibold",
};

interface CarteMissionTourneeProps {
  mission: MissionTourneeVue;
  contexteHref?: string;
  estDerniere: boolean;
  /** Date de la tournée, dont dépendent les majorations dimanche et fériés. */
  dateTournee: string;
  contexteTarifaire: ContexteTarifaire;
}

export function CarteMissionTournee({
  mission,
  contexteHref,
  estDerniere,
  dateTournee,
  contexteTarifaire,
}: CarteMissionTourneeProps) {
  const detail = calculerDetailPassage(mission, dateTournee, contexteTarifaire);
  const age = calculerAge(mission.patientDateNaissance);
  const initiales = getInitiales(mission.patientNom);
  const heure = formatHeure(mission.heurePrevue);
  const enCours = mission.statut === "en_cours";
  const aFaire = mission.statut === "a_faire";
  const terminee = mission.statut === "terminee";
  const absent = mission.statut === "absent";
  const nomFormate = formaterNomPropre(mission.patientNom);
  const wazeUrl = hrefWaze({ latitude: null, longitude: null, adresse: mission.patientAdresse });
  const telUrl = `tel:${mission.patientTelephone.replace(/\s/g, "")}`;

  return (
    <div id={`stop-${mission.id}`} className="flex gap-2.5">
      {/* Colonne timeline */}
      <div className="relative flex w-[46px] shrink-0 flex-col items-end pt-4 text-right">
        <span className={`text-[14px] font-bold tabular-nums ${enCours ? "text-[#6d28d9]" : terminee || absent ? "text-[#a099b3]" : "text-[#3b3648]"}`}>
          {heure}
        </span>
        {mission.dureeEstimeeMin > 0 && (
          <span className="mt-0.5 text-[10px] font-bold tabular-nums text-[#a099b3]">{mission.dureeEstimeeMin} min</span>
        )}
        {!estDerniere && (
          <span
            aria-hidden="true"
            className={`mt-2 min-h-4 w-[2px] flex-1 rounded-full ${terminee || absent ? "bg-[#e0dbe8]" : "bg-[rgba(109,40,217,.2)]"}`}
          />
        )}
      </div>

      {/* Carte blanche */}
      <div
        className={`mb-3 flex-1 overflow-hidden rounded-[20px] bg-white ${
          enCours ? "border-[1.5px] border-[#6d28d9]" : "border border-[#e6e2db]"
        }`}
      >
        <div className={`flex items-start gap-2.5 px-4 py-3.5 ${terminee || absent ? "opacity-70" : ""}`}>
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] text-[14px] font-bold ${
              enCours ? "bg-[linear-gradient(140deg,#a855f7,#6d28d9)] text-white" : "bg-[rgba(109,40,217,.1)] text-[#6d28d9]"
            }`}
            aria-hidden="true"
          >
            {initiales}
          </div>

          <div className="min-w-0 flex-1">
            <Link href={`/ma-journee/${mission.id}`} className="flex items-baseline gap-1.5 hover:opacity-75">
              <span className="text-[15px] font-bold tracking-tight text-[#1d1d1f]">{nomFormate}</span>
              {age !== null && <span className="text-[11px] font-bold text-[#a099b3]">{age} a</span>}
            </Link>
            {mission.patientAdresse && (
              <p className="mt-0.5 truncate text-[11.5px] text-[#8d8798]">{mission.patientAdresse}</p>
            )}
          </div>

          <span className={`shrink-0 rounded-[8px] px-2.5 py-1 text-[10.5px] ${STATUT_BADGE_VIOLET[mission.statut]}`}>
            {STATUT_LABEL[mission.statut]}
          </span>
        </div>

        <div className={`border-t border-[#ece8f2] px-4 py-3 ${terminee || absent ? "opacity-70" : ""}`}>
          <div className="flex flex-wrap gap-1.5">
            {mission.actes.length > 0 ? (
              mission.actes.map((acte, index) => (
                <span key={`${acte.libelle}-${index}`} className={CLASSES_CHIP}>
                  {acte.code ? (
                    <span className="font-bold text-[#3b3648]">{acte.code}</span>
                  ) : (
                    <IconeSoin typeSoin={acte.libelle} className="h-3.5 w-3.5 text-[#6d28d9]" />
                  )}
                  {acte.libelle}
                </span>
              ))
            ) : (
              <span className={CLASSES_CHIP}>
                <IconeSoin typeSoin={mission.typeSoin} className="h-3.5 w-3.5 text-[#6d28d9]" />
                {mission.typeSoin}
              </span>
            )}
          </div>

          {detail.total > 0 && (
            <p className="mt-2.5 text-right text-[12px] text-[#8d8798]">
              {detail.majorations.total > 0 && (
                <span>dont {formaterEuros(detail.majorations.total)} de majorations · </span>
              )}
              <span className="font-bold tabular-nums text-[#3b3648]">{formaterEuros(detail.total)}</span>
            </p>
          )}

          {mission.patientAllergies && (
            <div className="mt-2.5 flex items-start gap-2 rounded-[12px] bg-[rgba(214,64,44,.09)] px-3 py-2">
              <svg width="13" height="13" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" className="mt-0.5 shrink-0" style={{ stroke: "#d6402c", fill: "none" }} aria-hidden="true">
                <path d="M12 3 2.5 20h19L12 3Z" />
                <path d="M12 9.5v4.5" />
                <path d="M12 17h.01" />
              </svg>
              <p className="text-[12.5px] font-medium text-[#a4271b]">{mission.patientAllergies}</p>
            </div>
          )}

          {contexteHref && (
            <Link href={contexteHref} className="mt-2 inline-flex text-[12.5px] font-semibold text-[#6d28d9] hover:underline">
              Voir contexte clinique →
            </Link>
          )}
        </div>

        {(aFaire || enCours) && (
          <div className="border-t border-[#ece8f2] px-4 py-3">
            {enCours ? (
              <div className="flex gap-2">
                <a
                  href={wazeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[13px] border border-[#e4e0ea] bg-[#faf9fc] py-2.5 text-[13px] font-semibold text-[#3b3648]"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <polygon points="3 11 22 2 13 21 11 13 3 11" />
                  </svg>
                  GPS
                </a>
                <a
                  href={telUrl}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[13px] border border-[#e4e0ea] bg-[#faf9fc] py-2.5 text-[13px] font-semibold text-[#3b3648]"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92Z" />
                  </svg>
                  Appeler
                </a>
                <FormulaireAvecRetour action={updateMissionStatutAction} messageSucces="Passage mis à jour." className="flex-1">
                  <input type="hidden" name="missionId" value={mission.id} />
                  <input type="hidden" name="nouveauStatut" value="terminee" />
                  <button
                    type="submit"
                    className="w-full rounded-[13px] bg-[linear-gradient(135deg,#6d28d9,#a855f7)] py-2.5 text-[13px] font-bold text-white shadow-[0_8px_20px_-8px_rgba(109,40,217,.8)]"
                  >
                    ✓ Valider
                  </button>
                </FormulaireAvecRetour>
              </div>
            ) : (
              <div className="flex gap-2">
                <FormulaireAvecRetour action={updateMissionStatutAction} messageSucces="Passage mis à jour." className="flex-1">
                  <input type="hidden" name="missionId" value={mission.id} />
                  <input type="hidden" name="nouveauStatut" value="en_cours" />
                  <button
                    type="submit"
                    className="w-full rounded-[13px] border border-[rgba(109,40,217,.28)] bg-[rgba(109,40,217,.07)] py-2.5 text-[13px] font-bold text-[#6d28d9]"
                  >
                    Valider le soin
                  </button>
                </FormulaireAvecRetour>
                <FormulaireAvecRetour action={updateMissionStatutAction} messageSucces="Passage mis à jour.">
                  <input type="hidden" name="missionId" value={mission.id} />
                  <input type="hidden" name="nouveauStatut" value="absent" />
                  <button
                    type="submit"
                    className="rounded-[13px] border border-[#e4e0ea] bg-[#faf9fc] px-4 py-2.5 text-[13px] font-semibold text-[#8d8798]"
                  >
                    Absent
                  </button>
                </FormulaireAvecRetour>
              </div>
            )}
          </div>
        )}

        {terminee && (
          <div className="border-t border-[#ece8f2] px-4 py-3">
            <FormulaireAvecRetour action={updateMissionStatutAction} messageSucces="Passage mis à jour.">
              <input type="hidden" name="missionId" value={mission.id} />
              <input type="hidden" name="nouveauStatut" value="a_faire" />
              <button
                type="submit"
                className="rounded-[13px] border border-[#e4e0ea] bg-[#faf9fc] px-4 py-2.5 text-[13px] font-semibold text-[#8d8798]"
              >
                Annuler la validation
              </button>
            </FormulaireAvecRetour>
          </div>
        )}

        {absent && (
          <div className="border-t border-[#ece8f2] px-4 py-3">
            {mission.motifAbsence && (
              <div className="mb-2.5 flex items-start gap-2 rounded-[12px] bg-amber-50 px-3 py-2">
                <span className="mt-px shrink-0 text-[13px]" aria-hidden="true">
                  ⚠️
                </span>
                <p className="text-[12.5px] font-medium text-amber-700">{mission.motifAbsence}</p>
              </div>
            )}

            <FormulaireAvecRetour action={updateMotifAbsenceAction} messageSucces="Motif enregistré." className="flex min-w-0 gap-2">
              <input type="hidden" name="missionId" value={mission.id} />
              <label className="sr-only" htmlFor={`motif-${mission.id}`}>
                Motif de l&apos;absence de {nomFormate}
              </label>
              <input
                id={`motif-${mission.id}`}
                name="motif"
                type="text"
                defaultValue={mission.motifAbsence ?? ""}
                placeholder="Motif (facultatif)"
                maxLength={120}
                className="min-w-0 flex-1 rounded-[13px] border border-[#e4e0ea] px-3 py-2 text-[13px] text-[#1d1d1f] placeholder:text-[#a099b3]"
              />
              <button
                type="submit"
                className="shrink-0 rounded-[13px] border border-[#e4e0ea] bg-[#faf9fc] px-3 py-2 text-[13px] font-semibold text-[#8d8798]"
              >
                Enregistrer
              </button>
            </FormulaireAvecRetour>

            <FormulaireAvecRetour action={updateMissionStatutAction} messageSucces="Passage mis à jour." className="mt-2">
              <input type="hidden" name="missionId" value={mission.id} />
              <input type="hidden" name="nouveauStatut" value="a_faire" />
              <button
                type="submit"
                className="rounded-[13px] border border-[#e4e0ea] bg-[#faf9fc] px-4 py-2.5 text-[13px] font-semibold text-[#8d8798]"
              >
                Annuler l&apos;absence
              </button>
            </FormulaireAvecRetour>
          </div>
        )}

        {mission.patientConsignes && (
          <div className="border-t border-dashed border-[#e6e2db] px-4 py-2.5">
            <p className="text-[12.5px] leading-relaxed text-[#6e6880]">{mission.patientConsignes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
