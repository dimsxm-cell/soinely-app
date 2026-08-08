import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ContexteTarifaire } from "@/lib/cotation";
import { CarteMissionTournee } from "./CarteMissionTournee";
import type { MissionTourneeVue } from "@/lib/data/ma-journee";

vi.mock("@/lib/data/ma-journee-actions", () => ({
  updateMissionStatutAction: vi.fn(),
  updateMotifAbsenceAction: vi.fn(),
}));

function creerMission(surcharge: Partial<MissionTourneeVue> = {}): MissionTourneeVue {
  return {
    id: "m1",
    patientId: "p1",
    patientNom: "Mme Dupont",
    patientAdresse: "12 rue des Lilas",
    patientTelephone: "06 12 34 56 78",
    patientAllergies: null,
    patientConsignes: null,
    patientDateNaissance: "1944-03-12",
    patientForfaitBsi: null,
    distanceKm: null,
    distanceKmCorrigee: null,
    typeSoin: "Pansement",
    heurePrevue: "08:00:00",
    statut: "a_faire",
    missionCliniqueId: null,
    dureeEstimeeMin: 25,
    actes: [],
    motifAbsence: null,
    heureDebutReelle: null,
    ...surcharge,
  };
}

// Table vide : ces tests portent sur les chips et les actions, pas sur les
// montants, qui ont leurs propres tests.
const TARIFS: ContexteTarifaire = { zone: "metropole", valeurs: new Map() };

