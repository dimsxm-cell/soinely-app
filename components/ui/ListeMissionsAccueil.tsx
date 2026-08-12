import Link from "next/link";
import type { MissionDuJour } from "@/lib/types/clinical";
import { formaterNomPropre } from "@/lib/format";
import { IconeSoin } from "@/components/ui/IconeSoin";

interface ListeMissionsAccueilProps {
  missions: MissionDuJour[];
  /** Href de la mission en cours (pour ouvrir au contexte clinique) */
  contexteHref?: { missionId: string; href: string } | null;
}

const STATUT_DOT: Record<MissionDuJour["statut"], string> = {
  a_faire: "rgba(168,85,247,.7)",
  en_cours: "#6d28d9",
  terminee: "#3ddc97",
  absent: "#c2410c",
};

export function ListeMissionsAccueil({ missions, contexteHref }: ListeMissionsAccueilProps) {
  if (missions.length === 0) {
    return (
      <p className="mt-6 text-center text-sm text-navy/50">
        Aucune mission prévue pour aujourd&apos;hui.
      </p>
    );
  }

  return (
    <div style={{ borderRadius: "20px", background: "#fff", overflow: "hidden" }}>
      {missions.map((mission, i) => {
        const terminee = mission.statut === "terminee" || mission.statut === "absent";
        const enCours = mission.statut === "en_cours";
        const heureAffichee = mission.heurePrevue.slice(0, 5);
        const isLast = i === missions.length - 1;
        const href = contexteHref?.missionId === mission.id ? contexteHref.href : `/ma-journee/${mission.id}`;

        return (
          <Link
            key={mission.id}
            href={href}
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
              transition: "background .15s ease",
              background: enCours ? "rgba(109,40,217,.035)" : "transparent",
            }}
            className="hover:bg-[rgba(109,40,217,.04)] active:scale-[0.99]"
          >
            {/* Icône soin */}
            <span
              style={{
                width: "38px",
                height: "38px",
                flexShrink: 0,
                borderRadius: "9999px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: terminee ? "#f2f0f5" : "rgba(168,85,247,.13)",
                color: terminee ? "#b3aebd" : "#6d28d9",
              }}
            >
              <IconeSoin typeSoin={mission.typeSoin} className="h-[18px] w-[18px]" />
            </span>

            {/* Nom + type/adresse */}
            <span style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  display: "block",
                  fontSize: "14.5px",
                  fontWeight: 600,
                  letterSpacing: "-0.3px",
                  color: terminee ? "#a9a4b3" : "#231f2e",
                  textDecoration: terminee ? "line-through" : "none",
                }}
              >
                {formaterNomPropre(mission.patientNom)}
              </span>
              <span
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "#8d8798",
                  marginTop: "2px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {mission.typeSoin}
              </span>
            </span>

            {/* Heure */}
            <span
              style={{
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "-0.2px",
                fontVariantNumeric: "tabular-nums",
                flexShrink: 0,
                color: terminee ? "#b3aebd" : "#5a5468",
              }}
            >
              {heureAffichee}
            </span>

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
