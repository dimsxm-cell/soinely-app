import Link from "next/link";
import type { ReactNode } from "react";
import type { MissionTourneeVue } from "@/lib/data/ma-journee";
import { formatDateDuJour, formatSalutation } from "@/lib/accueil-vue";
import { formaterEuros } from "@/lib/cotation";
import { LogoSoinely } from "@/components/ui/LogoSoinely";
import { CarteTourneeEnCoursDesktop } from "@/components/ui/CarteTourneeEnCoursDesktop";

/**
 * Donnees d'exemple : rien ici ne vient d'une vraie fonctionnalite. A
 * remplacer par la brique #2 (agregation cabinet) le jour ou elle existe —
 * regroupees ici pour que ce remplacement soit localise, pas une chasse au
 * texte code en dur dans le JSX.
 */
const DONNEES_EXEMPLE = {
  nomCabinet: "Cabinet Voltaire",
  suggestionEly: "Optimisation de tournée, 2 ordonnances à renouveler.",
  aTraiter: [
    { titre: "2 ordonnances expirent demain", sous: "Mme Bernard, M. Nguyen" },
    { titre: "1 rejet de télétransmission à corriger", sous: "Facture 2024-0812 · 42,30 €" },
    { titre: "Photo d'escarre à joindre", sous: "Dossier du 22/07" },
  ],
  facturationSemaine: {
    montant: "1 842 €",
    tendance: "+12,4 %",
    barres: [58, 72, 45, 88, 64, 96, 78],
    jours: ["L", "M", "M", "J", "V", "S", "D"],
    teletransmission: "Télétransmission SCOR à jour · 0 rejet",
  },
};

interface EntreeNav {
  label: string;
  href?: string;
}

const NAV_PILOTAGE: EntreeNav[] = [
  { label: "Tableau de bord" },
  { label: "Ma tournée", href: "/ma-tournee" },
  { label: "Agenda" },
  { label: "Patients", href: "/patients" },
];

const NAV_GESTION: EntreeNav[] = [
  { label: "Facturation" },
  { label: "Documents", href: "/situations/dossier" },
  { label: "Réglages" },
];

function EntreeNavigation({ entree, actif }: { entree: EntreeNav; actif: boolean }) {
  const classe = `flex min-h-[38px] items-center gap-2.5 rounded-[11px] px-3 text-[13.5px] font-semibold ${
    actif ? "bg-white/[0.08] text-white" : "text-[#9d96ae]"
  }`;
  if (!entree.href) {
    return <span className={classe}>{entree.label}</span>;
  }
  return (
    <Link href={entree.href} className={classe}>
      {entree.label}
    </Link>
  );
}

function CarteKpi({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div className="flex flex-1 flex-col justify-center rounded-[20px] border border-navy/10 bg-white p-5 shadow-[0_1px_2px_rgba(30,25,45,.04)]">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-navy/45">{label}</p>
      <p className="mt-2 font-display text-[28px] font-bold leading-none tracking-tight tabular-nums">{valeur}</p>
    </div>
  );
}

function Panneau({ titre, sous, children }: { titre: string; sous?: string; children: ReactNode }) {
  return (
    <div className="rounded-[22px] border border-navy/10 bg-white p-5">
      <p className="font-display text-[16px] font-bold tracking-tight text-navy">{titre}</p>
      {sous && <p className="mt-0.5 text-[12px] text-navy/45">{sous}</p>}
      <div className="mt-3.5">{children}</div>
    </div>
  );
}

export function TableauDeBordDesktop({
  prenom,
  missions,
  nombrePatients,
  montantCotationJour,
}: {
  prenom: string | undefined;
  missions: MissionTourneeVue[];
  nombrePatients: number;
  montantCotationJour: number;
}) {
  return (
    <div className="grid min-h-screen grid-cols-[246px_1fr] bg-[#0f0e14] text-navy">
      <aside className="flex flex-col gap-6 border-r border-white/[0.07] bg-[#0f0e14] px-4 py-6 text-white">
        <div className="flex items-center gap-2.5 px-1">
          <LogoSoinely variante="carre" className="h-8 w-8" />
          <div>
            <p className="font-display text-[15px] font-bold leading-none">Soinely</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6f6883]">
              {DONNEES_EXEMPLE.nomCabinet}
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5">
          <p className="px-3 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#5c566e]">Pilotage</p>
          {NAV_PILOTAGE.map((entree) => (
            <EntreeNavigation key={entree.label} entree={entree} actif={entree.label === "Tableau de bord"} />
          ))}
        </nav>

        <nav className="flex flex-col gap-0.5">
          <p className="px-3 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#5c566e]">Gestion</p>
          {NAV_GESTION.map((entree) => (
            <EntreeNavigation key={entree.label} entree={entree} actif={false} />
          ))}
        </nav>

        <div className="mt-auto rounded-[16px] border border-[rgba(139,92,246,.28)] bg-[linear-gradient(150deg,rgba(139,92,246,.22),rgba(109,40,217,.06))] p-3.5">
          <p className="text-[12.5px] font-bold text-white">Ely a des suggestions</p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#b3abc7]">{DONNEES_EXEMPLE.suggestionEly}</p>
          <Link
            href="/ely"
            className="mt-2.5 flex min-h-[34px] items-center justify-center rounded-[10px] bg-white text-[12.5px] font-bold text-[#2b1a55]"
          >
            Voir avec Ely
          </Link>
        </div>
      </aside>

      <main className="min-w-0 bg-[#f2f0ec]">
        <header className="flex items-center gap-4 border-b border-[#e3dfd8] bg-[rgba(242,240,236,.86)] px-8 py-4">
          <div className="flex-1">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-navy/45">{formatDateDuJour()}</p>
            <p className="mt-0.5 font-display text-[21px] font-bold tracking-tight">
              {formatSalutation()}
              {prenom ? ` ${prenom}` : ""}
            </p>
          </div>
          <Link
            href="/ma-tournee"
            className="flex min-h-[40px] items-center gap-2 rounded-[12px] bg-gradient-to-r from-brand-violet to-brand-rose px-4 text-[13px] font-bold text-white shadow-[0_8px_22px_rgba(109,40,217,.28)]"
          >
            Reprendre la tournée
          </Link>
        </header>

        <div className="flex flex-col gap-5 px-8 py-6">
          <section className="grid grid-cols-[1.55fr_1fr] items-stretch gap-5">
            <CarteTourneeEnCoursDesktop missions={missions} />
            <div className="grid grid-rows-2 gap-5">
              <CarteKpi label="Cotation du jour" valeur={formaterEuros(montantCotationJour)} />
              <CarteKpi label="Patients actifs" valeur={String(nombrePatients)} />
            </div>
          </section>

          <div id="tableau-de-bord-contenu-principal" />
        </div>
      </main>
    </div>
  );
}
