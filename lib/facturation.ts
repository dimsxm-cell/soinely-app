import { calculerMajorationsPassage, type DetailMajorations, type PassageAMajorer } from "@/lib/majorations";
import { calculerMontantPassage, type ContexteTarifaire } from "@/lib/cotation";


/**
 * Ce qu'un passage représente, actes et majorations réunis.
 *
 * Ce module compose les deux calculs plutôt que de les fondre : `cotation`
 * ignore tout des majorations, `majorations` ignore tout du cumul, et aucun
 * des deux n'a besoin d'importer l'autre.
 *
 * Le détail existe pour être montré. Un total de tournée né d'un cumul à
 * 50 %, d'une bascule AMX et de six majorations n'est vérifiable par personne
 * s'il n'apparaît que comme un chiffre unique en haut de l'écran.
 */

export interface DetailPassage {
  /** Actes du passage, règles de cumul et de forfait appliquées. */
  actes: number;
  /** Majorations et indemnité de déplacement, poste par poste. */
  majorations: DetailMajorations;
  /** Somme des deux. */
  total: number;
}

export function calculerDetailPassage(
  mission: PassageAMajorer,
  dateTournee: string,
  contexte: ContexteTarifaire
): DetailPassage {
  const actes = calculerMontantPassage(mission.actes, contexte, mission.patientForfaitBsi);
  const majorations = calculerMajorationsPassage(mission, dateTournee, contexte);

  // Une absence ne se facture pas : ni acte, ni majoration, ni déplacement.
  const actesDus = mission.statut === "absent" ? 0 : actes;

  return {
    actes: actesDus,
    majorations,
    total: Math.round((actesDus + majorations.total) * 100) / 100,
  };
}
