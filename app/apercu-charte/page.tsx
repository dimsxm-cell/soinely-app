// Page d'aperçu temporaire, destinée à trancher deux questions de charte :
// le sort du rose, et la forme du logo. Elle n'est pas protégée par le proxy
// et n'a pas vocation à rester — elle sera retirée une fois la décision prise.

const VARIANTES = [
  {
    cle: "actuel",
    titre: "Aujourd'hui",
    detail: "violet #7C3AED vers rose #EC4899",
    degrade: "linear-gradient(to right, #7C3AED, #EC4899)",
    aplat: "#7C3AED",
  },
  {
    cle: "aplat",
    titre: "Charte — aplat",
    detail: "violet #6A4CFF, sans dégradé",
    degrade: "#6A4CFF",
    aplat: "#6A4CFF",
  },
  {
    cle: "degrade",
    titre: "Charte — dégradé",
    detail: "violet #6A4CFF vers lavande #A78BFA",
    degrade: "linear-gradient(to right, #6A4CFF, #A78BFA)",
    aplat: "#6A4CFF",
  },
];

function CoeurCroix({ taille = 40, couleur = "#6A4CFF" }: { taille?: number; couleur?: string }) {
  return (
    <svg viewBox="0 0 48 48" width={taille} height={taille} aria-hidden="true">
      <path
        d="M24 42S5 29.5 5 17.6C5 11.2 9.9 6 16 6c3.7 0 7 1.9 8 4.8C25 7.9 28.3 6 32 6c6.1 0 11 5.2 11 11.6C43 29.5 24 42 24 42Z"
        fill={couleur}
      />
      <path d="M30 12h6v5h5v6h-5v5h-6v-5h-5v-6h5v-5Z" fill="#FFFFFF" />
    </svg>
  );
}

