import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFicheDossierDetail } from "@/lib/data/dossierSoins";
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

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10 sm:py-14">
        <LienRetour href="/situations/dossier" label="Dossier de soins" />

        <span className="w-fit rounded-full bg-navy/10 px-4 py-2 text-sm text-navy">
          {fiche.niveauConfiance}
        </span>

        <h1 className="font-display text-[28px] font-medium leading-tight sm:text-[32px]">
          {fiche.titre}
        </h1>

        <p className="text-navy/80">{fiche.resume}</p>

        {fiche.contenu.map((bloc) => (
          <section key={bloc.titre}>
            <h2 className="text-lg font-semibold text-navy">{bloc.titre}</h2>
            <ul className="mt-2 list-disc pl-6 text-navy/80">
              {bloc.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}

        <section>
          <h2 className="text-lg font-semibold text-navy">Sources</h2>
          <ul className="mt-2 list-disc pl-6 text-navy/80">
            {fiche.sources.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
