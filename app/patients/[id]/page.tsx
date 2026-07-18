import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPatient } from "@/lib/data/patients";
import { updatePatientAction } from "@/lib/data/patients-actions";
import { Button } from "@/components/ui/Button";

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const patient = await getPatient(supabase, id);

  if (!patient) notFound();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <Link href="/patients" className="text-primary hover:underline">
          ‹ Patients
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-navy">{patient.nomComplet}</h1>
      </div>

      <section className="rounded-card border border-navy/10 bg-white p-6">
        <p className="text-xs font-medium uppercase text-navy/60">Fiche patient</p>
        <form action={updatePatientAction} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="patientId" value={patient.id} />
          <label className="flex flex-col gap-1 text-sm text-navy">
            Nom complet
            <input
              name="nomComplet"
              defaultValue={patient.nomComplet}
              required
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Adresse
            <input
              name="adresse"
              defaultValue={patient.adresse}
              required
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Téléphone
            <input
              name="telephone"
              defaultValue={patient.telephone}
              required
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Date de naissance
            <input
              type="date"
              name="dateNaissance"
              defaultValue={patient.dateNaissance ?? ""}
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Allergies
            <textarea
              name="allergies"
              defaultValue={patient.allergies ?? ""}
              rows={2}
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Consignes
            <textarea
              name="consignes"
              defaultValue={patient.consignes ?? ""}
              rows={2}
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Médecin traitant
            <input
              name="medecinNom"
              defaultValue={patient.medecinNom ?? ""}
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Téléphone du médecin traitant
            <input
              name="medecinTelephone"
              defaultValue={patient.medecinTelephone ?? ""}
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Contact d&apos;urgence
            <input
              name="contactUrgenceNom"
              defaultValue={patient.contactUrgenceNom ?? ""}
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Téléphone du contact d&apos;urgence
            <input
              name="contactUrgenceTelephone"
              defaultValue={patient.contactUrgenceTelephone ?? ""}
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Antécédents / pathologies
            <textarea
              name="antecedents"
              defaultValue={patient.antecedents ?? ""}
              rows={2}
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Traitements en cours
            <textarea
              name="traitementsEnCours"
              defaultValue={patient.traitementsEnCours ?? ""}
              rows={2}
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <Button type="submit" variant="tertiary" className="self-start">
            Enregistrer
          </Button>
        </form>
      </section>
    </main>
  );
}
