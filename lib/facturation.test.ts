import { describe, expect, it } from "vitest";
import type { ActeVue, MissionTourneeVue } from "@/lib/data/ma-journee";
import type { ContexteTarifaire } from "./cotation";
import type { ValeursLettresCles } from "./zone-tarifaire";
import { calculerDetailPassage } from "./facturation";

const VALEURS: ValeursLettresCles = new Map([
  ["AMI", { lettreCle: "AMI", valeurMetropole: 3.15, valeurDom: 3.3 }],
  ["BSA", { lettreCle: "BSA", valeurMetropole: 13, valeurDom: 13.25 }],
  ["MN", { lettreCle: "MN", valeurMetropole: 9.15, valeurDom: 9.15 }],
  ["MDF", { lettreCle: "MDF", valeurMetropole: 8.5, valeurDom: 8.5 }],
  ["MAU", { lettreCle: "MAU", valeurMetropole: 1.35, valeurDom: 1.35 }],
  ["IFD", { lettreCle: "IFD", valeurMetropole: 2.75, valeurDom: 2.75 }],
]);

const CONTEXTE: ContexteTarifaire = { zone: "metropole", valeurs: VALEURS };

const INJECTION: ActeVue = { libelle: "Injection", code: "AMI 1", cotation: 3.15, lettreCle: "AMI", coefficient: 1, derogatoireBsi: false, eligibleMci: false };
const PANSEMENT: ActeVue = { libelle: "Pansement", code: "AMI 2", cotation: 6.3, lettreCle: "AMI", coefficient: 2, derogatoireBsi: false, eligibleMci: false };
const FORFAIT: ActeVue = { libelle: "Forfait", code: "BSA", cotation: 13, lettreCle: "BSA", coefficient: null, derogatoireBsi: false, eligibleMci: false };

const MARDI = "2026-07-07";
const DIMANCHE = "2026-08-02";

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
    typeSoin: "Pansement",
    heurePrevue: "10:00:00",
    statut: "a_faire",
    missionCliniqueId: null,
    dureeEstimeeMin: 25,
    actes: [PANSEMENT],
    motifAbsence: null,
    ...surcharge,
  };
}

describe("calculerDetailPassage", () => {
  it("additionne les actes et le déplacement d'un passage ordinaire", () => {
    const detail = calculerDetailPassage(creerMission(), MARDI, CONTEXTE);

    expect(detail.actes).toBe(6.3);
    expect(detail.majorations.deplacement).toBe(2.75);
    expect(detail.total).toBe(9.05);
  });

  it("compose le cumul des actes et les majorations de contexte", () => {
    // Pansement (6,30) + moitié de l'injection (1,58) = 7,88 € d'actes.
    // Dimanche à 21 h : 8,50 + 9,15 + 2,75 = 20,40 € de majorations.
    const mission = creerMission({ actes: [PANSEMENT, INJECTION], heurePrevue: "21:00:00" });
    const detail = calculerDetailPassage(mission, DIMANCHE, CONTEXTE);

    expect(detail.actes).toBe(7.88);
    expect(detail.majorations.total).toBe(20.4);
    expect(detail.total).toBe(28.28);
  });

  it("détaille la majoration d'acte unique d'une injection isolée", () => {
    const mission = creerMission({ actes: [INJECTION] });
    const detail = calculerDetailPassage(mission, MARDI, CONTEXTE);

    expect(detail.actes).toBe(3.15);
    expect(detail.majorations.acteUnique).toBe(1.35);
    expect(detail.total).toBe(7.25);
  });

  it("applique la bascule AMX et prive le passage de majorations sous forfait", () => {
    // Forfait entier (13) + pansement basculé en AMX (3,15) = 16,15 €, et
    // seul le déplacement subsiste côté majorations, même un dimanche.
    const mission = creerMission({
      actes: [FORFAIT, PANSEMENT],
      patientForfaitBsi: "BSA",
      heurePrevue: "21:00:00",
    });
    const detail = calculerDetailPassage(mission, DIMANCHE, CONTEXTE);

    expect(detail.actes).toBe(16.15);
    expect(detail.majorations.total).toBe(2.75);
    expect(detail.total).toBe(18.9);
  });

  it("ne facture rien d'un passage marqué absent", () => {
    const mission = creerMission({ statut: "absent" });
    const detail = calculerDetailPassage(mission, DIMANCHE, CONTEXTE);

    expect(detail.actes).toBe(0);
    expect(detail.majorations.total).toBe(0);
    expect(detail.total).toBe(0);
  });

  it("ne facture rien d'un passage sans acte coté", () => {
    const mission = creerMission({ actes: [] });
    expect(calculerDetailPassage(mission, MARDI, CONTEXTE).total).toBe(0);
  });
});
