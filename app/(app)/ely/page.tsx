import { createClient, getUtilisateurConnecte } from "@/lib/supabase/server";
import { obtenirReponseEly } from "@/lib/data/ely";
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
  const reponseInitiale = query.trim()
    ? await obtenirReponseEly(supabase, query, user?.id ?? null)
    : { situationBrute: null, situationsSources: [], synthese: null };

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto flex max-w-2xl flex-col px-6 py-6 sm:py-8">
        <ConversationEly
          requeteInitiale={query}
          reponseInitiale={reponseInitiale}
          patientContexte={patient ?? null}
          soinContexte={soin ?? null}
        />
      </div>
    </main>
  );
}
