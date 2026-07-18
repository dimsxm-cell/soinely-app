import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
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

describe("genererTourneeDuJour", () => {
  function buildFakeClient(soins: unknown[]) {
    const soinsEqActifMock = vi.fn(() => Promise.resolve({ data: soins, error: null }));
    const soinsEqIdelMock = vi.fn(() => ({ eq: soinsEqActifMock }));
    const soinsSelectMock = vi.fn(() => ({ eq: soinsEqIdelMock }));

    const tourneeInsertMock = vi.fn(() => ({
      select: () => ({
        single: () => Promise.resolve({ data: { id: "t-nouvelle" }, error: null }),
      }),
    }));
    const missionsInsertMock = vi.fn().mockResolvedValue({ error: null });
    const tourneeDeleteEqMock = vi.fn().mockResolvedValue({ error: null });
    const tourneeDeleteMock = vi.fn(() => ({ eq: tourneeDeleteEqMock }));

    const fromMock = vi.fn((table: string) => {
      if (table === "soins_prescrits") return { select: soinsSelectMock };
      if (table === "tournees") return { insert: tourneeInsertMock, delete: tourneeDeleteMock };
      if (table === "missions_du_jour") return { insert: missionsInsertMock };
      throw new Error(`table inattendue : ${table}`);
    });

    const fakeClient = { from: fromMock } as unknown as SupabaseClient;

    return {
      fakeClient,
      soinsEqIdelMock,
      soinsEqActifMock,
      tourneeInsertMock,
      missionsInsertMock,
      tourneeDeleteEqMock,
    };
  }

  it("filtre les soins par idel_id et par actif=true", async () => {
    const { fakeClient, soinsEqIdelMock, soinsEqActifMock } = buildFakeClient([]);

    const { genererTourneeDuJour } = await import("./generation-tournee");
    await genererTourneeDuJour(fakeClient, "u1", "2026-07-15");

    expect(soinsEqIdelMock).toHaveBeenCalledWith("idel_id", "u1");
    expect(soinsEqActifMock).toHaveBeenCalledWith("actif", true);
  });

  it("génère les missions des soins dus, triées par heure, avec les bonnes statistiques", async () => {
    const soins = [
      {
        patient_id: "p1",
        type_soin: "Pansement",
        frequence_type: "quotidien",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["10:00:00"],
        date_debut: "2026-07-01",
        date_fin: null,
      },
      {
        patient_id: "p2",
        type_soin: "Glycémie",
        frequence_type: "quotidien",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["07:00:00", "19:00:00"],
        date_debut: "2026-07-01",
        date_fin: null,
      },
      {
        patient_id: "p3",
        type_soin: "Prise de sang",
        frequence_type: "ponctuel",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["09:00:00"],
        date_debut: "2026-07-20",
        date_fin: null,
      },
    ];
    const { fakeClient, tourneeInsertMock, missionsInsertMock } = buildFakeClient(soins);

    const { genererTourneeDuJour } = await import("./generation-tournee");
    await genererTourneeDuJour(fakeClient, "u1", "2026-07-15");

    expect(tourneeInsertMock).toHaveBeenCalledWith({
      idel_id: "u1",
      date: "2026-07-15",
      nb_patients: 2,
      nb_injections: 0,
      nb_pansements: 1,
      nb_glycemies: 2,
      temps_estime_min: 60,
    });
    expect(missionsInsertMock).toHaveBeenCalledWith([
      {
        tournee_id: "t-nouvelle",
        patient_id: "p2",
        type_soin: "Glycémie",
        heure_prevue: "07:00:00",
        statut: "a_faire",
      },
      {
        tournee_id: "t-nouvelle",
        patient_id: "p1",
        type_soin: "Pansement",
        heure_prevue: "10:00:00",
        statut: "a_faire",
      },
      {
        tournee_id: "t-nouvelle",
        patient_id: "p2",
        type_soin: "Glycémie",
        heure_prevue: "19:00:00",
        statut: "a_faire",
      },
    ]);
  });

  it("compte 'Injection Lovenox' comme une injection", async () => {
    const soins = [
      {
        patient_id: "p4",
        type_soin: "Injection Lovenox",
        frequence_type: "quotidien",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["09:00:00"],
        date_debut: "2026-07-01",
        date_fin: null,
      },
    ];
    const { fakeClient, tourneeInsertMock } = buildFakeClient(soins);

    const { genererTourneeDuJour } = await import("./generation-tournee");
    await genererTourneeDuJour(fakeClient, "u1", "2026-07-15");

    expect(tourneeInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ nb_injections: 1, nb_patients: 1, temps_estime_min: 20 })
    );
  });

  it("un type de soin sans mot-clé connu ne compte que dans nb_patients", async () => {
    const soins = [
      {
        patient_id: "p5",
        type_soin: "Toilette",
        frequence_type: "quotidien",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["08:00:00"],
        date_debut: "2026-07-01",
        date_fin: null,
      },
    ];
    const { fakeClient, tourneeInsertMock } = buildFakeClient(soins);

    const { genererTourneeDuJour } = await import("./generation-tournee");
    await genererTourneeDuJour(fakeClient, "u1", "2026-07-15");

    expect(tourneeInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ nb_patients: 1, nb_injections: 0, nb_pansements: 0, nb_glycemies: 0 })
    );
  });

  it("aucun soin dû : crée une tournée à zéro sans insérer de mission", async () => {
    const soins = [
      {
        patient_id: "p1",
        type_soin: "Prise de sang",
        frequence_type: "ponctuel",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["09:00:00"],
        date_debut: "2026-07-20",
        date_fin: null,
      },
    ];
    const { fakeClient, tourneeInsertMock, missionsInsertMock } = buildFakeClient(soins);

    const { genererTourneeDuJour } = await import("./generation-tournee");
    await genererTourneeDuJour(fakeClient, "u1", "2026-07-15");

    expect(tourneeInsertMock).toHaveBeenCalledWith({
      idel_id: "u1",
      date: "2026-07-15",
      nb_patients: 0,
      nb_injections: 0,
      nb_pansements: 0,
      nb_glycemies: 0,
      temps_estime_min: 0,
    });
    expect(missionsInsertMock).not.toHaveBeenCalled();
  });

  it("n'insère aucune tournée si la lecture des soins échoue", async () => {
    const soinsEqActifMock = vi.fn(() => Promise.resolve({ data: null, error: { message: "boom" } }));
    const soinsEqIdelMock = vi.fn(() => ({ eq: soinsEqActifMock }));
    const soinsSelectMock = vi.fn(() => ({ eq: soinsEqIdelMock }));
    const tourneeInsertMock = vi.fn();
    const fromMock = vi.fn((table: string) => {
      if (table === "soins_prescrits") return { select: soinsSelectMock };
      if (table === "tournees") return { insert: tourneeInsertMock };
      throw new Error(`table inattendue : ${table}`);
    });
    const fakeClient = { from: fromMock } as unknown as SupabaseClient;

    const { genererTourneeDuJour } = await import("./generation-tournee");
    await genererTourneeDuJour(fakeClient, "u1", "2026-07-15");

    expect(tourneeInsertMock).not.toHaveBeenCalled();
  });

  it("supprime la tournée si l'insertion des missions échoue", async () => {
    const soins = [
      {
        patient_id: "p1",
        type_soin: "Pansement",
        frequence_type: "quotidien",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["10:00:00"],
        date_debut: "2026-07-01",
        date_fin: null,
      },
    ];
    const { fakeClient, missionsInsertMock, tourneeDeleteEqMock } = buildFakeClient(soins);
    missionsInsertMock.mockResolvedValueOnce({ error: { message: "boom" } });

    const { genererTourneeDuJour } = await import("./generation-tournee");
    await genererTourneeDuJour(fakeClient, "u1", "2026-07-15");

    expect(tourneeDeleteEqMock).toHaveBeenCalledWith("id", "t-nouvelle");
  });
});
