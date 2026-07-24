const POINTS = [
  {
    l: "Tournée optimisée",
    d: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z M12 10.5a1 1 0 1 0 0-1 1 1 0 0 0 0 1z",
  },
  {
    l: "Soins sécurisés",
    d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  },
  {
    l: "Transmissions simplifiées",
    d: "m22 2-7 20-4-9-9-4z M22 2 11 13",
  },
  {
    l: "Sérénité retrouvée",
    d: "M12 21s-7-4.4-9.5-8.5C.5 9 2 5 5.5 5 7.8 5 9 6.5 12 9c3-2.5 4.2-4 6.5-4C22 5 23.5 9 21.5 12.5 19 16.6 12 21 12 21z",
  },
];

export function VideoDemo() {
  return (
    <section id="demo" className="px-6 pb-14 sm:pb-20">
      <div className="mx-auto w-full max-w-[1180px] overflow-hidden rounded-[26px] bg-gradient-to-br from-[#3b1e6e] via-[#5b21b6] to-[#8b2fb0] px-7 py-11 text-white sm:px-11 sm:py-11">
        <div className="grid grid-cols-1 items-center gap-9 lg:grid-cols-[0.85fr_1.5fr_0.7fr]">
          <div>
            <span className="mb-4 inline-block rounded-md bg-white/15 px-2.5 py-1.5 text-[10.5px] font-extrabold uppercase tracking-wider">
              En 45 secondes
            </span>
            <h2 className="mb-3.5 text-balance font-display text-[26px] font-medium leading-tight sm:text-[30px]">
              Découvrez SOINELY en action
            </h2>
            <p className="mb-5 text-[14px] leading-relaxed text-white/75">
              Voyez comment ELY vous accompagne à chaque étape de votre tournée.
            </p>
            <button
              type="button"
              aria-label="Regarder la vidéo de démonstration (00:45)"
              className="btn-sheen inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/[0.14] px-5 py-3 text-[14px] font-bold text-white"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[15px] w-[15px]">
                <path d="M8 5v14l11-7z" fill="currentColor" />
              </svg>
              Regarder la vidéo <span className="opacity-70">00:45</span>
            </button>
          </div>

          <button
            type="button"
            aria-label="Regarder la vidéo de démonstration"
            className="group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-violet/60 to-black/40 ring-1 ring-white/15"
          >
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(236,72,153,0.35),transparent_60%)]" />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-brand-violet shadow-lg transition-transform group-hover:scale-105">
              <svg viewBox="0 0 16 16" aria-hidden="true" className="ml-0.5 h-6 w-6">
                <path d="M4 2.5v11l9-5.5-9-5.5Z" fill="currentColor" />
              </svg>
            </span>
          </button>

          <ul className="flex flex-col gap-4">
            {POINTS.map((point) => (
              <li key={point.l} className="flex items-center gap-2.5 text-[13.5px] font-semibold text-white">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-white/15">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[17px] w-[17px]">
                    <path d={point.d} stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {point.l}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
