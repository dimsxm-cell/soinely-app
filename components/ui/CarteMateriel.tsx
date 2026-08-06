import { FormulaireAvecRetour } from "@/components/ui/FormulaireAvecRetour";
import { updateMaterielAction } from "@/lib/data/materiel-actions";
import type { MaterielItem } from "@/lib/data/materiel";

interface CarteMaterielProps {
  items: MaterielItem[];
  tourneeId: string;
  prepare: boolean;
  verifie: boolean;
}

export function CarteMateriel({ items, tourneeId, prepare, verifie }: CarteMaterielProps) {
  return (
    <div className="mt-5 rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-navy/45">
        Matériel du jour
      </p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {items.map((item) => (
          <li
            key={item.libelle}
            className="flex items-center justify-between text-[13.5px] text-navy/75"
          >
            <span>{item.libelle}</span>
            <span className="font-semibold tabular-nums">×{item.quantite}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <FormulaireAvecRetour
          action={updateMaterielAction}
          messageSucces="Matériel préparé."
          className="flex-1"
        >
          <input type="hidden" name="tourneeId" value={tourneeId} />
          <input type="hidden" name="champ" value="prepare" />
          <button
            type="submit"
            className={`w-full rounded-[12px] px-3 py-2 text-[13px] font-semibold ${
              prepare ? "bg-teal/10 text-[#0E7E70]" : "bg-brand-violet/10 text-brand-violet"
            }`}
          >
            {prepare ? "✓ Préparé" : "J'ai tout préparé"}
          </button>
        </FormulaireAvecRetour>
        <FormulaireAvecRetour
          action={updateMaterielAction}
          messageSucces="Matériel vérifié."
          className="flex-1"
        >
          <input type="hidden" name="tourneeId" value={tourneeId} />
          <input type="hidden" name="champ" value="verifie" />
          <button
            type="submit"
            className={`w-full rounded-[12px] px-3 py-2 text-[13px] font-semibold ${
              verifie ? "bg-teal/10 text-[#0E7E70]" : "bg-brand-violet/10 text-brand-violet"
            }`}
          >
            {verifie ? "✓ Vérifié" : "Tout vérifié"}
          </button>
        </FormulaireAvecRetour>
      </div>
    </div>
  );
}
