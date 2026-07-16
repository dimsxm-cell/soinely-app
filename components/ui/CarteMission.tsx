import Link from "next/link";
import type { MissionDuJour, StatutMission } from "@/lib/types/clinical";
import { updateMissionStatutAction } from "@/lib/data/ma-journee-actions";
import { Button } from "@/components/ui/Button";

const STATUT_LABEL: Record<MissionDuJour["statut"], string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  terminee: "Terminée",
};

const STATUT_CLASSES: Record<MissionDuJour["statut"], string> = {
  a_faire: "bg-navy/5 text-navy",
  en_cours: "bg-warning text-navy",
  terminee: "bg-success text-navy",
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
    <div className="flex items-center justify-between rounded-card border border-navy/10 bg-white p-6">
      <Link href={`/ma-journee/${mission.id}`} className="hover:underline">
        <p className="font-medium text-navy">{mission.patientNom}</p>
        <p className="text-sm text-navy/60">
          {mission.typeSoin} · {mission.heurePrevue}
        </p>
      </Link>
      <div className="flex items-center gap-4">
        {contexteHref && (
          <Link href={contexteHref}>
            <Button variant="tertiary">Contexte clinique</Button>
          </Link>
        )}
        <span className={`rounded-full px-2 py-2 text-xs font-medium ${STATUT_CLASSES[mission.statut]}`}>
          {STATUT_LABEL[mission.statut]}
        </span>
        {prochainStatut && (
          <form action={updateMissionStatutAction}>
            <input type="hidden" name="missionId" value={mission.id} />
            <input type="hidden" name="nouveauStatut" value={prochainStatut} />
            <Button type="submit" variant="secondary">
              {LIBELLE_ACTION[mission.statut]}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
