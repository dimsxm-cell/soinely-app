import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("./generation-tournee", () => ({
  genererTourneeDuJour: vi.fn().mockResolvedValue(undefined),
}));

describe("getTourneeDuJour", () => {
  it("mappe les colonnes snake_case Supabase vers le type Tournee", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    id: "t1",
                    date: "2026-07-13",
                    nb_patients: 21,
                    nb_injections: 14,
                    nb_pansements: 8,
                    nb_glycemies: 6,
                    temps_estime_min: 435,
                  },
                  error: null,
                }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getTourneeDuJour } = await import("./ma-journee");
    const tournee = await getTourneeDuJour(fakeClient, "user-1");

    const { genererTourneeDuJour } = await import("./generation-tournee");
    expect(genererTourneeDuJour).not.toHaveBeenCalled();
    expect(tournee).toEqual({
      id: "t1",
      date: "2026-07-13",
      nbPatients: 21,
      nbInjections: 14,
      nbPansements: 8,
      nbGlycemies: 6,
      tempsEstimeMin: 435,
    });
  });

  it("génère la tournée du jour si elle n'existe pas encore, puis la relit", async () => {
    const maybeSingleMock = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: {
          id: "t-nouvelle",
          date: "2026-07-15",
          nb_patients: 1,
          nb_injections: 0,
          nb_pansements: 1,
          nb_glycemies: 0,
          temps_estime_min: 20,
        },
        error: null,
      });

    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: maybeSingleMock,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { genererTourneeDuJour } = await import("./generation-tournee");
    const { getTourneeDuJour } = await import("./ma-journee");

    const tournee = await getTourneeDuJour(fakeClient, "user-1");

    expect(genererTourneeDuJour).toHaveBeenCalledWith(fakeClient, "user-1", expect.any(String));
    expect(maybeSingleMock).toHaveBeenCalledTimes(2);
    expect(tournee).toEqual({
      id: "t-nouvelle",
      date: "2026-07-15",
      nbPatients: 1,
      nbInjections: 0,
      nbPansements: 1,
      nbGlycemies: 0,
      tempsEstimeMin: 20,
    });
  });
});

describe("getTourneeDuJour — échecs", () => {
  it("lève quand la lecture de la tournée échoue", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: null, error: { message: "boom" } }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getTourneeDuJour } = await import("./ma-journee");

    await expect(getTourneeDuJour(fakeClient, "u1")).rejects.toThrow(/lireTourneeDuJour/);
  });
});

describe("getMissionsDuJour", () => {
  it("mappe les colonnes snake_case Supabase vers MissionDuJour, avec le nom du patient joint, triées par heure", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () =>
              Promise.resolve({
                data: [
                  {
                    id: "m1",
                    patient_id: "p1",
                    type_soin: "Pansement",
                    heure_prevue: "08:30:00",
                    statut: "a_faire",
                    mission_clinique_id: null,
                    patients: { nom_complet: "Mme Dupont" },
                  },
                  {
                    id: "m2",
                    patient_id: "p2",
                    type_soin: "Injection",
                    heure_prevue: "09:15:00",
                    statut: "terminee",
                    mission_clinique_id: "mc1",
                    patients: { nom_complet: "M. Martin" },
                  },
                ],
                error: null,
              }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getMissionsDuJour } = await import("./ma-journee");
    const missions = await getMissionsDuJour(fakeClient, "t1");

    expect(missions).toEqual([
      {
        id: "m1",
        patientId: "p1",
        patientNom: "Mme Dupont",
        typeSoin: "Pansement",
        heurePrevue: "08:30:00",
        statut: "a_faire",
        missionCliniqueId: null,
      },
      {
        id: "m2",
        patientId: "p2",
        patientNom: "M. Martin",
        typeSoin: "Injection",
        heurePrevue: "09:15:00",
        statut: "terminee",
        missionCliniqueId: "mc1",
      },
    ]);
  });

  it("gère un embed patients renvoyé sous forme de tableau", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () =>
              Promise.resolve({
                data: [
                  {
                    id: "m3",
                    patient_id: "p3",
                    type_soin: "Glycémie",
                    heure_prevue: "10:00:00",
                    statut: "a_faire",
                    mission_clinique_id: null,
                    patients: [{ nom_complet: "Mme Bernard" }],
                  },
                ],
                error: null,
              }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getMissionsDuJour } = await import("./ma-journee");
    const missions = await getMissionsDuJour(fakeClient, "t1");

    expect(missions).toEqual([
      {
        id: "m3",
        patientId: "p3",
        patientNom: "Mme Bernard",
        typeSoin: "Glycémie",
        heurePrevue: "10:00:00",
        statut: "a_faire",
        missionCliniqueId: null,
      },
    ]);
  });

  it("lève en cas d'erreur de lecture", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: null, error: { message: "boom" } }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getMissionsDuJour } = await import("./ma-journee");

    await expect(getMissionsDuJour(fakeClient, "t1")).rejects.toThrow(/getMissionsDuJour/);
  });
});

