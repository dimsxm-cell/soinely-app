import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calculerKmTournee,
  compterMissionsAccueil,
  conseilEly,
  formatDateDuJour,
  formatSalutation,
  prochaineActionAccueil,
} from "./accueil-vue";
import type { MissionDuJour } from "@/lib/types/clinical";

function creerMission(surcharge: Partial<MissionDuJour> = {}): MissionDuJour {
  return {
    id: "m1",
    patientId: "p1",
    patientNom: "Mme Dupont",
    typeSoin: "Pansement",
    heurePrevue: "08:00:00",
    statut: "a_faire",
    missionCliniqueId: null,
    ...surcharge,
  };
}

describe("formatSalutation", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renvoie Bonjour avant 18h", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T09:00:00"));
    expect(formatSalutation()).toBe("Bonjour");
  });

  it("renvoie Bonsoir a partir de 18h", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T18:00:00"));
    expect(formatSalutation()).toBe("Bonsoir");
  });
});

describe("formatDateDuJour", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formate la date du jour en toutes lettres, capitalisee", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T09:00:00"));
    expect(formatDateDuJour()).toBe("Samedi 8 août");
  });
});

describe("compterMissionsAccueil", () => {
  it("compte les visites, faites (terminee ou absente) et restantes (a faire ou en cours)", () => {
    const missions = [
      creerMission({ id: "a", statut: "terminee" }),
      creerMission({ id: "b", statut: "absent" }),
      creerMission({ id: "c", statut: "a_faire" }),
      creerMission({ id: "d", statut: "en_cours" }),
    ];

    expect(compterMissionsAccueil(missions)).toEqual({ visites: 4, faites: 2, restantes: 2 });
  });

  it("renvoie des comptages a zero sans mission", () => {
    expect(compterMissionsAccueil([])).toEqual({ visites: 0, faites: 0, restantes: 0 });
  });
});

describe("calculerKmTournee", () => {
  it("renvoie null quand aucune mission n'a de distance connue", () => {
    const missions = [creerMission({ distanceKm: null, distanceKmCorrigee: null })];
    expect(calculerKmTournee(missions)).toBeNull();
  });

  it("somme les distances, en priorisant la correction manuelle sur la distance brute", () => {
    const missions = [
      creerMission({ id: "a", distanceKm: 3.2, distanceKmCorrigee: null }),
      creerMission({ id: "b", distanceKm: 5, distanceKmCorrigee: 4.1 }),
    ];
    // 3.2 (pas de correction) + 4.1 (corrigee, prime sur 5) = 7.3 -> arrondi a 7.
    expect(calculerKmTournee(missions)).toBe(7);
  });

  it("traite une mission sans distance comme 0 des qu'une autre mission a une distance connue", () => {
    const missions = [
      creerMission({ id: "a", distanceKm: null, distanceKmCorrigee: null }),
      creerMission({ id: "b", distanceKm: 10, distanceKmCorrigee: null }),
    ];
    expect(calculerKmTournee(missions)).toBe(10);
  });
});

describe("conseilEly", () => {
  it("mentionne le soin en cours en priorite", () => {
    const missions = [
      creerMission({ id: "a", statut: "a_faire", patientNom: "M. Martin" }),
      creerMission({ id: "b", statut: "en_cours", patientNom: "Mme Dupont" }),
    ];
    expect(conseilEly(missions)).toBe(
      "Soin en cours chez Mme Dupont — pensez à la transmission avant de partir."
    );
  });

  it("mentionne la prochaine visite a faire, sans temps de trajet invente", () => {
    const missions = [creerMission({ statut: "a_faire", patientNom: "Mme Dupont", heurePrevue: "14:20:00" })];
    expect(conseilEly(missions)).toBe("Prochaine visite : Mme Dupont à 14:20.");
  });

  it("indique la tournee bouclee quand il ne reste aucune mission a faire ou en cours", () => {
    const missions = [creerMission({ statut: "terminee" })];
    expect(conseilEly(missions)).toBe("Tournée bouclée. Vos transmissions sont à jour, bonne journée.");
  });

  it("indique la tournee bouclee sans aucune mission", () => {
    expect(conseilEly([])).toBe("Tournée bouclée. Vos transmissions sont à jour, bonne journée.");
  });
});

describe("prochaineActionAccueil", () => {
  it("propose de terminer le soin en cours, en priorite", () => {
    const missions = [
      creerMission({ id: "a", statut: "a_faire" }),
      creerMission({ id: "b", statut: "en_cours" }),
    ];
    expect(prochaineActionAccueil(missions)).toEqual({
      missionId: "b",
      label: "Terminer le soin en cours",
      nouveauStatut: "terminee",
    });
  });

  it("propose de demarrer la prochaine mission a faire, sans soin en cours", () => {
    const missions = [creerMission({ id: "c", statut: "a_faire", patientNom: "Mme Dupont" })];
    expect(prochaineActionAccueil(missions)).toEqual({
      missionId: "c",
      label: "Démarrer · Mme Dupont",
      nouveauStatut: "en_cours",
    });
  });

  it("renvoie null sans mission a faire ni en cours", () => {
    const missions = [creerMission({ statut: "terminee" })];
    expect(prochaineActionAccueil(missions)).toBeNull();
  });
});
