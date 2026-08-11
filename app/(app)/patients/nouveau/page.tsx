"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { createPatientAction } from "@/lib/data/patients-actions";
import { ChampAvecDictee } from "@/components/ui/ChampAvecDictee";
import { ChampsIdentite } from "@/components/ui/ChampsIdentite";
import { ChampTelephone } from "@/components/ui/ChampTelephone";
import { ChampForfaitBsi } from "@/components/ui/ChampForfaitBsi";
import { FondHeroViolet } from "@/components/ui/FondHeroViolet";

function IconeSection({ path }: { path: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] bg-brand-violet/10 text-brand-violet">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
      </svg>
    </span>
  );
}

function SectionFormulaire({
  icone,
  titre,
  sous,
  children,
}: {
  icone: string;
  titre: string;
  sous: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[20px] border border-navy/10 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,.04)] sm:p-6">
      <div className="flex items-center gap-2.5">
        <IconeSection path={icone} />
        <div>
          <p className="font-display text-[15px] font-bold tracking-tight text-navy">{titre}</p>
          <p className="text-[11.5px] text-navy/45">{sous}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

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
      <div className="relative isolate overflow-hidden bg-[linear-gradient(168deg,#221b33_0%,#2c1f47_58%,#3a2260_100%)] px-5 pb-6 pt-6 text-white">
        <FondHeroViolet />
        <div className="relative mx-auto max-w-2xl">
          <Link
            href="/patients"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 py-1.5 pl-2.5 pr-3.5 text-[12.5px] font-semibold text-white"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5">
              <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Patients
          </Link>
          <p className="mt-5 font-display text-[26px] font-bold leading-tight tracking-tight">Nouveau patient</p>
          <p className="mt-1 text-[13px] text-[#b3aacd]">
            Renseignez l&apos;essentiel — tout reste modifiable après création.
          </p>
        </div>
      </div>

      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-6">
        <div className="flex items-start gap-2.5 rounded-[16px] border border-[rgba(168,85,247,.26)] bg-[linear-gradient(140deg,rgba(168,85,247,.13),rgba(109,40,217,.05))] px-3.5 py-3">
          <Image
            src="/marketing/ely-colibri-reflechi.webp"
            alt=""
            width={293}
            height={337}
            className="h-7 w-7 shrink-0 rounded-full border border-[rgba(168,85,247,.3)] bg-white object-contain"
          />
          <p className="text-[12.5px] leading-relaxed text-[#4b4359]">
            Utilisez le micro sur chaque champ pour dicter au lieu de taper — pratique en tournée.
          </p>
        </div>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <SectionFormulaire
            icone="M16 20v-1.6a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20M9 10.4a3.7 3.7 0 1 0 0-7.4 3.7 3.7 0 0 0 0 7.4Z"
            titre="État civil"
            sous="Identité du patient"
          >
            <ChampAvecDictee name="nomComplet" label="Nom et prénom" required />
            <ChampsIdentite />
          </SectionFormulaire>

          <SectionFormulaire
            icone="M12 21s-7-5.2-7-10.2A7 7 0 0 1 19 10.8C19 15.8 12 21 12 21ZM12 11.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z"
            titre="Coordonnées"
            sous="Adresse de tournée et téléphone"
          >
            <ChampAvecDictee name="adresse" label="Adresse" required />
            <ChampTelephone name="telephone" label="Téléphone" required />
          </SectionFormulaire>

          <SectionFormulaire
            icone="M6 3v6a4 4 0 0 0 8 0V3M18.5 14a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM16 13.5V16a6 6 0 0 1-12 0v-3"
            titre="Entourage médical"
            sous="Prescripteur et personne de confiance"
          >
            <ChampAvecDictee name="medecinNom" label="Médecin traitant" />
            <ChampAvecDictee name="personneConfianceNom" label="Personne de confiance" />
          </SectionFormulaire>

          <SectionFormulaire
            icone="M12 21s-7.5-4.7-7.5-10.4A4.6 4.6 0 0 1 12 7.6a4.6 4.6 0 0 1 7.5 3C19.5 16.3 12 21 12 21Z"
            titre="Soins à réaliser"
            sous="Le détail servira à la cotation"
          >
            <ChampAvecDictee
              name="noteSoin"
              label="Soin"
              multiligne
              rows={2}
              placeholder="Ex. : pansement quotidien, injection le matin"
            />
          </SectionFormulaire>

          <SectionFormulaire
            icone="M12 9v4.5M12 17h.01M10.3 3.9 2.6 17.4A2 2 0 0 0 4.3 20.4h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
            titre="Sécurité clinique"
            sous="Ce qui déclenche une alerte en tournée"
          >
            <ChampAvecDictee name="antecedents" label="Antécédents médicaux" multiligne rows={2} />
            <ChampAvecDictee name="allergies" label="Allergies" multiligne rows={2} />
            <ChampAvecDictee name="consignes" label="Consignes spécifiques" multiligne rows={2} />
          </SectionFormulaire>

          <SectionFormulaire
            icone="M6 3v12a3 3 0 0 0 3 3h6M18 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM6 6a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
            titre="Forfait de dépendance"
            sous="Change la cotation des actes techniques"
          >
            <ChampForfaitBsi />
          </SectionFormulaire>

          {erreur && (
            <p className="rounded-[12px] border border-danger/20 bg-danger/[0.06] px-3.5 py-2.5 text-[13.5px] font-medium text-danger">
              {erreur}
            </p>
          )}

          <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-10">
            <button
              type="submit"
              disabled={enCours}
              className="btn-glace flex min-h-[52px] w-full items-center justify-center rounded-full bg-gradient-to-r from-brand-violet to-brand-rose text-[15px] font-bold text-white shadow-[0_10px_22px_rgba(109,40,217,.3)] disabled:opacity-60"
            >
              {enCours ? "Création en cours…" : "Créer la fiche patient"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
