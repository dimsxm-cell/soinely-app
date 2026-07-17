import { describe, expect, it, vi } from "vitest";

const signInWithPasswordMock = vi.fn().mockResolvedValue({ error: null });
const signUpMock = vi.fn().mockResolvedValue({ error: null });
const resetPasswordForEmailMock = vi.fn().mockResolvedValue({ error: null });
const signOutMock = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: signInWithPasswordMock,
      signUp: signUpMock,
      resetPasswordForEmail: resetPasswordForEmailMock,
      signOut: signOutMock,
    },
  }),
}));

vi.mock("next/headers", () => ({
  headers: () => new Map([["origin", "https://soinely.app"]]),
}));

const redirectMock = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("signInAction", () => {
  it("retourne success quand Supabase ne renvoie pas d'erreur", async () => {
    signInWithPasswordMock.mockResolvedValueOnce({ error: null });

    const { signInAction } = await import("./actions");

    const formData = new FormData();
    formData.set("email", "idel@example.com");
    formData.set("password", "motdepasse123");

    const result = await signInAction(formData);

    expect(result).toEqual({ success: true });
  });

  it("retourne l'erreur Supabase si les identifiants sont invalides", async () => {
    signInWithPasswordMock.mockResolvedValueOnce({ error: { message: "Invalid login credentials" } });

    const { signInAction } = await import("./actions");

    const formData = new FormData();
    formData.set("email", "idel@example.com");
    formData.set("password", "mauvais");

    const result = await signInAction(formData);

    expect(result).toEqual({ success: false, error: "Invalid login credentials" });
  });
});

describe("signUpAction", () => {
  it("crée le compte avec le nom complet en metadata et retourne success", async () => {
    signUpMock.mockResolvedValueOnce({ error: null });

    const { signUpAction } = await import("./actions");

    const formData = new FormData();
    formData.set("fullName", "Marie Dupont");
    formData.set("email", "marie@example.com");
    formData.set("password", "motdepasse123");

    const result = await signUpAction(formData);

    expect(signUpMock).toHaveBeenCalledWith({
      email: "marie@example.com",
      password: "motdepasse123",
      options: { data: { full_name: "Marie Dupont" } },
    });
    expect(result).toEqual({ success: true });
  });

  it("retourne l'erreur Supabase si l'inscription échoue", async () => {
    signUpMock.mockResolvedValueOnce({ error: { message: "User already registered" } });

    const { signUpAction } = await import("./actions");

    const formData = new FormData();
    formData.set("fullName", "Marie Dupont");
    formData.set("email", "marie@example.com");
    formData.set("password", "motdepasse123");

    const result = await signUpAction(formData);

    expect(result).toEqual({ success: false, error: "User already registered" });
  });
});

describe("signOutAction", () => {
  it("déconnecte l'utilisateur et redirige vers /login", async () => {
    signOutMock.mockResolvedValueOnce({ error: null });

    const { signOutAction } = await import("./actions");

    await signOutAction();

    expect(signOutMock).toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });
});

describe("requestPasswordResetAction", () => {
  it("envoie l'email de réinitialisation avec le bon lien de retour", async () => {
    resetPasswordForEmailMock.mockResolvedValueOnce({ error: null });

    const { requestPasswordResetAction } = await import("./actions");

    const formData = new FormData();
    formData.set("email", "marie@example.com");

    const result = await requestPasswordResetAction(formData);

    expect(resetPasswordForEmailMock).toHaveBeenCalledWith("marie@example.com", {
      redirectTo: "https://soinely.app/auth/callback?next=/reinitialiser-mot-de-passe",
    });
    expect(result).toEqual({ success: true });
  });

  it("retourne l'erreur Supabase si l'envoi échoue", async () => {
    resetPasswordForEmailMock.mockResolvedValueOnce({ error: { message: "Erreur envoi email" } });

    const { requestPasswordResetAction } = await import("./actions");

    const formData = new FormData();
    formData.set("email", "marie@example.com");

    const result = await requestPasswordResetAction(formData);

    expect(result).toEqual({ success: false, error: "Erreur envoi email" });
  });
});
