import Image from "next/image";
import type { MissionDuJour } from "@/lib/types/clinical";
import { calculerKmTournee, compterMissionsAccueil, formatDateDuJour, formatSalutation } from "@/lib/accueil-vue";
import { BarreLogoProfilHero } from "@/components/ui/BarreLogoProfilHero";

export function EnTeteAccueil({
  prenom,
  missions,
  avatarUrl,
}: {
  prenom: string | undefined;
  missions: MissionDuJour[];
  avatarUrl?: string | null;
}) {
  const { visites, faites, restantes } = compterMissionsAccueil(missions);
  const km = calculerKmTournee(missions);

  return (
    <div className="relative overflow-hidden bg-[linear-gradient(168deg,#221b33_0%,#2c1f47_58%,#3a2260_100%)] px-5 pb-4 pt-6 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-24 h-[280px] w-[280px] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,.4),transparent_68%)]"
      />
      <div className="relative mx-auto max-w-2xl">
        <BarreLogoProfilHero avatarUrl={avatarUrl} />

        <div className="mt-5 flex items-center gap-3.5">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#a99ccb]">{formatDateDuJour()}</p>
            <p className="mt-1 font-display text-[26px] font-bold leading-tight tracking-tight">
              {formatSalutation()}
              {prenom ? `, ${prenom}` : ""}
            </p>
          </div>
          <Image
            src="/marketing/ely-colibri-heureux.webp"
            alt="ELY"
            width={323}
            height={304}
            className="h-[100px] w-[100px] shrink-0 object-contain"
            priority
          />
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <div className="rounded-[14px] border border-white/10 bg-white/[0.07] px-2.5 py-2.5">
            <p className="font-display text-[17px] font-bold tabular-nums">{visites}</p>
            <p className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9d94b8]">Visites</p>
          </div>
          <div className="rounded-[14px] border border-white/10 bg-white/[0.07] px-2.5 py-2.5">
            <p className="font-display text-[17px] font-bold tabular-nums">{faites}</p>
            <p className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9d94b8]">Faites</p>
          </div>
          <div className="rounded-[14px] border border-white/10 bg-white/[0.07] px-2.5 py-2.5">
            <p className="font-display text-[17px] font-bold tabular-nums">{restantes}</p>
            <p className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9d94b8]">Restantes</p>
          </div>
          <div className="rounded-[14px] border border-white/10 bg-white/[0.07] px-2.5 py-2.5">
            <p className="font-display text-[17px] font-bold tabular-nums">{km !== null ? km : "—"}</p>
            <p className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9d94b8]">Km</p>
          </div>
        </div>
      </div>
    </div>
  );
}
