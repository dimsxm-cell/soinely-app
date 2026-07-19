import { createClient } from "@/lib/supabase/server";
import { getAllSituationsTerrain } from "@/lib/data/recherche";
import { CarteSituationTerrain } from "@/components/ui/CarteSituationTerrain";
import { OngletsExplorer } from "@/components/ui/OngletsExplorer";

export default async function SituationsPage() {
  const supabase = await createClient();
  const situations = await getAllSituationsTerrain(supabase);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <OngletsExplorer actif="situations" />

      <h1 className="text-2xl font-semibold text-navy">Situations Terrain</h1>

      {situations.length > 0 ? (
        <div className="flex flex-col gap-4">
          {situations.map((situation) => (
            <CarteSituationTerrain key={situation.id} situation={situation} />
          ))}
        </div>
      ) : (
        <p className="text-navy/60">Aucune situation disponible pour le moment.</p>
      )}
    </main>
  );
}
