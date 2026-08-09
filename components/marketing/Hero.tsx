import Link from "next/link";
import Image from "next/image";
import { DUREE_ESSAI_GRATUIT_JOURS } from "@/lib/data/abonnement";

const HERO_CHECKS = [
  "Données de santé chiffrées",
  "Sans engagement",
  "Conçu par et pour les IDEL",
];

export function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "linear-gradient(180deg,#faf8ff 0%,#fff 100%)" }}
    >
      {/* Vidéo background (autoplay silencieuse) */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          className="h-full w-full object-cover"
          poster="/marketing/hero-nurse.webp"
        >
          <source src="/marketing/hero-bg.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Overlay dégradé fidèle à l'original */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(100deg,#faf8ff 0%,rgba(250,248,255,.94) 32%,rgba(250,248,255,.7) 50%,rgba(250,248,255,.12) 100%)",
        }}
      />

      {/* Contenu */}
      <div className="relative z-[2] mx-auto grid w-full max-w-[1180px] grid-cols-1 items-center gap-10 px-6 py-10 sm:py-14 lg:grid-cols-2 lg:gap-12 lg:py-16">
        {/* Colonne gauche */}
        <div>
          {/* Badge */}
          <div
            className="mb-[26px] inline-flex items-center gap-[7px] rounded-[10px] text-[13px] font-bold"
            style={{
              background: "#f3eefe",
              border: "1px solid #e9defb",
              color: "#6d28d9",
              padding: "7px 14px",
            }}
          >
            Conçu par des IDEL, pour des IDEL 💜
          </div>

          {/* H1 */}
          <h1
            className="font-display text-[38px] font-extrabold sm:text-[50px] lg:text-[62px]"
            style={{
              lineHeight: 1.02,
              letterSpacing: "-1.5px",
              margin: "0 0 22px",
            }}
          >
            Ne tournez
            <br />
            <span
              style={{
                background: "linear-gradient(90deg,#7c3aed,#a855f7,#ec4899)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              plus jamais seul.
            </span>
          </h1>

          {/* Description */}
          <p
            style={{
              fontSize: 18,
              lineHeight: 1.55,
              color: "#5a5570",
              margin: "0 0 26px",
              maxWidth: 440,
            }}
          >
            SOINELY est le copilote intelligent qui vous accompagne avant,
            pendant et après chaque soin. Pour une tournée plus fluide, plus
            sereine et du temps retrouvé.
          </p>

          {/* Check list — 3 badges confiance */}
          <div className="mb-[34px] flex flex-col gap-[13px]">
            {HERO_CHECKS.map((item) => (
              <div
                key={item}
                className="flex items-center gap-[11px] font-semibold"
                style={{ fontSize: 15.5, color: "#3d3956" }}
              >
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#7c3aed"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                {item}
              </div>
            ))}
          </div>

          {/* CTA primaire + secondaire */}
          <div className="mb-[24px] flex flex-wrap items-center gap-[14px]">
            <Link
              href="/login"
              className="btn-glace inline-flex items-center gap-[9px] rounded-[12px] font-bold text-white"
              style={{
                background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                fontSize: 16,
                padding: "16px 30px",
                boxShadow: "0 10px 26px rgba(124,58,237,.35)",
              }}
            >
              Rejoindre la bêta privée
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="btn-arrow"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <Link
              href="#demo"
              className="btn-glace-clair inline-flex items-center gap-[9px] rounded-[12px] font-bold"
              style={{
                background: "#fff",
                border: "1px solid #e9defb",
                color: "#6d28d9",
                fontSize: 16,
                padding: "16px 30px",
              }}
            >
              Voir SOINELY en action
            </Link>
          </div>

          {/* Micro-copy */}
          <p style={{ fontSize: 12.5, fontWeight: 600, color: "#8a83a0", margin: 0 }}>
            {`Gratuit ${DUREE_ESSAI_GRATUIT_JOURS} jours • Sans engagement`}
          </p>
        </div>

        {/* Colonne droite — téléphone + carte ELY */}
        <div className="relative lg:h-[560px]">
          {/* Téléphone */}
          <div className="slide-in-right mx-auto w-[264px] lg:absolute lg:right-0 lg:top-0 lg:mx-0">
            <div
              className="rounded-[42px] p-[9px]"
              style={{
                background: "#111014",
                boxShadow: "0 26px 54px rgba(30,27,60,.3)",
              }}
            >
              <div
                className="relative overflow-hidden rounded-[34px]"
                style={{ background: "#f4f2f9" }}
              >
                {/* Status bar */}
                <div
                  className="flex items-center justify-between font-bold"
                  style={{
                    padding: "11px 20px 4px",
                    fontSize: 11,
                    color: "#1e1b3c",
                  }}
                >
                  <span>9:41</span>
                  <span className="flex items-center gap-1" aria-hidden="true">
                    {/* signal bars */}
                    <svg width="15" height="11" viewBox="0 0 24 18" fill="#1e1b3c">
                      <rect x="0" y="10" width="4" height="8" rx="1" />
                      <rect x="6" y="6" width="4" height="12" rx="1" />
                      <rect x="12" y="2" width="4" height="16" rx="1" />
                      <rect x="18" y="0" width="4" height="18" rx="1" opacity=".3" />
                    </svg>
                    {/* wifi */}
                    <svg width="16" height="11" viewBox="0 0 26 18" fill="none" stroke="#1e1b3c" strokeWidth="2">
                      <path d="M2 9a13 13 0 0 1 22 0" strokeLinecap="round" />
                    </svg>
                    {/* battery */}
                    <svg width="22" height="11" viewBox="0 0 26 13" fill="#1e1b3c">
                      <rect x="0" y="0" width="22" height="13" rx="3" opacity=".35" />
                      <rect x="1.5" y="1.5" width="17" height="10" rx="2" />
                      <rect x="23" y="4" width="2" height="5" rx="1" />
                    </svg>
                  </span>
                </div>

                {/* App content */}
                <div style={{ padding: "8px 15px 15px" }}>
                  {/* Header */}
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <div style={{ fontSize: 11, color: "#8a83a0", fontWeight: 600 }}>Bonjour</div>
                      <div
                        className="flex items-center gap-[5px] font-extrabold"
                        style={{ fontSize: 16, letterSpacing: "-0.3px" }}
                      >
                        Marie-Christine
                        <span
                          className="inline-flex items-end justify-center overflow-hidden rounded-full"
                          style={{
                            width: 20,
                            height: 20,
                            background: "radial-gradient(circle at 50% 35%,#efe7fb,#fff)",
                          }}
                        >
                          <Image
                            src="/marketing/ely-colibri-heureux.webp"
                            alt="ELY"
                            width={323}
                            height={304}
                            className="ely-wave h-[18px] w-[18px] rounded-full object-cover"
                          />
                        </span>
                      </div>
                    </div>
                    <div
                      className="flex items-center justify-center rounded-full bg-white"
                      style={{ width: 30, height: 30, boxShadow: "0 2px 6px rgba(0,0,0,.06)" }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6d28d9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                      </svg>
                    </div>
                  </div>

                  {/* Stats aujourd'hui */}
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#8a83a0", marginBottom: 7 }}>Aujourd&apos;hui</div>
                  <div className="mb-[6px] grid grid-cols-3 gap-[6px]">
                    {[["18", "patients"], ["31", "soins"], ["42 km", "parcours"]].map(([n, l]) => (
                      <div key={l} className="rounded-[12px] bg-white p-[9px] text-center">
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#1e1b3c" }}>{n}</div>
                        <div style={{ fontSize: 8.5, color: "#8a83a0", fontWeight: 600, marginTop: 1 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mb-3 grid grid-cols-3 gap-[6px]">
                    {[["10:55", "#7c3aed", "rappels"], ["7h35", "#7c3aed", "estimée"], ["···", "#9a92b3", ""]].map(([n, c, l]) => (
                      <div key={l || n} className="rounded-[12px] bg-white p-[9px] text-center">
                        <div style={{ fontSize: 15, fontWeight: 800, color: c }}>{n}</div>
                        <div style={{ fontSize: 8.5, color: "#8a83a0", fontWeight: 600, marginTop: 1 }}>{l}</div>
                      </div>
                    ))}
                  </div>

                  {/* Prochain patient */}
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#6d28d9", marginBottom: 6 }}>
                    Prochain patient dans 12 min
                  </div>
                  <div className="rounded-[16px] bg-white p-3">
                    <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 2 }}>Mme Dupont</div>
                    <div style={{ fontSize: 11, color: "#8a83a0", fontWeight: 600, marginBottom: 9 }}>BSI + Injection</div>
                    <div className="mb-1 flex items-center gap-[6px]" style={{ fontSize: 10.5, color: "#5a5570" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" aria-hidden="true">
                        <path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
                      </svg>
                      Ordonnance à récupérer
                    </div>
                    <div className="mb-[11px] flex items-center gap-[6px]" style={{ fontSize: 10.5, color: "#5a5570" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" />
                      </svg>
                      97190 Le Gosier
                    </div>
                    <div
                      className="mb-[6px] rounded-[11px] text-center font-bold text-white"
                      style={{
                        background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                        fontSize: 12,
                        padding: 10,
                      }}
                    >
                      Ouvrir l&apos;itinéraire
                    </div>
                    <div
                      className="rounded-[11px] text-center font-bold"
                      style={{ background: "#f2eefe", color: "#6d28d9", fontSize: 12, padding: 10 }}
                    >
                      Démarrer le soin
                    </div>
                  </div>
                </div>

                {/* Bottom nav */}
                <div
                  className="flex items-center justify-around border-t bg-white"
                  style={{ padding: "9px 0 12px", borderColor: "#f0ecfb" }}
                >
                  {[
                    { l: "Accueil", active: false },
                    { l: "Tournée", active: false },
                    { l: "ELY", active: true },
                    { l: "Patients", active: false },
                    { l: "Menu", active: false },
                  ].map((tab) => (
                    <div key={tab.l} className="flex flex-col items-center gap-[3px]">
                      {tab.active ? (
                        <Image src="/marketing/ely-colibri-heureux.webp" alt="ELY" width={323} height={304} className="h-[22px] w-[22px] object-contain" />
                      ) : (
                        <span className="h-[14px] w-[14px] rounded-[5px] border-2 border-[#1e1b3c]/20" />
                      )}
                      <span
                        style={{
                          fontSize: 7.5,
                          fontWeight: 600,
                          color: tab.active ? "#6d28d9" : "#8a83a0",
                        }}
                      >
                        {tab.l}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card ELY flottante */}
          <div
            className="slide-in-left mx-auto mt-6 w-[238px] rounded-[20px] bg-white p-[15px] lg:absolute lg:bottom-[-30px] lg:left-0 lg:mx-0 lg:mt-0"
            style={{
              border: "1px solid #f2eefb",
              boxShadow: "0 20px 44px rgba(109,40,217,.24)",
            }}
          >
            <div className="mb-[9px] flex items-center justify-between">
              <div className="flex items-center gap-[9px]">
                <div className="flex h-[54px] w-[54px] shrink-0 items-center justify-center overflow-hidden rounded-full"
                  style={{ background: "radial-gradient(circle at 50% 35%,#efe7fb,#fff)" }}>
                  <Image
                    src="/marketing/ely-colibri-reflechi.webp"
                    alt="ELY"
                    width={293}
                    height={337}
                    className="rounded-full object-cover"
                    style={{ width: 46, height: 46 }}
                  />
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#6d28d9" }}>ELY</span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c3bcd6" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.5, color: "#4b4763", margin: "0 0 11px" }}>
              Un imprévu sur la route ? Réorganisez votre tournée en un geste, et laissez Waze vous guider en temps réel.
            </p>
            <div
              className="btn-glace mb-[9px] rounded-[11px] text-center font-bold text-white"
              style={{
                background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                fontSize: 12.5,
                padding: 10,
              }}
            >
              Réorganiser ma tournée
            </div>
            <div className="flex items-center gap-[6px] font-bold" style={{ fontSize: 11, color: "#16a34a" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
              </svg>
              Confiance IDEL
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
