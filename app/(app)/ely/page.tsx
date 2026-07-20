import { createClient } from "@/lib/supabase/server";
import { searchSituationsTerrain } from "@/lib/data/recherche";
import { CarteReponse } from "@/components/ui/CarteReponse";
import { CarteSituationTerrain } from "@/components/ui/CarteSituationTerrain";
import { Button } from "@/components/ui/Button";
import { ChampRechercheVocale } from "@/components/ui/ChampRechercheVocale";
import { PersistanceRecherche } from "@/components/ui/PersistanceRecherche";

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
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10 sm:py-14">
        <PersistanceRecherche cle="ely_derniere_requete" requeteActuelle={query} />

        <h1 className="font-display text-[28px] font-medium leading-tight sm:text-[32px]">Ely</h1>

        <form method="GET" className="flex gap-3">
          <ChampRechercheVocale
            defaultValue={query}
            placeholder="Ex. : le patient a une plaie qui s'infecte, que faire ?"
            ariaLabel="Poser une question clinique"
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
      </div>
    </main>
  );
}
