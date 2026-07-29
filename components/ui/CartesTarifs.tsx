"use client";

import { useState } from "react";
import { createCheckoutSessionAction } from "@/lib/data/abonnement-actions";
import { BoutonEffetVerre } from "./BoutonEffetVerre";

const FONCTIONNALITES_SOLO = [
  "Patients illimités",
  "Agenda de tournée",
  "Transmissions, rappels & photos de suivi",
  "Assistant vocal ELY",
];

interface PlanDef {
  id: "solo" | "cabinet";
  nom: string;
  accent: string;
  fondCheck: string;
  description: string;
  prixMensuel: number;
  fonctionnalites: string[];
  note: string | null;
  populaire: boolean;
}

const PLANS: PlanDef[] = [
  {
    id: "solo",
    nom: "Solo",
    accent: "#7c3aed",
    fondCheck: "rgba(124,58,237,.12)",
    description: "Pour une IDEL indépendante qui gère sa tournée seule.",
    prixMensuel: 19,
    fonctionnalites: FONCTIONNALITES_SOLO,
    note: null,
    populaire: true,
  },
  {
    id: "cabinet",
    // Cette offre reprend aujourd'hui les mêmes fonctionnalités que Solo :
    // la liste renvoie donc à celle-ci plutôt que de la recopier à
    // l'identique, ce qui donnait deux cartes indiscernables.
    nom: "Cabinet",
    accent: "#c026d3",
    fondCheck: "rgba(192,38,211,.1)",
    description: "Pour plusieurs infirmiers exerçant au sein d'un même cabinet.",
    prixMensuel: 39,
    fonctionnalites: ["Tout ce que comprend l'offre Solo"],
    note: "Chaque infirmier du cabinet dispose de son propre compte. Le partage du dossier entre comptes arrive prochainement.",
    populaire: false,
  },
];

const PLAN_LABEL: Record<"solo" | "cabinet", string> = { solo: "Solo", cabinet: "Cabinet" };

const CLASSE_CARTE_BASE =
  "pcard relative flex min-w-[270px] max-w-[320px] flex-1 flex-col rounded-[24px] border p-7 pb-8 backdrop-blur-2xl";
const CLASSE_CARTE_PLAINE =
  "border-white/75 bg-gradient-to-br from-white/[.78] to-white/50 shadow-[0_18px_44px_rgba(76,29,149,.1),0_1px_2px_rgba(76,29,149,.06)]";
const CLASSE_CARTE_POPULAIRE =
  "pop border-brand-violet/40 bg-gradient-to-br from-white/[.92] to-[#faf6ff]/[.72] shadow-[0_26px_60px_rgba(124,58,237,.26),0_2px_4px_rgba(124,58,237,.12)]";

interface CartesTarifsProps {
  estConnecte: boolean;
  planActuel: "solo" | "cabinet" | null;
  joursRestantsEssai: number;
}

