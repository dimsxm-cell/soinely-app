import Image from "next/image";
import { createClient, getUtilisateurConnecte } from "@/lib/supabase/server";
import { formaterNomPropre } from "@/lib/format";
import { getMissionEnCoursHref, getMissionsDuJour, getTourneeDuJour } from "@/lib/data/ma-journee";
import { getAvatarUrl } from "@/lib/data/profil";
import { reorganiserTourneeAction } from "@/lib/data/reorganisation-tournee";
import {
  compterMissionsAccueil,
  conseilEly,
  formatDateDuJour,
  formatSalutation,
  prochaineActionAccueil,
} from "@/lib/accueil-vue";
import { EnTeteAccueil } from "@/components/ui/EnTeteAccueil";
import { CarteMission } from "@/components/ui/CarteMission";
import { FormulaireAvecRetour } from "@/components/ui/FormulaireAvecRetour";
import { getMaterielDuJour } from "@/lib/data/materiel";
import { CarteMateriel } from "@/components/ui/CarteMateriel";
import { updateMissionStatutAction } from "@/lib/data/ma-journee-actions";

export default async function MaJourneePage() {
  const supabase = await createClient();
  const user = await getUtilisateurConnecte();

  const nomComplet = user?.user_metadata?.full_name as string | undefined;
  const prenom = nomComplet ? formaterNomPropre(nomComplet).split(" ")[0] : undefined;
  const avatarPath = user?.user_metadata?.avatar_path as string | undefined;
  const avatarUrl = avatarPath ? await getAvatarUrl(supabase, avatarPath) : null;

  const tournee = user ? await getTourneeDuJour(supabase, user.id) : null;
  const [missions, contexte, materiel] = tournee
    ? await Promise.all([
        getMissionsDuJour(supabase, tournee.id),
        getMissionEnCoursHref(supabase, tournee.id),
        getMaterielDuJour(supabase, tournee.id),
      ])
    : [[], null, []];

  const { restantes: missionsRestantes } = compterMissionsAccueil(missions);
  const missionsAFaire = missions.filter((m) => m.statut === "a_faire").length;
  const conseil = tournee ? conseilEly(missions) : null;
  const actionRapide = tournee ? prochaineActionAccueil(missions) : null;

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      {tournee ? (
        <EnTeteAccueil prenom={prenom} missions={missions} avatarUrl={avatarUrl} />
      ) : (
        <div className="mx-auto w-full max-w-2xl px-6 py-6 sm:py-10">
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">
              {formatSalutation()}
              {prenom ? `, ${prenom}` : ""}
            </h1>
            <Image
              src="/marketing/ely-colibri-heureux.webp"
              alt="ELY"
              width={323}
              height={304}
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
              src="/marketing/ely-colibri-rassurant.webp"
              alt=""
              width={297}
              height={301}
              className="h-16 w-16 shrink-0 object-contain"
            />
            <p className="text-navy/60">Aucune tournée enregistrée pour aujourd&apos;hui.</p>
          </div>
        </div>
      )}

      {tournee && (
        <div className="mx-auto w-full max-w-2xl px-6 py-6 sm:py-10">
          {conseil && (
            <div className="mt-4 flex items-start gap-2.5 rounded-[16px] border border-[rgba(168,85,247,.26)] bg-[linear-gradient(140deg,rgba(168,85,247,.13),rgba(109,40,217,.05))] px-3.5 py-3">
              <Image
                src="/marketing/ely-colibri-reflechi.webp"
                alt=""
                width={293}
                height={337}
                className="h-7 w-7 shrink-0 rounded-full border border-[rgba(168,85,247,.3)] bg-white object-contain"
              />
              <p className="text-[12.5px] leading-relaxed text-[#4b4359]">{conseil}</p>
            </div>
          )}

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

            {missions.length > 0 ? (
              <div className="mt-3 flex flex-col gap-3">
                {missions.map((mission, index) => (
                  <CarteMission
                    key={mission.id}
                    mission={mission}
                    contexteHref={mission.id === contexte?.missionId ? contexte.href : undefined}
                    estDerniere={index === missions.length - 1}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-6 text-center text-navy/60">Aucune mission prévue pour aujourd&apos;hui.</p>
            )}
          </div>
        </div>
      )}

      {tournee && actionRapide && (
        <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-10 mx-auto max-w-2xl px-4">
          <FormulaireAvecRetour action={updateMissionStatutAction} messageSucces="Passage mis à jour.">
            <input type="hidden" name="missionId" value={actionRapide.missionId} />
            <input type="hidden" name="nouveauStatut" value={actionRapide.nouveauStatut} />
            <button
              type="submit"
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,#6d28d9,#a855f7)] px-4 text-[15px] font-bold text-white shadow-[0_14px_28px_-12px_rgba(109,40,217,.9)]"
            >
              {actionRapide.label}
            </button>
          </FormulaireAvecRetour>
        </div>
      )}
    </main>
  );
}
