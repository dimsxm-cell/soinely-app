import { createClient } from "@/lib/supabase/server";
import { searchSituationsTerrain } from "@/lib/data/recherche";
import { CarteReponse } from "@/components/ui/CarteReponse";
import { CarteSituationTerrain } from "@/components/ui/CarteSituationTerrain";
import { Button } from "@/components/ui/Button";

export default async function ElyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q ?? "";

  const supabase = await createClient();
  const results = query.trim() ? await searchSituationsTerrain(supabase, query) : [];
  const [reponse, ...autres] = results;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-navy">Ely</h1>

      <form method="GET" className="flex gap-4">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Ex. : le patient a une plaie qui s'infecte, que faire ?"
          aria-label="Poser une question clinique"
          className="min-h-[44px] flex-1 rounded-card border border-navy/20 px-4 py-2 text-navy"
        />
        <Button type="submit">Demander</Button>
      </form>

      {query.trim() && results.length === 0 && (
        <p className="text-navy/70">
          Je n&apos;ai pas trouvé de réponse à cette question. Essayez de la reformuler.
        </p>
      )}

      {reponse && <CarteReponse situation={reponse} />}

      {autres.length > 0 && (
        <div className="flex flex-col gap-4">
          {autres.map((situation) => (
            <CarteSituationTerrain key={situation.id} situation={situation} />
          ))}
        </div>
      )}
    </main>
  );
}
