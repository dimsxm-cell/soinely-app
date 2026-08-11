import type { ContexteTarifaire } from "@/lib/cotation";

/**
 * Indemnités kilométriques.
 *
 * La NGAP les compte depuis le domicile professionnel, aller et retour, sous
 * déduction d'un abattement : les premiers kilomètres ne sont pas indemnisés.
 * Un trajet court n'ouvre donc droit à rien, et seule la part au-delà compte.
 */

/**
 * Kilomètres non indemnisés, aller et retour confondus.
 *
 * Deux kilomètres à l'aller, deux au retour. L'abattement diffère en zone de
 * montagne et selon l'agglomération ; cette valeur est celle de la plaine,
 * qui couvre la très grande majorité des tournées.
 */
export const ABATTEMENT_KM = 4;

/** Barème applicable au trajet. */
export type BaremeKilometrique = "plaine" | "montagne" | "pied_ski";

const LETTRE_CLE_PAR_BAREME: Record<BaremeKilometrique, string> = {
  plaine: "IK",
  montagne: "IKM",
  pied_ski: "IKP",
};

/**
 * Kilomètres indemnisables d'un passage, à partir de la distance aller.
 *
 * Le trajet compte aller et retour — l'IDEL revient — dont on retranche
 * l'abattement. En deçà, rien n'est dû : la fonction rend zéro plutôt qu'un
 * nombre négatif.
 */
export function kilometresIndemnisables(
  distanceAllerKm: number | null,
  abattementKm: number = ABATTEMENT_KM
): number {
  if (distanceAllerKm === null || !Number.isFinite(distanceAllerKm) || distanceAllerKm <= 0) {
    return 0;
  }

  const allerRetour = distanceAllerKm * 2;
  return Math.max(0, arrondirCentimes(allerRetour - abattementKm));
}

/**
 * Indemnité due pour un passage, en euros.
 *
 * Rend zéro si le barème est absent de la table des valeurs — l'état tant que
 * la migration n'est pas appliquée. Mieux vaut ne rien compter qu'inventer un
 * tarif.
 */
export function calculerIndemniteKilometrique(
  distanceAllerKm: number | null,
  contexte: ContexteTarifaire,
  bareme: BaremeKilometrique = "plaine",
  abattementKm: number = ABATTEMENT_KM
): number {
  const kilometres = kilometresIndemnisables(distanceAllerKm, abattementKm);
  if (kilometres === 0) return 0;

  const valeur = contexte.valeurs.get(LETTRE_CLE_PAR_BAREME[bareme]);
  if (!valeur) return 0;

  const tarif = contexte.zone === "dom" ? valeur.valeurDom : valeur.valeurMetropole;
  return arrondirCentimes(kilometres * tarif);
}

/**
 * Distance retenue pour un passage : la correction manuelle prime.
 *
 * La NGAP demande la distance réellement parcourue. Un itinéraire calculé
 * ignore le détour par la pharmacie comme la route barrée ; quand l'IDEL
 * corrige, c'est elle qui a raison.
 */
export function distanceRetenue(
  distanceCalculeeKm: number | null,
  distanceCorrigeeKm: number | null
): number | null {
  return distanceCorrigeeKm ?? distanceCalculeeKm;
}

/**
 * Distance totale d'une tournee, au format francais (ex. "13,7 km"), pour
 * affichage. Meme motif que formaterEuros() dans lib/cotation.ts.
 */
export function formaterKm(km: number): string {
  return `${km.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

function arrondirCentimes(valeur: number): number {
  return Math.round(valeur * 100) / 100;
}
