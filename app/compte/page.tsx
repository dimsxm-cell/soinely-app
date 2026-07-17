import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAbonnement } from "@/lib/data/abonnement";
import { createBillingPortalSessionAction } from "@/lib/data/abonnement-actions";
import { signOutAction } from "@/app/login/actions";
import { Button } from "@/components/ui/Button";
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
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <Link href="/ma-journee" className="text-primary hover:underline">
          ‹ Ma journée
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-navy">Mon compte</h1>
      </div>

      <section className="rounded-card border border-navy/10 bg-white p-6">
        <p className="text-xs font-medium uppercase text-navy/60">Profil</p>
        <p className="mt-1 text-navy">{nom}</p>
        <p className="text-sm text-navy/60">{user.email}</p>
      </section>

      <section className="rounded-card border border-navy/10 bg-white p-6">
        <p className="text-xs font-medium uppercase text-navy/60">Abonnement</p>
        {abonnement ? (
          <>
            <p className="mt-1 text-navy">
              {PLAN_LABEL[abonnement.plan]} · {STATUT_LABEL[abonnement.statut]}
            </p>
            {abonnement.statut === "essai" && abonnement.essaiFin && (
              <p className="mt-1 text-sm text-navy/60">Essai jusqu&apos;au {formatDate(abonnement.essaiFin)}</p>
            )}
            {abonnement.statut === "actif" && abonnement.periodeFin && (
              <p className="mt-1 text-sm text-navy/60">
                Prochaine facturation le {formatDate(abonnement.periodeFin)}
              </p>
            )}
            {abonnement.statut === "impaye" && (
              <p className="mt-1 text-sm text-danger">
                Le dernier paiement a échoué — mettez à jour votre moyen de paiement pour garder l&apos;accès.
              </p>
            )}
            {abonnement.statut === "annule" && (
              <p className="mt-1 text-sm text-navy/60">Votre abonnement est annulé.</p>
            )}
            {abonnement.stripeCustomerId && (
              <form action={createBillingPortalSessionAction} className="mt-3">
                <Button type="submit" variant="secondary">
                  Gérer mon abonnement
                </Button>
              </form>
            )}
          </>
        ) : (
          <>
            <p className="mt-1 text-navy/60">Aucun abonnement actif.</p>
            <Link href="/abonnement" className="mt-3 inline-block">
              <Button variant="primary">Choisir une offre</Button>
            </Link>
          </>
        )}
      </section>

      <form action={signOutAction}>
        <Button type="submit" variant="tertiary">
          Se déconnecter
        </Button>
      </form>
    </main>
  );
}
