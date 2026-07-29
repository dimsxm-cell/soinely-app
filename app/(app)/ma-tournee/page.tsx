export default function MaTourneePage() {
  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10 sm:py-14">
        <div>
          <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]">
            Ma tournée
          </h1>
          <p className="mt-1.5 text-[14px] text-navy/50">
            Cette page est en cours de construction.
          </p>
        </div>

        {/* Volontairement vide : le contenu de cette page reste à définir.
            Y placer des éléments inventés donnerait une fausse idée de ce que
            l'application sait faire aujourd'hui. */}
        <section className="rounded-[18px] border border-dashed border-navy/20 bg-white/60 px-6 py-12 text-center">
          <p className="text-[15px] font-semibold text-navy/70">Rien à afficher pour le moment</p>
          <p className="mx-auto mt-2 max-w-[380px] text-[14px] leading-relaxed text-navy/50">
            Le contenu de cette page reste à définir. En attendant, les missions du jour se consultent
            depuis l&apos;accueil.
          </p>
        </section>
      </div>
    </main>
  );
}
