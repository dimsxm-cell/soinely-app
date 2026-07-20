import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function AbonnementSuccesPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 bg-[#F6F7F5] p-6 text-center">
      <h1 className="text-2xl font-semibold text-navy">Abonnement activé</h1>
      <p className="text-navy/60">
        Votre abonnement est bien actif. Vous pouvez dès maintenant accéder à votre journée.
      </p>
      <Link href="/ma-journee">
        <Button>Accéder à Ma Journée</Button>
      </Link>
    </main>
  );
}
