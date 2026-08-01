import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getUtilisateurConnecte } from "@/lib/supabase/server";
import { formaterNomPropre } from "@/lib/format";
import { determinerZone } from "@/lib/zone-tarifaire";
import { getAbonnement, getJoursRestantsEssaiGratuit } from "@/lib/data/abonnement";
import { createBillingPortalSessionAction } from "@/lib/data/abonnement-actions";
import { getAvatarUrl } from "@/lib/data/profil";
import { enregistrerCabinetAction, uploadAvatarAction } from "@/lib/data/profil-actions";
import { signOutAction } from "@/app/login/actions";
import { BasculeEcoutePermanenteEly } from "@/components/ui/BasculeEcoutePermanenteEly";
import { Button } from "@/components/ui/Button";
import { ChampFichier } from "@/components/ui/ChampFichier";
import type { PlanAbonnement, StatutAbonnement } from "@/lib/types/abonnement";

const PLAN_LABEL: Record<PlanAbonnement, string> = {
  solo: "Solo",
  cabinet: "Cabinet",
};

const STATUT_LABEL: Record<StatutAbonnement, string> = {
  essai: "Essai gratuit",
  actif: "Actif",
  impaye: "Paiement en échec",
  annule: "Annulé",
};

const STATUT_BADGE: Record<StatutAbonnement, string> = {
  essai: "bg-teal/10 text-[#0E7E70]",
  actif: "bg-teal/10 text-[#0E7E70]",
  impaye: "bg-danger/10 text-danger",
  annule: "bg-navy/5 text-navy/50",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default async function ComptePage() {
  const supabase = await createClient();
  const user = await getUtilisateurConnecte();

  if (!user) {
    redirect("/login");
  }

  const nomBrut = user.user_metadata?.full_name as string | undefined;
  const nom = nomBrut ? formaterNomPropre(nomBrut) : user.email ?? "";
  const avatarPath = user.user_metadata?.avatar_path as string | undefined;
  const [abonnement, avatarUrl, profil] = await Promise.all([
    getAbonnement(supabase, user.id),
    avatarPath ? getAvatarUrl(supabase, avatarPath) : Promise.resolve(null),
    supabase.from("profiles").select("code_postal, adresse_cabinet, cabinet_latitude").eq("id", user.id).maybeSingle(),
  ]);
  const codePostal = profil.data?.code_postal ?? "";
  const adresseCabinet = profil.data?.adresse_cabinet ?? "";
  const cabinetSitue = profil.data?.cabinet_latitude !== null && profil.data?.cabinet_latitude !== undefined;
  const zone = determinerZone(codePostal);
  const joursRestantsEssai = abonnement ? 0 : getJoursRestantsEssaiGratuit(user.created_at);
  const ecoutePermanenteActivee = Boolean(user.user_metadata?.ecoute_permanente_ely);

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto w-full max-w-[560px] px-6 py-14 sm:py-20">
        <h1 className="font-display text-[28px] font-medium leading-tight sm:text-[32px]">Mon compte</h1>

        <div className="mt-8 flex flex-col gap-5">
          <section className="rounded-[20px] border border-navy/10 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,.04),0_18px_40px_rgba(15,23,42,.06)]">
            <p className="text-[12.5px] font-bold uppercase tracking-wider text-navy/45">Profil</p>
            <div className="mt-3 flex items-center gap-4">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL signée à courte durée de vie, incompatible avec le cache de next/image
                <img
                  src={avatarUrl}
                  alt="Photo de profil"
                  className="h-16 w-16 shrink-0 rounded-full object-cover ring-[3px] ring-brand-violet/70 ring-offset-2 ring-offset-white shadow-[0_2px_8px_rgba(124,58,237,.22)]"
                />
              ) : (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-violet/[0.12] text-[22px] font-semibold text-brand-violet ring-[3px] ring-brand-violet/70 ring-offset-2 ring-offset-white">
                  {nom.charAt(0).toLocaleUpperCase("fr-FR") || "?"}
                </span>
              )}
              <div>
                <p className="text-[15px] font-semibold text-navy">{nom}</p>
                <p className="text-sm text-navy/60">{user.email}</p>
              </div>
            </div>
            <form action={uploadAvatarAction} className="mt-4 flex flex-wrap items-center gap-3">
              <ChampFichier
                name="photo"
                accept="image/*"
                ariaLabel="Changer la photo de profil"
                libelle="Choisir une photo"
              />
              <Button type="submit" variant="tertiary" className="!min-h-0 shrink-0 !px-0 !py-0">
                Enregistrer
              </Button>
            </form>
          </section>

          <section className="rounded-[20px] border border-navy/10 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,.04),0_18px_40px_rgba(15,23,42,.06)]">
            <p className="text-[12.5px] font-bold uppercase tracking-wider text-navy/45">
              Mon cabinet
            </p>
            <p className="mt-2 text-sm text-navy/60">
              Le code postal fixe vos tarifs NGAP, plus élevés outre-mer. L&apos;adresse sert de
              point de départ au calcul de vos kilomètres.
            </p>
            <form action={enregistrerCabinetAction} className="mt-4 flex flex-col gap-3">
              <div>
                <label htmlFor="adresseCabinet" className="block text-[13px] text-navy/55">
                  Adresse
                </label>
                <input
                  id="adresseCabinet"
                  name="adresseCabinet"
                  type="text"
                  defaultValue={adresseCabinet}
                  placeholder="15 rue Schoelcher, 97110 Pointe-à-Pitre"
                  className="mt-1 w-full rounded-[12px] border border-navy/15 bg-white px-3 py-2 text-[15px] text-navy placeholder:text-navy/30 focus:border-brand-violet focus:outline-none focus:ring-2 focus:ring-brand-violet/30"
                />
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label htmlFor="codePostal" className="block text-[13px] text-navy/55">
                    Code postal
                  </label>
                  <input
                    id="codePostal"
                    name="codePostal"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{5}"
                    maxLength={5}
                    defaultValue={codePostal}
                    placeholder="97110"
                    className="mt-1 w-[110px] rounded-[12px] border border-navy/15 bg-white px-3 py-2 text-[15px] tabular-nums text-navy placeholder:text-navy/30 focus:border-brand-violet focus:outline-none focus:ring-2 focus:ring-brand-violet/30"
                  />
                </div>
                <Button type="submit" variant="tertiary" className="!min-h-0 shrink-0 !px-0 !py-0 pb-2.5">
                  Enregistrer
                </Button>
              </div>
            </form>
            <p className="mt-3 text-[13px] text-navy/50">
              {codePostal
                ? `Grille appliquée : ${zone === "dom" ? "départements d'outre-mer" : "métropole"}.`
                : "Sans code postal, la grille métropole s'applique."}
              {adresseCabinet && !cabinetSitue && (
                <span className="text-danger">
                  {" "}
                  Adresse non localisée : vos kilomètres ne seront pas comptés. Vérifiez sa
                  rédaction.
                </span>
              )}
            </p>
          </section>

          <section className="rounded-[20px] border border-navy/10 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,.04),0_18px_40px_rgba(15,23,42,.06)]">
            <p className="text-[12.5px] font-bold uppercase tracking-wider text-navy/45">Patients</p>
            <p className="mt-2 text-sm text-navy/60">
              Créez et gérez vos fiches patients, visibles ensuite dans votre tournée du jour.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/patients/nouveau"
                className="btn-glace inline-flex items-center justify-center rounded-[12px] bg-gradient-to-r from-brand-violet to-brand-rose px-5 py-2.5 text-sm font-semibold text-white"
              >
                Ajouter un patient
              </Link>
              <Link
                href="/patients"
                className="inline-flex items-center justify-center btn-glace-clair rounded-[12px] border border-navy/20 bg-white px-5 py-2.5 text-sm font-semibold text-navy"
              >
                Voir mes patients
              </Link>
            </div>
          </section>

          <section className="rounded-[20px] border border-navy/10 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,.04),0_18px_40px_rgba(15,23,42,.06)]">
            <p className="text-[12.5px] font-bold uppercase tracking-wider text-navy/45">Copilote vocal</p>
            <p className="mt-2 text-sm text-navy/60">
              Active l&apos;écoute permanente pour dire « Dis-moi Ely » sans les mains, où que tu sois dans
              l&apos;app. Fonctionne uniquement sur Android/Chrome. Le micro reste actif tant que l&apos;app
              est ouverte à l&apos;écran.
            </p>
            <div className="mt-4">
              <BasculeEcoutePermanenteEly activeParDefaut={ecoutePermanenteActivee} />
            </div>
          </section>

          <section className="rounded-[20px] border border-navy/10 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,.04),0_18px_40px_rgba(15,23,42,.06)]">
            <p className="text-[12.5px] font-bold uppercase tracking-wider text-navy/45">Abonnement</p>
            {abonnement ? (
              <>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-navy">{PLAN_LABEL[abonnement.plan]}</span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${STATUT_BADGE[abonnement.statut]}`}
                  >
                    {STATUT_LABEL[abonnement.statut]}
                  </span>
                </div>
                {abonnement.statut === "essai" && abonnement.essaiFin && (
                  <p className="mt-2 text-sm text-navy/60">Essai jusqu&apos;au {formatDate(abonnement.essaiFin)}</p>
                )}
                {abonnement.statut === "actif" && abonnement.periodeFin && (
                  <p className="mt-2 text-sm text-navy/60">
                    Prochaine facturation le {formatDate(abonnement.periodeFin)}
                  </p>
                )}
                {abonnement.statut === "impaye" && (
                  <p className="mt-2 text-sm text-danger">
                    Le dernier paiement a échoué — mettez à jour votre moyen de paiement pour garder l&apos;accès.
                  </p>
                )}
                {abonnement.statut === "annule" && (
                  <p className="mt-2 text-sm text-navy/60">Votre abonnement est annulé.</p>
                )}
                {abonnement.stripeCustomerId && (
                  <form action={createBillingPortalSessionAction} className="mt-4">
                    <button
                      type="submit"
                      className="btn-glace-clair rounded-[12px] border border-navy/20 bg-white px-5 py-2.5 text-sm font-semibold text-navy"
                    >
                      Gérer mon abonnement
                    </button>
                  </form>
                )}
              </>
            ) : joursRestantsEssai > 0 ? (
              <>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-navy">Essai gratuit</span>
                  <span className="rounded-full bg-teal/10 px-2.5 py-1 text-[11.5px] font-semibold text-[#0E7E70]">
                    {joursRestantsEssai} jour{joursRestantsEssai > 1 ? "s" : ""} restant
                    {joursRestantsEssai > 1 ? "s" : ""}
                  </span>
                </div>
                <p className="mt-2 text-sm text-navy/60">
                  Aucune carte requise pendant l&apos;essai. Choisissez une offre quand vous êtes prête.
                </p>
                <Link
                  href="/abonnement"
                  className="mt-4 inline-flex items-center justify-center btn-glace-clair rounded-[12px] border border-navy/20 bg-white px-5 py-2.5 text-sm font-semibold text-navy"
                >
                  Choisir une offre
                </Link>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-navy/60">Votre essai gratuit est terminé.</p>
                <Link
                  href="/abonnement"
                  className="btn-glace mt-4 inline-flex items-center justify-center rounded-[12px] bg-gradient-to-r from-brand-violet to-brand-rose px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Choisir une offre
                </Link>
              </>
            )}
          </section>
        </div>

        <form action={signOutAction} className="mt-8">
          <button
            type="submit"
            className="text-sm font-medium text-navy/60 transition-colors hover:text-navy hover:underline"
          >
            Se déconnecter
          </button>
        </form>
      </div>
    </main>
  );
}
