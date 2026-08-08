import { FormulaireAvecRetour } from "@/components/ui/FormulaireAvecRetour";
import Link from "next/link";
import type { MissionDuJour, StatutMission } from "@/lib/types/clinical";
import { updateMissionStatutAction } from "@/lib/data/ma-journee-actions";
import { formaterNomPropre } from "@/lib/format";
import { IconeSoin } from "@/components/ui/IconeSoin";

const STATUT_LABEL: Record<MissionDuJour["statut"], string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  terminee: "Terminée",
  absent: "Absente",
};

const STATUT_CLASSES: Record<MissionDuJour["statut"], string> = {
  a_faire: "text-[#8d8798] bg-[rgba(141,135,152,.1)]",
  en_cours: "text-[#6d28d9] bg-[rgba(109,40,217,.11)] font-bold",
  terminee: "text-[#1a7f5a] bg-[rgba(26,127,90,.11)] font-semibold",
  absent: "text-[#c2410c] bg-[rgba(194,65,12,.11)] font-semibold",
};

const DOT_CLASSES: Record<MissionDuJour["statut"], string> = {
  a_faire: "bg-[rgba(109,40,217,.5)]",
  en_cours: "bg-[#6d28d9] shadow-[0_0_0_4px_rgba(109,40,217,.2)]",
  terminee: "bg-[#1a7f5a]",
  absent: "bg-navy/20",
};

const PROCHAIN_STATUT: Partial<Record<StatutMission, StatutMission>> = {
  a_faire: "en_cours",
  en_cours: "terminee",
};

const LIBELLE_ACTION: Partial<Record<StatutMission, string>> = {
  a_faire: "Démarrer",
  en_cours: "Terminer",
};

const BOUTON_CLASSES: Partial<Record<StatutMission, string>> = {
  a_faire: "bg-[linear-gradient(135deg,#6d28d9,#a855f7)] shadow-[0_4px_12px_rgba(109,40,217,.3)]",
  en_cours: "bg-[#1a7f5a] shadow-[0_4px_12px_rgba(26,127,55,.28)]",
};

interface CarteMissionProps {
  mission: MissionDuJour;
  contexteHref?: string;
  estDerniere?: boolean;
}

export function CarteMission({ mission, contexteHref, estDerniere }: CarteMissionProps) {
  const prochainStatut = PROCHAIN_STATUT[mission.statut];
  const heureAffichee = mission.heurePrevue.slice(0, 5);
  const enCours = mission.statut === "en_cours";
  const terminee = mission.statut === "terminee";

  return (
    <div className="flex items-stretch gap-2.5">
      <div className="relative flex w-9 shrink-0 flex-col items-center gap-1.5 pt-3.5">
        {!estDerniere && (
          <span aria-hidden="true" className="absolute left-1/2 top-[30px] bottom-[-12px] w-px -translate-x-1/2 bg-navy/12" />
        )}
        <span className="whitespace-nowrap text-[11px] font-bold tabular-nums text-navy/45">{heureAffichee}</span>
        <span
          aria-hidden="true"
          className={`relative z-10 h-3 w-3 rounded-full ring-4 ring-[#F6F7F5] ${DOT_CLASSES[mission.statut]}`}
        />
        {mission.ordreVisite != null && (
          <span
            aria-label={`Ordre de passage suggéré : ${mission.ordreVisite}`}
            className="relative z-10 flex h-4 w-4 items-center justify-center rounded-full bg-[#6d28d9] text-[9px] font-bold text-white"
          >
            {mission.ordreVisite}
          </span>
        )}
      </div>

      <div
        className={`flex flex-1 flex-col gap-3 rounded-2xl border bg-white p-3.5 sm:flex-row sm:items-center ${
          enCours
            ? "border-[1.5px] border-[#6d28d9] shadow-[0_6px_18px_rgba(109,40,217,.18)]"
            : "border-navy/[0.06] shadow-[0_1px_2px_rgba(15,23,42,.04)]"
        } ${terminee ? "opacity-70" : ""}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            aria-hidden="true"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${
              enCours
                ? "bg-[linear-gradient(140deg,#a855f7,#6d28d9)] text-white"
                : terminee
                  ? "bg-[rgba(109,40,217,.06)] text-[#6d28d9]"
                  : "bg-[rgba(109,40,217,.12)] text-[#6d28d9]"
            }`}
          >
            <IconeSoin typeSoin={mission.typeSoin} className="h-5 w-5" />
          </span>

          <Link href={`/ma-journee/${mission.id}`} className="min-w-0 flex-1 hover:opacity-80">
            <p className={`font-semibold ${terminee ? "text-navy/50" : "text-navy"}`}>
              {formaterNomPropre(mission.patientNom)}
            </p>
            <p className="text-sm text-navy/50">{mission.typeSoin}</p>
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0 sm:flex-nowrap sm:justify-end">
          {contexteHref && (
            <Link href={contexteHref} className="text-sm font-semibold text-[#6d28d9] hover:underline">
              Contexte clinique
            </Link>
          )}
          <span className={`rounded-[10px] px-2.5 py-1 text-[11.5px] font-semibold ${STATUT_CLASSES[mission.statut]}`}>
            {STATUT_LABEL[mission.statut]}
          </span>
          {prochainStatut && (
            <FormulaireAvecRetour action={updateMissionStatutAction} messageSucces="Passage mis à jour.">
              <input type="hidden" name="missionId" value={mission.id} />
              <input type="hidden" name="nouveauStatut" value={prochainStatut} />
              <button
                type="submit"
                className={`btn-glace rounded-[12px] px-4 py-2 text-sm font-semibold text-white ${BOUTON_CLASSES[mission.statut]}`}
              >
                {LIBELLE_ACTION[mission.statut]}
              </button>
            </FormulaireAvecRetour>
          )}
        </div>
      </div>
    </div>
  );
}
