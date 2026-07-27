import Image from "next/image";

const IMPREVU_CHECKS = [
  "Réorganisation instantanée",
  "Recalcul du meilleur itinéraire",
  "Proposition validable en 1 tap",
];

const PATIENT_ORDER = ["Mme Martin → Rue Leconte", "M. Dupont → Rue Victor Hugo", "Mme Bernard → Bd du Port", "Mme Louis → Av. des Fleurs"];

export function EnTempsReel() {
  return (
    <section
      style={{ background: "#faf8ff", padding: "56px 0" }}
    >
      <div className="mx-auto w-full max-w-[1180px] px-6">
        <div className="glass-panel rounded-[20px] px-5 py-7 sm:px-[34px] sm:py-[38px]">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.85fr_2.4fr] lg:items-center lg:gap-10">

            {/* Texte gauche */}
            <div>
              <div style={{ display: "inline-block", fontSize: 11, fontWeight: 800, letterSpacing: ".6px", color: "#6d28d9", background: "#f2eefe", padding: "5px 11px", borderRadius: 6, marginBottom: 16 }}>
                EN TEMPS RÉEL
              </div>
              <h3 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.6px", lineHeight: 1.15, margin: "0 0 14px" }}>
                Un imprévu survient…<br />
                <span style={{ color: "#6d28d9" }}>ELY s&apos;occupe du reste.</span>
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: "#6b6483", margin: "0 0 18px" }}>
                Trafic, urgence, annulation de patient… SOINELY réorganise, recalcule et vous propose toujours la meilleure option.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {IMPREVU_CHECKS.map((c) => (
                  <div key={c} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, fontWeight: 600, color: "#3d3956" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
                    </svg>
                    {c}
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline 4 colonnes */}
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4" style={{ alignItems: "stretch" }}>

              {/* 08h17 — Embouteillage */}
              <div style={{ background: "#faf8ff", border: "1px solid #f0ecfb", borderRadius: 16, padding: "16px 15px", display: "flex", flexDirection: "column", minHeight: 242 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#9a92b3", marginBottom: 9 }}>08h17</div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "#1e1b3c", marginBottom: 11 }}>Embouteillage</div>
                <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", height: 82, marginBottom: 10 }}>
                  <Image
                    src="/marketing/jour-embouteillage.webp"
                    alt="Embouteillage"
                    fill
                    sizes="200px"
                    className="object-cover"
                  />
                  {/* soleil superposé */}
                  <div style={{ position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: 9999, background: "radial-gradient(circle,#fbbf24,#f59e0b)", opacity: 0.85 }} />
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#e11d48", marginBottom: 8 }}>+ 18 min de retard estimé</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#7c3aed", marginTop: "auto", lineHeight: 1.4 }}>
                  Pas d&apos;inquiétude : ELY veille et garde votre journée sereine.
                </div>
              </div>

              {/* 08h18 — Proposition ELY */}
              <div style={{ background: "#faf8ff", border: "1px solid #f0ecfb", borderRadius: 16, padding: "16px 15px", display: "flex", flexDirection: "column", minHeight: 242 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#9a92b3", marginBottom: 9 }}>08h18</div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "#1e1b3c", marginBottom: 11 }}>Proposition d&apos;ELY</div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                  <Image src="/marketing/ely-mascot-1.webp" alt="ELY" width={46} height={46} className="object-contain" style={{ filter: "drop-shadow(0 6px 14px rgba(124,58,237,.28))" }} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#9a92b3", marginBottom: 8 }}>Nouvel ordre proposé</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: "auto" }}>
                  {PATIENT_ORDER.map((p) => (
                    <div key={p} style={{ fontSize: 12, fontWeight: 600, color: "#3d3956" }}>→ {p}</div>
                  ))}
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#16a34a", marginTop: 11 }}>Gain estimé : 18 min</div>
              </div>

              {/* 08h18 — Vous validez */}
              <div style={{ background: "#faf8ff", border: "1px solid #f0ecfb", borderRadius: 16, padding: "16px 15px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", minHeight: 242 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#9a92b3", marginBottom: 9, alignSelf: "flex-start" }}>08h18</div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "#1e1b3c", marginBottom: 14, alignSelf: "flex-start" }}>Vous validez</div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 9999, background: "#e7f7ec", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#1e1b3c" }}>Optimisation acceptée</div>
                  <div style={{ fontSize: 11.5, color: "#9a92b3" }}>Tournée mise à jour</div>
                </div>
              </div>

              {/* 08h19 — Temps gagné */}
              <div style={{ background: "#faf8ff", border: "1px solid #f0ecfb", borderRadius: 16, padding: "16px 15px", display: "flex", flexDirection: "column", minHeight: 242 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#9a92b3", marginBottom: 9 }}>08h19</div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "#1e1b3c", marginBottom: "auto" }}>Vous gagnez du temps</div>
                <div style={{ textAlign: "center", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginBottom: 2, transformOrigin: "50% 15%", animation: "alarm-ring 2s ease-in-out infinite" }}>
                    <path d="M12 6v6l3 2" /><circle cx="12" cy="13" r="8" />
                    <path d="M5 3 2 6M22 6l-3-3M6 19l-2 2M18 19l2 2" />
                  </svg>
                  <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-1px", color: "#7c3aed" }}>18 min</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#3d3956" }}>Gagnées</div>
                  <div style={{ fontSize: 11, color: "#9a92b3", marginTop: 2 }}>et votre journée reste fluide.</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
