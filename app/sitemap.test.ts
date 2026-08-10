import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";

describe("sitemap", () => {
  it("liste exactement les 3 pages publiques indexables", () => {
    const entries = sitemap();
    expect(entries).toHaveLength(3);

    const urls = entries.map((e) => e.url);
    expect(urls).toEqual([
      "https://soinely.app",
      "https://soinely.app/conditions",
      "https://soinely.app/confidentialite",
    ]);
  });

  it("n'inclut jamais /abonnement ni une route authentifiee", () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => u.includes("/abonnement"))).toBe(false);
    expect(urls.some((u) => u.includes("/login"))).toBe(false);
    expect(urls.some((u) => u.includes("/tableau-de-bord"))).toBe(false);
  });

  it("donne la priorite la plus haute a la page d'accueil", () => {
    const entries = sitemap();
    const home = entries.find((e) => e.url === "https://soinely.app");
    expect(home?.priority).toBe(1);
  });
});
