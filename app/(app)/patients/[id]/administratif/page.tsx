import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPatient } from "@/lib/data/patients";
import { formatDateFr, formaterNomPropre } from "@/lib/format";
import { EnTeteFichePatient } from "@/components/ui/EnTeteFichePatient";

const SEXE_LABEL: Record<string, string> = { homme: "Masculin", femme: "Féminin" };

function Ligne({ label, valeur }: { label: string; valeur: string | null }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-navy/[0.06] py-2.5 last:border-0 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="shrink-0 text-[12.5px] font-semibold uppercase tracking-wide text-navy/45 sm:w-[190px]">
        {label}
      </span>
      <span className="text-[15px] text-navy/85">{valeur?.trim() ? valeur : "—"}</span>
    </div>
  );
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[18px] border border-navy/10 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,.04)]">
      <h2 className="text-[13px] font-bold uppercase tracking-wide text-brand-violet">{titre}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export default async function FicheAdministrativePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const patient = await getPatient(supabase, id);

  if (!patient) notFound();

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto flex max-w-2xl flex-col gap-5 px-6 py-10 sm:py-14">
        <EnTeteFichePatient
          patientId={patient.id}
          patientNom={patient.nomComplet}
          titre="Fiche administrative"
          sousTitre="Identité, coordonnées et contacts du patient."
        />

        <Bloc titre="Identité">
          <Ligne label="Nom et prénom" valeur={formaterNomPropre(patient.nomComplet)} />
          <Ligne label="Date de naissance" valeur={patient.dateNaissance ? formatDateFr(patient.dateNaissance) : null} />
          <Ligne label="Sexe" valeur={patient.sexe ? SEXE_LABEL[patient.sexe] : null} />
          <Ligne label="N° de sécurité sociale" valeur={patient.numeroSecu} />
        </Bloc>

        <Bloc titre="Coordonnées">
          <Ligne label="Adresse" valeur={patient.adresse} />
          <Ligne label="Téléphone" valeur={patient.telephone} />
        </Bloc>

        <Bloc titre="Médecin traitant">
          <Ligne label="Nom" valeur={patient.medecinNom ? formaterNomPropre(patient.medecinNom) : null} />
          <Ligne label="Téléphone" valeur={patient.medecinTelephone} />
        </Bloc>

        <Bloc titre="Personne de confiance">
          <Ligne
            label="Nom"
            valeur={patient.personneConfianceNom ? formaterNomPropre(patient.personneConfianceNom) : null}
          />
          <Ligne label="Téléphone" valeur={patient.personneConfianceTelephone} />
        </Bloc>

        <p className="text-center text-[13px] text-navy/45">
          Ces informations se modifient depuis la fiche du patient.
        </p>
      </div>
    </main>
  );
}
