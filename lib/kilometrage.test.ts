import { describe, expect, it } from "vitest";
import type { ContexteTarifaire } from "./cotation";
import type { ValeursLettresCles } from "./zone-tarifaire";
import {
  calculerIndemniteKilometrique,
  distanceRetenue,
  kilometresIndemnisables,
} from "./kilometrage";

const VALEURS: ValeursLettresCles = new Map([
  ["IK", { lettreCle: "IK", valeurMetropole: 0.35, valeurDom: 0.35 }],
  ["IKM", { lettreCle: "IKM", valeurMetropole: 0.5, valeurDom: 0.5 }],
  ["IKP", { lettreCle: "IKP", valeurMetropole: 3.4, valeurDom: 3.66 }],
]);

const CONTEXTE: ContexteTarifaire = { zone: "metropole", valeurs: VALEURS };

describe("kilometresIndemnisables", () => {
  it("compte l'aller-retour moins l'abattement", () => {
    // 8 km aller, soit 16 km parcourus, dont 4 non indemnisés.
    expect(kilometresIndemnisables(8)).toBe(12);
  });

  it("ne compte rien en deçà de l'abattement", () => {
    // 1,5 km aller : 3 km parcourus, sous les 4 km d'abattement.
    expect(kilometresIndemnisables(1.5)).toBe(0);
  });

  it("ne compte rien pile à la limite", () => {
    expect(kilometresIndemnisables(2)).toBe(0);
  });

  it("compte le premier kilomètre au-delà de la limite", () => {
    expect(kilometresIndemnisables(2.5)).toBe(1);
  });

  it("ne compte rien sans distance connue", () => {
    expect(kilometresIndemnisables(null)).toBe(0);
  });

  it("ignore une distance nulle ou négative", () => {
    expect(kilometresIndemnisables(0)).toBe(0);
    expect(kilometresIndemnisables(-5)).toBe(0);
  });

  it("accepte un abattement différent, la montagne ayant le sien", () => {
    expect(kilometresIndemnisables(8, 0)).toBe(16);
  });
});

describe("calculerIndemniteKilometrique", () => {
  it("applique le tarif de plaine aux kilomètres indemnisables", () => {
    // 12 km à 0,35 €.
    expect(calculerIndemniteKilometrique(8, CONTEXTE)).toBe(4.2);
  });

  it("applique le tarif de montagne quand il est retenu", () => {
    expect(calculerIndemniteKilometrique(8, CONTEXTE, "montagne")).toBe(6);
  });

  it("majore le barème à pied outre-mer, seul à y différer", () => {
    const outreMer: ContexteTarifaire = { zone: "dom", valeurs: VALEURS };

    expect(calculerIndemniteKilometrique(3, CONTEXTE, "pied_ski")).toBe(6.8);
    expect(calculerIndemniteKilometrique(3, outreMer, "pied_ski")).toBe(7.32);
  });

  it("ne compte rien pour un trajet sous l'abattement", () => {
    expect(calculerIndemniteKilometrique(1.5, CONTEXTE)).toBe(0);
  });

  it("ne compte rien quand la table des valeurs ignore le barème", () => {
    // État tant que la migration n'est pas appliquée : aucun tarif inventé.
    const vide: ContexteTarifaire = { zone: "metropole", valeurs: new Map() };
    expect(calculerIndemniteKilometrique(20, vide)).toBe(0);
  });
});

describe("distanceRetenue", () => {
  it("retient la distance calculée en l'absence de correction", () => {
    expect(distanceRetenue(7.4, null)).toBe(7.4);
  });

  it("laisse la correction manuelle primer", () => {
    // L'itinéraire calculé ignore le détour par la pharmacie ; quand l'IDEL
    // corrige, c'est elle qui a raison.
    expect(distanceRetenue(7.4, 9.2)).toBe(9.2);
  });

  it("laisse une correction à zéro primer, pour annuler une distance fausse", () => {
    expect(distanceRetenue(7.4, 0)).toBe(0);
  });

  it("rend null quand rien n'est connu", () => {
    expect(distanceRetenue(null, null)).toBeNull();
  });
});
