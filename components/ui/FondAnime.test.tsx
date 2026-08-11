import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FondAnime } from "./FondAnime";

describe("FondAnime", () => {
  it("est purement decoratif, donc ignore des lecteurs d'ecran", () => {
    const { container } = render(<FondAnime />);
    const racine = container.querySelector(".nappes-liquide");
    expect(racine).toBeInTheDocument();
    expect(racine).toHaveAttribute("aria-hidden", "true");
  });

  it("rend les trois nappes que les regles CSS animent", () => {
    const { container } = render(<FondAnime />);
    expect(container.querySelectorAll(".nappes-liquide > span")).toHaveLength(3);
  });

  it("accepte une classe supplementaire, pour son empilement dans l'en-tete", () => {
    const { container } = render(<FondAnime className="-z-10 opacity-70" />);
    expect(container.querySelector(".nappes-liquide")).toHaveClass("-z-10", "opacity-70");
  });
});
