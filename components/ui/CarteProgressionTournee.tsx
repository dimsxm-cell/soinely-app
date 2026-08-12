import type { MissionDuJour } from "@/lib/types/clinical";
import { compterMissionsAccueil, formatDateDuJour } from "@/lib/accueil-vue";

interface CarteProgressionTourneeProps {
  missions: MissionDuJour[];
}

export function CarteProgressionTournee({ missions }: CarteProgressionTourneeProps) {
  const { visites, faites, restantes } = compterMissionsAccueil(missions);
  const pct = visites > 0 ? Math.round((faites / visites) * 100) : 0;
  const dateLabel = formatDateDuJour();

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "24px",
        background: "linear-gradient(135deg,#7c3aed 0%,#8b5cf6 46%,#a855f7 100%)",
        color: "#fff",
        padding: "18px 18px 20px",
        boxShadow: "0 18px 34px -18px rgba(109,40,217,.85)",
      }}
    >
      {/* Orbes décoratives */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: "-40px",
          bottom: "-70px",
          width: "220px",
          height: "220px",
          borderRadius: "9999px",
          background: "rgba(255,255,255,.09)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: "-90px",
          top: "-60px",
          width: "190px",
          height: "190px",
          borderRadius: "9999px",
          background: "rgba(255,255,255,.07)",
          pointerEvents: "none",
        }}
      />

      {/* En-tête : label tournée + date */}
      <div className="relative flex items-center justify-between gap-3">
        <span className="text-[12.5px] font-semibold text-white/78">Votre tournée</span>
        <span className="text-[12.5px] font-semibold text-white/78">{dateLabel}</span>
      </div>

      {/* Compteur restant + badge faites */}
      <div className="relative mt-4 flex items-flex-end justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold text-white/85">Reste à faire</p>
          <p
            className="mt-1 font-display leading-none tracking-tight"
            style={{ fontSize: "38px", fontWeight: 700, letterSpacing: "-1.6px", lineHeight: 1.05 }}
          >
            {restantes > 0 ? `${restantes} visite${restantes > 1 ? "s" : ""}` : "Tout est fait"}
          </p>
        </div>
        {faites > 0 && (
          <div
            className="mb-1 flex shrink-0 items-center gap-1.5 self-end"
            style={{
              background: "#3ddc97",
              color: "#0d3f2b",
              borderRadius: "9999px",
              padding: "5px 11px",
              fontSize: "12.5px",
              fontWeight: 700,
              letterSpacing: "-0.2px",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true" style={{ fill: "#0d3f2b" }}>
              <path d="M12 5.5 20 17H4z" />
            </svg>
            {faites} faite{faites > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Barre de progression */}
      <div
        className="relative mt-4 overflow-hidden"
        style={{ height: "6px", borderRadius: "9999px", background: "rgba(255,255,255,.22)" }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${pct}% de la tournée effectuée`}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: "9999px",
            background: "#fff",
            transition: "width .4s cubic-bezier(.22,1,.36,1)",
          }}
        />
      </div>
    </div>
  );
}
