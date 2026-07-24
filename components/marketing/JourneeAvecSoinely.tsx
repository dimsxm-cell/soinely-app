const ETAPES = [
  {
    titre: "Avant la tournée",
    texte: "Préparez votre journée et anticipez l'essentiel.",
    couleur: "#7c3aed",
    contenu: (
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-navy/40">Aujourd&apos;hui</p>
        {["18 patients", "31 soins", "Matériel à prévoir", "Ordonnances à récupérer"].map((ligne) => (
          <p key={ligne} className="rounded-lg bg-navy/[0.035] px-2.5 py-1.5 text-[11px] text-navy/70">
            {ligne}
          </p>
        ))}
      </div>
    ),
  },
  {
    titre: "Pendant la tournée",
    texte: "Adaptez votre itinéraire en temps réel.",
    couleur: "#2563eb",
    contenu: (
      <div className="flex flex-col gap-2">
        <svg viewBox="0 0 220 50" width="100%" height="42" fill="none" preserveAspectRatio="none" className="text-navy/15">
          <polyline points="8,38 55,30 100,33 145,14 200,9" stroke="#c9b6f2" strokeWidth="2.5" strokeDasharray="4 5" strokeLinecap="round" />
          <circle cx="8" cy="38" r="3.5" fill="#7c3aed" />
          <circle cx="100" cy="33" r="3.5" fill="#a855f7" />
          <circle cx="145" cy="14" r="3.5" fill="#7c3aed" />
          <circle cx="200" cy="9" r="3.5" fill="#c026d3" />
        </svg>
        <div className="rounded-lg border border-[#f3d9a6] bg-[#FDF1DD] p-2.5">
          <p className="text-[10.5px] font-bold text-[#B4790C]">🚧 Embouteillage détecté</p>
          <p className="text-[10.5px] text-[#B4790C]/80">+18 min de retard</p>
        </div>
        <div className="flex gap-1.5">
          <span className="flex-1 rounded-full bg-gradient-to-r from-brand-violet to-brand-rose py-1.5 text-center text-[10.5px] font-semibold text-white">
            Optimiser
          </span>
          <span className="flex-1 rounded-full bg-brand-violet/10 py-1.5 text-center text-[10.5px] font-semibold text-brand-violet">
            Plus tard
          </span>
        </div>
      </div>
    ),
  },
  {
    titre: "Pendant le soin",
    texte: "Tout ce qu'il vous faut, sans quitter votre patient.",
    couleur: "#c026d3",
    contenu: (
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-navy/40">Soin en cours — BSI</p>
        <div className="flex flex-wrap gap-1.5">
          {["Protocole", "Calculateur", "Photo Transmission"].map((item) => (
            <span key={item} className="rounded-full border border-navy/[0.06] bg-white px-2.5 py-1 text-[10.5px] font-semibold text-navy/70">
              {item}
            </span>
          ))}
        </div>
        <span className="mt-1 rounded-full bg-gradient-to-r from-brand-violet to-brand-rose py-1.5 text-center text-[10.5px] font-semibold text-white">
          Demander à ELY
        </span>
      </div>
    ),
  },
  {
    titre: "Après la tournée",
    texte: "Vérifiez, transmettez, préparez demain.",
    couleur: "#e11d48",
    contenu: (
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-navy/40">Fin de journée</p>
        {["Transmissions", "Ordonnances", "Photos", "Matériel", "Préparation demain"].map((ligne) => (
          <p key={ligne} className="flex items-center justify-between px-0.5 py-0.5 text-[11px] font-semibold text-navy/70">
            {ligne}
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 text-teal">
              <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </p>
        ))}
        <p className="mt-1 rounded-lg bg-teal/10 py-2 text-center text-[11px] font-bold text-teal">Tout est à jour !</p>
      </div>
    ),
  },
];

export function JourneeAvecSoinely() {
  return (
    <section id="ely" className="mx-auto w-full max-w-[1180px] px-6 py-14 sm:py-20">
      <div className="mx-auto mb-12 max-w-[560px] text-center">
        <h2 className="mb-3 text-balance text-[26px] font-medium leading-tight sm:text-[32px]">
          Une journée avec SOINELY
        </h2>
        <p className="text-base leading-relaxed text-navy/60">S&apos;adapte à votre rythme, pas l&apos;inverse.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {ETAPES.map((etape, i) => (
          <div key={etape.titre} className="relative flex flex-col">
            <div className="mb-3 flex items-center gap-2.5">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
                style={{ background: etape.couleur }}
              >
                {i + 1}
              </span>
              <p className="text-[14.5px] font-semibold leading-tight">{etape.titre}</p>
            </div>
            <p className="mb-3 text-[12.5px] leading-snug text-navy/55">{etape.texte}</p>
            <div className="flex flex-1 flex-col rounded-2xl border border-navy/10 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,.04),0_12px_28px_-10px_rgba(15,23,42,.08)] transition-transform duration-300 hover:-translate-y-1">
              {etape.contenu}
            </div>
            {i < ETAPES.length - 1 && (
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="absolute -right-5 top-3 hidden h-5 w-5 text-navy/20 lg:block"
              >
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
