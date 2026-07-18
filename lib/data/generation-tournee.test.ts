import { describe, expect, it } from "vitest";
import { estSoinDuAujourdhui } from "./generation-tournee";
import type { SoinRecurrence } from "./generation-tournee";

describe("estSoinDuAujourdhui", () => {
  it("soin ponctuel dû le jour exact", () => {
    const soin: SoinRecurrence = {
      frequenceType: "ponctuel",
      joursSemaine: null,
      intervalleJours: null,
      dateDebut: "2026-07-01",
      dateFin: null,
    };
    expect(estSoinDuAujourdhui(soin, "2026-07-01")).toBe(true);
  });

  it("soin ponctuel pas dû un autre jour", () => {
    const soin: SoinRecurrence = {
      frequenceType: "ponctuel",
      joursSemaine: null,
      intervalleJours: null,
      dateDebut: "2026-07-01",
      dateFin: null,
    };
    expect(estSoinDuAujourdhui(soin, "2026-07-02")).toBe(false);
  });

  it("soin quotidien dû tant qu'aucune date de fin n'est dépassée", () => {
    const soin: SoinRecurrence = {
      frequenceType: "quotidien",
      joursSemaine: null,
      intervalleJours: null,
      dateDebut: "2026-07-01",
      dateFin: null,
    };
    expect(estSoinDuAujourdhui(soin, "2026-07-15")).toBe(true);
  });

  it("soin quotidien pas dû après sa date de fin", () => {
    const soin: SoinRecurrence = {
      frequenceType: "quotidien",
      joursSemaine: null,
      intervalleJours: null,
      dateDebut: "2026-07-01",
      dateFin: "2026-07-10",
    };
    expect(estSoinDuAujourdhui(soin, "2026-07-13")).toBe(false);
  });

  it("soin à jours de semaine précis dû un jour correspondant (2026-07-08 est un mercredi, jour 3)", () => {
    const soin: SoinRecurrence = {
      frequenceType: "jours_semaine",
      joursSemaine: [1, 3, 5],
      intervalleJours: null,
      dateDebut: "2026-07-01",
      dateFin: null,
    };
    expect(estSoinDuAujourdhui(soin, "2026-07-08")).toBe(true);
  });

  it("soin à jours de semaine précis pas dû un jour ne correspondant pas (2026-07-02 est un jeudi, jour 4)", () => {
    const soin: SoinRecurrence = {
      frequenceType: "jours_semaine",
      joursSemaine: [1, 3, 5],
      intervalleJours: null,
      dateDebut: "2026-07-01",
      dateFin: null,
    };
    expect(estSoinDuAujourdhui(soin, "2026-07-02")).toBe(false);
  });

  it("soin tous les X jours dû quand l'écart est un multiple de l'intervalle", () => {
    const soin: SoinRecurrence = {
      frequenceType: "tous_les_x_jours",
      joursSemaine: null,
      intervalleJours: 2,
      dateDebut: "2026-07-01",
      dateFin: null,
    };
    expect(estSoinDuAujourdhui(soin, "2026-07-03")).toBe(true);
  });

  it("soin tous les X jours pas dû quand l'écart n'est pas un multiple", () => {
    const soin: SoinRecurrence = {
      frequenceType: "tous_les_x_jours",
      joursSemaine: null,
      intervalleJours: 2,
      dateDebut: "2026-07-01",
      dateFin: null,
    };
    expect(estSoinDuAujourdhui(soin, "2026-07-02")).toBe(false);
  });

  it("jamais dû avant sa date de début, quel que soit le type", () => {
    const soin: SoinRecurrence = {
      frequenceType: "quotidien",
      joursSemaine: null,
      intervalleJours: null,
      dateDebut: "2026-07-08",
      dateFin: null,
    };
    expect(estSoinDuAujourdhui(soin, "2026-07-01")).toBe(false);
  });
});
