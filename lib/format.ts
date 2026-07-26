export function formatDateFr(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export function formaterNomPropre(nom: string): string {
  return nom
    .toLocaleLowerCase("fr-FR")
    .replace(/(^|[\s'-])(\p{L})/gu, (_correspondance, separateur: string, lettre: string) =>
      separateur + lettre.toLocaleUpperCase("fr-FR")
    );
}
