import Image from "next/image";

const IMPREVU_CHECKS = [
  "Réorganisation en un tap",
  "Guidage Waze en temps réel",
  "Ordre de visite mis à jour aussitôt",
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
              <h3
                className="font-display"
                style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.6px", lineHeight: 1.15, margin: "0 0 14px" }}
              >
                Un imprévu survient…<br />
                <span style={{ color: "#6d28d9" }}>réorganisez en un geste.</span>
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: "#6b6483", margin: "0 0 18px" }}>
                Trafic, urgence, annulation de patient… réorganisez votre tournée en un geste, et laissez Waze vous guider en temps réel.
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

              {/* 08h17 — Imprévu */}
              <div style={{ background: "#faf8ff", border: "1px solid #f0ecfb", borderRadius: 16, padding: "18px 16px", display: "flex", flexDirection: "column", minHeight: 292 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#9a92b3", marginBottom: 9 }}>08h17</div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "#1e1b3c", marginBottom: 11 }}>Imprévu sur la route</div>
                <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", height: 100, marginBottom: 12 }}>
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
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#e11d48", marginBottom: 8 }}>Retard, urgence, absence…</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#7c3aed", marginTop: "auto", lineHeight: 1.4 }}>
                  Un geste suffit pour réorganiser votre tournée.
                </div>
              </div>

              {/* 08h18 — Vous réorganisez */}
              <div style={{ background: "#faf8ff", border: "1px solid #f0ecfb", borderRadius: 16, padding: "18px 16px", display: "flex", flexDirection: "column", minHeight: 292 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#9a92b3", marginBottom: 9 }}>08h18</div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "#1e1b3c", marginBottom: 9 }}>Vous réorganisez</div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                  <Image
                    src="/marketing/ely-colibri-action-itineraire.webp"
                    alt="ELY"
                    width={486}
                    height={425}
                    className="object-contain"
                    style={{ width: 44, height: "auto", filter: "drop-shadow(0 6px 14px rgba(124,58,237,.28))" }}
                  />
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#9a92b3", marginBottom: 8 }}>Nouvel ordre de visite</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: "auto" }}>
                  {PATIENT_ORDER.map((p) => (
                    <div key={p} style={{ fontSize: 12, fontWeight: 600, color: "#3d3956" }}>→ {p}</div>
                  ))}
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#16a34a", marginTop: 11 }}>Mis à jour en un tap</div>
              </div>

              {/* 08h18 — Vous validez */}
              <div style={{ background: "#faf8ff", border: "1px solid #f0ecfb", borderRadius: 16, padding: "18px 16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", minHeight: 292 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#9a92b3", marginBottom: 9, alignSelf: "flex-start" }}>08h18</div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "#1e1b3c", marginBottom: 14, alignSelf: "flex-start" }}>Vous validez</div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 9999, background: "#e7f7ec", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#1e1b3c" }}>C&apos;est fait</div>
                  <div style={{ fontSize: 11.5, color: "#9a92b3" }}>Tournée réorganisée</div>
                </div>
              </div>

              {/* 08h19 — Waze */}
              <div style={{ background: "#faf8ff", border: "1px solid #f0ecfb", borderRadius: 16, padding: "18px 16px", display: "flex", flexDirection: "column", minHeight: 292 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#9a92b3", marginBottom: 9 }}>08h19</div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "#1e1b3c", marginBottom: "auto" }}>Vous repartez</div>
                <div style={{ textAlign: "center", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginBottom: 2 }}>
                    <path d="M3 11l19-9-9 19-2-8-8-2z" />
                  </svg>
                  <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.5px", color: "#7c3aed" }}>Waze</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#3d3956" }}>vous guide</div>
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
