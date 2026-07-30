import Link from "next/link";
import type { CountsMissions, Filtre } from "@/lib/tournee-vue";

export function OngletsFiltresTournee({
  filtre,
  counts,
}: {
  filtre: Filtre;
  counts: CountsMissions;
}) {
  const onglets: { label: string; clef: Filtre; count: number }[] = [
    { label: "Tout", clef: "tout", count: counts.tout },
    { label: "À faire", clef: "a_faire", count: counts.a_faire },
    { label: "Alertes", clef: "alertes", count: counts.alertes },
    { label: "Validés", clef: "valides", count: counts.valides },
  ];

  // Pas de conteneur défilable : un conteneur défilable rogne sur ses quatre
  // côtés — c'est ce qui tranchait le bouton actif du menu Explorer (commit
  // 5ca03ab). Le retour à la ligne remplace le défilement : les quatre
  // onglets ne tiennent pas sur une seule ligne à la largeur d'un téléphone.
  return (
    <div className="border-b border-navy/[0.07] bg-white px-4 py-3">
      <div className="mx-auto flex w-full max-w-2xl flex-wrap gap-2">
        {onglets.map((o) => {
          const actif = filtre === o.clef;
          return (
            <Link
              key={o.clef}
              href={o.clef === "tout" ? "/ma-tournee" : `/ma-tournee?filtre=${o.clef}`}
              aria-current={actif ? "page" : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-colors ${
                actif
                  ? "bg-navy text-white"
                  : "border border-navy/12 bg-white text-navy/55 hover:bg-navy/[0.04]"
              }`}
            >
              {o.label}
              <span
                className={`min-w-[18px] rounded-full px-1.5 py-px text-center text-[10px] font-bold ${
                  actif ? "bg-white/15 text-white/80" : "bg-navy/[0.07] text-navy/50"
                }`}
              >
                {o.count}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
