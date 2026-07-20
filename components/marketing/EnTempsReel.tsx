const AVANTAGES = ["Moins de temps", "Moins de stress", "Plus de disponibilité pour vos patients"];

const ETAPES = [
  {
    heure: "08:17",
    titre: "Embouteillage",
    contenu: (
      <div className="flex h-16 items-center justify-center rounded-lg bg-gradient-to-br from-navy/80 to-navy text-2xl">
        🚗
      </div>
    ),
  },
  {
    heure: "08:18",
    titre: "Proposition d'ELY",
    contenu: (
      <div className="flex flex-col gap-1">
        <p className="text-[9.5px] font-bold uppercase tracking-wider text-navy/40">Nouvel ordre proposé</p>
        {["Mme Martin", "Mme Bernard", "M. Dupont", "Mme Louis"].map((nom) => (
          <p key={nom} className="flex items-center justify-between text-[11px] text-navy/70">
            {nom}
            <span className="text-teal">✓</span>
          </p>
        ))}
        <p className="mt-1 text-[10.5px] font-semibold text-brand-violet">Gain estimé : 18 min</p>
      </div>
    ),
  },
  {
    heure: "08:18",
    titre: "Vous validez",
    contenu: (
      <div className="flex h-16 flex-col items-center justify-center gap-1">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal/15 text-lg text-teal">✓</span>
        <p className="text-[11px] font-semibold text-navy">Optimisation acceptée</p>
        <p className="text-[10px] text-navy/45">Tournée mise à jour</p>
      </div>
    ),
  },
  {
    heure: "08:19",
    titre: "Vous gagnez du temps",
    contenu: (
      <div className="flex h-16 flex-col items-center justify-center gap-0.5">
        <p className="text-lg font-bold tabular-nums text-brand-violet">18 min</p>
        <p className="text-[10px] font-semibold text-navy/60">Gagnées</p>
        <p className="text-[9.5px] text-navy/40">et votre journée reste fluide</p>
      </div>
    ),
  },
];

export function EnTempsReel() {
  return (
    <section className="mx-auto w-full max-w-[1180px] px-6 pb-14 sm:pb-20">
      <div className="grid grid-cols-1 gap-10 rounded-[28px] border border-navy/5 bg-white p-7 sm:p-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div>
          <p className="mb-3 text-[12.5px] font-bold uppercase tracking-wider text-brand-violet">En temps réel</p>
          <h2 className="mb-4 text-balance text-[24px] font-medium leading-tight sm:text-[28px]">
            Un imprévu survient…
            <br />
            ELY s&apos;occupe du reste.
          </h2>
          <p className="mb-5 text-[14.5px] leading-relaxed text-navy/60">
            Trafic, urgence, annulation patient... SOINELY réorganise et vous propose toujours
            la meilleure solution.
          </p>
          <ul className="flex flex-col gap-2">
            {AVANTAGES.map((avantage) => (
              <li key={avantage} className="flex items-center gap-2 text-[13.5px] font-medium text-navy/75">
                <span className="text-teal">✓</span>
                {avantage}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ETAPES.map((etape, i) => (
            <div key={etape.heure + etape.titre} className="relative">
              <div className="rounded-2xl border border-navy/10 bg-[#F6F7F5] p-3">
                <p className="mb-2 text-[10px] font-bold tabular-nums text-navy/40">{etape.heure}</p>
                <p className="mb-2 text-[12px] font-semibold text-navy">{etape.titre}</p>
                {etape.contenu}
              </div>
              {i < ETAPES.length - 1 && (
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="absolute -right-3.5 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-navy/20 sm:block"
                >
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
