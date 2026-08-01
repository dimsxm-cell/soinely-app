import type { ActeVue, MissionTourneeVue } from "@/lib/data/ma-journee";

/**
 * Cotation d'une tournée : ce que les actes réalisés représentent en euros.
 *
 * Périmètre volontairement restreint aux actes eux-mêmes. Les majorations
 * (dimanche, nuit, férié) et les indemnités de déplacement relèvent du lot
 * suivant : les additionner ici donnerait un montant faux, et un montant faux
 * dans un outil de facturation est pire que pas de montant du tout.
 */

/** Part du deuxième acte d'un même passage, selon la règle générale NGAP. */
const PART_SECOND_ACTE = 0.5;

/**
 * Lettres-clés qui échappent à la règle de cumul : leur montant est toujours
 * compté en entier et ne consomme pas de rang pour les autres.
 *
 * Deux familles s'y trouvent, pour deux raisons différentes :
 *
 *  - les forfaits journaliers de dépendance issus du BSI (BSA, BSB, BSC), que
 *    la NGAP facture à taux plein « quels que soient les actes réalisés en
 *    parallèle » : le forfait n'est pas un acte de la séance, il couvre la
 *    journée ;
 *  - les accompagnements de téléconsultation (TLS, TLL, TLD), qui relèvent des
 *    majorations et non des actes que l'article 11B met en concurrence.
 *
 * Cette liste tient lieu de règle tant que le catalogue ne porte pas cette
 * distinction dans une colonne dédiée ; l'y déplacer sera le bon geste quand
 * les exceptions se multiplieront.
 */
const LETTRES_CLES_HORS_CUMUL = new Set(["BSA", "BSB", "BSC", "TLS", "TLL", "TLD"]);

/**
 * Montant d'un passage, règle du deuxième acte à 50 % appliquée.
 *
 * Article 11B des dispositions générales : au cours d'une même séance, l'acte
 * au **coefficient** le plus élevé est compté en entier, le deuxième pour
 * moitié, les suivants pour rien. C'est bien le coefficient qui classe, et non
 * le tarif : les deux ne donnent pas toujours le même ordre, une lettre-clé
 * pouvant valoir plus qu'une autre à coefficient égal.
 *
 * L'ordre de saisie n'entre jamais en compte — facturer au tarif plein le
 * premier acte noté plutôt que le mieux coté est l'erreur la plus coûteuse
 * relevée chez les IDEL. Les actes sans code ne comptent pas : rien ne permet
 * de les chiffrer.
 */
export function calculerMontantPassage(actes: ActeVue[]): number {
  const cotes = actes.filter(
    (acte): acte is ActeVue & { cotation: number } => acte.cotation !== null
  );

  const horsCumul = cotes.filter((acte) => estHorsCumul(acte));
  const soumisAuCumul = cotes.filter((acte) => !estHorsCumul(acte));

  const montantHorsCumul = horsCumul.reduce((somme, acte) => somme + acte.cotation, 0);

  const montantSoumis = [...soumisAuCumul]
    .sort(comparerParCoefficient)
    .reduce((somme, acte, rang) => {
      if (rang === 0) return somme + acte.cotation;
      if (rang === 1) return somme + acte.cotation * PART_SECOND_ACTE;
      return somme;
    }, 0);

  return arrondirCentimes(montantHorsCumul + montantSoumis);
}

/**
 * Classe deux actes du mieux coté au moins coté. À coefficient égal — deux
 * lettres-clés différentes peuvent y arriver — le tarif départage, au bénéfice
 * de l'IDEL. Tous les codes soumis au cumul portent un coefficient dans le
 * catalogue ; son absence ne relègue un acte que par défaut de mieux.
 */
function comparerParCoefficient(
  a: ActeVue & { cotation: number },
  b: ActeVue & { cotation: number }
): number {
  const ecart = (b.coefficient ?? 0) - (a.coefficient ?? 0);
  return ecart !== 0 ? ecart : b.cotation - a.cotation;
}

function estHorsCumul(acte: ActeVue): boolean {
  return acte.lettreCle !== null && LETTRES_CLES_HORS_CUMUL.has(acte.lettreCle);
}

/**
 * Montant de la tournée, passage par passage.
 *
 * Une absence ne compte pas : le soin n'a pas été réalisé. L'indemnité de
 * déplacement qui peut lui rester due dépend des règles du lot suivant.
 */
export function calculerMontantTournee(missions: MissionTourneeVue[]): number {
  const montant = missions
    .filter((mission) => mission.statut !== "absent")
    .reduce((somme, mission) => somme + calculerMontantPassage(mission.actes), 0);

  return arrondirCentimes(montant);
}

/**
 * L'addition de moitiés de tarifs tombe sur des fractions de centime que le
 * flottant traîne ensuite de passage en passage. On arrête le compte au
 * centime à chaque étape plutôt que de laisser l'écart s'accumuler.
 */
function arrondirCentimes(montant: number): number {
  return Math.round(montant * 100) / 100;
}

/** Montant en euros, à la française : « 7,88 € ». */
export function formaterEuros(montant: number): string {
  return montant.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
