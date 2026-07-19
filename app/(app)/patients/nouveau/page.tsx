import Link from "next/link";
import { createPatientAction } from "@/lib/data/patients-actions";
import { Button } from "@/components/ui/Button";

export default function NouveauPatientPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <Link href="/patients" className="text-primary hover:underline">
          ‹ Patients
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-navy">Ajouter un patient</h1>
      </div>

      <form action={createPatientAction} className="flex flex-col gap-4 rounded-card border border-navy/10 bg-white p-6">
        <label className="flex flex-col gap-1 text-sm text-navy">
          Nom complet
          <input name="nomComplet" required className="rounded-card border border-navy/20 p-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-navy">
          Adresse
          <input name="adresse" required className="rounded-card border border-navy/20 p-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-navy">
          Téléphone
          <input name="telephone" required className="rounded-card border border-navy/20 p-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-navy">
          Date de naissance
          <input type="date" name="dateNaissance" className="rounded-card border border-navy/20 p-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-navy">
          Allergies
          <textarea name="allergies" rows={2} className="rounded-card border border-navy/20 p-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-navy">
          Consignes
          <textarea name="consignes" rows={2} className="rounded-card border border-navy/20 p-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-navy">
          Médecin traitant
          <input name="medecinNom" className="rounded-card border border-navy/20 p-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-navy">
          Téléphone du médecin traitant
          <input name="medecinTelephone" className="rounded-card border border-navy/20 p-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-navy">
          Contact d&apos;urgence
          <input name="contactUrgenceNom" className="rounded-card border border-navy/20 p-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-navy">
          Téléphone du contact d&apos;urgence
          <input name="contactUrgenceTelephone" className="rounded-card border border-navy/20 p-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-navy">
          Antécédents / pathologies
          <textarea name="antecedents" rows={2} className="rounded-card border border-navy/20 p-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-navy">
          Traitements en cours
          <textarea name="traitementsEnCours" rows={2} className="rounded-card border border-navy/20 p-2" />
        </label>
        <Button type="submit" variant="primary" className="self-start">
          Créer la fiche patient
        </Button>
      </form>
    </main>
  );
}