describe("getMissionDetail", () => {
  function fakeClientAvecCandidats(
    missionRow: unknown,
    candidatsTransmission: unknown[],
    candidatsRappel: unknown[] = [],
    candidatsPhoto: unknown[] = [],
    prochaineRows: unknown[] = []
  ) {
    return {
      from: () => ({
        select: (colonnes: string) => {
          if (colonnes.includes("tournee_id")) {
            return {
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: missionRow, error: null }),
              }),
            };
          }
          if (colonnes.includes("transmission")) {
            return {
              eq: () => ({
                neq: () => ({
                  not: () => Promise.resolve({ data: candidatsTransmission, error: null }),
                }),
              }),
            };
          }
          if (colonnes.includes("rappel")) {
            return {
              eq: () => ({
                neq: () => ({
                  not: () => Promise.resolve({ data: candidatsRappel, error: null }),
                }),
              }),
            };
          }
          if (colonnes.includes("photo_path")) {
            return {
              eq: () => ({
                neq: () => ({
                  not: () => Promise.resolve({ data: candidatsPhoto, error: null }),
                }),
              }),
            };
          }
          return {
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => Promise.resolve({ data: prochaineRows, error: null }),
                }),
              }),
            }),
          };
        },
      }),
    } as unknown as SupabaseClient;
  }

  const missionRow = {
    id: "m1",
    patient_id: "p1",
    tournee_id: "t1",
    type_soin: "Injection Lovenox",
    heure_prevue: "14:30:00",
    statut: "a_faire",
    mission_clinique_id: null,
    transmission: "Vu ce jour, tout va bien.",
    rappel: "Pense à vérifier la tension.",
    photo_path: "u1/m1.jpg",
    patients: {
      id: "p1",
      nom_complet: "Mme Dupont",
      adresse: "12 rue des Lilas, 75011 Paris",
      telephone: "06 12 34 56 78",
      allergies: "Allergie pénicilline",
      consignes: "Sonner au portail.",
      date_naissance: "1948-03-14",
    },
  };

  it("mappe la mission et le patient joint, avec la dernière transmission, le dernier rappel et la dernière photo les plus récents", async () => {
    const fakeClient = fakeClientAvecCandidats(
      missionRow,
      [
        { transmission: "Ancienne visite, RAS.", heure_prevue: "09:00:00", tournees: { date: "2026-07-01" } },
        { transmission: "Pansement refait, rougeur à surveiller.", heure_prevue: "10:00:00", tournees: { date: "2026-07-14" } },
      ],
      [
        { rappel: "Ancien rappel, déjà traité.", heure_prevue: "09:00:00", tournees: { date: "2026-07-01" } },
        { rappel: "Vérifier la cicatrisation dans 3 jours.", heure_prevue: "10:00:00", tournees: { date: "2026-07-14" } },
      ],
      [
        { photo_path: "u1/m0-ancienne.jpg", heure_prevue: "09:00:00", tournees: { date: "2026-07-01" } },
        { photo_path: "u1/m0-recente.jpg", heure_prevue: "10:00:00", tournees: { date: "2026-07-14" } },
      ]
    );

    const { getMissionDetail } = await import("./ma-journee");
    const detail = await getMissionDetail(fakeClient, "m1");

    expect(detail).toEqual({
      id: "m1",
      patientId: "p1",
      patientNom: "Mme Dupont",
      typeSoin: "Injection Lovenox",
      heurePrevue: "14:30:00",
      statut: "a_faire",
      missionCliniqueId: null,
      transmission: "Vu ce jour, tout va bien.",
      derniereTransmission: "Pansement refait, rougeur à surveiller.",
      rappel: "Pense à vérifier la tension.",
      dernierRappel: "Vérifier la cicatrisation dans 3 jours.",
      photoPath: "u1/m1.jpg",
      dernierePhotoPath: "u1/m0-recente.jpg",
      prochaineMission: null,
      patient: {
        id: "p1",
        nomComplet: "Mme Dupont",
        adresse: "12 rue des Lilas, 75011 Paris",
        telephone: "06 12 34 56 78",
        allergies: "Allergie pénicilline",
        consignes: "Sonner au portail.",
        dateNaissance: "1948-03-14",
      },
    });
  });

  it("retourne derniereTransmission à null si aucune visite précédente n'a de transmission", async () => {
    const fakeClient = fakeClientAvecCandidats(missionRow, []);

    const { getMissionDetail } = await import("./ma-journee");
    const detail = await getMissionDetail(fakeClient, "m1");

    expect(detail?.derniereTransmission).toBeNull();
  });

  it("retourne dernierRappel à null si aucune visite précédente n'a de rappel", async () => {
    const fakeClient = fakeClientAvecCandidats(missionRow, [], []);

    const { getMissionDetail } = await import("./ma-journee");
    const detail = await getMissionDetail(fakeClient, "m1");

    expect(detail?.dernierRappel).toBeNull();
  });

  it("retourne dernierePhotoPath à null si aucune visite précédente n'a de photo", async () => {
    const fakeClient = fakeClientAvecCandidats(missionRow, [], [], []);

    const { getMissionDetail } = await import("./ma-journee");
    const detail = await getMissionDetail(fakeClient, "m1");

    expect(detail?.dernierePhotoPath).toBeNull();
  });

  it("retourne null si la mission n'existe pas", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getMissionDetail } = await import("./ma-journee");
    const detail = await getMissionDetail(fakeClient, "inconnue");

    expect(detail).toBeNull();
  });

  it("retourne la prochaine mission à faire (la plus proche par heure_prevue) quand le statut est terminee", async () => {
    const fakeClient = fakeClientAvecCandidats(
      { ...missionRow, statut: "terminee" },
      [],
      [],
      [],
      [{ id: "m2", heure_prevue: "15:00:00", patients: { nom_complet: "M. Martin" } }]
    );

    const { getMissionDetail } = await import("./ma-journee");
    const detail = await getMissionDetail(fakeClient, "m1");

    expect(detail?.prochaineMission).toEqual({
      id: "m2",
      patientNom: "M. Martin",
      heurePrevue: "15:00:00",
    });
  });

  it("retourne prochaineMission à null si aucune mission à faire ne reste dans la tournée, statut terminee", async () => {
    const fakeClient = fakeClientAvecCandidats({ ...missionRow, statut: "terminee" }, [], [], [], []);

    const { getMissionDetail } = await import("./ma-journee");
    const detail = await getMissionDetail(fakeClient, "m1");

    expect(detail?.prochaineMission).toBeNull();
  });

  it("retourne aussi la prochaine mission à faire quand le statut est absent, y compris avec un embed patients en tableau", async () => {
    const fakeClient = fakeClientAvecCandidats(
      { ...missionRow, statut: "absent" },
      [],
      [],
      [],
      [{ id: "m3", heure_prevue: "16:00:00", patients: [{ nom_complet: "Mme Bernard" }] }]
    );

    const { getMissionDetail } = await import("./ma-journee");
    const detail = await getMissionDetail(fakeClient, "m1");

    expect(detail?.prochaineMission).toEqual({
      id: "m3",
      patientNom: "Mme Bernard",
      heurePrevue: "16:00:00",
    });
  });
});

