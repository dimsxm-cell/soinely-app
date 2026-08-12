import Link from "next/link";
import type { MissionDuJour } from "@/lib/types/clinical";
import type { MaterielItem } from "@/lib/data/materiel";

interface LiensRapidesAccueilProps {
  missions: MissionDuJour[];
  materiel: MaterielItem[];
}

function IconeBox() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "#6d28d9", fill: "none" }} aria-hidden="true">
      <path d="M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16zM3.5 8 12 12.5 20.5 8M12 12.5V20.5" />
    </svg>
  );
}
function IconePatients() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "#6d28d9", fill: "none" }} aria-hidden="true">
      <path d="M16 20v-1.6a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20M9 10.4a3.7 3.7 0 1 0 0-7.4 3.7 3.7 0 0 0 0 7.4ZM22 20v-1.6a4 4 0 0 0-3-3.8" />
    </svg>
  );
}
function IconeBook() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "#6d28d9", fill: "none" }} aria-hidden="true">
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v15H5.5A1.5 1.5 0 0 0 4 19.5zM4 19.5A1.5 1.5 0 0 0 5.5 21H19v-3" />
    </svg>
  );
}

interface Lien {
  label: string;
  hint: string;
  icon: React.ReactNode;
  href: string;
}

export function LiensRapidesAccueil({ missions, materiel }: LiensRapidesAccueilProps) {
  const nbPatients = new Set(missions.map((m) => m.patientNom)).size;
  const nbArticles = materiel.length;

  const liens: Lien[] = [
    {
      label: "Matériel du jour",
      icon: <IconeBox />,
      hint: `${nbArticles} article${nbArticles !== 1 ? "s" : ""}`,
      href: "/ma-tournee",
    },
    {
      label: "Mes patients",
      icon: <IconePatients />,
      hint: String(nbPatients),
      href: "/patients",
    },
    {
      label: "Ressources",
      icon: <IconeBook />,
      hint: "",
      href: "/situations/dossier",
    },
  ];

  return (
    <div style={{ borderRadius: "20px", background: "#fff", overflow: "hidden", marginTop: "12px" }}>
      {liens.map((lien, i) => {
        const isLast = i === liens.length - 1;
        return (
          <Link
            key={lien.label}
            href={lien.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              width: "100%",
              boxSizing: "border-box",
              borderBottom: isLast ? "0" : "1px solid #f1eef7",
              padding: "14px 15px",
              textDecoration: "none",
              fontFamily: "inherit",
            }}
            className="hover:bg-[rgba(109,40,217,.04)] active:scale-[0.99] transition-colors"
          >
            {/* Icône */}
            <span
              style={{
                width: "36px",
                height: "36px",
                flexShrink: 0,
                borderRadius: "9999px",
                background: "#f3edfd",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {lien.icon}
            </span>

            {/* Label */}
            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: "14.5px",
                fontWeight: 600,
                letterSpacing: "-0.3px",
                color: "#231f2e",
              }}
            >
              {lien.label}
            </span>

            {/* Hint */}
            {lien.hint && (
              <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#a099b3", flexShrink: 0 }}>
                {lien.hint}
              </span>
            )}

            {/* Chevron */}
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ stroke: "#c6c1d1", fill: "none", flexShrink: 0 }}
              aria-hidden="true"
            >
              <path d="m9 6 6 6-6 6" />
            </svg>
          </Link>
        );
      })}
    </div>
  );
}
