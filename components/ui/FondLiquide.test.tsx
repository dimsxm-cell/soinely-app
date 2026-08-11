import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FondLiquide } from "./FondLiquide";

const loadImage = vi.fn();
const dispose = vi.fn();
const setRain = vi.fn();
const LiquidBackground = vi.fn((_canvas: HTMLCanvasElement) => ({
  loadImage,
  liquidPlane: {
    material: { metalness: 0, roughness: 0 },
    uniforms: { displacementScale: { value: 0 } },
  },
  setRain,
  dispose,
}));

vi.mock("threejs-components/build/backgrounds/liquid1.min.js", () => ({
  default: (canvas: HTMLCanvasElement) => LiquidBackground(canvas),
}));

describe("FondLiquide", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("rend un canvas decoratif, ignore des lecteurs d'ecran", () => {
    const { container } = render(<FondLiquide image="/marketing/hero-nurse.webp" />);
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute("aria-hidden", "true");
  });

  it("initialise l'effet liquide avec l'image et les parametres fournis", async () => {
    render(
      <FondLiquide image="/marketing/hero-nurse.webp" metalness={0.5} roughness={0.1} displacement={3} />
    );

    await waitFor(() => expect(LiquidBackground).toHaveBeenCalledTimes(1));
    expect(loadImage).toHaveBeenCalledWith("/marketing/hero-nurse.webp");
    // Vrai : c'est la seule source d'ondulation qui ne depende pas du
    // pointeur, donc la seule qui anime l'effet sur telephone.
    expect(setRain).toHaveBeenCalledWith(true);
  });

  it("applique les valeurs par defaut de la maquette (0.75 / 0.25 / 5)", async () => {
    render(<FondLiquide image="/marketing/hero-nurse.webp" />);

    await waitFor(() => expect(LiquidBackground).toHaveBeenCalledTimes(1));
    const app = LiquidBackground.mock.results[0].value;
    expect(app.liquidPlane.material.metalness).toBe(0.75);
    expect(app.liquidPlane.material.roughness).toBe(0.25);
    expect(app.liquidPlane.uniforms.displacementScale.value).toBe(5);
  });

  it("nettoie l'effet au demontage", async () => {
    const { unmount } = render(<FondLiquide image="/marketing/hero-nurse.webp" />);

    await waitFor(() => expect(LiquidBackground).toHaveBeenCalledTimes(1));
    unmount();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
