import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CarteTourneeEnCoursDesktop } from "./CarteTourneeEnCoursDesktop";
import { getInitiales } from "@/lib/tournee-vue";
import type { MissionTourneeVue } from "@/lib/data/ma-journee";

function creerMission(surcharge: Partial<MissionTourneeVue> = {}): MissionTourneeVue {
  return {
    id: "m1",
    patientId: "p1",
    patientNom: "Mme Lefèvre",
    patientAdresse: "3 rue du Chemin Vert",
    patientTelephone: "0600000000",
    patientAllergies: null,
    patientConsignes: null,
    patientDateNaissance: null,
    patientForfaitBsi: null,
    distanceKm: 2.1,
    distanceKmCorrigee: null,
    typeSoin: "Pansement",
    heurePrevue: "14:20:00",
    statut: "en_cours",
    missionCliniqueId: null,
    dureeEstimeeMin: 20,
    actes: [],
    motifAbsence: null,
    heureDebutReelle: "2026-08-09T14:12:00Z",
    ...surcharge,
  };
}

describe("CarteTourneeEnCoursDesktop", () => {
  it("affiche le patient du prochain arrêt (mission en cours en priorité)", () => {
    const missions = [
      creerMission({ id: "a", statut: "a_faire", patientNom: "Mme Chevalier", heurePrevue: "15:15:00" }),
      creerMission({ id: "b", statut: "en_cours", patientNom: "Mme Lefèvre" }),
    ];
    render(<CarteTourneeEnCoursDesktop missions={missions} />);

    expect(screen.getByText("Mme Lefèvre")).toBeInTheDocument();
  });

  it("affiche le premier arrêt à faire quand rien n'est en cours", () => {
    const missions = [
      creerMission({ id: "a", statut: "terminee", patientNom: "Mme Bernard", heurePrevue: "10:00:00" }),
      creerMission({ id: "b", statut: "a_faire", patientNom: "M. Nguyen", heurePrevue: "16:00:00" }),
    ];
    render(<CarteTourneeEnCoursDesktop missions={missions} />);

    expect(screen.getByText("M. Nguyen")).toBeInTheDocument();
  });

  it("affiche le compte de soins faits sur le total", () => {
    const missions = [
      creerMission({ id: "a", statut: "terminee" }),
      creerMission({ id: "b", statut: "absent" }),
      creerMission({ id: "c", statut: "a_faire", heurePrevue: "16:00:00" }),
    ];
    render(<CarteTourneeEnCoursDesktop missions={missions} />);

    expect(screen.getByText("2").parentElement).toHaveTextContent("2/3");
  });

  it("additionne les km restants des arrêts non terminés, arrondis comme calculerKmTournee", () => {
    const missions = [
      creerMission({ id: "a", statut: "en_cours", distanceKm: 2.1, distanceKmCorrigee: null }),
      creerMission({ id: "b", statut: "a_faire", heurePrevue: "16:00:00", distanceKm: 3, distanceKmCorrigee: 4.5 }),
      creerMission({ id: "c", statut: "terminee", distanceKm: 100, distanceKmCorrigee: null }),
    ];
    render(<CarteTourneeEnCoursDesktop missions={missions} />);

    // 2.1 + 4.5 (distanceKmCorrigee prime sur distanceKm) = 6.6, arrondi à 7
    expect(screen.getByText(/7 km/)).toBeInTheDocument();
  });

  it("affiche un état vide sobre sans mission restante", () => {
    const missions = [creerMission({ id: "a", statut: "terminee" })];
    render(<CarteTourneeEnCoursDesktop missions={missions} />);

    expect(screen.getByText("Tournée terminée")).toBeInTheDocument();
  });

  it("distingue l'absence de tournée du jour d'une tournée terminée", () => {
    render(<CarteTourneeEnCoursDesktop missions={[]} />);

    expect(screen.getByText("Aucune tournée aujourd'hui")).toBeInTheDocument();
    expect(screen.queryByText("Tournée terminée")).not.toBeInTheDocument();
  });

  it("affiche les bonnes initiales en ignorant la civilité", () => {
    const nomAvecCivilite = "M. Nguyen";
    const missions = [creerMission({ id: "a", statut: "en_cours", patientNom: nomAvecCivilite })];
    render(<CarteTourneeEnCoursDesktop missions={missions} />);

    const initialesAttendue = getInitiales(nomAvecCivilite);
    expect(screen.getByText(initialesAttendue)).toBeInTheDocument();
  });
});
