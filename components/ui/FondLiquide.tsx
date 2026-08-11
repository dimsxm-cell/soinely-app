"use client";

import { useEffect, useRef } from "react";

interface FondLiquideProps {
  /** Image texturant l'effet liquide. */
  image: string;
  /** Métallisation du matériau. Valeur de la maquette : 0.75. */
  metalness?: number;
  /** Rugosité du matériau. Valeur de la maquette : 0.25. */
  roughness?: number;
  /** Amplitude de la déformation liquide. Valeur de la maquette : 5. */
  displacement?: number;
  className?: string;
}

/**
 * Fond décoratif en verre liquide (WebGL, via threejs-components), tel que
 * prévu par la maquette Claude Design de l'en-tête "Ma tournée". Purement
 * décoratif : un échec de chargement (bibliothèque indisponible, WebGL
 * absent) laisse simplement l'en-tête sans cet effet, sans casser l'écran.
 */
export function FondLiquide({
  image,
  metalness = 0.75,
  roughness = 0.25,
  displacement = 5,
  className = "",
}: FondLiquideProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let annule = false;
    type ModuleLiquide = typeof import("threejs-components/build/backgrounds/liquid1.min.js");
    let app: ReturnType<ModuleLiquide["default"]> | null = null;

    import("threejs-components/build/backgrounds/liquid1.min.js")
      .then(({ default: LiquidBackground }) => {
        if (annule) return;
        app = LiquidBackground(canvas);
        app.loadImage(image);
        app.liquidPlane.material.metalness = metalness;
        app.liquidPlane.material.roughness = roughness;
        app.liquidPlane.uniforms.displacementScale.value = displacement;
        // Les ondulations n'ont que deux sources : les evenements
        // `pointermove` et cette pluie automatique. Sans elle, la surface
        // reste figee sur telephone — le survol n'y existe pas — et l'effet
        // se reduit a une image immobile.
        app.setRain(true);
      })
      .catch(() => {
        // Échec silencieux : effet purement décoratif, l'en-tête reste
        // pleinement utilisable sans lui.
      });

    return () => {
      annule = true;
      app?.dispose?.();
    };
  }, [image, metalness, roughness, displacement]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
