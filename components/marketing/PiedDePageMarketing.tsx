const BADGES = [
  {
    t1: "Données sécurisées",
    t2: "Hébergement HDS certifié",
    d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  },
  {
    t1: "Conforme RGPD",
    t2: "Vos données vous appartiennent",
    d: "M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5z",
  },
  {
    t1: "Chiffrement bout en bout",
    t2: "Aucun accès non autorisé",
    d: "M6 10V8a6 6 0 0 1 12 0v2 M5 10h14v10H5z",
  },
  {
    t1: "Conçu par des IDEL",
    t2: "Pour les infirmiers libéraux",
    d: "M12 21s-7-4.4-9.5-8.5C.5 9 2 5 5.5 5 7.8 5 9 6.5 12 9c3-2.5 4.2-4 6.5-4C22 5 23.5 9 21.5 12.5 19 16.6 12 21 12 21z",
  },
];

export function PiedDePageMarketing() {
  return (
    <footer style={{ borderTop: "1px solid #f0ecfb", background: "#fff", padding: "26px 0" }}>
      <div
        className="mx-auto w-full max-w-[1180px] gap-6 px-6 sm:gap-[56px]"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}
      >
        {BADGES.map((badge) => (
          <div key={badge.t1} style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "#f4f2f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={badge.d} />
              </svg>
            </div>
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: "#1e1b3c" }}>{badge.t1}</div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "#8a83a0" }}>{badge.t2}</div>
            </div>
          </div>
        ))}
      </div>
    </footer>
  );
}
