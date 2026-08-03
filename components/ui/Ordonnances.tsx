"use client";

import Image from "next/image";
import { useActionState } from "react";
import type { Ordonnance } from "@/lib/data/ordonnances";
import {
  ajouterOrdonnanceAction,
  supprimerOrdonnanceAction,
  type ResultatOrdonnance,
} from "@/lib/data/ordonnances-actions";
import { Button } from "@/components/ui/Button";

/**
 * Ordonnances d'un patient : photographier une prescription papier, et la
 * retrouver au chevet du patient plutôt que de rappeler le médecin.
 *
 * Composant client pour une seule raison : afficher l'échec d'un envoi. Une
 * photo refusée en silence, c'est une IDEL qui croit avoir enregistré son
 * ordonnance et découvre le contraire un mois plus tard.
 */

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function Ordonnances({
  patientId,
  ordonnances,
}: {
  patientId: string;
  ordonnances: Ordonnance[];
}) {
  const [resultat, envoyer, enCours] = useActionState<ResultatOrdonnance | null, FormData>(
    async (_precedent, formData) => ajouterOrdonnanceAction(formData),
    null
  );

  return (
    <section>
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-navy/45">
        Ordonnances ({ordonnances.length})
      </p>

      <form
        action={envoyer}
        className="mt-3 rounded-[16px] border border-navy/[0.08] bg-white p-4"
      >
        <input type="hidden" name="patientId" value={patientId} />

        <label htmlFor="fichier" className="block text-[13px] text-navy/55">
          Photo ou PDF de l&apos;ordonnance
        </label>
        {/* `capture` ouvre directement l'appareil photo sur téléphone : c'est
            là que la prescription se photographie, au domicile du patient. */}
        <input
          id="fichier"
          name="fichier"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          capture="environment"
          required
          className="mt-1.5 w-full text-[13.5px] text-navy/70 file:mr-3 file:rounded-[10px] file:border-0 file:bg-brand-violet/10 file:px-3 file:py-2 file:text-[13px] file:font-semibold file:text-brand-violet"
        />

        <div className="mt-3 flex flex-wrap gap-3">
          <div>
            <label htmlFor="datePrescription" className="block text-[13px] text-navy/55">
              Date de l&apos;ordonnance
            </label>
            <input
              id="datePrescription"
              name="datePrescription"
              type="date"
              className="mt-1.5 rounded-[10px] border border-navy/15 px-3 py-2 text-[13.5px] text-navy"
            />
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="note" className="block text-[13px] text-navy/55">
              Note (facultative)
            </label>
            <input
              id="note"
              name="note"
              type="text"
              placeholder="Dr Martin — renouvellement"
              className="mt-1.5 w-full min-w-0 rounded-[10px] border border-navy/15 px-3 py-2 text-[13.5px] text-navy placeholder:text-navy/30"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <Button type="submit" variant="secondary" disabled={enCours}>
            {enCours ? "Envoi…" : "Ajouter l'ordonnance"}
          </Button>
          {resultat?.succes && (
            <span className="text-[13px] text-success">Ordonnance enregistrée.</span>
          )}
          {resultat?.erreur && <span className="text-[13px] text-danger">{resultat.erreur}</span>}
        </div>
      </form>

      {ordonnances.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ordonnances.map((ordonnance) => (
            <li
              key={ordonnance.id}
              className="overflow-hidden rounded-[14px] border border-navy/[0.08] bg-white"
            >
              {ordonnance.url ? (
                <a
                  href={ordonnance.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block aspect-[3/4] bg-navy/[0.03]"
                >
                  {ordonnance.estPdf ? (
                    <span className="flex h-full items-center justify-center text-[13px] font-semibold text-brand-violet">
                      Ouvrir le PDF
                    </span>
                  ) : (
                    <Image
                      src={ordonnance.url}
                      alt={ordonnance.note ?? "Ordonnance"}
                      width={300}
                      height={400}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  )}
                </a>
              ) : (
                // Le fichier existe en base mais n'a pas pu être servi : le
                // taire laisserait croire que l'ordonnance n'a jamais existé.
                <span className="flex aspect-[3/4] items-center justify-center px-3 text-center text-[12.5px] text-navy/45">
                  Fichier illisible
                </span>
              )}

              <div className="p-2.5">
                <p className="text-[12.5px] font-semibold text-navy">
                  {ordonnance.datePrescription
                    ? formatDate(ordonnance.datePrescription)
                    : formatDate(ordonnance.ajouteeLe)}
                </p>
                {ordonnance.note && (
                  <p className="mt-0.5 text-[12px] leading-snug text-navy/55">{ordonnance.note}</p>
                )}
                <form action={supprimerOrdonnanceAction} className="mt-1.5">
                  <input type="hidden" name="ordonnanceId" value={ordonnance.id} />
                  <input type="hidden" name="patientId" value={patientId} />
                  <button
                    type="submit"
                    className="text-[12px] font-semibold text-danger hover:underline"
                  >
                    Supprimer
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
