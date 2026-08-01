import { describe, expect, it } from "vitest";
import type { ActeVue, MissionTourneeVue } from "@/lib/data/ma-journee";
import { calculerMontantPassage, calculerMontantTournee, formaterEuros, type ContexteTarifaire } from "./cotation";
import type { ValeursLettresCles } from "./zone-tarifaire";

// Table vide : chaque acte se rabat sur le montant figé du catalogue. C'est
// l'état tant que la migration n'est pas appliquée, et il doit rester juste.
const SANS_TABLE: ContexteTarifaire = { zone: "metropole", valeurs: new Map() };

// Tarifs du catalogue fourni par la fondatrice (source albus.fr, 2026-07-30).
const AMI_1: ActeVue = { libelle: "Injection", code: "AMI 1", cotation: 3.15, lettreCle: "AMI", coefficient: 1 };
const AMI_2: ActeVue = { libelle: "Pansement simple", code: "AMI 2", cotation: 6.3, lettreCle: "AMI", coefficient: 2 };
const AMI_4: ActeVue = { libelle: "Pansement lourd", code: "AMI 4", cotation: 12.6, lettreCle: "AMI", coefficient: 4 };
const AIS_3: ActeVue = { libelle: "Toilette", code: "AIS 3", cotation: 7.95, lettreCle: "AIS", coefficient: 3 };
const TLS: ActeVue = { libelle: "Téléconsultation", code: "TLS", cotation: 10, lettreCle: "TLS", coefficient: null };
const BSA: ActeVue = { libelle: "Forfait dépendance légère", code: "BSA", cotation: 13, lettreCle: "BSA", coefficient: null };
const SANS_CODE: ActeVue = { libelle: "Surveillance", code: null, cotation: null, lettreCle: null, coefficient: null };

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
    expect(calculerMontantPassage([], SANS_TABLE)).toBe(0);
  });

  it("compte un acte seul à son tarif", () => {
    expect(calculerMontantPassage([AMI_2], SANS_TABLE)).toBe(6.3);
  });

  it("compte le deuxième acte pour moitié", () => {
    // 6,30 € + la moitié de 3,15 € = 7,875 €, arrondi au centime supérieur.
    expect(calculerMontantPassage([AMI_2, AMI_1], SANS_TABLE)).toBe(7.88);
  });

  it("ne compte pas le troisième acte ni les suivants", () => {
    // Seuls AMI 4 (12,60) et AMI 2 (3,15 après moitié) comptent.
    expect(calculerMontantPassage([AMI_4, AMI_2, AMI_1], SANS_TABLE)).toBe(15.75);
  });

  it("réduit l'acte le moins cher, quel que soit l'ordre de saisie", () => {
    // Saisir l'injection en premier ne doit pas lui faire porter le tarif
    // plein au détriment du pansement : c'est le tarif qui décide du rang.
    expect(calculerMontantPassage([AMI_1, AMI_2], SANS_TABLE)).toBe(
      calculerMontantPassage([AMI_2, AMI_1], SANS_TABLE)
    );
  });

  it("ignore un acte sans code, que rien ne permet de chiffrer", () => {
    expect(calculerMontantPassage([AMI_2, SANS_CODE], SANS_TABLE)).toBe(6.3);
  });

  it("compte un acte cumulable en entier sans consommer de rang", () => {
    // Le TLS est cumulable : il s'ajoute en entier, et le pansement garde son
    // tarif plein au lieu d'être relégué au rang de deuxième acte.
    expect(calculerMontantPassage([TLS, AMI_2], SANS_TABLE)).toBe(16.3);
  });

  it("applique la règle aux seuls actes non cumulables", () => {
    // TLS entier (10) + AMI 2 entier (6,30) + moitié de AMI 1 (1,575).
    expect(calculerMontantPassage([TLS, AMI_2, AMI_1], SANS_TABLE)).toBe(17.88);
  });

  it("reproduit l'exemple de l'article 11B", () => {
    // Pansement courant + prélèvement + injection lors de la même visite :
    // AMI 3 en entier (9,45), AMI 1,5 pour moitié (2,36), AMI 1 gratuit.
    const AMI_3 = { libelle: "Pansement courant", code: "AMI 3", cotation: 9.45, lettreCle: "AMI", coefficient: 3 };
    const AMI_1_5 = { libelle: "Prélèvement", code: "AMI 1,5", cotation: 4.725, lettreCle: "AMI", coefficient: 1.5 };

    expect(calculerMontantPassage([AMI_3, AMI_1_5, AMI_1], SANS_TABLE)).toBe(11.81);
  });

  it("compte un forfait de dépendance en entier sans consommer de rang", () => {
    // La NGAP facture BSA, BSB et BSC à taux plein « quels que soient les
    // actes réalisés en parallèle » : le forfait couvre la journée, il n'est
    // pas un acte de la séance que l'article 11B mettrait en concurrence.
    expect(calculerMontantPassage([BSA, AMI_2, AMI_1], SANS_TABLE)).toBe(20.88);
  });

  it("classe les actes par coefficient et non par tarif", () => {
    // AIS 4 a le coefficient le plus élevé (4 contre 3,9) mais le tarif le
    // plus faible : c'est lui qui compte en entier. Trier sur le tarif aurait
    // donné 17,59 € — plus flatteur, mais non conforme.
    const AIS_4 = { libelle: "Soins de confort", code: "AIS 4", cotation: 10.6, lettreCle: "AIS", coefficient: 4 };
    const AMI_3_9 = { libelle: "Surveillance postopératoire", code: "AMI 3,9", cotation: 12.285, lettreCle: "AMI", coefficient: 3.9 };

    expect(calculerMontantPassage([AIS_4, AMI_3_9], SANS_TABLE)).toBe(16.74);
  });

  it("départage deux coefficients égaux par le tarif, au bénéfice de l'IDEL", () => {
    const AIS_4 = { libelle: "Soins de confort", code: "AIS 4", cotation: 10.6, lettreCle: "AIS", coefficient: 4 };

    // AMI 4 (12,60) et AIS 4 (10,60) partagent le coefficient 4 : le mieux
    // tarifé prend le taux plein.
    expect(calculerMontantPassage([AIS_4, AMI_4], SANS_TABLE)).toBe(17.9);
  });

  it("mélange les lettres-clés sans distinction hors cumulables", () => {
    // AIS 3 (7,95) est le plus cher, AMI 2 tombe à moitié (3,15).
    expect(calculerMontantPassage([AIS_3, AMI_2], SANS_TABLE)).toBe(11.1);
  });
});

