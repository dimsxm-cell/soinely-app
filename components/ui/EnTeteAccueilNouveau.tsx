import Link from "next/link";
import Image from "next/image";
import { formatSalutation } from "@/lib/accueil-vue";

interface EnTeteAccueilNouveauProps {
  prenom?: string;
  nomComplet?: string;
  avatarUrl?: string | null;
}

function obtenirInitiales(nomComplet?: string): string {
  if (!nomComplet) return "?";
  const parties = nomComplet.trim().split(/\s+/);
  if (parties.length >= 2) {
    return (parties[0][0] + parties[parties.length - 1][0]).toUpperCase();
  }
  return parties[0].slice(0, 2).toUpperCase();
}

export function EnTeteAccueilNouveau({ prenom, nomComplet, avatarUrl }: EnTeteAccueilNouveauProps) {
  const initiales = obtenirInitiales(nomComplet);

  return (
    <div
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "16px 20px 14px",
      }}
    >
      {/* Salutation + prénom */}
      <div
        style={{
          fontFamily: "var(--font-display, system-ui)",
          fontSize: "26px",
          fontWeight: 600,
          letterSpacing: "-0.8px",
          color: "#231f2e",
        }}
      >
        {formatSalutation()},{" "}
        <span style={{ fontWeight: 700 }}>{prenom ?? "Infirmière"}</span>
      </div>

      {/* Avatar + réglages */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {/* Avatar */}
        <Link href="/compte" aria-label="Mon compte" style={{ flexShrink: 0 }}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL signée courte durée, incompatible avec next/image cache
            <img
              src={avatarUrl}
              alt=""
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "9999px",
                objectFit: "cover",
              }}
            />
          ) : (
            <span
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "9999px",
                background: "linear-gradient(140deg,#a855f7,#6d28d9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-display, system-ui)",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "-0.2px",
                color: "#fff",
              }}
            >
              {initiales}
            </span>
          )}
        </Link>

        {/* Bouton réglages */}
        <Link
          href="/compte"
          aria-label="Réglages"
          className="transition-transform active:scale-90 hover:opacity-70"
          style={{
            width: "44px",
            height: "44px",
            marginRight: "-6px",
            borderRadius: "9999px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ stroke: "#5a5468", fill: "none" }}
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3.2" />
            <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
