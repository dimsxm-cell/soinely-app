const BADGES = [
  {
    t1: "Données chiffrées",
    t2: "En transit et au repos",
    d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  },
  {
    t1: "Accès cloisonné",
    t2: "Chaque IDEL n'accède qu'à ses patients",
    d: "M6 10V8a6 6 0 0 1 12 0v2 M5 10h14v10H5z",
  },
  {
    t1: "Conçu par des IDEL",
    t2: "Pour les infirmiers libéraux",
    d: "M12 21s-7-4.4-9.5-8.5C.5 9 2 5 5.5 5 7.8 5 9 6.5 12 9c3-2.5 4.2-4 6.5-4C22 5 23.5 9 21.5 12.5 19 16.6 12 21 12 21z",
  },
];

export function SecuriteConfiance() {
  return (
    <section id="securite" style={{ background: "#fff", padding: "56px 0" }}>
      <div className="mx-auto w-full max-w-[1180px] px-6" style={{ textAlign: "center" }}>
        <p
          className="font-display"
          style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.4px", color: "var(--color-soinely-ink)", margin: "0 auto 12px", maxWidth: "36ch" }}
        >
          Conçu avec la confidentialité et la protection des données comme exigences de base.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {BADGES.map((badge) => (
            <div key={badge.t1} style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--color-soinely-lilac-100)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-soinely-purple-700)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={badge.d} />
                </svg>
              </div>
              <div style={{ lineHeight: 1.3, textAlign: "left" }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--color-soinely-ink)" }}>{badge.t1}</div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--color-soinely-muted)" }}>{badge.t2}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
