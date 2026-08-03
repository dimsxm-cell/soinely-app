"use client";

import { useActionState } from "react";
import { createSoinPrescritAction, type ResultatSoin } from "@/lib/data/patients-actions";
import { Button } from "@/components/ui/Button";
import type { CodeNgap } from "@/lib/data/ngap";

const JOUR_LABEL = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

/**
 * Prescription d'un soin.
 *
 * Composant client pour une seule raison : dire pourquoi un ajout est refusé.
 * L'action abandonnait auparavant en silence — le bouton ne produisait rien,
 * et rien n'indiquait quel champ manquait. Sans soin prescrit, aucune tournée
 * n'existe : c'est l'endroit de l'application où un échec muet coûte le plus
 * cher.
 */
export function FormulaireSoinPrescrit({
  patientId,
  codesNgap,
}: {
  patientId: string;
  codesNgap: CodeNgap[];
}) {
  const [resultat, envoyer, enCours] = useActionState<ResultatSoin | null, FormData>(
    async (_precedent, formData) => createSoinPrescritAction(formData),
    null
  );

  return (
    <form action={envoyer} className="mt-5 flex flex-col gap-3 border-t border-navy/10 pt-4">
      <input type="hidden" name="patientId" value={patientId} />

      <label className="flex flex-col gap-1 text-sm text-navy">
        Type de soin
        <input name="typeSoin" required className="rounded-card border border-navy/20 p-2" />
      </label>

      <label className="flex flex-col gap-1 text-sm text-navy">
        Cotation NGAP (facultatif)
        <select
          name="ngapCodeId"
          defaultValue=""
          className="max-w-full min-w-0 rounded-card border border-navy/20 p-2"
        >
          <option value="">Aucune</option>
          {codesNgap.map((code) => (
            <option key={code.id} value={code.id}>
              {code.code} — {code.libelle}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-navy">
        Récurrence
        <select name="frequenceType" required className="rounded-card border border-navy/20 p-2">
          <option value="quotidien">Quotidien</option>
          <option value="jours_semaine">Jours de semaine précis</option>
          <option value="tous_les_x_jours">Tous les X jours</option>
          <option value="ponctuel">Ponctuel</option>
        </select>
      </label>

      <fieldset className="flex flex-wrap gap-3 text-sm text-navy">
        <legend className="text-xs text-navy/60">
          Jours (si &laquo;&nbsp;Jours de semaine précis&nbsp;&raquo;)
        </legend>
        {JOUR_LABEL.map((label, index) => (
          <label key={label} className="flex items-center gap-1">
            <input type="checkbox" name="joursSemaine" value={index} />
            {label}
          </label>
        ))}
      </fieldset>

      <label className="flex flex-col gap-1 text-sm text-navy">
        Intervalle en jours (si &laquo;&nbsp;Tous les X jours&nbsp;&raquo;)
        <input
          type="number"
          name="intervalleJours"
          min={1}
          className="rounded-card border border-navy/20 p-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-navy">
        Heure(s) du soin (ex. 08:00, ou 07:00, 19:00 pour plusieurs)
        <input
          name="heures"
          type="text"
          required
          placeholder="08:00"
          className="rounded-card border border-navy/20 p-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-navy">
        Date de début
        <input
          type="date"
          name="dateDebut"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="rounded-card border border-navy/20 p-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-navy">
        Date de fin (optionnelle)
        <input type="date" name="dateFin" className="rounded-card border border-navy/20 p-2" />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" className="self-start" disabled={enCours}>
          {enCours ? "Ajout…" : "Ajouter le soin"}
        </Button>
        {resultat?.succes && <span className="text-sm text-success">Soin ajouté.</span>}
        {resultat?.erreur && <span className="text-sm text-danger">{resultat.erreur}</span>}
      </div>
    </form>
  );
}
