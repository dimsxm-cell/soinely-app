import { createClient } from "@/lib/supabase/server";
import { getAbonnement, getJoursRestantsEssaiGratuit } from "@/lib/data/abonnement";
import { createCheckoutSessionAction } from "@/lib/data/abonnement-actions";
import { BoutonEffetVerre } from "@/components/ui/BoutonEffetVerre";
import { LienRetour } from "@/components/ui/LienRetour";
import { OrbeArrierePlan } from "@/components/ui/OrbeArrierePlan";

const FONCTIONNALITES_COMMUNES = [
  "Patients illimités",
  "Agenda de tournée",
  "Transmissions, rappels & photos de suivi",
  "Assistant vocal ELY",
];

const PLANS = [
  {
    id: "solo" as const,
    nom: "Solo",
    accent: "#7c3aed",
    fondCheck: "rgba(124,58,237,.12)",
    description: "Pour une IDEL indépendante qui gère sa tournée seule.",
    prix: 19,
    note: null,
    features: FONCTIONNALITES_COMMUNES,
  },
  {
    id: "cabinet" as const,
    nom: "Cabinet",
    accent: "#c026d3",
    fondCheck: "rgba(192,38,211,.1)",
    description: "Pour un cabinet infirmier IDEL.",
    prix: 39,
    note: "Chaque infirmière du cabinet crée son propre compte pour le moment — le partage entre comptes arrive plus tard.",
    features: FONCTIONNALITES_COMMUNES,
  },
];

const PLAN_LABEL: Record<"solo" | "cabinet", string> = { solo: "Solo", cabinet: "Cabinet" };

