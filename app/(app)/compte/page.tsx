import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAbonnement } from "@/lib/data/abonnement";
import { createBillingPortalSessionAction } from "@/lib/data/abonnement-actions";
import { signOutAction } from "@/app/login/actions";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const abonnement = await getAbonnement(supabase, user.id);
  const nom = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "";

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto w-full max-w-[560px] px-6 py-14 sm:py-20">
        <Link href="/ma-journee" className="text-sm font-medium text-primary hover:underline">
          ‹ Ma journée
        </Link>

        <h1 className="mt-6 font-display text-[28px] font-medium leading-tight sm:text-[32px]">
          Mon compte
        </h1>

        <div className="mt-8 flex flex-col gap-5">
          <section className="rounded-[20px] border border-navy/10 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,.04),0_18px_40px_rgba(15,23,42,.06)]">
            <p className="text-[12.5px] font-bold uppercase tracking-wider text-navy/45">Profil</p>
            <p className="mt-2 text-[15px] font-semibold text-navy">{nom}</p>
            <p className="text-sm text-navy/60">{user.email}</p>
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
                      className="rounded-full border border-navy/20 bg-white px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-navy/5"
                    >
                      Gérer mon abonnement
                    </button>
                  </form>
                )}
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-navy/60">Aucun abonnement actif.</p>
                <Link
                  href="/abonnement"
                  className="mt-4 inline-flex items-center justify-center rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-[#F6F7F5] transition-colors hover:bg-navy/90"
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
