import { createClient } from "@/lib/supabase/server";
import { searchSituationsTerrain } from "@/lib/data/recherche";
import { CarteSituationTerrain } from "@/components/ui/CarteSituationTerrain";
import { Button } from "@/components/ui/Button";

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
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-navy">Recherche</h1>

      <form method="GET" className="flex gap-4">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Ex. : la perfusion ne passe plus"
          aria-label="Rechercher une situation terrain"
          className="min-h-[44px] flex-1 rounded-card border border-navy/20 px-4 py-2 text-navy"
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
    </main>
  );
}
