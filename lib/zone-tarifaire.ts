/**
 * Zone tarifaire NGAP, déduite du code postal du cabinet.
 *
 * Les tarifs des DOM sont supérieurs à ceux de la métropole : l'AMI y vaut
 * 3,30 € contre 3,15 €. L'écart est faible à l'acte, permanent sur l'année,
 * et parfaitement invisible pour qui ne le cherche pas.
 */

export type ZoneTarifaire = "metropole" | "dom";

/**
 * Départements d'outre-mer relevant des tarifs majorés, par les trois
 * premiers chiffres de leur code postal.
 *
 * Saint-Martin (97150) et Saint-Barthélemy (97133) tombent sous le préfixe
 * 971 et suivent donc la Guadeloupe : c'est bien la caisse guadeloupéenne qui
 * les couvre, la grille y est la même.
 *
 * Saint-Pierre-et-Miquelon (975) est en revanche absent de cette liste, sa
 * caisse de prévoyance sociale étant distincte. Faute de certitude sur sa
 * grille, la métropole s'y applique — un défaut connu vaut mieux qu'un tarif
 * inventé.
 */
const PREFIXES_DOM = ["971", "972", "973", "974", "976"];

/**
 * Zone d'un code postal. La métropole est le défaut : c'est le cas de la
 * grande majorité des IDEL, et c'est la valeur qui s'applique tant qu'aucun
 * code postal n'est renseigné.
 */
export function determinerZone(codePostal: string | null | undefined): ZoneTarifaire {
  if (!codePostal) return "metropole";

  // Une saisie peut contenir des espaces ; seuls les chiffres nous intéressent.
  const chiffres = codePostal.replace(/\D/g, "");
  if (chiffres.length < 3) return "metropole";

  return PREFIXES_DOM.includes(chiffres.slice(0, 3)) ? "dom" : "metropole";
}

/** Valeur d'une lettre-clé dans les deux zones, telle que la base la porte. */
export interface ValeurLettreCle {
  lettreCle: string;
  valeurMetropole: number;
  valeurDom: number;
}

/** Table des valeurs par lettre-clé, prête à l'emploi pour une zone donnée. */
export type ValeursLettresCles = Map<string, ValeurLettreCle>;

/**
 * Tarif d'un acte : valeur de sa lettre-clé dans la zone, multipliée par son
 * coefficient.
 *
 * Calculer plutôt que lire un montant figé évite deux dérives : l'arrondi au
 * centime que traîne un tarif stocké (AMI 1,5 vaut 4,725 € et non 4,73 €), et
 * l'oubli d'une ligne lors d'une revalorisation.
 *
 * Les forfaits journaliers n'ont pas de coefficient : leur tarif est la valeur
 * de la lettre-clé elle-même, d'où le coefficient 1 par défaut.
 *
 * Renvoie `null` si la lettre-clé est inconnue de la table — mieux vaut ne
 * rien compter qu'inventer un montant.
 */
export function calculerTarifActe(
  lettreCle: string | null,
  coefficient: number | null,
  zone: ZoneTarifaire,
  valeurs: ValeursLettresCles
): number | null {
  if (!lettreCle) return null;

  const valeur = valeurs.get(lettreCle);
  if (!valeur) return null;

  const base = zone === "dom" ? valeur.valeurDom : valeur.valeurMetropole;
  return base * (coefficient ?? 1);
}
