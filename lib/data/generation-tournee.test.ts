import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { estSoinDuAujourdhui, libelleDeSynthese } from "./generation-tournee";
import type { SoinRecurrence } from "./generation-tournee";

// Les tests d'échec ci-dessous font passer une erreur par `echouer` (ou la
// journalisent en cas de course bénigne), ce qui appelle `console.error` :
// sans ce mock, un `npm test` vert imprime des lignes `[soinely]` rouges, et
// une vraie erreur de console finit par ne plus se remarquer.
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("libelleDeSynthese", () => {
  it("un seul acte donne son propre libellé", () => {
    expect(libelleDeSynthese([{ libelle: "Toilette" }])).toBe("Toilette");
  });

  it("plusieurs actes sont joints par ' + '", () => {
    expect(
      libelleDeSynthese([{ libelle: "Toilette" }, { libelle: "Insuline" }])
    ).toBe("Toilette + Insuline");
  });
});

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
    const soinsOrderMock = vi.fn(() => Promise.resolve({ data: soins, error: null }));
    const soinsEqActifMock = vi.fn(() => ({ order: soinsOrderMock }));
    const soinsEqIdelMock = vi.fn(() => ({ eq: soinsEqActifMock }));
    const soinsSelectMock = vi.fn(() => ({ eq: soinsEqIdelMock }));

    const tourneeInsertMock = vi.fn(() => ({
      select: (): {
        single: () => Promise<{
          data: { id: string } | null;
          error: { code?: string; message?: string } | null;
        }>;
      } => ({
        single: () => Promise.resolve({ data: { id: "t-nouvelle" }, error: null }),
      }),
    }));

    // Les missions insérées sont relues pour que leurs actes s'y rattachent :
    // le faux client rend un identifiant par ligne reçue.
    let lignesInserees: Array<Record<string, unknown>> = [];
    const missionsSelectMock = vi.fn(
      (): Promise<{
        data: Array<{ id: string; patient_id: unknown; heure_prevue: unknown }> | null;
        error: { message: string } | null;
      }> =>
        Promise.resolve({
          data: lignesInserees.map((ligne, index) => ({
            id: `m-${index + 1}`,
            patient_id: ligne.patient_id,
            heure_prevue: ligne.heure_prevue,
          })),
          error: null,
        })
    );
    const missionsInsertMock = vi.fn((lignes: Array<Record<string, unknown>>) => {
      lignesInserees = lignes;
      return { select: missionsSelectMock };
    });

    const actesInsertMock = vi.fn().mockResolvedValue({ error: null });
    const tourneeDeleteEqMock = vi.fn().mockResolvedValue({ error: null });
    const tourneeDeleteMock = vi.fn(() => ({ eq: tourneeDeleteEqMock }));

    // Cabinet non situé par défaut : la génération doit produire ses missions
    // sans distance plutôt que de s'interrompre. Les tests qui portent sur le
    // kilométrage fournissent leur propre position.
    const profilSelectMock = vi.fn(() => ({
      eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
    }));
    const patientsSelectMock = vi.fn(() => ({
      in: () => Promise.resolve({ data: [], error: null }),
    }));

    const fromMock = vi.fn((table: string) => {
      if (table === "soins_prescrits") return { select: soinsSelectMock };
      if (table === "tournees") return { insert: tourneeInsertMock, delete: tourneeDeleteMock };
      if (table === "missions_du_jour") return { insert: missionsInsertMock };
      if (table === "actes_mission") return { insert: actesInsertMock };
      if (table === "profiles") return { select: profilSelectMock };
      if (table === "patients") return { select: patientsSelectMock };
      throw new Error(`table inattendue : ${table}`);
    });

    const fakeClient = { from: fromMock } as unknown as SupabaseClient;

    return {
      fakeClient,
      soinsEqIdelMock,
      soinsEqActifMock,
      soinsOrderMock,
      tourneeInsertMock,
      missionsInsertMock,
      missionsSelectMock,
      actesInsertMock,
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
        ngap_code_id: null,
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
        ngap_code_id: "c-glyc",
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
        ngap_code_id: null,
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
        distance_km: null,
      },
      {
        tournee_id: "t-nouvelle",
        patient_id: "p1",
        type_soin: "Pansement",
        heure_prevue: "10:00:00",
        statut: "a_faire",
        distance_km: null,
      },
      {
        tournee_id: "t-nouvelle",
        patient_id: "p2",
        type_soin: "Glycémie",
        heure_prevue: "19:00:00",
        statut: "a_faire",
        distance_km: null,
      },
    ]);
  });

  it("regroupe en un seul passage deux soins du même patient à la même heure", async () => {
    const soins = [
      {
        patient_id: "p1",
        type_soin: "Toilette",
        ngap_code_id: "c-ais3",
        frequence_type: "quotidien",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["08:00:00"],
        date_debut: "2026-07-01",
        date_fin: null,
      },
      {
        patient_id: "p1",
        type_soin: "Insuline",
        ngap_code_id: "c-ami1",
        frequence_type: "quotidien",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["08:00:00"],
        date_debut: "2026-07-01",
        date_fin: null,
      },
    ];
    const { fakeClient, missionsInsertMock, actesInsertMock } = buildFakeClient(soins);

    const { genererTourneeDuJour } = await import("./generation-tournee");
    await genererTourneeDuJour(fakeClient, "u1", "2026-07-15");

    expect(missionsInsertMock).toHaveBeenCalledWith([
      {
        tournee_id: "t-nouvelle",
        patient_id: "p1",
        type_soin: "Toilette + Insuline",
        heure_prevue: "08:00:00",
        statut: "a_faire",
        distance_km: null,
      },
    ]);
    expect(actesInsertMock).toHaveBeenCalledWith([
      { mission_id: "m-1", libelle: "Toilette", ngap_code_id: "c-ais3", ordre: 0 },
      { mission_id: "m-1", libelle: "Insuline", ngap_code_id: "c-ami1", ordre: 1 },
    ]);
  });

  it("garde deux passages distincts pour deux heures différentes", async () => {
    const soins = [
      {
        patient_id: "p1",
        type_soin: "Toilette",
        ngap_code_id: null,
        frequence_type: "quotidien",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["08:00:00"],
        date_debut: "2026-07-01",
        date_fin: null,
      },
      {
        patient_id: "p1",
        type_soin: "Insuline",
        ngap_code_id: null,
        frequence_type: "quotidien",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["19:00:00"],
        date_debut: "2026-07-01",
        date_fin: null,
      },
    ];
    const { fakeClient, missionsInsertMock } = buildFakeClient(soins);

    const { genererTourneeDuJour } = await import("./generation-tournee");
    await genererTourneeDuJour(fakeClient, "u1", "2026-07-15");

    expect(missionsInsertMock.mock.calls[0][0]).toHaveLength(2);
  });

  it("compte deux injections d'un même passage comme deux injections", async () => {
    const soins = [
      {
        patient_id: "p1",
        type_soin: "Injection Lovenox",
        ngap_code_id: null,
        frequence_type: "quotidien",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["08:00:00"],
        date_debut: "2026-07-01",
        date_fin: null,
      },
      {
        patient_id: "p1",
        type_soin: "Injection insuline",
        ngap_code_id: null,
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

    // Le libellé de synthèse ne contient qu'une fois le mot « injection » par
    // acte : compter sur lui en aurait perdu une.
    expect(tourneeInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ nb_injections: 2, temps_estime_min: 40 })
    );
  });

  it("lit les soins dans l'ordre de leur création", async () => {
    const { fakeClient, soinsOrderMock } = buildFakeClient([]);

    const { genererTourneeDuJour } = await import("./generation-tournee");
    await genererTourneeDuJour(fakeClient, "u1", "2026-07-15");

    expect(soinsOrderMock).toHaveBeenCalledWith("created_at");
  });

  it("supprime la tournée si l'insertion des actes échoue", async () => {
    const soins = [
      {
        patient_id: "p1",
        type_soin: "Pansement",
        ngap_code_id: null,
        frequence_type: "quotidien",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["10:00:00"],
        date_debut: "2026-07-01",
        date_fin: null,
      },
    ];
    const { fakeClient, actesInsertMock, tourneeDeleteEqMock } = buildFakeClient(soins);
    actesInsertMock.mockResolvedValueOnce({ error: { message: "boom" } });

    const { genererTourneeDuJour } = await import("./generation-tournee");

    await expect(genererTourneeDuJour(fakeClient, "u1", "2026-07-15")).rejects.toThrow();

    expect(tourneeDeleteEqMock).toHaveBeenCalledWith("id", "t-nouvelle");
  });

  it("supprime la tournée si un passage relu ne se rattache à aucune mission insérée", async () => {
    const soins = [
      {
        patient_id: "p1",
        type_soin: "Pansement",
        ngap_code_id: null,
        frequence_type: "quotidien",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["08:00:00"],
        date_debut: "2026-07-01",
        date_fin: null,
      },
    ];
    const { fakeClient, missionsSelectMock, actesInsertMock, tourneeDeleteEqMock } = buildFakeClient(soins);
    // La relecture renvoie l'heure sous une autre forme que celle insérée
    // ("08:00" au lieu de "08:00:00") : la clé de rattachement ne correspond
    // plus à aucun passage.
    missionsSelectMock.mockResolvedValueOnce({
      data: [{ id: "m-1", patient_id: "p1", heure_prevue: "08:00" }],
      error: null,
    });

    const { genererTourneeDuJour } = await import("./generation-tournee");

    await expect(genererTourneeDuJour(fakeClient, "u1", "2026-07-15")).rejects.toThrow();

    expect(tourneeDeleteEqMock).toHaveBeenCalledWith("id", "t-nouvelle");
    expect(actesInsertMock).not.toHaveBeenCalled();
  });

  it("compte 'Injection Lovenox' comme une injection", async () => {
    const soins = [
      {
        patient_id: "p4",
        type_soin: "Injection Lovenox",
        ngap_code_id: null,
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
        ngap_code_id: null,
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
        ngap_code_id: null,
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

  it("lève et n'insère aucune tournée si la lecture des soins échoue", async () => {
    const soinsOrderMock = vi.fn(() =>
      Promise.resolve({ data: null, error: { message: "boom" } })
    );
    const soinsEqActifMock = vi.fn(() => ({ order: soinsOrderMock }));
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

    await expect(genererTourneeDuJour(fakeClient, "u1", "2026-07-15")).rejects.toThrow(
      /genererTourneeDuJour/
    );
    expect(tourneeInsertMock).not.toHaveBeenCalled();
  });

  it("course bénigne : une insertion de tournée en doublon (23505) ne lève pas et n'insère aucune mission", async () => {
    const soins = [
      {
        patient_id: "p1",
        type_soin: "Pansement",
        ngap_code_id: null,
        frequence_type: "quotidien",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["10:00:00"],
        date_debut: "2026-07-01",
        date_fin: null,
      },
    ];
    const { fakeClient, tourneeInsertMock, missionsInsertMock } = buildFakeClient(soins);
    tourneeInsertMock.mockReturnValueOnce({
      select: () => ({
        single: () => Promise.resolve({ data: null, error: { code: "23505" } }),
      }),
    });

    const { genererTourneeDuJour } = await import("./generation-tournee");

    await expect(genererTourneeDuJour(fakeClient, "u1", "2026-07-15")).resolves.toBeUndefined();
    expect(missionsInsertMock).not.toHaveBeenCalled();
  });

  it("supprime la tournée si l'insertion des missions échoue", async () => {
    const soins = [
      {
        patient_id: "p1",
        type_soin: "Pansement",
        ngap_code_id: null,
        frequence_type: "quotidien",
        jours_semaine: null,
        intervalle_jours: null,
        heures: ["10:00:00"],
        date_debut: "2026-07-01",
        date_fin: null,
      },
    ];
    const { fakeClient, missionsSelectMock, tourneeDeleteEqMock } = buildFakeClient(soins);
    missionsSelectMock.mockResolvedValueOnce({ data: null, error: { message: "boom" } });

    const { genererTourneeDuJour } = await import("./generation-tournee");

    await expect(genererTourneeDuJour(fakeClient, "u1", "2026-07-15")).rejects.toThrow();

    expect(tourneeDeleteEqMock).toHaveBeenCalledWith("id", "t-nouvelle");
  });
});

describe("calculerOrdreVisites", () => {
  // Points alignés sur une même longitude, à distance croissante de
  // l'origine : l'ordre plus-proche-voisin attendu est donc non ambigu
  // (A, puis B, puis C), y compris à chaque étape intermédiaire.
  const ORIGINE = { latitude: 48.80, longitude: 2.30 };
  const A = { latitude: 48.82, longitude: 2.30 };
  const B = { latitude: 48.90, longitude: 2.30 };
  const C = { latitude: 49.10, longitude: 2.30 };

  beforeEach(() => {
    // Force le repli local (Haversine), sans appel réseau : déterministe,
    // même pattern que lib/distance.test.ts.
    vi.stubEnv("OPENROUTESERVICE_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("ordonne les visites géocodées du plus proche au plus lointain de l'origine", async () => {
    const { calculerOrdreVisites } = await import("./generation-tournee");
    const ordre = await calculerOrdreVisites(ORIGINE, [
      { missionId: "loin", latitude: C.latitude, longitude: C.longitude },
      { missionId: "proche", latitude: A.latitude, longitude: A.longitude },
      { missionId: "moyen", latitude: B.latitude, longitude: B.longitude },
    ]);

    expect(ordre).toEqual(["proche", "moyen", "loin"]);
  });

  it("place les visites non géocodées à la fin, dans leur ordre d'origine", async () => {
    const { calculerOrdreVisites } = await import("./generation-tournee");
    const ordre = await calculerOrdreVisites(ORIGINE, [
      { missionId: "sans-coords-1", latitude: null, longitude: null },
      { missionId: "proche", latitude: A.latitude, longitude: A.longitude },
      { missionId: "sans-coords-2", latitude: null, longitude: A.longitude },
    ]);

    expect(ordre).toEqual(["proche", "sans-coords-1", "sans-coords-2"]);
  });

  it("rend une liste vide quand il n'y a aucune visite", async () => {
    const { calculerOrdreVisites } = await import("./generation-tournee");
    expect(await calculerOrdreVisites(ORIGINE, [])).toEqual([]);
  });

  it("rend l'unique visite quand il n'y en a qu'une", async () => {
    const { calculerOrdreVisites } = await import("./generation-tournee");
    const ordre = await calculerOrdreVisites(ORIGINE, [
      { missionId: "seule", latitude: A.latitude, longitude: A.longitude },
    ]);
    expect(ordre).toEqual(["seule"]);
  });
});
