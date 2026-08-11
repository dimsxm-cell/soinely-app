"use client"

import { useEffect, useRef, useSyncExternalStore } from "react"
import { FondAnime } from "@/components/ui/FondAnime"

/**
 * Animation liquide WebGL pour l'en-tête « Ma tournée ».
 *
 * Utilise `threejs-components` via CDN pour un effet de matière liquide
 * réaliste. Si WebGL n'est pas disponible ou si l'appareil est iOS
 * (qui ne fournit pas `OES_texture_float_linear`, rendant l'effet invisible),
 * on retombe sur le composant `FondAnime` CSS pur.
 *
 * Le composant est `"use client"` car il utilise `useEffect` et `useRef`.
 */

function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  )
}

function supportsWebGLFloat(): boolean {
  if (typeof document === "undefined") return false
  try {
    const canvas = document.createElement("canvas")
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
    if (!gl) return false
    return !!(gl as WebGLRenderingContext).getExtension(
      "OES_texture_float_linear"
    )
  } catch {
    return false
  }
}

/**
 * Capacité de l'appareil, lue une seule fois puis mémorisée : elle ne change
 * pas au cours de la vie de la page, et `getSnapshot` doit rendre une valeur
 * stable sous peine de boucle de rendu.
 */
let capaciteMemorisee: boolean | null = null
function supporteEffetWebGL(): boolean {
  if (capaciteMemorisee === null) {
    capaciteMemorisee = !isIOSDevice() && supportsWebGLFloat()
  }
  return capaciteMemorisee
}

// Aucun abonnement : la capacité du navigateur ne varie jamais.
const sansAbonnement = () => () => {}

export function LiquidEffectAnimation({
  className = "",
}: {
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scriptRef = useRef<HTMLScriptElement | null>(null)

  // Lecture d'une capacité du navigateur, pas un état applicatif : le serveur
  // rend toujours le repli CSS, le client bascule sur WebGL s'il le supporte.
  // useSyncExternalStore evite le setState-dans-un-effet, que React deconseille
  // parce qu'il declenche un second rendu en cascade.
  const supporteWebGL = useSyncExternalStore(
    sansAbonnement,
    supporteEffetWebGL,
    () => false
  )

  useEffect(() => {
    if (!supporteWebGL) return
    if (!canvasRef.current) return

    const canvasId = `liquid-canvas-${Math.random().toString(36).slice(2, 9)}`
    canvasRef.current.id = canvasId

    // Chargement dynamique du script threejs-components
    const script = document.createElement("script")
    script.type = "module"
    script.textContent = `
      import LiquidBackground from 'https://cdn.jsdelivr.net/npm/threejs-components@0.0.22/build/backgrounds/liquid1.min.js';
      
      const canvas = document.getElementById('${canvasId}');
      if (canvas) {
        const app = LiquidBackground(canvas);
        app.loadImage('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/enhanced_8bfe61b0-d431-433a-8acb-49d508bf88b4-image-vWzKFKS7vQy7s8wfQYzEpaoiYaVMkr.png');
        app.liquidPlane.material.metalness = 0.75;
        app.liquidPlane.material.roughness = 0.25;
        app.liquidPlane.uniforms.displacementScale.value = 5;
        app.setRain(false);
        window.__liquidApp = app;
      }
    `
    document.body.appendChild(script)
    scriptRef.current = script

    return () => {
      if (window.__liquidApp && window.__liquidApp.dispose) {
        window.__liquidApp.dispose()
      }
      if (scriptRef.current && document.body.contains(scriptRef.current)) {
        document.body.removeChild(scriptRef.current)
      }
    }
  }, [supporteWebGL])

  // Repli CSS pour iOS et les appareils sans WebGL float
  if (!supporteWebGL) {
    return <FondAnime className={className} />
  }

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 m-0 w-full h-full touch-none overflow-hidden ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  )
}

declare global {
  interface Window {
    /** Instance posee par le script injecte ; seul `dispose` nous sert. */
    __liquidApp?: { dispose?: () => void }
  }
}
