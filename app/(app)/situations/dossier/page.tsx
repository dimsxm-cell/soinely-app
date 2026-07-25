import { createClient } from "@/lib/supabase/server";
import { getAllFichesDossierSoins, SECTIONS_DOSSIER_SOINS } from "@/lib/data/dossierSoins";
import { ListeFichesDossier } from "@/components/ui/ListeFichesDossier";
import { OngletsExplorer } from "@/components/ui/OngletsExplorer";

export default async function DossierSoinsPage() {
  const supabase = await createClient();
  const fiches = await getAllFichesDossierSoins(supabase);

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10 sm:py-14">
        <OngletsExplorer actif="dossier" />

        <div>
          <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]">
            Dossier de soins
          </h1>
          <p className="mt-1.5 text-[14px] text-navy/50">
            Ordonnances, comptes-rendus et protocoles de référence.
          </p>
        </div>

        <ListeFichesDossier sections={SECTIONS_DOSSIER_SOINS} fiches={fiches} />
      </div>
    </main>
  );
}
