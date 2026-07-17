import { describe, expect, it, vi } from "vitest";

const updateUserMock = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      updateUser: updateUserMock,
    },
  }),
}));

describe("updatePasswordAction", () => {
  it("met à jour le mot de passe et retourne success", async () => {
    updateUserMock.mockResolvedValueOnce({ error: null });

    const { updatePasswordAction } = await import("./actions");

    const formData = new FormData();
    formData.set("password", "nouveauMotDePasse123");

    const result = await updatePasswordAction(formData);

    expect(updateUserMock).toHaveBeenCalledWith({ password: "nouveauMotDePasse123" });
    expect(result).toEqual({ success: true });
  });

  it("retourne l'erreur Supabase si la mise à jour échoue (session de récupération expirée)", async () => {
    updateUserMock.mockResolvedValueOnce({ error: { message: "Auth session missing" } });

    const { updatePasswordAction } = await import("./actions");

    const formData = new FormData();
    formData.set("password", "nouveauMotDePasse123");

    const result = await updatePasswordAction(formData);

    expect(result).toEqual({ success: false, error: "Auth session missing" });
  });
});
