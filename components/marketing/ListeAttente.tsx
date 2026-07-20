import Link from "next/link";
import { MascotteEly } from "./MascotteEly";

const AVANTAGES = [
  {
    icone: "🚀",
    texte: "Soyez parmi les premiers à faire évoluer l'outil qui vous ressemble.",
  },
  {
    icone: "✨",
    texte: "Accédez à des fonctionnalités exclusives, testez et profitez des nouveautés en avant-première.",
  },
  {
    icone: "💜",
    texte: "Accompagnement privilégié : une équipe à votre écoute, proche de votre quotidien.",
  },
];

export function ListeAttente() {
  return (
    <section id="liste-attente" className="px-6 pb-20 sm:pb-28">
      <div className="relative mx-auto w-full max-w-[1180px] overflow-hidden rounded-[28px] bg-gradient-to-br from-navy to-brand-violet px-7 py-12 text-center text-white sm:px-14 sm:py-16">
        <MascotteEly className="pointer-events-none absolute -left-2 bottom-0 hidden h-40 w-40 opacity-90 sm:block" />

        <span className="mb-4 inline-block rounded-full bg-white/10 px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-wider">
          Bêta privée · Ouverture bientôt
        </span>
        <h2 className="mx-auto mb-10 max-w-[26ch] text-balance font-display text-[28px] font-medium leading-tight sm:text-[34px]">
          Rejoignez les 100 premiers IDEL testeurs
        </h2>

        <div className="mx-auto mb-10 grid max-w-[880px] grid-cols-1 gap-8 sm:grid-cols-3">
          {AVANTAGES.map((avantage) => (
            <div key={avantage.texte} className="flex flex-col items-center gap-2.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl">
                {avantage.icone}
              </span>
              <p className="text-[13.5px] leading-relaxed text-white/80">{avantage.texte}</p>
            </div>
          ))}
        </div>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[15px] font-semibold text-navy shadow-lg transition-transform hover:scale-[1.02]"
        >
          Rejoindre la liste d&apos;attente
        </Link>
        <p className="mt-4 text-[13px] font-medium text-white/60">100% gratuit · Sans engagement</p>
      </div>
    </section>
  );
}
