import { createClient, getUtilisateurConnecte } from "@/lib/supabase/server";
import { getAbonnement, getJoursRestantsEssaiGratuit } from "@/lib/data/abonnement";
import { CartesTarifs } from "@/components/ui/CartesTarifs";
import { LienRetour } from "@/components/ui/LienRetour";
import { OrbeArrierePlan } from "@/components/ui/OrbeArrierePlan";

export default async function AbonnementPage() {
  const supabase = await createClient();
  const user = await getUtilisateurConnecte();

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

        <div className="mt-8 inline-flex items-center gap-1.5 rounded-[10px] border border-[#e9defb] bg-white/70 px-4 py-1.5 text-[13px] font-bold text-brand-violet backdrop-blur">
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

        <CartesTarifs
          estConnecte={Boolean(user)}
          planActuel={abonnement?.plan ?? null}
          joursRestantsEssai={joursRestantsEssai}
        />

        <p className="mx-auto mt-10 max-w-[46ch] text-center text-[13.5px] text-[#8a83a0]">
          Paiement sécurisé par Stripe. Gérez ou annulez votre abonnement à tout moment depuis votre compte.
        </p>
      </div>
    </main>
  );
}
