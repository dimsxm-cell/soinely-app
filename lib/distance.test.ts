import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calculerDistanceRoutiereKm,
  distanceVolOiseauKm,
  estimerDistanceRoutiereKm,
} from "./distance";

// Points de repère connus, pour vérifier l'ordre latitude/longitude autant
// que la formule : l'inverser place les points en mer sans rien signaler.
const PARIS = { latitude: 48.8566, longitude: 2.3522 };
const VERSAILLES = { latitude: 48.8014, longitude: 2.1301 };
const POINTE_A_PITRE = { latitude: 16.2415, longitude: -61.5343 };
const BASSE_TERRE = { latitude: 15.9985, longitude: -61.7256 };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("distanceVolOiseauKm", () => {
  it("mesure une distance connue en métropole", () => {
    // Paris–Versailles : 17,4 km à vol d'oiseau, vérifié au calcul manuel.
    expect(distanceVolOiseauKm(PARIS, VERSAILLES)).toBeCloseTo(17.4, 1);
  });

  it("mesure une distance connue en Guadeloupe", () => {
    // Pointe-à-Pitre–Basse-Terre : 33,9 km. Une longitude négative et une
    // latitude tropicale ne doivent pas dérouter le calcul.
    expect(distanceVolOiseauKm(POINTE_A_PITRE, BASSE_TERRE)).toBeCloseTo(33.9, 1);
  });

  it("rend zéro entre un point et lui-même", () => {
    expect(distanceVolOiseauKm(PARIS, PARIS)).toBe(0);
  });

  it("donne le même résultat dans les deux sens", () => {
    expect(distanceVolOiseauKm(PARIS, VERSAILLES)).toBe(distanceVolOiseauKm(VERSAILLES, PARIS));
  });
});

describe("estimerDistanceRoutiereKm", () => {
  it("majore la ligne droite du détour qu'impose la route", () => {
    const droite = distanceVolOiseauKm(PARIS, VERSAILLES);
    const route = estimerDistanceRoutiereKm(PARIS, VERSAILLES);

    expect(route).toBeGreaterThan(droite);
    expect(route).toBeCloseTo(droite * 1.3, 1);
  });
});

describe("calculerDistanceRoutiereKm", () => {
  it("se rabat sur l'estimation locale sans clé configurée", async () => {
    vi.stubEnv("OPENROUTESERVICE_API_KEY", "");
    const appelReseau = vi.spyOn(globalThis, "fetch");

    const distance = await calculerDistanceRoutiereKm(PARIS, VERSAILLES);

    expect(appelReseau).not.toHaveBeenCalled();
    expect(distance).toBe(estimerDistanceRoutiereKm(PARIS, VERSAILLES));
  });

  it("retient la distance du routeur quand il répond", async () => {
    vi.stubEnv("OPENROUTESERVICE_API_KEY", "cle-de-test");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ routes: [{ summary: { distance: 21450 } }] }), { status: 200 })
    );

    // 21 450 mètres, soit 21,45 km — plus que la ligne droite, comme attendu
    // d'un trajet réel.
    expect(await calculerDistanceRoutiereKm(PARIS, VERSAILLES)).toBe(21.45);
  });

  it("envoie les coordonnées dans l'ordre longitude-latitude que le service attend", async () => {
    vi.stubEnv("OPENROUTESERVICE_API_KEY", "cle-de-test");
    const appelReseau = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ routes: [{ summary: { distance: 1000 } }] }), { status: 200 })
    );

    await calculerDistanceRoutiereKm(PARIS, VERSAILLES);

    const corps = JSON.parse(String(appelReseau.mock.calls[0][1]?.body));
    expect(corps.coordinates).toEqual([
      [2.3522, 48.8566],
      [2.1301, 48.8014],
    ]);
  });

  it("se rabat sur l'estimation locale quand le service refuse", async () => {
    vi.stubEnv("OPENROUTESERVICE_API_KEY", "cle-de-test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 403 }));

    // Quota dépassé ou clé invalide : la tournée garde ses kilomètres.
    expect(await calculerDistanceRoutiereKm(PARIS, VERSAILLES)).toBe(
      estimerDistanceRoutiereKm(PARIS, VERSAILLES)
    );
  });

  it("se rabat sur l'estimation locale quand le réseau est coupé", async () => {
    vi.stubEnv("OPENROUTESERVICE_API_KEY", "cle-de-test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("fetch failed"));

    expect(await calculerDistanceRoutiereKm(PARIS, VERSAILLES)).toBe(
      estimerDistanceRoutiereKm(PARIS, VERSAILLES)
    );
  });

  it("se rabat sur l'estimation locale devant une réponse inexploitable", async () => {
    vi.stubEnv("OPENROUTESERVICE_API_KEY", "cle-de-test");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ routes: [] }), { status: 200 })
    );

    expect(await calculerDistanceRoutiereKm(PARIS, VERSAILLES)).toBe(
      estimerDistanceRoutiereKm(PARIS, VERSAILLES)
    );
  });
});
