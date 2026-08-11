/**
 * threejs-components ne fournit aucun typage : ce module ambient couvre
 * uniquement la surface d'API réellement utilisée par FondLiquide.tsx.
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
  }

  const LiquidBackground: (canvas: HTMLCanvasElement) => LiquidApp;
  export default LiquidBackground;
}
