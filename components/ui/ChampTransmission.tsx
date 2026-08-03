"use client";

import { useActionState } from "react";
import {
  updateTransmissionAction,
  type ResultatEcriture,
} from "@/lib/data/ma-journee-actions";
import { Button } from "@/components/ui/Button";

/**
 * Transmission d'une visite.
 *
 * Composant client pour une seule raison : montrer un échec pendant que le
 * texte est encore à l'écran. C'est la seule saisie de l'application que rien
 * ne permet de reconstituer — une observation clinique ne se réécrit pas de
 * mémoire trois semaines plus tard. Un enregistrement manqué en silence, et
 * elle est perdue sans que personne le sache.
 */
export function ChampTransmission({
  missionId,
  transmission,
}: {
  missionId: string;
  transmission: string | null;
}) {
  const [resultat, envoyer, enCours] = useActionState<ResultatEcriture | null, FormData>(
    async (_precedent, formData) => updateTransmissionAction(formData),
    null
  );

  return (
    <form action={envoyer} className="mt-2 flex flex-col gap-3">
      <input type="hidden" name="missionId" value={missionId} />
      <textarea
        name="transmission"
        defaultValue={transmission ?? ""}
        rows={3}
        placeholder="Écrire ce qui s'est passé pendant la visite..."
        className="rounded-[12px] border border-navy/10 bg-[#F6F7F5] p-3 text-[15px] text-navy placeholder:text-navy/40"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          variant="tertiary"
          className="self-start !min-h-0 !px-0 !py-0"
          disabled={enCours}
        >
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {resultat?.succes && <span className="text-[13px] text-success">Transmission enregistrée.</span>}
        {resultat?.erreur && <span className="text-[13px] text-danger">{resultat.erreur}</span>}
      </div>
    </form>
  );
}
