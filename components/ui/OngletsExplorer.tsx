import Link from "next/link";

interface OngletsExplorerProps {
  actif: "situations" | "dossier";
}

const ONGLETS = [
  { cle: "situations" as const, href: "/situations", label: "Situations Terrain" },
  { cle: "dossier" as const, href: "/situations/dossier", label: "Dossier de soins" },
];

export function OngletsExplorer({ actif }: OngletsExplorerProps) {
  return (
    <div className="flex gap-6 border-b border-navy/10">
      {ONGLETS.map((onglet) => {
        const estActif = onglet.cle === actif;
        return (
          <Link
            key={onglet.cle}
            href={onglet.href}
            aria-current={estActif ? "page" : undefined}
            className={`-mb-px border-b-2 pb-3 text-sm font-medium transition-colors ${
              estActif ? "border-brand-violet text-brand-violet" : "border-transparent text-navy/50"
            }`}
          >
            {onglet.label}
          </Link>
        );
      })}
    </div>
  );
}
