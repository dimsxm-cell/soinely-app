import { describe, expect, it, vi } from "vitest";

describe("createClient (browser)", () => {
  it("creates a client exposing the auth API", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

    const { createClient } = await import("./client");
    const client = createClient();

    expect(client).toBeDefined();
    expect(typeof client.auth.signInWithPassword).toBe("function");
  });
});
