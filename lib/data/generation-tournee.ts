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

interface ActeAGenerer {
  libelle: string;
  ngap_code_id: string | null;
}

interface PassageAGenerer {
  patient_id: string;
  heure_prevue: string;
  actes: ActeAGenerer[];
}

export async function genererTourneeDuJour(
  supabase: SupabaseClient<Database>,
  idelId: string,
  date: string
): Promise<void> {
  const { data: soins, error: soinsError } = await supabase
    .from("soins_prescrits")
    .select(
      "patient_id, type_soin, ngap_code_id, frequence_type, jours_semaine, intervalle_jours, heures, date_debut, date_fin"
    )
    .eq("idel_id", idelId)
    .eq("actif", true)
    // Ordre explicite : sans lui Postgres n'en garantit aucun, et le libellé
    // de synthèse d'un passage changerait d'une génération à l'autre pour les
    // mêmes données.
    .order("created_at");

  if (soinsError) return;

  // Un passage = un patient à une heure. Deux soins prescrits à la même heure
  // chez le même patient sont deux actes d'un seul passage, pas deux visites.
  const passages = new Map<string, PassageAGenerer>();
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
      const cle = `${soin.patient_id}|${heure}`;
      const acte: ActeAGenerer = {
        libelle: soin.type_soin,
        ngap_code_id: soin.ngap_code_id,
      };
      const passage = passages.get(cle);

      if (passage) passage.actes.push(acte);
      else passages.set(cle, { patient_id: soin.patient_id, heure_prevue: heure, actes: [acte] });
    }
  }

  const passagesTries = [...passages.values()].sort((a, b) =>
    a.heure_prevue.localeCompare(b.heure_prevue)
  );

  // Les compteurs se calculent sur les actes et non sur le libellé de synthèse :
  // deux injections dans un même passage doivent en compter deux.
  const compteurs = { nb_injections: 0, nb_pansements: 0, nb_glycemies: 0 };
  let nbActes = 0;

  for (const passage of passagesTries) {
    for (const acte of passage.actes) {
      nbActes += 1;
      const libelleMinuscule = acte.libelle.toLowerCase();
      for (const { cle, motif } of MOTS_CLES_COMPTEUR) {
        if (libelleMinuscule.includes(motif)) compteurs[cle] += 1;
      }
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
      // Le regroupement supprime un déplacement, pas un temps de soin : la
      // durée reste comptée par acte.
      temps_estime_min: nbActes * DUREE_PAR_MISSION_MIN,
    })
    .select("id")
    .single();

  if (error || !tournee) return;

  if (passagesTries.length === 0) return;

  const { data: missionsCreees, error: missionsError } = await supabase
    .from("missions_du_jour")
    .insert(
      passagesTries.map((passage) => ({
        tournee_id: tournee.id,
        patient_id: passage.patient_id,
        type_soin: passage.actes.map((acte) => acte.libelle).join(" + "),
        heure_prevue: passage.heure_prevue,
        statut: "a_faire",
      }))
    )
    .select("id, patient_id, heure_prevue");

  if (missionsError || !missionsCreees) {
    await supabase.from("tournees").delete().eq("id", tournee.id);
    return;
  }

  const idParPassage = new Map(
    missionsCreees.map((mission) => [`${mission.patient_id}|${mission.heure_prevue}`, mission.id])
  );

  const passageSansMission = passagesTries.some(
    (passage) => !idParPassage.has(`${passage.patient_id}|${passage.heure_prevue}`)
  );

  // Un passage relu sous une clé différente de celle insérée (par exemple une
  // heure reformatée par Postgres, "08:00" au lieu de "08:00:00") resterait
  // introuvable dans idParPassage. Sauter silencieusement ce passage laisserait
  // sa mission exister sans le moindre acte : une perte de cotation invisible,
  // pire qu'une tournée absente. On traite donc ce rattachement manquant comme
  // un échec d'insertion à part entière et on annule toute la tournée plutôt
  // que de créer des missions orphelines de leurs actes.
  if (missionsCreees.length !== passagesTries.length || passageSansMission) {
    await supabase.from("tournees").delete().eq("id", tournee.id);
    return;
  }

  const actes = passagesTries.flatMap((passage) => {
    const missionId = idParPassage.get(`${passage.patient_id}|${passage.heure_prevue}`)!;
    return passage.actes.map((acte, index) => ({
      mission_id: missionId,
      libelle: acte.libelle,
      ngap_code_id: acte.ngap_code_id,
      ordre: index,
    }));
  });

  const { error: actesError } = await supabase.from("actes_mission").insert(actes);

  if (actesError) {
    // La suppression de la tournée emporte ses missions et leurs actes par
    // cascade : une tournée sans actes vaut moins que pas de tournée du tout.
    await supabase.from("tournees").delete().eq("id", tournee.id);
  }
}
