import { BarreLogoProfilHero } from "@/components/ui/BarreLogoProfilHero";
import { FondHeroViolet } from "@/components/ui/FondHeroViolet";

export function EnTeteListePatients({
  avatarUrl,
  nombrePatients,
  nombreAujourdhui,
  nombreAlertes,
  query,
  onQuery,
}: {
  avatarUrl?: string | null;
  nombrePatients: number;
  nombreAujourdhui: number;
  nombreAlertes: number;
  query: string;
  onQuery: (valeur: string) => void;
}) {
  return (
    <div className="relative isolate overflow-hidden bg-[linear-gradient(168deg,#221b33_0%,#2c1f47_58%,#3a2260_100%)] px-5 pb-4 pt-6 text-white">
      <FondHeroViolet />
      <div className="relative mx-auto max-w-2xl">
        <BarreLogoProfilHero avatarUrl={avatarUrl} />

        <div className="mt-5">
          <p className="font-display text-[26px] font-bold leading-tight tracking-tight">Mes patients</p>
          <p className="mt-1 text-[13px] text-[#b3aacd]">
            {nombrePatients} patient{nombrePatients > 1 ? "s" : ""} suivi{nombrePatients > 1 ? "s" : ""}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-[14px] border border-white/10 bg-white/[0.07] px-2.5 py-2.5">
            <p className="font-display text-[17px] font-bold leading-none tabular-nums">{nombrePatients}</p>
            <p className="mt-1.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9d94b8]">Suivis</p>
          </div>
          <div className="rounded-[14px] border border-white/10 bg-white/[0.07] px-2.5 py-2.5">
            <p className="font-display text-[17px] font-bold leading-none tabular-nums">{nombreAujourdhui}</p>
            <p className="mt-1.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9d94b8]">Aujourd&apos;hui</p>
          </div>
          <div className="rounded-[14px] border border-white/10 bg-white/[0.07] px-2.5 py-2.5">
            <p className="font-display text-[17px] font-bold leading-none tabular-nums">{nombreAlertes}</p>
            <p className="mt-1.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9d94b8]">Alertes</p>
          </div>
        </div>

        <input
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Rechercher un patient…"
          aria-label="Rechercher un patient"
          className="mt-3.5 min-h-[44px] w-full rounded-[13px] border border-white/[0.18] bg-white/10 px-3.5 text-[14px] font-medium text-white placeholder:text-[#c9c1de] focus:border-[#a855f7] focus:bg-white/[0.14] focus:outline-none"
        />
      </div>
    </div>
  );
}
