"use client";

import { useActionState, type ReactNode } from "react";
import type { ResultatEcriture } from "@/lib/data/ma-journee-actions";

/**
 * Formulaire qui montre ce qu'est devenu son envoi.
 *
 * Six écrans partageaient le même défaut : l'action renonçait sans un mot, et
 * l'IDEL ne savait pas si son geste avait porté. Plutôt que d'écrire six fois
 * la même mécanique, elle vit ici — chaque écran ne fournit que ses champs.
 *
 * Le message de succès s'affiche à côté du bouton et non à la place : la
 * plupart de ces gestes se font d'une main, sur le pas d'une porte, et un
 * bouton qui disparaît sous le doigt déroute plus qu'il ne rassure.
 */
export function FormulaireAvecRetour({
  action,
  messageSucces,
  className,
  id,
  children,
}: {
  action: (formData: FormData) => Promise<ResultatEcriture>;
  messageSucces: string;
  className?: string;
  /** Permet à un bouton hors du formulaire de le soumettre via l'attribut HTML `form`. */
  id?: string;
  children: ReactNode;
}) {
  const [resultat, envoyer] = useActionState<ResultatEcriture | null, FormData>(
    async (_precedent, formData) => action(formData),
    null
  );

  return (
    <form id={id} action={envoyer} className={className}>
      {children}
      {resultat?.succes && <p className="text-[13px] text-success">{messageSucces}</p>}
      {resultat?.erreur && <p className="text-[13px] text-danger">{resultat.erreur}</p>}
    </form>
  );
}
