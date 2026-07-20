"use client";

import { useState } from "react";
import { createPatientAction } from "@/lib/data/patients-actions";
import { Button } from "@/components/ui/Button";
import { ChampAvecDictee } from "@/components/ui/ChampAvecDictee";
import { ChampsIdentite } from "@/components/ui/ChampsIdentite";
import { ChampTelephone } from "@/components/ui/ChampTelephone";
import { LienRetour } from "@/components/ui/LienRetour";

export default function NouveauPatientPage() {
  const [erreur, setErreur] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setErreur(null);
    const resultat = await createPatientAction(formData);
    if (!resultat.success) {
      setErreur(resultat.error);
    }
  }

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10 sm:py-14">
        <div>
          <LienRetour href="/patients" label="Patients" />
          <h1 className="mt-2 font-display text-[28px] font-medium leading-tight sm:text-[32px]">
            Ajouter un patient
          </h1>
        </div>

        <form
          action={handleSubmit}
          className="flex flex-col gap-4 rounded-[20px] border border-navy/10 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,.04),0_18px_40px_rgba(15,23,42,.06)]"
        >
          <ChampAvecDictee name="nomComplet" label="Nom et prénom" required />
          <ChampsIdentite />
          <ChampAvecDictee name="adresse" label="Adresse" required />
          <ChampTelephone name="telephone" label="Téléphone" required />
          <ChampAvecDictee name="medecinNom" label="Médecin traitant" />
          <ChampAvecDictee name="personneConfianceNom" label="Personne de confiance" />
          <ChampAvecDictee
            name="noteSoin"
            label="Soin"
            multiligne
            rows={2}
            placeholder="Ex. : pansement quotidien, injection le matin"
          />
          <ChampAvecDictee name="antecedents" label="Antécédents médicaux" multiligne rows={2} />
          <ChampAvecDictee name="allergies" label="Allergies" multiligne rows={2} />
          <ChampAvecDictee name="consignes" label="Consignes spécifiques" multiligne rows={2} />
          {erreur && <p className="text-sm text-danger">{erreur}</p>}
          <Button type="submit" variant="primary" className="self-start">
            Créer la fiche patient
          </Button>
        </form>
      </div>
    </main>
  );
}
