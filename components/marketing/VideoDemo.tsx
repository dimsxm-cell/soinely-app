"use client";

import { useState } from "react";
import Image from "next/image";

const VIDEO_BULLETS = [
  { l: "Tournée optimisée", d: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z M12 10.5a1 1 0 1 0 0-1 1 1 0 0 0 0 1z" },
  { l: "ELY en action", d: "M12 21s-7-4.4-9.5-8.5C.5 9 2 5 5.5 5 7.8 5 9 6.5 12 9c3-2.5 4.2-4 6.5-4C22 5 23.5 9 21.5 12.5 19 16.6 12 21 12 21z" },
  { l: "Transmissions simplifiées", d: "m22 2-7 20-4-9-9-4z M22 2 11 13" },
  { l: "Sérénité retrouvée", d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
];

export function VideoDemo() {
  const [lecture, setLecture] = useState(false);

  return (
    <section id="demo" className="py-10 sm:py-14" style={{ background: "#fff" }}>
      <div className="mx-auto w-full max-w-[1180px] px-6">
        <div
          className="grid grid-cols-1 gap-8 px-6 py-9 lg:grid-cols-[0.85fr_1.5fr_0.7fr] lg:items-center lg:gap-[34px] lg:px-11 lg:py-11"
          style={{
            borderRadius: 26,
            overflow: "hidden",
            background: "linear-gradient(120deg,var(--color-soinely-purple-900) 0%,#5b21b6 50%,#8b2fb0 100%)",
          }}
        >
          {/* Texte gauche */}
          <div>
            <div style={{ display: "inline-block", fontSize: 10.5, fontWeight: 800, letterSpacing: ".6px", color: "#fff", background: "rgba(255,255,255,.16)", padding: "5px 11px", borderRadius: 6, marginBottom: 16 }}>
              EN 45 SECONDES
            </div>
            <h2
              className="font-display"
              style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.8px", lineHeight: 1.12, color: "#fff", margin: "0 0 14px" }}
            >
              45 secondes pour découvrir une tournée avec SOINELY
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,.8)", margin: "0 0 22px" }}>
              Voyez comment ELY vous accompagne à chaque étape de votre tournée.
            </p>
            {!lecture && (
              <button
                type="button"
                onClick={() => setLecture(true)}
                className="btn-glace inline-flex items-center gap-[9px] rounded-[12px] font-bold text-white"
                style={{ background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.25)", fontSize: 14, padding: "12px 20px" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Regarder la vidéo{" "}
                <span style={{ opacity: 0.7 }}>00:45</span>
              </button>
            )}
          </div>

          {/* Vignette vidéo centrale, ou lecteur une fois lancé */}
          <div style={{ position: "relative", height: 250, borderRadius: 18, overflow: "hidden", background: "#000" }}>
            {lecture ? (
              <video
                data-testid="video-player"
                controls
                autoPlay
                playsInline
                muted
                poster="/marketing/video-thumb.webp"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              >
                <source src="/marketing/demo-produit.mp4" type="video/mp4" />
                <track kind="subtitles" src="/marketing/demo-produit.fr.vtt" srcLang="fr" label="Français" default />
              </video>
            ) : (
              <button
                type="button"
                onClick={() => setLecture(true)}
                aria-label="Lancer la vidéo de démonstration"
                style={{ position: "relative", width: "100%", height: "100%", padding: 0, border: 0, cursor: "pointer" }}
              >
                <Image
                  src="/marketing/video-thumb.webp"
                  alt="Aperçu vidéo SOINELY"
                  fill
                  sizes="(min-width:1024px) 50vw, 100vw"
                  className="object-cover"
                />
                <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ width: 66, height: 66, borderRadius: 9999, background: "rgba(255,255,255,.92)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(0,0,0,.25)" }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="#6d28d9" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </span>
              </button>
            )}
          </div>

          {/* Bullets droite */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {VIDEO_BULLETS.map((v) => (
              <div key={v.l} style={{ display: "flex", alignItems: "center", gap: 11, fontSize: 13.5, fontWeight: 600, color: "#fff" }}>
                <span style={{ width: 34, height: 34, borderRadius: 9999, background: "rgba(255,255,255,.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={v.d} />
                  </svg>
                </span>
                {v.l}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
