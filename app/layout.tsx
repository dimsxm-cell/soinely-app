import type { Metadata } from "next";
import { Fraunces, Geist_Mono, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ActiverAppuiTactile } from "@/components/layout/ActiverAppuiTactile";
import { SITE_URL, DONNEES_STRUCTUREES_SITE } from "@/lib/site";
import "./globals.css";

// Trois polices, chargées une seule fois pour toute l'application : le corps
// de texte (Inter), les titres (Fraunces) et les chiffres à chasse fixe
// (Geist Mono, utilisé par le sélecteur de date et les échelles imprimées).
// Elles sont servies par Next depuis notre domaine : le rendu est donc
// identique sur tous les appareils, contrairement aux polices système.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Police variable : une seule requête couvre toutes les graisses utilisées
// dans l'app (de medium à extrabold).
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Soinely",
  description: "Le copilote des infirmiers libéraux",
  openGraph: {
    title: "Soinely",
    description: "Le copilote des infirmiers libéraux",
    url: SITE_URL,
    siteName: "Soinely",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${fraunces.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Contenu 100% statique (aucune donnee dynamique ni saisie
            utilisateur) : JSON.stringify ici ne pose pas de risque
            d'injection, contrairement a une interpolation de chaine. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(DONNEES_STRUCTUREES_SITE) }}
        />
        <ActiverAppuiTactile />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
