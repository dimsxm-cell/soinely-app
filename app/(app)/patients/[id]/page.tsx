import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPatient, getSoinsPrescrits } from "@/lib/data/patients";
import { createSoinPrescritAction, arreterSoinPrescritAction, coterSoinPrescritAction, updatePatientAction } from "@/lib/data/patients-actions";
import { getCodesNgap } from "@/lib/data/ngap";
import { formaterNomPropre } from "@/lib/format";
import type { SoinPrescrit } from "@/lib/types/clinical";
import { Button } from "@/components/ui/Button";
import { ChampAvecDictee } from "@/components/ui/ChampAvecDictee";
import { ChampsIdentite } from "@/components/ui/ChampsIdentite";
import { ChampTelephone } from "@/components/ui/ChampTelephone";
import { LienRetour } from "@/components/ui/LienRetour";
import Link from "next/link";

const DOCUMENTS_IMPRIMABLES = [
  { href: "identite", label: "Identité du patient", description: "Résumé de la fiche patient, prêt à imprimer." },
  {
    href: "consentement",
    label: "Consentement éclairé",
    description: "Personne de confiance et consentement aux soins.",
  },
  {
    href: "fin-de-prise-en-charge",
    label: "Fin de prise en charge",
    description: "Bilan et transmission à la fin d'un suivi.",
  },
  {
    href: "renoncement",
    label: "Attestation de renoncement",
    description: "En cas d'arrêt des soins à la demande du patient.",
  },
];

