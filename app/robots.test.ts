import { describe, expect, it } from "vitest";
import robots from "./robots";

interface ReglesRobots {
  userAgent: string;
  allow: string;
  disallow: string[];
}

describe("robots", () => {
  it("autorise le crawl general et pointe vers le sitemap", () => {
    const result = robots();
    const rules = result.rules as ReglesRobots;
    expect(rules.userAgent).toBe("*");
    expect(rules.allow).toBe("/");
    expect(result.sitemap).toBe("https://soinely.app/sitemap.xml");
  });

  it("interdit les routes non publiques", () => {
    const result = robots();
    const rules = result.rules as ReglesRobots;
    expect(rules.disallow).toEqual([
      "/api/",
      "/auth/",
      "/login",
      "/reinitialiser-mot-de-passe",
      "/tableau-de-bord",
      "/compte",
      "/ely",
      "/ma-journee",
      "/ma-tournee",
      "/patients",
      "/recherche",
      "/situations",
    ]);
  });

  it("n'interdit pas /abonnement (seul le sitemap l'exclut, pas le crawl)", () => {
    const result = robots();
    const rules = result.rules as ReglesRobots;
    expect(rules.disallow).not.toContain("/abonnement");
  });
});
