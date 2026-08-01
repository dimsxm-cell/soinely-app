/**
 * Jours fériés français, métropole et départements d'outre-mer.
 *
 * Un passage un jour férié ouvre droit à la même majoration qu'un dimanche.
 * L'oubli est silencieux : rien dans la journée ne rappelle que le 8 mai était
 * férié, et la majoration ne se réclame pas après coup.
 *
 * Les dates mobiles se calculent à partir de Pâques, dont la date suit le
 * comput grégorien.
 */

import type { ZoneTarifaire } from "@/lib/zone-tarifaire";

/**
 * Dimanche de Pâques d'une année donnée, algorithme de Meeus/Jones/Butcher.
 *
 * Les noms des variables intermédiaires n'ont pas de sens métier : ce sont les
 * restes successifs du comput. Les renommer ne les rendrait pas plus clairs
 * que la référence à l'algorithme lui-même.
 */
function dimanchePaques(annee: number): Date {
  const a = annee % 19;
  const b = Math.floor(annee / 100);
  const c = annee % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31);
  const jour = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(Date.UTC(annee, mois - 1, jour));
}

/** Date décalée de `jours`, sans toucher à l'original. */
function decaler(depart: Date, jours: number): Date {
  const resultat = new Date(depart);
  resultat.setUTCDate(resultat.getUTCDate() + jours);
  return resultat;
}

/** Jour au format `AAAA-MM-JJ`, tel que la base stocke les dates. */
function enIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Jours fériés d'une année, sous forme de dates ISO.
 *
 * La Guadeloupe et les autres DOM ajoutent le Vendredi saint et leur jour
 * d'abolition de l'esclavage aux onze fériés métropolitains. Ces dates
 * diffèrent d'un département à l'autre ; faute de connaître le département
 * exact, la zone DOM retient celle de la Guadeloupe, le 27 mai.
 */
export function joursFeries(annee: number, zone: ZoneTarifaire = "metropole"): Set<string> {
  const paques = dimanchePaques(annee);

  const feries = [
    `${annee}-01-01`, // Jour de l'an
    enIso(decaler(paques, 1)), // Lundi de Pâques
    `${annee}-05-01`, // Fête du Travail
    `${annee}-05-08`, // Victoire 1945
    enIso(decaler(paques, 39)), // Ascension
    enIso(decaler(paques, 50)), // Lundi de Pentecôte
    `${annee}-07-14`, // Fête nationale
    `${annee}-08-15`, // Assomption
    `${annee}-11-01`, // Toussaint
    `${annee}-11-11`, // Armistice 1918
    `${annee}-12-25`, // Noël
  ];

  if (zone === "dom") {
    feries.push(enIso(decaler(paques, -2))); // Vendredi saint
    feries.push(`${annee}-05-27`); // Abolition de l'esclavage en Guadeloupe
  }

  return new Set(feries);
}

/** Le jour donné est-il férié ? `date` au format `AAAA-MM-JJ`. */
export function estJourFerie(date: string, zone: ZoneTarifaire = "metropole"): boolean {
  const annee = Number(date.slice(0, 4));
  if (!Number.isFinite(annee)) return false;

  return joursFeries(annee, zone).has(date);
}

/**
 * Le jour donné ouvre-t-il droit à la majoration dimanche et jours fériés ?
 *
 * Le samedi en est exclu : la NGAP ne le majore que pour les appels d'urgence,
 * cas que rien ici ne permet de distinguer d'une tournée ordinaire.
 */
export function estJourMajore(date: string, zone: ZoneTarifaire = "metropole"): boolean {
  // Midi UTC : à minuit, un décalage horaire négatif ferait basculer la date
  // au jour précédent, et un dimanche deviendrait un samedi.
  const jourSemaine = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (Number.isNaN(jourSemaine)) return false;

  return jourSemaine === 0 || estJourFerie(date, zone);
}
