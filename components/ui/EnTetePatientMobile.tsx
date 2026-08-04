import Link from "next/link";
import type { PatientComplet, SoinPrescrit } from "@/lib/types/clinical";
import type { VisitePatient } from "@/lib/data/dossier-patient";
import { formaterNomPropre } from "@/lib/format";

const AVATAR_SIZE = 76;
const RING_SIZE = 92;
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Calcule l'âge depuis une date de naissance ISO (YYYY-MM-DD). */
function calculerAge(dateNaissance: string | null): number | null {
  if (!dateNaissance) return null;
  const naissance = new Date(dateNaissance);
  const maintenant = new Date();
  let age = maintenant.getFullYear() - naissance.getFullYear();
  const mois = maintenant.getMonth() - naissance.getMonth();
  if (mois < 0 || (mois === 0 && maintenant.getDate() < naissance.getDate())) age--;
  return age;
}

/** Extrait les initiales (max 2 lettres) du nom complet. */
function extraireInitiales(nomComplet: string): string {
  const mots = nomComplet.trim().split(/\s+/);
  if (mots.length >= 2) return (mots[0][0] + mots[1][0]).toUpperCase();
  return nomComplet.slice(0, 2).toUpperCase();
}

/** Extrait la ville de l'adresse (dernier élément significatif). */
function extraireVille(adresse: string): string {
  const parties = adresse.split(",").map((p) => p.trim());
  // Prend la dernière partie non-vide
  const derniere = parties.reverse().find((p) => p.length > 0) ?? "";
  // Retire le code postal si présent au début
  return derniere.replace(/^\d{5}\s*/, "").split(" ")[0] || derniere;
}

/**
 * Calcule les statistiques de passages depuis les soins prescrits :
 * - nombre de passages hebdomadaires théoriques
 * - description de la fréquence (ex. "3×/sem")
 * - date du dernier soin (dateDebut le plus récent)
 */
function calculerStats(soins: SoinPrescrit[]): {
  passagesParSemaine: number;
  frequenceLabel: string;
  dernierLabel: string;
} {
  const actifs = soins.filter((s) => s.actif);

  // Calcul du nombre de passages par semaine
  let total = 0;
  for (const soin of actifs) {
    if (soin.frequenceType === "quotidien") total += 7;
    else if (soin.frequenceType === "jours_semaine") total += (soin.joursSemaine ?? []).length;
    else if (soin.frequenceType === "tous_les_x_jours" && soin.intervalleJours)
      total += Math.round(7 / soin.intervalleJours);
    else if (soin.frequenceType === "ponctuel") total += 1;
  }

  const frequenceLabel = total > 0 ? `${total}×/sem` : "—";

  // Dernier passage : dateDebut la plus récente parmi les soins actifs
  const datesDebut = actifs
    .map((s) => s.dateDebut)
    .filter(Boolean)
    .sort()
    .reverse();
  const dernierLabel = datesDebut[0]
    ? new Date(datesDebut[0]).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }).replace("/", "/")
    : "—";

  return { passagesParSemaine: total, frequenceLabel, dernierLabel };
}

/** Proportion (0 à 1) des passages prescrits cette semaine déjà réalisés, sur 7 jours glissants. */
function calculerProgressionSemaine(visites: VisitePatient[], passagesParSemaine: number): number {
  if (passagesParSemaine <= 0) return 0;

  const aujourdHui = new Date();
  aujourdHui.setHours(0, 0, 0, 0);
  const ilYA6Jours = new Date(aujourdHui);
  ilYA6Jours.setDate(aujourdHui.getDate() - 6);

  const faits = visites.filter((v) => {
    if (v.statut !== "terminee" || !v.date) return false;
    const date = new Date(v.date);
    return date >= ilYA6Jours && date <= aujourdHui;
  }).length;

  return Math.min(1, faits / passagesParSemaine);
}

interface EnTetePatientMobileProps {
  patient: PatientComplet;
  soins: SoinPrescrit[];
  /** Visites du patient, utilisées pour le nombre total de passages et l'anneau de progression hebdomadaire. */
  visites?: VisitePatient[];
  /** Avatar de l'utilisateur connecté (infirmier), pour l'accès à « Mon compte ». */
  avatarUrl?: string | null;
}

/**
 * En-tête iOS premium de la fiche patient.
 * Fond dégradé violet foncé, avatar initiales cerclé d'un anneau de progression,
 * badges allergie et AMI, trois statistiques calculées depuis les soins prescrits.
 */
