import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPatient } from "@/lib/data/patients";
import { BoutonImprimer } from "@/components/ui/BoutonImprimer";
import { CaseACocher, EnTeteDocument, BlocSignature, TitreSection } from "@/components/ui/ElementsDocument";
import { LienRetour } from "@/components/ui/LienRetour";

export default async function DocumentConsentementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const patient = await getPatient(supabase, id);

  if (!patient) notFound();

  const nomIdel = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "";

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy print:bg-white">
      <div className="mx-auto flex max-w-[720px] flex-col gap-6 px-6 py-10 sm:py-14 print:py-0">
        <div className="print:hidden">
          <LienRetour href={`/patients/${patient.id}`} label={patient.nomComplet} />
        </div>

        <div className="rounded-[20px] border border-navy/10 bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,.04),0_18px_40px_rgba(15,23,42,.06)] print:border-0 print:p-0 print:shadow-none">
          <EnTeteDocument
            titreDocument="Fiche de consentement éclairé"
            sousTitre="Personne de confiance et consentement aux soins — selon les recommandations HAS."
            nomIdel={nomIdel}
            patient={patient}
          />

          <div className="flex flex-col gap-6">
            <section>
              <TitreSection>Personne de confiance (article L1111-6 du Code de la santé publique)</TitreSection>
              <div className="mt-3 grid grid-cols-2 gap-3 text-[14px] text-navy/80">
                <p>Nom : {patient.personneConfianceNom || "……………………………………"}</p>
                <p>Téléphone : {patient.personneConfianceTelephone || "……………………………………"}</p>
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                <CaseACocher label="Conjoint(e)" />
                <CaseACocher label="Enfant" />
                <CaseACocher label="Parent" />
                <CaseACocher label="Frère / sœur" />
                <CaseACocher label="Ami(e)" />
                <CaseACocher label="Tuteur" />
              </ul>
            </section>

            <section>
              <TitreSection>Consentement aux soins</TitreSection>
              <p className="mt-2 text-[14px] text-navy/70">
                Je reconnais avoir reçu une information claire et adaptée concernant :
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                <CaseACocher label="Les soins infirmiers réalisés à domicile" />
                <CaseACocher label="Les bénéfices attendus" />
                <CaseACocher label="Les risques éventuels" />
                <CaseACocher label="Les modalités de surveillance" />
                <CaseACocher label="Les alternatives possibles" />
                <CaseACocher label="Mon droit de poser toutes les questions nécessaires" />
                <CaseACocher label="Mon droit de retirer mon consentement à tout moment" />
              </ul>
              <p className="mt-4 text-[13px] font-bold uppercase tracking-wide text-navy/45">Décision</p>
              <ul className="mt-2 flex flex-col gap-2">
                <CaseACocher label="J'accepte les soins infirmiers prescrits." />
                <CaseACocher label="Je refuse les soins infirmiers." />
              </ul>
              <p className="mt-3 text-[13.5px] text-navy/70">Date d&apos;effet : ……… / ……… / …………</p>
            </section>

            <section>
              <TitreSection>Directives anticipées</TitreSection>
              <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                <CaseACocher label="Oui" />
                <CaseACocher label="Non" />
                <CaseACocher label="Ne souhaite pas répondre" />
              </ul>
              <p className="mt-2 text-[13.5px] text-navy/70">Lieu où elles sont conservées : ……………………………………</p>
            </section>

            <section>
              <TitreSection>Autorisation de partage des informations médicales</TitreSection>
              <p className="mt-2 text-[14px] text-navy/70">
                J&apos;autorise les échanges d&apos;informations nécessaires à la continuité de ma prise en charge
                entre les professionnels suivants :
              </p>
              <ul className="mt-3 grid grid-cols-2 gap-2">
                <CaseACocher label="Médecin traitant" />
                <CaseACocher label="Infirmier(ère) libéral(e)" />
                <CaseACocher label="Pharmacien" />
                <CaseACocher label="Kinésithérapeute" />
                <CaseACocher label="Hospitalisation à domicile (HAD)" />
                <CaseACocher label="Prestataire de matériel médical" />
              </ul>
            </section>

            <div className="grid grid-cols-3 gap-3">
              <BlocSignature titre="Patient" />
              <BlocSignature titre="Personne de confiance" sousTitre="si présente" />
              <BlocSignature titre="Infirmier(ère)" nom={nomIdel} />
            </div>
          </div>
        </div>

        <div className="flex justify-center print:hidden">
          <BoutonImprimer />
        </div>
      </div>
    </main>
  );
}