describe("getMissionDetail — échecs", () => {
  function fakeClientDetail(resultat: { data: unknown; error: unknown }) {
    return {
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: () => Promise.resolve(resultat) }),
        }),
      }),
    } as unknown as SupabaseClient;
  }

  it("lève quand la lecture échoue", async () => {
    const { getMissionDetail } = await import("./ma-journee");

    await expect(
      getMissionDetail(fakeClientDetail({ data: null, error: { message: "boom" } }), "m1")
    ).rejects.toThrow(/getMissionDetail/);
  });

  it("rend null quand la mission est simplement introuvable", async () => {
    const { getMissionDetail } = await import("./ma-journee");

    expect(await getMissionDetail(fakeClientDetail({ data: null, error: null }), "m1")).toBeNull();
  });
});

describe("getPhotoUrl", () => {
  it("retourne l'URL signée si Supabase Storage répond sans erreur", async () => {
    const fakeClient = {
      storage: {
        from: () => ({
          createSignedUrl: () =>
            Promise.resolve({ data: { signedUrl: "https://example.supabase.co/signed/u1/m1.jpg" }, error: null }),
        }),
      },
    } as unknown as SupabaseClient;

    const { getPhotoUrl } = await import("./ma-journee");
    const url = await getPhotoUrl(fakeClient, "u1/m1.jpg");

    expect(url).toBe("https://example.supabase.co/signed/u1/m1.jpg");
  });

  it("retourne null si Supabase Storage renvoie une erreur", async () => {
    const fakeClient = {
      storage: {
        from: () => ({
          createSignedUrl: () => Promise.resolve({ data: null, error: { message: "not found" } }),
        }),
      },
    } as unknown as SupabaseClient;

    const { getPhotoUrl } = await import("./ma-journee");
    const url = await getPhotoUrl(fakeClient, "u1/inconnue.jpg");

    expect(url).toBeNull();
  });
});

