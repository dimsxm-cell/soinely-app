import { createClient } from "@/lib/supabase/server";
import { getAllFichesDossierSoins, SECTIONS_DOSSIER_SOINS } from "@/lib/data/dossierSoins";
import { CarteFicheDossier } from "@/components/ui/CarteFicheDossier";
import { OngletsExplorer } from "@/components/ui/OngletsExplorer";

export default async function DossierSoinsPage() {
  const supabase = await createClient();
  const fiches = await getAllFichesDossierSoins(supabase);

  const sectionsAvecFiches = SECTIONS_DOSSIER_SOINS.map((section) => ({
    ...section,
    fiches: fiches.filter((fiche) => fiche.section === section.valeur),
  })).filter((section) => section.fiches.length > 0);

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10 sm:py-14">
        <OngletsExplorer actif="dossier" />

        <h1 className="font-display text-[28px] font-medium leading-tight sm:text-[32px]">
          Dossier de soins
        </h1>

        {sectionsAvecFiches.length > 0 ? (
          <div className="flex flex-col gap-8">
            {sectionsAvecFiches.map((section) => (
              <div key={section.valeur} className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-navy">{section.label}</h2>
                {section.fiches.map((fiche) => (
                  <CarteFicheDossier key={fiche.id} fiche={fiche} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-navy/60">Aucune fiche disponible pour le moment.</p>
        )}
      </div>
    </main>
  );
}
