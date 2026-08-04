import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPatient, getSoinsPrescrits } from "@/lib/data/patients";
import { getVisitesPatient } from "@/lib/data/dossier-patient";
import { arreterSoinPrescritAction, coterSoinPrescritAction, updatePatientAction } from "@/lib/data/patients-actions";
import { FormulaireSoinPrescrit } from "@/components/ui/FormulaireSoinPrescrit";
import { getCodesNgap } from "@/lib/data/ngap";
import { formaterNomPropre } from "@/lib/format";
import type { SoinPrescrit } from "@/lib/types/clinical";
import { Button } from "@/components/ui/Button";
import { FormulaireAvecRetour } from "@/components/ui/FormulaireAvecRetour";
import { ChampAvecDictee } from "@/components/ui/ChampAvecDictee";
import { ChampsIdentite } from "@/components/ui/ChampsIdentite";
import { ChampForfaitBsi } from "@/components/ui/ChampForfaitBsi";
import { ChampTelephone } from "@/components/ui/ChampTelephone";
import { EnTetePatientMobile } from "@/components/ui/EnTetePatientMobile";
import { OngletsPatient } from "@/components/ui/OngletsPatient";
import Link from "next/link";

const JOUR_LABEL = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function decrireRecurrence(soin: SoinPrescrit): string {
  if (soin.frequenceType === "ponctuel") return `Le ${soin.dateDebut}`;
  if (soin.frequenceType === "quotidien") return "Tous les jours";
  if (soin.frequenceType === "tous_les_x_jours") return `Tous les ${soin.intervalleJours} jours`;
  return (soin.joursSemaine ?? []).map((jour) => JOUR_LABEL[jour]).join(", ");
}

/** Icône pour chaque section de la fiche identité */
function SectionIcon({ path, color = "#7C3AED" }: { path: string; color?: string }) {
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
      style={{ background: `${color}18` }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-4 w-4"
      >
        <path d={path} />
      </svg>
    </span>
  );
}

