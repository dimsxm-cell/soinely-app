"use client";

import Image from "next/image";
import { useActionState, useId, useState } from "react";
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

/**
 * Bouton d'ouverture d'un sélecteur de fichier, libellé en français.
 *
 * Le bouton d'un `input[type=file]` natif affiche « Choose File » ou
 * « Parcourir… » selon la langue du navigateur, jamais celle de la page. Le
 * champ est donc masqué visuellement — tout en restant atteignable au clavier
 * et par les lecteurs d'écran — et piloté par un label stylé.
 */
function ChoixFichier({
  name,
  libelle,
  ariaLabel,
  capture,
  onChoix,
}: {
  name: string;
  libelle: string;
  ariaLabel: string;
  capture?: "environment";
  onChoix: (nom: string | null) => void;
}) {
  const id = useId();

  return (
    <>
      <input
        id={id}
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        capture={capture}
        aria-label={ariaLabel}
        className="peer sr-only"
        onChange={(event) => onChoix(event.target.files?.[0]?.name ?? null)}
      />
      <label
        htmlFor={id}
        className="btn-glace-clair cursor-pointer rounded-[10px] border border-brand-violet/25 bg-brand-violet/10 px-3.5 py-2 text-[13px] font-semibold text-brand-violet peer-focus-visible:ring-2 peer-focus-visible:ring-brand-violet peer-focus-visible:ring-offset-2"
      >
        {libelle}
      </label>
    </>
  );
}

export function Ordonnances({
  patientId,
  ordonnances,
}: {
  patientId: string;
  ordonnances: Ordonnance[];
}) {
  const [nomChoisi, setNomChoisi] = useState<string | null>(null);
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

        <p className="text-[13px] text-navy/55">Ordonnance à joindre</p>

        {/* Deux gestes distincts, donc deux boutons. Photographier une
            ordonnance au domicile du patient n'est pas joindre un PDF reçu par
            mail — et un bouton unique portait le libellé du navigateur, en
            anglais chez certaines, sans dire qu'il ouvrirait l'appareil photo. */}
        <div className="mt-1.5 flex flex-wrap gap-2">
          <ChoixFichier
            name="fichier"
            libelle="Prendre une photo"
            ariaLabel="Photographier l'ordonnance"
            capture="environment"
            onChoix={setNomChoisi}
          />
          <ChoixFichier
            name="fichierJoint"
            libelle="Choisir un fichier"
            ariaLabel="Joindre une photo ou un PDF déjà enregistré"
            onChoix={setNomChoisi}
          />
        </div>
        <p className="mt-1.5 text-[12.5px] text-navy/45">
          {nomChoisi ?? "Photo ou PDF, 10 Mo au maximum."}
        </p>

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
