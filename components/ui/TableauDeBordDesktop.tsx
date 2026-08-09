import Link from "next/link";
import type { ReactNode } from "react";
import type { MissionTourneeVue } from "@/lib/data/ma-journee";
import { formatDateDuJour, formatSalutation } from "@/lib/accueil-vue";
import { formaterEuros } from "@/lib/cotation";
import { formatHeure, getInitiales, trouverProchainArret } from "@/lib/tournee-vue";
import { formaterNomPropre } from "@/lib/format";
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
    teletransmission: "Télétransmission SCOR · 1 rejet à traiter",
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
  const prochainArretId = trouverProchainArret(missions)?.id ?? null;
  const suiteDeLaTournee = missions.filter(
    (m) => (m.statut === "a_faire" || m.statut === "en_cours") && m.id !== prochainArretId
  );

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

          <section className="grid grid-cols-[1.55fr_1fr] items-start gap-5">
            <Panneau titre="Suite de la tournée" sous={`${suiteDeLaTournee.length} arrêt${suiteDeLaTournee.length > 1 ? "s" : ""} restant${suiteDeLaTournee.length > 1 ? "s" : ""}`}>
              {suiteDeLaTournee.length > 0 ? (
                <div className="flex flex-col divide-y divide-[#f0ede7]">
                  {suiteDeLaTournee.map((mission) => (
                    <div key={mission.id} className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0">
                      <span className="w-11 shrink-0 text-[13px] font-bold tabular-nums text-[#3b3648]">
                        {formatHeure(mission.heurePrevue)}
                      </span>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-violet/10 text-[12px] font-bold text-brand-violet">
                        {getInitiales(mission.patientNom)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold tracking-tight text-navy">
                          {formaterNomPropre(mission.patientNom)}
                        </span>
                        <span className="block truncate text-[12px] text-navy/45">{mission.patientAdresse}</span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-[13px] text-navy/45">Aucun autre arrêt aujourd&apos;hui.</p>
              )}
            </Panneau>

            <div className="flex flex-col gap-5">
              <Panneau titre="À traiter" sous="Exemple — brique agrégation à venir">
                <div className="flex flex-col gap-2">
                  {DONNEES_EXEMPLE.aTraiter.map((item) => (
                    <div key={item.titre} className="rounded-[13px] border border-[#ece8f2] bg-[#fbfafd] px-3 py-2.5">
                      <p className="text-[13px] font-semibold text-navy">{item.titre}</p>
                      <p className="mt-0.5 text-[11.5px] text-navy/45">{item.sous}</p>
                    </div>
                  ))}
                </div>
              </Panneau>

              <Panneau titre="Facturation" sous="7 derniers jours (exemple)">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-[22px] font-bold tracking-tight">
                    {DONNEES_EXEMPLE.facturationSemaine.montant}
                  </span>
                  <span className="text-[12px] font-bold text-[#1a7f5a]">
                    {DONNEES_EXEMPLE.facturationSemaine.tendance}
                  </span>
                </div>
                <div className="mt-4 flex h-16 items-end gap-2">
                  {DONNEES_EXEMPLE.facturationSemaine.barres.map((valeur, index) => (
                    <div key={`${DONNEES_EXEMPLE.facturationSemaine.jours[index]}-${index}`} className="flex flex-1 flex-col items-center gap-1.5">
                      <div
                        className="w-full rounded-t-[4px] bg-brand-violet/25"
                        style={{ height: `${valeur}%` }}
                      />
                      <span className="text-[10px] font-semibold text-navy/40">
                        {DONNEES_EXEMPLE.facturationSemaine.jours[index]}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2 border-t border-[#efece6] pt-3.5">
                  <span aria-hidden="true" className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#34c759]" />
                  <p className="text-[12px] text-navy/50">{DONNEES_EXEMPLE.facturationSemaine.teletransmission}</p>
                </div>
              </Panneau>
            </div>
          </section>

          <section className="grid grid-cols-4 gap-4">
            <Link
              href="/patients/nouveau"
              className="flex items-center gap-3 rounded-[16px] border border-navy/10 bg-white px-4 py-3.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-brand-violet/10 text-brand-violet">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <span className="text-[13.5px] font-bold text-navy">Nouveau patient</span>
            </Link>
            <div className="flex items-center gap-3 rounded-[16px] border border-navy/10 bg-white px-4 py-3.5 opacity-60">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-navy/5 text-navy/40">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3" />
                </svg>
              </span>
              <span className="text-[13.5px] font-bold text-navy/50">Scanner une ordonnance</span>
            </div>
            <div className="flex items-center gap-3 rounded-[16px] border border-navy/10 bg-white px-4 py-3.5 opacity-60">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-navy/5 text-navy/40">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 6.2A6.5 6.5 0 0 0 7.4 9m0 6A6.5 6.5 0 0 0 17 17.8" />
                </svg>
              </span>
              <span className="text-[13.5px] font-bold text-navy/50">Facturer la journée</span>
            </div>
            <Link
              href="/ely"
              className="flex items-center gap-3 rounded-[16px] border border-navy/10 bg-white px-4 py-3.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-brand-violet/10 text-brand-violet">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8 8 0 0 1-8 8H5l-1.5 3 .5-4.6A8 8 0 1 1 21 11.5Z" />
                </svg>
              </span>
              <span className="text-[13.5px] font-bold text-navy">Demander à Ely</span>
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
