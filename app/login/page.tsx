"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { LogoSoinely } from "@/components/ui/LogoSoinely";
import { createClient } from "@/lib/supabase/client";
import { signInAction, signUpAction, requestPasswordResetAction } from "./actions";

type Mode = "login" | "signup" | "forgot";
type ConfettiPiece = { key: number; style: React.CSSProperties };

const INPUT_CLASS =
  "fld-input min-h-[50px] w-full rounded-[14px] border border-[#e0dced] bg-[#faf8ff] px-4 text-[16px] text-[#1d1d1f] placeholder:text-[#8a8a8e] transition-[border-color,box-shadow]";

const LABEL_CLASS =
  "mb-[7px] block text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[#8a8a8e]";

const CTA_CLASS =
  "btn-glace mt-1 flex min-h-[52px] w-full items-center justify-center rounded-[12px] bg-gradient-to-r from-brand-violet to-brand-rose text-[17px] font-semibold tracking-[-0.3px] text-white shadow-[0_8px_20px_rgba(124,58,237,0.32)]";

const CONFETTI_COLORS = ["#7c3aed", "#a855f7", "#ec4899", "#5856d6", "#22c55e", "#f59e0b"];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setMessage(null);
  }

  function fireConfetti() {
    const pieces = Array.from({ length: 46 }, (_, i) => {
      const x = Math.random() * 100;
      const drift = (Math.random() - 0.5) * 160;
      const size = 6 + Math.random() * 6;
      const round = Math.random() > 0.5;
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      const delay = Math.random() * 0.25;
      const rot = 250 + Math.random() * 400;
      return {
        key: i,
        style: {
          left: `${x}%`,
          width: size,
          height: size * (round ? 1 : 0.4),
          background: color,
          borderRadius: round ? "50%" : 2,
          animationDelay: `${delay}s`,
          ["--cx" as string]: `${drift}px`,
          ["--cr" as string]: `${rot}deg`,
        } as React.CSSProperties,
      };
    });
    setConfetti(pieces);
    setTimeout(() => setConfetti([]), 1700);
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
      fireConfetti();
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

  async function handleOAuth(provider: "google" | "apple") {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/ma-journee` },
    });
  }

  const heroTitle =
    mode === "forgot" ? "Mot de passe oublié" : mode === "signup" ? "Créez votre compte" : "Bienvenue sur Soinely";

  return (
    <main className="relative min-h-screen overflow-hidden" style={{ background: "#faf8ff" }}>
      {/* Filtre de distorsion verre, utilisé par .glass-pill-effect */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <filter id="glass-distortion-inscription" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.008" numOctaves="2" seed="5" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2" result="blur" />
          <feDisplacementMap in="SourceGraphic" in2="blur" scale="22" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      {/* Confettis (succès inscription) */}
      <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
        {confetti.map((p) => (
          <div key={p.key} className="confetti-piece" style={p.style} />
        ))}
      </div>

      {/* ELY en accueil, à partir du grand écran seulement : la colonne du
          formulaire est étroite et centrée, tout l'espace latéral est perdu.
          Sur mobile il n'y a pas la place, le personnage ne s'affiche pas. */}
      <Image
        src="/marketing/ely-professionnel.png"
        alt=""
        width={258}
        height={570}
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-[4%] hidden h-[74vh] w-auto object-contain lg:block xl:left-[10%]"
      />

      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-[22px] pb-12 pt-8 sm:pt-14">
        {/* Retour — même traitement de verre que les autres boutons clairs */}
        <Link
          href="/"
          className="btn-glace-clair inline-flex w-fit shrink-0 items-center gap-1 self-start rounded-[12px] border border-[#e0e0e0] bg-white px-4 py-[9px] text-[15px] font-semibold text-[#1d1d1f]"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Accueil
        </Link>

        {/* Bloc centré verticalement : les formulaires Connexion et Créer un
            compte n'ont pas la même hauteur. Sans ce centrage, passer de l'un
            à l'autre décalait tout le contenu vers le bas, d'où l'impression
            de rebond. Le bloc grandit désormais symétriquement. */}
        <div className="flex flex-1 flex-col justify-center">
        {/* En-tête */}
        <div className="mt-8 flex flex-col items-center text-center">
          <div className="flex items-center gap-[9px]">
            <LogoSoinely variante="carre" className="h-8 w-8" />
            <span className="text-[22px] font-bold tracking-[-0.4px] text-[#1d1d1f]">Soinely</span>
          </div>
          <h1 className="mt-[22px] font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.5px] text-[#1d1d1f] sm:text-[34px]">
            {heroTitle}
          </h1>
          {mode !== "forgot" && (
            <p className="mt-2 text-[15.5px] tracking-[-0.2px] text-[#8a8a8e]">Fait par une IDEL, pour les IDEL.</p>
          )}
        </div>

        {/* Onglets Connexion / Créer un compte */}
        {mode !== "forgot" && (
          <div className="glass-pill mt-[26px] flex gap-[5px] rounded-[14px] border border-white/50 p-[5px]">
            <span className="glass-pill-effect" aria-hidden="true" />
            <span className="glass-pill-tint" aria-hidden="true" />
            <span className="glass-pill-shine" aria-hidden="true" />
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`glass-pill-content appbtn flex-1 rounded-[10px] py-[11px] text-[15px] font-semibold tracking-[-0.2px] transition-colors ${
                mode === "login"
                  ? "bg-gradient-to-r from-brand-violet to-brand-rose text-white shadow-[0_6px_16px_rgba(124,58,237,0.3)]"
                  : "text-[#8a8a8e]"
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`glass-pill-content appbtn flex-1 rounded-[10px] py-[11px] text-[15px] font-semibold tracking-[-0.2px] transition-colors ${
                mode === "signup"
                  ? "bg-gradient-to-r from-brand-violet to-brand-rose text-white shadow-[0_6px_16px_rgba(124,58,237,0.3)]"
                  : "text-[#8a8a8e]"
              }`}
            >
              Créer un compte
            </button>
          </div>
        )}

        {/* Carte formulaire */}
        <div
          className="mt-[18px] flex flex-col gap-[13px] rounded-[18px] bg-white p-[22px_20px]"
          style={{ border: "1px solid rgba(0,0,0,.04)", boxShadow: "0 8px 24px rgba(0,0,0,.09)" }}
        >
          {mode === "login" && (
            <form action={handleLogin} className="flex flex-col gap-[13px]">
              <div>
                <label htmlFor="login-email" className={LABEL_CLASS}>
                  Adresse email
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  required
                  placeholder="vous@exemple.fr"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label htmlFor="login-password" className={LABEL_CLASS}>
                  Mot de passe
                </label>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className={INPUT_CLASS}
                />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <button type="submit" className={CTA_CLASS}>
                Se connecter
              </button>
              <button
                type="button"
                onClick={() => switchMode("forgot")}
                className="mt-0.5 text-center text-[14.5px] font-semibold text-brand-violet"
              >
                Mot de passe oublié ?
              </button>
            </form>
          )}

          {mode === "signup" && (
            <form action={handleSignUp} className="flex flex-col gap-[13px]">
              <div>
                <label htmlFor="signup-fullName" className={LABEL_CLASS}>
                  Nom complet
                </label>
                <input
                  id="signup-fullName"
                  name="fullName"
                  type="text"
                  required
                  placeholder="Camille Laurent"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label htmlFor="signup-email" className={LABEL_CLASS}>
                  Adresse email
                </label>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  required
                  placeholder="vous@exemple.fr"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label htmlFor="signup-password" className={LABEL_CLASS}>
                  Mot de passe
                </label>
                <input
                  id="signup-password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label htmlFor="signup-adeliRpps" className={LABEL_CLASS}>
                  Numéro ADELI / RPPS
                </label>
                <input
                  id="signup-adeliRpps"
                  name="adeliRpps"
                  type="text"
                  placeholder="Facultatif — pour la facturation"
                  className={INPUT_CLASS}
                />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              {message && <p className="text-sm text-success">{message}</p>}
              <button type="submit" className={CTA_CLASS}>
                Créer mon compte
              </button>
            </form>
          )}

          {mode === "forgot" && (
            <form action={handleForgot} className="flex flex-col gap-[13px]">
              <div>
                <label htmlFor="forgot-email" className={LABEL_CLASS}>
                  Adresse email
                </label>
                <input
                  id="forgot-email"
                  name="email"
                  type="email"
                  required
                  placeholder="vous@exemple.fr"
                  className={INPUT_CLASS}
                />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              {message && <p className="text-sm text-success">{message}</p>}
              <button type="submit" className={CTA_CLASS}>
                Envoyer le lien
              </button>
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="mt-0.5 text-center text-[14.5px] font-semibold text-brand-violet"
              >
                ‹ Retour à la connexion
              </button>
            </form>
          )}
        </div>

        {/* Séparateur + connexion sociale */}
        {mode !== "forgot" && (
          <>
            <div className="mx-1 mt-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#e0dced]" />
              <span className="text-[12.5px] text-[#8a8a8e]">ou continuer avec</span>
              <div className="h-px flex-1 bg-[#e0dced]" />
            </div>
            <div className="mt-3.5 flex gap-2.5">
              <button
                type="button"
                onClick={() => handleOAuth("apple")}
                className="btn-glace-clair flex flex-1 items-center justify-center gap-2 rounded-[12px] border border-[#e0e0e0] bg-white py-3 text-[14.5px] font-semibold text-[#1d1d1f]"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="#1d1d1f" aria-hidden="true">
                  <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
                </svg>
                Apple
              </button>
              <button
                type="button"
                onClick={() => handleOAuth("google")}
                className="btn-glace-clair flex flex-1 items-center justify-center gap-2 rounded-[12px] border border-[#e0e0e0] bg-white py-3 text-[14.5px] font-semibold text-[#1d1d1f]"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.06 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h6.2a5.3 5.3 0 0 1-2.3 3.48v2.9h3.72c2.18-2 3.44-4.96 3.44-8.39z" />
                  <path fill="#34A853" d="M12 24c3.1 0 5.7-1.03 7.6-2.8l-3.72-2.9c-1.03.7-2.35 1.1-3.88 1.1-2.98 0-5.5-2-6.4-4.72H1.76v2.98A11.5 11.5 0 0 0 12 24z" />
                  <path fill="#FBBC05" d="M5.6 14.68a6.9 6.9 0 0 1 0-4.36V7.34H1.76a11.5 11.5 0 0 0 0 10.32z" />
                  <path fill="#EA4335" d="M12 5.5c1.68 0 3.2.58 4.4 1.72l3.3-3.3A11.5 11.5 0 0 0 12 0 11.5 11.5 0 0 0 1.76 7.34L5.6 10.32C6.5 7.6 9.02 5.5 12 5.5z" />
                </svg>
                Google
              </button>
            </div>

            {/* Mention affichée dans les deux modes : se connecter avec Apple
                ou Google crée aussi un compte le cas échéant. Les liens
                s'ouvrent dans un nouvel onglet pour ne pas perdre la saisie. */}
            <p className="mx-0.5 mt-5 text-center text-[12.5px] leading-[1.45] text-[#8a8a8e]">
              En créant un compte, vous acceptez les{" "}
              <a
                href="/conditions"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-violet underline"
              >
                conditions
              </a>{" "}
              et la{" "}
              <a
                href="/confidentialite"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-violet underline"
              >
                politique de confidentialité
              </a>
              .
            </p>
          </>
        )}
        </div>
      </div>
    </main>
  );
}
