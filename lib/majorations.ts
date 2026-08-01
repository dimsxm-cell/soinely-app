import type { ActeVue } from "@/lib/types/clinical";
import type { StatutMission } from "@/lib/types/clinical";
import type { ContexteTarifaire } from "@/lib/cotation";
import { estJourMajore } from "@/lib/jours-feries";
import { calculerAge } from "@/lib/tournee-vue";

/**
 * Ce qu'il faut savoir d'un passage pour le majorer, et rien de plus.
 *
 * La vue de tournée comme le détail d'une mission le satisfont sans
 * conversion : chacun porte déjà ces cinq champs.
 */
export interface PassageAMajorer {
  statut: StatutMission;
  heurePrevue: string;
  actes: ActeVue[];
  patientForfaitBsi: string | null;
  patientDateNaissance: string | null;
}

/**
 * Majorations et indemnité de déplacement d'un passage.
 *
 * Chacune répond à une situation précise, et beaucoup restent sous-facturées
 * faute d'être systématisées : elles ne se réclament pas après coup. Les
 * déduire de ce que l'application sait déjà — l'heure, la date, l'âge du
 * patient, les actes réalisés — évite de compter sur la mémoire en fin de
 * journée.
 */

/** Âge en deçà duquel la majoration enfant s'applique. */
const AGE_MAJORATION_ENFANT = 7;

/** Coefficients ouvrant droit à la majoration d'acte unique. */
const COEFFICIENTS_ACTE_UNIQUE = new Set([1, 1.5]);

/** Détail des majorations, poste par poste. */
export interface DetailMajorations {
  /** Majoration de nuit, selon l'heure du passage. */
  horaire: number;
  /** Majoration dimanche et jours fériés. */
  dimancheFerie: number;
  /** MAU, sur un acte AMI 1 ou AMI 1,5 isolé. */
  acteUnique: number;
  /** MCI, sur un soin complexe. */
  coordination: number;
  /** MIE, chez un enfant de moins de sept ans. */
  enfant: number;
  /** Indemnité forfaitaire de déplacement. */
  deplacement: number;
  total: number;
}

const AUCUNE: DetailMajorations = {
  horaire: 0,
  dimancheFerie: 0,
  acteUnique: 0,
  coordination: 0,
  enfant: 0,
  deplacement: 0,
  total: 0,
};

/** Valeur d'une lettre-clé dans la zone, ou zéro si la table ne la porte pas. */
function valeur(lettreCle: string, contexte: ContexteTarifaire): number {
  const trouvee = contexte.valeurs.get(lettreCle);
  if (!trouvee) return 0;
  return contexte.zone === "dom" ? trouvee.valeurDom : trouvee.valeurMetropole;
}

/**
 * Majoration de nuit due pour une heure donnée, au format `HH:MM` ou
 * `HH:MM:SS`.
 *
 * La nuit profonde (23h-5h) vaut le double de ses abords (20h-23h et 5h-8h).
 * L'heure retenue est celle prévue au passage, faute de conserver celle du
 * soin réel : une tournée décalée peut donc manquer une majoration due.
 */
function majorationHoraire(heure: string, contexte: ContexteTarifaire): number {
  const heures = Number(heure.slice(0, 2));
  if (!Number.isFinite(heures)) return 0;

  if (heures >= 23 || heures < 5) return valeur("MNP", contexte);
  if (heures >= 20 || heures < 8) return valeur("MN", contexte);
  return 0;
}

/** L'acte relève-t-il d'une lettre-clé que les majorations reconnaissent ? */
function estActeMajorable(acte: ActeVue): boolean {
  return acte.lettreCle === "AMI" || acte.lettreCle === "AIS";
}

/**
 * Majorations d'un passage.
 *
 * Deux réserves valent pour l'ensemble : les majorations ne s'appliquent
 * qu'aux actes cotés en AMI ou AIS, et pas aux passages d'un patient sous
 * forfait de dépendance. Sans acte majorable, seul le déplacement reste dû.
 */
export function calculerMajorationsPassage(
  mission: PassageAMajorer,
  dateTournee: string,
  contexte: ContexteTarifaire
): DetailMajorations {
  // Un passage non effectué n'ouvre droit à rien, pas même au déplacement :
  // savoir s'il a eu lieu malgré l'absence demanderait de le déclarer.
  if (mission.statut === "absent") return AUCUNE;

  const actesCotes = mission.actes.filter((acte) => acte.cotation !== null);
  const deplacement = actesCotes.length > 0 ? valeur("IFD", contexte) : 0;

  const majorables = actesCotes.filter(estActeMajorable);
  if (majorables.length === 0 || mission.patientForfaitBsi) {
    return { ...AUCUNE, deplacement, total: deplacement };
  }

  const horaire = majorationHoraire(mission.heurePrevue, contexte);
  const dimancheFerie = estJourMajore(dateTournee, contexte.zone)
    ? valeur("MDF", contexte)
    : 0;

  // Acte unique : un seul acte coté sur le passage, et son coefficient est
  // celui d'une injection ou d'un prélèvement.
  const seulActe = actesCotes.length === 1 ? actesCotes[0] : null;
  const acteUnique =
    seulActe &&
    seulActe.lettreCle === "AMI" &&
    seulActe.coefficient !== null &&
    COEFFICIENTS_ACTE_UNIQUE.has(seulActe.coefficient)
      ? valeur("MAU", contexte)
      : 0;

  // La coordination se paie une fois par passage, quel que soit le nombre de
  // soins complexes qui y ouvrent droit.
  const coordination = actesCotes.some((acte) => acte.eligibleMci)
    ? valeur("MCI", contexte)
    : 0;

  const age = calculerAge(mission.patientDateNaissance);
  const enfant =
    age !== null && age < AGE_MAJORATION_ENFANT
      ? valeur("MIE", contexte) * majorables.length
      : 0;

  const total = horaire + dimancheFerie + acteUnique + coordination + enfant + deplacement;

  return {
    horaire,
    dimancheFerie,
    acteUnique,
    coordination,
    enfant,
    deplacement,
    total: Math.round(total * 100) / 100,
  };
}

/** Somme des majorations d'une tournée. */
export function calculerMajorationsTournee(
  missions: PassageAMajorer[],
  dateTournee: string,
  contexte: ContexteTarifaire
): number {
  const total = missions.reduce(
    (somme, mission) => somme + calculerMajorationsPassage(mission, dateTournee, contexte).total,
    0
  );

  return Math.round(total * 100) / 100;
}
