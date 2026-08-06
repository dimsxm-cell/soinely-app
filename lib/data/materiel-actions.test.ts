import { beforeEach, describe, expect, it, vi } from "vitest";

const selectMock = vi.fn().mockResolvedValue({ data: [{ id: "t1" }], error: null });
const eqMock = vi.fn().mockReturnValue({ select: selectMock });
const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
const fromMock = vi.fn(() => ({ update: updateMock }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({ from: fromMock }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectMock.mockResolvedValue({ data: [{ id: "t1" }], error: null });
  eqMock.mockReturnValue({ select: selectMock });
  updateMock.mockReturnValue({ eq: eqMock });
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
    eqMock.mockReturnValue({ select: vi.fn().mockResolvedValue({ error: { message: "boom" } }) });

    const { updateMaterielAction } = await import("./materiel-actions");
    const formData = new FormData();
    formData.set("tourneeId", "t1");
    formData.set("champ", "prepare");

    const resultat = await updateMaterielAction(formData);

    expect(resultat.succes).toBe(false);
    expect(resultat.erreur).toContain("boom");
  });

  it("signale si aucune ligne n'a été affectée par l'écriture", async () => {
    selectMock.mockResolvedValue({ data: [], error: null });

    const { updateMaterielAction } = await import("./materiel-actions");
    const formData = new FormData();
    formData.set("tourneeId", "inconnue");
    formData.set("champ", "prepare");

    const resultat = await updateMaterielAction(formData);

    expect(resultat.succes).toBe(false);
    expect(resultat.erreur).toBe("Tournée introuvable. Rien n'a été enregistré.");
  });
});
