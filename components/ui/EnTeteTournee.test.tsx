import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EnTeteTournee } from "./EnTeteTournee";
import type { MissionTourneeVue } from "@/lib/data/ma-journee";
import type { StatutMission, Tournee } from "@/lib/types/clinical";
import type { ContexteTarifaire } from "@/lib/cotation";
import type { CountsMissions } from "@/lib/tournee-vue";

const TARIFS: ContexteTarifaire = { zone: "metropole", valeurs: new Map() };

const tournee: Tournee = {
  id: "t1",
  date: "2026-07-30",
  nbPatients: 8,
  nbInjections: 3,
  nbPansements: 2,
  nbGlycemies: 1,
  tempsEstimeMin: 240,
  materielPrepare: false,
  materielVerifie: false,
};

const COUNTS_VIDES: CountsMissions = { tout: 0, a_faire: 0, alertes: 0, valides: 0 };

function creerMission(
  id: string,
  statut: StatutMission,
  heurePrevue: string,
  heureDebutReelle: string | null = null
): MissionTourneeVue {
  return {
    id,
    patientId: `p-${id}`,
    patientNom: "Mme Dupont",
    patientAdresse: "12 rue des Lilas",
    patientTelephone: "06 12 34 56 78",
    patientAllergies: null,
    patientConsignes: null,
    patientDateNaissance: "1944-03-12",
    patientForfaitBsi: null,
    distanceKm: null,
    distanceKmCorrigee: null,
    typeSoin: "Pansement",
    heurePrevue,
    statut,
    missionCliniqueId: null,
    dureeEstimeeMin: 25,
    actes: [],
    motifAbsence: null,
    heureDebutReelle,
  };
}

const missions = [
  creerMission("a", "terminee", "08:00:00"),
  creerMission("b", "absent", "10:05:00"),
  creerMission("c", "a_faire", "15:15:00"),
  creerMission("d", "a_faire", "16:00:00"),
  creerMission("e", "a_faire", "18:05:00"),
];

describe("EnTeteTournee", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-30T09:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("affiche le compteur de passages validés sur le total, dans l'anneau", () => {
    render(
      <EnTeteTournee
        missions={missions}
        tournee={tournee}
        contexteTarifaire={TARIFS}
        filtre="tout"
        counts={COUNTS_VIDES}
      />
    );

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("/ 5")).toBeInTheDocument();
  });

  it("affiche le nombre de missions restantes et l'heure de fin estimée", () => {
    render(
      <EnTeteTournee
        missions={missions}
        tournee={tournee}
        contexteTarifaire={TARIFS}
        filtre="tout"
        counts={COUNTS_VIDES}
      />
    );

    expect(screen.getByText("Reste")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/Fin estimée.*18:05/)).toBeInTheDocument();
  });

  it("affiche la stat Km comme non disponible", () => {
    render(
      <EnTeteTournee
        missions={missions}
        tournee={tournee}
        contexteTarifaire={TARIFS}
        filtre="tout"
        counts={COUNTS_VIDES}
      />
    );

    const libelleKm = screen.getByText("Km");
    expect(libelleKm.parentElement).toHaveTextContent("—");
  });

  it("affiche le montant facturable comme pastille Cotation", () => {
    const avecActes = [
      {
        ...creerMission("a", "terminee", "08:00:00"),
        actes: [
          { libelle: "Pansement", code: "AMI 2", cotation: 6.3, lettreCle: "AMI", coefficient: 2, derogatoireBsi: false, eligibleMci: false },
        ],
      },
    ];

    render(
      <EnTeteTournee
        missions={avecActes}
        tournee={tournee}
        contexteTarifaire={TARIFS}
        filtre="tout"
        counts={COUNTS_VIDES}
      />
    );

    expect(screen.getByText("Cotation")).toBeInTheDocument();
    expect(screen.getByText(/6,30/)).toBeInTheDocument();
  });

  it("n'affiche pas la pastille d'heure de fin quand tout est validé", () => {
    const toutesValidees = [creerMission("a", "terminee", "08:00:00"), creerMission("b", "terminee", "10:05:00")];

    render(
      <EnTeteTournee
        missions={toutesValidees}
        tournee={tournee}
        contexteTarifaire={TARIFS}
        filtre="tout"
        counts={COUNTS_VIDES}
      />
    );

    expect(screen.queryByText(/Fin estimée/)).not.toBeInTheDocument();
  });

  it("rend les filtres avec leur comptage", () => {
    const counts: CountsMissions = { tout: 5, a_faire: 3, alertes: 1, valides: 2 };

    render(
      <EnTeteTournee missions={missions} tournee={tournee} contexteTarifaire={TARIFS} filtre="tout" counts={counts} />
    );

    expect(screen.getByRole("link", { name: /Tout/ })).toHaveTextContent("5");
    expect(screen.getByRole("link", { name: /Validés/ })).toHaveTextContent("2");
  });
});

