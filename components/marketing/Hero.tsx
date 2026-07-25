import Link from "next/link";
import Image from "next/image";

const POINTS_CLES = [
  "Tournées optimisées en temps réel",
  "Soins sécurisés et transmissions fiables",
  "Rappels intelligents : rien n'est oublié",
  "ELY, votre copilote IA disponible à tout moment",
];

const BADGES_CONFIANCE = [
  {
    texte: "Données sécurisées (HDS)",
    d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  },
  {
    texte: "Sans engagement",
    d: "M20 6 9 17l-5-5",
  },
  {
    texte: "Conçu par et pour les IDEL",
    d: "M12 21s-7-4.4-9.5-8.5C.5 9 2 5 5.5 5 7.8 5 9 6.5 12 9c3-2.5 4.2-4 6.5-4C22 5 23.5 9 21.5 12.5 19 16.6 12 21 12 21z",
  },
];

function IconeCheck() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[21px] w-[21px] shrink-0 text-brand-violet">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.2" fill="none" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#faf8ff] to-white">
      <div className="absolute inset-0 z-0">
        <Image src="/marketing/hero-nurse.webp" alt="" fill sizes="100vw" priority className="object-cover" />
      </div>
      <div className="absolute inset-0 z-[1] bg-[linear-gradient(100deg,#faf8ff_0%,rgba(250,248,255,.94)_32%,rgba(250,248,255,.7)_50%,rgba(250,248,255,.12)_100%)]" />
      <div className="relative z-[2] mx-auto grid w-full max-w-[1180px] grid-cols-1 items-center gap-14 px-6 py-14 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10">
        <div>
          <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-brand-violet/15 bg-brand-violet/[0.06] px-3.5 py-1.5 text-[13px] font-bold text-brand-violet">
            Conçu par des IDEL, pour des IDEL
            <span aria-hidden="true">💜</span>
          </span>

          <h1 className="mb-[22px] text-balance text-[38px] font-extrabold leading-[1.02] tracking-[-1.2px] sm:text-[62px] sm:tracking-[-2px]">
            Ne tournez
            <br />
            <span className="bg-gradient-to-r from-brand-violet via-purple-500 to-brand-rose bg-clip-text text-transparent">
              plus jamais seul.
            </span>
          </h1>

          <p className="mb-[26px] max-w-[440px] text-[18px] leading-[1.55] text-[#5a5570]">
            SOINELY est le copilote intelligent qui vous accompagne avant, pendant et après
            chaque soin. Pour une tournée plus fluide, plus sereine et du temps retrouvé.
          </p>

          <ul className="mb-[34px] flex flex-col gap-[13px]">
            {POINTS_CLES.map((point) => (
              <li key={point} className="flex items-center gap-2.5 text-[15.5px] font-semibold text-[#3d3956]">
                <IconeCheck />
                {point}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3.5">
            <Link
              href="/login"
              className="btn-lift inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-violet to-purple-500 px-6 py-3.5 text-[15px] font-bold text-white shadow-[0_10px_26px_-8px_rgba(124,58,237,0.55)]"
            >
              Essayer gratuitement
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <a
              href="#demo"
              className="btn-lift inline-flex items-center gap-2.5 rounded-full border-[1.5px] border-brand-violet/15 bg-white px-6 py-[15px] text-[15px] font-bold text-[#4b3f6b]"
            >
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-brand-violet/10">
                <svg viewBox="0 0 16 16" aria-hidden="true" className="ml-0.5 h-3.5 w-3.5">
                  <path d="M4 2.5v11l9-5.5-9-5.5Z" fill="#7c3aed" />
                </svg>
              </span>
              Voir la démo
            </a>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px] font-semibold text-navy/45">
            {BADGES_CONFIANCE.map((badge) => (
              <span key={badge.texte} className="inline-flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[15px] w-[15px] text-purple-500">
                  <path d={badge.d} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {badge.texte}
              </span>
            ))}
          </div>
        </div>

        <div className="relative sm:h-[560px]">
          <div className="slide-in-right mx-auto w-[264px] sm:absolute sm:right-0 sm:top-0 sm:mx-0">
            <div className="rounded-[42px] bg-[#111014] p-[9px] shadow-[0_26px_54px_-14px_rgba(30,27,60,0.35)]">
              <div className="relative overflow-hidden rounded-[34px] bg-[#f4f2f9] text-navy">
                <div className="flex items-center justify-between px-4 pt-3 text-[10.5px] font-semibold text-navy/70">
                  <span>9:41</span>
                  <span aria-hidden="true">●●● ▲ 🔋</span>
                </div>

                <div className="px-4 pb-4 pt-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10.5px] font-semibold text-navy/45">Bonjour</p>
                      <p className="flex items-center gap-1.5 text-[15px] font-extrabold leading-none tracking-tight">
                        Marie-Christine
                        <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-[radial-gradient(circle_at_50%_35%,#efe7fb,#fff)]">
                          <Image
                            src="/marketing/ely-avatar.png"
                            alt="ELY"
                            width={80}
                            height={80}
                            className="ely-wave h-[18px] w-[18px] object-cover"
                          />
                        </span>
                      </p>
                    </div>
                    <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white shadow-sm">
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[15px] w-[15px] text-brand-violet">
                        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>

                  <p className="mb-1.5 mt-3 text-[10px] font-bold text-navy/40">Aujourd&apos;hui</p>
                  <div className="mb-1.5 grid grid-cols-3 gap-1.5">
                    {[
                      ["18", "patients"],
                      ["31", "soins"],
                      ["42 km", "parcours"],
                    ].map(([valeur, label]) => (
                      <div key={label} className="rounded-xl bg-white p-2 text-center">
                        <p className="text-[15px] font-extrabold tabular-nums">{valeur}</p>
                        <p className="text-[8px] font-semibold text-navy/45">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mb-3 grid grid-cols-3 gap-1.5">
                    {[
                      ["10:55", "rappels"],
                      ["7h35", "estimée"],
                      ["···", ""],
                    ].map(([valeur, label]) => (
                      <div key={label} className="rounded-xl bg-white p-2 text-center">
                        <p className="text-[14px] font-extrabold tabular-nums text-brand-violet">{valeur}</p>
                        <p className="text-[8px] font-semibold text-navy/45">{label}</p>
                      </div>
                    ))}
                  </div>

                  <p className="mb-1.5 text-[10px] font-bold text-brand-violet">
                    Prochain patient dans 12 min
                  </p>

                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-[14px] font-extrabold leading-none">Mme Dupont</p>
                    <p className="mt-1 text-[11px] font-semibold text-navy/45">BSI + Injection</p>
                    <p className="mt-2 flex items-center gap-1.5 text-[10.5px] text-navy/60">
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3 shrink-0 text-purple-500">
                        <path d="M14 3v4a1 1 0 0 0 1 1h4" stroke="currentColor" strokeWidth="2" fill="none" />
                        <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2" fill="none" />
                      </svg>
                      Ordonnance à récupérer
                    </p>
                    <p className="mb-2.5 mt-1 flex items-center gap-1.5 text-[10.5px] text-navy/60">
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3 shrink-0 text-purple-500">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
                      </svg>
                      97190 Le Gosier
                    </p>
                    <div className="flex flex-col gap-1.5">
                      <span className="rounded-[11px] bg-gradient-to-r from-brand-violet to-purple-500 py-2 text-center text-[12px] font-bold text-white">
                        Ouvrir l&apos;itinéraire
                      </span>
                      <span className="rounded-[11px] bg-brand-violet/10 py-2 text-center text-[12px] font-bold text-brand-violet">
                        Démarrer le soin
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-around border-t border-navy/5 bg-white pb-3 pt-2 text-[7.5px] font-semibold">
                  {[
                    { l: "Accueil", active: false },
                    { l: "Tournée", active: false },
                    { l: "ELY", active: true },
                    { l: "Patients", active: false },
                    { l: "Menu", active: false },
                  ].map((tab) => (
                    <div key={tab.l} className="flex flex-col items-center gap-1">
                      {tab.active ? (
                        <span className="h-[16px] w-[16px] rounded-full bg-gradient-to-br from-brand-violet to-purple-500" />
                      ) : (
                        <span className="h-[14px] w-[14px] rounded-[5px] border-2 border-navy/20" />
                      )}
                      <span className={tab.active ? "text-brand-violet" : "text-navy/40"}>{tab.l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="slide-in-left mx-auto mt-6 w-[238px] rounded-[20px] border border-brand-violet/[0.08] bg-white p-4 text-left shadow-[0_20px_44px_-14px_rgba(109,40,217,0.28)] sm:absolute sm:bottom-[-30px] sm:left-0 sm:mx-0 sm:mt-0">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="flex h-[34px] w-[34px] items-center justify-center overflow-hidden rounded-full bg-[radial-gradient(circle_at_50%_35%,#efe7fb,#fff)]">
                  <Image src="/marketing/ely-mascot-1.webp" alt="ELY" width={51} height={68} className="h-[30px] w-[30px] object-contain" />
                </span>
                <span className="text-[16px] font-extrabold text-brand-violet">ELY</span>
              </span>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 text-navy/25">
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" />
              </svg>
            </div>
            <p className="mb-2.5 text-[12px] leading-relaxed text-navy/70">
              Un embouteillage est détecté sur votre route. Je peux réorganiser votre tournée
              et vous faire gagner <b>18 minutes</b>.
            </p>
            <span className="btn-lift mb-2 block rounded-[11px] bg-gradient-to-r from-brand-violet to-purple-500 py-2.5 text-center text-[12.5px] font-bold text-white">
              Optimiser ma tournée
            </span>
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-teal">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.2" fill="none" />
                <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Confiance IDEL
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
