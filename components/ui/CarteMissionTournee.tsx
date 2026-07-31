import Link from "next/link";
import { IconeSoin } from "@/components/ui/IconeSoin";
import type { MissionTourneeVue } from "@/lib/data/ma-journee";
import { updateMissionStatutAction } from "@/lib/data/ma-journee-actions";
import { formaterNomPropre } from "@/lib/format";
import {
  STATUT_BADGE,
  STATUT_LABEL,
  calculerAge,
  formatHeure,
  getCouleurAvatar,
  getInitiales,
} from "@/lib/tournee-vue";

// Classe du chip d'acte, partagée entre le rendu par acte et le repli sans acte.
const CLASSES_CHIP =
  "inline-flex items-center gap-1.5 rounded-[8px] bg-navy/[0.05] px-2.5 py-1 text-[12px] font-medium text-navy/65";

interface CarteMissionTourneeProps {
  mission: MissionTourneeVue;
  contexteHref?: string;
  estDerniere: boolean;
}

export function CarteMissionTournee({
  mission,
  contexteHref,
  estDerniere,
}: CarteMissionTourneeProps) {
  const age = calculerAge(mission.patientDateNaissance);
  const initiales = getInitiales(mission.patientNom);
  const couleur = getCouleurAvatar(mission.patientId);
  const heure = formatHeure(mission.heurePrevue);
  const enCours = mission.statut === "en_cours";
  const aFaire = mission.statut === "a_faire";
  const terminee = mission.statut === "terminee";
  const absent = mission.statut === "absent";
  const nomFormate = formaterNomPropre(mission.patientNom);
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(
    mission.patientAdresse
  )}`;
  const telUrl = `tel:${mission.patientTelephone.replace(/\s/g, "")}`;

  return (
    <div className="flex gap-3">
      {/* Colonne timeline — fond blanc, texte sombre */}
      <div className="relative flex w-[52px] shrink-0 flex-col items-center pt-4 text-right">
        <span className="text-[11px] font-bold tabular-nums text-navy/55">
          {heure}
        </span>
        {mission.dureeEstimeeMin > 0 && (
          <span className="mt-0.5 text-[10px] text-navy/30">
            {mission.dureeEstimeeMin} min
          </span>
        )}
        {/* Ligne verticale */}
        {!estDerniere && (
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-[50px] bottom-0 w-px -translate-x-1/2 bg-navy/10"
          />
        )}
      </div>

      {/* Carte blanche */}
      <div
        className={`mb-3 flex-1 overflow-hidden rounded-[18px] border bg-white ${
          enCours
            ? "border-brand-violet/40 shadow-[0_6px_24px_rgba(124,58,237,0.18)]"
            : "border-navy/[0.07] shadow-[0_1px_4px_rgba(15,23,42,0.05)]"
        } ${terminee || absent ? "opacity-55" : ""}`}
      >
        {/* En-tête de la carte */}
        <div className="flex items-start gap-3 px-4 py-3.5">
          {/* Avatar */}
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${couleur.bg} ${couleur.text}`}
            aria-hidden="true"
          >
            {initiales}
          </div>

          {/* Infos patient */}
          <div className="min-w-0 flex-1">
            <Link
              href={`/ma-journee/${mission.id}`}
              className="flex items-baseline gap-1.5 hover:opacity-75"
            >
              <span className="font-semibold leading-tight text-navy">
                {nomFormate}
              </span>
              {age !== null && (
                <span className="text-[12px] font-normal text-navy/40">
                  {age} a
                </span>
              )}
            </Link>
            {mission.patientAdresse && (
              <p className="mt-0.5 flex items-center gap-1 text-[12px] text-navy/40">
                <svg
                  viewBox="0 0 24 24"
                  className="h-3 w-3 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="truncate">{mission.patientAdresse}</span>
              </p>
            )}
          </div>

          {/* Badge statut */}
          <span
            className={`shrink-0 rounded-[10px] px-2.5 py-1 text-[11.5px] ${STATUT_BADGE[mission.statut]}`}
          >
            {STATUT_LABEL[mission.statut]}
          </span>
        </div>

        {/* Type de soin (chip) + alertes */}
        <div className="border-t border-navy/[0.06] px-4 py-3">
          {/* Un chip par acte. Le code NGAP porte l'information de facturation :
              il passe en tête, en gras. Un acte sans code — tout l'historique
              repris — garde l'icône et le libellé seuls. */}
          <div className="flex flex-wrap gap-1.5">
            {mission.actes.length > 0 ? (
              mission.actes.map((acte, index) => (
                <span
                  key={`${acte.libelle}-${index}`}
                  className={CLASSES_CHIP}
                >
                  {acte.code ? (
                    <span className="font-bold text-navy/80">{acte.code}</span>
                  ) : (
                    <IconeSoin
                      typeSoin={acte.libelle}
                      className="h-3.5 w-3.5 text-brand-violet"
                    />
                  )}
                  {acte.libelle}
                </span>
              ))
            ) : (
              // Repli : une mission sans acte n'existe pas après la migration,
              // mais une carte muette serait pire qu'un libellé de synthèse.
              <span className={CLASSES_CHIP}>
                <IconeSoin
                  typeSoin={mission.typeSoin}
                  className="h-3.5 w-3.5 text-brand-violet"
                />
                {mission.typeSoin}
              </span>
            )}
          </div>

          {/* Allergie */}
          {mission.patientAllergies && (
            <div className="mt-2.5 flex items-start gap-2 rounded-[10px] bg-red-50 px-3 py-2">
              <span className="mt-px shrink-0 text-[13px]" aria-hidden="true">
                ⚠️
              </span>
              <p className="text-[12.5px] font-medium text-red-600">
                {mission.patientAllergies}
              </p>
            </div>
          )}

          {/* Lien contexte clinique */}
          {contexteHref && (
            <Link
              href={contexteHref}
              className="mt-2 inline-flex text-[12.5px] font-semibold text-brand-violet hover:underline"
            >
              Voir contexte clinique →
            </Link>
          )}
        </div>

        {/* Actions */}
        {(aFaire || enCours) && (
          <div className="border-t border-navy/[0.06] px-4 py-3">
            {enCours ? (
              /* Mission en cours : GPS + Appeler + Valider */
              <div className="flex gap-2">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] border border-navy/15 bg-white py-2.5 text-[13px] font-semibold text-navy shadow-sm hover:bg-navy/[0.03]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <polygon points="3 11 22 2 13 21 11 13 3 11" />
                  </svg>
                  GPS
                </a>
                <a
                  href={telUrl}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] border border-navy/15 bg-white py-2.5 text-[13px] font-semibold text-navy shadow-sm hover:bg-navy/[0.03]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92Z" />
                  </svg>
                  Appeler
                </a>
                <form action={updateMissionStatutAction} className="flex-1">
                  <input type="hidden" name="missionId" value={mission.id} />
                  <input type="hidden" name="nouveauStatut" value="terminee" />
                  <button
                    type="submit"
                    className="w-full rounded-[12px] bg-gradient-to-r from-brand-violet to-brand-rose py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(124,58,237,0.32)] hover:opacity-90"
                  >
                    ✓ Valider
                  </button>
                </form>
              </div>
            ) : (
              /* Mission à faire : Valider le soin + Absent */
              <div className="flex gap-2">
                <form action={updateMissionStatutAction} className="flex-1">
                  <input type="hidden" name="missionId" value={mission.id} />
                  <input type="hidden" name="nouveauStatut" value="en_cours" />
                  <button
                    type="submit"
                    className="w-full rounded-[12px] border border-brand-violet/30 bg-brand-violet/[0.06] py-2.5 text-[13px] font-semibold text-brand-violet hover:bg-brand-violet/[0.10]"
                  >
                    Valider le soin
                  </button>
                </form>
                <form action={updateMissionStatutAction}>
                  <input type="hidden" name="missionId" value={mission.id} />
                  <input type="hidden" name="nouveauStatut" value="absent" />
                  <button
                    type="submit"
                    className="rounded-[12px] border border-navy/12 bg-navy/[0.03] px-4 py-2.5 text-[13px] font-semibold text-navy/50 hover:bg-navy/[0.07]"
                  >
                    Absent
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Consignes d'accès : code portail, étage, animal, présence de la
            famille. Rendues en pied de carte et non en encart d'alerte —
            c'est de la logistique, pas un risque clinique. */}
        {mission.patientConsignes && (
          <div className="border-t border-dashed border-navy/10 px-4 py-2.5">
            <p className="text-[12.5px] leading-relaxed text-navy/45">
              {mission.patientConsignes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
