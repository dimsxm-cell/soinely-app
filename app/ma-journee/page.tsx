import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTourneeDuJour } from "@/lib/data/ma-journee";
import { Button } from "@/components/ui/Button";
import { CarteInformation } from "@/components/ui/CarteInformation";

export default async function MaJourneePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tournee = user ? await getTourneeDuJour(supabase, user.id) : null;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-navy">Ma Journée</h1>
      <div className="flex gap-4">
        <Link href="/recherche">
          <Button variant="secondary">Rechercher</Button>
        </Link>
        <Link href="/copilote">
          <Button variant="secondary">Copilote</Button>
        </Link>
      </div>
      {tournee ? (
        <div className="grid grid-cols-2 gap-4">
          <CarteInformation label="Patients" value={tournee.nbPatients} />
          <CarteInformation label="Injections" value={tournee.nbInjections} />
          <CarteInformation label="Pansements" value={tournee.nbPansements} />
          <CarteInformation label="Glycémies" value={tournee.nbGlycemies} />
        </div>
      ) : (
        <p className="text-navy/60">Aucune tournée enregistrée pour aujourd&apos;hui.</p>
      )}
    </main>
  );
}
