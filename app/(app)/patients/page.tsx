import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPatients } from "@/lib/data/patients";
import { CartePatient } from "@/components/ui/CartePatient";
import { Button } from "@/components/ui/Button";

export default async function PatientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const patients = user ? await getPatients(supabase, user.id) : [];

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10 sm:py-14">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-[28px] font-medium leading-tight sm:text-[32px]">Patients</h1>
          <Link href="/patients/nouveau">
            <Button variant="primary">Ajouter un patient</Button>
          </Link>
        </div>

        {patients.length > 0 ? (
          <div className="flex flex-col gap-4">
            {patients.map((patient) => (
              <CartePatient key={patient.id} patient={patient} />
            ))}
          </div>
        ) : (
          <p className="text-navy/60">Aucun patient enregistré pour le moment.</p>
        )}
      </div>
    </main>
  );
}
