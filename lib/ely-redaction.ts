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

/**
 * Ramène les variantes typographiques d'apostrophes (’ ‘ ʼ) et de tirets
 * (– en-dash, — em-dash) vers leurs équivalents ASCII (' et -), pour que le
 * découpage des noms et le scan de la question les reconnaissent comme
 * séparateurs (ex. l'apostrophe courbe que produit la correction
 * automatique iOS). Le texte renvoyé par filtrerNomsPatients n'est jamais
 * affiché à l'infirmière (seulement envoyé au LLM), donc normaliser sa
 * ponctuation ne pose aucun problème — voir le commentaire en tête de
 * fichier sur cette garantie.
 */
function normaliserPonctuation(texte: string): string {
  return texte.replace(/[‘’ʼ]/g, "'").replace(/[–—]/g, "-");
}

export function filtrerNomsPatients(question: string, nomsPatients: string[]): string {
  const tokens = new Set(
    nomsPatients
      .map(normaliserPonctuation)
      .flatMap((nom) => nom.split(/[\s\-']+/))
      .map(normaliser)
      .filter((token) => token.length >= 2)
  );

  if (tokens.size === 0) return question;

  const questionNormalisee = normaliserPonctuation(question);

  return questionNormalisee.replace(/[\p{L}\-']+/gu, (mot) => {
    const parties = mot.split(/[\-']+/)
      .map(normaliser)
      .filter((p) => p.length >= 2);

    // .some() plutôt que .every() : dès qu'UNE partie d'un mot composé
    // correspond à un nom connu (ex. "Dupont-Legrand", nom d'usage/marital
    // pour la patiente "Jean Dupont"), tout le mot est redacté. Sur-redacter
    // un mot qui n'est pas vraiment un nom est sans risque ; sous-redacter
    // et laisser passer un vrai nom de famille est le danger réel.
    if (parties.length > 0 && parties.some((p) => tokens.has(p))) {
      return "[patient]";
    }
    return mot;
  });
}
