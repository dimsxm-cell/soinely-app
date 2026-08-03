"use client";

import { useActionState } from "react";
import {
  enregistrerCabinetAction,
  type ResultatCabinet,
} from "@/lib/data/profil-actions";
import { Button } from "@/components/ui/Button";

/**
 * Adresse et code postal du cabinet.
 *
 * Composant client pour une seule raison : dire ce qui s'est passé. L'action
 * refusait auparavant un code postal mal formé en abandonnant tout, adresse
 * comprise, sans un mot — les champs revenaient vides et rien n'expliquait
 * pourquoi.
 */
export function FormulaireCabinet({
  codePostal,
  adresseCabinet,
  zone,
}: {
  codePostal: string;
  adresseCabinet: string;
  zone: "metropole" | "dom";
}) {
  const [resultat, envoyer, enCours] = useActionState<ResultatCabinet | null, FormData>(
    async (_precedent, formData) => enregistrerCabinetAction(formData),
    null
  );

  return (
    <>
      <form action={envoyer} className="mt-4 flex flex-col gap-3">
        <div>
          <label htmlFor="adresseCabinet" className="block text-[13px] text-navy/55">
            Adresse
          </label>
          <input
            id="adresseCabinet"
            name="adresseCabinet"
            type="text"
            defaultValue={adresseCabinet}
            placeholder="15 rue Schoelcher, 97110 Pointe-à-Pitre"
            className="mt-1 w-full rounded-[12px] border border-navy/15 bg-white px-3 py-2 text-[15px] text-navy placeholder:text-navy/30 focus:border-brand-violet focus:outline-none focus:ring-2 focus:ring-brand-violet/30"
          />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="codePostal" className="block text-[13px] text-navy/55">
              Code postal
            </label>
            <input
              id="codePostal"
              name="codePostal"
              type="text"
              inputMode="numeric"
              maxLength={5}
              defaultValue={codePostal}
              placeholder="97110"
              className="mt-1 w-[110px] rounded-[12px] border border-navy/15 bg-white px-3 py-2 text-[15px] tabular-nums text-navy placeholder:text-navy/30 focus:border-brand-violet focus:outline-none focus:ring-2 focus:ring-brand-violet/30"
            />
          </div>
          <Button
            type="submit"
            variant="tertiary"
            disabled={enCours}
            className="!min-h-0 shrink-0 !px-0 !py-0 pb-2.5"
          >
            {enCours ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>

      <p className="mt-3 text-[13px] text-navy/50">
        {codePostal
          ? `Grille appliquée : ${zone === "dom" ? "départements d'outre-mer" : "métropole"}.`
          : "Sans code postal, la grille métropole s'applique."}
      </p>

      {/* Un succès partiel — adresse enregistrée mais non localisée — porte les
          deux : le message et la couleur de l'avertissement. */}
      {resultat?.erreur && (
        <p className={`mt-1.5 text-[13px] ${resultat.succes ? "text-navy/60" : "text-danger"}`}>
          {resultat.erreur}
        </p>
      )}
      {resultat?.succes && !resultat.erreur && (
        <p className="mt-1.5 text-[13px] text-success">Cabinet enregistré.</p>
      )}
    </>
  );
}
