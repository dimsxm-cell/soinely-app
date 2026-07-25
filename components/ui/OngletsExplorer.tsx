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
    <div className="flex gap-6 overflow-x-auto border-b border-navy/10">
      {ONGLETS.map((onglet) => {
        const estActif = onglet.cle === actif;
        return (
          <Link
            key={onglet.cle}
            href={onglet.href}
            aria-current={estActif ? "page" : undefined}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-[2.5px] pb-3 text-[15px] font-semibold tracking-tight transition-colors ${
              estActif ? "border-brand-violet text-brand-violet" : "border-transparent text-navy/40 hover:text-navy/60"
            }`}
          >
            {onglet.label}
          </Link>
        );
      })}
    </div>
  );
}
