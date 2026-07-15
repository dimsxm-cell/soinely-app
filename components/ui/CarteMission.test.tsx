import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CarteMission } from "./CarteMission";
import type { MissionDuJour } from "@/lib/types/clinical";

const mission: MissionDuJour = {
  id: "m1",
  patientLabel: "Mme Dupont",
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

  it("affiche le bon libellé pour le statut « en cours »", () => {
    render(<CarteMission mission={{ ...mission, statut: "en_cours" }} />);
    expect(screen.getByText("En cours")).toBeInTheDocument();
  });

  it("affiche le bon libellé pour le statut « terminée »", () => {
    render(<CarteMission mission={{ ...mission, statut: "terminee" }} />);
    expect(screen.getByText("Terminée")).toBeInTheDocument();
  });
});
