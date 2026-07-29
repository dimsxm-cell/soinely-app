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
    // Retour à la ligne plutôt que défilement horizontal : un conteneur
    // défilable rogne sur ses quatre côtés, et tranchait donc la lueur portée
    // du bouton actif — à gauche pour le premier bouton, en dessous pour tous.
    // Sans conteneur défilable, la lueur s'étend librement, et aucun onglet
    // n'est masqué hors écran sur mobile.
    <div className="flex flex-wrap gap-2">
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
