/**
 * Traduction des erreurs d'authentification Supabase.
 *
 * Supabase renvoie ses erreurs en anglais. Les afficher telles quelles laisse
 * une IDEL devant « Invalid login credentials », qu'elle peut ne pas
 * comprendre — et donc conclure que l'application est en panne plutôt que de
 * corriger son mot de passe.
 *
 * Ce module vit à part de `actions.ts` : un fichier « use server » n'autorise
 * que des exports asynchrones, une fonction pure y ferait échouer le build.
 */

const MESSAGES_FR: { motif: RegExp; message: string }[] = [
  {
    motif: /invalid login credentials/i,
    message: "Adresse email ou mot de passe incorrect.",
  },
  {
    motif: /email not confirmed/i,
    message:
      "Votre adresse email n'est pas encore confirmée. Ouvrez le lien reçu par mail, puis reconnectez-vous.",
  },
  {
    motif: /user already registered|already been registered/i,
    message: "Un compte existe déjà avec cette adresse. Connectez-vous plutôt.",
  },
  {
    motif: /password should be at least/i,
    message: "Le mot de passe doit contenir au moins 6 caractères.",
  },
  {
    motif: /rate limit|too many requests/i,
    message: "Trop de tentatives. Patientez quelques minutes avant de réessayer.",
  },
  {
    motif: /unable to validate email|invalid format/i,
    message: "Cette adresse email n'est pas valide.",
  },
  {
    motif: /network|fetch failed/i,
    message: "Connexion au serveur impossible. Vérifiez votre réseau et réessayez.",
  },
];

export function traduireErreurAuth(messageAnglais: string): string {
  const connu = MESSAGES_FR.find((m) => m.motif.test(messageAnglais));
  // Message inconnu : on le laisse passer plutôt que de le remplacer par un
  // texte vague. Mieux vaut une phrase en anglais qu'un « une erreur est
  // survenue » qui n'aide personne à s'en sortir.
  return connu ? connu.message : messageAnglais;
}
