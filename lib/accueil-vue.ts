import type { MissionDuJour } from "@/lib/types/clinical";
import { formaterNomPropre } from "@/lib/format";

/** Salutation dependant de l'heure du jour, a l'affichage. */
export function formatSalutation(): string {
  return new Date().getHours() < 18 ? "Bonjour" : "Bonsoir";
}

/** Date du jour, en toutes lettres, capitalisee. */
export function formatDateDuJour(): string {
  const date = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return date.charAt(0).toUpperCase() + date.slice(1);
}

export interface CountsAccueil {
  visites: number;
  faites: number;
  restantes: number;
}

/**
 * Comptages de l'accueil — memes regles que « Ma tournee » : une absence
 * est une visite traitee, pas un blocage.
 */
export function compterMissionsAccueil(missions: MissionDuJour[]): CountsAccueil {
  return {
    visites: missions.length,
    faites: missions.filter((m) => m.statut === "terminee" || m.statut === "absent").length,
    restantes: missions.filter((m) => m.statut === "a_faire" || m.statut === "en_cours").length,
  };
}

/**
 * Somme des distances routieres connues (cabinet -> patient, aller simple),
 * en kilometres, arrondie. `null` si aucune mission n'a de distance connue —
 * jamais une valeur inventee.
 */
export function calculerKmTournee(missions: MissionDuJour[]): number | null {
  const connu = missions.some((m) => m.distanceKmCorrigee != null || m.distanceKm != null);
  if (!connu) return null;

  const total = missions.reduce((somme, m) => somme + (m.distanceKmCorrigee ?? m.distanceKm ?? 0), 0);
  return Math.round(total);
}

/**
 * Conseil affiche sous forme de bandeau, derive de l'etat reel de la
 * tournee — jamais de donnee inventee (pas de temps de trajet estime).
 */
export function conseilEly(missions: MissionDuJour[]): string {
  if (missions.length === 0) {
    return "Aucune visite programmée aujourd'hui.";
  }

  const enCours = missions.find((m) => m.statut === "en_cours");
  if (enCours) {
    return `Soin en cours chez ${formaterNomPropre(enCours.patientNom)} — pensez à la transmission avant de partir.`;
  }

  const prochaine = missions.find((m) => m.statut === "a_faire");
  if (prochaine) {
    return `Prochaine visite : ${formaterNomPropre(prochaine.patientNom)} à ${prochaine.heurePrevue.slice(0, 5)}.`;
  }

  return "Tournée bouclée. Vos transmissions sont à jour, bonne journée.";
}

export interface ActionRapideAccueil {
  missionId: string;
  label: string;
  nouveauStatut: "en_cours" | "terminee";
}

/**
 * Mission et action a proposer dans le bouton flottant, ou `null` si
 * aucune mission n'appelle une action immediate.
 */
export function prochaineActionAccueil(missions: MissionDuJour[]): ActionRapideAccueil | null {
  const enCours = missions.find((m) => m.statut === "en_cours");
  if (enCours) {
    return { missionId: enCours.id, label: "Terminer le soin en cours", nouveauStatut: "terminee" };
  }

  const prochaine = missions.find((m) => m.statut === "a_faire");
  if (prochaine) {
    return {
      missionId: prochaine.id,
      label: `Démarrer · ${formaterNomPropre(prochaine.patientNom)}`,
      nouveauStatut: "en_cours",
    };
  }

  return null;
}
