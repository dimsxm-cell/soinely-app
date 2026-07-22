import { createClient } from "@/lib/supabase/server";
import { BarreNavigationBasse } from "@/components/layout/BarreNavigationBasse";
import { BarreSuperieure } from "@/components/layout/BarreSuperieure";
import { EcouteDeFondEly } from "@/components/layout/EcouteDeFondEly";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ecoutePermanenteActivee = Boolean(user?.user_metadata?.ecoute_permanente_ely);

  return (
    <div className="min-h-screen bg-[#F6F7F5]">
      <BarreSuperieure />
      <div className="pb-24">{children}</div>
      <BarreNavigationBasse />
      <EcouteDeFondEly ecoutePermanenteActivee={ecoutePermanenteActivee} />
    </div>
  );
}
