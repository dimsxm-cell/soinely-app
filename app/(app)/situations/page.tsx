import { createClient } from "@/lib/supabase/server";
import { getAllSituationsTerrain } from "@/lib/data/recherche";
import { ListeSituationsTerrain } from "@/components/ui/ListeSituationsTerrain";
import { OngletsExplorer } from "@/components/ui/OngletsExplorer";

export default async function SituationsPage() {
  const supabase = await createClient();
  const situations = await getAllSituationsTerrain(supabase);

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10 sm:py-14">
        <OngletsExplorer actif="situations" />

        <div>
          <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]">
            Situations Terrain
          </h1>
          <p className="mt-1.5 text-[14px] text-navy/50">
            Conduites à tenir pour les situations fréquentes en soins à domicile.
          </p>
        </div>

        <ListeSituationsTerrain situations={situations} />
      </div>
    </main>
  );
}
