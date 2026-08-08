import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EnTeteAccueil } from "./EnTeteAccueil";
import type { MissionDuJour } from "@/lib/types/clinical";

function creerMission(surcharge: Partial<MissionDuJour> = {}): MissionDuJour {
  return {
    id: "m1",
    patientId: "p1",
    patientNom: "Mme Dupont",
    typeSoin: "Pansement",
    heurePrevue: "08:00:00",
    statut: "a_faire",
    missionCliniqueId: null,
    ...surcharge,
  };
}

describe("EnTeteAccueil", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("affiche la salutation avec le prenom", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T09:00:00"));

    render(<EnTeteAccueil prenom="Dimitri" missions={[]} />);

    expect(screen.getByText("Bonjour, Dimitri")).toBeInTheDocument();
  });

  it("affiche la salutation seule sans prenom", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T09:00:00"));

    render(<EnTeteAccueil prenom={undefined} missions={[]} />);

    expect(screen.getByText("Bonjour")).toBeInTheDocument();
  });

  it("affiche Bonsoir apres 18h", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T19:00:00"));

    render(<EnTeteAccueil prenom="Dimitri" missions={[]} />);

    expect(screen.getByText("Bonsoir, Dimitri")).toBeInTheDocument();
  });

  it("affiche les stats Visites/Faites/Restantes calculees depuis les missions", () => {
    const missions = [
      creerMission({ id: "a", statut: "terminee" }),
      creerMission({ id: "b", statut: "terminee" }),
      creerMission({ id: "c", statut: "absent" }),
      creerMission({ id: "d", statut: "a_faire" }),
    ];

    render(<EnTeteAccueil prenom="Dimitri" missions={missions} />);

    expect(screen.getByText("Visites").parentElement).toHaveTextContent("4");
    expect(screen.getByText("Faites").parentElement).toHaveTextContent("3");
    expect(screen.getByText("Restantes").parentElement).toHaveTextContent("1");
  });

  it("affiche la stat Km comme non disponible sans donnee de distance", () => {
    const missions = [creerMission({ distanceKm: null, distanceKmCorrigee: null })];

    render(<EnTeteAccueil prenom="Dimitri" missions={missions} />);

    expect(screen.getByText("Km").parentElement).toHaveTextContent("—");
  });

  it("affiche la somme des distances reelles quand elles existent", () => {
    const missions = [
      creerMission({ id: "a", distanceKm: 3.2, distanceKmCorrigee: null }),
      creerMission({ id: "b", distanceKm: 5, distanceKmCorrigee: 4.1 }),
    ];

    render(<EnTeteAccueil prenom="Dimitri" missions={missions} />);

    expect(screen.getByText("Km").parentElement).toHaveTextContent("7");
  });
});
