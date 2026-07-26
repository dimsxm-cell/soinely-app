import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { formaterNomPropre } from "@/lib/format";
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

export default async function MaJourneePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const requete = (q ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nomComplet = user?.user_metadata?.full_name as string | undefined;
  const prenom = nomComplet ? formaterNomPropre(nomComplet).split(" ")[0] : undefined;

  const tournee = user ? await getTourneeDuJour(supabase, user.id) : null;
  const missions = tournee ? await getMissionsDuJour(supabase, tournee.id) : [];
  const contexte = tournee ? await getMissionEnCoursHref(supabase, tournee.id) : null;

  const missionsVisibles = requete
    ? missions.filter((m) => m.patientNom.toLowerCase().includes(requete.toLowerCase()))
    : missions;
  const missionsRestantes = missions.filter((m) => m.statut !== "terminee").length;

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto w-full max-w-2xl px-6 py-6 sm:py-10">
        <div className="flex items-center gap-2.5">
          <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">
            {formatSalutation()}
            {prenom ? `, ${prenom}` : ""}
          </h1>
          <Image
            src="/app/ely-mascot.png"
            alt="ELY"
            width={340}
            height={454}
            className="ely-float h-[46px] w-auto object-contain drop-shadow-[0_4px_10px_rgba(124,58,237,0.28)]"
          />
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-[15px] text-navy/50">
          Ma journée
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-violet/[0.12] px-2.5 py-1 text-[12.5px] font-semibold text-brand-violet">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand-violet" />
            {formatDateDuJour()}
          </span>
        </div>

        <form method="GET" className="mt-4">
          <input
            type="search"
            name="q"
            defaultValue={requete}
            placeholder="Rechercher un patient..."
            aria-label="Rechercher un patient dans les missions du jour"
            className="min-h-[48px] w-full rounded-[14px] border border-navy/10 bg-white px-4 text-[15px] text-navy placeholder:text-navy/40"
          />
        </form>

        {tournee ? (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <CarteInformation label="Patients" value={tournee.nbPatients} />
            <CarteInformation label="Injections" value={tournee.nbInjections} accentuee />
            <CarteInformation label="Pansements" value={tournee.nbPansements} accentuee />
            <CarteInformation label="Glycémies" value={tournee.nbGlycemies} accentuee />
          </div>
        ) : (
          <p className="mt-8 text-navy/60">Aucune tournée enregistrée pour aujourd&apos;hui.</p>
        )}

        {tournee && (
          <div className="mt-7">
            <div className="flex items-baseline justify-between">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-navy/45">
                Missions du jour
              </p>
              <p className="text-[12.5px] text-navy/45">
                {missionsRestantes > 0
                  ? `${missionsRestantes} restante${missionsRestantes > 1 ? "s" : ""}`
                  : "Tout est fait"}
              </p>
            </div>

            {missionsVisibles.length > 0 ? (
              <div className="mt-3 flex flex-col gap-3">
                {missionsVisibles.map((mission, index) => (
                  <CarteMission
                    key={mission.id}
                    mission={mission}
                    contexteHref={mission.id === contexte?.missionId ? contexte.href : undefined}
                    estDerniere={index === missionsVisibles.length - 1}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-6 text-center text-navy/60">
                {requete ? "Aucun patient ne correspond." : "Aucune mission prévue pour aujourd'hui."}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
