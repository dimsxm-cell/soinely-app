const BADGES = [
  {
    t1: "Hébergé en France",
    t2: "Certifié HDS",
    couleur: "#2563eb",
    d: "M4 6h16 M4 12h16 M4 18h16",
  },
  {
    t1: "Conforme",
    t2: "RGPD",
    couleur: "#2563eb",
    d: "M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5z",
  },
  {
    t1: "Données chiffrées",
    t2: "de bout en bout",
    couleur: "#7c3aed",
    d: "M6 10V8a6 6 0 0 1 12 0v2 M5 10h14v10H5z",
  },
  {
    t1: "Conçu avec les IDEL",
    t2: "pour les IDEL",
    couleur: "#db2777",
    d: "M12 21s-7-4.4-9.5-8.5C.5 9 2 5 5.5 5 7.8 5 9 6.5 12 9c3-2.5 4.2-4 6.5-4C22 5 23.5 9 21.5 12.5 19 16.6 12 21 12 21z",
  },
];

export function PiedDePageMarketing() {
  return (
    <footer id="a-propos" className="border-t border-navy/5 px-6 py-8">
      <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-center gap-x-12 gap-y-5">
        {BADGES.map((badge) => (
          <span key={badge.t1} className="inline-flex items-center gap-2.5">
            <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-[#f4f2f9]">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]" style={{ color: badge.couleur }}>
                <path d={badge.d} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="leading-[1.3]">
              <span className="block text-[12.5px] font-extrabold text-navy">{badge.t1}</span>
              <span className="block text-[11.5px] font-semibold text-navy/50">{badge.t2}</span>
            </span>
          </span>
        ))}
      </div>
    </footer>
  );
}
