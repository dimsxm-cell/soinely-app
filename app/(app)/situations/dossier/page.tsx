import { createClient } from "@/lib/supabase/server";
import { getAllFichesDossierSoins, SECTIONS_DOSSIER_SOINS } from "@/lib/data/dossierSoins";
import { ListeFichesDossier } from "@/components/ui/ListeFichesDossier";

const SECTIONS_PATIENT = SECTIONS_DOSSIER_SOINS.filter(
  (section) => section.valeur !== "informations_professionnelles"
);

export default async function DossierSoinsPage() {
  const supabase = await createClient();
  const fiches = (await getAllFichesDossierSoins(supabase)).filter(
    (fiche) => fiche.section !== "informations_professionnelles"
  );

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <ListeFichesDossier sections={SECTIONS_PATIENT} fiches={fiches} />
    </main>
  );
}
