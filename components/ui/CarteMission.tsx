import type { MissionDuJour } from "@/lib/types/clinical";

const STATUT_LABEL: Record<MissionDuJour["statut"], string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  terminee: "Terminée",
};

const STATUT_CLASSES: Record<MissionDuJour["statut"], string> = {
  a_faire: "bg-navy/5 text-navy",
  en_cours: "bg-warning/10 text-warning",
  terminee: "bg-success/10 text-success",
};

export function CarteMission({ mission }: { mission: MissionDuJour }) {
  return (
    <div className="flex items-center justify-between rounded-card border border-navy/10 bg-white p-6">
      <div>
        <p className="font-medium text-navy">{mission.patientLabel}</p>
        <p className="text-sm text-navy/60">
          {mission.typeSoin} · {mission.heurePrevue}
        </p>
      </div>
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUT_CLASSES[mission.statut]}`}>
        {STATUT_LABEL[mission.statut]}
      </span>
    </div>
  );
}
