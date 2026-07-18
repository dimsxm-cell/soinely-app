import type { SupabaseClient } from "@supabase/supabase-js";
import type { FrequenceSoin } from "@/lib/types/clinical";
import type { Database } from "@/lib/types/database.types";

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

const DUREE_PAR_MISSION_MIN = 20;

const MOTS_CLES_COMPTEUR: { cle: "nb_injections" | "nb_pansements" | "nb_glycemies"; motif: string }[] = [
  { cle: "nb_injections", motif: "injection" },
  { cle: "nb_pansements", motif: "pansement" },
  { cle: "nb_glycemies", motif: "glyc" },
];

interface MissionAGenerer {
  patient_id: string;
  type_soin: string;
  heure_prevue: string;
}

export async function genererTourneeDuJour(
  supabase: SupabaseClient<Database>,
  idelId: string,
  date: string
): Promise<void> {
  const { data: soins, error: soinsError } = await supabase
    .from("soins_prescrits")
    .select("patient_id, type_soin, frequence_type, jours_semaine, intervalle_jours, heures, date_debut, date_fin")
    .eq("idel_id", idelId)
    .eq("actif", true);

  if (soinsError) return;

  const missionsAGenerer: MissionAGenerer[] = [];
  const patientsDistincts = new Set<string>();

  for (const soin of soins ?? []) {
    const recurrence: SoinRecurrence = {
      frequenceType: soin.frequence_type as FrequenceSoin,
      joursSemaine: soin.jours_semaine,
      intervalleJours: soin.intervalle_jours,
      dateDebut: soin.date_debut,
      dateFin: soin.date_fin,
    };

    if (!estSoinDuAujourdhui(recurrence, date)) continue;

    patientsDistincts.add(soin.patient_id);
    for (const heure of soin.heures) {
      missionsAGenerer.push({ patient_id: soin.patient_id, type_soin: soin.type_soin, heure_prevue: heure });
    }
  }

  missionsAGenerer.sort((a, b) => a.heure_prevue.localeCompare(b.heure_prevue));

  const compteurs = { nb_injections: 0, nb_pansements: 0, nb_glycemies: 0 };
  for (const mission of missionsAGenerer) {
    const typeSoinMinuscule = mission.type_soin.toLowerCase();
    for (const { cle, motif } of MOTS_CLES_COMPTEUR) {
      if (typeSoinMinuscule.includes(motif)) compteurs[cle] += 1;
    }
  }

  const { data: tournee, error } = await supabase
    .from("tournees")
    .insert({
      idel_id: idelId,
      date,
      nb_patients: patientsDistincts.size,
      nb_injections: compteurs.nb_injections,
      nb_pansements: compteurs.nb_pansements,
      nb_glycemies: compteurs.nb_glycemies,
      temps_estime_min: missionsAGenerer.length * DUREE_PAR_MISSION_MIN,
    })
    .select("id")
    .single();

  if (error || !tournee) return;

  if (missionsAGenerer.length > 0) {
    const { error: missionsError } = await supabase.from("missions_du_jour").insert(
      missionsAGenerer.map((mission) => ({
        tournee_id: tournee.id,
        patient_id: mission.patient_id,
        type_soin: mission.type_soin,
        heure_prevue: mission.heure_prevue,
        statut: "a_faire",
      }))
    );

    if (missionsError) {
      await supabase.from("tournees").delete().eq("id", tournee.id);
    }
  }
}
