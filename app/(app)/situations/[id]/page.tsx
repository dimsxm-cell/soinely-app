import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSituationTerrainDetail } from "@/lib/data/recherche";
import { LienRetour } from "@/components/ui/LienRetour";

export default async function SituationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const situation = await getSituationTerrainDetail(supabase, id);

  if (!situation) notFound();

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10 sm:py-14">
        <LienRetour href="/recherche" label="Recherche" />

        <h1 className="font-display text-[28px] font-medium leading-tight sm:text-[32px]">
          {situation.titre}
        </h1>

      <section>
        <h2 className="text-lg font-semibold text-navy">Observation</h2>
        <p className="mt-2 text-navy/80">{situation.observation}</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-navy">Vérifications</h2>
        <ul className="mt-2 list-disc pl-6 text-navy/80">
          {situation.verifications.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-navy">Causes possibles</h2>
        <ul className="mt-2 list-disc pl-6 text-navy/80">
          {situation.causesPossibles.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-navy">Conduite à tenir</h2>
        <ul className="mt-2 list-disc pl-6 text-navy/80">
          {situation.conduiteATenir.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-card border border-danger/30 bg-danger/5 p-6">
        <h2 className="text-lg font-semibold text-navy">Quand demander un avis médical</h2>
        <p className="mt-2 text-navy/80">{situation.quandAvisMedical}</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-navy">Sources</h2>
        <ul className="mt-2 list-disc pl-6 text-navy/80">
          {situation.sources.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      {situation.missions.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-navy">Mission clinique liée</h2>
          <div className="mt-2 flex flex-col gap-4">
            {situation.missions.map((mission) => (
              <div key={mission.id} className="rounded-card border border-navy/10 bg-white p-6">
                <p className="font-semibold text-navy">{mission.titre}</p>
                <p className="mt-2 text-sm text-navy/60">
                  Durée estimée : {mission.dureeEstimeeMin} min
                </p>
                <ol className="mt-4 list-decimal pl-6 text-navy/80">
                  {mission.etapes.map((etape) => (
                    <li key={etape.titre}>
                      <span className="font-medium text-navy">{etape.titre}</span> — {etape.description}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      )}
      </div>
    </main>
  );
}