describe("calculerMontantTournee", () => {
  it("ne compte rien pour une tournée vide", () => {
    expect(calculerMontantTournee([], SANS_TABLE)).toBe(0);
  });

  it("additionne les passages", () => {
    const missions = [
      creerMission({ id: "m1", actes: [AMI_2] }),
      creerMission({ id: "m2", actes: [AIS_3] }),
    ];
    expect(calculerMontantTournee(missions, SANS_TABLE)).toBe(14.25);
  });

  it("compte un passage encore à faire, qui reste dû une fois réalisé", () => {
    const missions = [
      creerMission({ id: "m1", statut: "terminee", actes: [AMI_2] }),
      creerMission({ id: "m2", statut: "a_faire", actes: [AMI_2] }),
    ];
    expect(calculerMontantTournee(missions, SANS_TABLE)).toBe(12.6);
  });

  it("ne compte pas un passage marqué absent, le soin n'ayant pas eu lieu", () => {
    const missions = [
      creerMission({ id: "m1", actes: [AMI_2] }),
      creerMission({ id: "m2", statut: "absent", actes: [AMI_4] }),
    ];
    expect(calculerMontantTournee(missions, SANS_TABLE)).toBe(6.3);
  });

  it("arrête le compte au centime à chaque passage plutôt que de laisser l'écart courir", () => {
    // Trois passages à 7,875 € : arrondis un par un, ils font 23,64 € et non
    // les 23,63 € qu'un arrondi final aurait donnés.
    const missions = [1, 2, 3].map((n) =>
      creerMission({ id: `m${n}`, actes: [AMI_2, AMI_1] })
    );
    expect(calculerMontantTournee(missions, SANS_TABLE)).toBe(23.64);
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

describe("cotation selon la zone tarifaire", () => {
  const VALEURS: ValeursLettresCles = new Map([
    ["AMI", { lettreCle: "AMI", valeurMetropole: 3.15, valeurDom: 3.3 }],
    ["AIS", { lettreCle: "AIS", valeurMetropole: 2.65, valeurDom: 2.7 }],
    ["BSA", { lettreCle: "BSA", valeurMetropole: 13, valeurDom: 13.25 }],
  ]);
  const METROPOLE: ContexteTarifaire = { zone: "metropole", valeurs: VALEURS };
  const OUTRE_MER: ContexteTarifaire = { zone: "dom", valeurs: VALEURS };

  it("majore les actes techniques dans les DOM", () => {
    // Le même pansement vaut 6,30 € en métropole et 6,60 € en Guadeloupe.
    expect(calculerMontantPassage([AMI_2], METROPOLE)).toBe(6.3);
    expect(calculerMontantPassage([AMI_2], OUTRE_MER)).toBe(6.6);
  });

  it("majore aussi les forfaits de dépendance", () => {
    expect(calculerMontantPassage([BSA], METROPOLE)).toBe(13);
    expect(calculerMontantPassage([BSA], OUTRE_MER)).toBe(13.25);
  });

  it("applique la règle de cumul sur les tarifs de la zone", () => {
    // Pansement à taux plein (6,60) + moitié de l'injection (1,65).
    expect(calculerMontantPassage([AMI_2, AMI_1], OUTRE_MER)).toBe(8.25);
  });

  it("calcule le tarif plutôt que de lire un montant arrondi", () => {
    // AMI 1,5 vaut 4,725 € : c'est ce montant, et non 4,73 €, qui entre dans
    // le calcul. Sur la moitié d'un second acte, l'écart se voit.
    const AMI_1_5 = {
      libelle: "Prélèvement",
      code: "AMI 1,5",
      cotation: 4.73,
      lettreCle: "AMI",
      coefficient: 1.5,
    };
    const AMI_3 = {
      libelle: "Pansement courant",
      code: "AMI 3",
      cotation: 9.45,
      lettreCle: "AMI",
      coefficient: 3,
    };

    // 9,45 + 4,725/2 = 11,8125 → 11,81 €, le chiffre de l'article.
    expect(calculerMontantPassage([AMI_3, AMI_1_5], METROPOLE)).toBe(11.81);
  });

  it("mesure l'écart d'une tournée entière entre les deux zones", () => {
    // Douze passages d'un pansement et d'une injection : l'écart annuel se
    // joue sur ces quelques centimes répétés.
    const missions = Array.from({ length: 12 }, (_, i) =>
      creerMission({ id: `m${i}`, actes: [AMI_2, AMI_1] })
    );

    // 7,88 € le passage en métropole, 8,25 € dans les DOM : 4,44 € d'écart
    // sur la seule journée.
    expect(calculerMontantTournee(missions, METROPOLE)).toBe(94.56);
    expect(calculerMontantTournee(missions, OUTRE_MER)).toBe(99);
  });
});
