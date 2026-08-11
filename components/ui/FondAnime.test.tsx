import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FondAnime } from "./FondAnime";

describe("FondAnime", () => {
  it("est purement decoratif, donc ignore des lecteurs d'ecran", () => {
    const { container } = render(<FondAnime />);
    const racine = container.querySelector(".fond-liquide-wrap");
    expect(racine).toBeInTheDocument();
    expect(racine).toHaveAttribute("aria-hidden", "true");
  });

  it("rend les nappes colorees et les reflets metalliques", () => {
    const { container } = render(<FondAnime />);
    // 4 nappes distordues + 3 reflets métalliques = 7 spans au total
    expect(container.querySelectorAll(".fond-liquide-distorted > span")).toHaveLength(4);
    expect(container.querySelectorAll(".fond-liquide-sheen > span")).toHaveLength(3);
  });

  it("inclut un filtre SVG pour la distorsion liquide", () => {
    const { container } = render(<FondAnime />);
    expect(container.querySelector("#liquid-distortion")).toBeInTheDocument();
    expect(container.querySelector("feTurbulence")).toBeInTheDocument();
    expect(container.querySelector("feDisplacementMap")).toBeInTheDocument();
  });

  it("accepte une classe supplementaire, pour son empilement dans l'en-tete", () => {
    const { container } = render(<FondAnime className="-z-10 opacity-70" />);
    expect(container.querySelector(".fond-liquide-wrap")).toHaveClass("-z-10", "opacity-70");
  });
});
