import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMissionEnCoursHref, getMissionsDuJour, getTourneeDuJour } from "@/lib/data/ma-journee";
import { Button } from "@/components/ui/Button";
import { CarteInformation } from "@/components/ui/CarteInformation";
import { CarteMission } from "@/components/ui/CarteMission";

export default async function MaJourneePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tournee = user ? await getTourneeDuJour(supabase, user.id) : null;
  const missions = tournee ? await getMissionsDuJour(supabase, tournee.id) : [];
  const contexte = tournee ? await getMissionEnCoursHref(supabase, tournee.id) : null;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-navy">Ma Journée</h1>
      <div className="flex gap-4">
        <Link href="/recherche">
          <Button variant="secondary">Rechercher</Button>
        </Link>
        <Link href="/ely">
          <Button variant="secondary">Ely</Button>
        </Link>
        <Link href="/situations">
          <Button variant="secondary">Parcourir</Button>
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
      {tournee &&
        (missions.length > 0 ? (
          <div className="flex flex-col gap-4">
            {missions.map((mission) => (
              <CarteMission
                key={mission.id}
                mission={mission}
                contexteHref={mission.id === contexte?.missionId ? contexte.href : undefined}
              />
            ))}
          </div>
        ) : (
          <p className="text-navy/60">Aucune mission prévue pour aujourd&apos;hui.</p>
        ))}
    </main>
  );
}
