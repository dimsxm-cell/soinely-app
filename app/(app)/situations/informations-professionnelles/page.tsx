import { createClient } from "@/lib/supabase/server";
import { getAllFichesDossierSoins } from "@/lib/data/dossierSoins";
import { ListeInformationsProfessionnelles } from "@/components/ui/ListeInformationsProfessionnelles";
import { OngletsExplorer } from "@/components/ui/OngletsExplorer";

export default async function InformationsProfessionnellesPage() {
  const supabase = await createClient();
  const fiches = (await getAllFichesDossierSoins(supabase)).filter(
    (fiche) => fiche.section === "informations_professionnelles"
  );

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10 sm:py-14">
        <OngletsExplorer actif="informations" />

        <div>
          <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]">
            Informations professionnelles
          </h1>
          <p className="mt-1.5 text-[14px] text-navy/50">
            Repères juridiques et déontologiques pour votre exercice, issus des fiches de l&apos;Ordre National
            des Infirmiers.
          </p>
        </div>

        <ListeInformationsProfessionnelles fiches={fiches} />
      </div>
    </main>
  );
}
