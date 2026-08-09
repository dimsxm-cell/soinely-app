import { createClient, getUtilisateurConnecte } from "@/lib/supabase/server";
import { getPatients } from "@/lib/data/patients";
import { getMissionsDuJour, getTourneeDuJour } from "@/lib/data/ma-journee";
import { getAvatarUrl } from "@/lib/data/profil";
import { ListePatients } from "@/components/ui/ListePatients";
import { journaliserEchec } from "@/lib/journal";

export default async function PatientsPage() {
  const supabase = await createClient();
  const user = await getUtilisateurConnecte();

  const avatarPath = user?.user_metadata?.avatar_path as string | undefined;
  const avatarUrl = avatarPath ? await getAvatarUrl(supabase, avatarPath) : null;

  const patients = user ? await getPatients(supabase, user.id) : [];
  // La tournée n'orne ici que le badge « prochaine visite » : son échec ne doit
  // pas emporter le répertoire patients, seul contenu vital de cette page.
  const tournee = user
    ? await getTourneeDuJour(supabase, user.id).catch((erreur) => {
        journaliserEchec("PatientsPage — tournée du jour", erreur);
        return null;
      })
    : null;
  const missionsDuJour = tournee
    ? await getMissionsDuJour(supabase, tournee.id).catch((erreur) => {
        journaliserEchec("PatientsPage — missions du jour", erreur);
        return [];
      })
    : [];

  const prochaineVisiteParPatient: Record<string, string> = {};
  for (const mission of missionsDuJour) {
    if (mission.statut !== "a_faire") continue;
    const actuelle = prochaineVisiteParPatient[mission.patientId];
    if (!actuelle || mission.heurePrevue < actuelle) {
      prochaineVisiteParPatient[mission.patientId] = mission.heurePrevue;
    }
  }

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <ListePatients patients={patients} prochaineVisiteParPatient={prochaineVisiteParPatient} avatarUrl={avatarUrl} />
    </main>
  );
}
