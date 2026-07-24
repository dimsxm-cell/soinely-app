import Image from "next/image";

const AVANTAGES = ["Gain de temps", "Moins de stress", "Plus de disponibilité pour vos patients"];

const ETAPES = [
  {
    heure: "08h17",
    titre: "Embouteillage",
    contenu: (
      <>
        <div className="relative mb-2.5 h-[70px] overflow-hidden rounded-xl">
          <div className="traffic-zoom absolute inset-0 bg-gradient-to-br from-navy/85 via-navy/70 to-brand-violet/60" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_30%,rgba(255,255,255,.35)_48%,rgba(255,231,150,.5)_52%,transparent_68%)] bg-[length:260%_260%]" />
          <svg viewBox="0 0 24 24" aria-hidden="true" className="absolute inset-0 m-auto h-6 w-6 text-white/90">
            <path d="M5 17h14M5 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm14 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM3 17V9l2-5h10l4 5v8" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-[11px] font-bold text-brand-rose">+ 18 min de retard estimé</p>
        <p className="mt-auto text-[10.5px] leading-snug text-brand-violet">
          Pas d&apos;inquiétude : ELY veille et garde votre journée sereine.
        </p>
      </>
    ),
  },
  {
    heure: "08h18",
    titre: "Proposition d'ELY",
    contenu: (
      <>
        <div className="mb-2 flex justify-center">
          <Image src="/marketing/ely-mascot.png" alt="ELY" width={92} height={92} className="ely-bob h-[46px] w-[46px] rounded-full object-cover drop-shadow-[0_6px_14px_rgba(124,58,237,0.3)]" />
        </div>
        <p className="mb-1.5 text-[9.5px] font-bold uppercase tracking-wider text-navy/40">Nouvel ordre proposé</p>
        <div className="mb-auto flex flex-col gap-0.5">
          {["Mme Martin", "Mme Bernard", "M. Dupont", "Mme Louis"].map((nom) => (
            <p key={nom} className="text-[11.5px] font-semibold text-navy/75">
              → {nom}
            </p>
          ))}
        </div>
        <p className="mt-2.5 text-[11px] font-bold text-teal">Gain estimé : 18 min</p>
      </>
    ),
  },
  {
    heure: "08h18",
    titre: "Vous validez",
    contenu: (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal/15">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 text-teal">
            <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <p className="text-[12.5px] font-bold text-navy">Optimisation acceptée</p>
        <p className="text-[10.5px] text-navy/45">Tournée mise à jour</p>
      </div>
    ),
  },
  {
    heure: "08h19",
    titre: "Vous gagnez du temps",
    contenu: (
      <div className="flex flex-1 flex-col items-center justify-center gap-0.5 text-center">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="alarm-shake mb-1 h-7 w-7 text-brand-violet">
          <path d="M12 6v6l3 2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="13" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M5 3 2 6M22 6l-3-3M6 19l-2 2M18 19l2 2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
        <p className="text-[26px] font-extrabold tabular-nums leading-none text-brand-violet">18 min</p>
        <p className="text-[11.5px] font-semibold text-navy/75">Gagnées</p>
        <p className="text-[10px] text-navy/40">et votre journée reste fluide.</p>
      </div>
    ),
  },
];

export function EnTempsReel() {
  return (
    <section className="mx-auto w-full max-w-[1180px] px-6 pb-14 sm:pb-20">
      <div className="grid grid-cols-1 gap-10 rounded-[28px] border border-navy/5 bg-white p-7 shadow-[0_12px_40px_-16px_rgba(30,27,60,0.1)] sm:p-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div>
          <p className="mb-4 inline-block rounded-md bg-brand-violet/10 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-brand-violet">
            En temps réel
          </p>
          <h2 className="mb-4 text-balance text-[24px] font-medium leading-tight sm:text-[28px]">
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
            <div key={etape.heure + etape.titre} className="flex min-h-[220px] flex-col rounded-2xl border border-navy/10 bg-[#faf8ff] p-3.5">
              <p className="mb-2 text-[10.5px] font-bold tabular-nums text-navy/40">{etape.heure}</p>
              <p className="mb-2.5 text-[12.5px] font-bold text-navy">{etape.titre}</p>
              {etape.contenu}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
