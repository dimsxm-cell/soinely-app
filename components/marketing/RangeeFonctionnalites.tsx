/* Fonctionnalités grid — 6 colonnes */
const FONCTIONNALITES = [
  {
    titre: "Des tournées plus fluides",
    texte: "Réorganisez l'ordre de vos visites en un geste, et laissez Waze gérer le trafic.",
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
    titre: "Une tournée qui s'adapte à l'imprévu",
    texte: "Retard, urgence, absence… réorganisez en un geste, où que vous soyez.",
    bg: "#eefaf2",
    couleur: "#16a34a",
    icone: (
      <>
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="10" r="2" stroke="currentColor" strokeWidth="1.7" fill="none" />
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
    texte: "Données chiffrées, accès cloisonné par professionnel.",
    bg: "#fdeef0",
    couleur: "#e11d48",
    icone: (
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
];

export function RangeeFonctionnalites() {
  return (
    <section
      id="feat"
      style={{ background: "#faf8ff", padding: "26px 0" }}
    >
      <div className="mx-auto w-full max-w-[1180px] px-6">
        <div className="glass-panel rounded-[20px] px-5 py-8 sm:px-[30px] sm:py-10">
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-6 lg:gap-[22px]">
            {FONCTIONNALITES.map((item) => (
              <div
                key={item.titre}
                className="feat group flex flex-col items-center text-center"
                style={{ cursor: "default" }}
              >
                <div
                  className="featicon mb-[14px] flex items-center justify-center rounded-[16px] transition-transform duration-300 [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] group-hover:-translate-y-1 group-hover:scale-110"
                  style={{ width: 56, height: 56, background: item.bg, color: item.couleur, margin: "0 auto 14px" }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
                    {item.icone}
                  </svg>
                </div>
                <p
                  className="feattitle font-extrabold leading-tight"
                  style={{ fontSize: 14.5, letterSpacing: "-0.3px", marginBottom: 8, color: "#1e1b3c" }}
                >
                  {item.titre}
                </p>
                <p style={{ fontSize: 12, lineHeight: 1.5, color: "#7a7391" }}>
                  {item.texte}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
