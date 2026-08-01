import type { ActeVue, MissionTourneeVue } from "@/lib/data/ma-journee";
import {
  calculerTarifActe,
  type ValeursLettresCles,
  type ZoneTarifaire,
} from "@/lib/zone-tarifaire";

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
 * Part d'un acte technique réalisé chez un patient sous forfait de dépendance.
 *
 * L'acte ne se cote alors plus en AMI mais en AMX, à 50 % de son coefficient.
 * Comme l'AMX vaut exactement l'AMI, la bascule revient à compter l'acte pour
 * moitié. Les actes dérogatoires y échappent : leur appliquer ce taux par
 * réflexe est une façon courante de se sous-facturer.
 */
const PART_ACTE_SOUS_FORFAIT = 0.5;

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
 * De quoi tarifer un acte : la zone du cabinet et la valeur des lettres-clés.
 *
 * Les deux voyagent ensemble parce qu'aucune ne suffit seule — une valeur sans
 * zone ne dit pas laquelle des deux colonnes lire.
 */
export interface ContexteTarifaire {
  zone: ZoneTarifaire;
  valeurs: ValeursLettresCles;
}

/**
 * Tarif d'un acte dans la zone du cabinet.
 *
 * Se rabat sur le montant figé du catalogue si la lettre-clé est absente de la
 * table des valeurs — le cas tant que la migration n'est pas appliquée. Les
 * montants restent alors ceux de la métropole, ce qui vaut mieux qu'une
 * journée soudainement chiffrée à zéro.
 */
function tarifDe(acte: ActeVue, contexte: ContexteTarifaire): number | null {
  const calcule = calculerTarifActe(
    acte.lettreCle,
    acte.coefficient,
    contexte.zone,
    contexte.valeurs
  );
  return calcule ?? acte.cotation;
}

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
export function calculerMontantPassage(
  actes: ActeVue[],
  contexte: ContexteTarifaire,
  forfaitBsi: string | null = null
): number {
  const tarifes = actes
    .map((acte) => ({ acte, tarif: tarifDe(acte, contexte) }))
    .filter((ligne): ligne is { acte: ActeVue; tarif: number } => ligne.tarif !== null)
    .map((ligne) => ({
      ...ligne,
      tarif: basculeEnAmx(ligne.acte, forfaitBsi) ? ligne.tarif * PART_ACTE_SOUS_FORFAIT : ligne.tarif,
    }));

  const horsCumul = tarifes.filter((ligne) => estHorsCumul(ligne.acte));
  const soumisAuCumul = tarifes.filter((ligne) => !estHorsCumul(ligne.acte));

  const montantHorsCumul = horsCumul.reduce((somme, ligne) => somme + ligne.tarif, 0);

  const montantSoumis = [...soumisAuCumul]
    .sort(comparerParCoefficient)
    .reduce((somme, ligne, rang) => {
      if (rang === 0) return somme + ligne.tarif;
      if (rang === 1) return somme + ligne.tarif * PART_SECOND_ACTE;
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
  a: { acte: ActeVue; tarif: number },
  b: { acte: ActeVue; tarif: number }
): number {
  const ecart = (b.acte.coefficient ?? 0) - (a.acte.coefficient ?? 0);
  return ecart !== 0 ? ecart : b.tarif - a.tarif;
}

function estHorsCumul(acte: ActeVue): boolean {
  return acte.lettreCle !== null && LETTRES_CLES_HORS_CUMUL.has(acte.lettreCle);
}

/**
 * L'acte doit-il basculer en AMX, chez un patient sous forfait ?
 *
 * Trois conditions, et elles se lisent dans cet ordre : le patient est sous
 * forfait, l'acte n'est pas lui-même le forfait (ni une majoration), et il ne
 * figure pas parmi les dérogations de l'article A12.
 */
function basculeEnAmx(acte: ActeVue, forfaitBsi: string | null): boolean {
  if (!forfaitBsi) return false;
  if (estHorsCumul(acte)) return false;
  return !acte.derogatoireBsi;
}

/**
 * Montant de la tournée, passage par passage.
 *
 * Une absence ne compte pas : le soin n'a pas été réalisé. L'indemnité de
 * déplacement qui peut lui rester due dépend des règles du lot suivant.
 */
export function calculerMontantTournee(
  missions: MissionTourneeVue[],
  contexte: ContexteTarifaire
): number {
  const montant = missions
    .filter((mission) => mission.statut !== "absent")
    .reduce(
      (somme, mission) =>
        somme + calculerMontantPassage(mission.actes, contexte, mission.patientForfaitBsi),
      0
    );

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
