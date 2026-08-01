import { journaliserEchec } from "@/lib/journal";

/**
 * Géocodage d'adresses : transformer « 12 rue des Lilas, 75011 Paris » en
 * coordonnées.
 *
 * Passe par l'API Adresse de l'État (adresse.data.gouv.fr) : service public
 * français, gratuit, sans clé, et hébergé en France — ce qui compte quand les
 * adresses envoyées sont celles de patients.
 *
 * Ne couvre que la France et ses départements d'outre-mer, ce qui est
 * exactement le périmètre d'une IDEL conventionnée.
 */

const URL_API_ADRESSE = "https://api-adresse.data.gouv.fr/search/";

/**
 * En deçà de ce score, l'API n'a pas vraiment reconnu l'adresse : elle a
 * proposé ce qu'elle avait de plus proche. Placer un patient à la mauvaise
 * commune fausserait tous ses kilomètres sans que rien ne le signale.
 */
const SCORE_MINIMUM = 0.5;

export interface Coordonnees {
  latitude: number;
  longitude: number;
}

interface ReponseAdresse {
  features?: {
    geometry?: { coordinates?: [number, number] };
    properties?: { score?: number };
  }[];
}

/**
 * Coordonnées d'une adresse, ou `null` si elle n'a pas pu être située.
 *
 * Ne lève jamais : une adresse mal orthographiée, un service indisponible ou
 * un réseau coupé rendent `null`. Le patient reste enregistré, simplement sans
 * position — ses kilomètres ne seront pas comptés tant qu'elle manque.
 */
export async function geocoderAdresse(adresse: string): Promise<Coordonnees | null> {
  const requete = adresse.trim();
  if (requete.length < 5) return null;

  try {
    const url = `${URL_API_ADRESSE}?q=${encodeURIComponent(requete)}&limit=1`;
    const reponse = await fetch(url, {
      // L'adresse d'un patient ne bouge pas : le cache de Next évite de
      // réinterroger le service pour une fiche modifiée deux fois de suite.
      next: { revalidate: 86400 },
    });

    if (!reponse.ok) {
      journaliserEchec("geocoderAdresse", new Error(`HTTP ${reponse.status}`));
      return null;
    }

    const donnees = (await reponse.json()) as ReponseAdresse;
    const premier = donnees.features?.[0];
    const coordonnees = premier?.geometry?.coordinates;

    if (!coordonnees || (premier?.properties?.score ?? 0) < SCORE_MINIMUM) return null;

    // L'API rend [longitude, latitude], dans cet ordre — l'inverse de
    // l'habitude, et l'inversion est silencieuse : elle place le patient
    // quelque part en mer sans qu'aucune erreur ne se déclenche.
    const [longitude, latitude] = coordonnees;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return { latitude, longitude };
  } catch (erreur) {
    journaliserEchec("geocoderAdresse", erreur);
    return null;
  }
}
