import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ListePatients } from "./ListePatients";
import type { PatientComplet } from "@/lib/types/clinical";

function creerPatient(surcharge: Partial<PatientComplet> = {}): PatientComplet {
  return {
    id: "p1",
    nomComplet: "Mme Dupont",
    adresse: "12 rue des Lilas",
    telephone: "0600000000",
    allergies: null,
    consignes: null,
    dateNaissance: null,
    forfaitBsi: null,
    numeroSecu: null,
    sexe: null,
    medecinNom: null,
    medecinTelephone: null,
    personneConfianceNom: null,
    personneConfianceTelephone: null,
    noteSoin: null,
    antecedents: null,
    traitementsEnCours: null,
    ...surcharge,
  };
}

describe("ListePatients", () => {
  it("affiche le nombre total de patients dans le KPI Suivis", () => {
    const patients = [creerPatient({ id: "a" }), creerPatient({ id: "b" })];
    render(<ListePatients patients={patients} prochaineVisiteParPatient={{}} />);

    expect(screen.getByText("Suivis").parentElement).toHaveTextContent("2");
  });

  it("compte les patients ayant une visite aujourd'hui dans le KPI dédié", () => {
    const patients = [creerPatient({ id: "a" }), creerPatient({ id: "b" }), creerPatient({ id: "c" })];
    render(
      <ListePatients
        patients={patients}
        prochaineVisiteParPatient={{ a: "08:00:00", b: "09:00:00" }}
      />
    );

    expect(screen.getByText("Aujourd'hui").parentElement).toHaveTextContent("2");
  });

  it("compte les patients avec une allergie renseignée dans le KPI Alertes", () => {
    const patients = [
      creerPatient({ id: "a", allergies: "Iode" }),
      creerPatient({ id: "b", allergies: "  " }),
      creerPatient({ id: "c", allergies: null }),
    ];
    render(<ListePatients patients={patients} prochaineVisiteParPatient={{}} />);

    expect(screen.getByText("Alertes").parentElement).toHaveTextContent("1");
  });

  it("filtre la liste depuis le champ de recherche de l'en-tête", () => {
    const patients = [
      creerPatient({ id: "a", nomComplet: "Mme Dupont" }),
      creerPatient({ id: "b", nomComplet: "M. Martin" }),
    ];
    render(<ListePatients patients={patients} prochaineVisiteParPatient={{}} />);

    fireEvent.change(screen.getByLabelText("Rechercher un patient"), { target: { value: "Martin" } });

    expect(screen.getByText("M. Martin")).toBeInTheDocument();
    expect(screen.queryByText("Mme Dupont")).not.toBeInTheDocument();
  });

  it("propose un lien vers la création de patient", () => {
    const patients = [creerPatient()];
    render(<ListePatients patients={patients} prochaineVisiteParPatient={{}} />);

    expect(screen.getByRole("link", { name: /Ajouter un patient/ })).toHaveAttribute(
      "href",
      "/patients/nouveau"
    );
  });
});
