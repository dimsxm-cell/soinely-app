import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

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

  it("retourne un tableau vide en cas d'erreur", async () => {
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
    const missions = await getMissionsDuJour(fakeClient, "t1");

    expect(missions).toEqual([]);
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

    expect(contexte).toEqual({ missionId: "m2", href: "/copilote?q=Pansement" });
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
