import { describe, expect, it, vi } from "vitest";
import { deriverIdentiteDepuisNir } from "./ChampsIdentite";

describe("deriverIdentiteDepuisNir", () => {
  it("déduit homme et la date de naissance d'un NIR masculin valide", () => {
    expect(deriverIdentiteDepuisNir("1850375123456")).toEqual({
      dateNaissance: "1985-03-01",
      sexe: "homme",
    });
  });

  it("déduit femme d'un NIR féminin valide", () => {
    expect(deriverIdentiteDepuisNir("2850375123456")).toEqual({
      dateNaissance: "1985-03-01",
      sexe: "femme",
    });
  });

  it("ignore les espaces dans le numéro saisi", () => {
    expect(deriverIdentiteDepuisNir("1 85 03 75 123 456")).toEqual({
      dateNaissance: "1985-03-01",
      sexe: "homme",
    });
  });

  it("choisit le 20e siècle si le 21e siècle donnerait une année future", () => {
    vi.setSystemTime(new Date("2026-07-19"));
    expect(deriverIdentiteDepuisNir("1300375123456").dateNaissance).toBe("1930-03-01");
    vi.useRealTimers();
  });

  it("choisit le 21e siècle si l'année reste dans le passé ou l'année en cours", () => {
    vi.setSystemTime(new Date("2026-07-19"));
    expect(deriverIdentiteDepuisNir("1100375123456").dateNaissance).toBe("2010-03-01");
    vi.useRealTimers();
  });

  it("retourne une date nulle si le mois n'est pas valide (01-12), mais garde le sexe", () => {
    expect(deriverIdentiteDepuisNir("1859975123456")).toEqual({
      dateNaissance: null,
      sexe: "homme",
    });
  });

  it("retourne tout à null si le format n'a pas le bon nombre de chiffres", () => {
    expect(deriverIdentiteDepuisNir("12345")).toEqual({ dateNaissance: null, sexe: null });
  });

  it("retourne tout à null si la valeur contient des lettres", () => {
    expect(deriverIdentiteDepuisNir("185037512345A")).toEqual({ dateNaissance: null, sexe: null });
  });

  it("retourne un sexe nul si le premier chiffre n'est ni 1 ni 2", () => {
    expect(deriverIdentiteDepuisNir("7850375123456").sexe).toBeNull();
  });
});
