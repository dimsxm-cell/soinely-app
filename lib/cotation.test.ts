import { describe, expect, it } from "vitest";
import type { ActeVue, MissionTourneeVue } from "@/lib/data/ma-journee";
import { calculerMontantPassage, calculerMontantTournee, formaterEuros } from "./cotation";

// Tarifs du catalogue fourni par la fondatrice (source albus.fr, 2026-07-30).
const AMI_1: ActeVue = { libelle: "Injection", code: "AMI 1", cotation: 3.15, lettreCle: "AMI" };
const AMI_2: ActeVue = { libelle: "Pansement simple", code: "AMI 2", cotation: 6.3, lettreCle: "AMI" };
const AMI_4: ActeVue = { libelle: "Pansement lourd", code: "AMI 4", cotation: 12.6, lettreCle: "AMI" };
const AIS_3: ActeVue = { libelle: "Toilette", code: "AIS 3", cotation: 7.95, lettreCle: "AIS" };
const TLS: ActeVue = { libelle: "Téléconsultation", code: "TLS", cotation: 10, lettreCle: "TLS" };
const SANS_CODE: ActeVue = { libelle: "Surveillance", code: null, cotation: null, lettreCle: null };

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
    actes: [],
    motifAbsence: null,
    ...surcharge,
  };
}

describe("calculerMontantPassage", () => {
  it("ne compte rien pour un passage sans acte", () => {
    expect(calculerMontantPassage([])).toBe(0);
  });

  it("compte un acte seul à son tarif", () => {
    expect(calculerMontantPassage([AMI_2])).toBe(6.3);
  });

  it("compte le deuxième acte pour moitié", () => {
    // 6,30 € + la moitié de 3,15 € = 7,875 €, arrondi au centime supérieur.
    expect(calculerMontantPassage([AMI_2, AMI_1])).toBe(7.88);
  });

  it("ne compte pas le troisième acte ni les suivants", () => {
    // Seuls AMI 4 (12,60) et AMI 2 (3,15 après moitié) comptent.
    expect(calculerMontantPassage([AMI_4, AMI_2, AMI_1])).toBe(15.75);
  });

  it("réduit l'acte le moins cher, quel que soit l'ordre de saisie", () => {
    // Saisir l'injection en premier ne doit pas lui faire porter le tarif
    // plein au détriment du pansement : c'est le tarif qui décide du rang.
    expect(calculerMontantPassage([AMI_1, AMI_2])).toBe(
      calculerMontantPassage([AMI_2, AMI_1])
    );
  });

  it("ignore un acte sans code, que rien ne permet de chiffrer", () => {
    expect(calculerMontantPassage([AMI_2, SANS_CODE])).toBe(6.3);
  });

  it("compte un acte cumulable en entier sans consommer de rang", () => {
    // Le TLS est cumulable : il s'ajoute en entier, et le pansement garde son
    // tarif plein au lieu d'être relégué au rang de deuxième acte.
    expect(calculerMontantPassage([TLS, AMI_2])).toBe(16.3);
  });

  it("applique la règle aux seuls actes non cumulables", () => {
    // TLS entier (10) + AMI 2 entier (6,30) + moitié de AMI 1 (1,575).
    expect(calculerMontantPassage([TLS, AMI_2, AMI_1])).toBe(17.88);
  });

  it("mélange les lettres-clés sans distinction hors cumulables", () => {
    // AIS 3 (7,95) est le plus cher, AMI 2 tombe à moitié (3,15).
    expect(calculerMontantPassage([AIS_3, AMI_2])).toBe(11.1);
  });
});

describe("calculerMontantTournee", () => {
  it("ne compte rien pour une tournée vide", () => {
    expect(calculerMontantTournee([])).toBe(0);
  });

  it("additionne les passages", () => {
    const missions = [
      creerMission({ id: "m1", actes: [AMI_2] }),
      creerMission({ id: "m2", actes: [AIS_3] }),
    ];
    expect(calculerMontantTournee(missions)).toBe(14.25);
  });

  it("compte un passage encore à faire, qui reste dû une fois réalisé", () => {
    const missions = [
      creerMission({ id: "m1", statut: "terminee", actes: [AMI_2] }),
      creerMission({ id: "m2", statut: "a_faire", actes: [AMI_2] }),
    ];
    expect(calculerMontantTournee(missions)).toBe(12.6);
  });

  it("ne compte pas un passage marqué absent, le soin n'ayant pas eu lieu", () => {
    const missions = [
      creerMission({ id: "m1", actes: [AMI_2] }),
      creerMission({ id: "m2", statut: "absent", actes: [AMI_4] }),
    ];
    expect(calculerMontantTournee(missions)).toBe(6.3);
  });

  it("arrête le compte au centime à chaque passage plutôt que de laisser l'écart courir", () => {
    // Trois passages à 7,875 € : arrondis un par un, ils font 23,64 € et non
    // les 23,63 € qu'un arrondi final aurait donnés.
    const missions = [1, 2, 3].map((n) =>
      creerMission({ id: `m${n}`, actes: [AMI_2, AMI_1] })
    );
    expect(calculerMontantTournee(missions)).toBe(23.64);
  });
});

describe("formaterEuros", () => {
  it("écrit le montant à la française", () => {
    // Espace insécable avant le symbole : on compare sans en dépendre.
    expect(formaterEuros(7.88).replace(/\s/g, " ")).toBe("7,88 €");
  });

  it("garde les centimes d'un montant rond", () => {
    expect(formaterEuros(13).replace(/\s/g, " ")).toBe("13,00 €");
  });

  it("sépare les milliers", () => {
    expect(formaterEuros(1234.5).replace(/\s/g, " ")).toBe("1 234,50 €");
  });
});
