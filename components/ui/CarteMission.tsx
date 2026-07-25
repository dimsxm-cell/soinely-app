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
  a_faire: "bg-navy/5 text-navy/50",
  en_cours: "bg-brand-violet/[0.12] text-brand-violet tabular-nums",
  terminee: "bg-teal/10 text-[#0E7E70]",
  absent: "bg-navy/5 text-navy/40",
};

const DOT_CLASSES: Record<MissionDuJour["statut"], string> = {
  a_faire: "bg-brand-violet/50",
  en_cours: "bg-brand-violet shadow-[0_0_0_4px_rgba(124,58,237,0.2)]",
  terminee: "bg-[#1a7f37]",
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
  a_faire: "bg-gradient-to-r from-brand-violet to-purple-500 shadow-[0_4px_12px_rgba(124,58,237,0.3)]",
  en_cours: "bg-[#1a7f37] shadow-[0_4px_12px_rgba(26,127,55,0.28)]",
};

function IconeSoin({ typeSoin }: { typeSoin: string }) {
  const t = typeSoin.toLowerCase();

  if (t.includes("injection")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 text-brand-violet">
        <path d="m18 2 4 4M17 7l3-3M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5M9 11l4 4M5 19l-3 3M14 4l6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (t.includes("pansement")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 text-brand-violet">
        <path d="M4.6 13.11a5.5 5.5 0 0 0 7.78 7.78l6.9-6.9a5.5 5.5 0 0 0-7.79-7.77z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m14.5 4.5-8 8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="17.5" cy="6.5" r="1" stroke="currentColor" strokeWidth="2" fill="none" />
        <circle cx="6.5" cy="17.5" r="1" stroke="currentColor" strokeWidth="2" fill="none" />
      </svg>
    );
  }
  if (t.includes("glyc")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 text-brand-violet">
        <path d="M12 2.69 17.66 8.35a8 8 0 1 1-11.31 0z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 text-brand-violet">
      <path
        d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface CarteMissionProps {
  mission: MissionDuJour;
  contexteHref?: string;
}

export function CarteMission({ mission, contexteHref }: CarteMissionProps) {
  const prochainStatut = PROCHAIN_STATUT[mission.statut];
  const heureAffichee = mission.heurePrevue.slice(0, 5);
  const terminee = mission.statut === "terminee";

  return (
    <div className="flex items-stretch gap-2.5">
      <div className="flex w-9 shrink-0 flex-col items-center gap-1.5 pt-3.5">
        <span className="whitespace-nowrap text-[11px] font-bold tabular-nums text-navy/45">{heureAffichee}</span>
        <span aria-hidden="true" className={`h-3 w-3 rounded-full ring-4 ring-[#F6F7F5] ${DOT_CLASSES[mission.statut]}`} />
      </div>

      <div
        className={`flex flex-1 flex-col gap-3 rounded-2xl border bg-white p-3.5 sm:flex-row sm:items-center ${
          mission.statut === "en_cours"
            ? "border-brand-violet/60 shadow-[0_6px_18px_rgba(124,58,237,0.18)]"
            : "border-navy/[0.06] shadow-[0_1px_2px_rgba(15,23,42,.04)]"
        } ${terminee ? "opacity-70" : ""}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            aria-hidden="true"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${terminee ? "bg-brand-violet/[0.06]" : "bg-brand-violet/[0.12]"}`}
          >
            <IconeSoin typeSoin={mission.typeSoin} />
          </span>

          <Link href={`/ma-journee/${mission.id}`} className="min-w-0 flex-1 hover:opacity-80">
            <p className={`font-semibold ${terminee ? "text-navy/50" : "text-navy"}`}>{mission.patientNom}</p>
            <p className="text-sm text-navy/50">{mission.typeSoin}</p>
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0 sm:flex-nowrap sm:justify-end">
          {contexteHref && (
            <Link href={contexteHref} className="text-sm font-semibold text-brand-violet hover:underline">
              Contexte clinique
            </Link>
          )}
          <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${STATUT_CLASSES[mission.statut]}`}>
            {STATUT_LABEL[mission.statut]}
          </span>
          {prochainStatut && (
            <form action={updateMissionStatutAction}>
              <input type="hidden" name="missionId" value={mission.id} />
              <input type="hidden" name="nouveauStatut" value={prochainStatut} />
              <button
                type="submit"
                className={`rounded-full px-4 py-2 text-sm font-semibold text-white ${BOUTON_CLASSES[mission.statut]}`}
              >
                {LIBELLE_ACTION[mission.statut]}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
