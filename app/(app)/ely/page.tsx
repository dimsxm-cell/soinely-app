import { createClient } from "@/lib/supabase/server";
import { searchSituationsTerrain } from "@/lib/data/recherche";
import { ConversationEly } from "@/components/ui/ConversationEly";
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
  const situationInitiale = results[0] ?? null;

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <PersistanceRecherche cle="ely_derniere_requete" requeteActuelle={query} />
      <div className="mx-auto flex max-w-2xl flex-col px-6 py-6 sm:py-8">
        <ConversationEly requeteInitiale={query} situationInitiale={situationInitiale} />
      </div>
    </main>
  );
}
