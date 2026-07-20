import Link from "next/link";
import type { FicheDossierSoin } from "@/lib/types/clinical";

interface CarteFicheDossierProps {
  fiche: FicheDossierSoin;
}

export function CarteFicheDossier({ fiche }: CarteFicheDossierProps) {
  return (
    <Link
      href={`/situations/dossier/${fiche.id}`}
      className="block rounded-card border border-navy/10 bg-white p-6 transition-colors hover:border-brand-violet"
    >
      <span className="rounded-full bg-navy/10 px-4 py-2 text-sm text-navy">
        {fiche.niveauConfiance}
      </span>
      <h3 className="mt-4 text-xl font-semibold text-navy">{fiche.titre}</h3>
      <p className="mt-2 line-clamp-2 text-navy/70">{fiche.resume}</p>
    </Link>
  );
}
