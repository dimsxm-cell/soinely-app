import type { MissionTourneeVue } from "@/lib/data/ma-journee";
import type { StatutMission } from "@/lib/types/clinical";

export type Filtre = "tout" | "a_faire" | "alertes" | "valides";

export function formatHeure(iso: string): string {
  return iso.slice(0, 5);
}

export function calculerAge(dateNaissance: string | null): number | null {
  if (!dateNaissance) return null;
  const today = new Date();
  const birth = new Date(dateNaissance);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// Les civilités sont listées sans point final : le nom candidat est comparé
// après avoir été dépouillé du sien, donc « M. » se présente ici comme « m ».
const CIVILITES = ["mme", "m", "mr", "dr", "pr", "mlle"];

export function getInitiales(nomComplet: string): string {
  const parts = nomComplet.trim().split(/\s+/);
  const nom = parts.find((p) => !CIVILITES.includes(p.toLowerCase().replace(/\.$/, "")));
  return (nom ?? parts[0]).slice(0, 2).toUpperCase();
}

export function estimerHeureFin(missions: MissionTourneeVue[]): string | null {
  const restantes = missions.filter((m) => m.statut === "a_faire" || m.statut === "en_cours");
  if (restantes.length === 0) return null;
  return formatHeure(restantes[restantes.length - 1].heurePrevue);
}

export function filtrerMissions(missions: MissionTourneeVue[], filtre: Filtre): MissionTourneeVue[] {
  switch (filtre) {
    case "a_faire":
      return missions.filter((m) => m.statut === "a_faire" || m.statut === "en_cours");
    // Une consigne d'accès (code portail, étage, chien) n'est pas une alerte :
    // seule l'allergie en est une tant que les lots A à D n'ont pas apporté de
    // source d'alerte de suivi.
    case "alertes":
      return missions.filter((m) => m.patientAllergies);
    case "valides":
      return missions.filter((m) => m.statut === "terminee" || m.statut === "absent");
    default:
      return missions;
  }
}

export interface CountsMissions {
  tout: number;
  a_faire: number;
  alertes: number;
  valides: number;
}

export function compterMissions(missions: MissionTourneeVue[]): CountsMissions {
  return {
    tout: missions.length,
    a_faire: missions.filter((m) => m.statut === "a_faire" || m.statut === "en_cours").length,
    alertes: missions.filter((m) => m.patientAllergies).length,
    valides: missions.filter((m) => m.statut === "terminee" || m.statut === "absent").length,
  };
}

export const STATUT_LABEL: Record<StatutMission, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  terminee: "Validé",
  absent: "Absent",
};

const FUSEAU_TOURNEE = "Europe/Paris";

function partiesHeureParis(iso: string): { heures: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSEAU_TOURNEE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const heures = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minutes = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return { heures, minutes };
}

/** Formate un timestamp en heure de Paris, quel que soit le fuseau du serveur. */
export function formatHeureDepuisTimestamp(iso: string): string {
  const { heures, minutes } = partiesHeureParis(iso);
  return `${String(heures).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function minutesDepuisMinuit(iso: string): number {
  const { heures, minutes } = partiesHeureParis(iso);
  return heures * 60 + minutes;
}

function minutesDepuisChaineHeure(heure: string): number {
  const [h, m] = heure.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Retard en minutes du soin en cours, figé à l'heure réelle de début —
 * ne grossit pas pendant le soin. Comparaison en minutes-depuis-minuit
 * heure de Paris des deux côtés, pour rester correcte quel que soit le
 * fuseau du serveur qui exécute ce calcul (Vercel tourne en UTC).
 */
export function calculerRetardMinutes(mission: MissionTourneeVue): number | null {
  if (mission.statut !== "en_cours" || !mission.heureDebutReelle) return null;
  const retard = minutesDepuisMinuit(mission.heureDebutReelle) - minutesDepuisChaineHeure(mission.heurePrevue);
  return retard > 0 ? retard : null;
}

/**
 * Trouve le prochain arrêt à traiter : la mission en cours si elle existe,
 * sinon la première mission à faire, sinon null.
 * Cette logique est partagée entre CarteTourneeEnCoursDesktop et TableauDeBordDesktop.
 */
export function trouverProchainArret(missions: MissionTourneeVue[]): MissionTourneeVue | null {
  return missions.find((m) => m.statut === "en_cours") ?? missions.find((m) => m.statut === "a_faire") ?? null;
}
