"use client";

import Link from "next/link";
import type { MissionDuJour } from "@/lib/types/clinical";
import { prochaineActionAccueil } from "@/lib/accueil-vue";

interface ActionsRapidesAccueilProps {
  missions: MissionDuJour[];
  tourneeId: string;
}

function IconePlay() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "#6d28d9", fill: "none" }} aria-hidden="true">
      <path d="M7 4.8v14.4a1 1 0 0 0 1.5.9l11.2-7.2a1 1 0 0 0 0-1.8L8.5 3.9A1 1 0 0 0 7 4.8Z" />
    </svg>
  );
}
function IconeNav() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "#6d28d9", fill: "none" }} aria-hidden="true">
      <path d="m3 11 19-8-8 19-2.5-8.5L3 11Z" />
    </svg>
  );
}
function IconeBox() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "#6d28d9", fill: "none" }} aria-hidden="true">
      <path d="M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16zM3.5 8 12 12.5 20.5 8M12 12.5V20.5" />
    </svg>
  );
}
function IconeMore() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "#6d28d9", fill: "none" }} aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

interface Action {
  label: string;
  icon: React.ReactNode;
  href: string;
}

export function ActionsRapidesAccueil({ missions, tourneeId }: ActionsRapidesAccueilProps) {
  const prochaine = prochaineActionAccueil(missions);

  const actions: Action[] = [
    {
      label: "Démarrer",
      icon: <IconePlay />,
      href: prochaine ? `/ma-journee/${prochaine.missionId}` : "/ma-journee",
    },
    {
      label: "Itinéraire",
      icon: <IconeNav />,
      href: `/ma-tournee`,
    },
    {
      label: "Matériel",
      icon: <IconeBox />,
      href: `/ma-tournee`,
    },
    {
      label: "Plus",
      icon: <IconeMore />,
      href: `/ma-journee`,
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: "8px",
        background: "#efeafc",
        borderRadius: "24px",
        padding: "15px 10px",
        marginTop: "12px",
      }}
    >
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className="flex flex-col items-center gap-2 transition-transform active:scale-95 hover:brightness-105"
          style={{ fontFamily: "inherit", textDecoration: "none" }}
        >
          <span
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "9999px",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 14px -8px rgba(60,30,110,.5)",
            }}
          >
            {action.icon}
          </span>
          <span
            style={{
              fontSize: "11.5px",
              fontWeight: 600,
              letterSpacing: "-0.2px",
              color: "#3b3648",
              textAlign: "center",
              lineHeight: 1.25,
            }}
          >
            {action.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
