// Distinct de BadgeNiveauConfiance : une synthèse est un texte nouveau,
// jamais relu par un humain, même quand elle s'appuie sur des fiches
// validées — ne pas laisser croire qu'elle a le même statut qu'une fiche.
export function BadgeSyntheseIA() {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] px-2.5 py-1 text-[11.5px] font-semibold"
      style={{ color: "#7C3AED", background: "rgba(124,58,237,.12)" }}
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#7C3AED"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
      </svg>
      Synthèse IA
    </span>
  );
}
