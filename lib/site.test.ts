import { describe, expect, it } from "vitest";
import { SITE_URL, DONNEES_STRUCTUREES_SITE } from "./site";

describe("SITE_URL", () => {
  it("pointe vers le domaine de production, sans slash final", () => {
    expect(SITE_URL).toBe("https://www.soinely.com");
  });
});

describe("DONNEES_STRUCTUREES_SITE", () => {
  it("decrit l'organisation et le site, sans donnee fabriquee", () => {
    const graph = DONNEES_STRUCTUREES_SITE["@graph"];
    expect(graph).toHaveLength(2);

    const organisation = graph.find((n) => n["@type"] === "Organization");
    expect(organisation).toMatchObject({
      name: "Soinely",
      url: "https://www.soinely.com",
      logo: "https://www.soinely.com/logo-soinely.png",
      description: "Le copilote des infirmiers libéraux.",
    });
    expect(organisation).not.toHaveProperty("aggregateRating");
    expect(organisation).not.toHaveProperty("review");

    const site = graph.find((n) => n["@type"] === "WebSite");
    expect(site).toMatchObject({
      name: "Soinely",
      url: "https://www.soinely.com",
    });
  });
});
