"use client";

import { mettreAJourEcoutePermanenteAction } from "@/app/(app)/compte/actions";

interface BasculeEcoutePermanenteElyProps {
  activeParDefaut: boolean;
}

export function BasculeEcoutePermanenteEly({ activeParDefaut }: BasculeEcoutePermanenteElyProps) {
  return (
    <form action={mettreAJourEcoutePermanenteAction}>
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm text-navy">Écoute permanente pour Ely (dire « Dis-moi Ely »)</span>
        <input
          type="checkbox"
          name="ecoute_permanente_ely"
          value="on"
          defaultChecked={activeParDefaut}
          onChange={(event) => event.currentTarget.form?.requestSubmit?.()}
          className="h-5 w-5 accent-brand-violet"
        />
      </label>
    </form>
  );
}
