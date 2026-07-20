const ETAPES = [
  {
    titre: "Avant la tournée",
    texte: "Préparez votre journée et anticipez l'essentiel.",
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
    contenu: (
      <div className="flex flex-col gap-2">
        <div className="rounded-lg border border-[#f3d9a6] bg-[#FDF1DD] p-2.5">
          <p className="text-[10.5px] font-bold text-[#B4790C]">🚧 Embouteillage détecté</p>
          <p className="text-[10.5px] text-[#B4790C]/80">+18 min de retard</p>
        </div>
        <p className="text-[11px] text-navy/60">Souhaitez-vous optimiser la tournée ?</p>
        <div className="flex gap-1.5">
          <span className="flex-1 rounded-full bg-gradient-to-r from-brand-violet to-brand-rose py-1.5 text-center text-[10.5px] font-semibold text-white">
            Optimiser
          </span>
          <span className="flex-1 rounded-full border border-navy/15 py-1.5 text-center text-[10.5px] font-semibold text-navy/70">
            Plus tard
          </span>
        </div>
      </div>
    ),
  },
  {
    titre: "Pendant le soin",
    texte: "Tout ce qu'il vous faut, sans quitter votre patient.",
    contenu: (
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-navy/40">Soin en cours — BSI</p>
        <div className="grid grid-cols-2 gap-1.5 text-[10.5px] text-navy/70">
          {["📋 Protocole", "🧮 Calculateur", "📸 Photo", "✍️ Transmission"].map((item) => (
            <span key={item} className="rounded-lg bg-navy/[0.035] px-2 py-1.5">
              {item}
            </span>
          ))}
        </div>
        <span className="rounded-full bg-gradient-to-r from-brand-violet to-brand-rose py-1.5 text-center text-[10.5px] font-semibold text-white">
          Demander à ELY
        </span>
      </div>
    ),
  },
  {
    titre: "Après la tournée",
    texte: "Vérifiez, transmettez, préparez demain.",
    contenu: (
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-navy/40">Fin de journée</p>
        {["Transmissions", "Ordonnances", "Photos", "Préparation demain"].map((ligne) => (
          <p key={ligne} className="flex items-center justify-between rounded-lg bg-navy/[0.035] px-2.5 py-1.5 text-[11px] text-navy/70">
            {ligne}
            <span className="text-teal">✓</span>
          </p>
        ))}
        <p className="mt-0.5 text-center text-[11px] font-semibold text-teal">Tout est à jour !</p>
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
          <div key={etape.titre} className="relative">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-violet to-brand-rose text-[13px] font-bold text-white">
                {i + 1}
              </span>
              <p className="text-[14.5px] font-semibold leading-tight">{etape.titre}</p>
            </div>
            <p className="mb-3 text-[12.5px] leading-snug text-navy/55">{etape.texte}</p>
            <div className="rounded-2xl border border-navy/10 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,.04),0_12px_28px_-10px_rgba(15,23,42,.08)]">
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
