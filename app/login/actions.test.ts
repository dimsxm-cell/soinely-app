import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

describe("signInAction", () => {
  it("retourne success quand Supabase ne renvoie pas d'erreur", async () => {
    const { signInAction } = await import("./actions");

    const formData = new FormData();
    formData.set("email", "idel@example.com");
    formData.set("password", "motdepasse123");

    const result = await signInAction(formData);

    expect(result).toEqual({ success: true });
  });
});
