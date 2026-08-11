import Link from "next/link";
import type { MissionTourneeVue } from "@/lib/data/ma-journee";
import type { Tournee } from "@/lib/types/clinical";
import {
  calculerRetardMinutes,
  estimerHeureFin,
  formatHeure,
  formatHeureDepuisTimestamp,
  type CountsMissions,
  type Filtre,
} from "@/lib/tournee-vue";
import { calculerMontantTournee, formaterEuros, type ContexteTarifaire } from "@/lib/cotation";
import { calculerMajorationsTournee } from "@/lib/majorations";
import { formatDateDuJour, formaterNomPropre, initialesUtilisateur } from "@/lib/format";
import { distanceRetenue } from "@/lib/kilometrage";
import { LiquidEffectAnimation } from "@/components/ui/liquid-effect-animation";
import { OngletsFiltresTournee } from "@/components/ui/OngletsFiltresTournee";
import { RubanLemniscateHero } from "@/components/ui/RubanLemniscateHero";

const CIRCONFERENCE = 2 * Math.PI * 33;

export function EnTeteTournee({
  missions,
  tournee,
  contexteTarifaire,
  filtre,
  counts,
  avatarUrl,
  nomComplet,
}: {
  missions: MissionTourneeVue[];
  tournee: Tournee;
  contexteTarifaire: ContexteTarifaire;
  filtre: Filtre;
  counts: CountsMissions;
  avatarUrl?: string | null;
  nomComplet?: string;
}) {
  const total = missions.length;
  const valides = missions.filter((m) => m.statut === "terminee" || m.statut === "absent").length;
  const restants = missions.filter((m) => m.statut === "a_faire" || m.statut === "en_cours").length;
  const pct = total > 0 ? Math.round((valides / total) * 100) : 0;
  const dashoffset = CIRCONFERENCE * (1 - pct / 100);
  const heureFin = estimerHeureFin(missions);
  const montantActes = calculerMontantTournee(missions, contexteTarifaire);
  const montantMajorations = calculerMajorationsTournee(missions, tournee.date, contexteTarifaire);
  const montantTotal = Math.round((montantActes + montantMajorations) * 100) / 100;
  const totalKm = missions.reduce(
    (somme, m) => somme + (distanceRetenue(m.distanceKm, m.distanceKmCorrigee) ?? 0),
    0
  );

  const enCours = missions.find((m) => m.statut === "en_cours") ?? null;
  const retard = enCours ? calculerRetardMinutes(enCours) : null;

  const nowName = enCours ? formaterNomPropre(enCours.patientNom) : "Tournée à jour";
  const nowSub = enCours
    ? `En cours depuis ${enCours.heureDebutReelle ? formatHeureDepuisTimestamp(enCours.heureDebutReelle) : formatHeure(enCours.heurePrevue)} · ${enCours.patientAdresse}`
    : restants > 0
      ? `${restants} soin${restants > 1 ? "s" : ""} restant${restants > 1 ? "s" : ""} · aucun en cours`
      : "Tous les soins du jour sont validés";

  return (
    <div className="relative isolate overflow-hidden bg-[linear-gradient(168deg,#221b33_0%,#2c1f47_58%,#3a2260_100%)] px-5 pb-4 pt-6 text-white">
      {/* Matière liquide de la maquette : décorative, sous tout le reste
          (-z-10), puis atténuée par le dégradé sombre qui la suit pour
          garder le contenu parfaitement lisible par-dessus. */}
      <LiquidEffectAnimation className="-z-10" />
      {/* Voile vertical plutôt qu'uniforme : presque transparent sur la bande
          du titre, où les nappes doivent se voir, puis franchement opaque sous
          les statistiques et les filtres, qui se lisent en tournée. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(34,27,51,.08)_0%,rgba(34,27,51,.14)_26%,rgba(40,28,64,.5)_52%,rgba(45,30,72,.74)_78%,rgba(45,30,72,.8)_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-12 -top-20 h-[260px] w-[260px] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,.4),transparent_68%)]"
      />
      <RubanLemniscateHero />
      <div className="relative mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9d94b8]">
              {formatDateDuJour()}
            </p>
            <p className="font-display mt-[3px] text-[20px] font-bold leading-[1.15] tracking-[-0.6px]">
              Ma tournée
            </p>
          </div>
          <Link
            href="/compte"
            aria-label="Mon compte"
            className="flex h-9 w-9 shrink-0 items-center justify-center"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL signée à courte durée de vie, incompatible avec le cache de next/image
              <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-white/50" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(140deg,#a855f7,#6d28d9)] text-[12.5px] font-bold tracking-[-0.2px] text-white ring-2 ring-white/30">
                {initialesUtilisateur(nomComplet ?? "") || "?"}
              </span>
            )}
          </Link>
        </div>

        <div className="mt-5 flex items-center gap-3.5">
          <div className="relative h-[70px] w-[70px] shrink-0">
            <svg width="70" height="70" viewBox="0 0 70 70" className="absolute inset-0 -rotate-90">
              <circle cx="35" cy="35" r="33" fill="none" stroke="rgba(255,255,255,.13)" strokeWidth="4" />
              <circle
                cx="35"
                cy="35"
                r="33"
                fill="none"
                stroke="#a855f7"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={CIRCONFERENCE}
                strokeDashoffset={dashoffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-[20px] font-bold leading-none tabular-nums">{valides}</span>
              <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[#9d94b8]">/ {total}</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[23px] font-bold leading-tight tracking-tight">{nowName}</p>
            <p className="mt-1 text-[13px] text-[#b8afd0]">{nowSub}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {retard !== null && (
                <span className="inline-flex animate-pulse items-center gap-1.5 rounded-[8px] border border-[rgba(214,64,44,.36)] bg-[rgba(214,64,44,.2)] px-2 py-1 text-[11px] font-bold text-[#ffc4b8]">
                  <span aria-hidden="true" className="h-[5px] w-[5px] rounded-full bg-[#ff6f56]" />
                  {retard} min de retard
                </span>
              )}
              {heureFin && (
                <span className="rounded-[8px] border border-white/[0.14] bg-white/10 px-2 py-1 text-[11px] font-bold text-[#d5c9f2]">
                  Fin estimée {heureFin}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <div className="flex-1 rounded-[14px] border border-white/10 bg-white/[0.07] px-2.5 py-2.5">
            <p className="font-display text-[17px] font-bold tabular-nums">{restants}</p>
            <p className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9d94b8]">Reste</p>
          </div>
          <div className="flex-1 rounded-[14px] border border-white/10 bg-white/[0.07] px-2.5 py-2.5">
            <p className="font-display text-[17px] font-bold tabular-nums">
              {totalKm > 0 ? Math.round(totalKm) : "—"}
            </p>
            <p className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9d94b8]">Km</p>
          </div>
          <div className="flex-1 rounded-[14px] border border-white/10 bg-white/[0.07] px-2.5 py-2.5">
            <p className="font-display text-[17px] font-bold tabular-nums">
              {montantTotal > 0 ? formaterEuros(montantTotal) : "—"}
            </p>
            <p className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9d94b8]">Cotation</p>
          </div>
        </div>

        <div className="mt-3">
          <OngletsFiltresTournee filtre={filtre} counts={counts} />
        </div>
      </div>
    </div>
  );
}
