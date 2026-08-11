import { LiquidEffectAnimation } from "@/components/ui/liquid-effect-animation";
import { RubanLemniscateHero } from "@/components/ui/RubanLemniscateHero";

/**
 * Couches décoratives communes à tous les en-têtes violets de l'application.
 *
 * Les huit en-têtes (Accueil, Ma tournée, Ely, Explorer, Patients, Nouveau
 * patient, Abonnement, Connexion) répétaient chacun leur halo et leur ruban,
 * en divergeant déjà légèrement. Ils partagent désormais ce composant, qui
 * porte aussi la matière liquide : un réglage se fait en un seul endroit.
 *
 * L'ordre de superposition est significatif — matière, puis voile qui
 * l'atténue, puis halo, puis ruban, le contenu de l'en-tête venant par-dessus.
 * Le conteneur hôte doit porter `relative isolate overflow-hidden` et son
 * propre dégradé : la matière se place derrière lui via un z-index négatif.
 */

/** Position du halo violet, propre à la composition de chaque écran. */
export type HaloHero = "droite" | "gauche" | "double";

const CLASSES_HALO = "pointer-events-none absolute rounded-full bg-[radial-gradient(circle,rgba(168,85,247,.4),transparent_68%)]";

export function FondHeroViolet({ halo = "droite" }: { halo?: HaloHero }) {
  return (
    <>
      <LiquidEffectAnimation className="-z-10" />

      {/* Voile vertical : presque transparent sur la bande du titre, où la
          matière doit se voir, puis franchement opaque plus bas, où se lisent
          les informations denses. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(34,27,51,.08)_0%,rgba(34,27,51,.14)_26%,rgba(40,28,64,.5)_52%,rgba(45,30,72,.74)_78%,rgba(45,30,72,.8)_100%)]"
      />

      {halo === "gauche" && (
        <div aria-hidden="true" className={`${CLASSES_HALO} -left-12 -top-20 h-[260px] w-[260px]`} />
      )}
      {halo === "droite" && (
        <div aria-hidden="true" className={`${CLASSES_HALO} -right-16 -top-24 h-[280px] w-[280px]`} />
      )}
      {halo === "double" && (
        <>
          <div aria-hidden="true" className={`${CLASSES_HALO} -right-24 -top-24 h-[420px] w-[420px]`} />
          <div aria-hidden="true" className={`${CLASSES_HALO} -bottom-40 -left-24 h-[420px] w-[420px]`} />
        </>
      )}

      <RubanLemniscateHero />
    </>
  );
}