const JOUR_LABEL = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function decrireRecurrence(soin: SoinPrescrit): string {
  if (soin.frequenceType === "ponctuel") return `Le ${soin.dateDebut}`;
  if (soin.frequenceType === "quotidien") return "Tous les jours";
  if (soin.frequenceType === "tous_les_x_jours") return `Tous les ${soin.intervalleJours} jours`;
  return (soin.joursSemaine ?? []).map((jour) => JOUR_LABEL[jour]).join(", ");
}

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [patient, soins, codesNgap] = await Promise.all([
    getPatient(supabase, id),
    getSoinsPrescrits(supabase, id),
    getCodesNgap(supabase),
  ]);

  if (!patient) notFound();
  const soinsActifs = soins.filter((soin) => soin.actif);
  const soinsArretes = soins.filter((soin) => !soin.actif);

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10 sm:py-14">
        <div>
          <LienRetour href="/patients" label="Patients" />
          <h1 className="mt-4 text-center font-display text-[28px] font-medium leading-tight sm:text-[32px]">
            {formaterNomPropre(patient.nomComplet)}
          </h1>
        </div>

        <section className="rounded-card border border-navy/10 bg-white p-6">
        <p className="text-xs font-medium uppercase text-navy/60">Fiche patient</p>
        <form action={updatePatientAction} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="patientId" value={patient.id} />
          <ChampAvecDictee
            name="nomComplet"
            label="Nom et prénom"
            defaultValue={formaterNomPropre(patient.nomComplet)}
            required
          />
          <ChampsIdentite
            defaultNumeroSecu={patient.numeroSecu}
            defaultDateNaissance={patient.dateNaissance}
            defaultSexe={patient.sexe}
          />
          <ChampAvecDictee name="adresse" label="Adresse" defaultValue={patient.adresse} required />
          <ChampTelephone name="telephone" label="Téléphone" defaultValue={patient.telephone} required />
          <ChampAvecDictee name="medecinNom" label="Médecin traitant" defaultValue={patient.medecinNom} />
          <ChampTelephone
            name="medecinTelephone"
            label="Téléphone du médecin traitant"
            defaultValue={patient.medecinTelephone}
          />
          <ChampAvecDictee
            name="personneConfianceNom"
            label="Personne de confiance"
            defaultValue={patient.personneConfianceNom}
          />
          <ChampTelephone
            name="personneConfianceTelephone"
            label="Téléphone de la personne de confiance"
            defaultValue={patient.personneConfianceTelephone}
          />
          <ChampAvecDictee
            name="noteSoin"
            label="Soin"
            defaultValue={patient.noteSoin}
            multiligne
            rows={2}
            placeholder="Ex. : pansement quotidien, injection le matin"
          />
          <ChampAvecDictee
            name="antecedents"
            label="Antécédents médicaux"
            defaultValue={patient.antecedents}
            multiligne
            rows={2}
          />
          <ChampAvecDictee name="allergies" label="Allergies" defaultValue={patient.allergies} multiligne rows={2} />
          <ChampAvecDictee
            name="consignes"
            label="Consignes spécifiques"
            defaultValue={patient.consignes}
            multiligne
            rows={2}
          />
          <Button type="submit" variant="tertiary" className="self-start">
            Enregistrer
          </Button>
        </form>
      </section>

      <section className="rounded-card border border-navy/10 bg-white p-6">
        <p className="text-xs font-medium uppercase text-navy/60">Soins prescrits</p>
        <p className="mt-1 text-xs text-navy/50">
          Une cotation modifiée s&apos;applique aux tournées générées à partir du
          lendemain.
        </p>

        {soinsActifs.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-3">
            {soinsActifs.map((soin) => (
              <li
                key={soin.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-navy/10 p-3"
              >
                <div>
                  <p className="text-navy">
                    {soin.ngapCode ? `${soin.ngapCode} — ` : ""}
                    {soin.typeSoin}
                  </p>
                  <p className="text-sm text-navy/60">
                    {decrireRecurrence(soin)} · {soin.heures.join(", ")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={coterSoinPrescritAction} className="flex items-center gap-2">
                    <input type="hidden" name="soinId" value={soin.id} />
                    <input type="hidden" name="patientId" value={patient.id} />
                    <label className="sr-only" htmlFor={`cotation-${soin.id}`}>
                      Cotation NGAP de « {soin.typeSoin} »
                    </label>
                    <select
                      id={`cotation-${soin.id}`}
                      name="ngapCodeId"
                      defaultValue={soin.ngapCodeId ?? ""}
                      className="rounded-card border border-navy/20 p-2 text-sm"
                    >
                      <option value="">Aucune</option>
                      {codesNgap.map((code) => (
                        <option key={code.id} value={code.id}>
                          {code.code} — {code.libelle}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" variant="tertiary">
                      Enregistrer
                    </Button>
                  </form>
                  <form action={arreterSoinPrescritAction}>
                    <input type="hidden" name="soinId" value={soin.id} />
                    <input type="hidden" name="patientId" value={patient.id} />
                    <Button type="submit" variant="secondary">
                      Arrêter
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-navy/60">Aucun soin actif.</p>
        )}

        {soinsArretes.length > 0 && (
          <>
            <p className="mt-4 text-xs font-medium uppercase text-navy/40">Soins arrêtés</p>
            <ul className="mt-2 flex flex-col gap-2">
              {soinsArretes.map((soin) => (
                <li key={soin.id} className="text-sm text-navy/40">
                  {soin.typeSoin} — {decrireRecurrence(soin)}
                </li>
              ))}
            </ul>
          </>
        )}

        <form
          action={createSoinPrescritAction}
          className="mt-5 flex flex-col gap-3 border-t border-navy/10 pt-4"
        >
          <input type="hidden" name="patientId" value={patient.id} />
          <label className="flex flex-col gap-1 text-sm text-navy">
            Type de soin
            <input name="typeSoin" required className="rounded-card border border-navy/20 p-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Cotation NGAP (facultatif)
            <select
              name="ngapCodeId"
              defaultValue=""
              className="rounded-card border border-navy/20 p-2"
            >
              <option value="">Aucune</option>
              {codesNgap.map((code) => (
                <option key={code.id} value={code.id}>
                  {code.code} — {code.libelle}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Récurrence
            <select name="frequenceType" required className="rounded-card border border-navy/20 p-2">
              <option value="quotidien">Quotidien</option>
              <option value="jours_semaine">Jours de semaine précis</option>
              <option value="tous_les_x_jours">Tous les X jours</option>
              <option value="ponctuel">Ponctuel</option>
            </select>
          </label>
          <fieldset className="flex flex-wrap gap-3 text-sm text-navy">
            <legend className="text-xs text-navy/60">
              Jours (si &laquo;&nbsp;Jours de semaine précis&nbsp;&raquo;)
            </legend>
            {JOUR_LABEL.map((label, index) => (
              <label key={label} className="flex items-center gap-1">
                <input type="checkbox" name="joursSemaine" value={index} />
                {label}
              </label>
            ))}
          </fieldset>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Intervalle en jours (si &laquo;&nbsp;Tous les X jours&nbsp;&raquo;)
            <input type="number" name="intervalleJours" min={1} className="rounded-card border border-navy/20 p-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Heure(s) du soin (ex. 08:00, ou 07:00, 19:00 pour plusieurs)
            <input
              name="heures"
              type="text"
              required
              placeholder="08:00"
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Date de début
            <input
              type="date"
              name="dateDebut"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="rounded-card border border-navy/20 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-navy">
            Date de fin (optionnelle)
            <input type="date" name="dateFin" className="rounded-card border border-navy/20 p-2" />
          </label>
          <Button type="submit" variant="primary" className="self-start">
            Ajouter le soin
          </Button>
        </form>
        </section>

        <section className="rounded-card border border-navy/10 bg-white p-6">
          <p className="text-xs font-medium uppercase text-navy/60">Documents à imprimer</p>
          <p className="mt-2 text-sm text-navy/60">
            Pré-remplis avec les informations du patient et votre nom, prêts à imprimer et signer.
          </p>
          <div className="mt-4 flex flex-col gap-2.5">
            {DOCUMENTS_IMPRIMABLES.map((document) => (
              <Link
                key={document.href}
                href={`/patients/${patient.id}/documents/${document.href}`}
                className="row-lift flex items-center justify-between gap-3 rounded-[14px] border border-navy/10 bg-[#F6F7F5] px-4 py-3"
              >
                <div>
                  <p className="text-[14.5px] font-semibold text-navy">{document.label}</p>
                  <p className="text-[12.5px] text-navy/50">{document.description}</p>
                </div>
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-navy/30">
                  <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
