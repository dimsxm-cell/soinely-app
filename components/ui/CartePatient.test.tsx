import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CartePatient } from "./CartePatient";
import type { PatientComplet } from "@/lib/types/clinical";

const patient: PatientComplet = {
  id: "p1",
  nomComplet: "Mme Dupont",
  adresse: "12 rue des Lilas",
  telephone: "0601020304",
  allergies: null,
  consignes: null,
  dateNaissance: null,
  numeroSecu: null,
  sexe: null,
  medecinNom: null,
  medecinTelephone: null,
  personneConfianceNom: null,
  personneConfianceTelephone: null,
  noteSoin: null,
  antecedents: null,
  traitementsEnCours: null,
};

describe("CartePatient", () => {
  it("affiche le nom, l'adresse et un lien vers la fiche", () => {
    render(<CartePatient patient={patient} />);

    expect(screen.getByText("Mme Dupont")).toBeInTheDocument();
    expect(screen.getByText("12 rue des Lilas")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/patients/p1");
  });
});