/** En-tête d'une section de formulaire */
function SectionTitre({ icone, titre, sous }: { icone: React.ReactNode; titre: string; sous?: string }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      {icone}
      <div>
        <p className="font-sf-display text-[15px] font-bold leading-[1.3] tracking-[-0.35px] text-navy">{titre}</p>
        {sous && <p className="text-[11.5px] leading-[1.45] text-[#8D8798]">{sous}</p>}
      </div>
    </div>
  );
}

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [patient, soins, codesNgap, visites] = await Promise.all([
    getPatient(supabase, id),
    getSoinsPrescrits(supabase, id),
    getCodesNgap(supabase),
    getVisitesPatient(supabase, id),
  ]);

  if (!patient) notFound();
  const soinsActifs = soins.filter((soin) => soin.actif);
  const soinsArretes = soins.filter((soin) => !soin.actif);

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      {/* ── Header iOS violet ── */}
      <EnTetePatientMobile patient={patient} soins={soins} visites={visites} />

      {/* ── Onglets de navigation ── */}
      <div
        className="sticky top-0 z-20 px-4 py-3"
        style={{
          background: "linear-gradient(160deg, #2D1557 0%, #3B1D72 100%)",
        }}
      >
        <div className="mx-auto max-w-xl">
          <OngletsPatient patientId={patient.id} />
        </div>
      </div>

      {/* ── Contenu : Identité ── */}
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-5 pb-32">

        {/* Section Identité */}
        <section className="rounded-[20px] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <SectionTitre
            icone={<SectionIcon path="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />}
            titre="Identité"
            sous="Informations administratives"
          />
          <FormulaireAvecRetour action={updatePatientAction} messageSucces="Fiche enregistrée." className="flex flex-col gap-3">
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
          </FormulaireAvecRetour>
        </section>

        {/* Section Coordonnées */}
        <section className="rounded-[20px] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <SectionTitre
            icone={<SectionIcon path="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" color="#0EA5E9" />}
            titre="Coordonnées"
            sous="Adresse et téléphone"
          />
          <FormulaireAvecRetour action={updatePatientAction} messageSucces="Coordonnées enregistrées." className="flex flex-col gap-3">
            <input type="hidden" name="nomComplet" value={patient.nomComplet} />
            <input type="hidden" name="patientId" value={patient.id} />
            <ChampAvecDictee name="adresse" label="Adresse" defaultValue={patient.adresse} required />
            <ChampTelephone name="telephone" label="Téléphone" defaultValue={patient.telephone} required />
            <Button type="submit" variant="secondary" className="self-start">
              Enregistrer
            </Button>
          </FormulaireAvecRetour>
        </section>

        {/* Section Entourage médical */}
        <section className="rounded-[20px] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <SectionTitre
            icone={<SectionIcon path="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" color="#10B981" />}
            titre="Entourage médical"
            sous="Médecin traitant et personne de confiance"
          />
          <FormulaireAvecRetour action={updatePatientAction} messageSucces="Entourage enregistré." className="flex flex-col gap-3">
            <input type="hidden" name="nomComplet" value={patient.nomComplet} />
            <input type="hidden" name="adresse" value={patient.adresse} />
            <input type="hidden" name="telephone" value={patient.telephone} />
            <input type="hidden" name="patientId" value={patient.id} />
            <ChampAvecDictee name="medecinNom" label="Médecin traitant" defaultValue={patient.medecinNom} />
            <ChampTelephone name="medecinTelephone" label="Téléphone du médecin" defaultValue={patient.medecinTelephone} />
            <ChampAvecDictee name="personneConfianceNom" label="Personne de confiance" defaultValue={patient.personneConfianceNom} />
            <ChampTelephone
              name="personneConfianceTelephone"
              label="Téléphone de la personne de confiance"
              defaultValue={patient.personneConfianceTelephone}
            />
            <Button type="submit" variant="secondary" className="self-start">
              Enregistrer
            </Button>
          </FormulaireAvecRetour>
        </section>

        {/* Section Soins & Consignes */}
        <section className="rounded-[20px] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <SectionTitre
            icone={<SectionIcon path="M8 2v4 M16 2v4 M3 10h18 M8 14h.01 M12 14h.01 M16 14h.01 M8 18h.01 M12 18h.01 M16 18h.01 M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" color="#F59E0B" />}
            titre="Soins & Consignes"
            sous="Notes de soin, antécédents, allergies"
          />
          <FormulaireAvecRetour action={updatePatientAction} messageSucces="Soins enregistrés." className="flex flex-col gap-3">
            <input type="hidden" name="nomComplet" value={patient.nomComplet} />
            <input type="hidden" name="adresse" value={patient.adresse} />
            <input type="hidden" name="telephone" value={patient.telephone} />
            <input type="hidden" name="patientId" value={patient.id} />
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
            <ChampForfaitBsi defaultValue={patient.forfaitBsi} />
            <Button type="submit" variant="secondary" className="self-start">
              Enregistrer
            </Button>
          </FormulaireAvecRetour>
        </section>

        {/* Soins prescrits actifs — résumé rapide avec lien vers onglet Soins */}
        {soinsActifs.length > 0 && (
          <section className="rounded-[20px] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <div className="mb-4 flex items-center justify-between">
              <SectionTitre
                icone={<SectionIcon path="M9 12l2 2 4-4 M7.835 4.697a3.42 3.42 0 0 0 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 0 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 0 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 0-.806 1.946 3.42 3.42 0 0 1-3.138 3.138 3.42 3.42 0 0 0-1.946.806 3.42 3.42 0 0 1-4.438 0 3.42 3.42 0 0 0-1.946-.806 3.42 3.42 0 0 1-3.138-3.138 3.42 3.42 0 0 0-.806-1.946 3.42 3.42 0 0 1 0-4.438 3.42 3.42 0 0 0 .806-1.946 3.42 3.42 0 0 1 3.138-3.138z" color="#7C3AED" />}
                titre="Soins prescrits"
                sous={`${soinsActifs.length} soin${soinsActifs.length > 1 ? "s" : ""} actif${soinsActifs.length > 1 ? "s" : ""}`}
              />
              <Link href={`/patients/${patient.id}/prescriptions`} className="text-[13px] font-semibold text-brand-violet hover:underline">
                Voir tout →
              </Link>
            </div>
            <ul className="flex flex-col gap-2">
              {soinsActifs.slice(0, 3).map((soin) => (
                <li key={soin.id} className="flex items-center justify-between gap-3 rounded-[12px] bg-[#F6F7F5] px-4 py-3">
                  <div>
                    <p className="text-[14px] font-semibold text-navy">
                      {soin.ngapCode ? `${soin.ngapCode} — ` : ""}{soin.typeSoin}
                    </p>
                    <p className="text-[12.5px] text-navy/55">
                      {decrireRecurrence(soin)} · {soin.heures.join(", ")}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-teal/10 px-2.5 py-1 text-[11px] font-semibold text-[#0E7E70]">
                    Actif
                  </span>
                </li>
              ))}
              {soinsActifs.length > 3 && (
                <li className="text-center text-[13px] text-navy/50">
                  +{soinsActifs.length - 3} autre{soinsActifs.length - 3 > 1 ? "s" : ""}…
                </li>
              )}
            </ul>
          </section>
        )}
      </div>

      {/* Bouton Enregistrer la fiche flottant */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-10 px-4 pb-3">
        <Link
          href={`/patients/${patient.id}`}
          className="btn-glace flex w-full items-center justify-center rounded-[16px] py-4 text-[15px] font-bold tracking-[-0.2px] text-white"
          style={{
            background: "linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)",
          }}
        >
          Enregistrer la fiche
        </Link>
      </div>
    </main>
  );
}
