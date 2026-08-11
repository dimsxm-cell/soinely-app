"use client";

import { useEffect, useRef, useState } from "react";

type Ligne = { cle: string; valeur: string; ok: boolean | null };

export function DiagnosticWebGL() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lignes, setLignes] = useState<Ligne[]>([]);

  useEffect(() => {
    const out: Ligne[] = [];
    const ajouter = (cle: string, valeur: string, ok: boolean | null = null) =>
      out.push({ cle, valeur, ok });

    // 1. Le contexte WebGL2 s'obtient-il ?
    let gl: WebGL2RenderingContext | null = null;
    try {
      gl = document.createElement("canvas").getContext("webgl2");
      ajouter("WebGL2", gl ? "disponible" : "INDISPONIBLE", !!gl);
    } catch (e) {
      ajouter("WebGL2", "erreur : " + String(e), false);
    }

    // 2. Les extensions dont la simulation d'eau a besoin.
    if (gl) {
      for (const ext of [
        "EXT_color_buffer_float",
        "EXT_color_buffer_half_float",
        "OES_texture_float_linear",
      ]) {
        const present = !!gl.getExtension(ext);
        ajouter(ext, present ? "presente" : "ABSENTE", present);
      }
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      ajouter(
        "GPU",
        dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER))
      );
      ajouter("Taille texture max", String(gl.getParameter(gl.MAX_TEXTURE_SIZE)));
    }

    ajouter("Ecran", `${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio}x`);
    ajouter("Navigateur", navigator.userAgent.slice(0, 90));
    setLignes([...out]);

    // 3. La bibliotheque se charge-t-elle et s'initialise-t-elle vraiment ?
    let app: { dispose?: () => void } | null = null;
    import("threejs-components/build/backgrounds/liquid1.min.js")
      .then(({ default: LiquidBackground }) => {
        ajouter("Module threejs-components", "charge", true);
        setLignes([...out]);
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("canvas absent");
        const instance = LiquidBackground(canvas);
        app = instance;
        instance.loadImage("/marketing/ely-texture-liquide.webp");
        instance.liquidPlane.material.metalness = 0.75;
        instance.liquidPlane.material.roughness = 0.25;
        instance.liquidPlane.uniforms.displacementScale.value = 5;
        instance.setRain(true);
        ajouter("Effet liquide", "initialise sans erreur", true);
        ajouter("Buffer canvas", `${canvas.width}x${canvas.height}`);
        setLignes([...out]);
      })
      .catch((e) => {
        ajouter("ECHEC", String((e && (e as Error).message) || e), false);
        setLignes([...out]);
      });

    // 4. La boucle d'animation tourne-t-elle ? (compte les images en 3 s)
    let images = 0;
    let actif = true;
    const compter = () => {
      if (!actif) return;
      images++;
      requestAnimationFrame(compter);
    };
    requestAnimationFrame(compter);
    const fin = setTimeout(() => {
      ajouter("Images en 3 s", `${images} (~${Math.round(images / 3)}/s)`, images > 30);
      setLignes([...out]);
    }, 3000);

    return () => {
      actif = false;
      clearTimeout(fin);
      app?.dispose?.();
    };
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 16, background: "#12101a", color: "#fff", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 20, margin: "0 0 4px" }}>Diagnostic effet liquide</h1>
      <p style={{ fontSize: 13, color: "#a99fc4", margin: "0 0 16px" }}>
        Page temporaire. Faites une capture de cet écran et envoyez-la.
      </p>

      {/* L'effet lui-meme, dans les memes conditions que l'en-tete */}
      <div style={{ position: "relative", isolation: "isolate", overflow: "hidden", height: 200, borderRadius: 12, background: "linear-gradient(168deg,#221b33,#2c1f47,#3a2260)", marginBottom: 18 }}>
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: -10, opacity: 0.55, pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, zIndex: -10, background: "linear-gradient(168deg,rgba(34,27,51,.62),rgba(58,34,96,.5))" }} />
        <p style={{ padding: 14, fontWeight: 700, fontSize: 17 }}>Ma tournée</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {lignes.map((l, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline", fontSize: 13, borderBottom: "1px solid #2a2438", paddingBottom: 6 }}>
            <span style={{ flexShrink: 0, width: 18 }}>
              {l.ok === null ? "·" : l.ok ? "✅" : "❌"}
            </span>
            <span style={{ flexShrink: 0, color: "#a99fc4", minWidth: 130 }}>{l.cle}</span>
            <span style={{ wordBreak: "break-word", fontWeight: 600 }}>{l.valeur}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