describe("EnTeteTournee — majorations toujours incluses dans le total", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-07T09:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("inclut les majorations dans la pastille Cotation, sans ligne de détail séparée", () => {
    // Un passage à 21 h, un mardi : 6,30 € d'acte, 2,75 € de déplacement et
    // 9,15 € de majoration de nuit, soit 18,20 € facturables — même calcul
    // qu'avant la refonte, seule la ligne « dont X de majorations » disparaît.
    const AVEC_MAJORATIONS: ContexteTarifaire = {
      zone: "metropole",
      valeurs: new Map([
        ["AMI", { lettreCle: "AMI", valeurMetropole: 3.15, valeurDom: 3.3 }],
        ["IFD", { lettreCle: "IFD", valeurMetropole: 2.75, valeurDom: 2.75 }],
        ["MN", { lettreCle: "MN", valeurMetropole: 9.15, valeurDom: 9.15 }],
      ]),
    };
    const mission = {
      ...creerMission("a", "terminee", "21:00:00"),
      actes: [
        { libelle: "Pansement", code: "AMI 2", cotation: 6.3, lettreCle: "AMI", coefficient: 2, derogatoireBsi: false, eligibleMci: false },
      ],
    };

    render(
      <EnTeteTournee
        missions={[mission]}
        tournee={{ ...tournee, date: "2026-07-07" }}
        contexteTarifaire={AVEC_MAJORATIONS}
        filtre="tout"
        counts={COUNTS_VIDES}
      />
    );

    expect(screen.getByText(/18,20/)).toBeInTheDocument();
    expect(screen.queryByText(/de majorations/)).not.toBeInTheDocument();
  });
});

describe("EnTeteTournee — soin en cours et retard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-30T09:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("affiche le nom et l'adresse du soin en cours", () => {
    const avecEnCours = [
      ...missions,
      creerMission("f", "en_cours", "14:20:00", "2026-07-30T12:32:00.000Z"),
    ];

    render(
      <EnTeteTournee
        missions={avecEnCours}
        tournee={tournee}
        contexteTarifaire={TARIFS}
        filtre="tout"
        counts={COUNTS_VIDES}
      />
    );

    expect(screen.getByText("Mme Dupont")).toBeInTheDocument();
    expect(screen.getByText(/12 rue des Lilas/)).toBeInTheDocument();
  });

  it("affiche un badge de retard quand le soin a démarré en retard", () => {
    // Prévu 14:20 Paris, débuté 14:32 Paris (12:32 UTC, été) : 12 min de retard.
    const avecRetard = [creerMission("f", "en_cours", "14:20:00", "2026-07-30T12:32:00.000Z")];

    render(
      <EnTeteTournee
        missions={avecRetard}
        tournee={tournee}
        contexteTarifaire={TARIFS}
        filtre="tout"
        counts={COUNTS_VIDES}
      />
    );

    expect(screen.getByText(/12 min de retard/)).toBeInTheDocument();
  });

  it("n'affiche aucun badge de retard quand le soin a démarré à l'heure", () => {
    const aLHeure = [creerMission("f", "en_cours", "14:20:00", "2026-07-30T12:20:00.000Z")];

    render(
      <EnTeteTournee
        missions={aLHeure}
        tournee={tournee}
        contexteTarifaire={TARIFS}
        filtre="tout"
        counts={COUNTS_VIDES}
      />
    );

    expect(screen.queryByText(/retard/)).not.toBeInTheDocument();
  });

  it("affiche un message de repli quand rien n'est en cours mais qu'il reste des soins", () => {
    render(
      <EnTeteTournee
        missions={missions}
        tournee={tournee}
        contexteTarifaire={TARIFS}
        filtre="tout"
        counts={COUNTS_VIDES}
      />
    );

    expect(screen.getByText(/restant.*aucun en cours/)).toBeInTheDocument();
  });

  it("affiche un message de repli quand tout est validé", () => {
    const toutesValidees = [creerMission("a", "terminee", "08:00:00")];

    render(
      <EnTeteTournee
        missions={toutesValidees}
        tournee={tournee}
        contexteTarifaire={TARIFS}
        filtre="tout"
        counts={COUNTS_VIDES}
      />
    );

    expect(screen.getByText("Tous les soins du jour sont validés")).toBeInTheDocument();
  });
});