export function CartesTarifs({ estConnecte, planActuel, joursRestantsEssai }: CartesTarifsProps) {
  const [annuel, setAnnuel] = useState(false);

  const baseToggle =
    "flex items-center rounded-[10px] px-5 py-2.5 text-sm font-bold transition-colors duration-200";

  return (
    <>
      <div className="mb-10 mt-8 inline-flex items-center gap-1 rounded-[13px] border border-[#e9defb] bg-white/70 p-1 backdrop-blur">
        <button
          type="button"
          onClick={() => setAnnuel(false)}
          className={`${baseToggle} ${
            !annuel
              ? "bg-gradient-to-br from-brand-violet to-purple-500 text-white shadow-[0_6px_16px_rgba(124,58,237,.3)]"
              : "bg-transparent text-[#7a7391]"
          }`}
        >
          Mensuel
        </button>
        <button
          type="button"
          onClick={() => setAnnuel(true)}
          className={`${baseToggle} ${
            annuel
              ? "bg-gradient-to-br from-brand-violet to-purple-500 text-white shadow-[0_6px_16px_rgba(124,58,237,.3)]"
              : "bg-transparent text-[#7a7391]"
          }`}
        >
          Annuel
          <span className="ml-1.5 rounded-[7px] bg-white/25 px-1.5 py-0.5 text-[11px] font-extrabold">-20%</span>
        </button>
      </div>

      <div className="flex w-full max-w-[1060px] flex-wrap items-stretch justify-center gap-6">
        <div className={`${CLASSE_CARTE_BASE} ${CLASSE_CARTE_PLAINE}`}>
          <p className="text-sm font-extrabold uppercase tracking-wide text-[#3f6fd6]">Découverte</p>
          <p className="mb-4 mt-1.5 min-h-[38px] text-[13.5px] leading-relaxed text-[#7a7391]">
            Pour tester Soinely en solo, à votre rythme.
          </p>
          <div className="mb-1.5 flex items-baseline gap-1.5">
            <span className="font-display text-[52px] font-extrabold leading-none tracking-tight">0 €</span>
          </div>
          <p className="mb-5 text-[12.5px] text-[#9a92b3]">Gratuit 15 jours, aucune carte requise</p>
          <div className="mb-5 h-px w-full bg-gradient-to-r from-transparent via-brand-violet/20 to-transparent" />
          <ul className="mb-6 flex flex-1 flex-col gap-3">
            <li className="flex items-start gap-2.5 text-sm leading-tight text-[#3d3956]">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                style={{ background: "rgba(63,111,214,.12)" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3f6fd6" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              Accès complet à l&apos;application pendant 15 jours
            </li>
          </ul>

          {!estConnecte ? (
            <BoutonEffetVerre variant="fantome" filterId="glass-distortion-tarifs" href="/login">
              Créer un compte
            </BoutonEffetVerre>
          ) : planActuel ? (
            <p className="mt-auto text-center text-[13px] text-navy/45">
              Vous êtes abonné(e) au plan {PLAN_LABEL[planActuel]}.
            </p>
          ) : joursRestantsEssai > 0 ? (
            <>
              <BoutonEffetVerre variant="fantome" filterId="glass-distortion-tarifs" href="/ma-journee">
                Continuer l&apos;essai
              </BoutonEffetVerre>
              <p className="mt-3 text-center text-[12px] text-navy/45">
                {joursRestantsEssai} jour{joursRestantsEssai > 1 ? "s" : ""} restant
                {joursRestantsEssai > 1 ? "s" : ""}
              </p>
            </>
          ) : (
            <p className="mt-auto text-center text-[13px] text-navy/45">Votre essai gratuit est terminé.</p>
          )}
        </div>

        {PLANS.map((plan) => {
          const prixAffiche = annuel ? Math.round(plan.prixMensuel * 0.8) : plan.prixMensuel;
          const noteAffichee = annuel
            ? `par infirmier · facturé annuellement (${prixAffiche * 12} €/an)`
            : "par infirmier · facturé mensuellement";

          return (
            <div
              key={plan.id}
              className={`${CLASSE_CARTE_BASE} ${plan.populaire ? CLASSE_CARTE_POPULAIRE : CLASSE_CARTE_PLAINE}`}
            >
              {plan.populaire && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[10px] bg-gradient-to-br from-brand-violet to-brand-rose px-4 py-1.5 text-[11.5px] font-extrabold text-white shadow-[0_8px_20px_rgba(124,58,237,.4)]">
                  ★ Le plus choisi
                </div>
              )}
              <p className="text-sm font-extrabold uppercase tracking-wide" style={{ color: plan.accent }}>
                {plan.nom}
              </p>
              <p className="mb-4 mt-1.5 min-h-[38px] text-[13.5px] leading-relaxed text-[#7a7391]">{plan.description}</p>
              <div className="mb-1.5 flex items-baseline gap-1.5">
                <span className="font-display text-[52px] font-extrabold leading-none tracking-tight">{prixAffiche} €</span>
                <span className="text-[15px] font-bold text-[#8a83a0]">/ mois</span>
              </div>
              <p className="mb-5 text-[12.5px] text-[#9a92b3]">{noteAffichee}</p>
              <div className="mb-5 h-px w-full bg-gradient-to-r from-transparent via-brand-violet/20 to-transparent" />
              <ul className="mb-6 flex flex-1 flex-col gap-3">
                {plan.fonctionnalites.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm leading-tight text-[#3d3956]">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{ background: plan.fondCheck }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={plan.accent} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              {plan.note && <p className="mb-4 text-[12px] leading-relaxed text-navy/45">{plan.note}</p>}

              <form action={createCheckoutSessionAction}>
                <input type="hidden" name="plan" value={plan.id} />
                <input type="hidden" name="periodicite" value={annuel ? "annuel" : "mensuel"} />
                <BoutonEffetVerre variant="primaire" filterId="glass-distortion-tarifs" type="submit">
                  {planActuel === plan.id ? "Offre actuelle" : `Choisir ${plan.nom}`}
                </BoutonEffetVerre>
              </form>
            </div>
          );
        })}
      </div>
    </>
  );
}
