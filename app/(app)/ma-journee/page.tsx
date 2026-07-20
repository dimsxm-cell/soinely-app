import { createClient } from "@/lib/supabase/server";
import { getMissionEnCoursHref, getMissionsDuJour, getTourneeDuJour } from "@/lib/data/ma-journee";
import { CarteInformation } from "@/components/ui/CarteInformation";
import { CarteMission } from "@/components/ui/CarteMission";

function formatDateDuJour(): string {
  const date = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return date.charAt(0).toUpperCase() + date.slice(1);
}

function formatSalutation(): string {
  return new Date().getHours() < 18 ? "Bonjour" : "Bonsoir";
}

export default async function MaJourneePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const prenom = (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0];

  const tournee = user ? await getTourneeDuJour(supabase, user.id) : null;
  const missions = tournee ? await getMissionsDuJour(supabase, tournee.id) : [];
  const contexte = tournee ? await getMissionEnCoursHref(supabase, tournee.id) : null;

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto w-full max-w-2xl px-6 py-8 sm:py-10">
        <h1 className="font-display text-[28px] font-medium leading-tight sm:text-[32px]">
          {formatSalutation()}
          {prenom ? `, ${prenom}` : ""} <span aria-hidden="true">👋</span>
        </h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-navy/60">
          Ma journée
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-violet/10 px-2 py-0.5 text-[11px] font-semibold text-brand-violet">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-brand-violet to-brand-rose" />
            {formatDateDuJour()}
          </span>
        </p>

        {tournee ? (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4">
            <CarteInformation label="Patients" value={tournee.nbPatients} />
            <CarteInformation label="Injections" value={tournee.nbInjections} />
            <CarteInformation label="Pansements" value={tournee.nbPansements} />
            <CarteInformation label="Glycémies" value={tournee.nbGlycemies} />
          </div>
        ) : (
          <p className="mt-8 text-navy/60">Aucune tournée enregistrée pour aujourd&apos;hui.</p>
        )}

        {tournee && (
          <div className="mt-8">
            <p className="mb-3 text-[12.5px] font-bold uppercase tracking-wider text-navy/45">
              Missions du jour
            </p>
            {missions.length > 0 ? (
              <div className="flex flex-col gap-3">
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
            )}
          </div>
        )}
      </div>
    </main>
  );
}
