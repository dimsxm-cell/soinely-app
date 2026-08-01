import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EnTeteTournee } from "./EnTeteTournee";
import type { MissionTourneeVue } from "@/lib/data/ma-journee";
import type { StatutMission, Tournee } from "@/lib/types/clinical";

const tournee: Tournee = {
  id: "t1",
  date: "2026-07-30",
  nbPatients: 8,
  nbInjections: 3,
  nbPansements: 2,
  nbGlycemies: 1,
  tempsEstimeMin: 240,
};

function creerMission(id: string, statut: StatutMission, heurePrevue: string): MissionTourneeVue {
  return {
    id,
    patientId: `p-${id}`,
    patientNom: "Mme Dupont",
    patientAdresse: "12 rue des Lilas",
    patientTelephone: "06 12 34 56 78",
    patientAllergies: null,
    patientConsignes: null,
    patientDateNaissance: "1944-03-12",
    typeSoin: "Pansement",
    heurePrevue,
    statut,
    missionCliniqueId: null,
    dureeEstimeeMin: 25,
    actes: [],
    motifAbsence: null,
  };
}

// Les trois nombres affichés — validés (2), restants (3), patients (8) — sont
// volontairement distincts : sinon `getByText("2")` en trouverait plusieurs et
// échouerait sur l'ambiguïté plutôt que sur le comportement testé.
const missions = [
  creerMission("a", "terminee", "08:00:00"),
  creerMission("b", "absent", "10:05:00"),
  creerMission("c", "a_faire", "15:15:00"),
  creerMission("d", "a_faire", "16:00:00"),
  creerMission("e", "a_faire", "18:05:00"),
];

describe("EnTeteTournee", () => {
  // Horloge figée : le composant affiche l'heure actuelle en direct, et sans
  // ça le test devient instable une minute par jour (quand « maintenant »
  // coïncide avec l'heure de fin estimée « 18:05 » affichée plus bas).
  //
  // On ne feint que Date. Feindre tous les minuteurs — le défaut — gèle aussi
  // setTimeout, queueMicrotask et process.nextTick, dont React 19 se sert pour
  // achever un rendu : selon la charge de la machine, render() partait alors
  // attendre un minuteur figé et le test expirait au bout de cinq secondes.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-30T09:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("affiche le compteur de passages validés sur le total", () => {
    render(<EnTeteTournee missions={missions} tournee={tournee} />);

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("/5")).toBeInTheDocument();
    expect(screen.getByText("passages validés")).toBeInTheDocument();
  });

  it("affiche l'heure courante, prise sur l'horloge figée", () => {
    render(<EnTeteTournee missions={missions} tournee={tournee} />);

    // Prouve que Date est bien feinte : sans cela, cette assertion échouerait
    // 1439 minutes sur 1440, et le gel de l'horloge deviendrait décoratif.
    expect(screen.getByText("09:00")).toBeInTheDocument();
  });

  it("la barre de progression annonce le pourcentage validé", () => {
    render(<EnTeteTournee missions={missions} tournee={tournee} />);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");
  });

  it("affiche le nombre de missions restantes et l'heure de fin estimée", () => {
    render(<EnTeteTournee missions={missions} tournee={tournee} />);

    expect(screen.getByText("Reste")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Fin est.")).toBeInTheDocument();
    expect(screen.getByText("18:05")).toBeInTheDocument();
  });

  it("affiche le nombre de patients de la tournée", () => {
    render(<EnTeteTournee missions={missions} tournee={tournee} />);

    expect(screen.getByText("Patients")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("affiche le montant des actes cotés de la tournée", () => {
    // Un pansement (6,30 €) et une injection (3,15 €) au même passage : la
    // règle du deuxième acte à 50 % donne 7,88 €, plus 7,95 € de toilette.
    const avecActes = [
      {
        ...creerMission("a", "terminee", "08:00:00"),
        actes: [
          { libelle: "Pansement", code: "AMI 2", cotation: 6.3, lettreCle: "AMI" },
          { libelle: "Injection", code: "AMI 1", cotation: 3.15, lettreCle: "AMI" },
        ],
      },
      {
        ...creerMission("b", "a_faire", "10:00:00"),
        actes: [{ libelle: "Toilette", code: "AIS 3", cotation: 7.95, lettreCle: "AIS" }],
      },
    ];

    render(<EnTeteTournee missions={avecActes} tournee={tournee} />);

    expect(screen.getByText("Actes cotés")).toBeInTheDocument();
    expect(screen.getByText(/15,83/)).toBeInTheDocument();
  });

  it("tait le montant tant qu'aucun acte n'est coté, plutôt que d'annoncer zéro", () => {
    // Un « 0,00 € » se lirait comme une journée sans valeur, alors qu'il ne
    // dit que l'absence de codes sur des soins bien réels.
    render(<EnTeteTournee missions={missions} tournee={tournee} />);

    expect(screen.queryByText("Actes cotés")).not.toBeInTheDocument();
  });

  it("n'affiche pas d'heure de fin quand tout est validé", () => {
    const toutesValidees = [
      creerMission("a", "terminee", "08:00:00"),
      creerMission("b", "terminee", "10:05:00"),
    ];

    render(<EnTeteTournee missions={toutesValidees} tournee={tournee} />);

    expect(screen.queryByText("Fin est.")).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });
});
