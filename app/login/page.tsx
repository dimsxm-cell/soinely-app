"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LienRetour } from "@/components/ui/LienRetour";
import { LogoSoinely } from "@/components/ui/LogoSoinely";
import { signInAction, signUpAction, requestPasswordResetAction } from "./actions";

type Mode = "login" | "signup" | "forgot";

const INPUT_CLASS =
  "min-h-[44px] rounded-card border border-navy/20 px-3 text-navy placeholder:text-navy/40";

const SUBMIT_BUTTON_CLASS =
  "flex min-h-[44px] items-center justify-center rounded-full bg-gradient-to-r from-brand-violet to-brand-rose px-5 text-[15px] font-semibold text-white transition-colors hover:brightness-110";

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
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6 py-14">
        <LienRetour href="/" label="Accueil" />

        <div className="mt-6 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 text-lg font-bold tracking-tight text-navy">
            <LogoSoinely className="h-5 w-5" />
            Soinely
          </div>
          <h1 className="mt-5 font-display text-[26px] font-medium leading-tight">
            {mode === "forgot" ? "Mot de passe oublié" : "Bienvenue sur Soinely"}
          </h1>
          {mode !== "forgot" && (
            <p className="mt-1 text-sm text-navy/60">Fait par une IDEL, pour les IDEL.</p>
          )}
        </div>

        {mode !== "forgot" && (
          <div className="mt-6 flex rounded-full border border-navy/10 bg-white p-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
                mode === "login"
                  ? "bg-gradient-to-r from-brand-violet to-brand-rose text-white"
                  : "text-navy/60 hover:text-navy"
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
                mode === "signup"
                  ? "bg-gradient-to-r from-brand-violet to-brand-rose text-white"
                  : "text-navy/60 hover:text-navy"
              }`}
            >
              Créer un compte
            </button>
          </div>
        )}

        <div className="mt-6 rounded-[20px] border border-navy/10 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,.04),0_18px_40px_rgba(15,23,42,.06)]">
          {mode === "login" && (
            <form action={handleLogin} className="flex flex-col gap-4">
              <input name="email" type="email" required placeholder="Adresse email" className={INPUT_CLASS} />
              <input
                name="password"
                type="password"
                required
                placeholder="Mot de passe"
                className={INPUT_CLASS}
              />
              {error && <p className="text-sm text-danger">{error}</p>}
              <button type="submit" className={SUBMIT_BUTTON_CLASS}>
                Se connecter
              </button>
              <button
                type="button"
                onClick={() => switchMode("forgot")}
                className="text-center text-sm text-brand-violet hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </form>
          )}

          {mode === "signup" && (
            <form action={handleSignUp} className="flex flex-col gap-4">
              <input
                name="fullName"
                type="text"
                required
                placeholder="Nom complet"
                className={INPUT_CLASS}
              />
              <input name="email" type="email" required placeholder="Adresse email" className={INPUT_CLASS} />
              <input
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="Mot de passe"
                className={INPUT_CLASS}
              />
              {error && <p className="text-sm text-danger">{error}</p>}
              {message && <p className="text-sm text-success">{message}</p>}
              <button type="submit" className={SUBMIT_BUTTON_CLASS}>
                Créer mon compte
              </button>
            </form>
          )}

          {mode === "forgot" && (
            <form action={handleForgot} className="flex flex-col gap-4">
              <input name="email" type="email" required placeholder="Adresse email" className={INPUT_CLASS} />
              {error && <p className="text-sm text-danger">{error}</p>}
              {message && <p className="text-sm text-success">{message}</p>}
              <button type="submit" className={SUBMIT_BUTTON_CLASS}>
                Envoyer le lien
              </button>
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="text-center text-sm text-brand-violet hover:underline"
              >
                ‹ Retour à la connexion
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
