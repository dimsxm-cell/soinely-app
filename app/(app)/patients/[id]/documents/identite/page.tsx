import { notFound } from "next/navigation";
import { createClient, getUtilisateurConnecte } from "@/lib/supabase/server";
import { getPatient } from "@/lib/data/patients";
import {
  BarreImpressionPraticien,
  BlocCoordonneesPraticien,
  FournisseurCoordonneesPraticien,
} from "@/components/ui/CoordonneesPraticien";
import { getCoordonneesPraticien } from "@/lib/data/profil";
import { EnTeteDocument, TitreSection } from "@/components/ui/ElementsDocument";
import { LienRetour } from "@/components/ui/LienRetour";
import { formatDateFr, formaterNomPropre } from "@/lib/format";

export default async function DocumentIdentitePatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [user, patient] = await Promise.all([getUtilisateurConnecte(), getPatient(supabase, id)]);
  const coordonnees = user
    ? await getCoordonneesPraticien(supabase, user.id)
    : { nom: "", adresse: "", codePostal: "", telephone: "", adeliRpps: "" };

  if (!patient) notFound();

  const nomIdel = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "";

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy print:bg-white">
      <FournisseurCoordonneesPraticien initiales={coordonnees}>
        <BlocCoordonneesPraticien className="mb-4" />
        <div className="mx-auto flex max-w-[720px] flex-col gap-6 px-6 py-10 sm:py-14 print:py-0">
          <div className="print:hidden">
            <LienRetour href={`/patients/${patient.id}`} label={formaterNomPropre(patient.nomComplet)} />
          </div>

          <div className="rounded-[20px] border border-navy/10 bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,.04),0_18px_40px_rgba(15,23,42,.06)] print:border-0 print:p-0 print:shadow-none">
            <EnTeteDocument
              titreDocument="Identité du patient"
              sousTitre="Fiche d'identification à conserver dans le dossier de soins."
              nomIdel={nomIdel}
              patient={patient}
            />

            <div className="flex flex-col gap-6">
              <section>
                <TitreSection>État civil</TitreSection>
                <div className="mt-3 grid grid-cols-2 gap-3 text-[14px] text-navy/80">
                  <p>Nom et prénom : {formaterNomPropre(patient.nomComplet)}</p>
                  <p>Sexe : {patient.sexe === "homme" ? "Masculin" : patient.sexe === "femme" ? "Féminin" : "—"}</p>
                  <p>Date de naissance : {patient.dateNaissance ? formatDateFr(patient.dateNaissance) : "—"}</p>
                  <p>N° de sécurité sociale : {patient.numeroSecu || "—"}</p>
                  <p className="col-span-2">Adresse : {patient.adresse || "—"}</p>
                  <p>Téléphone : {patient.telephone || "—"}</p>
                </div>
              </section>

              <section>
                <TitreSection>Suivi médical</TitreSection>
                <div className="mt-3 flex flex-col gap-2 text-[14px] text-navy/80">
                  <p>
                    Médecin traitant : {patient.medecinNom ? formaterNomPropre(patient.medecinNom) : "—"}
                    {patient.medecinTelephone ? ` — ${patient.medecinTelephone}` : ""}
                  </p>
                  <p>Allergies : {patient.allergies || "Aucune connue"}</p>
                  <p>Antécédents médicaux : {patient.antecedents || "—"}</p>
                  <p>Traitements en cours : {patient.traitementsEnCours || "—"}</p>
                  <p>Soin : {patient.noteSoin || "—"}</p>
                  <p>Consignes spécifiques : {patient.consignes || "—"}</p>
                </div>
              </section>

              <section>
                <TitreSection>Personne de confiance</TitreSection>
                <div className="mt-3 flex flex-col gap-2 text-[14px] text-navy/80">
                  <p>
                    Nom : {patient.personneConfianceNom ? formaterNomPropre(patient.personneConfianceNom) : "—"}
                  </p>
                  <p>Téléphone : {patient.personneConfianceTelephone || "—"}</p>
                </div>
              </section>

              <p className="text-[12px] text-navy/40">Document généré le {formatDateFr(new Date().toISOString())}.</p>
            </div>
          </div>

          <div className="flex justify-center print:hidden">
            <BarreImpressionPraticien />
          </div>
        </div>
      </FournisseurCoordonneesPraticien>
    </main>
  );
}
