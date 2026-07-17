"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { signInAction, signUpAction, requestPasswordResetAction } from "./actions";

type Mode = "login" | "signup" | "forgot";

const TITLE: Record<Mode, string> = {
  login: "Connexion",
  signup: "Créer un compte",
  forgot: "Mot de passe oublié",
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setMessage(null);
  }

  async function handleLogin(formData: FormData) {
    setError(null);
    const result = await signInAction(formData);
    if (result.success) {
      router.push("/ma-journee");
    } else {
      setError(result.error);
    }
  }

  async function handleSignUp(formData: FormData) {
    setError(null);
    setMessage(null);
    const result = await signUpAction(formData);
    if (result.success) {
      setMessage(
        "Compte créé — vérifiez votre boîte mail pour confirmer votre adresse avant de vous connecter."
      );
    } else {
      setError(result.error);
    }
  }

  async function handleForgot(formData: FormData) {
    setError(null);
    setMessage(null);
    const result = await requestPasswordResetAction(formData);
    if (result.success) {
      setMessage("Si un compte existe avec cette adresse, un lien de réinitialisation vient d'être envoyé.");
    } else {
      setError(result.error);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold text-navy">{TITLE[mode]}</h1>

      {mode === "login" && (
        <form action={handleLogin} className="flex flex-col gap-4">
          <input
            name="email"
            type="email"
            required
            placeholder="Adresse email"
            className="min-h-[44px] rounded-card border border-navy/20 px-2"
          />
          <input
            name="password"
            type="password"
            required
            placeholder="Mot de passe"
            className="min-h-[44px] rounded-card border border-navy/20 px-2"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit">Se connecter</Button>
        </form>
      )}

      {mode === "signup" && (
        <form action={handleSignUp} className="flex flex-col gap-4">
          <input
            name="fullName"
            type="text"
            required
            placeholder="Nom complet"
            className="min-h-[44px] rounded-card border border-navy/20 px-2"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="Adresse email"
            className="min-h-[44px] rounded-card border border-navy/20 px-2"
          />
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="Mot de passe"
            className="min-h-[44px] rounded-card border border-navy/20 px-2"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          {message && <p className="text-sm text-success">{message}</p>}
          <Button type="submit">Créer mon compte</Button>
        </form>
      )}

      {mode === "forgot" && (
        <form action={handleForgot} className="flex flex-col gap-4">
          <input
            name="email"
            type="email"
            required
            placeholder="Adresse email"
            className="min-h-[44px] rounded-card border border-navy/20 px-2"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          {message && <p className="text-sm text-success">{message}</p>}
          <Button type="submit">Envoyer le lien</Button>
        </form>
      )}

      <div className="flex flex-col gap-2 text-sm">
        {mode !== "login" && (
          <button type="button" onClick={() => switchMode("login")} className="text-left text-primary hover:underline">
            ‹ Retour à la connexion
          </button>
        )}
        {mode === "login" && (
          <>
            <button type="button" onClick={() => switchMode("signup")} className="text-left text-primary hover:underline">
              Créer un compte
            </button>
            <button type="button" onClick={() => switchMode("forgot")} className="text-left text-primary hover:underline">
              Mot de passe oublié ?
            </button>
          </>
        )}
      </div>
    </main>
  );
}
