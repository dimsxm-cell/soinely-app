import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const missionsSelectQueue: { data: unknown; error: unknown }[] = [];
const profilesSelectResult: { data: unknown; error: unknown } = { data: null, error: null };
const updateResults: { error: unknown }[] = [];
const updateCalls: { payload: unknown; missionId: string }[] = [];
const resetResult: { error: unknown } = { error: null };
const resetCalls: { tourneeId: string; statutExclu: string }[] = [];

// Comme le vrai client Supabase, chaque maillon de la chaîne (`eq`, `order`,
// `limit`) se contente de renvoyer le même objet : seul un `await` (ou un
// `.maybeSingle()` explicite) déclenche la résolution. Un seul constructeur
// suffit donc pour les trois formes de lecture que cette action enchaîne
// (liste brute, ligne unique via .maybeSingle()).
function construireLecture(resultat: { data: unknown; error: unknown }) {
  const builder = {
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: () => Promise.resolve(resultat),
    then: (resolve: (v: typeof resultat) => void) => resolve(resultat),
  };
  return builder;
}

const fromMock = vi.fn((table: string) => {
  if (table === "profiles") {
    return { select: () => construireLecture(profilesSelectResult) };
  }
  if (table === "missions_du_jour") {
    return {
      select: () => construireLecture(missionsSelectQueue.shift() ?? { data: null, error: null }),
      // La remise à zéro globale (`{ ordre_visite: null }`) et la numérotation
      // individuelle (`{ ordre_visite: <nombre> }`) empruntent deux
      // enchaînements différents côté vrai client Supabase — `.eq(...).neq(...)`
      // pour l'une, `.eq("id", missionId)` pour l'autre — donc `update()`
      // branche sur la forme du payload reçu pour reproduire les deux.
      update: (payload: { ordre_visite: number | null }) => {
        if (payload.ordre_visite === null) {
          return {
            eq: (_colonne: string, tourneeId: string) => ({
              neq: (_colonneExclue: string, statutExclu: string) => {
                resetCalls.push({ tourneeId, statutExclu });
                return Promise.resolve(resetResult);
              },
            }),
          };
        }
        return {
          eq: (_colonne: string, missionId: string) => {
            updateCalls.push({ payload, missionId });
            return Promise.resolve(updateResults.shift() ?? { error: null });
          },
        };
      },
    };
  }
  throw new Error(`Table non attendue dans ce test : ${table}`);
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    from: fromMock,
    auth: { getUser: getUserMock },
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

beforeEach(() => {
  vi.stubEnv("OPENROUTESERVICE_API_KEY", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.clearAllMocks();
  missionsSelectQueue.length = 0;
  updateResults.length = 0;
  updateCalls.length = 0;
  resetCalls.length = 0;
  resetResult.error = null;
  profilesSelectResult.data = null;
  profilesSelectResult.error = null;
  getUserMock.mockResolvedValue({ data: { user: { id: "idel1" } }, error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("reorganiserTourneeAction", () => {
  it("réorganise à partir du cabinet quand la tournée n'a pas commencé", async () => {
    missionsSelectQueue.push(
      {
        data: [
          { id: "loin", patients: { latitude: 49.1, longitude: 2.3 } },
          { id: "proche", patients: { latitude: 48.82, longitude: 2.3 } },
        ],
        error: null,
      },
      { data: null, error: null }, // en_cours
      { data: null, error: null } // terminee
    );
    profilesSelectResult.data = { cabinet_latitude: 48.8, cabinet_longitude: 2.3 };
    updateResults.push({ error: null }, { error: null });

    const { reorganiserTourneeAction } = await import("./reorganisation-tournee");
    const formData = new FormData();
    formData.set("tourneeId", "t1");

    const resultat = await reorganiserTourneeAction(formData);

    expect(resultat).toEqual({ succes: true });
    expect(updateCalls).toEqual([
      { payload: { ordre_visite: 1 }, missionId: "proche" },
      { payload: { ordre_visite: 2 }, missionId: "loin" },
    ]);
  });

  it("part de la mission en cours plutôt que du cabinet", async () => {
    missionsSelectQueue.push(
      {
        data: [
          { id: "m1", patients: { latitude: 48.82, longitude: 2.3 } },
          { id: "m2", patients: { latitude: 48.9, longitude: 2.3 } },
        ],
        error: null,
      },
      { data: { patients: { latitude: 48.83, longitude: 2.3 } }, error: null } // en_cours
    );
    updateResults.push({ error: null }, { error: null });

    const { reorganiserTourneeAction } = await import("./reorganisation-tournee");
    const formData = new FormData();
    formData.set("tourneeId", "t1");

    await reorganiserTourneeAction(formData);

    // Depuis 48.83, m1 (48.82) est plus proche que m2 (48.90).
    expect(updateCalls[0]).toEqual({ payload: { ordre_visite: 1 }, missionId: "m1" });
    // Le cabinet n'a pas été consulté : la mission en cours a suffi.
    const appelsProfiles = fromMock.mock.calls.filter((appel) => appel[0] === "profiles");
    expect(appelsProfiles).toHaveLength(0);
  });

  it("part de la dernière mission terminée quand il n'y a pas de mission en cours", async () => {
    missionsSelectQueue.push(
      {
        data: [
          { id: "m1", patients: { latitude: 48.86, longitude: 2.3 } },
          { id: "m2", patients: { latitude: 49.0, longitude: 2.3 } },
        ],
        error: null,
      },
      { data: null, error: null }, // en_cours
      { data: { patients: { latitude: 48.85, longitude: 2.3 } }, error: null } // terminee
    );
    updateResults.push({ error: null }, { error: null });

    const { reorganiserTourneeAction } = await import("./reorganisation-tournee");
    const formData = new FormData();
    formData.set("tourneeId", "t1");

    await reorganiserTourneeAction(formData);

    // Depuis 48.85 (dernière terminée), m1 (48.86) est plus proche que m2 (49.0).
    expect(updateCalls[0]).toEqual({ payload: { ordre_visite: 1 }, missionId: "m1" });
    // Le cabinet n'a pas été consulté : la dernière mission terminée a suffi.
    const appelsProfiles = fromMock.mock.calls.filter((appel) => appel[0] === "profiles");
    expect(appelsProfiles).toHaveLength(0);
  });

  it("refuse de réorganiser moins de deux visites restantes", async () => {
    missionsSelectQueue.push({ data: [{ id: "m1", patients: null }], error: null });

    const { reorganiserTourneeAction } = await import("./reorganisation-tournee");
    const formData = new FormData();
    formData.set("tourneeId", "t1");

    const resultat = await reorganiserTourneeAction(formData);

    expect(resultat.succes).toBe(false);
    expect(resultat.erreur).toMatch(/au moins deux/);
    expect(updateCalls).toHaveLength(0);
  });

  it("signale l'échec quand aucune coordonnée n'est disponible, y compris le cabinet", async () => {
    missionsSelectQueue.push(
      {
        data: [
          { id: "m1", patients: { latitude: null, longitude: null } },
          { id: "m2", patients: { latitude: null, longitude: null } },
        ],
        error: null,
      },
      { data: null, error: null }, // en_cours
      { data: null, error: null } // terminee
    );
    profilesSelectResult.data = { cabinet_latitude: null, cabinet_longitude: null };

    const { reorganiserTourneeAction } = await import("./reorganisation-tournee");
    const formData = new FormData();
    formData.set("tourneeId", "t1");

    const resultat = await reorganiserTourneeAction(formData);

    expect(resultat.succes).toBe(false);
    expect(resultat.erreur).toMatch(/adresses localisées/);
    expect(updateCalls).toHaveLength(0);
  });

  it("place un patient non géocodé en fin de séquence plutôt que d'échouer", async () => {
    missionsSelectQueue.push(
      {
        data: [
          { id: "sans-coords", patients: { latitude: null, longitude: null } },
          { id: "proche", patients: { latitude: 48.82, longitude: 2.3 } },
        ],
        error: null,
      },
      { data: null, error: null },
      { data: null, error: null }
    );
    profilesSelectResult.data = { cabinet_latitude: 48.8, cabinet_longitude: 2.3 };
    updateResults.push({ error: null }, { error: null });

    const { reorganiserTourneeAction } = await import("./reorganisation-tournee");
    const formData = new FormData();
    formData.set("tourneeId", "t1");

    await reorganiserTourneeAction(formData);

    expect(updateCalls).toEqual([
      { payload: { ordre_visite: 1 }, missionId: "proche" },
      { payload: { ordre_visite: 2 }, missionId: "sans-coords" },
    ]);
  });

  it("n'écrit rien si l'utilisatrice n'est pas connectée", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });

    const { reorganiserTourneeAction } = await import("./reorganisation-tournee");
    const formData = new FormData();
    formData.set("tourneeId", "t1");

    const resultat = await reorganiserTourneeAction(formData);

    expect(resultat.succes).toBe(false);
    expect(resultat.erreur).toMatch(/connectée/);
    expect(updateCalls).toHaveLength(0);
  });

  it("remet à zéro le ordre_visite des missions non « à faire » avant de renuméroter", async () => {
    // Une mission « terminee » a été numérotée lors d'une réorganisation
    // précédente (ordre_visite = 1 côté base) puis terminée entre-temps.
    // Sans remise à zéro, elle garderait ce numéro en même temps qu'une
    // mission « à faire » fraîchement numérotée reçoit elle aussi 1.
    missionsSelectQueue.push(
      {
        data: [
          { id: "m1", patients: { latitude: 48.82, longitude: 2.3 } },
          { id: "m2", patients: { latitude: 48.9, longitude: 2.3 } },
        ],
        error: null,
      },
      { data: null, error: null }, // en_cours
      { data: null, error: null } // terminee
    );
    profilesSelectResult.data = { cabinet_latitude: 48.8, cabinet_longitude: 2.3 };
    updateResults.push({ error: null }, { error: null });

    const { reorganiserTourneeAction } = await import("./reorganisation-tournee");
    const formData = new FormData();
    formData.set("tourneeId", "t1");

    const resultat = await reorganiserTourneeAction(formData);

    expect(resultat).toEqual({ succes: true });
    expect(resetCalls).toEqual([{ tourneeId: "t1", statutExclu: "a_faire" }]);
    expect(updateCalls).toEqual([
      { payload: { ordre_visite: 1 }, missionId: "m1" },
      { payload: { ordre_visite: 2 }, missionId: "m2" },
    ]);
  });

  it("signale l'échec quand la remise à zéro du ordre_visite échoue", async () => {
    missionsSelectQueue.push(
      {
        data: [
          { id: "m1", patients: { latitude: 48.82, longitude: 2.3 } },
          { id: "m2", patients: { latitude: 48.9, longitude: 2.3 } },
        ],
        error: null,
      },
      { data: null, error: null },
      { data: null, error: null }
    );
    profilesSelectResult.data = { cabinet_latitude: 48.8, cabinet_longitude: 2.3 };
    resetResult.error = { message: "boom" };

    const { reorganiserTourneeAction } = await import("./reorganisation-tournee");
    const formData = new FormData();
    formData.set("tourneeId", "t1");

    const resultat = await reorganiserTourneeAction(formData);

    expect(resultat.succes).toBe(false);
    expect(updateCalls).toHaveLength(0);
  });

  it("signale un échec partiel de l'écriture", async () => {
    missionsSelectQueue.push(
      {
        data: [
          { id: "m1", patients: { latitude: 48.82, longitude: 2.3 } },
          { id: "m2", patients: { latitude: 48.9, longitude: 2.3 } },
        ],
        error: null,
      },
      { data: null, error: null },
      { data: null, error: null }
    );
    profilesSelectResult.data = { cabinet_latitude: 48.8, cabinet_longitude: 2.3 };
    updateResults.push({ error: null }, { error: { message: "boom" } });

    const { reorganiserTourneeAction } = await import("./reorganisation-tournee");
    const formData = new FormData();
    formData.set("tourneeId", "t1");

    const resultat = await reorganiserTourneeAction(formData);

    expect(resultat.succes).toBe(false);
    expect(resultat.erreur).toMatch(/partiellement échoué/);
  });
});
