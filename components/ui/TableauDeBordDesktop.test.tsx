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

describe("TableauDeBordDesktop — suite de la tournée", () => {
  it("liste les arrêts restants sans répéter celui déjà mis en avant dans la carte tournée", () => {
    const missions = [
      creerMission({ id: "a", statut: "en_cours", patientNom: "Mme Lefèvre" }),
      creerMission({ id: "b", statut: "a_faire", patientNom: "Mme Chevalier", heurePrevue: "15:15:00" }),
      creerMission({ id: "c", statut: "terminee", patientNom: "M. Bruno", heurePrevue: "09:00:00" }),
    ];
    render(
      <TableauDeBordDesktop prenom="Camille" missions={missions} nombrePatients={12} montantCotationJour={64.5} />
    );

    // "Mme Lefèvre" apparaît une fois dans la carte tournée, mais pas répétée dans la liste
    expect(screen.getAllByText("Mme Lefèvre")).toHaveLength(1);
    expect(screen.getByText("Mme Chevalier")).toBeInTheDocument();
    expect(screen.queryByText("M. Bruno")).not.toBeInTheDocument();
  });

  it("affiche un etat vide sobre quand plus aucun arret ne reste apres celui en cours", () => {
    const missions = [creerMission({ id: "a", statut: "en_cours" })];
    render(
      <TableauDeBordDesktop prenom="Camille" missions={missions} nombrePatients={12} montantCotationJour={64.5} />
    );

    expect(screen.getByText("Aucun autre arrêt aujourd'hui.")).toBeInTheDocument();
  });
});
