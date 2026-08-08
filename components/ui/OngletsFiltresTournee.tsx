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

  return (
    <div className="flex gap-1 rounded-[14px] border border-white/[0.08] bg-black/[0.26] p-1">
      {onglets.map((o) => {
        const actif = filtre === o.clef;
        return (
          <Link
            key={o.clef}
            href={o.clef === "tout" ? "/ma-tournee" : `/ma-tournee?filtre=${o.clef}`}
            aria-current={actif ? "page" : undefined}
            className={`flex flex-1 min-h-[34px] items-center justify-center gap-1.5 whitespace-nowrap rounded-[11px] text-[12px] transition-colors ${
              actif ? "bg-white font-bold text-[#2b1a55]" : "font-semibold text-[#a79dc4] hover:text-white"
            }`}
          >
            {o.label} {o.count}
          </Link>
        );
      })}
    </div>
  );
}
