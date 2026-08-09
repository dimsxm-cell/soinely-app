import Link from "next/link";
import { LogoSoinely } from "@/components/ui/LogoSoinely";

function IconeProfil() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[19px] w-[19px]">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 19.5c0-3.6 3.36-6 7.5-6s7.5 2.4 7.5 6" />
    </svg>
  );
}

/**
 * Logo + accès « Mon compte », repris ici pour les en-têtes violets qui
 * remplacent la barre du haut globale (BarreSuperieure) sur les écrans qui
 * en ont un — sinon la navigation resterait sans accès au compte.
 */
export function BarreLogoProfilHero({ avatarUrl }: { avatarUrl?: string | null }) {
  return (
    <div className="flex items-center justify-between">
      <Link href="/ma-journee" className="flex items-center gap-2 text-base font-bold tracking-tight text-white">
        <LogoSoinely variante="carre" className="h-7 w-7" />
        Soinely
      </Link>

      <Link href="/compte" aria-label="Mon compte" className="flex h-9 w-9 items-center justify-center">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL signée à courte durée de vie, incompatible avec le cache de next/image
          <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-white/50" />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full text-white ring-2 ring-white/30 transition-colors hover:bg-white/10">
            <IconeProfil />
          </span>
        )}
      </Link>
    </div>
  );
}
