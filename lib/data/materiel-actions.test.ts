import { beforeEach, describe, expect, it, vi } from "vitest";

const updateMock = vi.fn();
const eqMock = vi.fn();
const fromMock = vi.fn(() => ({ update: updateMock }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({ from: fromMock }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  updateMock.mockReturnValue({ eq: eqMock });
  eqMock.mockResolvedValue({ error: null });
});

describe("updateMaterielAction", () => {
  it("coche materiel_prepare", async () => {
    const { updateMaterielAction } = await import("./materiel-actions");
    const formData = new FormData();
    formData.set("tourneeId", "t1");
    formData.set("champ", "prepare");

    const resultat = await updateMaterielAction(formData);

    expect(resultat).toEqual({ succes: true });
    expect(fromMock).toHaveBeenCalledWith("tournees");
    expect(updateMock).toHaveBeenCalledWith({ materiel_prepare: true });
    expect(eqMock).toHaveBeenCalledWith("id", "t1");
  });

  it("coche materiel_verifie indépendamment", async () => {
    const { updateMaterielAction } = await import("./materiel-actions");
    const formData = new FormData();
    formData.set("tourneeId", "t1");
    formData.set("champ", "verifie");

    await updateMaterielAction(formData);

    expect(updateMock).toHaveBeenCalledWith({ materiel_verifie: true });
  });

  it("refuse un champ invalide", async () => {
    const { updateMaterielAction } = await import("./materiel-actions");
    const formData = new FormData();
    formData.set("tourneeId", "t1");
    formData.set("champ", "autre_chose");

    const resultat = await updateMaterielAction(formData);

    expect(resultat.succes).toBe(false);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("signale un échec d'écriture", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    eqMock.mockResolvedValue({ error: { message: "boom" } });

    const { updateMaterielAction } = await import("./materiel-actions");
    const formData = new FormData();
    formData.set("tourneeId", "t1");
    formData.set("champ", "prepare");

    const resultat = await updateMaterielAction(formData);

    expect(resultat.succes).toBe(false);
    expect(resultat.erreur).toContain("boom");
  });
});
