import Link from "next/link";

interface OngletsExplorerProps {
  actif: "situations" | "dossier" | "informations";
}

const ONGLETS = [
  { cle: "dossier" as const, href: "/situations/dossier", label: "Dossier de soins" },
  { cle: "situations" as const, href: "/situations", label: "Situations Terrain" },
  { cle: "informations" as const, href: "/situations/informations-professionnelles", label: "Infos pro" },
];

export function OngletsExplorer({ actif }: OngletsExplorerProps) {
  return (
    // Boutons sélectionnables plutôt que des onglets soulignés : la cible est
    // plus large au doigt et l'état actif se lit immédiatement.
    //
    // `overflow-x-auto` autorise le défilement sur écran étroit, mais rogne
    // aussi verticalement : en CSS, dès qu'un axe cesse d'être `visible`,
    // l'autre est rogné également. La réserve doit donc contenir le
    // soulèvement au survol *et* la lueur portée du bouton actif, sinon
    // celle-ci est tranchée net et laisse un bord rectangulaire au lieu de
    // s'estomper. La lueur au survol descend à 42 px sous le bouton (décalage
    // de 14 px et flou de 28 px) : la réserve de 44 px la contient entièrement.
    // La marge négative l'annule dans la mise en page.
    <div className="defilement-discret -my-11 flex gap-2 overflow-x-auto py-11">
      {ONGLETS.map((onglet) => {
        const estActif = onglet.cle === actif;
        return (
          <Link
            key={onglet.cle}
            href={onglet.href}
            aria-current={estActif ? "page" : undefined}
            className={`shrink-0 whitespace-nowrap rounded-[12px] px-4 py-2.5 text-[14px] font-semibold tracking-tight ${
              estActif
                ? "btn-glace bg-gradient-to-r from-brand-violet to-brand-rose text-white shadow-[0_6px_16px_rgba(124,58,237,0.28)]"
                : "btn-glace-clair border border-navy/10 bg-white text-navy/60"
            }`}
          >
            {onglet.label}
          </Link>
        );
      })}
    </div>
  );
}
