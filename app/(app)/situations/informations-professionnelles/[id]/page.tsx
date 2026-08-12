import { notFound } from "next/navigation";
import { createClient, getUtilisateurConnecte } from "@/lib/supabase/server";
import { getFicheDossierDetail } from "@/lib/data/dossierSoins";
import { BadgeNiveauConfiance } from "@/components/ui/BadgeNiveauConfiance";
import { LienRetour } from "@/components/ui/LienRetour";
import {
  BarreImpressionPraticien,
  BlocCoordonneesPraticien,
  FournisseurCoordonneesPraticien,
} from "@/components/ui/CoordonneesPraticien";
import { getCoordonneesPraticien } from "@/lib/data/profil";

export default async function FicheInformationProfessionnelleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const fiche = await getFicheDossierDetail(supabase, id);

  if (!fiche || fiche.section !== "informations_professionnelles") notFound();

  const user = await getUtilisateurConnecte();
  const coordonnees = user
    ? await getCoordonneesPraticien(supabase, user.id)
    : { nom: "", adresse: "", codePostal: "", telephone: "", adeliRpps: "" };

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <FournisseurCoordonneesPraticien initiales={coordonnees}>
        <div className="mx-auto flex max-w-2xl flex-col gap-7 px-6 py-10 sm:py-14">
          <LienRetour href="/situations/informations-professionnelles" label="Informations professionnelles" />

          <div>
            <BadgeNiveauConfiance niveau={fiche.niveauConfiance} />
            <h1 className="mt-3 font-display text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]">
              {fiche.titre}
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-navy/70">{fiche.resume}</p>
          </div>

          {fiche.contenu.map((bloc) => (
            <section key={bloc.titre}>
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-navy/45">{bloc.titre}</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {bloc.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-navy/80">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-violet/50" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section>
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-navy/45">Sources</h2>
            <ul className="mt-3 flex flex-col gap-1.5">
              {fiche.sources.map((source) => (
                <li key={source} className="text-[13.5px] text-navy/55">
                  {source}
                </li>
              ))}
            </ul>
          </section>

          <p className="text-[12.5px] leading-relaxed text-navy/40">
            Résumé informatif à titre de repère — ne remplace pas un conseil juridique personnalisé. En cas de
            doute, contactez le service juridique de l&apos;Ordre National des Infirmiers.
          </p>

          {/* Sous la source et sous l'avertissement juridique, jamais
              au-dessus : ces fiches sont un contenu de référence partagé.
              Des coordonnées en tête se liraient comme une signature et
              laisseraient croire que l'IDEL en est l'autrice. */}
          <BlocCoordonneesPraticien className="mt-6 border-t border-navy/10 pt-3" />

          <div className="mt-6 flex justify-center print:hidden">
            <BarreImpressionPraticien />
          </div>
        </div>
      </FournisseurCoordonneesPraticien>
    </main>
  );
}
