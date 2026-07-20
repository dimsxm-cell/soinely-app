import Link from "next/link";
import type { MissionDuJour, StatutMission } from "@/lib/types/clinical";
import { updateMissionStatutAction } from "@/lib/data/ma-journee-actions";

const STATUT_LABEL: Record<MissionDuJour["statut"], string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  terminee: "Terminée",
  absent: "Absente",
};

const STATUT_CLASSES: Record<MissionDuJour["statut"], string> = {
  a_faire: "bg-navy/5 text-navy/60",
  en_cours: "bg-warning/15 text-warning",
  terminee: "bg-teal/10 text-[#0E7E70]",
  absent: "bg-navy/5 text-navy/40",
};

const PROCHAIN_STATUT: Partial<Record<StatutMission, StatutMission>> = {
  a_faire: "en_cours",
  en_cours: "terminee",
};

const LIBELLE_ACTION: Partial<Record<StatutMission, string>> = {
  a_faire: "Démarrer",
  en_cours: "Terminer",
};

interface CarteMissionProps {
  mission: MissionDuJour;
  contexteHref?: string;
}

export function CarteMission({ mission, contexteHref }: CarteMissionProps) {
  const prochainStatut = PROCHAIN_STATUT[mission.statut];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-navy/10 bg-white p-4">
      <Link href={`/ma-journee/${mission.id}`} className="min-w-0 flex-1 hover:opacity-80">
        <p className="font-semibold text-navy">{mission.patientNom}</p>
        <p className="text-sm text-navy/60">
          {mission.typeSoin} · <span className="tabular-nums">{mission.heurePrevue}</span>
        </p>
      </Link>
      <div className="flex items-center gap-3">
        {contexteHref && (
          <Link href={contexteHref} className="text-sm font-semibold text-brand-violet hover:underline">
            Contexte clinique
          </Link>
        )}
        <span
          className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${STATUT_CLASSES[mission.statut]}`}
        >
          {STATUT_LABEL[mission.statut]}
        </span>
        {prochainStatut && (
          <form action={updateMissionStatutAction}>
            <input type="hidden" name="missionId" value={mission.id} />
            <input type="hidden" name="nouveauStatut" value={prochainStatut} />
            <button
              type="submit"
              className="rounded-full bg-gradient-to-r from-brand-violet to-brand-rose px-4 py-2 text-sm font-semibold text-white transition-colors hover:brightness-110"
            >
              {LIBELLE_ACTION[mission.statut]}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
