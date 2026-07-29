import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSituationTerrainDetail } from "@/lib/data/recherche";
import { BadgeNiveauConfiance } from "@/components/ui/BadgeNiveauConfiance";
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
      <div className="mx-auto flex max-w-2xl flex-col gap-7 px-6 py-10 sm:py-14">
        <LienRetour href="/situations" label="Situations Terrain" />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-navy/5 px-2.5 py-1 text-[11.5px] font-semibold text-navy/60">
              {situation.specialite}
            </span>
            <BadgeNiveauConfiance niveau={situation.niveauConfiance} />
          </div>
          <h1 className="mt-3 font-display text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]">
            {situation.titre}
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-navy/70">{situation.observation}</p>
        </div>

        <section>
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-navy/45">Vérifications</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {situation.verifications.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-navy/80">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-violet/50" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-navy/45">Causes possibles</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {situation.causesPossibles.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-navy/80">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-violet/50" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-navy/45">Conduite à tenir</h2>
          <ol className="mt-3 flex flex-col gap-3">
            {situation.conduiteATenir.map((item, index) => (
              <li key={item} className="flex items-start gap-3">
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-violet to-purple-500 text-[13px] font-bold text-white">
                  {index + 1}
                </span>
                <span className="pt-0.5 text-[15px] leading-relaxed text-navy">{item}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-[14px] border border-[#f5c6c2] bg-[#fdeceb] p-4">
          <div className="flex gap-2.5">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#c0362c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
            <div>
              <p className="text-[13px] font-bold uppercase tracking-wide text-[#c0362c]">
                Quand demander un avis médical
              </p>
              <p className="mt-1.5 text-[14.5px] font-medium leading-relaxed text-[#8a2a22]">
                {situation.quandAvisMedical}
              </p>
            </div>
          </div>
        </section>

        <a
          href="tel:15"
          className="btn-glace flex items-center justify-center gap-2.5 rounded-[12px] bg-[#c0362c] px-5 py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(192,54,44,0.28)]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          Appeler le 15 (SAMU)
        </a>

        <section>
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-navy/45">Sources</h2>
          <ul className="mt-3 flex flex-col gap-1.5">
            {situation.sources.map((item) => (
              <li key={item} className="text-[13.5px] text-navy/55">
                {item}
              </li>
            ))}
          </ul>
        </section>

        {situation.missions.length > 0 && (
          <section>
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-navy/45">Mission clinique liée</h2>
            <div className="mt-3 flex flex-col gap-4">
              {situation.missions.map((mission) => (
                <div key={mission.id} className="rounded-[18px] border border-navy/[0.06] bg-white p-5 shadow-[0_8px_22px_rgba(80,50,140,.1)]">
                  <p className="font-semibold text-navy">{mission.titre}</p>
                  <p className="mt-1.5 text-[13.5px] text-navy/50">Durée estimée : {mission.dureeEstimeeMin} min</p>
                  <ol className="mt-3 flex flex-col gap-2">
                    {mission.etapes.map((etape) => (
                      <li key={etape.titre} className="text-[14.5px] leading-relaxed text-navy/80">
                        <span className="font-semibold text-navy">{etape.titre}</span> — {etape.description}
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
