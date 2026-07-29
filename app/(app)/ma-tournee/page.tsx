import Link from "next/link";
import { createClient, getUtilisateurConnecte } from "@/lib/supabase/server";
import {
  getMissionEnCoursHref,
  getMissionsTourneeVue,
  getTourneeDuJour,
  type MissionTourneeVue,
} from "@/lib/data/ma-journee";
import { updateMissionStatutAction } from "@/lib/data/ma-journee-actions";
import { formaterNomPropre } from "@/lib/format";
import { IconeSoin } from "@/components/ui/IconeSoin";
import type { StatutMission, Tournee } from "@/lib/types/clinical";

// ── Types ──────────────────────────────────────────────────────────────────

type Filtre = "tout" | "a_faire" | "alertes" | "valides";

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTournee(): string {
  return new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatHeure(iso: string): string {
  return iso.slice(0, 5);
}

function calculerAge(dateNaissance: string | null): number | null {
  if (!dateNaissance) return null;
  const today = new Date();
  const birth = new Date(dateNaissance);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getInitiales(nomComplet: string): string {
  const CIVILITES = ["mme", "m.", "mr", "dr", "pr", "mlle"];
  const parts = nomComplet.trim().split(/\s+/);
  const nom = parts.find(
    (p) => !CIVILITES.includes(p.toLowerCase().replace(/\.$/, ""))
  );
  return (nom ?? parts[0]).slice(0, 2).toUpperCase();
}

const PALETTE_AVATAR = [
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-teal-100", text: "text-teal-700" },
  { bg: "bg-orange-100", text: "text-orange-700" },
  { bg: "bg-pink-100", text: "text-pink-700" },
];

function getCouleurAvatar(id: string) {
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return PALETTE_AVATAR[hash % PALETTE_AVATAR.length];
}

function estimerHeureFin(missions: MissionTourneeVue[]): string | null {
  const restantes = missions.filter(
    (m) => m.statut === "a_faire" || m.statut === "en_cours"
  );
  if (restantes.length === 0) return null;
  return formatHeure(restantes[restantes.length - 1].heurePrevue);
}

function filtrerMissions(
  missions: MissionTourneeVue[],
  filtre: Filtre
): MissionTourneeVue[] {
  switch (filtre) {
    case "a_faire":
      return missions.filter(
        (m) => m.statut === "a_faire" || m.statut === "en_cours"
      );
    case "alertes":
      return missions.filter((m) => m.patientAllergies || m.patientConsignes);
    case "valides":
      return missions.filter(
        (m) => m.statut === "terminee" || m.statut === "absent"
      );
    default:
      return missions;
  }
}

function compterMissions(missions: MissionTourneeVue[]) {
  return {
    tout: missions.length,
    a_faire: missions.filter(
      (m) => m.statut === "a_faire" || m.statut === "en_cours"
    ).length,
    alertes: missions.filter((m) => m.patientAllergies || m.patientConsignes)
      .length,
    valides: missions.filter(
      (m) => m.statut === "terminee" || m.statut === "absent"
    ).length,
  };
}

// ── Constantes de style ──────────────────────────────────────────────────────

const STATUT_LABEL: Record<StatutMission, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  terminee: "Validé",
  absent: "Absent",
};

const STATUT_BADGE: Record<StatutMission, string> = {
  a_faire: "bg-navy/[0.06] text-navy/50",
  en_cours: "bg-brand-violet/[0.12] text-brand-violet font-bold",
  terminee: "bg-emerald-50 text-emerald-600 font-semibold",
  absent: "bg-amber-50 text-amber-600 font-semibold",
};

// ── Composant : Carte mission ────────────────────────────────────────────────

interface CarteMissionTourneeProps {
  mission: MissionTourneeVue;
  contexteHref?: string;
  estDerniere: boolean;
  numero: number;
}

function CarteMissionTournee({
  mission,
  contexteHref,
  estDerniere,
  numero,
}: CarteMissionTourneeProps) {
  const age = calculerAge(mission.patientDateNaissance);
  const initiales = getInitiales(mission.patientNom);
  const couleur = getCouleurAvatar(mission.patientId);
  const heure = formatHeure(mission.heurePrevue);
  const enCours = mission.statut === "en_cours";
  const aFaire = mission.statut === "a_faire";
  const terminee = mission.statut === "terminee";
  const absent = mission.statut === "absent";
  const nomFormate = formaterNomPropre(mission.patientNom);
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(
    mission.patientAdresse
  )}`;
  const telUrl = `tel:${mission.patientTelephone.replace(/\s/g, "")}`;

  return (
    <div className="flex gap-3">
      {/* Colonne timeline — fond blanc, texte sombre */}
      <div className="relative flex w-[52px] shrink-0 flex-col items-center pt-4 text-right">
        <span className="text-[11px] font-bold tabular-nums text-navy/55">
          {heure}
        </span>
        {mission.dureeEstimeeMin > 0 && (
          <span className="mt-0.5 text-[10px] text-navy/30">
            {mission.dureeEstimeeMin} min
          </span>
        )}
        {/* Ligne verticale */}
        {!estDerniere && (
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-[50px] bottom-0 w-px -translate-x-1/2 bg-navy/10"
          />
        )}
      </div>

      {/* Carte blanche */}
      <div
        className={`mb-3 flex-1 overflow-hidden rounded-[18px] border bg-white ${
          enCours
            ? "border-brand-violet/40 shadow-[0_6px_24px_rgba(124,58,237,0.18)]"
            : "border-navy/[0.07] shadow-[0_1px_4px_rgba(15,23,42,0.05)]"
        } ${terminee || absent ? "opacity-55" : ""}`}
      >
        {/* En-tête de la carte */}
        <div className="flex items-start gap-3 px-4 py-3.5">
          {/* Avatar */}
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${couleur.bg} ${couleur.text}`}
            aria-hidden="true"
          >
            {initiales}
          </div>

          {/* Infos patient */}
          <div className="min-w-0 flex-1">
            <Link
              href={`/ma-journee/${mission.id}`}
              className="flex items-baseline gap-1.5 hover:opacity-75"
            >
              <span className="font-semibold leading-tight text-navy">
                {nomFormate}
              </span>
              {age !== null && (
                <span className="text-[12px] font-normal text-navy/40">
                  {age} a
                </span>
              )}
            </Link>
            {mission.patientAdresse && (
              <p className="mt-0.5 flex items-center gap-1 text-[12px] text-navy/40">
                <svg
                  viewBox="0 0 24 24"
                  className="h-3 w-3 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="truncate">{mission.patientAdresse}</span>
              </p>
            )}
          </div>

          {/* Badge statut */}
          <span
            className={`shrink-0 rounded-[10px] px-2.5 py-1 text-[11.5px] ${STATUT_BADGE[mission.statut]}`}
          >
            {STATUT_LABEL[mission.statut]}
          </span>
        </div>

        {/* Type de soin (chip) + alertes */}
        <div className="border-t border-navy/[0.06] px-4 py-3">
          {/* Chip du soin */}
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-navy/[0.05] px-2.5 py-1 text-[12px] font-medium text-navy/65">
              <IconeSoin
                typeSoin={mission.typeSoin}
                className="h-3.5 w-3.5 text-brand-violet"
              />
              {mission.typeSoin}
            </span>
          </div>

          {/* Allergie */}
          {mission.patientAllergies && (
            <div className="mt-2.5 flex items-start gap-2 rounded-[10px] bg-red-50 px-3 py-2">
              <span className="mt-px shrink-0 text-[13px]" aria-hidden="true">
                ⚠️
              </span>
              <p className="text-[12.5px] font-medium text-red-600">
                {mission.patientAllergies}
              </p>
            </div>
          )}

          {/* Consignes */}
          {mission.patientConsignes && (
            <div className="mt-1.5 flex items-start gap-2 rounded-[10px] bg-amber-50 px-3 py-2">
              <span className="mt-px shrink-0 text-[13px]" aria-hidden="true">
                ⚠️
              </span>
              <p className="text-[12.5px] font-medium text-amber-700">
                {mission.patientConsignes}
              </p>
            </div>
          )}

          {/* Lien contexte clinique */}
          {contexteHref && (
            <Link
              href={contexteHref}
              className="mt-2 inline-flex text-[12.5px] font-semibold text-brand-violet hover:underline"
            >
              Voir contexte clinique →
            </Link>
          )}
        </div>

        {/* Actions */}
        {(aFaire || enCours) && (
          <div className="border-t border-navy/[0.06] px-4 py-3">
            {enCours ? (
              /* Mission en cours : GPS + Appeler + Valider */
              <div className="flex gap-2">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] border border-navy/15 bg-white py-2.5 text-[13px] font-semibold text-navy shadow-sm hover:bg-navy/[0.03]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <polygon points="3 11 22 2 13 21 11 13 3 11" />
                  </svg>
                  GPS
                </a>
                <a
                  href={telUrl}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] border border-navy/15 bg-white py-2.5 text-[13px] font-semibold text-navy shadow-sm hover:bg-navy/[0.03]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92Z" />
                  </svg>
                  Appeler
                </a>
                <form action={updateMissionStatutAction} className="flex-1">
                  <input type="hidden" name="missionId" value={mission.id} />
                  <input type="hidden" name="nouveauStatut" value="terminee" />
                  <button
                    type="submit"
                    className="w-full rounded-[12px] bg-gradient-to-r from-brand-violet to-brand-rose py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(124,58,237,0.32)] hover:opacity-90"
                  >
                    ✓ Valider
                  </button>
                </form>
              </div>
            ) : (
              /* Mission à faire : Valider le soin + Absent */
              <div className="flex gap-2">
                <form action={updateMissionStatutAction} className="flex-1">
                  <input type="hidden" name="missionId" value={mission.id} />
                  <input type="hidden" name="nouveauStatut" value="en_cours" />
                  <button
                    type="submit"
                    className="w-full rounded-[12px] border border-brand-violet/30 bg-brand-violet/[0.06] py-2.5 text-[13px] font-semibold text-brand-violet hover:bg-brand-violet/[0.10]"
                  >
                    Valider le soin
                  </button>
                </form>
                <form action={updateMissionStatutAction}>
                  <input type="hidden" name="missionId" value={mission.id} />
                  <input type="hidden" name="nouveauStatut" value="absent" />
                  <button
                    type="submit"
                    className="rounded-[12px] border border-navy/12 bg-navy/[0.03] px-4 py-2.5 text-[13px] font-semibold text-navy/50 hover:bg-navy/[0.07]"
                  >
                    Absent
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Composant : En-tête sombre ───────────────────────────────────────────────

function EnTeteTournee({
  missions,
  tournee,
}: {
  missions: MissionTourneeVue[];
  tournee: Tournee;
}) {
  const total = missions.length;
  const valides = missions.filter(
    (m) => m.statut === "terminee" || m.statut === "absent"
  ).length;
  const restants = missions.filter(
    (m) => m.statut === "a_faire" || m.statut === "en_cours"
  ).length;
  const pct = total > 0 ? Math.round((valides / total) * 100) : 0;
  const heureFin = estimerHeureFin(missions);
  const maintenant = new Date().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-[#0A1628] px-5 pb-4 pt-5">
      <div className="mx-auto max-w-2xl">
      {/* Ligne 1 : date + heure */}
      <div className="flex items-start justify-between">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-white/35">
          Tournée du {formatDateTournee()}
        </p>
        <div className="text-right">
          <p className="text-[9px] font-semibold uppercase tracking-[0.09em] text-white/30">
            Maintenant
          </p>
          <p className="mt-0.5 font-display text-[17px] font-bold tabular-nums text-white">
            {maintenant}
          </p>
        </div>
      </div>

      {/* Compteur validés */}
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-display text-[44px] font-bold tabular-nums leading-none text-white">
          {valides}
        </span>
        <span className="text-[20px] font-semibold text-white/30">/{total}</span>
        <span className="ml-1 text-[13px] text-white/45">soins validés</span>
      </div>

      {/* Barre de progression */}
      <div className="mt-3 h-[5px] w-full overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-violet to-brand-rose transition-all duration-700"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progression : ${pct}%`}
        />
      </div>

      {/* Stats : 3 colonnes */}
      <div className="mt-4 grid grid-cols-3 gap-4 border-t border-white/[0.06] pt-4">
        <div>
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.09em] text-white/30">
            Reste
          </p>
          <p className="mt-0.5 font-display text-[22px] font-bold tabular-nums text-white">
            {restants}
          </p>
        </div>
        {heureFin ? (
          <div>
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.09em] text-white/30">
              Fin est.
            </p>
            <p className="mt-0.5 font-display text-[22px] font-bold tabular-nums text-white">
              {heureFin}
            </p>
          </div>
        ) : (
          <div />
        )}
        <div>
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.09em] text-white/30">
            Patients
          </p>
          <p className="mt-0.5 font-display text-[22px] font-bold tabular-nums text-white">
            {tournee.nbPatients}
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}

// ── Composant : Onglets filtres (fond blanc) ─────────────────────────────────

function OngletsFiltres({
  filtre,
  counts,
}: {
  filtre: Filtre;
  counts: ReturnType<typeof compterMissions>;
}) {
  const onglets: { label: string; clef: Filtre; count: number }[] = [
    { label: "Tout", clef: "tout", count: counts.tout },
    { label: "À faire", clef: "a_faire", count: counts.a_faire },
    { label: "Alertes", clef: "alertes", count: counts.alertes },
    { label: "Validés", clef: "valides", count: counts.valides },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto border-b border-navy/[0.07] bg-white px-4 py-3 [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto flex w-full max-w-2xl gap-2">
      {onglets.map((o) => {
        const actif = filtre === o.clef;
        return (
          <Link
            key={o.clef}
            href={
              o.clef === "tout"
                ? "/ma-tournee"
                : `/ma-tournee?filtre=${o.clef}`
            }
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-colors ${
              actif
                ? "bg-navy text-white"
                : "border border-navy/12 bg-white text-navy/55 hover:bg-navy/[0.04]"
            }`}
          >
            {o.label}
            <span
              className={`min-w-[18px] rounded-full px-1.5 py-px text-center text-[10px] font-bold ${
                actif ? "bg-white/15 text-white/80" : "bg-navy/[0.07] text-navy/50"
              }`}
            >
              {o.count}
            </span>
          </Link>
        );
      })}
      </div>
    </div>
  );
}

