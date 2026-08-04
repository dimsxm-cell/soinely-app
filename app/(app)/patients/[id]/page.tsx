import { notFound } from "next/navigation";
import { createClient, getUtilisateurConnecte } from "@/lib/supabase/server";
import { getPatient, getSoinsPrescrits } from "@/lib/data/patients";
import { getVisitesPatient } from "@/lib/data/dossier-patient";
import { getAvatarUrl } from "@/lib/data/profil";
import { arreterSoinPrescritAction, coterSoinPrescritAction, updatePatientAction } from "@/lib/data/patients-actions";
import { FormulaireSoinPrescrit } from "@/components/ui/FormulaireSoinPrescrit";
import { getCodesNgap } from "@/lib/data/ngap";
import { formaterNomPropre } from "@/lib/format";
import { FormulaireAvecRetour } from "@/components/ui/FormulaireAvecRetour";
import { ChampAvecDictee } from "@/components/ui/ChampAvecDictee";
import { ChampsIdentite } from "@/components/ui/ChampsIdentite";
import { ChampTelephone } from "@/components/ui/ChampTelephone";
import { EnTetePatientMobile } from "@/components/ui/EnTetePatientMobile";
import { OngletsPatient } from "@/components/ui/OngletsPatient";

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
        <p className="text-[14px] font-bold text-navy">{titre}</p>
        {sous && <p className="text-[12px] text-navy/50">{sous}</p>}
      </div>
    </div>
  );
}

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [patient, soins, codesNgap, visites, user] = await Promise.all([
    getPatient(supabase, id),
    getSoinsPrescrits(supabase, id),
    getCodesNgap(supabase),
    getVisitesPatient(supabase, id),
    getUtilisateurConnecte(),
  ]);
  const avatarPath = user?.user_metadata?.avatar_path as string | undefined;
  const avatarUrl = avatarPath ? await getAvatarUrl(supabase, avatarPath) : null;

  if (!patient) notFound();
  const soinsArretes = soins.filter((soin) => !soin.actif);

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      {/* ── Header iOS violet ── */}
      <EnTetePatientMobile patient={patient} soins={soins} visites={visites} avatarUrl={avatarUrl} />

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
      {/* Un seul formulaire pour toute la fiche : un geste, un bouton, un enregistrement. */}
      <FormulaireAvecRetour action={updatePatientAction} messageSucces="Fiche enregistrée." className="contents">
        <input type="hidden" name="patientId" value={patient.id} />
        {/* Champs gérés depuis l'onglet Soins : on les repasse tels quels pour ne pas les écraser. */}
        <input type="hidden" name="allergies" value={patient.allergies ?? ""} />
        <input type="hidden" name="consignes" value={patient.consignes ?? ""} />
        <input type="hidden" name="noteSoin" value={patient.noteSoin ?? ""} />
        <input type="hidden" name="antecedents" value={patient.antecedents ?? ""} />
        <input type="hidden" name="forfaitBsi" value={patient.forfaitBsi ?? ""} />

        <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-5 pb-32">
          {/* Section Identité */}
          <section className="rounded-[20px] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <SectionTitre
              icone={<SectionIcon path="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />}
              titre="Identité"
              sous="Informations administratives"
            />
            <div className="flex flex-col gap-3">
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
            </div>
          </section>

          {/* Section Coordonnées */}
          <section className="rounded-[20px] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <SectionTitre
              icone={<SectionIcon path="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" color="#0EA5E9" />}
              titre="Coordonnées"
              sous="Adresse et téléphone"
            />
            <div className="flex flex-col gap-3">
              <ChampAvecDictee name="adresse" label="Adresse" defaultValue={patient.adresse} required />
              <ChampTelephone name="telephone" label="Téléphone" defaultValue={patient.telephone} required />
            </div>
          </section>

          {/* Section Entourage médical */}
          <section className="rounded-[20px] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <SectionTitre
              icone={<SectionIcon path="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" color="#10B981" />}
              titre="Entourage médical"
              sous="Médecin traitant et personne de confiance"
            />
            <div className="flex flex-col gap-3">
              <ChampAvecDictee name="medecinNom" label="Médecin traitant" defaultValue={patient.medecinNom} />
              <ChampTelephone name="medecinTelephone" label="Téléphone du médecin" defaultValue={patient.medecinTelephone} />
              <ChampAvecDictee name="personneConfianceNom" label="Personne de confiance" defaultValue={patient.personneConfianceNom} />
              <ChampTelephone
                name="personneConfianceTelephone"
                label="Téléphone de la personne de confiance"
                defaultValue={patient.personneConfianceTelephone}
              />
            </div>
          </section>
        </div>

        {/* Bouton Enregistrer la fiche flottant — seul et unique bouton d'enregistrement de l'onglet */}
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-10 px-4 pb-3">
          <button
            type="submit"
            className="btn-glace flex w-full items-center justify-center rounded-[16px] py-4 text-[15.5px] font-bold tracking-[-0.2px] text-white"
            style={{
              background: "linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)",
            }}
          >
            Enregistrer la fiche
          </button>
        </div>
      </FormulaireAvecRetour>
    </main>
  );
}
