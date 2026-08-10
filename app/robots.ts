import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
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
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
