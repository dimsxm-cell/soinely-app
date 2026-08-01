import { describe, expect, it } from "vitest";
import type { ActeVue, MissionTourneeVue } from "@/lib/data/ma-journee";
import type { ContexteTarifaire } from "./cotation";
import type { ValeursLettresCles } from "./zone-tarifaire";
import { calculerMajorationsPassage, calculerMajorationsTournee } from "./majorations";

const VALEURS: ValeursLettresCles = new Map([
  ["AMI", { lettreCle: "AMI", valeurMetropole: 3.15, valeurDom: 3.3 }],
  ["MAU", { lettreCle: "MAU", valeurMetropole: 1.35, valeurDom: 1.35 }],
  ["MCI", { lettreCle: "MCI", valeurMetropole: 5, valeurDom: 5 }],
  ["MIE", { lettreCle: "MIE", valeurMetropole: 3.15, valeurDom: 3.15 }],
  ["MN", { lettreCle: "MN", valeurMetropole: 9.15, valeurDom: 9.15 }],
  ["MNP", { lettreCle: "MNP", valeurMetropole: 18.3, valeurDom: 18.3 }],
  ["MDF", { lettreCle: "MDF", valeurMetropole: 8.5, valeurDom: 8.5 }],
  ["IFD", { lettreCle: "IFD", valeurMetropole: 2.75, valeurDom: 2.75 }],
]);

const CONTEXTE: ContexteTarifaire = { zone: "metropole", valeurs: VALEURS };

const INJECTION: ActeVue = { libelle: "Injection", code: "AMI 1", cotation: 3.15, lettreCle: "AMI", coefficient: 1, derogatoireBsi: false, eligibleMci: false };
const PANSEMENT: ActeVue = { libelle: "Pansement", code: "AMI 2", cotation: 6.3, lettreCle: "AMI", coefficient: 2, derogatoireBsi: false, eligibleMci: false };
const PANSEMENT_LOURD: ActeVue = { libelle: "Pansement lourd", code: "AMI 4", cotation: 12.6, lettreCle: "AMI", coefficient: 4, derogatoireBsi: true, eligibleMci: true };
const TELECONSULT: ActeVue = { libelle: "Téléconsultation", code: "TLS", cotation: 10, lettreCle: "TLS", coefficient: null, derogatoireBsi: false, eligibleMci: false };

// Un mardi ordinaire, en pleine journée : aucune majoration de contexte.
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

describe("indemnité de déplacement", () => {
  it("est due à chaque passage effectué", () => {
    const detail = calculerMajorationsPassage(creerMission(), MARDI, CONTEXTE);
    expect(detail.deplacement).toBe(2.75);
  });

  it("n'est pas due sans acte coté, rien ne permettant de facturer le passage", () => {
    const sansActe = creerMission({ actes: [] });
    expect(calculerMajorationsPassage(sansActe, MARDI, CONTEXTE).deplacement).toBe(0);
  });

  it("n'est pas due sur un passage marqué absent", () => {
    const absent = creerMission({ statut: "absent" });
    expect(calculerMajorationsPassage(absent, MARDI, CONTEXTE).total).toBe(0);
  });

  it("reste due chez un patient sous forfait, qui n'ouvre pas droit aux majorations", () => {
    const sousForfait = creerMission({ patientForfaitBsi: "BSA" });
    const detail = calculerMajorationsPassage(sousForfait, DIMANCHE, CONTEXTE);

    expect(detail.deplacement).toBe(2.75);
    expect(detail.dimancheFerie).toBe(0);
    expect(detail.total).toBe(2.75);
  });
});

describe("majoration horaire", () => {
  it.each([
    ["10:00:00", 0, "en pleine journée"],
    ["08:00:00", 0, "à huit heures, début de journée"],
    ["19:59:00", 0, "juste avant vingt heures"],
    ["20:00:00", 9.15, "à vingt heures"],
    ["22:30:00", 9.15, "en soirée"],
    ["23:00:00", 18.3, "à vingt-trois heures, nuit profonde"],
    ["03:00:00", 18.3, "au cœur de la nuit"],
    ["05:00:00", 9.15, "à cinq heures"],
    ["07:45:00", 9.15, "au petit matin"],
  ])("compte %s pour %s €, %s", (heure, attendu) => {
    const mission = creerMission({ heurePrevue: heure });
    expect(calculerMajorationsPassage(mission, MARDI, CONTEXTE).horaire).toBe(attendu);
  });
});