describe("getMissionsTourneeVue", () => {
  function fakeClientAvecMissions(rows: unknown[]) {
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: rows, error: null }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;
  }

  const patient = {
    nom_complet: "Mme Dupont",
    adresse: "12 rue des Lilas",
    telephone: "06 12 34 56 78",
    allergies: null,
    consignes: null,
    date_naissance: "1944-03-12",
  };

  it("remonte les actes triés par ordre, avec leur code NGAP", async () => {
    const fakeClient = fakeClientAvecMissions([
      {
        id: "m1",
        patient_id: "p1",
        type_soin: "Toilette + Insuline",
        heure_prevue: "08:00:00",
        statut: "a_faire",
        mission_clinique_id: null,
        patients: patient,
        missions_cliniques: null,
        actes_mission: [
          { libelle: "Insuline", ordre: 1, ngap_codes: { code: "AMI 1" } },
          { libelle: "Toilette", ordre: 0, ngap_codes: { code: "AIS 3" } },
        ],
      },
    ]);

    const { getMissionsTourneeVue } = await import("./ma-journee");
    const missions = await getMissionsTourneeVue(fakeClient, "t1");

    expect(missions[0].actes).toEqual([
      { libelle: "Toilette", code: "AIS 3" },
      { libelle: "Insuline", code: "AMI 1" },
    ]);
  });

  it("rend un code nul pour un acte sans cotation", async () => {
    const fakeClient = fakeClientAvecMissions([
      {
        id: "m1",
        patient_id: "p1",
        type_soin: "Pansement",
        heure_prevue: "10:00:00",
        statut: "a_faire",
        mission_clinique_id: null,
        patients: patient,
        missions_cliniques: null,
        actes_mission: [{ libelle: "Pansement", ordre: 0, ngap_codes: null }],
      },
    ]);

    const { getMissionsTourneeVue } = await import("./ma-journee");
    const missions = await getMissionsTourneeVue(fakeClient, "t1");

    expect(missions[0].actes).toEqual([{ libelle: "Pansement", code: null }]);
  });

  it("rend une liste d'actes vide quand la mission n'en porte aucun", async () => {
    const fakeClient = fakeClientAvecMissions([
      {
        id: "m1",
        patient_id: "p1",
        type_soin: "Pansement",
        heure_prevue: "10:00:00",
        statut: "a_faire",
        mission_clinique_id: null,
        patients: patient,
        missions_cliniques: null,
        actes_mission: null,
      },
    ]);

    const { getMissionsTourneeVue } = await import("./ma-journee");
    const missions = await getMissionsTourneeVue(fakeClient, "t1");

    expect(missions[0].actes).toEqual([]);
  });
});

describe("getMissionsTourneeVue — échecs", () => {
  it("lève quand la lecture échoue", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: null, error: { message: "boom" } }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getMissionsTourneeVue } = await import("./ma-journee");

    await expect(getMissionsTourneeVue(fakeClient, "t1")).rejects.toThrow(
      /getMissionsTourneeVue/
    );
  });
});

describe("getMissionEnCoursHref", () => {
  it("retourne un lien direct vers la situation terrain si un protocole est lié", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              limit: () =>
                Promise.resolve({
                  data: [
                    {
                      id: "m1",
                      type_soin: "Glycémie",
                      mission_clinique_id: "mc1",
                      missions_cliniques: { situation_terrain_id: "s1" },
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getMissionEnCoursHref } = await import("./ma-journee");
    const contexte = await getMissionEnCoursHref(fakeClient, "t1");

    expect(contexte).toEqual({ missionId: "m1", href: "/situations/s1" });
  });

  it("retourne un lien de recherche pré-remplie si aucun protocole n'est lié", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              limit: () =>
                Promise.resolve({
                  data: [
                    {
                      id: "m2",
                      type_soin: "Pansement",
                      mission_clinique_id: null,
                      missions_cliniques: null,
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getMissionEnCoursHref } = await import("./ma-journee");
    const contexte = await getMissionEnCoursHref(fakeClient, "t1");

    expect(contexte).toEqual({ missionId: "m2", href: "/ely?q=Pansement" });
  });

  it("retourne null si aucune mission n'est en cours", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getMissionEnCoursHref } = await import("./ma-journee");
    const contexte = await getMissionEnCoursHref(fakeClient, "t1");

    expect(contexte).toBeNull();
  });

  it("retourne un lien direct même si l'embed missions_cliniques est renvoyé sous forme de tableau", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              limit: () =>
                Promise.resolve({
                  data: [
                    {
                      id: "m3",
                      type_soin: "Injection",
                      mission_clinique_id: "mc3",
                      missions_cliniques: [{ situation_terrain_id: "s3" }],
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getMissionEnCoursHref } = await import("./ma-journee");
    const contexte = await getMissionEnCoursHref(fakeClient, "t1");

    expect(contexte).toEqual({ missionId: "m3", href: "/situations/s3" });
  });
});