export function EnTetePatientMobile({ patient, soins, visites = [], avatarUrl }: EnTetePatientMobileProps) {
  const nomFormate = formaterNomPropre(patient.nomComplet);
  const initiales = extraireInitiales(patient.nomComplet);
  const age = calculerAge(patient.dateNaissance);
  const ville = extraireVille(patient.adresse);
  const sexeLabel = patient.sexe === "femme" ? "Féminin" : patient.sexe === "homme" ? "Masculin" : null;

  const { passagesParSemaine, frequenceLabel, dernierLabel } = calculerStats(soins);
  const passagesLabel = visites.length > 0 ? String(visites.length) : "—";
  const progressionSemaine = calculerProgressionSemaine(visites, passagesParSemaine);

  // Sous-titre : âge · sexe · ville
  const sousTitre = [age ? `${age} ans` : null, sexeLabel, ville].filter(Boolean).join(" · ");

  return (
    <div className="patient-header-gradient relative overflow-hidden pb-0 pt-0">
      {/* Fond dégradé violet profond */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(160deg, #1A0A2E 0%, #2D1557 55%, #3B1D72 100%)",
        }}
      />

      {/* Orbes de lumière ambiante */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 left-1/3 h-64 w-64 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-10 right-0 h-48 w-48 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(236,72,153,0.18) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-xl px-4 pb-5 pt-4">
        {/* Barre supérieure : retour + actions */}
        <div className="flex items-center justify-between">
          <Link
            href="/patients"
            className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[13px] font-semibold text-white/90 transition-colors hover:text-white"
            style={{
              background: "rgba(255,255,255,0.12)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-3.5 w-3.5"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Patients
          </Link>

          <div className="flex items-center gap-2">
            {/* Bouton appel */}
            <a
              href={`tel:${patient.telephone}`}
              aria-label={`Appeler ${nomFormate}`}
              className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/20"
              style={{
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="h-4 w-4 text-white"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </a>

            {/* Mon compte */}
            <Link
              href="/compte"
              aria-label="Mon compte"
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full transition-colors hover:bg-white/20"
              style={{
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL signée à courte durée de vie, incompatible avec le cache de next/image
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="h-4 w-4 text-white"
                >
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M4.5 19.5c0-3.6 3.36-6 7.5-6s7.5 2.4 7.5 6" />
                </svg>
              )}
            </Link>
          </div>
        </div>

        {/* Avatar + Nom */}
        <div className="mt-5 flex items-center gap-4">
          {/* Avatar circulaire avec anneau de progression hebdomadaire */}
          <div className="relative shrink-0" style={{ width: RING_SIZE, height: RING_SIZE }}>
            <svg width={RING_SIZE} height={RING_SIZE} className="absolute inset-0 -rotate-90" aria-hidden="true">
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={RING_STROKE}
              />
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke="#C4B5FD"
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE * (1 - progressionSemaine)}
              />
            </svg>
            <div
              className="absolute inset-0 m-auto flex items-center justify-center rounded-full text-[22px] font-bold tracking-tight text-white shadow-[0_0_0_3px_rgba(255,255,255,0.2),0_8px_24px_rgba(0,0,0,0.3)]"
              style={{
                width: AVATAR_SIZE,
                height: AVATAR_SIZE,
                background: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
              }}
            >
              {initiales}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[24px] font-bold leading-tight tracking-[-0.3px] text-white">
              {nomFormate}
            </h1>

            {sousTitre && <p className="mt-1 text-[13.5px] text-white/60">{sousTitre}</p>}

            {/* Badges — alignés sous le titre et le sous-titre, pas sous l'avatar */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {patient.allergies && (
                <span className="inline-flex items-center gap-1 rounded-[12px] px-3 py-1 text-[12px] font-semibold text-white"
                  style={{ background: "rgba(239,68,68,0.16)", border: "1px solid rgba(239,68,68,0.4)" }}>
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-white" />
                  Allergie {patient.allergies.split(/[,;]/)[0].trim()}
                </span>
              )}
              {patient.forfaitBsi && (
                <span className="inline-flex items-center rounded-[12px] px-3 py-1 text-[12px] font-semibold text-white"
                  style={{ background: "rgba(239,68,68,0.85)", border: "1px solid rgba(239,68,68,0.5)" }}>
                  {patient.forfaitBsi.toUpperCase()} · {frequenceLabel}
                </span>
              )}
              {!patient.forfaitBsi && patient.noteSoin && (
                <span className="inline-flex items-center rounded-[12px] px-3 py-1 text-[12px] font-semibold text-white"
                  style={{ background: "rgba(239,68,68,0.85)", border: "1px solid rgba(239,68,68,0.5)" }}>
                  AMI · {frequenceLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Statistiques — trois cartes séparées */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { label: "Passages", valeur: passagesLabel },
            { label: "Fréquence", valeur: frequenceLabel },
            { label: "Dernier", valeur: dernierLabel },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-0.5 rounded-[16px] py-3"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <span className="font-display text-[20px] font-bold leading-none tracking-tight text-white">
                {stat.valeur}
              </span>
              <span className="text-[10.5px] font-semibold uppercase tracking-wide text-white/50">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
