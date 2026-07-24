import Link from "next/link";
import Image from "next/image";

const AVANTAGES = [
  {
    titre: "Soyez les premiers",
    texte: "Soyez parmi les premiers à façonner SOINELY. Votre avis compte pour construire l'outil qui vous ressemble.",
    d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  },
  {
    titre: "Accès exclusif",
    texte: "Testez, explorez et profitez des nouveautés en avant-première.",
    d: "m12 2 2.4 7.4H22l-6 4.4 2.3 7.2L12 16.6 5.7 21l2.3-7.2-6-4.4h7.6z",
  },
  {
    titre: "Accompagnement privilégié",
    texte: "Une équipe à votre écoute, proche de votre quotidien.",
    d: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z",
  },
];

export function ListeAttente() {
  return (
    <section id="liste-attente" className="px-6 pb-20 sm:pb-28">
      <div className="relative mx-auto grid w-full max-w-[1180px] grid-cols-1 items-center gap-8 overflow-hidden rounded-[26px] bg-gradient-to-br from-[#4c1d95] via-brand-violet via-40% to-[#ec4899] px-7 py-11 text-white sm:grid-cols-[0.55fr_1.2fr] sm:px-11 sm:py-11 lg:grid-cols-[0.5fr_1.15fr_repeat(3,0.72fr)]">
        <span className="mx-auto hidden h-[130px] w-[130px] overflow-hidden rounded-[20px] ring-4 ring-white/20 lg:block">
          <Image
            src="/marketing/ely-mascot.png"
            alt="ELY"
            width={400}
            height={400}
            className="h-full w-full object-cover"
          />
        </span>

        <div className="text-center sm:text-left">
          <h2 className="mb-1.5 text-balance font-display text-[26px] font-medium leading-[1.15] sm:text-[28px]">
            Rejoignez les 100 premiers IDEL testeurs
          </h2>
          <p className="mb-4 text-[14px] font-semibold text-white/80">Bêta privée · Ouverture bientôt</p>
          <Link
            href="/login"
            className="btn-sheen mb-3 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-[15px] font-extrabold text-brand-violet shadow-lg"
          >
            Rejoindre la liste d&apos;attente
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[17px] w-[17px]">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <p className="text-[12px] font-semibold text-white/75">100% gratuit · Sans engagement</p>
        </div>

        {AVANTAGES.map((avantage) => (
          <div key={avantage.titre} className="text-center">
            <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                <path d={avantage.d} stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <p className="mb-1.5 text-[13.5px] font-extrabold">{avantage.titre}</p>
            <p className="text-[11.5px] leading-relaxed text-white/80">{avantage.texte}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