export default function ApercuChartePage() {
  return (
    <main className="min-h-screen bg-[#F6F7F5] px-6 py-10 text-[#0F172A]">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="font-display text-[30px] font-semibold leading-tight tracking-tight">
          Aperçu de la charte
        </h1>
        <p className="mt-2 max-w-[54ch] text-[15px] leading-relaxed text-[#64748B]">
          Deux décisions à prendre. Les mêmes éléments sont rendus dans chaque
          traitement possible, aux tailles réelles de l&apos;application.
        </p>

        {/* ── 1. Le rose ─────────────────────────────────────────────── */}
        <section className="mt-10">
          <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-[#64748B]">
            1 · Le dégradé, présent 19 fois à l&apos;identique
          </h2>
          <p className="mt-1.5 max-w-[54ch] text-[14px] leading-relaxed text-[#64748B]">
            Un seul motif, <code className="text-[13px]">violet vers rose</code>, porte tous
            les boutons principaux, la barre de progression de la tournée et le
            bouton central de navigation. Le remplacer se fait d&apos;un geste.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {VARIANTES.map((v) => (
              <div
                key={v.cle}
                className="rounded-[16px] border border-[#0F172A]/10 bg-white p-5"
              >
                <p className="text-[14px] font-semibold">{v.titre}</p>
                <p className="mt-0.5 text-[12.5px] text-[#64748B]">{v.detail}</p>

                {/* Bouton principal */}
                <button
                  type="button"
                  className="mt-4 w-full rounded-[14px] px-6 py-3 text-[14px] font-semibold text-white"
                  style={{ background: v.degrade }}
                >
                  Valider le soin
                </button>

                {/* Barre de progression */}
                <div className="mt-5">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[#64748B]">
                    Progression
                  </p>
                  <div className="mt-1.5 h-[5px] w-full overflow-hidden rounded-full bg-[#0F172A]/[0.08]">
                    <div className="h-full w-2/5 rounded-full" style={{ background: v.degrade }} />
                  </div>
                </div>

                {/* Bouton central de navigation */}
                <div className="mt-5 flex items-center gap-3">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-[16px] text-white"
                    style={{ background: v.degrade }}
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-4.2-1L3 20l1.3-4.4A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" />
                    </svg>
                  </span>
                  <span className="text-[12.5px] text-[#64748B]">Bouton Ely</span>
                </div>

                {/* Pastille de statut */}
                <div className="mt-5 flex flex-wrap gap-2">
                  <span
                    className="rounded-[10px] px-2.5 py-1 text-[11.5px] font-bold"
                    style={{ color: v.aplat, background: `${v.aplat}1F` }}
                  >
                    En cours
                  </span>
                  <span className="rounded-[10px] bg-emerald-50 px-2.5 py-1 text-[11.5px] font-semibold text-emerald-600">
                    Validé
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 2. Le logo ─────────────────────────────────────────────── */}
        <section className="mt-12">
          <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-[#64748B]">
            2 · Le logo, redessiné d&apos;après ta charte
          </h2>
          <p className="mt-1.5 max-w-[54ch] text-[14px] leading-relaxed text-[#64748B]">
            Le logo actuel est un cœur sans croix, en dégradé violet-rose. Voici
            la reconstruction du cœur à la croix, en vectoriel. C&apos;est une
            approximation d&apos;après ton image : si tu as le fichier
            d&apos;origine, il vaudra toujours mieux que mon tracé.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-[16px] border border-[#0F172A]/10 bg-white p-5">
              <p className="text-[14px] font-semibold">Icône seule</p>
              <p className="mt-0.5 text-[12.5px] text-[#64748B]">Pour la barre de navigation</p>
              <div className="mt-4 flex items-center gap-4">
                <CoeurCroix taille={28} />
                <CoeurCroix taille={40} />
                <CoeurCroix taille={56} />
              </div>
            </div>

            <div className="rounded-[16px] border border-[#0F172A]/10 bg-white p-5">
              <p className="text-[14px] font-semibold">Carré violet</p>
              <p className="mt-0.5 text-[12.5px] text-[#64748B]">La quatrième déclinaison</p>
              <div className="mt-4 flex items-center gap-4">
                {[36, 48, 64].map((t) => (
                  <span
                    key={t}
                    className="flex items-center justify-center rounded-[12px] bg-[#6A4CFF]"
                    style={{ width: t, height: t }}
                  >
                    <CoeurCroix taille={t * 0.62} couleur="#FFFFFF" />
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[16px] border border-[#0F172A]/10 bg-white p-5">
              <p className="text-[14px] font-semibold">Titre du site</p>
              <p className="mt-0.5 text-[12.5px] text-[#64748B]">Carré violet et nom</p>
              <div className="mt-4 flex flex-col gap-4">
                <span className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#6A4CFF]">
                    <CoeurCroix taille={19} couleur="#FFFFFF" />
                  </span>
                  <span className="font-display text-[19px] font-semibold tracking-tight">
                    Soinely
                  </span>
                </span>
                <span className="flex items-center gap-3 rounded-[12px] bg-[#0F172A] px-3 py-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#6A4CFF]">
                    <CoeurCroix taille={19} couleur="#FFFFFF" />
                  </span>
                  <span className="font-display text-[19px] font-semibold tracking-tight text-white">
                    Soinely
                  </span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2 bis. Les personnages ─────────────────────────────────── */}
        <section className="mt-12">
          <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-[#64748B]">
            3 · Les cinq personnages, découpés de ta planche
          </h2>
          <p className="mt-1.5 max-w-[54ch] text-[14px] leading-relaxed text-[#64748B]">
            Leur fond est le gris clair de la planche, pas de la transparence :
            leurs blouses étant blanches, un détourage automatique les aurait
            mangées. Ils s&apos;intègrent donc sur fond clair, ce qui est le cas
            partout dans l&apos;application. Voici où je propose de les placer.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                fichier: "ely-professionnel",
                nom: "Professionnel",
                place: "Page de connexion",
                pourquoi:
                  "Posture droite, regard franc : c'est la première image, celle qui doit rassurer avant de confier ses identifiants.",
              },
              {
                fichier: "ely-en-action",
                nom: "En action",
                place: "Landing — section tournée",
                pourquoi:
                  "Il marche, sacoche à l'épaule. C'est l'illustration littérale de la tournée à domicile.",
              },
              {
                fichier: "ely-consultation",
                nom: "Consultation",
                place: "Landing — section transmissions",
                pourquoi:
                  "Il écrit sur une planchette : la trace écrite du soin, qui est exactement ce que fait le dossier.",
              },
              {
                fichier: "ely-digital",
                nom: "Digital",
                place: "Landing — hero",
                pourquoi:
                  "Le seul qui montre l'application elle-même, écran flottant compris. C'est le plus démonstratif des cinq.",
              },
              {
                fichier: "ely-accompagnement",
                nom: "Accompagnement",
                place: "Écrans vides",
                pourquoi:
                  "Bras croisés, disponible. Bien pour « Aucune tournée aujourd'hui » ou une recherche sans résultat, où un écran nu est décourageant.",
              },
            ].map((p) => (
              <figure
                key={p.fichier}
                className="overflow-hidden rounded-[16px] border border-[#0F172A]/10 bg-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/marketing/${p.fichier}.png`}
                  alt={`ELY — ${p.nom}`}
                  className="h-[300px] w-full object-contain"
                />
                <figcaption className="border-t border-[#0F172A]/[0.06] p-4">
                  <p className="text-[14px] font-semibold">{p.nom}</p>
                  <p className="mt-0.5 text-[12.5px] font-medium text-[#6A4CFF]">
                    {p.place}
                  </p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#64748B]">
                    {p.pourquoi}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* ── 4. La palette ──────────────────────────────────────────── */}
        <section className="mt-12">
          <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-[#64748B]">
            4 · La palette de ta charte
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {[
              { hex: "#6A4CFF", nom: "Violet" },
              { hex: "#A78BFA", nom: "Lavande" },
              { hex: "#EDE9FE", nom: "Lavande claire" },
              { hex: "#0F172A", nom: "Navy" },
              { hex: "#64748B", nom: "Gris" },
            ].map((c) => (
              <div key={c.hex} className="w-[120px]">
                <div
                  className="h-16 rounded-[12px] border border-[#0F172A]/10"
                  style={{ background: c.hex }}
                />
                <p className="mt-1.5 text-[12.5px] font-semibold">{c.nom}</p>
                <p className="text-[11.5px] text-[#64748B]">{c.hex}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 max-w-[54ch] text-[13px] leading-relaxed text-[#64748B]">
            Le navy est déjà celui de l&apos;application. Le violet change de
            nuance, et les trois autres n&apos;existent pas encore dans le code.
          </p>
        </section>
      </div>
    </main>
  );
}
