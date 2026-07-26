import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("getAvatarUrl", () => {
  it("retourne l'URL signée si Supabase Storage répond sans erreur", async () => {
    const fakeClient = {
      storage: {
        from: () => ({
          createSignedUrl: () =>
            Promise.resolve({ data: { signedUrl: "https://example.supabase.co/signed/u1/avatar.jpg" }, error: null }),
        }),
      },
    } as unknown as SupabaseClient;

    const { getAvatarUrl } = await import("./profil");
    const url = await getAvatarUrl(fakeClient, "u1/avatar.jpg");

    expect(url).toBe("https://example.supabase.co/signed/u1/avatar.jpg");
  });

  it("retourne null si Supabase Storage renvoie une erreur", async () => {
    const fakeClient = {
      storage: {
        from: () => ({
          createSignedUrl: () => Promise.resolve({ data: null, error: { message: "not found" } }),
        }),
      },
    } as unknown as SupabaseClient;

    const { getAvatarUrl } = await import("./profil");
    const url = await getAvatarUrl(fakeClient, "u1/inconnu.jpg");

    expect(url).toBeNull();
  });
});
