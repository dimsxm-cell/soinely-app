import { describe, expect, it, vi } from "vitest";

const updateUserMock = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      updateUser: updateUserMock,
    },
  }),
}));

describe("mettreAJourEcoutePermanenteAction", () => {
  it("active le réglage quand la case est cochée", async () => {
    updateUserMock.mockClear();
    const { mettreAJourEcoutePermanenteAction } = await import("./actions");

    const formData = new FormData();
    formData.set("ecoute_permanente_ely", "on");

    await mettreAJourEcoutePermanenteAction(formData);

    expect(updateUserMock).toHaveBeenCalledWith({ data: { ecoute_permanente_ely: true } });
  });

  it("désactive le réglage quand la case est absente du formulaire", async () => {
    updateUserMock.mockClear();
    const { mettreAJourEcoutePermanenteAction } = await import("./actions");

    const formData = new FormData();

    await mettreAJourEcoutePermanenteAction(formData);

    expect(updateUserMock).toHaveBeenCalledWith({ data: { ecoute_permanente_ely: false } });
  });
});
