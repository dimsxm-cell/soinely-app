import { createCheckoutSessionAction } from "@/lib/data/abonnement-actions";
import { Button } from "@/components/ui/Button";

const PLANS = [
  {
    id: "solo",
    nom: "Solo",
    prix: "19€/mois",
    description: "Pour une IDEL indépendante.",
  },
  {
    id: "cabinet",
    nom: "Cabinet",
    prix: "39€/mois",
    description: "Pour un cabinet infirmier IDEL.",
  },
] as const;

export default function AbonnementPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Choisissez votre offre</h1>
        <p className="mt-1 text-navy/60">14 jours d&apos;essai gratuit, sans engagement.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PLANS.map((plan) => (
          <div key={plan.id} className="flex flex-col gap-3 rounded-card border border-navy/10 bg-white p-6">
            <div>
              <p className="text-lg font-semibold text-navy">{plan.nom}</p>
              <p className="text-2xl font-semibold text-navy">{plan.prix}</p>
              <p className="mt-1 text-sm text-navy/60">{plan.description}</p>
            </div>
            <form action={createCheckoutSessionAction}>
              <input type="hidden" name="plan" value={plan.id} />
              <Button type="submit" className="w-full">
                Commencer l&apos;essai gratuit
              </Button>
            </form>
          </div>
        ))}
      </div>
    </main>
  );
}
