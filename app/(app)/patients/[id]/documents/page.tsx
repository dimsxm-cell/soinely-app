import { notFound } from "next/navigation";
import { createClient, getUtilisateurConnecte } from "@/lib/supabase/server";
import { getPatient, getSoinsPrescrits } from "@/lib/data/patients";
import { getOrdonnances } from "@/lib/data/ordonnances";
import { getVisitesPatient } from "@/lib/data/dossier-patient";
import { getAvatarUrl } from "@/lib/data/profil";
import { EnTetePatientMobile } from "@/components/ui/EnTetePatientMobile";
import { OngletsPatient } from "@/components/ui/OngletsPatient";
import Link from "next/link";

/** Calcule le statut d'une ordonnance selon sa date d'ajout et son contenu. */
function calculerStatutDoc(
  note: string | null,
  datePrescription: string | null,
  ajouteeLe: string
): "nouveau" | "valide" | "bientot" | "expire" {
  const maintenant = new Date();
  const dateRef = datePrescription ? new Date(datePrescription) : new Date(ajouteeLe);
  const diffJours = Math.floor((maintenant.getTime() - dateRef.getTime()) / (1000 * 60 * 60 * 24));

  // Document récent (< 7 jours) → Nouveau
  if (diffJours < 7) return "nouveau";
  // Document dans les 30 prochains jours d'expiration → Bientôt
  if (diffJours > 150 && diffJours < 180) return "bientot";
  // Document expiré (> 180 jours ≈ 6 mois)
  if (diffJours > 180) return "expire";
  return "valide";
}

const STATUT_CONFIG = {
  valide: {
    label: "Valide",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  nouveau: {
    label: "Nouveau",
    className: "bg-violet-50 text-violet-700 border border-violet-200",
  },
  bientot: {
    label: "Bientôt",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  expire: {
    label: "Expiré",
    className: "bg-red-50 text-red-600 border border-red-200",
  },
};

/** Icône document SVG */
function IconeDocument({ type = "doc" }: { type?: "doc" | "shield" | "image" | "pill" }) {
  const paths: Record<string, string> = {
    doc: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    image: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z M3 9l4-4 4 4 4-6 4 6",
    pill: "M10.5 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v7.5 M2 10h20 M15.5 22a2.5 2.5 0 0 1 0-5H21a2.5 2.5 0 0 1 0 5h-5.5z",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5 text-brand-violet"
    >
      <path d={paths[type]} />
    </svg>
  );
}

/** Formate une date ISO en DD/MM/YYYY */
function formatDateCourte(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Documents imprimables statiques (toujours disponibles)
const DOCS_IMPRIMABLES = [
  {
    href: "identite",
    label: "Identité du patient",
    description: "Résumé de la fiche patient, prêt à imprimer.",
    icone: "doc" as const,
  },
  {
    href: "consentement",
    label: "Consentement éclairé",
    description: "Personne de confiance et consentement aux soins.",
    icone: "shield" as const,
  },
  {
    href: "fin-de-prise-en-charge",
    label: "Fin de prise en charge",
    description: "Bilan et transmission à la fin d'un suivi.",
    icone: "doc" as const,
  },
  {
    href: "renoncement",
    label: "Attestation de renoncement",
    description: "En cas d'arrêt des soins à la demande du patient.",
    icone: "doc" as const,
  },
];

export default async function DocumentsPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [patient, soins, ordonnances, visites, user] = await Promise.all([
    getPatient(supabase, id),
    getSoinsPrescrits(supabase, id),
    getOrdonnances(supabase, id),
    getVisitesPatient(supabase, id),
    getUtilisateurConnecte(),
  ]);
  const avatarPath = user?.user_metadata?.avatar_path as string | undefined;
  const avatarUrl = avatarPath ? await getAvatarUrl(supabase, avatarPath) : null;

  if (!patient) notFound();

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      {/* ── Header iOS violet ── */}
      <EnTetePatientMobile patient={patient} soins={soins} visites={visites} avatarUrl={avatarUrl} />

      {/* ── Onglets de navigation ── */}
      <div
        className="sticky top-0 z-20 px-4 py-3"
        style={{
          background: "linear-gradient(160deg, #2D1557 0%, #3B1D72 100%)",
        }}
      >
        <div className="mx-auto max-w-xl">
          <OngletsPatient patientId={patient.id} />
        </div>
      </div>

      {/* ── Contenu : Documents ── */}
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-5 pb-32">

        {/* Ordonnances scannées */}
        {ordonnances.length > 0 && (
          <section>
            <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.07em] text-navy/45">
              Ordonnances ({ordonnances.length})
            </p>
            <ul className="flex flex-col gap-3">
              {ordonnances.map((ordonnance) => {
                const statut = calculerStatutDoc(ordonnance.note, ordonnance.datePrescription, ordonnance.ajouteeLe);
                const config = STATUT_CONFIG[statut];
                const dateAffichee = ordonnance.datePrescription
                  ? formatDateCourte(ordonnance.datePrescription)
                  : formatDateCourte(ordonnance.ajouteeLe);

                return (
                  <li key={ordonnance.id}>
                    {ordonnance.url ? (
                      <a
                        href={ordonnance.url}
                        target="_blank"
                        rel="noreferrer"
                        className="row-lift flex items-center gap-3.5 rounded-[16px] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-brand-violet/10">
                          <IconeDocument type={ordonnance.estPdf ? "doc" : "image"} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14.5px] font-semibold text-navy">
                            {ordonnance.note ?? (ordonnance.estPdf ? "Document PDF" : "Photo ordonnance")}
                          </p>
                          <p className="mt-0.5 text-[12.5px] text-navy/55">{dateAffichee}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${config.className}`}>
                          {config.label}
                        </span>
                      </a>
                    ) : (
                      <div className="flex items-center gap-3.5 rounded-[16px] bg-white p-4 opacity-50 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-navy/[0.06]">
                          <IconeDocument type="doc" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14.5px] font-semibold text-navy">{ordonnance.note ?? "Document"}</p>
                          <p className="mt-0.5 text-[12.5px] text-navy/55">Fichier illisible · {dateAffichee}</p>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Documents imprimables */}
        <section>
          <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.07em] text-navy/45">
            Documents à imprimer
          </p>
          <ul className="flex flex-col gap-3">
            {DOCS_IMPRIMABLES.map((doc) => (
              <li key={doc.href}>
                <Link
                  href={`/patients/${patient.id}/documents/${doc.href}`}
                  className="row-lift flex items-center gap-3.5 rounded-[16px] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-brand-violet/10">
                    <IconeDocument type={doc.icone} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-semibold text-navy">{doc.label}</p>
                    <p className="mt-0.5 text-[12.5px] text-navy/55">{doc.description}</p>
                  </div>
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-navy/25"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Bouton Scanner */}
        <Link
          href={`/patients/${patient.id}/prescriptions`}
          className="flex items-center justify-center gap-2 rounded-[16px] border-2 border-dashed border-brand-violet/30 bg-brand-violet/[0.04] py-4 text-[14.5px] font-semibold text-brand-violet transition-colors hover:border-brand-violet/50 hover:bg-brand-violet/[0.08]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-5 w-5"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Scanner un document
        </Link>
      </div>

      {/* Bouton Enregistrer flottant */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-10 px-4 pb-3">
        <Link
          href={`/patients/${patient.id}/prescriptions`}
          className="btn-glace flex w-full items-center justify-center rounded-[16px] py-4 text-[15.5px] font-bold tracking-[-0.2px] text-white"
          style={{
            background: "linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)",
          }}
        >
          Enregistrer la fiche
        </Link>
      </div>
    </main>
  );
}
