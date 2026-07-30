import type { MissionTourneeVue } from "@/lib/data/ma-journee";
import type { Tournee } from "@/lib/types/clinical";
import { estimerHeureFin, formatDateTournee } from "@/lib/tournee-vue";

export function EnTeteTournee({
  missions,
  tournee,
}: {
  missions: MissionTourneeVue[];
  tournee: Tournee;
}) {
  const total = missions.length;
  const valides = missions.filter(
    (m) => m.statut === "terminee" || m.statut === "absent"
  ).length;
  const restants = missions.filter(
    (m) => m.statut === "a_faire" || m.statut === "en_cours"
  ).length;
  const pct = total > 0 ? Math.round((valides / total) * 100) : 0;
  const heureFin = estimerHeureFin(missions);
  const maintenant = new Date().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-[#0A1628] px-5 pb-4 pt-5">
      <div className="mx-auto max-w-2xl">
        {/* Ligne 1 : date + heure */}
        <div className="flex items-start justify-between">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-white/35">
            Tournée du {formatDateTournee()}
          </p>
          <div className="text-right">
            <p className="text-[9px] font-semibold uppercase tracking-[0.09em] text-white/30">
              Maintenant
            </p>
            <p className="mt-0.5 font-display text-[17px] font-bold tabular-nums text-white">
              {maintenant}
            </p>
          </div>
        </div>

        {/* Compteur validés */}
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="font-display text-[44px] font-bold tabular-nums leading-none text-white">
            {valides}
          </span>
          <span className="text-[20px] font-semibold text-white/30">/{total}</span>
          <span className="ml-1 text-[13px] text-white/45">soins validés</span>
        </div>

        {/* Barre de progression */}
        <div className="mt-3 h-[5px] w-full overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-violet to-brand-rose transition-all duration-700"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progression : ${pct}%`}
          />
        </div>

        {/* Stats : 3 colonnes */}
        <div className="mt-4 grid grid-cols-3 gap-4 border-t border-white/[0.06] pt-4">
          <div>
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.09em] text-white/30">
              Reste
            </p>
            <p className="mt-0.5 font-display text-[22px] font-bold tabular-nums text-white">
              {restants}
            </p>
          </div>
          {heureFin ? (
            <div>
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.09em] text-white/30">
                Fin est.
              </p>
              <p className="mt-0.5 font-display text-[22px] font-bold tabular-nums text-white">
                {heureFin}
              </p>
            </div>
          ) : (
            <div />
          )}
          <div>
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.09em] text-white/30">
              Patients
            </p>
            <p className="mt-0.5 font-display text-[22px] font-bold tabular-nums text-white">
              {tournee.nbPatients}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
