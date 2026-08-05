/**
 * Lien de navigation Waze vers un patient.
 *
 * Format de lien universel vérifié auprès de la documentation développeur
 * Waze : fonctionne comme un `<a href>` simple sans SDK, et Waze gère
 * lui-même le repli vers sa version web si l'app n'est pas installée.
 */

export interface DestinationWaze {
  latitude: number | null;
  longitude: number | null;
  adresse: string;
}

const BASE_URL_WAZE = "https://waze.com/ul";

export function hrefWaze(destination: DestinationWaze): string {
  const params = new URLSearchParams({ navigate: "yes" });

  if (destination.latitude !== null && destination.longitude !== null) {
    params.set("ll", `${destination.latitude},${destination.longitude}`);
  } else {
    params.set("q", destination.adresse);
  }

  return `${BASE_URL_WAZE}?${params.toString()}`;
}
