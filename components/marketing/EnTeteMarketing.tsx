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
    <header className="sticky top-0 z-30 border-b border-white/40 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-brand-violet to-purple-500 shadow-[0_4px_12px_-2px_rgba(124,58,237,0.45)]">
            <LogoSoinely className="h-[19px] w-[19px] text-white [&_path]:fill-white" />
          </span>
          <span>
            <span className="block text-[19px] font-extrabold leading-none tracking-tight text-navy">SOINELY</span>
            <span className="hidden text-[8.5px] font-bold uppercase tracking-[0.03em] text-[#9a92b3] sm:block">
              Le copilote des infirmiers libéraux
            </span>
          </span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-7 text-[14.5px] font-semibold text-navy/70 lg:flex">
          {LIENS_NAV.map((lien) => (
            <a key={lien.href} href={lien.href} className="transition-colors hover:text-brand-violet">
              {lien.label}
            </a>
          ))}
        </nav>

        <Link
          href="/login"
          className="btn-lift whitespace-nowrap rounded-full bg-gradient-to-r from-brand-violet to-purple-500 px-5 py-3 text-sm font-bold text-white shadow-[0_6px_18px_-4px_rgba(124,58,237,0.5)]"
        >
          Demander une démo
        </Link>
      </div>
    </header>
  );
}
