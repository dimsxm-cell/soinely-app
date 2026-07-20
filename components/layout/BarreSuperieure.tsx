import Link from "next/link";
import { LogoSoinely } from "@/components/ui/LogoSoinely";

export function BarreSuperieure() {
  return (
    <header className="sticky top-0 z-10 border-b border-navy/10 bg-[#F6F7F5]/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3">
        <Link href="/ma-journee" className="flex items-center gap-2 text-base font-bold tracking-tight text-navy">
          <LogoSoinely className="h-5 w-5" />
          Soinely
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/recherche"
            aria-label="Rechercher"
            className="flex h-9 w-9 items-center justify-center rounded-full text-navy/60 transition-colors hover:bg-navy/5 hover:text-navy"
          >
            <span aria-hidden="true">🔍</span>
          </Link>
          <Link
            href="/compte"
            aria-label="Mon compte"
            className="flex h-9 w-9 items-center justify-center rounded-full text-navy/60 transition-colors hover:bg-navy/5 hover:text-navy"
          >
            <span aria-hidden="true">👤</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
