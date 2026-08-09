import { useId } from "react";

const TEXTE =
  "SOINELY · NE TOURNEZ JAMAIS SEUL · SOINELY · LE COPILOTE DES IDEL · " +
  "SOINELY · NE TOURNEZ JAMAIS SEUL · SOINELY · LE COPILOTE DES IDEL · " +
  "SOINELY · NE TOURNEZ JAMAIS SEUL · SOINELY · LE COPILOTE DES IDEL · ";

/**
 * Ruban en forme de lemniscate (infini), texte animé en filigrane très
 * discret dans le coin des en-têtes violets. Décoration pure, aria-hidden.
 * `useId` évite un id SVG dupliqué si jamais deux en-têtes se retrouvaient
 * montés en même temps.
 */
export function RubanLemniscateHero() {
  const lemniId = `lemni-${useId()}`;

  return (
    <svg
      viewBox="0 0 280 200"
      aria-hidden="true"
      className="pointer-events-none absolute -right-6 top-2 h-[178px] w-[223px] overflow-visible"
    >
      <path
        id={lemniId}
        d="M40,100 C40,52 92,52 140,100 C188,148 240,148 240,100 C240,52 188,52 140,100 C92,148 40,148 40,100 Z"
        fill="none"
        stroke="rgba(255,255,255,.07)"
        strokeWidth="16"
      />
      <text className="font-display text-[11.5px] font-bold tracking-[.26em] fill-[rgba(255,255,255,.17)]" dominantBaseline="central">
        <textPath href={`#${lemniId}`} startOffset="0">
          {TEXTE}
          <animate attributeName="startOffset" from="0" to="-670.99" dur="22.6s" calcMode="linear" repeatCount="indefinite" />
        </textPath>
      </text>
    </svg>
  );
}
