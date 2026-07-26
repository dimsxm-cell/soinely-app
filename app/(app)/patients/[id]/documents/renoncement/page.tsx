import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPatient } from "@/lib/data/patients";
import { BoutonImprimer } from "@/components/ui/BoutonImprimer";
import { CaseACocher, EnTeteDocument, BlocSignature, TitreSection } from "@/components/ui/ElementsDocument";
import { LienRetour } from "@/components/ui/LienRetour";

export default async function DocumentRenoncementPage({
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
            titreDocument="Attestation de renoncement de soins infirmiers"
            nomIdel={nomIdel}
            patient={patient}
          />

          <div className="flex flex-col gap-6">
            <section>
              <TitreSection>Je soussigné(e)</TitreSection>
              <p className="mt-3 text-[14px] leading-relaxed text-navy/80">
                Né(e) le ……… / ……… / ………… à …………………………………………………………………
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-navy/80">
                Domicilié(e) à …………………………………………………………………………………………………
              </p>
            </section>

            <section>
              <TitreSection>Agissant en tant que</TitreSection>
              <ul className="mt-3 flex flex-col gap-2">
                <CaseACocher label="Patient" />
                <CaseACocher label="Responsable légal du patient (préciser) : …………………………………" />
              </ul>
            </section>

            <section>
              <TitreSection>Atteste sur l&apos;honneur</TitreSection>
              <ol className="mt-3 flex flex-col gap-3">
                <li className="flex items-start gap-3">
                  <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-violet to-purple-500 text-[12px] font-bold text-white">
                    1
                  </span>
                  <span className="pt-0.5 text-[14px] leading-relaxed text-navy/80">
                    Avoir été informé(e) par l&apos;infirmier(ère) des risques liés à l&apos;arrêt des soins
                    infirmiers.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-violet to-purple-500 text-[12px] font-bold text-white">
                    2
                  </span>
                  <span className="pt-0.5 text-[14px] leading-relaxed text-navy/80">
                    Avoir décidé en connaissance de cause d&apos;interrompre ces soins à compter du
                    ……… / ……… / …………
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-violet to-purple-500 text-[12px] font-bold text-white">
                    3
                  </span>
                  <span className="pt-0.5 text-[14px] leading-relaxed text-navy/80">
                    Dégager l&apos;infirmier(ère) de toute responsabilité en cas de problème, de quelque ordre que
                    ce soit, lié à l&apos;arrêt des soins.
                  </span>
                </li>
              </ol>
            </section>

            <div className="grid grid-cols-2 gap-3">
              <BlocSignature titre="Signature du patient ou de son représentant légal" />
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
