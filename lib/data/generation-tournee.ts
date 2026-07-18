import type { FrequenceSoin } from "@/lib/types/clinical";

export interface SoinRecurrence {
  frequenceType: FrequenceSoin;
  joursSemaine: number[] | null;
  intervalleJours: number | null;
  dateDebut: string;
  dateFin: string | null;
}

function jourSemaineUTC(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function joursEntre(dateDebut: string, date: string): number {
  const debut = new Date(`${dateDebut}T00:00:00Z`).getTime();
  const courante = new Date(`${date}T00:00:00Z`).getTime();
  return Math.round((courante - debut) / 86_400_000);
}

export function estSoinDuAujourdhui(soin: SoinRecurrence, date: string): boolean {
  if (date < soin.dateDebut) return false;
  if (soin.dateFin && date > soin.dateFin) return false;

  switch (soin.frequenceType) {
    case "ponctuel":
      return date === soin.dateDebut;
    case "quotidien":
      return true;
    case "jours_semaine":
      return (soin.joursSemaine ?? []).includes(jourSemaineUTC(date));
    case "tous_les_x_jours":
      return soin.intervalleJours ? joursEntre(soin.dateDebut, date) % soin.intervalleJours === 0 : false;
  }
}
