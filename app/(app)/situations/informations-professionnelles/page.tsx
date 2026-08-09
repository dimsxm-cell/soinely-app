import { createClient } from "@/lib/supabase/server";
import { getAllFichesDossierSoins } from "@/lib/data/dossierSoins";
import { ListeInformationsProfessionnelles } from "@/components/ui/ListeInformationsProfessionnelles";

export default async function InformationsProfessionnellesPage() {
  const supabase = await createClient();
  const fiches = (await getAllFichesDossierSoins(supabase)).filter(
    (fiche) => fiche.section === "informations_professionnelles"
  );

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <ListeInformationsProfessionnelles fiches={fiches} />
    </main>
  );
}
