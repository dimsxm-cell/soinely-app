import type { NiveauConfiance } from "@/lib/types/clinical";

const META: Record<NiveauConfiance, { label: string; couleur: string; fond: string }> = {
  valide: { label: "Validé", couleur: "#1a7f37", fond: "rgba(26,127,55,.12)" },
  relu: { label: "Relu", couleur: "#b45309", fond: "rgba(217,119,6,.12)" },
  brouillon: { label: "Brouillon", couleur: "#6e6e73", fond: "rgba(0,0,0,.05)" },
};

interface BadgeNiveauConfianceProps {
  niveau: NiveauConfiance;
}

export function BadgeNiveauConfiance({ niveau }: BadgeNiveauConfianceProps) {
  const meta = META[niveau];

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] px-2.5 py-1 text-[11.5px] font-semibold"
      style={{ color: meta.couleur, background: meta.fond }}
    >
      {niveau === "valide" && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={meta.couleur} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
      {meta.label}
    </span>
  );
}
