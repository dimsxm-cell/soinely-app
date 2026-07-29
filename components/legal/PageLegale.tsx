import Link from "next/link";

// Contenu structuré en données plutôt qu'en JSX : le texte juridique est long
// et les apostrophes françaises y sont omniprésentes — les garder dans des
// chaînes JS évite l'échappement (&apos;) à chaque ligne et rend la relecture
// par un juriste beaucoup plus simple.
export type BlocLegal =
  | { type: "p"; texte: string }
  | { type: "liste"; items: string[] }
  | { type: "aValider"; texte: string };

export interface SectionLegale {
  titre: string;
  blocs: BlocLegal[];
}

function Bloc({ bloc }: { bloc: BlocLegal }) {
  if (bloc.type === "p") {
    return <p className="text-[14.5px] leading-relaxed text-navy/75">{bloc.texte}</p>;
  }

  if (bloc.type === "liste") {
    return (
      <ul className="flex flex-col gap-2">
        {bloc.items.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-[14.5px] leading-relaxed text-navy/75">
            <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-violet/50" />
            {item}
          </li>
        ))}
      </ul>
    );
  }

  // Encadré volontairement très visible : ces informations ne peuvent être
  // connues que de l'éditeur. Mieux vaut un texte manifestement à compléter
  // qu'une mention inventée dans un document juridiquement contraignant.
  return (
    <div className="rounded-[14px] border border-warning/40 bg-warning/[0.07] px-4 py-3">
      <p className="text-[12px] font-bold uppercase tracking-wide text-[#8a5a00]">À compléter par l&apos;éditeur</p>
      <p className="mt-1 text-[14px] leading-relaxed text-navy/75">{bloc.texte}</p>
    </div>
  );
}

interface PageLegaleProps {
  titre: string;
  chapeau: string;
  miseAJour: string;
  sections: SectionLegale[];
}

export function PageLegale({ titre, chapeau, miseAJour, sections }: PageLegaleProps) {
  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto flex max-w-[720px] flex-col gap-6 px-6 py-10 sm:py-14">
        <Link href="/" className="text-[14px] font-semibold text-brand-violet hover:underline">
          ‹ Accueil
        </Link>

        <div>
          <h1 className="font-display text-[30px] font-bold leading-tight tracking-tight sm:text-[36px]">{titre}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-navy/60">{chapeau}</p>
          <p className="mt-2 text-[13px] text-navy/45">Dernière mise à jour : {miseAJour}</p>
        </div>

        <div className="flex flex-col gap-5">
          {sections.map((section, index) => (
            <section
              key={section.titre}
              className="rounded-[18px] border border-navy/10 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,.04)]"
            >
              <h2 className="font-display text-[19px] font-bold tracking-tight text-navy">
                <span className="mr-2 text-brand-violet">{index + 1}.</span>
                {section.titre}
              </h2>
              <div className="mt-3 flex flex-col gap-3">
                {section.blocs.map((bloc, i) => (
                  <Bloc key={i} bloc={bloc} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
