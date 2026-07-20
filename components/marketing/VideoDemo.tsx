const POINTS = ["Tournée optimisée", "Soins sécurisés", "Transmissions simplifiées", "Sérénité retrouvée"];

export function VideoDemo() {
  return (
    <section id="demo" className="px-6 pb-14 sm:pb-20">
      <div className="mx-auto w-full max-w-[1180px] overflow-hidden rounded-[28px] bg-gradient-to-br from-navy via-navy to-brand-violet px-7 py-10 text-white sm:px-12 sm:py-14">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="mb-4 inline-block rounded-full bg-white/10 px-3 py-1 text-[11.5px] font-bold uppercase tracking-wider">
              En 45 secondes
            </span>
            <h2 className="mb-3.5 text-balance font-display text-[26px] font-medium leading-tight sm:text-[30px]">
              Découvrez SOINELY en action
            </h2>
            <p className="mb-6 max-w-[46ch] text-[15px] leading-relaxed text-white/70">
              Voyez comment ELY vous accompagne à chaque étape de votre tournée — de la
              préparation du matin à la transmission du soir.
            </p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13.5px] font-medium text-white/85">
              {POINTS.map((point) => (
                <li key={point} className="flex items-center gap-2">
                  <span className="text-teal">✓</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            aria-label="Regarder la vidéo de démonstration (00:45)"
            className="group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-violet/50 to-black/40 ring-1 ring-white/15"
          >
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(236,72,153,0.35),transparent_60%)]" />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white text-navy shadow-lg transition-transform group-hover:scale-105">
              <svg viewBox="0 0 16 16" aria-hidden="true" className="ml-0.5 h-6 w-6">
                <path d="M4 2.5v11l9-5.5-9-5.5Z" fill="currentColor" />
              </svg>
            </span>
            <span className="absolute bottom-3 left-3 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-semibold">
              00:45
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
