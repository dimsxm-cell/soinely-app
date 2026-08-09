"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoSoinely } from "@/components/ui/LogoSoinely";

function IconeRecherche() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[19px] w-[19px]">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.4-3.4" />
    </svg>
  );
}

function IconeProfil() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[19px] w-[19px]">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 19.5c0-3.6 3.36-6 7.5-6s7.5 2.4 7.5 6" />
    </svg>
  );
}

interface BarreSuperieureProps {
  avatarUrl?: string | null;
}

/** Fiche patient (Identité/Soins/Documents) : son propre en-tête violet
 *  porte déjà le retour et « Mon compte », la barre blanche globale
 *  ferait doublon. La liste /patients et /patients/nouveau la gardent. */
function estFichePatient(pathname: string): boolean {
  return /^\/patients\/(?!nouveau($|\/))[^/]+/.test(pathname);
}

/** Accueil et Ma tournée : leur bandeau violet porte désormais lui-même le
 *  logo et « Mon compte » (BarreLogoProfilHero), la barre blanche globale
 *  ferait doublon. Uniquement ces deux pages, pas leurs sous-routes
 *  (ex. /ma-journee/[missionId] n'a pas de bandeau violet). */
function estAccueilOuTournee(pathname: string): boolean {
  return pathname === "/ma-journee" || pathname === "/ma-tournee";
}

export function BarreSuperieure({ avatarUrl }: BarreSuperieureProps) {
  const pathname = usePathname();
  if (estFichePatient(pathname) || estAccueilOuTournee(pathname)) return null;

  return (
    <header className="print:hidden">
      <div className="mx-auto grid max-w-2xl grid-cols-3 items-center px-6 py-3">
        <Link
          href="/recherche"
          aria-label="Rechercher"
          className="flex h-9 w-9 items-center justify-center justify-self-start rounded-full text-navy/60 transition-colors hover:bg-navy/5 hover:text-navy"
        >
          <IconeRecherche />
        </Link>

        <Link
          href="/ma-journee"
          className="flex items-center gap-2 justify-self-center text-base font-bold tracking-tight text-navy"
        >
          <LogoSoinely variante="carre" className="h-7 w-7" />
          Soinely
        </Link>

        <Link href="/compte" aria-label="Mon compte" className="flex h-9 w-9 items-center justify-center justify-self-end">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL signée à courte durée de vie, incompatible avec le cache de next/image
            <img
              src={avatarUrl}
              alt=""
              className="h-9 w-9 rounded-full object-cover ring-2 ring-brand-violet/70"
            />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full text-brand-violet ring-2 ring-brand-violet/40 transition-colors hover:bg-brand-violet/10">
              <IconeProfil />
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