export default async function AbonnementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const abonnement = user ? await getAbonnement(supabase, user.id) : null;
  const joursRestantsEssai = user && !abonnement ? getJoursRestantsEssaiGratuit(user.created_at) : 0;

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#f5f2fc] font-sans text-[#1e1b3c]">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <OrbeArrierePlan />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(245,242,252,.92) 0%, rgba(245,242,252,.78) 20%, rgba(245,242,252,.6) 40%, rgba(245,242,252,.42) 60%, rgba(245,242,252,.7) 85%, #f5f2fc 100%)",
          }}
        />
      </div>

      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <filter id="glass-distortion-tarifs">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.008" numOctaves={2} seed={5} result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2" result="blur" />
          <feDisplacementMap in="SourceGraphic" in2="blur" scale="18" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <div className="relative z-10 mx-auto flex max-w-[1100px] flex-col items-center px-6 py-16 sm:py-20">
        <div className="w-full max-w-[1060px]">
          <LienRetour href="/compte" label="Mon compte" />
        </div>

        <div className="mt-8 inline-flex items-center gap-1.5 rounded-full border border-[#e9defb] bg-white/70 px-4 py-1.5 text-[13px] font-bold text-brand-violet backdrop-blur">
          Sans engagement · Résiliable à tout moment
        </div>

        <h1 className="mt-5 max-w-[760px] text-balance text-center font-display text-[38px] font-extrabold leading-[1.05] tracking-tight sm:text-[52px]">
          Des tarifs pensés pour{" "}
          <span className="bg-gradient-to-r from-brand-violet via-purple-500 to-brand-rose bg-clip-text text-transparent">
            votre tournée.
          </span>
        </h1>
        <p className="mx-auto mt-3.5 max-w-[520px] text-center text-base font-medium leading-relaxed text-[#4b4763]">
          Commencez gratuitement, puis évoluez avec Soinely. Un abonnement clair, par infirmier, sans surprise.
        </p>

        <div className="pgrid mt-12 flex w-full max-w-[1060px] flex-wrap items-stretch justify-center gap-6">
          <div className="pcard relative flex min-w-[270px] max-w-[320px] flex-1 flex-col rounded-[24px] border border-white/75 bg-gradient-to-br from-white/[.78] to-white/50 p-7 pb-8 shadow-[0_18px_44px_rgba(76,29,149,.1),0_1px_2px_rgba(76,29,149,.06)] backdrop-blur-2xl">
            <p className="text-sm font-extrabold uppercase tracking-wide text-[#3f6fd6]">Découverte</p>
            <p className="mb-4 mt-1.5 min-h-[38px] text-[13.5px] leading-relaxed text-[#7a7391]">
              Pour tester Soinely en solo, à votre rythme.
            </p>
            <div className="mb-1.5 flex items-baseline gap-1.5">
              <span className="font-display text-[52px] font-extrabold leading-none tracking-tight">0 €</span>
            </div>
            <p className="mb-5 text-[12.5px] text-[#9a92b3]">Gratuit 15 jours, aucune carte requise</p>
            <div className="mb-5 h-px w-full bg-gradient-to-r from-transparent via-brand-violet/20 to-transparent" />
            <ul className="mb-6 flex flex-1 flex-col gap-3">
              <li className="flex items-start gap-2.5 text-sm leading-tight text-[#3d3956]">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "rgba(63,111,214,.12)" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3f6fd6" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                Accès complet à l&apos;application pendant 15 jours
              </li>
            </ul>

            {!user ? (
              <BoutonEffetVerre variant="fantome" filterId="glass-distortion-tarifs" href="/login">
                Créer un compte
              </BoutonEffetVerre>
            ) : abonnement ? (
              <p className="mt-auto text-center text-[13px] text-navy/45">
                Vous êtes abonné(e) au plan {PLAN_LABEL[abonnement.plan]}.
              </p>
            ) : joursRestantsEssai > 0 ? (
              <>
                <BoutonEffetVerre variant="fantome" filterId="glass-distortion-tarifs" href="/ma-journee">
                  Continuer l&apos;essai
                </BoutonEffetVerre>
                <p className="mt-3 text-center text-[12px] text-navy/45">
                  {joursRestantsEssai} jour{joursRestantsEssai > 1 ? "s" : ""} restant
                  {joursRestantsEssai > 1 ? "s" : ""}
                </p>
              </>
            ) : (
              <p className="mt-auto text-center text-[13px] text-navy/45">Votre essai gratuit est terminé.</p>
            )}
          </div>

          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className="pcard relative flex min-w-[270px] max-w-[320px] flex-1 flex-col rounded-[24px] border border-white/75 bg-gradient-to-br from-white/[.78] to-white/50 p-7 pb-8 shadow-[0_18px_44px_rgba(76,29,149,.1),0_1px_2px_rgba(76,29,149,.06)] backdrop-blur-2xl"
            >
              <p className="text-sm font-extrabold uppercase tracking-wide" style={{ color: plan.accent }}>
                {plan.nom}
              </p>
              <p className="mb-4 mt-1.5 min-h-[38px] text-[13.5px] leading-relaxed text-[#7a7391]">{plan.description}</p>
              <div className="mb-1.5 flex items-baseline gap-1.5">
                <span className="font-display text-[52px] font-extrabold leading-none tracking-tight">{plan.prix} €</span>
                <span className="text-[15px] font-bold text-[#8a83a0]">/ mois</span>
              </div>
              <p className="mb-5 text-[12.5px] text-[#9a92b3]">par infirmier · facturé mensuellement</p>
              <div className="mb-5 h-px w-full bg-gradient-to-r from-transparent via-brand-violet/20 to-transparent" />
              <ul className="mb-6 flex flex-1 flex-col gap-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm leading-tight text-[#3d3956]">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{ background: plan.fondCheck }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={plan.accent} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              {plan.note && <p className="mb-4 text-[12px] leading-relaxed text-navy/45">{plan.note}</p>}

              <form action={createCheckoutSessionAction}>
                <input type="hidden" name="plan" value={plan.id} />
                <BoutonEffetVerre variant="primaire" filterId="glass-distortion-tarifs" type="submit">
                  {abonnement?.plan === plan.id ? "Offre actuelle" : `Choisir ${plan.nom}`}
                </BoutonEffetVerre>
              </form>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-[46ch] text-center text-[13.5px] text-[#8a83a0]">
          Paiement sécurisé par Stripe. Gérez ou annulez votre abonnement à tout moment depuis votre compte.
        </p>
      </div>
    </main>
  );
}
