"use client";

import Link from "next/link";
import { type MouseEvent, type ReactNode } from "react";

function declencherRipple(event: MouseEvent<HTMLElement>) {
  const cible = event.currentTarget;
  const rect = cible.getBoundingClientRect();
  const taille = Math.max(rect.width, rect.height) * 2;
  const point = document.createElement("span");
  point.className = "ripple-dot";
  point.style.width = point.style.height = `${taille}px`;
  point.style.left = `${event.clientX - rect.left - taille / 2}px`;
  point.style.top = `${event.clientY - rect.top - taille / 2}px`;
  cible.appendChild(point);
  setTimeout(() => point.remove(), 620);
}

const TEINTE: Record<"primaire" | "fantome", string> = {
  primaire: "bg-gradient-to-br from-brand-violet/85 to-purple-400/85",
  fantome: "bg-brand-violet/[0.14]",
};

const TEXTE: Record<"primaire" | "fantome", string> = {
  primaire: "text-white",
  fantome: "text-[#5b21b6]",
};

interface BoutonEffetVerreProps {
  variant: "primaire" | "fantome";
  children: ReactNode;
  className?: string;
  href?: string;
  type?: "button" | "submit";
  filterId: string;
}

export function BoutonEffetVerre({
  variant,
  children,
  className = "",
  href,
  type = "button",
  filterId,
}: BoutonEffetVerreProps) {
  const classeBase = `rbtn relative isolate flex w-full items-center justify-center overflow-hidden rounded-full border py-3.5 text-[14.5px] font-semibold ${
    variant === "primaire" ? "border-white/50" : "border-brand-violet/30"
  } ${TEXTE[variant]} ${className}`;

  const contenu = (
    <>
      <div
        className="absolute inset-0 z-0"
        style={{ backdropFilter: "blur(3px) saturate(160%)", WebkitBackdropFilter: "blur(3px) saturate(160%)", filter: `url(#${filterId})` }}
      />
      <div className={`absolute inset-0 z-[1] ${TEINTE[variant]}`} />
      <div
        className="absolute inset-0 z-[2]"
        style={{ boxShadow: "inset 2px 2px 1px 0 rgba(255,255,255,.5), inset -1px -1px 1px 1px rgba(255,255,255,.4)" }}
      />
      <span className="relative z-[3]">{children}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} onClick={declencherRipple} className={classeBase}>
        {contenu}
      </Link>
    );
  }

  return (
    <button type={type} onClick={declencherRipple} className={classeBase}>
      {contenu}
    </button>
  );
}
