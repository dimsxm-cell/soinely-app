const FONCTIONNALITES = [
  {
    titre: "Jusqu'à 1 heure gagnée par jour",
    texte: "Des tournées optimisées qui s'adaptent en temps réel.",
    bg: "#eef4ff",
    couleur: "#2563eb",
    icone: (
      <>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" fill="none" />
        <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    titre: "Moins de charge mentale",
    texte: "ELY anticipe, rappelle et simplifie votre quotidien.",
    bg: "#f3eefe",
    couleur: "#7c3aed",
    icone: (
      <path d="M12 5a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 0 3 3 0 0 0 2-5 3 3 0 0 0-2-5 3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    titre: "Moins d'oublis, plus de sérénité",
    texte: "Rappels intelligents, check-lists et alertes.",
    bg: "#fdf0f8",
    couleur: "#db2777",
    icone: (
      <>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    titre: "Une tournée qui s'adapte à tout",
    texte: "Imprévu, trafic, urgences… ELY réorganise pour vous.",
    bg: "#eefaf2",
    couleur: "#16a34a",
    icone: (
      <>
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 10.5a1 1 0 1 0 0-1 1 1 0 0 0 0 1z" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    titre: "Toute votre expertise à portée de main",
    texte: "Protocoles, cotations, conduites à tenir, NGAP…",
    bg: "#fef6e7",
    couleur: "#d97706",
    icone: (
      <>
        <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 22H6.5a2.5 2.5 0 0 1 0-5H20" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    titre: "Sécurisé et conforme",
    texte: "Hébergé HDS, chiffré de bout en bout, conforme RGPD.",
    bg: "#fdeef0",
    couleur: "#e11d48",
    icone: (
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
];

export function RangeeFonctionnalites() {
  return (
    <section id="fonctionnalites" className="mx-auto w-full max-w-[1180px] px-6 pb-14 sm:pb-20">
      <div className="grid grid-cols-2 gap-8 rounded-[24px] border border-navy/5 bg-white px-6 py-10 shadow-[0_1px_2px_rgba(15,23,42,.04),0_18px_40px_-12px_rgba(15,23,42,.06)] sm:px-10 md:grid-cols-3 lg:grid-cols-6">
        {FONCTIONNALITES.map((item) => (
          <div key={item.titre} className="group flex flex-col items-center text-center">
            <span
              className="mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] group-hover:-translate-y-1 group-hover:scale-110"
              style={{ background: item.bg, color: item.couleur }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
                {item.icone}
              </svg>
            </span>
            <p className="text-[14.5px] font-extrabold leading-tight tracking-tight text-navy">{item.titre}</p>
            <p className="mt-2 text-[12px] leading-relaxed text-navy/55">{item.texte}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
