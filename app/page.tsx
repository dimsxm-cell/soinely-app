import Link from "next/link";

export default function Page() {
  return (
    <main className="flex flex-col bg-[#F6F7F5] text-navy">
      <nav className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="inline-block h-[9px] w-[9px] rounded-full bg-teal" />
          Soinely
        </div>
        <Link
          href="/login"
          className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-[#F6F7F5] whitespace-nowrap"
        >
          Créer mon compte
        </Link>
      </nav>

      <section className="mx-auto grid w-full max-w-[1120px] grid-cols-1 items-center gap-10 px-6 py-3 sm:py-10 md:grid-cols-[1.05fr_0.95fr] md:gap-14 md:py-16">
        <div>
          <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-teal/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#0E7E70]">
            Fait par une IDEL, pour les IDEL
          </span>
          <h1 className="mb-5 text-balance font-display text-[34px] font-medium leading-[1.08] tracking-tight sm:text-[46px]">
            Le temps que vous <em className="text-[#0E7E70]">rendent</em> vos transmissions.
          </h1>
          <p className="mb-7 max-w-[46ch] text-lg leading-relaxed text-navy/70">
            Soinely retient ce qui s&apos;est passé à la dernière visite — transmission, rappel,
            photo de suivi — pour que vous n&apos;ayez plus à le reconstituer de mémoire, ni à
            tout ressaisir le soir. Une tournée de moins sur papier, une tournée de plus
            avec vos patients.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-navy px-5 py-3.5 text-[15px] font-semibold text-[#F6F7F5]"
            >
              Créer mon compte
              <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]">
                <path
                  d="M3 8h10M9 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <span className="text-[13px] text-navy/45">En développement — premières tournées bientôt.</span>
          </div>
          <div className="mt-10 flex gap-6 border-t border-navy/10 pt-6">
            <div className="flex-1">
              <div className="text-[22px] font-bold tabular-nums">0 double saisie</div>
              <div className="mt-0.5 text-[12.5px] leading-snug text-navy/45">
                écrit une fois pendant la visite, jamais recopié le soir
              </div>
            </div>
            <div className="flex-1">
              <div className="text-[22px] font-bold tabular-nums">1 tap</div>
              <div className="mt-0.5 text-[12.5px] leading-snug text-navy/45">
                pour retrouver le patient suivant de la tournée
              </div>
            </div>
            <div className="flex-1">
              <div className="text-[22px] font-bold tabular-nums">100% mobile</div>
              <div className="mt-0.5 text-[12.5px] leading-snug text-navy/45">
                pensé pour être rempli entre deux visites, pas au bureau
              </div>
            </div>
          </div>
        </div>

        <div className="relative rounded-[32px] bg-gradient-to-b from-teal/10 to-transparent px-6 pt-8">
          <div className="mx-auto max-w-[320px] -rotate-[1.2deg] rounded-3xl border border-navy/10 bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,.04),0_18px_40px_rgba(15,23,42,.08)]">
            <div className="overflow-hidden rounded-[18px] bg-white text-[12.5px] text-navy">
              <div className="flex flex-col gap-3 px-3.5 pb-5 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] text-primary">‹ Ma journée</span>
                  <span className="rounded-full bg-navy/5 px-2.5 py-1 text-[10px] font-semibold">Terminée</span>
                </div>
                <div>
                  <p className="mt-0.5 text-[15px] font-bold">
                    Mme Dupont <span className="text-[11px] font-normal text-navy/55">76 ans</span>
                  </p>
                  <p className="mt-px text-[11.5px] text-navy/55">08:30</p>
                </div>
                <div className="rounded-[13px] border border-[#f3d9a6] bg-[#FDF1DD] p-2.5">
                  <p className="text-[9.5px] font-bold uppercase tracking-wide text-[#B4790C]">
                    Rappel de la dernière visite
                  </p>
                  <p className="mt-0.5 text-xs leading-snug">Vérifier la cicatrisation à la prochaine visite.</p>
                </div>
                <div className="rounded-[13px] border border-navy/10 bg-navy/[0.035] p-2.5">
                  <p className="text-[9.5px] font-bold uppercase tracking-wide text-navy/50">Dernière transmission</p>
                  <p className="mt-0.5 text-xs leading-snug">Pansement refait, légère rougeur à surveiller.</p>
                </div>
                <div className="rounded-[13px] border border-navy/10 bg-white p-2.5">
                  <p className="text-[9.5px] font-bold uppercase tracking-wide text-navy/50">Patient suivant</p>
                  <p className="mt-0.5 text-xs leading-snug">M. Lefèvre · 09:15</p>
                  <span className="mt-2 inline-block rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-white">
                    Voir la fiche
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -right-1.5 top-2 hidden items-center gap-2 rounded-2xl border border-navy/10 bg-white px-3.5 py-2.5 text-xs font-semibold shadow-[0_1px_2px_rgba(15,23,42,.04),0_18px_40px_rgba(15,23,42,.08)] sm:flex">
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-teal/10 text-xs">📸</span>
            Photo jointe
          </div>
          <div className="absolute -left-[18px] bottom-7 hidden items-center gap-2 rounded-2xl border border-navy/10 bg-white px-3.5 py-2.5 text-xs font-semibold shadow-[0_1px_2px_rgba(15,23,42,.04),0_18px_40px_rgba(15,23,42,.08)] sm:flex">
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#FDF1DD] text-xs">✓</span>
            Écrit une fois
          </div>
        </div>
      </section>

      <section className="bg-navy py-14 text-[#F6F7F5]">
        <div className="mx-auto grid w-full max-w-[1120px] grid-cols-1 items-center gap-6 px-6 md:grid-cols-2 md:gap-10">
          <h2 className="text-balance font-display text-[28px] font-medium leading-tight">
            Vous avez déjà tout ça en tête en sortant d&apos;une visite. Le problème, c&apos;est de le
            retrouver à la prochaine.
          </h2>
          <p className="text-[15.5px] leading-relaxed text-[#F6F7F5]/70">
            Post-its, carnet, mémoire — et le soir, tout reformuler pour la collègue ou pour
            vous-même trois jours plus tard. Soinely garde la dernière transmission, le
            rappel laissé et la photo de suivi directement sur la fiche du patient, prêts
            à relire avant de sonner à la porte.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1120px] px-6 py-16 sm:py-20">
        <div className="mb-10 max-w-[560px] sm:mb-12">
          <p className="mb-3 text-[12.5px] font-bold uppercase tracking-wider text-[#0E7E70]">
            Ce que ça change, visite par visite
          </p>
          <h2 className="mb-3.5 text-balance text-[26px] font-medium leading-tight sm:text-[32px]">
            Trois choses que vous écrivez une fois — jamais deux.
          </h2>
          <p className="text-base leading-relaxed text-navy/70">
            Chacune remplace un geste que vous faites déjà de mémoire ou sur papier, sans rien
            ajouter à votre tournée.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[20px] border border-navy/10 bg-navy/10 md:grid-cols-3">
          <div className="bg-white p-7">
            <p className="mb-3.5 font-display text-[15px] italic text-[#0E7E70]">— Transmission</p>
            <h3 className="mb-2.5 text-lg font-semibold">Toujours la dernière sous les yeux</h3>
            <p className="text-[14.5px] leading-relaxed text-navy/70">
              La note laissée à la visite précédente s&apos;affiche automatiquement dès que vous
              ouvrez la fiche — avant même de sonner.
            </p>
            <p className="mt-4 border-t border-dashed border-navy/10 pt-3.5 text-[13px] text-navy/45">
              <b className="font-semibold text-navy/70">Avant :</b> se souvenir, ou rappeler la
              collègue de la veille.
            </p>
          </div>
          <div className="bg-white p-7">
            <p className="mb-3.5 font-display text-[15px] italic text-[#0E7E70]">— Rappel</p>
            <h3 className="mb-2.5 text-lg font-semibold">Une note qui vous attend au bon moment</h3>
            <p className="text-[14.5px] leading-relaxed text-navy/70">
              « Vérifier la cicatrisation dans 3 jours » écrit aujourd&apos;hui, remonté tout seul
              à la prochaine visite chez ce patient.
            </p>
            <p className="mt-4 border-t border-dashed border-navy/10 pt-3.5 text-[13px] text-navy/45">
              <b className="font-semibold text-navy/70">Avant :</b> un post-it perdu dans le sac de
              soins.
            </p>
          </div>
          <div className="bg-white p-7">
            <p className="mb-3.5 font-display text-[15px] italic text-[#0E7E70]">— Photo</p>
            <h3 className="mb-2.5 text-lg font-semibold">L&apos;évolution d&apos;une plaie, en un coup d&apos;œil</h3>
            <p className="text-[14.5px] leading-relaxed text-navy/70">
              Une photo par visite, comparée automatiquement à la précédente — stockée, jamais
              partagée sans y être autorisé.
            </p>
            <p className="mt-4 border-t border-dashed border-navy/10 pt-3.5 text-[13px] text-navy/45">
              <b className="font-semibold text-navy/70">Avant :</b> décrire une plaie de mémoire, ou
              ne pas la comparer du tout.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1120px] px-6 pb-16 sm:pb-20">
        <div className="mb-10 max-w-[560px] sm:mb-12">
          <p className="mb-3 text-[12.5px] font-bold uppercase tracking-wider text-[#0E7E70]">
            Une tournée, avec Soinely
          </p>
          <h2 className="text-balance text-[26px] font-medium leading-tight sm:text-[32px]">
            Ce que ça change entre 8h et 18h.
          </h2>
        </div>

        <div className="flex flex-col">
          {[
            {
              heure: "08:30",
              titre: "Arrivée chez Mme Dupont",
              texte:
                "La fiche s'ouvre déjà sur ce qui compte : allergie, dernière transmission, rappel laissé la semaine passée.",
              tag: "0 recherche dans le carnet",
            },
            {
              heure: "08:52",
              titre: "Fin de la visite",
              texte:
                "Transmission écrite en 20 secondes, photo du pansement prise avec le téléphone, rappel laissé pour la prochaine fois.",
              tag: "Écrit une fois, sur place",
            },
            {
              heure: "08:53",
              titre: "Direction la visite suivante",
              texte:
                "Un tap sur « Patient suivant » ouvre directement la fiche de M. Lefèvre — plus besoin de revenir à la liste.",
              tag: "1 tap pour enchaîner",
            },
            {
              heure: "18:15",
              titre: "Fin de journée",
              texte:
                "Rien à ressaisir. Tout ce qui a été noté en visite est déjà là — pour vous, et pour la prochaine tournée sur ce patient.",
              tag: "Aucune double saisie le soir",
            },
          ].map((item, i, arr) => (
            <div
              key={item.heure}
              className={`grid grid-cols-[64px_1fr] gap-6 border-t border-navy/10 py-5 sm:grid-cols-[84px_1fr] ${
                i === arr.length - 1 ? "border-b" : ""
              }`}
            >
              <div className="pt-0.5 text-[13px] font-bold tabular-nums text-navy/45">{item.heure}</div>
              <div>
                <h4 className="mb-1 text-[15.5px] font-semibold">{item.titre}</h4>
                <p className="text-sm leading-relaxed text-navy/70">{item.texte}</p>
                <span className="mt-2 inline-block rounded-full bg-teal/10 px-2.5 py-1 text-[11.5px] font-semibold text-[#0E7E70]">
                  {item.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-6 mb-16 rounded-[28px] bg-teal/10 px-6 py-10 text-center sm:mx-auto sm:mb-24 sm:w-full sm:max-w-[1120px] sm:px-11 sm:py-14">
        <h2 className="mb-3.5 text-balance font-display text-2xl font-medium sm:text-[30px]">
          Construit en tournée réelle, pas en salle de réunion.
        </h2>
        <p className="mx-auto mb-6 max-w-[46ch] text-[15.5px] leading-relaxed text-navy/70">
          Soinely est développé avec des IDEL, pour être utilisable pendant la visite — pas
          après. Les premières tournées pilotes arrivent bientôt.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-full bg-navy px-5 py-3.5 text-[15px] font-semibold text-[#F6F7F5]"
        >
          Créer mon compte
        </Link>
      </section>

      <footer className="px-6 py-8 text-center text-[12.5px] text-navy/45">
        Soinely — outil de coordination pour infirmières à domicile. En développement.
      </footer>
    </main>
  );
}
