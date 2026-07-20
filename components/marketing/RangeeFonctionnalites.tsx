const FONCTIONNALITES = [
  {
    titre: "Jusqu'à 1 heure gagnée par jour",
    texte: "Des tournées optimisées qui s'adaptent à votre rythme réel.",
    icone: (
      <path d="M12 7v5l3.5 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    titre: "Moins de charge mentale",
    texte: "ELY anticipe, rappelle et simplifie votre quotidien.",
    icone: (
      <path d="M9.5 3a4.5 4.5 0 0 0-4.4 5.5A4 4 0 0 0 6 16h1M14.5 3a4.5 4.5 0 0 1 4.4 5.5A4 4 0 0 1 18 16h-1M9 3.2V17a3 3 0 0 0 6 0V3.2" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    titre: "Moins d'oublis, plus de sérénité",
    texte: "Rappels intelligents, check-lists et alertes au bon moment.",
    icone: (
      <path d="M12 3a5 5 0 0 0-5 5v3.2c0 .8-.3 1.6-.9 2.2L5 14.8c-.7.7-.2 1.9.8 1.9h12.4c1 0 1.5-1.2.8-1.9l-1.1-1.4a3.2 3.2 0 0 1-.9-2.2V8a5 5 0 0 0-5-5ZM9.5 19a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    titre: "Une tournée qui s'adapte à tout",
    texte: "Imprévus, trafic, urgences : ELY réorganise votre journée.",
    icone: (
      <path d="M12 21s-7-5.5-7-11.2C5 6 8.1 3 12 3s7 3 7 6.8C19 15.5 12 21 12 21Zm0-8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6Z" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    titre: "Toute votre expertise à portée de main",
    texte: "Protocoles, constantes à tenir, codes NGAP, en un instant.",
    icone: (
      <path d="M5 4.5h9A2.5 2.5 0 0 1 16.5 7v13l-5.5-2.5L5.5 20V7A2.5 2.5 0 0 1 5 4.5Z" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    titre: "Sécurisé et conforme",
    texte: "Hébergé en France, conforme RGPD, données chiffrées.",
    icone: (
      <path d="M12 3l7 3v5.5c0 5-3.2 8.4-7 9.5-3.8-1.1-7-4.5-7-9.5V6l7-3Z" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
];

export function RangeeFonctionnalites() {
  return (
    <section id="fonctionnalites" className="mx-auto w-full max-w-[1180px] px-6 pb-14 sm:pb-20">
      <div className="grid grid-cols-2 gap-8 rounded-[24px] border border-navy/5 bg-white px-6 py-10 shadow-[0_1px_2px_rgba(15,23,42,.04),0_18px_40px_-12px_rgba(15,23,42,.06)] sm:px-10 md:grid-cols-3 lg:grid-cols-6">
        {FONCTIONNALITES.map((item) => (
          <div key={item.titre} className="flex flex-col items-center text-center">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-violet/10 to-brand-rose/10 text-brand-violet">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                {item.icone}
              </svg>
            </span>
            <p className="text-[13.5px] font-semibold leading-snug text-navy">{item.titre}</p>
            <p className="mt-1 text-[11.5px] leading-snug text-navy/50">{item.texte}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
