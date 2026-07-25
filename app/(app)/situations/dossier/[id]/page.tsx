import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFicheDossierDetail, SECTIONS_DOSSIER_SOINS } from "@/lib/data/dossierSoins";
import { BadgeNiveauConfiance } from "@/components/ui/BadgeNiveauConfiance";
import { LienRetour } from "@/components/ui/LienRetour";

export default async function FicheDossierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const fiche = await getFicheDossierDetail(supabase, id);

  if (!fiche) notFound();

  const labelSection = SECTIONS_DOSSIER_SOINS.find((s) => s.valeur === fiche.section)?.label ?? "";

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto flex max-w-2xl flex-col gap-7 px-6 py-10 sm:py-14">
        <LienRetour href="/situations/dossier" label="Dossier de soins" />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-navy/5 px-2.5 py-1 text-[11.5px] font-semibold text-navy/60">
              {labelSection}
            </span>
            <BadgeNiveauConfiance niveau={fiche.niveauConfiance} />
          </div>
          <h1 className="mt-3 font-display text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]">
            {fiche.titre}
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-navy/70">{fiche.resume}</p>
        </div>

        {fiche.contenu.map((bloc) => (
          <section key={bloc.titre}>
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-navy/45">{bloc.titre}</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {bloc.items.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-navy/80">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-violet/50" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section>
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-navy/45">Sources</h2>
          <ul className="mt-3 flex flex-col gap-1.5">
            {fiche.sources.map((source) => (
              <li key={source} className="text-[13.5px] text-navy/55">
                {source}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