describe("majoration dimanche et jours fériés", () => {
  it("s'applique un dimanche", () => {
    expect(calculerMajorationsPassage(creerMission(), DIMANCHE, CONTEXTE).dimancheFerie).toBe(8.5);
  });

  it("ne s'applique pas un jour ordinaire", () => {
    expect(calculerMajorationsPassage(creerMission(), MARDI, CONTEXTE).dimancheFerie).toBe(0);
  });

  it("s'applique le 27 mai en Guadeloupe, jour ordinaire en métropole", () => {
    const outreMer: ContexteTarifaire = { zone: "dom", valeurs: VALEURS };

    expect(calculerMajorationsPassage(creerMission(), "2026-05-27", outreMer).dimancheFerie).toBe(8.5);
    expect(calculerMajorationsPassage(creerMission(), "2026-05-27", CONTEXTE).dimancheFerie).toBe(0);
  });

  it("se cumule avec la majoration de nuit", () => {
    // Un passage à vingt-deux heures un dimanche relève des deux situations.
    const mission = creerMission({ heurePrevue: "22:00:00" });
    const detail = calculerMajorationsPassage(mission, DIMANCHE, CONTEXTE);

    expect(detail.horaire).toBe(9.15);
    expect(detail.dimancheFerie).toBe(8.5);
  });
});

describe("majoration d'acte unique", () => {
  it("s'applique à une injection isolée", () => {
    const mission = creerMission({ actes: [INJECTION] });
    expect(calculerMajorationsPassage(mission, MARDI, CONTEXTE).acteUnique).toBe(1.35);
  });

  it("ne s'applique pas dès qu'un second acte accompagne l'injection", () => {
    const mission = creerMission({ actes: [INJECTION, PANSEMENT] });
    expect(calculerMajorationsPassage(mission, MARDI, CONTEXTE).acteUnique).toBe(0);
  });

  it("ne s'applique pas à un acte d'un autre coefficient", () => {
    // Le pansement simple est un AMI 2 : la MAU ne vise que les AMI 1 et 1,5.
    const mission = creerMission({ actes: [PANSEMENT] });
    expect(calculerMajorationsPassage(mission, MARDI, CONTEXTE).acteUnique).toBe(0);
  });
});

describe("majoration de coordination", () => {
  it("s'applique à un soin complexe", () => {
    const mission = creerMission({ actes: [PANSEMENT_LOURD] });
    expect(calculerMajorationsPassage(mission, MARDI, CONTEXTE).coordination).toBe(5);
  });

  it("ne se compte qu'une fois par passage", () => {
    const mission = creerMission({ actes: [PANSEMENT_LOURD, PANSEMENT_LOURD] });
    expect(calculerMajorationsPassage(mission, MARDI, CONTEXTE).coordination).toBe(5);
  });

  it("ne s'applique pas à un soin courant", () => {
    expect(calculerMajorationsPassage(creerMission(), MARDI, CONTEXTE).coordination).toBe(0);
  });
});

describe("majoration enfant", () => {
  it("s'applique à un enfant de moins de sept ans, par acte", () => {
    const mission = creerMission({
      patientDateNaissance: "2023-06-01",
      actes: [PANSEMENT, INJECTION],
    });

    expect(calculerMajorationsPassage(mission, MARDI, CONTEXTE).enfant).toBe(6.3);
  });

  it("ne s'applique pas à un patient de sept ans ou plus", () => {
    const mission = creerMission({ patientDateNaissance: "2015-06-01" });
    expect(calculerMajorationsPassage(mission, MARDI, CONTEXTE).enfant).toBe(0);
  });

  it("ne s'applique pas sans date de naissance connue", () => {
    const mission = creerMission({ patientDateNaissance: null });
    expect(calculerMajorationsPassage(mission, MARDI, CONTEXTE).enfant).toBe(0);
  });
});

describe("actes hors AMI et AIS", () => {
  it("n'ouvrent pas droit aux majorations, mais laissent le déplacement dû", () => {
    // Les majorations « ne s'appliquent qu'aux actes cotés en AMI ou AIS ».
    const mission = creerMission({ actes: [TELECONSULT], heurePrevue: "22:00:00" });
    const detail = calculerMajorationsPassage(mission, DIMANCHE, CONTEXTE);

    expect(detail.horaire).toBe(0);
    expect(detail.dimancheFerie).toBe(0);
    expect(detail.deplacement).toBe(2.75);
  });
});

describe("calculerMajorationsTournee", () => {
  it("additionne les majorations de chaque passage", () => {
    const missions = [
      creerMission({ id: "m1" }),
      creerMission({ id: "m2", heurePrevue: "21:00:00" }),
    ];

    // 2,75 + (2,75 + 9,15) = 14,65 €.
    expect(calculerMajorationsTournee(missions, MARDI, CONTEXTE)).toBe(14.65);
  });

  it("ne compte rien quand la table des valeurs est vide", () => {
    // État tant que la migration n'est pas appliquée : aucune majoration
    // n'est inventée, le total reste celui des actes seuls.
    const vide: ContexteTarifaire = { zone: "metropole", valeurs: new Map() };
    expect(calculerMajorationsTournee([creerMission()], DIMANCHE, vide)).toBe(0);
  });
});
