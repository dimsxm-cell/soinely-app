import { createClient } from "@/lib/supabase/server";
import { searchSituationsTerrain } from "@/lib/data/recherche";
import { CarteSituationTerrain } from "@/components/ui/CarteSituationTerrain";
import { Button } from "@/components/ui/Button";
import { PersistanceRecherche } from "@/components/ui/PersistanceRecherche";

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
        <PersistanceRecherche cle="recherche_derniere_requete" requeteActuelle={query} />

        <h1 className="font-display text-[28px] font-medium leading-tight sm:text-[32px]">Recherche</h1>

        <form method="GET" className="flex gap-3">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Ex. : la perfusion ne passe plus"
            aria-label="Rechercher une situation terrain"
            className="min-h-[44px] flex-1 rounded-card border border-navy/20 bg-white px-4 py-2 text-navy"
          />
          <Button type="submit">Rechercher</Button>
        </form>

        {query.trim() && results.length === 0 && (
          <p className="text-navy/70">Aucun résultat pour « {query} ».</p>
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
