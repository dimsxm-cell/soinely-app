const ETAPES = [
  {
    n: "1",
    num: "#7c3aed",
    bg: "#faf8ff",
    bd: "#efe9fb",
    titre: "Avant la tournée",
    texte: "Préparez votre journée et anticipez l'essentiel.",
    cardTitre: "Aujourd'hui",
    items: ["18 patients", "31 soins", "Matériel à prévoir", "Ordonnances à récupérer"],
  },
  {
    n: "2",
    num: "#2563eb",
    bg: "#f6f9ff",
    bd: "#e4edff",
    titre: "Pendant la tournée",
    texte: "Adaptez votre itinéraire en temps réel.",
    cardTitre: "Embouteillage détecté",
    items: ["+18 min de retard", "Suivez le nouvel itinéraire", "Optimiser · Plus tard"],
  },
  {
    n: "3",
    num: "#c026d3",
    bg: "#fdf6fd",
    bd: "#f6e3f8",
    titre: "Pendant le soin",
    texte: "Tout ce qu'il vous faut, sans quitter votre patient.",
    cardTitre: "Soin en cours · BSI",
    items: ["Protocole", "Calculateur", "Photo transmission", "Demander à ELY"],
  },
  {
    n: "4",
    num: "#e11d48",
    bg: "#fdf5f7",
    bd: "#f8e1e8",
    titre: "Après la tournée",
    texte: "Vérifiez, transmettez, préparez demain.",
    cardTitre: "Fin de journée",
    items: ["Transmissions", "Ordonnances", "Photos", "Matériel · Tout est à jour !"],
  },
];

export function JourneeAvecSoinely() {
  return (
    <section id="ely" className="mx-auto w-full max-w-[1180px] px-6 py-14 sm:py-20">
      <div className="mx-auto mb-12 max-w-[560px] text-center">
        <h2 className="mb-3 text-balance text-[26px] font-medium leading-tight sm:text-[32px]">
          Une journée avec SOINELY
        </h2>
        <p className="text-base leading-relaxed text-navy/60">S&apos;adapte à votre rythme, pas l&apos;inverse.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {ETAPES.map((etape) => (
          <div
            key={etape.titre}
            className="rounded-2xl border px-5 py-[22px]"
            style={{ background: etape.bg, borderColor: etape.bd }}
          >
            <div className="mb-3.5 flex items-center gap-2.5">
              <span
                className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-white"
                style={{ background: etape.num }}
              >
                {etape.n}
              </span>
              <p className="text-[16px] font-extrabold leading-tight tracking-tight">{etape.titre}</p>
            </div>
            <p className="mb-3.5 text-[12.5px] leading-relaxed text-navy/60">{etape.texte}</p>
            <div className="rounded-[14px] border border-navy/[0.06] bg-white p-3.5">
              <p className="mb-2.5 text-[10.5px] font-bold text-navy/40">{etape.cardTitre}</p>
              {etape.items.map((item) => (
                <div key={item} className="flex items-center gap-2 py-1 text-[11.5px] font-semibold text-navy/70">
                  <span className="h-[6px] w-[6px] shrink-0 rounded-full" style={{ background: etape.num }} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
