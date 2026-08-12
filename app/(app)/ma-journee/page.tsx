import Image from "next/image";
import Link from "next/link";
import { createClient, getUtilisateurConnecte } from "@/lib/supabase/server";
import { formaterNomPropre } from "@/lib/format";
import { getMissionEnCoursHref, getMissionsDuJour, getTourneeDuJour } from "@/lib/data/ma-journee";
import { getAvatarUrl } from "@/lib/data/profil";
import { reorganiserTourneeAction } from "@/lib/data/reorganisation-tournee";
import {
  formatDateDuJour,
  prochaineActionAccueil,
} from "@/lib/accueil-vue";
import { FormulaireAvecRetour } from "@/components/ui/FormulaireAvecRetour";
import { getMaterielDuJour } from "@/lib/data/materiel";
import { updateMissionStatutAction } from "@/lib/data/ma-journee-actions";
import { EnTeteAccueilNouveau } from "@/components/ui/EnTeteAccueilNouveau";
import { CarteProgressionTournee } from "@/components/ui/CarteProgressionTournee";
import { ActionsRapidesAccueil } from "@/components/ui/ActionsRapidesAccueil";
import { BoutonElyAccueil } from "@/components/ui/BoutonElyAccueil";
import { ListeMissionsAccueil } from "@/components/ui/ListeMissionsAccueil";
import { LiensRapidesAccueil } from "@/components/ui/LiensRapidesAccueil";

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

  const missionsAFaire = missions.filter((m) => m.statut === "a_faire").length;
  const actionRapide = tournee ? prochaineActionAccueil(missions) : null;

  return (
    <main
      className="min-h-screen"
      style={{ background: "#f6f4fa", fontFamily: "var(--font-sans, system-ui)", color: "#1d1d1f" }}
    >
      {/* ─── En-tête : Salutation + Avatar + Réglages ─── */}
      <EnTeteAccueilNouveau
        prenom={prenom}
        nomComplet={nomComplet}
        avatarUrl={avatarUrl}
      />

      {/* ─── Contenu scrollable ─── */}
      <div className="mx-auto w-full max-w-2xl px-5 pb-32">
        {tournee ? (
          <>
            {/* Carte héro : progression tournée */}
            <CarteProgressionTournee missions={missions} />

            {/* Grille 4 actions rapides */}
            <ActionsRapidesAccueil missions={missions} tourneeId={tournee.id} />

            {/* Bouton Demandez à Ely */}
            <BoutonElyAccueil missions={missions} />

            {/* Section : Missions du jour */}
            <div className="mt-[22px] mb-[10px] flex items-baseline justify-between gap-3 px-0.5">
              <h1
                style={{
                  fontFamily: "var(--font-display, Georgia, serif)",
                  fontSize: "17px",
                  fontWeight: 700,
                  letterSpacing: "-0.5px",
                  color: "#231f2e",
                  margin: 0,
                }}
              >
                Missions du jour
              </h1>
              <Link
                href="/ma-tournee"
                className="flex min-h-[44px] items-center px-2 transition-opacity hover:opacity-70"
                style={{
                  fontSize: "12.5px",
                  fontWeight: 650,
                  letterSpacing: "-0.2px",
                  color: "#6d28d9",
                  textDecoration: "none",
                }}
              >
                Tout voir
              </Link>
            </div>

            {/* Bouton réorganiser (si ≥ 2 missions à faire) */}
            {missionsAFaire >= 2 && (
              <FormulaireAvecRetour
                action={reorganiserTourneeAction}
                messageSucces="Tournée réorganisée."
                className="mb-3 flex flex-col items-start"
              >
                <input type="hidden" name="tourneeId" value={tournee.id} />
                <button
                  type="submit"
                  style={{
                    borderRadius: "12px",
                    background: "rgba(109,40,217,.1)",
                    padding: "8px 16px",
                    fontSize: "13.5px",
                    fontWeight: 600,
                    color: "#6d28d9",
                    border: 0,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Réorganiser ma tournée
                </button>
              </FormulaireAvecRetour>
            )}

            {/* Liste des missions */}
            <ListeMissionsAccueil missions={missions} contexteHref={contexte} />

            {/* Liens rapides : Matériel, Patients, Ressources */}
            <LiensRapidesAccueil missions={missions} materiel={materiel} />
          </>
        ) : (
          /* ─── État vide : aucune tournée ─── */
          <div className="mt-6">
            {/* Carte vide avec message */}
            <div
              style={{
                borderRadius: "20px",
                background: "#fff",
                padding: "32px 24px",
                textAlign: "center",
                boxShadow: "0 1px 3px rgba(15,23,42,.06)",
              }}
            >
              <Image
                src="/marketing/ely-colibri-rassurant.webp"
                alt=""
                width={297}
                height={301}
                className="mx-auto mb-4 h-20 w-20 object-contain"
              />
              <p
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#231f2e",
                  marginBottom: "8px",
                }}
              >
                Aucune tournée pour aujourd&apos;hui
              </p>
              <p style={{ fontSize: "13.5px", color: "#8d8798", lineHeight: 1.5 }}>
                Vos missions apparaîtront ici dès qu&apos;une tournée sera planifiée.
              </p>
            </div>

            {/* Date + badge */}
            <div
              className="mt-4 flex items-center gap-2"
              style={{ fontSize: "15px", color: "rgba(35,31,46,.5)" }}
            >
              Accueil
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  borderRadius: "10px",
                  background: "rgba(109,40,217,.12)",
                  padding: "4px 10px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#6d28d9",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "9999px",
                    background: "#6d28d9",
                    flexShrink: 0,
                  }}
                />
                {formatDateDuJour()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Bouton flottant : action rapide (Démarrer / Terminer) ─── */}
      {tournee && actionRapide && (
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-10 mx-auto w-full max-w-2xl px-4">
          <FormulaireAvecRetour action={updateMissionStatutAction} messageSucces="Passage mis à jour.">
            <input type="hidden" name="missionId" value={actionRapide.missionId} />
            <input type="hidden" name="nouveauStatut" value={actionRapide.nouveauStatut} />
            <button
              type="submit"
              style={{
                display: "flex",
                minHeight: "52px",
                width: "100%",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                borderRadius: "16px",
                background: "linear-gradient(135deg,#6d28d9,#a855f7)",
                padding: "0 16px",
                fontSize: "15px",
                fontWeight: 700,
                color: "#fff",
                border: 0,
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: "0 14px 28px -12px rgba(109,40,217,.9)",
              }}
            >
              {actionRapide.label}
            </button>
          </FormulaireAvecRetour>
        </div>
      )}
    </main>
  );
}
