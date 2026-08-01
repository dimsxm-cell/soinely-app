import { describe, expect, it } from "vitest";
import { traduireErreurAuth } from "./messages-erreur";

describe("traduireErreurAuth", () => {
  it.each([
    ["Invalid login credentials", "Adresse email ou mot de passe incorrect."],
    [
      "Email not confirmed",
      "Votre adresse email n'est pas encore confirmée. Ouvrez le lien reçu par mail, puis reconnectez-vous.",
    ],
    ["User already registered", "Un compte existe déjà avec cette adresse. Connectez-vous plutôt."],
    [
      "Password should be at least 6 characters",
      "Le mot de passe doit contenir au moins 6 caractères.",
    ],
    [
      "Email rate limit exceeded",
      "Trop de tentatives. Patientez quelques minutes avant de réessayer.",
    ],
    ["Unable to validate email address: invalid format", "Cette adresse email n'est pas valide."],
    [
      "TypeError: fetch failed",
      "Connexion au serveur impossible. Vérifiez votre réseau et réessayez.",
    ],
  ])("traduit %j", (anglais, francais) => {
    expect(traduireErreurAuth(anglais)).toBe(francais);
  });

  it("laisse passer un message qu'il ne connaît pas plutôt que de l'effacer", () => {
    // Un texte anglais imprévu reste plus utile qu'un « une erreur est
    // survenue » : il permet au moins de chercher la cause.
    expect(traduireErreurAuth("Signups not allowed for this instance")).toBe(
      "Signups not allowed for this instance"
    );
  });

  it("reconnaît le message quelle que soit sa casse", () => {
    // Supabase a changé la capitalisation de ses messages par le passé ; la
    // traduction ne doit pas dépendre de ce détail.
    expect(traduireErreurAuth("INVALID LOGIN CREDENTIALS")).toBe(
      "Adresse email ou mot de passe incorrect."
    );
  });
});
