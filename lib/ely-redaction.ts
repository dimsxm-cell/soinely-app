/**
 * Filtre les noms des patients de la tournée du jour avant tout envoi au
 * LLM. Liste fermée (les patients connus de l'infirmière ce jour-là), pas
 * détection générique de noms propres — plus fiable sur une donnée de
 * santé qu'une reconnaissance de noms ouverte, forcément imparfaite.
 */
function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function filtrerNomsPatients(question: string, nomsPatients: string[]): string {
  const tokens = new Set(
    nomsPatients
      .flatMap((nom) => nom.split(/\s+/))
      .map(normaliser)
      .filter((token) => token.length >= 2)
  );

  if (tokens.size === 0) return question;

  return question.replace(/\p{L}+/gu, (mot) => (tokens.has(normaliser(mot)) ? "[patient]" : mot));
}