describe("CarteMissionTournee", () => {
  it("affiche le patient, l'heure, la durée et le statut", () => {
    render(<CarteMissionTournee mission={creerMission()} estDerniere={false}
        dateTournee="2026-07-07"
        contexteTarifaire={TARIFS} />);

    expect(screen.getByText("Mme Dupont")).toBeInTheDocument();
    expect(screen.getByText("08:00")).toBeInTheDocument();
    expect(screen.getByText("25 min")).toBeInTheDocument();
    expect(screen.getByText("À faire")).toBeInTheDocument();
  });

  it("affiche une allergie en encart d'alerte", () => {
    render(
      <CarteMissionTournee
        mission={creerMission({ patientAllergies: "Allergie iode" })}
        estDerniere={false}
        dateTournee="2026-07-07"
        contexteTarifaire={TARIFS}
      />
    );

    expect(screen.getByText("Allergie iode")).toBeInTheDocument();
  });

  it("affiche les consignes en pied de carte, séparées des alertes", () => {
    render(
      <CarteMissionTournee
        mission={creerMission({ patientConsignes: "3e étage sans ascenseur" })}
        estDerniere={false}
        dateTournee="2026-07-07"
        contexteTarifaire={TARIFS}
      />
    );

    const consignes = screen.getByText("3e étage sans ascenseur");
    expect(consignes).toBeInTheDocument();
    // Le pied est un encart clair, pas un encart coloré d'alerte.
    expect(consignes.className).toContain("text-[#6e6880]");
    // Le pictogramme SVG d'alerte n'apparaît que dans l'encart d'allergie.
    expect(screen.queryByText("⚠️")).not.toBeInTheDocument();
  });

  it("propose « Valider le soin » et « Absent » pour une mission à faire", () => {
    render(<CarteMissionTournee mission={creerMission()} estDerniere={false}
        dateTournee="2026-07-07"
        contexteTarifaire={TARIFS} />);

    expect(screen.getByRole("button", { name: "Valider le soin" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Absent" })).toBeInTheDocument();
  });

  it("propose GPS, Appeler et Valider pour une mission en cours", () => {
    render(<CarteMissionTournee mission={creerMission({ statut: "en_cours" })} estDerniere={false}
        dateTournee="2026-07-07"
        contexteTarifaire={TARIFS} />);

    expect(screen.getByRole("link", { name: /GPS/ })).toHaveAttribute(
      "href",
      "https://waze.com/ul?navigate=yes&q=12+rue+des+Lilas"
    );
    expect(screen.getByRole("link", { name: /Appeler/ })).toHaveAttribute(
      "href",
      "tel:0612345678"
    );
    expect(screen.getByRole("button", { name: /Valider/ })).toBeInTheDocument();
  });

  it("n'affiche plus les actions de soin pour une mission validée", () => {
    render(<CarteMissionTournee mission={creerMission({ statut: "terminee" })} estDerniere={false}
        dateTournee="2026-07-07"
        contexteTarifaire={TARIFS} />);

    expect(screen.queryByRole("button", { name: "Valider le soin" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Absent" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /GPS/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Appeler/ })).not.toBeInTheDocument();
  });

  it("n'affiche plus les actions de soin pour une mission absente", () => {
    render(<CarteMissionTournee mission={creerMission({ statut: "absent" })} estDerniere={false}
        dateTournee="2026-07-07"
        contexteTarifaire={TARIFS} />);

    expect(screen.queryByRole("button", { name: "Valider le soin" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Absent" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /GPS/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Appeler/ })).not.toBeInTheDocument();
  });

  it("affiche les consignes même sur une mission validée", () => {
    render(
      <CarteMissionTournee
        mission={creerMission({ statut: "terminee", patientConsignes: "Code portail 4512B" })}
        estDerniere={false}
        dateTournee="2026-07-07"
        contexteTarifaire={TARIFS}
      />
    );

    expect(screen.getByText("Code portail 4512B")).toBeInTheDocument();
  });

  it("le nom du patient renvoie vers l'écran d'arrivée de la mission", () => {
    render(<CarteMissionTournee mission={creerMission()} estDerniere={false}
        dateTournee="2026-07-07"
        contexteTarifaire={TARIFS} />);

    expect(screen.getByRole("link", { name: /Mme Dupont/ })).toHaveAttribute(
      "href",
      "/ma-journee/m1"
    );
  });

  it("affiche le lien de contexte clinique quand il est fourni", () => {
    render(
      <CarteMissionTournee
        mission={creerMission({ statut: "en_cours" })}
        contexteHref="/situations/s1"
        estDerniere={false}
        dateTournee="2026-07-07"
        contexteTarifaire={TARIFS}
      />
    );

    expect(screen.getByRole("link", { name: /contexte clinique/i })).toHaveAttribute(
      "href",
      "/situations/s1"
    );
  });
});

describe("CarteMissionTournee — actes", () => {
  it("affiche un chip par acte, code en tête", () => {
    const { container } = render(
      <CarteMissionTournee
        mission={creerMission({
          actes: [
            { libelle: "toilette", code: "AIS 3", cotation: 7.95, lettreCle: "AIS", coefficient: 3, derogatoireBsi: false, eligibleMci: false },
            { libelle: "insuline", code: "AMI 1", cotation: 3.15, lettreCle: "AMI", coefficient: 1, derogatoireBsi: false, eligibleMci: false },
          ],
        })}
        estDerniere={false}
        dateTournee="2026-07-07"
        contexteTarifaire={TARIFS}
      />
    );

    expect(screen.getByText("AIS 3")).toBeInTheDocument();
    expect(screen.getByText("toilette")).toBeInTheDocument();
    expect(screen.getByText("AMI 1")).toBeInTheDocument();
    expect(screen.getByText("insuline")).toBeInTheDocument();

    // Vérifier qu'aucune icône n'est rendue dans la zone des chips cotés.
    // IconeSoin produit un <svg aria-hidden="true">; on cherche dans le
    // conteneur flex flex-wrap uniquement pour éviter les autres SVG de la carte
    // (adresse, boutons d'action).
    const chipContainer = container.querySelector(".flex.flex-wrap");
    expect(chipContainer?.querySelectorAll("svg")).toHaveLength(0);
  });

  it("affiche le libellé seul pour un acte sans cotation", () => {
    render(
      <CarteMissionTournee
        mission={creerMission({ actes: [{ libelle: "Pansement", code: null, cotation: null, lettreCle: null, coefficient: null, derogatoireBsi: false, eligibleMci: false }] })}
        estDerniere={false}
        dateTournee="2026-07-07"
        contexteTarifaire={TARIFS}
      />
    );

    expect(screen.getByText("Pansement")).toBeInTheDocument();
  });

  it("mêle les deux formes quand un acte est coté et l'autre non", () => {
    render(
      <CarteMissionTournee
        mission={creerMission({
          actes: [
            { libelle: "toilette", code: "AIS 3", cotation: 7.95, lettreCle: "AIS", coefficient: 3, derogatoireBsi: false, eligibleMci: false },
            { libelle: "Pansement", code: null, cotation: null, lettreCle: null, coefficient: null, derogatoireBsi: false, eligibleMci: false },
          ],
        })}
        estDerniere={false}
        dateTournee="2026-07-07"
        contexteTarifaire={TARIFS}
      />
    );

    expect(screen.getByText("AIS 3")).toBeInTheDocument();
    expect(screen.getByText("toilette")).toBeInTheDocument();
    expect(screen.getByText("Pansement")).toBeInTheDocument();
  });

  it("se rabat sur le libellé de synthèse quand la mission ne porte aucun acte", () => {
    render(
      <CarteMissionTournee
        mission={creerMission({ typeSoin: "Pansement", actes: [] })}
        estDerniere={false}
        dateTournee="2026-07-07"
        contexteTarifaire={TARIFS}
      />
    );

    expect(screen.getByText("Pansement")).toBeInTheDocument();
  });
});

describe("CarteMissionTournee — correction d'un statut", () => {
  it("propose d'annuler la validation d'une mission validée", () => {
    render(
      <CarteMissionTournee mission={creerMission({ statut: "terminee" })} estDerniere={false}
        dateTournee="2026-07-07"
        contexteTarifaire={TARIFS} />
    );

    expect(screen.getByRole("button", { name: "Annuler la validation" })).toBeInTheDocument();
  });

  it("propose d'annuler l'absence et de saisir un motif", () => {
    render(
      <CarteMissionTournee mission={creerMission({ statut: "absent" })} estDerniere={false}
        dateTournee="2026-07-07"
        contexteTarifaire={TARIFS} />
    );

    expect(screen.getByRole("button", { name: "Annuler l'absence" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Motif de l'absence/)).toBeInTheDocument();
  });

  it("affiche le motif déjà saisi, et le prérenseigne dans le champ", () => {
    render(
      <CarteMissionTournee
        mission={creerMission({ statut: "absent", motifAbsence: "Hospitalisée depuis hier" })}
        estDerniere={false}
        dateTournee="2026-07-07"
        contexteTarifaire={TARIFS}
      />
    );

    expect(screen.getByText("Hospitalisée depuis hier")).toBeInTheDocument();
    expect(screen.getByLabelText(/Motif de l'absence/)).toHaveValue("Hospitalisée depuis hier");
  });

  it("laisse le champ vide et n'affiche aucun encart quand l'absence n'a pas de motif", () => {
    render(
      <CarteMissionTournee mission={creerMission({ statut: "absent" })} estDerniere={false}
        dateTournee="2026-07-07"
        contexteTarifaire={TARIFS} />
    );

    expect(screen.getByLabelText(/Motif de l'absence/)).toHaveValue("");
    expect(screen.queryByText("⚠️")).not.toBeInTheDocument();
  });

  // Deux tests plutôt qu'un : deux `render` dans un même test s'empilent dans
  // le même conteneur — Testing Library ne nettoie qu'entre les tests — et la
  // requête porterait alors sur les deux cartes à la fois.
  it("ne propose aucune annulation sur une mission à faire", () => {
    render(<CarteMissionTournee mission={creerMission()} estDerniere={false}
        dateTournee="2026-07-07"
        contexteTarifaire={TARIFS} />);

    expect(screen.queryByRole("button", { name: /Annuler/ })).not.toBeInTheDocument();
  });

  it("ne propose aucune annulation sur une mission en cours", () => {
    render(
      <CarteMissionTournee mission={creerMission({ statut: "en_cours" })} estDerniere={false}
        dateTournee="2026-07-07"
        contexteTarifaire={TARIFS} />
    );

    expect(screen.queryByRole("button", { name: /Annuler/ })).not.toBeInTheDocument();
  });
});

describe("CarteMissionTournee — montant du passage", () => {
  const AVEC_TARIFS: ContexteTarifaire = {
    zone: "metropole",
    valeurs: new Map([
      ["AMI", { lettreCle: "AMI", valeurMetropole: 3.15, valeurDom: 3.3 }],
      ["IFD", { lettreCle: "IFD", valeurMetropole: 2.75, valeurDom: 2.75 }],
      ["MDF", { lettreCle: "MDF", valeurMetropole: 8.5, valeurDom: 8.5 }],
    ]),
  };

  const PANSEMENT = {
    libelle: "Pansement",
    code: "AMI 2",
    cotation: 6.3,
    lettreCle: "AMI",
    coefficient: 2,
    derogatoireBsi: false,
    eligibleMci: false,
  };

  it("affiche ce que le passage représente", () => {
    render(
      <CarteMissionTournee
        mission={creerMission({ actes: [PANSEMENT] })}
        estDerniere={false}
        dateTournee="2026-07-07"
        contexteTarifaire={AVEC_TARIFS}
      />
    );

    // 6,30 € d'acte et 2,75 € de déplacement.
    expect(screen.getByText(/9,05/)).toBeInTheDocument();
  });

  it("détaille la part des majorations quand il y en a", () => {
    render(
      <CarteMissionTournee
        mission={creerMission({ actes: [PANSEMENT] })}
        estDerniere={false}
        dateTournee="2026-08-02"
        contexteTarifaire={AVEC_TARIFS}
      />
    );

    // Dimanche : 8,50 € de majoration s'ajoutent aux 2,75 € de déplacement.
    expect(screen.getByText(/dont 11,25.*de majorations/)).toBeInTheDocument();
  });

  it("n'affiche pas de montant sur un passage marqué absent", () => {
    render(
      <CarteMissionTournee
        mission={creerMission({ actes: [PANSEMENT], statut: "absent" })}
        estDerniere={false}
        dateTournee="2026-07-07"
        contexteTarifaire={AVEC_TARIFS}
      />
    );

    expect(screen.queryByText(/€/)).not.toBeInTheDocument();
  });
});

describe("CarteMissionTournee — ancrage de défilement", () => {
  it("porte un id dérivé de l'identifiant de la mission", () => {
    const { container } = render(
      <CarteMissionTournee mission={creerMission({ id: "abc123" })} estDerniere={false}
        dateTournee="2026-07-07"
        contexteTarifaire={TARIFS} />
    );

    expect(container.querySelector("#stop-abc123")).toBeInTheDocument();
  });
});
