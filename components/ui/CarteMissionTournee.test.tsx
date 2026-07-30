import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CarteMissionTournee } from "./CarteMissionTournee";
import type { MissionTourneeVue } from "@/lib/data/ma-journee";

vi.mock("@/lib/data/ma-journee-actions", () => ({
  updateMissionStatutAction: vi.fn(),
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
    typeSoin: "Pansement",
    heurePrevue: "08:00:00",
    statut: "a_faire",
    missionCliniqueId: null,
    dureeEstimeeMin: 25,
    ...surcharge,
  };
}

describe("CarteMissionTournee", () => {
  it("affiche le patient, l'heure, la durée et le statut", () => {
    render(<CarteMissionTournee mission={creerMission()} estDerniere={false} />);

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
      />
    );

    expect(screen.getByText("Allergie iode")).toBeInTheDocument();
  });

  it("affiche les consignes en pied de carte, séparées des alertes", () => {
    render(
      <CarteMissionTournee
        mission={creerMission({ patientConsignes: "3e étage sans ascenseur" })}
        estDerniere={false}
      />
    );

    const consignes = screen.getByText("3e étage sans ascenseur");
    expect(consignes).toBeInTheDocument();
    // Le pied est un simple filet pointillé, pas un encart coloré d'alerte.
    expect(consignes.className).toContain("text-navy/45");
    expect(consignes.closest("div")?.className).toContain("border-dashed");
    // Le pictogramme ⚠️ n'apparaît que dans l'encart d'allergie.
    expect(screen.queryByText("⚠️")).not.toBeInTheDocument();
  });

  it("propose « Valider le soin » et « Absent » pour une mission à faire", () => {
    render(<CarteMissionTournee mission={creerMission()} estDerniere={false} />);

    expect(screen.getByRole("button", { name: "Valider le soin" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Absent" })).toBeInTheDocument();
  });

  it("propose GPS, Appeler et Valider pour une mission en cours", () => {
    render(<CarteMissionTournee mission={creerMission({ statut: "en_cours" })} estDerniere={false} />);

    expect(screen.getByRole("link", { name: /GPS/ })).toHaveAttribute(
      "href",
      "https://maps.google.com/?q=12%20rue%20des%20Lilas"
    );
    expect(screen.getByRole("link", { name: /Appeler/ })).toHaveAttribute(
      "href",
      "tel:0612345678"
    );
    expect(screen.getByRole("button", { name: /Valider/ })).toBeInTheDocument();
  });

  it("n'affiche aucune action pour une mission validée", () => {
    render(<CarteMissionTournee mission={creerMission({ statut: "terminee" })} estDerniere={false} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("n'affiche aucune action pour une mission absente", () => {
    render(<CarteMissionTournee mission={creerMission({ statut: "absent" })} estDerniere={false} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("affiche les consignes même sur une mission validée", () => {
    render(
      <CarteMissionTournee
        mission={creerMission({ statut: "terminee", patientConsignes: "Code portail 4512B" })}
        estDerniere={false}
      />
    );

    expect(screen.getByText("Code portail 4512B")).toBeInTheDocument();
  });

  it("le nom du patient renvoie vers l'écran d'arrivée de la mission", () => {
    render(<CarteMissionTournee mission={creerMission()} estDerniere={false} />);

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
      />
    );

    expect(screen.getByRole("link", { name: /contexte clinique/i })).toHaveAttribute(
      "href",
      "/situations/s1"
    );
  });
});
