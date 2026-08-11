/**
 * threejs-components ne fournit aucun typage : ce module ambient couvre
 * uniquement la surface d'API réellement utilisée par LiquidEffectAnimation.
 */
declare module "threejs-components/build/backgrounds/liquid1.min.js" {
  interface LiquidApp {
    loadImage: (url: string) => void;
    liquidPlane: {
      material: { metalness: number; roughness: number };
      uniforms: { displacementScale: { value: number } };
    };
    setRain: (pluie: boolean) => void;
    dispose?: () => void;
    /**
     * Moteur sous-jacent. Nécessaire au nettoyage : `dispose()` ne suffit pas
     * à neutraliser l'instance (voir le commentaire dans le composant).
     */
    three?: {
      render: () => void;
      onBeforeRender: (...args: unknown[]) => void;
      onAfterResize: (...args: unknown[]) => void;
      renderer?: { forceContextLoss?: () => void };
    };
  }

  const LiquidBackground: (canvas: HTMLCanvasElement) => LiquidApp;
  export default LiquidBackground;
}
