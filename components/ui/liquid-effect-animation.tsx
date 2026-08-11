"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { FondAnime } from "@/components/ui/FondAnime";

/**
 * Fond décoratif de l'en-tête « Ma tournée ».
 *
 * Rend une matière liquide en WebGL (threejs-components) là où l'appareil
 * en est capable, et retombe sur `FondAnime` — la même matière en CSS pur —
 * partout ailleurs.
 *
 * Ce repli n'est pas théorique : un diagnostic sur iPhone (iOS 26.6) a montré
 * que Safari ne fournit pas `OES_texture_float_linear`. La simulation d'eau
 * échantillonne une texture flottante en filtrage linéaire ; sans cette
 * extension, three.js prévient « Unable to use linear filtering with floating
 * point textures » et WebGL ne rend que du noir. L'effet s'y initialisait
 * sans erreur, tournait à 55 images par seconde, et n'affichait rien.
 */

function estAppareilIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Teste l'extension qui manque sur iOS, sur un contexte WebGL2 — et seulement
 * lui. La bibliothèque embarque three.js r181, qui n'ouvre que WebGL2 et lève
 * « Error creating WebGL context » sinon. Se rabattre sur WebGL1 ici mènerait
 * à conclure « supporté » sur un navigateur où la bibliothèque échouera, et
 * l'en-tête resterait alors sans fond du tout, le repli CSS ayant été écarté.
 */
function supporteTexturesFlottantesLineaires(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) return false;
    return !!gl.getExtension("OES_texture_float_linear");
  } catch {
    return false;
  }
}

/**
 * Capacité de l'appareil, lue une seule fois puis mémorisée : elle ne change
 * pas au cours de la vie de la page, et `getSnapshot` doit rendre une valeur
 * stable sous peine de boucle de rendu.
 */
let capaciteMemorisee: boolean | null = null;
function supporteEffetWebGL(): boolean {
  if (capaciteMemorisee === null) {
    capaciteMemorisee = !estAppareilIOS() && supporteTexturesFlottantesLineaires();
  }
  return capaciteMemorisee;
}

function requeteReduction(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  return window.matchMedia("(prefers-reduced-motion: reduce)");
}

/**
 * Le repli CSS respecte `prefers-reduced-motion`, mais aucune règle CSS ne
 * peut arrêter des pixels dessinés dans un canvas : le chemin WebGL doit donc
 * lire la préférence lui-même. Elle peut changer en cours de session, d'où un
 * véritable abonnement plutôt qu'une lecture unique.
 */
function sAbonnerAuMouvement(reagir: () => void): () => void {
  const mq = requeteReduction();
  if (!mq) return () => {};
  mq.addEventListener("change", reagir);
  return () => mq.removeEventListener("change", reagir);
}

function doitRendreWebGL(): boolean {
  if (requeteReduction()?.matches) return false;
  return supporteEffetWebGL();
}

/** Texture de la matière : bande recadrée dans le plumage d'ELY. */
const TEXTURE = "/marketing/ely-texture-liquide.webp";

export function LiquidEffectAnimation({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Lecture d'une capacité du navigateur, pas un état applicatif : le serveur
  // rend toujours le repli CSS, le client bascule sur WebGL s'il le supporte.
  // useSyncExternalStore évite le setState-dans-un-effet, que React déconseille
  // parce qu'il déclenche un second rendu en cascade.
  const supporteWebGL = useSyncExternalStore(sAbonnerAuMouvement, doitRendreWebGL, () => false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!supporteWebGL || !canvas) return;

    let annule = false;
    type ModuleLiquide = typeof import("threejs-components/build/backgrounds/liquid1.min.js");
    // L'instance vit dans cette fermeture, et non sur `window` : deux montages
    // simultanés garderaient chacun la leur, et le nettoyage ne peut pas
    // détruire celle d'un autre.
    let app: ReturnType<ModuleLiquide["default"]> | null = null;

    import("threejs-components/build/backgrounds/liquid1.min.js")
      .then(({ default: LiquidBackground }) => {
        if (annule) return;
        app = LiquidBackground(canvas);
        app.loadImage(TEXTURE);
        app.liquidPlane.material.metalness = 0.75;
        app.liquidPlane.material.roughness = 0.25;
        app.liquidPlane.uniforms.displacementScale.value = 5;
        // Les ondulations n'ont que deux sources : les événements
        // `pointermove` et cette pluie automatique. Sans elle, la surface
        // reste figée dès qu'aucun pointeur ne la survole.
        app.setRain(true);
      })
      .catch(() => {
        // Échec silencieux : fond purement décoratif, l'en-tête reste
        // pleinement lisible et utilisable sans lui.
      });

    return () => {
      annule = true;

      // `dispose()` seul ne suffit pas. Le moteur s'abonne à `resize` et
      // `visibilitychange` avec `.bind()`, puis se désabonne avec un `.bind()`
      // neuf : les retraits ne retirent rien. Les écouteurs survivent donc à
      // l'instance, la gardent joignable — donc non collectée avec son contexte
      // GPU — et le prochain retour d'arrière-plan relance sa boucle de rendu,
      // faute de garde sur l'état détruit. Chaque visite de l'écran fuirait
      // ainsi un contexte, jusqu'au plafond du navigateur.
      const moteur = app?.three;
      app?.dispose?.();
      if (moteur) {
        moteur.render = () => {};
        moteur.onBeforeRender = () => {};
        moteur.onAfterResize = () => {};
        // Rend le slot de contexte au GPU sans attendre un ramasse-miettes
        // que les écouteurs fuités empêchent de toute façon.
        moteur.renderer?.forceContextLoss?.();
      }
    };
  }, [supporteWebGL]);

  if (!supporteWebGL) {
    return <FondAnime className={className} />;
  }

  // Le rendu WebGL est bien plus lumineux que le repli CSS : sans cette
  // atténuation propre, il déborde le voile de l'en-tête — calibré pour les
  // nappes CSS — et le titre passe sur des zones blanches. L'opacité aligne
  // les deux chemins sur une intensité comparable.
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full opacity-30 ${className}`}
    />
  );
}
