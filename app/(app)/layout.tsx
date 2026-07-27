import { createClient, getUtilisateurConnecte } from "@/lib/supabase/server";
import { getAvatarUrl } from "@/lib/data/profil";
import { BarreNavigationBasse } from "@/components/layout/BarreNavigationBasse";
import { BarreSuperieure } from "@/components/layout/BarreSuperieure";
import { EcouteDeFondEly } from "@/components/layout/EcouteDeFondEly";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const user = await getUtilisateurConnecte();
  const ecoutePermanenteActivee = Boolean(user?.user_metadata?.ecoute_permanente_ely);
  const avatarPath = user?.user_metadata?.avatar_path as string | undefined;
  const avatarUrl = avatarPath ? await getAvatarUrl(supabase, avatarPath) : null;

  return (
    <div className="min-h-screen bg-[#F6F7F5]">
      <BarreSuperieure avatarUrl={avatarUrl} />
      <div className="pb-24">{children}</div>
      <BarreNavigationBasse />
      <EcouteDeFondEly ecoutePermanenteActivee={ecoutePermanenteActivee} />
    </div>
  );
}
