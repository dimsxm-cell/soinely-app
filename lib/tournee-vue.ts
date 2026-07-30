import type { MissionTourneeVue } from "@/lib/data/ma-journee";
import type { StatutMission } from "@/lib/types/clinical";

export type Filtre = "tout" | "a_faire" | "alertes" | "valides";

export function formatDateTournee(): string {
  return new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

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

const PALETTE_AVATAR = [
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-teal-100", text: "text-teal-700" },
  { bg: "bg-orange-100", text: "text-orange-700" },
  { bg: "bg-pink-100", text: "text-pink-700" },
];

export function getCouleurAvatar(id: string) {
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return PALETTE_AVATAR[hash % PALETTE_AVATAR.length];
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

export const STATUT_BADGE: Record<StatutMission, string> = {
  a_faire: "bg-navy/[0.06] text-navy/50",
  en_cours: "bg-brand-violet/[0.12] text-brand-violet font-bold",
  terminee: "bg-emerald-50 text-emerald-600 font-semibold",
  absent: "bg-amber-50 text-amber-600 font-semibold",
};
