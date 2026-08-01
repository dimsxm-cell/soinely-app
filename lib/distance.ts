import type { Coordonnees } from "@/lib/geocodage";
import { journaliserEchec } from "@/lib/journal";

/**
 * Distance routière entre deux points.
 *
 * Deux sources, dans cet ordre : un routeur qui suit les routes réelles, et à
 * défaut un calcul local. Le second est moins juste mais ne dépend de rien —
 * une tournée ne doit pas perdre ses kilomètres parce qu'un service tiers est
 * en panne.
 */

const URL_ROUTAGE = "https://api.openrouteservice.org/v2/directions/driving-car";

/** Rayon moyen de la Terre, en kilomètres. */
const RAYON_TERRE_KM = 6371;

/**
 * Rapport moyen entre la route et la ligne droite.
 *
 * Une route ne va jamais tout droit : elle contourne, tourne et remonte. Ce
 * coefficient rapproche l'estimation locale de la distance réelle ; il reste
 * une moyenne, d'où la correction manuelle laissée à l'IDEL.
 */
const COEFFICIENT_SINUOSITE = 1.3;

function enRadians(degres: number): number {
  return (degres * Math.PI) / 180;
}

/**
 * Distance à vol d'oiseau, formule de haversine.
 *
 * Aucun appel réseau : c'est le repli quand le routeur ne répond pas, et la
 * base de l'estimation locale.
 */
export function distanceVolOiseauKm(depart: Coordonnees, arrivee: Coordonnees): number {
  const dLat = enRadians(arrivee.latitude - depart.latitude);
  const dLon = enRadians(arrivee.longitude - depart.longitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(enRadians(depart.latitude)) *
      Math.cos(enRadians(arrivee.latitude)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return arrondirCentaines(RAYON_TERRE_KM * c);
}

/** Estimation locale de la distance par la route, sans aucun appel réseau. */
export function estimerDistanceRoutiereKm(depart: Coordonnees, arrivee: Coordonnees): number {
  return arrondirCentaines(distanceVolOiseauKm(depart, arrivee) * COEFFICIENT_SINUOSITE);
}

interface ReponseRoutage {
  routes?: { summary?: { distance?: number } }[];
}

/**
 * Distance par la route, en kilomètres.
 *
 * Interroge OpenRouteService si une clé est configurée, et se rabat sinon sur
 * l'estimation locale. Ne lève jamais : sans clé, sans réseau ou sur refus du
 * service, l'IDEL obtient une distance approchée plutôt qu'aucune.
 */
export async function calculerDistanceRoutiereKm(
  depart: Coordonnees,
  arrivee: Coordonnees
): Promise<number> {
  const cle = process.env.OPENROUTESERVICE_API_KEY;
  if (!cle) return estimerDistanceRoutiereKm(depart, arrivee);

  try {
    const reponse = await fetch(URL_ROUTAGE, {
      method: "POST",
      headers: {
        Authorization: cle,
        "Content-Type": "application/json",
      },
      // Le service attend [longitude, latitude], comme l'API Adresse.
      body: JSON.stringify({
        coordinates: [
          [depart.longitude, depart.latitude],
          [arrivee.longitude, arrivee.latitude],
        ],
      }),
    });

    if (!reponse.ok) {
      journaliserEchec("calculerDistanceRoutiereKm", new Error(`HTTP ${reponse.status}`));
      return estimerDistanceRoutiereKm(depart, arrivee);
    }

    const donnees = (await reponse.json()) as ReponseRoutage;
    const metres = donnees.routes?.[0]?.summary?.distance;

    if (typeof metres !== "number" || !Number.isFinite(metres)) {
      return estimerDistanceRoutiereKm(depart, arrivee);
    }

    return arrondirCentaines(metres / 1000);
  } catch (erreur) {
    journaliserEchec("calculerDistanceRoutiereKm", erreur);
    return estimerDistanceRoutiereKm(depart, arrivee);
  }
}

function arrondirCentaines(valeur: number): number {
  return Math.round(valeur * 100) / 100;
}
