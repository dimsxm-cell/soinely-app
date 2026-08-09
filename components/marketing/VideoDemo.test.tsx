import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VideoDemo } from "./VideoDemo";

describe("VideoDemo", () => {
  it("porte l'ancre #demo et le titre exact de la spec", () => {
    const { container } = render(<VideoDemo />);
    expect(container.querySelector("section#demo")).toBeInTheDocument();
    expect(screen.getByText("45 secondes pour découvrir une tournée avec SOINELY")).toBeInTheDocument();
  });

  it("affiche la miniature et le bouton play par défaut, sans lecteur video", () => {
    render(<VideoDemo />);
    expect(screen.queryByTestId("video-player")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /regarder la vidéo/i })).toBeInTheDocument();
  });

  it("remplace la miniature par le lecteur video au clic", () => {
    render(<VideoDemo />);
    fireEvent.click(screen.getByRole("button", { name: /regarder la vidéo/i }));

    const player = screen.getByTestId("video-player");
    expect(player.querySelector("source")).toHaveAttribute("src", "/marketing/demo-produit.mp4");
    expect(player.querySelector("track")).toHaveAttribute("src", "/marketing/demo-produit.fr.vtt");
    expect(screen.queryByRole("button", { name: /regarder la vidéo/i })).not.toBeInTheDocument();
  });
});