// ── Page principale ──────────────────────────────────────────────────────────

export default async function MaTourneePage({
  searchParams,
}: {
  searchParams: Promise<{ filtre?: string }>;
}) {
  const { filtre: filtreParam } = await searchParams;
  const filtre: Filtre =
    filtreParam === "a_faire" ||
    filtreParam === "alertes" ||
    filtreParam === "valides"
      ? filtreParam
      : "tout";

  const supabase = await createClient();
  const user = await getUtilisateurConnecte();

  const tournee: Tournee | null = user
    ? await getTourneeDuJour(supabase, user.id)
    : null;

  const [missions, contexte] = tournee
    ? await Promise.all([
        getMissionsTourneeVue(supabase, tournee.id),
        getMissionEnCoursHref(supabase, tournee.id),
      ])
    : [[] as MissionTourneeVue[], null];

  const counts = compterMissions(missions);
  const missionsFiltrees = filtrerMissions(missions, filtre);

  return (
    /* Fond blanc pour toute la page hors en-tête */
    <main className="min-h-screen bg-[#F6F7F5]" aria-label="Ma tournée">
      {tournee ? (
        <>
          {/* En-tête sombre */}
          <EnTeteTournee missions={missions} tournee={tournee} />

          {/* Onglets filtres — fond blanc */}
          <OngletsFiltres filtre={filtre} counts={counts} />

          {/* Liste des missions — centrée et contrainte */}
          <div className="mx-auto max-w-2xl px-4 pt-4 pb-8">
            {missionsFiltrees.length > 0 ? (
              missionsFiltrees.map((mission, index) => (
                <CarteMissionTournee
                  key={mission.id}
                  mission={mission}
                  contexteHref={
                    mission.id === contexte?.missionId
                      ? contexte.href
                      : undefined
                  }
                  estDerniere={index === missionsFiltrees.length - 1}
                  numero={missions.indexOf(mission) + 1}
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
        /* État vide */
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-violet/10">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8 text-brand-violet"
              aria-hidden="true"
            >
              <path d="M4 18.5h3.5a3 3 0 0 0 0-6h-3a3 3 0 0 1 0-6H20" />
              <circle cx="18.5" cy="18.5" r="2" />
              <path d="M17.5 6.5 20 4l-2.5-2.5" />
            </svg>
          </div>
          <p className="mt-5 text-[18px] font-bold text-navy/80">
            Aucune tournée pour aujourd&apos;hui
          </p>
          <p className="mx-auto mt-2 max-w-[300px] text-[14px] leading-relaxed text-navy/45">
            Vos missions du jour apparaîtront ici dès qu&apos;une tournée sera
            générée.
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
