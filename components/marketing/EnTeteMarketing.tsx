import Link from "next/link";
import { LogoSoinely } from "@/components/ui/LogoSoinely";

const LIENS_NAV = [
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#ely", label: "ELY, votre copilote" },
  { href: "/abonnement", label: "Tarifs" },
  { href: "#ressources", label: "Ressources" },
  { href: "#a-propos", label: "À propos" },
];

export function EnTeteMarketing() {
  return (
    <header className="sticky top-0 z-30 border-b border-navy/5 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoSoinely className="h-6 w-6 shrink-0" />
          <span>
            <span className="block text-lg font-bold leading-none tracking-tight text-navy">SOINELY</span>
            <span className="block text-[9.5px] font-semibold uppercase tracking-[0.12em] text-navy/45">
              Le copilote des infirmiers libéraux
            </span>
          </span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-7 text-[14.5px] font-medium text-navy/70 lg:flex">
          {LIENS_NAV.map((lien) => (
            <a key={lien.href} href={lien.href} className="transition-colors hover:text-navy">
              {lien.label}
            </a>
          ))}
        </nav>

        <Link
          href="/login"
          className="whitespace-nowrap rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy/90"
        >
          Demander une démo
        </Link>
      </div>
    </header>
  );
}
