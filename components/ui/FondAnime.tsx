"use client";

import { useEffect, useRef } from "react";

/**
 * Fond décoratif liquide pour l'en-tête « Ma tournée ».
 *
 * Utilise un filtre SVG `feTurbulence` + `feDisplacementMap` animé par
 * requestAnimationFrame pour créer une vraie distorsion liquide ondulante.
 * Fonctionne sur iOS Safari (pas de dépendance WebGL).
 *
 * Superposé aux nappes colorées CSS, l'effet combiné donne l'illusion
 * d'une matière liquide métallique vivante.
 */
export function FondAnime({ className = "" }: { className?: string }) {
  const turbRef = useRef<SVGFETurbulenceElement>(null);

  useEffect(() => {
    const el = turbRef.current;
    if (!el) return;

    // Vérifie prefers-reduced-motion
    if (typeof window.matchMedia === "function") {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mq.matches) return;
    }

    let frame: number;
    let t = 0;

    function animate() {
      t += 0.0008;
      // Anime baseFrequency pour un mouvement organique
      const fx = 0.012 + Math.sin(t * 2.1) * 0.004;
      const fy = 0.014 + Math.cos(t * 1.7) * 0.005;
      el?.setAttribute("baseFrequency", `${fx.toFixed(4)} ${fy.toFixed(4)}`);

      // Anime seed pour le changement de forme
      if (Math.floor(t * 60) % 3 === 0) {
        el?.setAttribute("seed", String(Math.floor(t * 10) % 100));
      }
      frame = requestAnimationFrame(animate);
    }

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div aria-hidden="true" className={`fond-liquide-wrap ${className}`}>
      {/* Filtre SVG invisible — distorsion liquide animée */}
      <svg className="absolute" width="0" height="0" aria-hidden="true">
        <defs>
          <filter id="liquid-distortion" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              ref={turbRef}
              type="fractalNoise"
              baseFrequency="0.012 0.014"
              numOctaves={3}
              seed={2}
              stitchTiles="stitch"
              result="turb"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="turb"
              scale={28}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Couche de couleurs distordue par le filtre SVG */}
      <div className="fond-liquide-distorted">
        <span />
        <span />
        <span />
        <span />
      </div>

      {/* Couche de reflets métalliques (non distordue, par-dessus) */}
      <div className="fond-liquide-sheen">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
