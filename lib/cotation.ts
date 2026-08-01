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
 * Lettres-clés qui échappent à la règle de cumul : leur acte est toujours
 * compté en entier et ne consomme pas de rang pour les autres.
 *
 * Le catalogue le dit déjà en toutes lettres pour TLS — « Cumulable avec un
 * autre soin réalisé lors de la même séance ». Cette liste tient lieu de
 * traduction en code tant que le catalogue ne porte pas la règle dans une
 * colonne dédiée ; l'y déplacer sera le bon geste quand les exceptions se
 * multiplieront.
 */
const LETTRES_CLES_CUMULABLES = new Set(["TLS"]);

/**
 * Montant d'un passage, règle du deuxième acte à 50 % appliquée.
 *
 * L'acte le plus cher compte en entier, le deuxième pour moitié, les suivants
 * pour rien — l'ordre de saisie n'entre pas en compte, seul le tarif décide,
 * ce qui est toujours à l'avantage de l'IDEL. Les actes sans code ne comptent
 * pas : rien ne permet de les chiffrer.
 */
export function calculerMontantPassage(actes: ActeVue[]): number {
  const cotes = actes.filter(
    (acte): acte is ActeVue & { cotation: number } => acte.cotation !== null
  );

  const cumulables = cotes.filter((acte) => estCumulable(acte));
  const soumisAuCumul = cotes.filter((acte) => !estCumulable(acte));

  const montantCumulables = cumulables.reduce((somme, acte) => somme + acte.cotation, 0);

  const montantSoumis = [...soumisAuCumul]
    .sort((a, b) => b.cotation - a.cotation)
    .reduce((somme, acte, rang) => {
      if (rang === 0) return somme + acte.cotation;
      if (rang === 1) return somme + acte.cotation * PART_SECOND_ACTE;
      return somme;
    }, 0);

  return arrondirCentimes(montantCumulables + montantSoumis);
}

function estCumulable(acte: ActeVue): boolean {
  return acte.lettreCle !== null && LETTRES_CLES_CUMULABLES.has(acte.lettreCle);
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
