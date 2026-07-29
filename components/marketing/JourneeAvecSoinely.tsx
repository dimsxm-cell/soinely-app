/* ── Avant items */
const AVANT = [
  { label: "18 patients planifiés", color: "#7c3aed", isList: true },
  { label: "3 ordonnances à récupérer", color: "#e11d48", isFile: true },
  { label: "Matériel à préparer", color: "#d97706", isBag: true },
  { label: "Planning optimisé", color: "#16a34a", isPencil: true },
];

/* ── Chips pendant le soin */
const SOIN_CHIPS = ["Protocole BSI", "Calculateur", "Photo transmission"];

/* ── Après items */
const APRES = [
  "Transmissions envoyées",
  "Ordonnances scannées",
  "Photos classées",
  "Matériel vérifié",
  "Planning demain prêt",
];

function IconList({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}
function IconPencil({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}
function IconBag({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <path d="M8 10V6a4 4 0 1 1 8 0v4" />
    </svg>
  );
}
function IconFile({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

export function JourneeAvecSoinely() {
  return (
    <section
      id="ely"
      className="py-12 sm:py-20"
      style={{ background: "#f5f2fc" }}
    >
      <div className="mx-auto w-full max-w-[1180px] px-6">
        {/* Titre centré */}
        <h2
          className="font-display text-[28px] font-extrabold sm:text-[38px]"
          style={{ textAlign: "center", letterSpacing: "-1px", margin: "0 0 10px" }}
        >
          Une journée avec{" "}
          <span style={{ color: "#6d28d9" }}>SOINELY</span>
        </h2>
        <p style={{ textAlign: "center", fontSize: 17, color: "#7a7391", margin: "0 0 46px" }}>
          S&apos;adapte à votre rythme, pas l&apos;inverse.
        </p>

        {/* 4 colonnes */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5" style={{ alignItems: "stretch" }}>

          {/* 1 · Avant la tournée */}
          <div style={{ background: "#fff", border: "1px solid #efeafb", borderRadius: 20, padding: "24px 22px", boxShadow: "0 10px 30px rgba(30,27,60,.05)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 9999, background: "#7c3aed", color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>1</div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.3px" }}>Avant la tournée</div>
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "#7a7391", marginBottom: 16 }}>Préparez votre journée et anticipez l&apos;essentiel.</div>
            <div style={{ background: "#faf8ff", border: "1px solid #f0ecfb", borderRadius: 14, padding: "14px 15px" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "#9a92b3", marginBottom: 10 }}>Aujourd&apos;hui</div>
              {AVANT.map((a) => (
                <div key={a.label} style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 0", fontSize: 12, fontWeight: 600, color: "#4b4763" }}>
                  {a.isList && <IconList color={a.color} />}
                  {a.isPencil && <IconPencil color={a.color} />}
                  {a.isBag && <IconBag color={a.color} />}
                  {a.isFile && <IconFile color={a.color} />}
                  {a.label}
                </div>
              ))}
            </div>
          </div>

          {/* 2 · Pendant la tournée */}
          <div style={{ background: "#fff", border: "1px solid #efeafb", borderRadius: 20, padding: "24px 22px", boxShadow: "0 10px 30px rgba(30,27,60,.05)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 9999, background: "#7c3aed", color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>2</div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.3px" }}>Pendant la tournée</div>
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "#7a7391", marginBottom: 16 }}>Adaptez votre itinéraire en temps réel.</div>
            {/* Graphique itinéraire */}
            <div style={{ background: "#faf8ff", border: "1px solid #f0ecfb", borderRadius: 14, padding: "16px 14px 14px", marginBottom: 12 }}>
              <svg viewBox="0 0 220 66" width="100%" height="56" fill="none" preserveAspectRatio="none">
                <polyline points="8,50 55,40 100,44 145,20 200,14" stroke="#c9b6f2" strokeWidth="2.5" strokeDasharray="4 5" strokeLinecap="round" />
                <circle cx="8" cy="50" r="4.5" fill="#7c3aed" />
                <circle cx="100" cy="44" r="4.5" fill="#a855f7" />
                <circle cx="145" cy="20" r="4.5" fill="#7c3aed" />
                <circle cx="200" cy="14" r="4.5" fill="#c026d3" />
              </svg>
            </div>
            {/* Alerte embouteillage */}
            <div style={{ background: "#faf8ff", border: "1px solid #f0ecfb", borderRadius: 12, padding: "12px 13px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 800, color: "#d97a2e", marginBottom: 5 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97a2e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <path d="M12 9v4M12 17h.01" />
                </svg>
                Embouteillage détecté
              </div>
              <div style={{ fontSize: 11, lineHeight: 1.45, color: "#6b6483", marginBottom: 10 }}>
                + 18 min de retard<br />Souhaitez-vous optimiser votre tournée ?
              </div>
              <div style={{ display: "flex", gap: 7 }}>
                <div className="btn-glace" style={{ flex: 1, textAlign: "center", background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", fontSize: 11.5, fontWeight: 700, padding: 8, borderRadius: 9, cursor: "pointer" }}>Optimiser</div>
                <div className="btn-glace-clair" style={{ textAlign: "center", background: "#f2eefe", color: "#6d28d9", fontSize: 11.5, fontWeight: 700, padding: "8px 13px", borderRadius: 9, cursor: "pointer" }}>Plus tard</div>
              </div>
            </div>
          </div>

          {/* 3 · Pendant le soin */}
          <div style={{ background: "#fff", border: "1px solid #efeafb", borderRadius: 20, padding: "24px 22px", boxShadow: "0 10px 30px rgba(30,27,60,.05)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 9999, background: "#c026d3", color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>3</div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.3px" }}>Pendant le soin</div>
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "#7a7391", marginBottom: 16 }}>Tout ce qu&apos;il vous faut, sans quitter votre patient.</div>
            <div style={{ background: "#faf8ff", border: "1px solid #f0ecfb", borderRadius: 14, padding: "14px 15px", marginBottom: 12 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "#9a92b3", marginBottom: 3 }}>Soin en cours</div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.3px", marginBottom: 12 }}>BSI</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {SOIN_CHIPS.map((c) => (
                  <span key={c} style={{ fontSize: 11, fontWeight: 600, color: "#4b4763", background: "#fff", border: "1px solid #ece6f8", borderRadius: 9999, padding: "6px 11px" }}>{c}</span>
                ))}
              </div>
            </div>
            <div className="btn-glace" style={{ marginTop: "auto", textAlign: "center", background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", fontSize: 12.5, fontWeight: 700, padding: 11, borderRadius: 11, cursor: "pointer" }}>
              Demander à ELY
            </div>
          </div>

          {/* 4 · Après la tournée */}
          <div style={{ background: "#fff", border: "1px solid #efeafb", borderRadius: 20, padding: "24px 22px", boxShadow: "0 10px 30px rgba(30,27,60,.05)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 9999, background: "#c026d3", color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>4</div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.3px" }}>Après la tournée</div>
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "#7a7391", marginBottom: 16 }}>Vérifiez, transmettez, préparez demain.</div>
            <div style={{ background: "#faf8ff", border: "1px solid #f0ecfb", borderRadius: 14, padding: "14px 15px" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "#9a92b3", marginBottom: 10 }}>Fin de journée</div>
              {APRES.map((a) => (
                <div key={a} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "5px 0", fontSize: 12, fontWeight: 600, color: "#4b4763" }}>
                  <span>{a}</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
              ))}
              <div style={{ textAlign: "center", background: "#e7f7ec", color: "#16a34a", fontSize: 11.5, fontWeight: 800, padding: 9, borderRadius: 10, marginTop: 10 }}>
                Tout est à jour !
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
