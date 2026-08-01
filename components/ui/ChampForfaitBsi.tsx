/**
 * Forfait journalier de dépendance issu du Bilan de Soins Infirmiers.
 *
 * Le renseigner change la cotation de tous les actes du patient : ils basculent
 * en AMX à 50 % du coefficient, hors actes dérogatoires. C'est pourquoi le
 * champ dit ce qu'il déclenche plutôt que de se contenter de son nom — se
 * tromper de sens expose soit à un indu, soit à un manque à gagner.
 *
 * Un `<select>` natif, et non le sélecteur maison des autres champs : la liste
 * tient en quatre entrées fixes, et le composant reste un composant serveur.
 */

const OPTIONS: { valeur: string; label: string }[] = [
  { valeur: "", label: "Pas de forfait" },
  { valeur: "BSA", label: "BSA — dépendance légère" },
  { valeur: "BSB", label: "BSB — dépendance intermédiaire" },
  { valeur: "BSC", label: "BSC — dépendance lourde" },
];

export function ChampForfaitBsi({ defaultValue }: { defaultValue?: string | null }) {
  return (
    <div>
      <label
        htmlFor="forfaitBsi"
        className="block text-[13px] font-semibold uppercase tracking-wider text-navy/45"
      >
        Forfait de dépendance
      </label>
      <select
        id="forfaitBsi"
        name="forfaitBsi"
        defaultValue={defaultValue ?? ""}
        className="mt-2 w-full max-w-full min-w-0 rounded-[14px] border border-[#d9d4ea] bg-[#F6F7F5] px-4 py-3.5 text-[15px] text-navy"
      >
        {OPTIONS.map((o) => (
          <option key={o.valeur} value={o.valeur}>
            {o.label}
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-[13px] text-navy/50">
        Sur BSI validé. Les actes techniques du patient passent alors en AMX, à moitié coefficient
        — sauf pansements lourds et perfusions.
      </p>
    </div>
  );
}
