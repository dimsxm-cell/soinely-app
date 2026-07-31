// Journal des échecs de lecture. Sans ce module, une erreur Supabase avalée
// par un `return []` est indiscernable d'une absence de données : c'est ce qui
// a coûté une session de diagnostic le 31 juillet 2026.
const PREFIXE = "[soinely]";

export function journaliserEchec(contexte: string, erreur: unknown): void {
  console.error(PREFIXE, contexte, erreur);
}

// Pour les lectures dont un vide serait trompeur à l'écran : journalise puis
// lève, afin que la frontière d'erreur de l'espace connecté prenne le relais.
// Le type de retour `never` indique au compilateur que rien ne suit.
export function echouer(contexte: string, erreur: unknown): never {
  journaliserEchec(contexte, erreur);
  throw new Error(`Lecture impossible : ${contexte}`, { cause: erreur });
}
