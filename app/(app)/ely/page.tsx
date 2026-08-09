import { createClient, getUtilisateurConnecte } from "@/lib/supabase/server";
import { obtenirReponseEly } from "@/lib/data/ely";
import { countSituationsTerrainPublished } from "@/lib/data/recherche";
import { ConversationEly } from "@/components/ui/ConversationEly";

export default async function ElyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; patient?: string; soin?: string }>;
}) {
  const { q, patient, soin } = await searchParams;
  const query = q ?? "";

  const supabase = await createClient();
  const user = await getUtilisateurConnecte();
  const [reponseInitiale, nombreFiches] = await Promise.all([
    query.trim()
      ? obtenirReponseEly(supabase, query, user?.id ?? null)
      : Promise.resolve({ situationBrute: null, situationsSources: [], synthese: null }),
    countSituationsTerrainPublished(supabase),
  ]);

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <ConversationEly
        requeteInitiale={query}
        reponseInitiale={reponseInitiale}
        patientContexte={patient ?? null}
        soinContexte={soin ?? null}
        nombreFiches={nombreFiches}
      />
    </main>
  );
}
