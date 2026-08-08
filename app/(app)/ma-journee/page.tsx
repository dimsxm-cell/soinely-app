import Image from "next/image";
import { createClient, getUtilisateurConnecte } from "@/lib/supabase/server";
import { formaterNomPropre } from "@/lib/format";
import { getMissionEnCoursHref, getMissionsDuJour, getTourneeDuJour } from "@/lib/data/ma-journee";
import { reorganiserTourneeAction } from "@/lib/data/reorganisation-tournee";
import { formatDateDuJour, formatSalutation } from "@/lib/accueil-vue";
import { EnTeteAccueil } from "@/components/ui/EnTeteAccueil";
import { CarteMission } from "@/components/ui/CarteMission";
import { FormulaireAvecRetour } from "@/components/ui/FormulaireAvecRetour";
import { getMaterielDuJour } from "@/lib/data/materiel";
import { CarteMateriel } from "@/components/ui/CarteMateriel";

export default async function MaJourneePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const requete = (q ?? "").trim();

  const supabase = await createClient();
  const user = await getUtilisateurConnecte();

  const nomComplet = user?.user_metadata?.full_name as string | undefined;
  const prenom = nomComplet ? formaterNomPropre(nomComplet).split(" ")[0] : undefined;

  const tournee = user ? await getTourneeDuJour(supabase, user.id) : null;
  const [missions, contexte, materiel] = tournee
    ? await Promise.all([
        getMissionsDuJour(supabase, tournee.id),
        getMissionEnCoursHref(supabase, tournee.id),
        getMaterielDuJour(supabase, tournee.id),
      ])
    : [[], null, []];

  const missionsVisibles = requete
    ? missions.filter((m) => m.patientNom.toLowerCase().includes(requete.toLowerCase()))
    : missions;
  const missionsRestantes = missions.filter((m) => m.statut !== "terminee").length;
  const missionsAFaire = missions.filter((m) => m.statut === "a_faire").length;

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      {tournee ? (
        <EnTeteAccueil prenom={prenom} missions={missions} />
      ) : (
        <div className="mx-auto w-full max-w-2xl px-6 py-6 sm:py-10">
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">
              {formatSalutation()}
              {prenom ? `, ${prenom}` : ""}
            </h1>
            <Image
              src="/marketing/ely-nouveau-portrait.webp"
              alt="ELY"
              width={379}
              height={231}
              className="h-[52px] w-[52px] shrink-0 object-contain"
              priority
            />
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-[15px] text-navy/50">
            Accueil
            <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-brand-violet/[0.12] px-2.5 py-1 text-[12.5px] font-semibold text-brand-violet">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand-violet" />
              {formatDateDuJour()}
            </span>
          </div>
          <div className="mt-8 flex items-center gap-4">
            <Image
              src="/marketing/ely-nouveau-portrait.webp"
              alt=""
              width={379}
              height={231}
              className="h-16 w-16 shrink-0 object-contain"
            />
            <p className="text-navy/60">Aucune tournée enregistrée pour aujourd&apos;hui.</p>
          </div>
        </div>
      )}

      {tournee && (
        <div className="mx-auto w-full max-w-2xl px-6 py-6 sm:py-10">
          <form method="GET">
            <input
              type="search"
              name="q"
              defaultValue={requete}
              placeholder="Rechercher un patient..."
              aria-label="Rechercher un patient dans les missions du jour"
              className="min-h-[48px] w-full rounded-[14px] border border-[#e4e0ea] bg-[#faf9fc] px-4 text-[15px] text-navy placeholder:text-navy/40 focus:border-[#a855f7] focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-[rgba(168,85,247,.16)]"
            />
          </form>

          {materiel.length > 0 && (
            <CarteMateriel
              items={materiel}
              tourneeId={tournee.id}
              prepare={tournee.materielPrepare}
              verifie={tournee.materielVerifie}
            />
          )}

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

            {missionsAFaire >= 2 && (
              <FormulaireAvecRetour
                action={reorganiserTourneeAction}
                messageSucces="Tournée réorganisée."
                className="mt-3 flex flex-col items-start gap-1.5"
              >
                <input type="hidden" name="tourneeId" value={tournee.id} />
                <button
                  type="submit"
                  className="btn-glace rounded-[12px] bg-brand-violet/10 px-4 py-2.5 text-[13.5px] font-semibold text-brand-violet"
                >
                  Réorganiser ma tournée
                </button>
              </FormulaireAvecRetour>
            )}

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
        </div>
      )}
    </main>
  );
}
