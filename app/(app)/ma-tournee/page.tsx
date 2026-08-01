import Image from "next/image";
import Link from "next/link";
import { createClient, getUtilisateurConnecte } from "@/lib/supabase/server";
import {
  getMissionEnCoursHref,
  getMissionsTourneeVue,
  getTourneeDuJour,
  type MissionTourneeVue,
} from "@/lib/data/ma-journee";
import { CarteMissionTournee } from "@/components/ui/CarteMissionTournee";
import { EnTeteTournee } from "@/components/ui/EnTeteTournee";
import { getContexteTarifaire } from "@/lib/data/ngap";
import type { ContexteTarifaire } from "@/lib/cotation";
import { OngletsFiltresTournee } from "@/components/ui/OngletsFiltresTournee";
import { compterMissions, filtrerMissions, type Filtre } from "@/lib/tournee-vue";
import type { Tournee } from "@/lib/types/clinical";

export default async function MaTourneePage({
  searchParams,
}: {
  searchParams: Promise<{ filtre?: string }>;
}) {
  const { filtre: filtreParam } = await searchParams;
  const filtre: Filtre =
    filtreParam === "a_faire" || filtreParam === "alertes" || filtreParam === "valides"
      ? filtreParam
      : "tout";

  const supabase = await createClient();
  const user = await getUtilisateurConnecte();

  const tournee: Tournee | null = user ? await getTourneeDuJour(supabase, user.id) : null;

  // Sans tournée il n'y a rien à tarifer : la métropole et une table vide
  // suffisent, le calcul ne rencontrera aucun acte.
  const [missions, contexte, contexteTarifaire] =
    tournee && user
      ? await Promise.all([
          getMissionsTourneeVue(supabase, tournee.id),
          getMissionEnCoursHref(supabase, tournee.id),
          getContexteTarifaire(supabase, user.id),
        ])
      : [
          [] as MissionTourneeVue[],
          null,
          { zone: "metropole", valeurs: new Map() } satisfies ContexteTarifaire,
        ];

  const counts = compterMissions(missions);
  const missionsFiltrees = filtrerMissions(missions, filtre);

  return (
    <main className="min-h-screen bg-[#F6F7F5]" aria-label="Ma tournée">
      {tournee ? (
        <>
          <EnTeteTournee missions={missions} tournee={tournee} contexteTarifaire={contexteTarifaire} />
          <OngletsFiltresTournee filtre={filtre} counts={counts} />

          <div className="mx-auto max-w-2xl px-4 pt-4 pb-8">
            {missionsFiltrees.length > 0 ? (
              missionsFiltrees.map((mission, index) => (
                <CarteMissionTournee
                  key={mission.id}
                  mission={mission}
                  contexteHref={mission.id === contexte?.missionId ? contexte.href : undefined}
                  estDerniere={index === missionsFiltrees.length - 1}
                />
              ))
            ) : (
              <div className="mt-12 text-center">
                <p className="text-[15px] font-semibold text-navy/40">
                  Aucune mission dans cette catégorie
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
          {/* ELY plutôt qu'un pictogramme : un écran vide est décourageant, et
              c'est le seul endroit de la tournée où la mascotte a la place de
              se montrer en entier. */}
          <Image
            src="/marketing/ely-accompagnement.png"
            alt=""
            width={244}
            height={570}
            className="h-[210px] w-auto object-contain"
            priority={false}
          />
          <p className="mt-5 text-[18px] font-bold text-navy/80">
            Aucune tournée pour aujourd&apos;hui
          </p>
          <p className="mx-auto mt-2 max-w-[300px] text-[14px] leading-relaxed text-navy/45">
            Vos missions du jour apparaîtront ici dès qu&apos;une tournée sera générée.
          </p>
          <Link
            href="/ma-journee"
            className="mt-6 rounded-[14px] bg-gradient-to-r from-brand-violet to-brand-rose px-6 py-3 text-[14px] font-semibold text-white shadow-[0_4px_16px_rgba(124,58,237,0.32)]"
          >
            Aller à l&apos;accueil
          </Link>
        </div>
      )}
    </main>
  );
}
