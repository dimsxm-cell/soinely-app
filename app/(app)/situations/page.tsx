import { createClient } from "@/lib/supabase/server";
import { getAllSituationsTerrain } from "@/lib/data/recherche";
import { CarteSituationTerrain } from "@/components/ui/CarteSituationTerrain";
import { OngletsExplorer } from "@/components/ui/OngletsExplorer";

export default async function SituationsPage() {
  const supabase = await createClient();
  const situations = await getAllSituationsTerrain(supabase);

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10 sm:py-14">
        <OngletsExplorer actif="situations" />

        <h1 className="font-display text-[28px] font-medium leading-tight sm:text-[32px]">
          Situations Terrain
        </h1>

        {situations.length > 0 ? (
          <div className="flex flex-col gap-4">
            {situations.map((situation) => (
              <CarteSituationTerrain key={situation.id} situation={situation} />
            ))}
          </div>
        ) : (
          <p className="text-navy/60">Aucune situation disponible pour le moment.</p>
        )}
      </div>
    </main>
  );
}
