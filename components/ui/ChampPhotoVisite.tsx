"use client";

import { useActionState } from "react";
import { uploadPhotoAction, type ResultatEcriture } from "@/lib/data/ma-journee-actions";
import { Button } from "@/components/ui/Button";
import { ChampFichier } from "@/components/ui/ChampFichier";

/**
 * Photo de suivi d'une visite.
 *
 * Composant client pour montrer un échec d'envoi sur-le-champ. Une plaie
 * photographiée au domicile ne se rephotographie pas le lendemain : l'état du
 * jour est perdu si l'envoi manque sans le dire, et c'est justement dans les
 * tournées que le réseau flanche.
 */
export function ChampPhotoVisite({ missionId }: { missionId: string }) {
  const [resultat, envoyer, enCours] = useActionState<ResultatEcriture | null, FormData>(
    async (_precedent, formData) => uploadPhotoAction(formData),
    null
  );

  return (
    <form action={envoyer} className="mt-2 flex flex-col gap-3">
      <input type="hidden" name="missionId" value={missionId} />
      <ChampFichier
        name="photo"
        accept="image/*"
        capture="environment"
        ariaLabel="Photo de cette visite"
        libelle="Prendre une photo"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          variant="tertiary"
          className="self-start !min-h-0 !px-0 !py-0"
          disabled={enCours}
        >
          {enCours ? "Envoi…" : "Envoyer"}
        </Button>
        {resultat?.succes && <span className="text-[13px] text-success">Photo enregistrée.</span>}
        {resultat?.erreur && <span className="text-[13px] text-danger">{resultat.erreur}</span>}
      </div>
    </form>
  );
}
