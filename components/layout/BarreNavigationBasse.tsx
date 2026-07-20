"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function IconeAccueil() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]">
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.5V19a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

function IconePatients() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M15.8 14.2c2.3.3 4.2 2.1 4.2 4.8" />
    </svg>
  );
}

function IconeExplorer() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m14.5 9.5-1.8 4.2-4.2 1.8 1.8-4.2 4.2-1.8Z" />
    </svg>
  );
}

function IconeEly() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]">
      <path d="M5 5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H10l-4.5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function IconePlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" className="h-6 w-6">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

interface Onglet {
  href: string;
  label: string;
  icone: ReactNode;
}

const ONGLETS_GAUCHE: Onglet[] = [
  { href: "/ma-journee", label: "Accueil", icone: <IconeAccueil /> },
  { href: "/patients", label: "Patients", icone: <IconePatients /> },
];

const ONGLETS_DROITE: Onglet[] = [
  { href: "/situations", label: "Explorer", icone: <IconeExplorer /> },
  { href: "/ely", label: "Ely", icone: <IconeEly /> },
];

function estActif(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function OngletNav({ onglet, actif }: { onglet: Onglet; actif: boolean }) {
  return (
    <Link
      href={onglet.href}
      aria-current={actif ? "page" : undefined}
      className={`flex w-14 flex-col items-center gap-1 py-1 text-[11px] font-medium transition-colors ${
        actif ? "text-brand-violet" : "text-navy/40"
      }`}
    >
      {onglet.icone}
      {onglet.label}
    </Link>
  );
}

export function BarreNavigationBasse() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-navy/10 bg-white/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {ONGLETS_GAUCHE.map((onglet) => (
          <OngletNav key={onglet.href} onglet={onglet} actif={estActif(pathname, onglet.href)} />
        ))}

        <Link
          href="/patients/nouveau"
          aria-label="Ajouter un patient"
          className="-mt-6 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-brand-violet to-brand-rose text-white shadow-[0_4px_12px_rgba(124,58,237,.35)] transition-transform hover:scale-105"
        >
          <IconePlus />
        </Link>

        {ONGLETS_DROITE.map((onglet) => (
          <OngletNav key={onglet.href} onglet={onglet} actif={estActif(pathname, onglet.href)} />
        ))}
      </div>
    </nav>
  );
}
