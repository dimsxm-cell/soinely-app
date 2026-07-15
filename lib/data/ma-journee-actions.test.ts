import { beforeEach, describe, expect, it, vi } from "vitest";

const eqSelectMock = vi.fn();
const selectMock = vi.fn(() => ({ eq: () => ({ maybeSingle: eqSelectMock }) }));
const eqUpdateMock = vi.fn();
const updateMock = vi.fn(() => ({ eq: eqUpdateMock }));
const fromMock = vi.fn(() => ({ select: selectMock, update: updateMock }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({ from: fromMock }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateMissionStatutAction", () => {
  it("applique une transition valide (a_faire vers en_cours) et invalide le cache", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "a_faire" }, error: null });
    eqUpdateMock.mockResolvedValue({ error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "en_cours");

    await updateMissionStatutAction(formData);

    expect(fromMock).toHaveBeenCalledWith("missions_du_jour");
    expect(updateMock).toHaveBeenCalledWith({ statut: "en_cours" });
    expect(eqUpdateMock).toHaveBeenCalledWith("id", "m1");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee");
  });

  it("n'applique pas une transition invalide (terminee vers a_faire)", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "terminee" }, error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "a_faire");

    await updateMissionStatutAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("n'applique pas une transition invalide (a_faire directement vers terminee)", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "a_faire" }, error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "terminee");

    await updateMissionStatutAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("n'applique pas une transition invalide (en_cours vers a_faire)", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "en_cours" }, error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "a_faire");

    await updateMissionStatutAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("n'applique rien si la mission n'existe pas", async () => {
    eqSelectMock.mockResolvedValue({ data: null, error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "inconnue");
    formData.set("nouveauStatut", "en_cours");

    await updateMissionStatutAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
