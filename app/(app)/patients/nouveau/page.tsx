"use client";

import { useState } from "react";
import { createPatientAction } from "@/lib/data/patients-actions";
import { ChampAvecDictee } from "@/components/ui/ChampAvecDictee";
import { ChampsIdentite } from "@/components/ui/ChampsIdentite";
import { ChampTelephone } from "@/components/ui/ChampTelephone";
import { ChampForfaitBsi } from "@/components/ui/ChampForfaitBsi";
import { LienRetour } from "@/components/ui/LienRetour";

export default function NouveauPatientPage() {
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function handleSubmit(formData: FormData) {
    setErreur(null);
    setEnCours(true);
    const resultat = await createPatientAction(formData);
    if (!resultat.success) {
      setErreur(resultat.error);
      setEnCours(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F6F7F5] pb-28 text-navy">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10 sm:py-14">
        <div>
          <LienRetour href="/patients" label="Patients" />
          <h1 className="mt-2.5 font-display text-[28px] font-medium leading-tight sm:text-[32px]">
            Ajouter un patient
          </h1>
          <p className="mt-1.5 text-[14px] text-navy/50">
            Renseignez les informations du patient — vous pourrez les modifier à tout moment.
          </p>
        </div>

        <form
          action={handleSubmit}
          className="flex flex-col gap-5 rounded-[22px] border border-navy/10 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,.04),0_18px_40px_rgba(15,23,42,.06)] sm:p-7"
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
          <ChampForfaitBsi />

          {erreur && (
            <p className="rounded-[12px] border border-danger/20 bg-danger/[0.06] px-3.5 py-2.5 text-[13.5px] font-medium text-danger">
              {erreur}
            </p>
          )}

          <button
            type="submit"
            disabled={enCours}
            className="btn-glace mt-1 rounded-[12px] bg-gradient-to-r from-brand-violet to-brand-rose px-5 py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(124,58,237,0.28)] disabled:opacity-60"
          >
            {enCours ? "Création en cours…" : "Créer la fiche patient"}
          </button>
        </form>
      </div>
    </main>
  );
}
