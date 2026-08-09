import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signInWithOAuth: vi.fn() },
  }),
}));

vi.mock("./actions", () => ({
  signInAction: vi.fn(),
  signUpAction: vi.fn(),
  requestPasswordResetAction: vi.fn(),
}));

describe("LoginPage", () => {
  it("démarre en mode Connexion, avec email et mot de passe", async () => {
    const { default: LoginPage } = await import("./page");
    render(<LoginPage />);

    expect(screen.getByText("Bienvenue sur Soinely")).toBeInTheDocument();
    expect(screen.getByLabelText("Adresse email")).toBeInTheDocument();
    expect(screen.getByLabelText("Mot de passe")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nom complet")).not.toBeInTheDocument();
  });

  it("bascule vers Créer un compte et affiche les champs d'inscription", async () => {
    const { default: LoginPage } = await import("./page");
    render(<LoginPage />);

    fireEvent.click(screen.getByRole("button", { name: "Créer un compte" }));

    expect(screen.getByText("Créez votre compte")).toBeInTheDocument();
    expect(screen.getByLabelText("Nom complet")).toBeInTheDocument();
    expect(screen.getByLabelText("Numéro ADELI / RPPS")).toBeInTheDocument();
  });

  it("bascule vers Mot de passe oublié et masque la bascule de mode", async () => {
    const { default: LoginPage } = await import("./page");
    render(<LoginPage />);

    fireEvent.click(screen.getByRole("button", { name: "Mot de passe oublié ?" }));

    expect(screen.getByText("Mot de passe oublié")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Créer un compte" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Envoyer le lien" })).toBeInTheDocument();
  });
});
