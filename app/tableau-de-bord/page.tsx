import { createClient, getUtilisateurConnecte } from "@/lib/supabase/server";
import { getTourneeDuJour, getMissionsTourneeVue } from "@/lib/data/ma-journee";
import { getPatients } from "@/lib/data/patients";
import { getContexteTarifaire } from "@/lib/data/ngap";
import { calculerMontantTournee, type ContexteTarifaire } from "@/lib/cotation";
import { calculerMajorationsTournee } from "@/lib/majorations";
import { formaterNomPropre } from "@/lib/format";
import { TableauDeBordDesktop } from "@/components/ui/TableauDeBordDesktop";
import type { MissionTourneeVue } from "@/lib/data/ma-journee";

export default async function TableauDeBordPage() {
  const supabase = await createClient();
  const user = await getUtilisateurConnecte();

  const nomComplet = user?.user_metadata?.full_name as string | undefined;
  const prenom = nomComplet ? formaterNomPropre(nomComplet).split(" ")[0] : undefined;

  const tournee = user ? await getTourneeDuJour(supabase, user.id) : null;
  const patients = user ? await getPatients(supabase, user.id) : [];

  const [missions, contexteTarifaire] =
    tournee && user
      ? await Promise.all([
          getMissionsTourneeVue(supabase, tournee.id),
          getContexteTarifaire(supabase, user.id),
        ])
      : [[] as MissionTourneeVue[], { zone: "metropole", valeurs: new Map() } satisfies ContexteTarifaire];

  const montantActes = calculerMontantTournee(missions, contexteTarifaire);
  const montantMajorations = tournee
    ? calculerMajorationsTournee(missions, tournee.date, contexteTarifaire)
    : 0;
  const montantCotationJour = Math.round((montantActes + montantMajorations) * 100) / 100;

  return (
    <TableauDeBordDesktop
      prenom={prenom}
      missions={missions}
      nombrePatients={patients.length}
      montantCotationJour={montantCotationJour}
    />
  );
}
