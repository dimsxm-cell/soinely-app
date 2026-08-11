export function formatDateFr(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/** Date du jour, en toutes lettres, capitalisee (ex. "Mardi 29 juillet"). */
export function formatDateDuJour(): string {
  const date = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return date.charAt(0).toUpperCase() + date.slice(1);
}

export function formaterNomPropre(nom: string): string {
  return nom
    .toLocaleLowerCase("fr-FR")
    .replace(/(^|[\s'-])(\p{L})/gu, (_correspondance, separateur: string, lettre: string) =>
      separateur + lettre.toLocaleUpperCase("fr-FR")
    );
}

/**
 * Initiales d'un nom complet d'utilisateur (ex. "Sophie Lambert" -> "SL"),
 * pour l'avatar de repli quand aucune photo de profil n'est definie.
 *
 * Distincte de getInitiales() (lib/tournee-vue.ts), qui gere des noms de
 * *patients* avec civilite ("Mme", "M.") en prenant les 2 premieres lettres
 * d'un seul mot — un nom complet d'utilisateur n'a pas de civilite et veut
 * les vraies initiales prenom+nom, pas une tranche d'un seul mot.
 */
export function initialesUtilisateur(nomComplet: string): string {
  const mots = nomComplet.trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return "";
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[mots.length - 1][0]).toUpperCase();
}
