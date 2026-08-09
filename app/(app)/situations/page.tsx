import { createClient } from "@/lib/supabase/server";
import { getAllSituationsTerrain } from "@/lib/data/recherche";
import { ListeSituationsTerrain } from "@/components/ui/ListeSituationsTerrain";

export default async function SituationsPage() {
  const supabase = await createClient();
  const situations = await getAllSituationsTerrain(supabase);

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <ListeSituationsTerrain situations={situations} />
    </main>
  );
}
