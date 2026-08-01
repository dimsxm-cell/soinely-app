import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MissionTourneeVue } from "@/lib/data/ma-journee";
import {
  calculerAge,
  compterMissions,
  estimerHeureFin,
  filtrerMissions,
  getCouleurAvatar,
  getInitiales,
} from "./tournee-vue";

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
    distanceKm: null,
    distanceKmCorrigee: null,
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

describe("filtrerMissions", () => {
  it("« à faire » retient aussi les missions en cours", () => {
    const missions = [
      creerMission({ id: "a", statut: "a_faire" }),
      creerMission({ id: "b", statut: "en_cours" }),
      creerMission({ id: "c", statut: "terminee" }),
    ];

    expect(filtrerMissions(missions, "a_faire").map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("« validés » retient aussi les missions absentes", () => {
    const missions = [
      creerMission({ id: "a", statut: "terminee" }),
      creerMission({ id: "b", statut: "absent" }),
      creerMission({ id: "c", statut: "a_faire" }),
    ];

    expect(filtrerMissions(missions, "valides").map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("« alertes » ne retient que les missions avec allergie", () => {
    const missions = [
      creerMission({ id: "a", patientAllergies: "Allergie iode" }),
      creerMission({ id: "b", patientConsignes: "Code portail 4512B" }),
      creerMission({ id: "c" }),
    ];

    expect(filtrerMissions(missions, "alertes").map((m) => m.id)).toEqual(["a"]);
  });

  it("« tout » retient toutes les missions", () => {
    const missions = [creerMission({ id: "a" }), creerMission({ id: "b", statut: "terminee" })];

    expect(filtrerMissions(missions, "tout")).toHaveLength(2);
  });
});

describe("compterMissions", () => {
  it("ne compte pas dans « alertes » une mission qui n'a que des consignes", () => {
    const missions = [
      creerMission({ id: "a", patientAllergies: "Allergie iode" }),
      creerMission({ id: "b", patientConsignes: "3e étage sans ascenseur" }),
      creerMission({ id: "c", statut: "terminee" }),
    ];

    expect(compterMissions(missions)).toEqual({
      tout: 3,
      a_faire: 2,
      alertes: 1,
      valides: 1,
    });
  });
});

describe("estimerHeureFin", () => {
  it("renvoie l'heure de la dernière mission restante", () => {
    const missions = [
      creerMission({ id: "a", heurePrevue: "08:00:00", statut: "terminee" }),
      creerMission({ id: "b", heurePrevue: "14:20:00", statut: "en_cours" }),
      creerMission({ id: "c", heurePrevue: "18:05:00", statut: "a_faire" }),
    ];

    expect(estimerHeureFin(missions)).toBe("18:05");
  });

  it("renvoie null quand plus aucune mission ne reste", () => {
    const missions = [
      creerMission({ id: "a", statut: "terminee" }),
      creerMission({ id: "b", statut: "absent" }),
    ];

    expect(estimerHeureFin(missions)).toBeNull();
  });
});

describe("calculerAge", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-30T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retire un an quand l'anniversaire n'est pas encore passé", () => {
    expect(calculerAge("1950-08-15")).toBe(75);
  });

  it("compte l'année entière quand l'anniversaire est passé", () => {
    expect(calculerAge("1950-06-15")).toBe(76);
  });

  it("renvoie null sans date de naissance", () => {
    expect(calculerAge(null)).toBeNull();
  });
});

describe("getInitiales", () => {
  it("ignore la civilité « Mme »", () => {
    expect(getInitiales("Mme Dupont")).toBe("DU");
  });

  it("ignore la civilité « M. »", () => {
    expect(getInitiales("M. Martin")).toBe("MA");
  });

  it("prend le premier mot quand il n'y a pas de civilité", () => {
    expect(getInitiales("Nguyen")).toBe("NG");
  });
});

describe("getCouleurAvatar", () => {
  it("donne toujours la même couleur pour un même identifiant", () => {
    expect(getCouleurAvatar("patient-1")).toEqual(getCouleurAvatar("patient-1"));
  });

  it("renvoie une paire de classes Tailwind", () => {
    const couleur = getCouleurAvatar("patient-1");

    expect(couleur.bg).toMatch(/^bg-/);
    expect(couleur.text).toMatch(/^text-/);
  });
});
