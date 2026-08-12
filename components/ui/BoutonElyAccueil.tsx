import Link from "next/link";
import type { MissionDuJour } from "@/lib/types/clinical";
import { conseilEly, prochaineActionAccueil } from "@/lib/accueil-vue";

interface BoutonElyAccueilProps {
  missions: MissionDuJour[];
}

export function BoutonElyAccueil({ missions }: BoutonElyAccueilProps) {
  const actionRapide = prochaineActionAccueil(missions);
  const conseil = conseilEly(missions);
  const tip = actionRapide
    ? `Prochaine visite : ${conseil}`
    : "Tournée bouclée, transmissions à jour";

  return (
    <Link
      href="/ely"
      className="transition-transform active:scale-[0.98] hover:brightness-105"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        width: "100%",
        boxSizing: "border-box",
        borderRadius: "20px",
        background: "linear-gradient(135deg,#6d28d9 0%,#8b5cf6 100%)",
        padding: "14px 15px",
        marginTop: "12px",
        textDecoration: "none",
        textAlign: "left",
        boxShadow: "0 14px 26px -18px rgba(109,40,217,.9)",
      }}
    >
      <span
        style={{
          width: "40px",
          height: "40px",
          flexShrink: 0,
          borderRadius: "9999px",
          background: "rgba(255,255,255,.16)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ stroke: "#fff", fill: "none" }}
          aria-hidden="true"
        >
          <path d="M21 11.5a8 8 0 0 1-8 8H5l-1.5 3 .5-4.6A8 8 0 1 1 21 11.5Z" />
        </svg>
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontSize: "14.5px",
            fontWeight: 700,
            letterSpacing: "-0.3px",
            color: "#fff",
          }}
        >
          Demandez à Ely
        </span>
        <span
          style={{
            display: "block",
            fontSize: "12px",
            lineHeight: 1.4,
            color: "rgba(255,255,255,.78)",
            marginTop: "2px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {conseil}
        </span>
      </span>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ stroke: "rgba(255,255,255,.85)", fill: "none", flexShrink: 0 }}
        aria-hidden="true"
      >
        <path d="m9 6 6 6-6 6" />
      </svg>
    </Link>
  );
}
