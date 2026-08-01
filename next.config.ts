import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Autorise le serveur de développement à répondre au téléphone connecté au
  // même réseau. Next bloque par défaut ses ressources de développement à
  // toute origine autre que localhost, ce qui laisse l'application coincée
  // sur l'écran de connexion quand on l'ouvre depuis un mobile.
  //
  // Sans effet en production : cette protection n'existe qu'en développement.
  // La plage locale entière est couverte, l'adresse attribuée par la box
  // pouvant changer d'un jour à l'autre.
  allowedDevOrigins: ["192.168.1.15", "192.168.1.*"],
};

export default nextConfig;
