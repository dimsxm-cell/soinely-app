import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TableauDeBordDesktop } from "./TableauDeBordDesktop";
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
    heureDebutReelle: null,
    ...surcharge,
  };
}

describe("TableauDeBordDesktop", () => {
  it("salue l'utilisateur par son prénom", () => {
    render(
      <TableauDeBordDesktop prenom="Camille" missions={[creerMission()]} nombrePatients={12} montantCotationJour={64.5} />
    );

    expect(screen.getByText(/Camille/)).toBeInTheDocument();
  });

  it("affiche le nombre de patients et la cotation du jour dans les cartes KPI", () => {
    render(
      <TableauDeBordDesktop prenom="Camille" missions={[creerMission()]} nombrePatients={12} montantCotationJour={64.5} />
    );

    expect(screen.getByText("Patients actifs").parentElement).toHaveTextContent("12");
    // Espace insécable avant le symbole € : on compare sans en dépendre,
    // même précaution que lib/cotation.test.ts.
    expect(
      screen.getByText("Cotation du jour").parentElement?.textContent?.replace(/\s/g, " ")
    ).toContain("64,50 €");
  });

  it("propose des liens de navigation reels vers Ma tournee, Patients et Documents", () => {
    render(
      <TableauDeBordDesktop prenom="Camille" missions={[creerMission()]} nombrePatients={12} montantCotationJour={64.5} />
    );

    expect(screen.getByRole("link", { name: "Ma tournée" })).toHaveAttribute("href", "/ma-tournee");
    expect(screen.getByRole("link", { name: "Patients" })).toHaveAttribute("href", "/patients");
    expect(screen.getByRole("link", { name: "Documents" })).toHaveAttribute("href", "/situations/dossier");
  });

  it("n'affiche pas de lien pour les entrées de navigation sans destination réelle", () => {
    render(
      <TableauDeBordDesktop prenom="Camille" missions={[creerMission()]} nombrePatients={12} montantCotationJour={64.5} />
    );

    expect(screen.queryByRole("link", { name: "Agenda" })).not.toBeInTheDocument();
    expect(screen.getByText("Agenda")).toBeInTheDocument();
  });
});
