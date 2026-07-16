import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CarteMission } from "./CarteMission";
import type { MissionDuJour } from "@/lib/types/clinical";

vi.mock("@/lib/data/ma-journee-actions", () => ({
  updateMissionStatutAction: vi.fn(),
}));

const mission: MissionDuJour = {
  id: "m1",
  patientId: "p1",
  patientNom: "Mme Dupont",
  typeSoin: "Pansement",
  heurePrevue: "08:30:00",
  statut: "a_faire",
  missionCliniqueId: null,
};

describe("CarteMission", () => {
  it("affiche le patient, le type de soin, l'heure et le statut", () => {
    render(<CarteMission mission={mission} />);

    expect(screen.getByText("Mme Dupont")).toBeInTheDocument();
    expect(screen.getByText(/Pansement/)).toBeInTheDocument();
    expect(screen.getByText(/08:30:00/)).toBeInTheDocument();
    expect(screen.getByText("À faire")).toBeInTheDocument();
  });

  it("le nom du patient est un lien vers l'écran d'arrivée de la mission", () => {
    render(<CarteMission mission={mission} />);

    const lien = screen.getByRole("link", { name: /Mme Dupont/ });
    expect(lien).toHaveAttribute("href", "/ma-journee/m1");
  });

  it("affiche le bon libellé pour le statut « en cours »", () => {
    render(<CarteMission mission={{ ...mission, statut: "en_cours" }} />);
    expect(screen.getByText("En cours")).toBeInTheDocument();
  });

  it("affiche le bon libellé pour le statut « terminée »", () => {
    render(<CarteMission mission={{ ...mission, statut: "terminee" }} />);
    expect(screen.getByText("Terminée")).toBeInTheDocument();
  });

  it("affiche le bouton « Démarrer » pour une mission à faire", () => {
    render(<CarteMission mission={mission} />);

    expect(screen.getByRole("button", { name: "Démarrer" })).toBeInTheDocument();

    const champStatut = document.querySelector('input[name="nouveauStatut"]') as HTMLInputElement;
    expect(champStatut.value).toBe("en_cours");
  });

  it("affiche le bouton « Terminer » pour une mission en cours", () => {
    render(<CarteMission mission={{ ...mission, statut: "en_cours" }} />);

    expect(screen.getByRole("button", { name: "Terminer" })).toBeInTheDocument();

    const champStatut = document.querySelector('input[name="nouveauStatut"]') as HTMLInputElement;
    expect(champStatut.value).toBe("terminee");
  });

  it("n'affiche aucun bouton pour une mission terminée", () => {
    render(<CarteMission mission={{ ...mission, statut: "terminee" }} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("affiche le bon libellé pour le statut « absente »", () => {
    render(<CarteMission mission={{ ...mission, statut: "absent" }} />);
    expect(screen.getByText("Absente")).toBeInTheDocument();
  });

  it("n'affiche aucun bouton pour une mission absente", () => {
    render(<CarteMission mission={{ ...mission, statut: "absent" }} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("affiche un lien « Contexte clinique » quand contexteHref est fourni", () => {
    render(<CarteMission mission={{ ...mission, statut: "en_cours" }} contexteHref="/situations/s1" />);

    const lien = screen.getByRole("link", { name: "Contexte clinique" });
    expect(lien).toHaveAttribute("href", "/situations/s1");
  });

  it("n'affiche que le lien vers le patient quand contexteHref n'est pas fourni", () => {
    render(<CarteMission mission={{ ...mission, statut: "en_cours" }} />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});
