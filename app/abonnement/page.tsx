import Image from "next/image";
import Link from "next/link";
import { createClient, getUtilisateurConnecte } from "@/lib/supabase/server";
import { getAbonnement, getJoursRestantsEssaiGratuit } from "@/lib/data/abonnement";
import { CartesTarifs } from "@/components/ui/CartesTarifs";
import { RubanLemniscateHero } from "@/components/ui/RubanLemniscateHero";

export default async function AbonnementPage() {
  const supabase = await createClient();
  const user = await getUtilisateurConnecte();

  const abonnement = user ? await getAbonnement(supabase, user.id) : null;
  // Les identifiants de paiement ne sont lus que sur le serveur. Sans eux,
  // l'action de commande renoncerait en silence : autant l'annoncer.
  const paiementDisponible = Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID_SOLO
  );
  const joursRestantsEssai = user && !abonnement ? getJoursRestantsEssaiGratuit(user.created_at) : 0;

  return (
    <main className="min-h-screen w-full bg-[#f5f2fc] font-sans text-[#1e1b3c]">
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <filter id="glass-distortion-tarifs">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.008" numOctaves={2} seed={5} result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2" result="blur" />
          <feDisplacementMap in="SourceGraphic" in2="blur" scale="18" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <div className="relative overflow-hidden bg-[linear-gradient(168deg,#221b33_0%,#2c1f47_58%,#3a2260_100%)] px-6 pb-12 pt-6 text-white sm:pt-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,.4),transparent_68%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -left-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,.4),transparent_68%)]"
        />
        <RubanLemniscateHero />

        <div className="relative mx-auto flex max-w-[1060px] flex-col items-center text-center">
          <Link
            href="/compte"
            className="self-start rounded-full border border-white/15 bg-white/10 px-4 py-[9px] text-[13.5px] font-semibold text-white"
          >
            ‹ Mon compte
          </Link>

          <div className="mt-6 flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" className="fill-[#c4a4f5]" aria-hidden="true">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#b3aacd]">Tarifs</span>
          </div>

          <h1 className="mt-4 max-w-[760px] text-balance font-display text-[36px] font-extrabold leading-[1.08] tracking-tight sm:text-[48px]">
            Des tarifs pensés pour votre tournée.
          </h1>
          <p className="mx-auto mt-3.5 max-w-[520px] text-base font-medium leading-relaxed text-[#b3aacd]">
            Commencez gratuitement, puis évoluez avec Soinely. Un abonnement clair, par infirmier, sans surprise.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <span className="rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[#b3aacd]">
              Sans engagement
            </span>
            <span className="rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[#b3aacd]">
              Résiliable à tout moment
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex max-w-[1100px] flex-col items-center px-6 pb-16 pt-2">
        <div className="w-full max-w-[1060px]">
          <CartesTarifs
            estConnecte={Boolean(user)}
            paiementDisponible={paiementDisponible}
            planActuel={abonnement?.plan ?? null}
            joursRestantsEssai={joursRestantsEssai}
          />
        </div>

        <div className="mt-8 flex w-full max-w-[1060px] items-center gap-3 rounded-[20px] border border-[#e2d6fa] bg-[#f1ebfd] px-4 py-3.5">
          <span className="h-[38px] w-[38px] shrink-0 overflow-hidden rounded-full bg-[#efeaf9]">
            <Image
              src="/marketing/ely-colibri-heureux.webp"
              alt="ELY"
              width={323}
              height={304}
              className="h-full w-full object-cover object-[center_42%]"
            />
          </span>
          <p className="text-[13.5px] leading-relaxed text-[#3b3648]">
            ELY est inclus dès le plan Solo — pour ne jamais tourner seul.
          </p>
        </div>

        <p className="mx-auto mt-6 max-w-[46ch] text-center text-[13.5px] text-[#8a83a0]">
          Paiement sécurisé par Stripe. Gérez ou annulez votre abonnement à tout moment depuis votre compte.
        </p>
      </div>
    </main>
  );
}
