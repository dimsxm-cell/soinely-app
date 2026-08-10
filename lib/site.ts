/**
 * Domaine de production, source unique : tout le reste (sitemap, robots,
 * metadonnees, canonical) en derive plutot que de le recopier.
 */
export const SITE_URL = "https://www.soinely.com";

/**
 * Donnees structurees JSON-LD, injectees telles quelles dans le layout
 * racine. Uniquement des faits verifiables dans le code — jamais de note,
 * d'avis ou de chiffre d'usage fabrique.
 */
export const DONNEES_STRUCTUREES_SITE = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Soinely",
      url: SITE_URL,
      logo: `${SITE_URL}/logo-soinely.png`,
      description: "Le copilote des infirmiers libéraux.",
    },
    {
      "@type": "WebSite",
      name: "Soinely",
      url: SITE_URL,
    },
  ],
};
