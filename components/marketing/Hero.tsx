import Link from "next/link";

const POINTS_CLES = [
  "Tournées optimisées en temps réel",
  "Soins sécurisés et transmissions simplifiées",
  "Rappels intelligents : rien n'est oublié",
  "ELY, votre copilote IA disponible à tout moment",
];

function IconeCheck() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5 shrink-0 text-teal">
      <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.15" />
      <path d="M6 10.3l2.6 2.6L14 7.3" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Hero() {
  return (
    <section className="mx-auto grid w-full max-w-[1180px] grid-cols-1 items-center gap-14 px-6 py-14 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10">
      <div>
        <span className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-brand-rose/10 px-3.5 py-1.5 text-[13px] font-semibold text-brand-violet">
          Conçu par des IDEL, pour des IDEL
          <span aria-hidden="true">💜</span>
        </span>

        <h1 className="mb-5 text-balance font-display text-[38px] font-medium leading-[1.08] tracking-tight sm:text-[52px]">
          Ne tournez
          <br />
          <span className="bg-gradient-to-r from-brand-violet to-brand-rose bg-clip-text text-transparent">
            plus jamais seul.
          </span>
        </h1>

        <p className="mb-7 max-w-[48ch] text-lg leading-relaxed text-navy/65">
          SOINELY est le copilote intelligent qui vous accompagne avant, pendant et après
          chaque soin. Pour une tournée plus fluide, plus sereine, et du temps retrouvé.
        </p>

        <ul className="mb-8 flex flex-col gap-3">
          {POINTS_CLES.map((point) => (
            <li key={point} className="flex items-center gap-2.5 text-[15px] text-navy/80">
              <IconeCheck />
              {point}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-3.5">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-violet to-brand-rose px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(124,58,237,0.55)] transition-transform hover:scale-[1.02]"
          >
            Essayer gratuitement
          </Link>
          <a
            href="#demo"
            className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-white px-6 py-3.5 text-[15px] font-semibold text-navy transition-colors hover:bg-navy/5"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5">
              <path d="M4 2.5v11l9-5.5-9-5.5Z" fill="currentColor" />
            </svg>
            Voir la démo
          </a>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] font-medium text-navy/50">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true">🛡️</span> Données sécurisées HDS
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true">🚫</span> Sans engagement
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true">💜</span> Conçu par des IDEL
          </span>
        </div>
      </div>

      <div className="relative">
        <div className="mx-auto max-w-[300px] rounded-[36px] border border-navy/10 bg-navy p-2.5 shadow-[0_30px_60px_-20px_rgba(15,23,42,0.35)]">
          <div className="overflow-hidden rounded-[26px] bg-[#F6F7F5] text-navy">
            <div className="flex items-center justify-between px-4 pt-3 text-[10.5px] font-semibold text-navy/70">
              <span>9:41</span>
              <span aria-hidden="true">●●● ▲ 🔋</span>
            </div>

            <div className="px-4 pb-5 pt-3">
              <p className="text-[15px] font-semibold">
                Bonjour Marie-Christine <span aria-hidden="true">👋</span>
              </p>
              <p className="mt-2 text-[10.5px] font-bold uppercase tracking-wider text-navy/40">Aujourd&apos;hui</p>

              <div className="mt-2 grid grid-cols-3 gap-2">
                {[
                  ["18", "patients"],
                  ["31", "soins"],
                  ["42 km", "parcours"],
                ].map(([valeur, label]) => (
                  <div key={label} className="rounded-xl bg-white p-2.5 text-center shadow-sm">
                    <p className="text-[15px] font-bold tabular-nums">{valeur}</p>
                    <p className="text-[9px] text-navy/50">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  ["10:55", "rappels"],
                  ["7h35", "estimé"],
                ].map(([valeur, label]) => (
                  <div key={label} className="rounded-xl bg-white p-2.5 text-center shadow-sm">
                    <p className="text-[15px] font-bold tabular-nums">{valeur}</p>
                    <p className="text-[9px] text-navy/50">{label}</p>
                  </div>
                ))}
              </div>

              <p className="mt-3.5 text-[10px] font-semibold text-brand-violet">
                Prochain patient dans 12 min
              </p>

              <div className="mt-2 rounded-2xl border border-navy/10 bg-white p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[13.5px] font-bold">Mme Dupont</p>
                  <span className="rounded-full bg-brand-rose/10 px-2 py-0.5 text-[9px] font-semibold text-brand-violet">
                    BSI + Injection
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-navy/50">97190 Le Gosier</p>
                <p className="mt-1.5 text-[10.5px] text-[#B4790C]">📋 Ordonnance à récupérer</p>
                <div className="mt-2.5 flex gap-1.5">
                  <span className="flex-1 rounded-full border border-navy/15 py-1.5 text-center text-[10.5px] font-semibold">
                    Ouvrir l&apos;itinéraire
                  </span>
                  <span className="flex-1 rounded-full bg-gradient-to-r from-brand-violet to-brand-rose py-1.5 text-center text-[10.5px] font-semibold text-white">
                    Démarrer le soin
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-around border-t border-navy/10 bg-white py-2.5 text-[8.5px] font-medium text-navy/40">
              <span>Accueil</span>
              <span>Tournée</span>
              <span className="-mt-4 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-brand-violet to-brand-rose text-white shadow">
                +
              </span>
              <span>Patients</span>
              <span>Plus</span>
            </div>
          </div>
        </div>

        <div className="absolute -right-2 top-8 hidden w-[220px] rounded-2xl border border-navy/10 bg-white p-3.5 text-left shadow-[0_18px_40px_-12px_rgba(15,23,42,0.25)] sm:block">
          <p className="flex items-center gap-1.5 text-[12px] font-bold text-brand-violet">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-brand-violet to-brand-rose text-[10px] text-white">
              E
            </span>
            ELY
          </p>
          <p className="mt-1.5 text-[11.5px] leading-snug text-navy/70">
            Un embouteillage est détecté sur votre route. Je peux réorganiser votre tournée
            et vous faire gagner 18 minutes.
          </p>
          <span className="mt-2 inline-block rounded-full bg-gradient-to-r from-brand-violet to-brand-rose px-2.5 py-1.5 text-[10.5px] font-semibold text-white">
            Optimiser ma tournée
          </span>
          <p className="mt-1.5 text-[9.5px] font-semibold text-teal">✓ Confiance IDEL</p>
        </div>
      </div>
    </section>
  );
}
