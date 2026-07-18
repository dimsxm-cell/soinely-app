import Link from "next/link";
import { createCheckoutSessionAction } from "@/lib/data/abonnement-actions";

const PLANS = [
  {
    id: "solo",
    nom: "Solo",
    prix: 19,
    description: "Pour une IDEL indépendante qui gère sa tournée seule.",
    note: null,
  },
  {
    id: "cabinet",
    nom: "Cabinet",
    prix: 39,
    description: "Pour un cabinet infirmier IDEL.",
    note: "Chaque infirmière du cabinet crée son propre compte pour le moment — le partage entre comptes arrive plus tard.",
  },
] as const;

const INCLUS = [
  {
    titre: "Transmission toujours sous les yeux",
    detail: "La note laissée à la visite précédente s'affiche dès l'ouverture de la fiche, avant même de sonner.",
  },
  {
    titre: "Rappels remontés au bon moment",
    detail: "Une consigne notée aujourd'hui remonte toute seule à la prochaine visite de ce patient.",
  },
  {
    titre: "Photos de suivi comparées",
    detail: "L'évolution d'une plaie d'une visite à l'autre, en un coup d'œil — sans la décrire de mémoire.",
  },
  {
    titre: "Patient suivant en un tap",
    detail: "Un tap en fin de visite ouvre directement la fiche suivante de la tournée.",
  },
];

export default function AbonnementPage() {
  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto w-full max-w-[720px] px-6 py-14 sm:py-20">
        <Link href="/compte" className="text-sm font-medium text-primary hover:underline">
          ‹ Mon compte
        </Link>

        <div className="mt-8 text-center">
          <p className="mb-3 text-[12.5px] font-bold uppercase tracking-wider text-[#0E7E70]">
            Essai gratuit 14 jours
          </p>
          <h1 className="text-balance font-display text-[32px] font-medium leading-tight sm:text-[38px]">
            Choisissez votre offre
          </h1>
          <p className="mx-auto mt-3.5 max-w-[42ch] text-base leading-relaxed text-navy/70">
            Sans engagement. Annulez à tout moment depuis votre compte.
          </p>
        </div>

        <ul className="mx-auto mt-9 grid max-w-[560px] grid-cols-1 gap-x-7 gap-y-5 sm:grid-cols-2">
          {INCLUS.map((item) => (
            <li key={item.titre} className="flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/10 text-[11px] text-[#0E7E70]"
              >
                ✓
              </span>
              <div>
                <p className="text-sm font-semibold text-navy">{item.titre}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-navy/60">{item.detail}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-11 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-col rounded-[20px] border border-navy/10 bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,.04),0_18px_40px_rgba(15,23,42,.06)]"
            >
              <p className="text-[13px] font-bold uppercase tracking-wider text-navy/45">{plan.nom}</p>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-[34px] font-medium">{plan.prix}€</span>
                <span className="text-sm text-navy/50">/mois</span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-navy/70">{plan.description}</p>
              {plan.note && (
                <p className="mt-2 text-[12.5px] leading-relaxed text-navy/45">{plan.note}</p>
              )}
              <form action={createCheckoutSessionAction} className="mt-auto pt-6">
                <input type="hidden" name="plan" value={plan.id} />
                <button
                  type="submit"
                  className="flex w-full items-center justify-center rounded-full bg-navy px-5 py-3.5 text-[15px] font-semibold text-[#F6F7F5] transition-colors hover:bg-navy/90"
                >
                  Commencer l&apos;essai gratuit
                </button>
              </form>
              <p className="mt-3 text-center text-[12px] text-navy/45">
                Carte bancaire requise, aucun prélèvement avant la fin de l&apos;essai.
              </p>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-[46ch] text-center text-[12.5px] text-navy/45">
          Paiement sécurisé par Stripe. Gérez ou annulez votre abonnement à tout moment depuis votre
          compte.
        </p>
      </div>
    </main>
  );
}
