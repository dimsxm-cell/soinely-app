const AVANTAGES = ["Gain de temps", "Moins de stress", "Plus de disponibilité pour vos patients"];

const ETAPES = [
  {
    heure: "08h17",
    titre: "Embouteillage",
    texte: "+18 min de retard estimé sur votre route.",
  },
  {
    heure: "08h18",
    titre: "Proposition d'ELY",
    texte: "Nouvel ordre proposé : Mme Martin, Mme Bernard, M. Dupont, Mme Louis.",
  },
  {
    heure: "08h18",
    titre: "Vous validez",
    texte: "Optimisation acceptée. Tournée mise à jour.",
  },
  {
    heure: "08h19",
    titre: "Vous gagnez du temps",
    texte: "18 min gagnées et votre journée reste fluide.",
  },
];

export function EnTempsReel() {
  return (
    <section className="bg-[#faf8ff] px-6 py-14 sm:py-20">
      <div className="mx-auto grid w-full max-w-[1180px] grid-cols-1 gap-10 rounded-[28px] border border-navy/5 bg-white p-7 shadow-[0_12px_40px_-16px_rgba(30,27,60,0.1)] sm:p-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div>
          <p className="mb-4 inline-block rounded-md bg-brand-violet/10 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-brand-violet">
            En temps réel
          </p>
          <h2 className="mb-3.5 text-balance text-[22px] font-extrabold leading-[1.15] tracking-tight sm:text-[26px]">
            Un imprévu survient…
            <br />
            <span className="text-brand-violet">ELY s&apos;occupe du reste.</span>
          </h2>
          <p className="mb-5 text-[14.5px] leading-relaxed text-navy/60">
            Trafic, urgence, annulation de patient… SOINELY réorganise, recalcule et vous
            propose toujours la meilleure option.
          </p>
          <ul className="flex flex-col gap-2.5">
            {AVANTAGES.map((avantage) => (
              <li key={avantage} className="flex items-center gap-2.5 text-[13.5px] font-semibold text-navy/75">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-brand-violet">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.2" fill="none" />
                  <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {avantage}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          {ETAPES.map((etape) => (
            <div key={etape.heure + etape.titre} className="rounded-2xl border border-navy/10 bg-white p-3.5">
              <p className="mb-2 text-[11px] font-bold tabular-nums text-navy/40">{etape.heure}</p>
              <p className="mb-2 text-[13.5px] font-extrabold text-navy">{etape.titre}</p>
              <p className="text-[11.5px] leading-relaxed text-navy/60">{etape.texte}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
