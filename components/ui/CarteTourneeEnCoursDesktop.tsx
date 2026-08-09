import type { MissionTourneeVue } from "@/lib/data/ma-journee";
import { estimerHeureFin, formatHeure, formatHeureDepuisTimestamp } from "@/lib/tournee-vue";
import { formaterNomPropre } from "@/lib/format";
import { hrefWaze } from "@/lib/waze";

/** Même convention que calculerKmTournee (lib/accueil-vue.ts) : arrondi à l'entier. */
function kmRestants(missions: MissionTourneeVue[]): number | null {
  const restants = missions.filter((m) => m.statut !== "terminee" && m.statut !== "absent");
  const connu = restants.some((m) => m.distanceKmCorrigee != null || m.distanceKm != null);
  if (!connu) return null;
  const total = restants.reduce((somme, m) => somme + (m.distanceKmCorrigee ?? m.distanceKm ?? 0), 0);
  return Math.round(total);
}

export function CarteTourneeEnCoursDesktop({ missions }: { missions: MissionTourneeVue[] }) {
  const total = missions.length;
  const valides = missions.filter((m) => m.statut === "terminee" || m.statut === "absent").length;
  const pct = total > 0 ? Math.round((valides / total) * 100) : 0;
  const circonference = 2 * Math.PI * 54;
  const dashoffset = circonference * (1 - pct / 100);

  const prochainArret =
    missions.find((m) => m.statut === "en_cours") ?? missions.find((m) => m.statut === "a_faire") ?? null;
  const heureFin = estimerHeureFin(missions);
  const km = kmRestants(missions);

  return (
    <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(145deg,#1b1826_0%,#221c33_55%,#2c1f47_100%)] p-7 text-white shadow-[0_22px_50px_-28px_rgba(24,18,44,.85)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-16 h-[250px] w-[250px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,.35),transparent_68%)]"
      />
      <div className="relative flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          {prochainArret ? (
            <>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(52,199,89,.3)] bg-[rgba(26,127,90,.18)] px-2.5 py-1">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#34c759]" />
                <span className="text-[11px] font-bold text-[#7ee2a8]">
                  {prochainArret.statut === "en_cours" ? "Tournée en cours" : "Prochain arrêt"}
                </span>
              </div>
              <p className="mt-4 font-display text-[28px] font-bold leading-[1.15] tracking-tight">
                {prochainArret.statut === "en_cours"
                  ? `En cours chez ${formaterNomPropre(prochainArret.patientNom)}`
                  : `Prochain soin à ${formatHeure(prochainArret.heurePrevue)}`}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[16px] border border-white/10 bg-white/[0.06] p-3.5">
                <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[13px] bg-[linear-gradient(140deg,#8b5cf6,#6d28d9)] text-[14px] font-bold">
                  {formaterNomPropre(prochainArret.patientNom).slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-[150px] flex-1">
                  <p className="text-[15px] font-bold tracking-tight">{formaterNomPropre(prochainArret.patientNom)}</p>
                  <p className="mt-0.5 truncate text-[12.5px] text-[#a9a2bd]">
                    {prochainArret.patientAdresse}
                    {prochainArret.statut === "en_cours" && prochainArret.heureDebutReelle
                      ? ` · en cours depuis ${formatHeureDepuisTimestamp(prochainArret.heureDebutReelle)}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <a
                    href={hrefWaze({ latitude: null, longitude: null, adresse: prochainArret.patientAdresse })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-[38px] items-center rounded-[11px] border border-white/[0.16] bg-white/[0.08] px-3.5 text-[12.5px] font-semibold text-white"
                  >
                    Itinéraire
                  </a>
                  <a
                    href={`/ma-journee/${prochainArret.id}`}
                    className="flex min-h-[38px] items-center rounded-[11px] bg-white px-3.5 text-[12.5px] font-bold text-[#241a3d]"
                  >
                    Ouvrir
                  </a>
                </div>
              </div>
              {(prochainArret.patientAllergies || prochainArret.patientConsignes) && (
                <div className="mt-3 flex items-center gap-2 rounded-[12px] border border-[rgba(214,64,44,.3)] bg-[rgba(214,64,44,.14)] px-3 py-2.5">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[15px] w-[15px] shrink-0">
                    <path d="M12 9v4M12 17h.01" stroke="#ff8f7d" strokeWidth="2.3" strokeLinecap="round" fill="none" />
                    <circle cx="12" cy="12" r="9" stroke="#ff8f7d" strokeWidth="2.3" fill="none" />
                  </svg>
                  <p className="text-[12.5px] font-semibold text-[#ffc4b8]">
                    {prochainArret.patientAllergies || prochainArret.patientConsignes}
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="font-display text-[22px] font-bold tracking-tight text-white/90">Tournée terminée</p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-center gap-2.5">
          <div className="relative h-[132px] w-[132px]">
            <svg width="132" height="132" viewBox="0 0 132 132" className="-rotate-90">
              <circle cx="66" cy="66" r="54" fill="none" stroke="rgba(255,255,255,.11)" strokeWidth="11" />
              <circle
                cx="66"
                cy="66"
                r="54"
                fill="none"
                stroke="#a855f7"
                strokeWidth="11"
                strokeLinecap="round"
                strokeDasharray={circonference}
                strokeDashoffset={dashoffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-[30px] font-bold leading-none tabular-nums">
                {valides}
                <span className="text-[17px] text-[#8f88a8]">/{total}</span>
              </span>
              <span className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#8f88a8]">Soins</span>
            </div>
          </div>
          <div className="flex gap-4 text-center">
            <div>
              <p className="text-[15px] font-bold tabular-nums">{heureFin ?? "—"}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-[#8f88a8]">Fin est.</p>
            </div>
            <div>
              <p className="text-[15px] font-bold tabular-nums">{km !== null ? `${km} km` : "—"}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-[#8f88a8]">Restants</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
