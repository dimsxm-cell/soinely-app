const BENEFICES = [
  {
    titre: "Du temps retrouvé",
    texte: "Moins de trajets à vide, moins de recherches — chaque minute compte, SOINELY vous la rend.",
    d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM12 8v4l2.5 1.5",
  },
  {
    titre: "Moins de charge mentale",
    texte: "ELY se souvient à votre place, vous restez concentrée sur le soin.",
    d: "M12 5a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 0 3 3 0 0 0 2-5 3 3 0 0 0-2-5 3 3 0 0 0-3-3z",
  },
  {
    titre: "L'essentiel à portée de main",
    texte: "Protocoles, cotations, historique patient : tout est là, sans ouvrir dix applications.",
    d: "M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5zM20 22H6.5a2.5 2.5 0 0 1 0-5H20",
  },
];

export function Benefices() {
  return (
    <section style={{ background: "var(--color-soinely-canvas)", padding: "56px 0" }}>
      <div className="mx-auto w-full max-w-[1180px] px-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {BENEFICES.map((b) => (
            <div
              key={b.titre}
              style={{
                background: "#fff",
                border: "1px solid var(--color-soinely-border)",
                borderRadius: 20,
                padding: "28px 26px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: "var(--color-soinely-lilac-100)",
                  color: "var(--color-soinely-purple-700)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 18px",
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d={b.d} />
                </svg>
              </div>
              <p
                className="font-display"
                style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.3px", color: "var(--color-soinely-ink)", margin: "0 0 8px" }}
              >
                {b.titre}
              </p>
              <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--color-soinely-text)", margin: 0 }}>
                {b.texte}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
