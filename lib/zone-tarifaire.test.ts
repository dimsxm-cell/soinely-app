import { describe, expect, it } from "vitest";
import {
  calculerTarifActe,
  determinerZone,
  type ValeursLettresCles,
} from "./zone-tarifaire";

const VALEURS: ValeursLettresCles = new Map([
  ["AMI", { lettreCle: "AMI", valeurMetropole: 3.15, valeurDom: 3.3 }],
  ["AIS", { lettreCle: "AIS", valeurMetropole: 2.65, valeurDom: 2.7 }],
  ["BSA", { lettreCle: "BSA", valeurMetropole: 13, valeurDom: 13.25 }],
  ["TLS", { lettreCle: "TLS", valeurMetropole: 10, valeurDom: 10 }],
]);

describe("determinerZone", () => {
  it.each([
    ["97110", "dom", "Guadeloupe"],
    ["97200", "dom", "Martinique"],
    ["97300", "dom", "Guyane"],
    ["97400", "dom", "La Réunion"],
    ["97600", "dom", "Mayotte"],
    ["75001", "metropole", "Paris"],
    ["20000", "metropole", "Corse"],
    ["59000", "metropole", "Nord"],
  ])("range %s en %s (%s)", (codePostal, zone) => {
    expect(determinerZone(codePostal)).toBe(zone);
  });

  it.each([
    ["97133", "Saint-Barthélemy"],
    ["97150", "Saint-Martin"],
  ])("range %s en DOM (%s), couvert par la caisse de Guadeloupe", (codePostal) => {
    expect(determinerZone(codePostal)).toBe("dom");
  });

  it("ne range pas Saint-Pierre-et-Miquelon en DOM, sa caisse étant distincte", () => {
    // Faute de certitude sur sa grille, on lui laisse le défaut métropole :
    // un défaut connu vaut mieux qu'un tarif inventé.
    expect(determinerZone("97500")).toBe("metropole");
  });

  it("retient la métropole quand le code postal n'est pas renseigné", () => {
    expect(determinerZone(null)).toBe("metropole");
    expect(determinerZone(undefined)).toBe("metropole");
    expect(determinerZone("")).toBe("metropole");
  });

  it("tolère les espaces d'une saisie manuelle", () => {
    expect(determinerZone("97 110")).toBe("dom");
    expect(determinerZone(" 75001 ")).toBe("metropole");
  });

  it("retient la métropole devant une saisie trop courte pour trancher", () => {
    expect(determinerZone("97")).toBe("metropole");
  });
});

describe("calculerTarifActe", () => {
  it("multiplie la valeur de la lettre-clé par le coefficient", () => {
    // AMI 2 en métropole : 3,15 × 2.
    expect(calculerTarifActe("AMI", 2, "metropole", VALEURS)).toBe(6.3);
  });

  it("applique la valeur DOM dans les départements d'outre-mer", () => {
    // Le même AMI 2 vaut 6,60 € en Guadeloupe.
    expect(calculerTarifActe("AMI", 2, "dom", VALEURS)).toBeCloseTo(6.6, 2);
  });

  it("garde la précision d'un coefficient décimal", () => {
    // AMI 1,5 vaut 4,725 € et non les 4,73 € d'un tarif stocké arrondi.
    expect(calculerTarifActe("AMI", 1.5, "metropole", VALEURS)).toBeCloseTo(4.725, 3);
  });

  it("compte un forfait sans coefficient à la valeur de sa lettre-clé", () => {
    expect(calculerTarifActe("BSA", null, "metropole", VALEURS)).toBe(13);
    expect(calculerTarifActe("BSA", null, "dom", VALEURS)).toBe(13.25);
  });

  it("applique le même tarif dans les deux zones quand la NGAP ne distingue pas", () => {
    expect(calculerTarifActe("TLS", null, "metropole", VALEURS)).toBe(10);
    expect(calculerTarifActe("TLS", null, "dom", VALEURS)).toBe(10);
  });

  it("ne compte rien pour une lettre-clé absente de la table", () => {
    // Un code dont la lettre-clé manque ne doit pas se voir attribuer un
    // montant inventé.
    expect(calculerTarifActe("XXX", 2, "metropole", VALEURS)).toBeNull();
  });

  it("ne compte rien pour un acte sans lettre-clé", () => {
    expect(calculerTarifActe(null, 2, "metropole", VALEURS)).toBeNull();
  });

  it("écarte l'AIS de la grille de l'AMI", () => {
    // AIS 3 : 2,65 × 3 en métropole, 2,70 × 3 en DOM.
    expect(calculerTarifActe("AIS", 3, "metropole", VALEURS)).toBeCloseTo(7.95, 2);
    expect(calculerTarifActe("AIS", 3, "dom", VALEURS)).toBeCloseTo(8.1, 2);
  });
});
