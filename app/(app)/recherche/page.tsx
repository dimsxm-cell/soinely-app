import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { searchSituationsTerrain } from "@/lib/data/recherche";
import { CarteSituationTerrain } from "@/components/ui/CarteSituationTerrain";
import { FormulaireRecherche } from "@/components/ui/FormulaireRecherche";

export default async function RecherchePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q ?? "";

  const supabase = await createClient();
  const results = query.trim() ? await searchSituationsTerrain(supabase, query) : [];

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10 sm:py-14">
        <h1 className="font-display text-[28px] font-medium leading-tight sm:text-[32px]">Recherche</h1>

        <FormulaireRecherche requeteInitiale={query} />

        {query.trim() && results.length === 0 && (
          <div className="flex items-center gap-4">
            <Image
              src="/marketing/ely-colibri-rassurant.webp"
              alt=""
              width={297}
              height={301}
              className="h-16 w-16 shrink-0 object-contain"
            />
            <p className="text-navy/70">Aucun résultat pour « {query} ».</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {results.map((situation) => (
            <CarteSituationTerrain key={situation.id} situation={situation} />
          ))}
        </div>
      </div>
    </main>
  );
}
