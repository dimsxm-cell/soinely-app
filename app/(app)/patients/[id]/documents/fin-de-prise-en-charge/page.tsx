import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPatient } from "@/lib/data/patients";
import { BoutonImprimer } from "@/components/ui/BoutonImprimer";
import { CaseACocher, EnTeteDocument, BlocSignature, TitreSection } from "@/components/ui/ElementsDocument";
import { LienRetour } from "@/components/ui/LienRetour";

const ECHELLES = [
  "Douleur",
  "État général",
  "Autonomie",
  "Nutrition / hydratation",
  "Élimination (urinaire / intestinale)",
  "Peau / cicatrisation",
  "Observance des traitements",
];

export default async function DocumentFinDePriseEnChargePage({
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
            titreDocument="Fiche de fin de prise en charge"
            sousTitre="Selon les recommandations HAS."
            nomIdel={nomIdel}
            patient={patient}
          />

          <div className="flex flex-col gap-6">
            <section>
              <TitreSection>Motif de fin de prise en charge</TitreSection>
              <ul className="mt-3 grid grid-cols-2 gap-2">
                <CaseACocher label="Objectifs thérapeutiques atteints" />
                <CaseACocher label="Amélioration / stabilisation de l'état de santé" />
                <CaseACocher label="Hospitalisation" />
                <CaseACocher label="Transfert vers un autre professionnel / structure" />
                <CaseACocher label="Refus de la poursuite des soins à domicile" />
                <CaseACocher label="Non observance / ruptures répétées" />
                <CaseACocher label="Décès" />
                <CaseACocher label="Autre motif : …………………………………" />
              </ul>
            </section>

            <section>
              <TitreSection>Résultats / objectifs atteints</TitreSection>
              <ul className="mt-3 flex flex-col gap-2">
                <CaseACocher label="Objectifs atteints" />
                <CaseACocher label="Objectifs partiellement atteints" />
                <CaseACocher label="Objectifs non atteints" />
              </ul>
              <p className="mt-2 text-[13.5px] text-navy/70">Commentaires : ……………………………………………………</p>
            </section>

            <section>
              <TitreSection>Évaluation de fin de prise en charge</TitreSection>
              <div className="mt-3 flex flex-col gap-2.5">
                {ECHELLES.map((label) => (
                  <div key={label} className="flex items-center justify-between gap-3 text-[13.5px] text-navy/80">
                    <span>{label}</span>
                    <span className="font-mono tracking-widest text-navy/40">0 1 2 3 4 5 6 7 8 9 10</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <TitreSection>Soins réalisés pendant la prise en charge</TitreSection>
              <ul className="mt-3 grid grid-cols-2 gap-2">
                <CaseACocher label="Soins d'hygiène et de confort" />
                <CaseACocher label="Coordination des professionnels" />
                <CaseACocher label="Soins de prévention (escarres, chutes...)" />
                <CaseACocher label="Soutien à l'autonomie" />
                <CaseACocher label="Soins techniques (pansements, injections...)" />
                <CaseACocher label="Conseils hygiéno-diététiques" />
                <CaseACocher label="Surveillance (paramètres cliniques...)" />
                <CaseACocher label="Éducation thérapeutique" />
              </ul>
            </section>

            <section>
              <TitreSection>Recommandations à poursuivre</TitreSection>
              <p className="mt-2 text-[13.5px] leading-relaxed text-navy/70">
                À destination du patient, de l&apos;entourage ou d&apos;autres soignants :
                <br />
                ……………………………………………………………………………………………………………………
              </p>
            </section>

            <section>
              <TitreSection>Transmission des informations et documents remis</TitreSection>
              <p className="mt-2 text-[13.5px] text-navy/70">Les informations utiles à la continuité des soins ont été transmises à :</p>
              <ul className="mt-2 grid grid-cols-2 gap-2">
                <CaseACocher label="Médecin traitant" />
                <CaseACocher label="Autre infirmier(ère) libéral(e)" />
                <CaseACocher label="HAD / structure" />
                <CaseACocher label="Patient / entourage" />
              </ul>
              <p className="mt-3 text-[13px] font-bold uppercase tracking-wide text-navy/45">Documents remis au patient</p>
              <ul className="mt-2 grid grid-cols-2 gap-2">
                <CaseACocher label="Ordonnances" />
                <CaseACocher label="Compte-rendu de soins" />
                <CaseACocher label="Conseils / recommandations" />
                <CaseACocher label="Autres : …………………………" />
              </ul>
            </section>

            <div className="grid grid-cols-3 gap-3">
              <BlocSignature titre="Patient" />
              <BlocSignature titre="Infirmier(ère) libéral(e)" nom={nomIdel} />
              <BlocSignature titre="Médecin traitant" nom={patient.medecinNom || undefined} />
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
