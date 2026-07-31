import Link from "next/link";
import { createClient, getUtilisateurConnecte } from "@/lib/supabase/server";
import { getPatients } from "@/lib/data/patients";
import { getMissionsDuJour, getTourneeDuJour } from "@/lib/data/ma-journee";
import { ListePatients } from "@/components/ui/ListePatients";
import { journaliserEchec } from "@/lib/journal";

export default async function PatientsPage() {
  const supabase = await createClient();
  const user = await getUtilisateurConnecte();

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

  const nombre = patients.length;

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto w-full max-w-2xl px-6 py-6 sm:py-10">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-[28px] font-semibold tracking-tight sm:text-[32px]">Patients</h1>
          <Link
            href="/patients/nouveau"
            className="btn-glace whitespace-nowrap rounded-[12px] bg-gradient-to-r from-brand-violet to-brand-rose px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_6px_16px_rgba(124,58,237,0.3)]"
          >
            Ajouter un patient
          </Link>
        </div>
        <p className="mt-1.5 text-[14px] text-navy/50">
          {nombre} patient{nombre > 1 ? "s" : ""} suivi{nombre > 1 ? "s" : ""}
        </p>

        <ListePatients patients={patients} prochaineVisiteParPatient={prochaineVisiteParPatient} />
      </div>
    </main>
  );
}
