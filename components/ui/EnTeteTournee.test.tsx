import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EnTeteTournee } from "./EnTeteTournee";
import type { MissionTourneeVue } from "@/lib/data/ma-journee";
import type { Tournee } from "@/lib/types/clinical";
import type { ContexteTarifaire } from "@/lib/cotation";

const TOURNEE: Tournee = {
  id: "t1",
  date: "2026-08-10",
  nbPatients: 0,
  nbInjections: 0,
  nbPansements: 0,
  nbGlycemies: 0,
  tempsEstimeMin: 0,
  materielPrepare: false,
  materielVerifie: false,
};

const CONTEXTE: ContexteTarifaire = { zone: "metropole", valeurs: new Map() };

function creerMission(surcharge: Partial<MissionTourneeVue> = {}): MissionTourneeVue {
  return {
    id: "m1",
    patientId: "p1",
    patientNom: "Mme Dupont",
    patientAdresse: "1 rue des Lilas",
    patientTelephone: "0600000000",
    patientAllergies: null,
    patientConsignes: null,
    patientDateNaissance: null,
    patientForfaitBsi: null,
    distanceKm: null,
    distanceKmCorrigee: null,
    typeSoin: "Soin",
    heurePrevue: "09:00",
    statut: "a_faire",
    missionCliniqueId: null,
    dureeEstimeeMin: 20,
    actes: [],
    motifAbsence: null,
    heureDebutReelle: null,
    ...surcharge,
  };
}

describe("EnTeteTournee", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T09:00:00"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("affiche la date du jour et le titre Ma tournee", () => {
    render(
      <EnTeteTournee
        missions={[]}
        tournee={TOURNEE}
        contexteTarifaire={CONTEXTE}
        filtre="tout"
        counts={{ tout: 0, a_faire: 0, alertes: 0, valides: 0 }}
        avatarUrl={null}
      />
    );
    expect(screen.getByText("Lundi 10 août")).toBeInTheDocument();
    expect(screen.getByText("Ma tournée")).toBeInTheDocument();
  });

  it("affiche les initiales de l'utilisateur quand aucune photo n'est definie", () => {
    render(
      <EnTeteTournee
        missions={[]}
        tournee={TOURNEE}
        contexteTarifaire={CONTEXTE}
        filtre="tout"
        counts={{ tout: 0, a_faire: 0, alertes: 0, valides: 0 }}
        avatarUrl={null}
        nomComplet="Sophie Lambert"
      />
    );
    expect(screen.getByText("SL")).toBeInTheDocument();
  });

  it("somme la distance retenue de toutes les missions pour la stat Km", () => {
    const missions = [
      creerMission({ id: "m1", distanceKm: 5, distanceKmCorrigee: null }),
      creerMission({ id: "m2", distanceKm: 3, distanceKmCorrigee: 4.7 }),
      creerMission({ id: "m3", distanceKm: null, distanceKmCorrigee: null }),
    ];
    render(
      <EnTeteTournee
        missions={missions}
        tournee={TOURNEE}
        contexteTarifaire={CONTEXTE}
        filtre="tout"
        counts={{ tout: 3, a_faire: 3, alertes: 0, valides: 0 }}
        avatarUrl={null}
      />
    );
    // 5 (m1) + 4,7 (m2, la correction prime) + 0 (m3) = 9,7, arrondi a 10
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("affiche un tiret pour la stat Km quand aucune mission n'a de distance", () => {
    render(
      <EnTeteTournee
        missions={[creerMission()]}
        tournee={TOURNEE}
        contexteTarifaire={CONTEXTE}
        filtre="tout"
        counts={{ tout: 1, a_faire: 1, alertes: 0, valides: 0 }}
        avatarUrl={null}
      />
    );
    const labelKm = screen.getByText("Km");
    expect(labelKm.parentElement).toHaveTextContent("—");
  });

  it("affiche un tiret de repli pour l'avatar quand aucun nom n'est fourni", () => {
    render(
      <EnTeteTournee
        missions={[]}
        tournee={TOURNEE}
        contexteTarifaire={CONTEXTE}
        filtre="tout"
        counts={{ tout: 0, a_faire: 0, alertes: 0, valides: 0 }}
        avatarUrl={null}
      />
    );
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("n'affiche aucun element fabrique de la maquette (banniere Ely, boutons carte/plus, point en ligne)", () => {
    const { container } = render(
      <EnTeteTournee
        missions={[]}
        tournee={TOURNEE}
        contexteTarifaire={CONTEXTE}
        filtre="tout"
        counts={{ tout: 0, a_faire: 0, alertes: 0, valides: 0 }}
        avatarUrl={null}
      />
    );
    expect(screen.queryByText(/Ely a optimisé/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /carte/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /plus d.actions/i })).not.toBeInTheDocument();
    // Le point "en ligne" de la maquette est un petit cercle vert decoratif :
    // verifie qu'aucun element avec ce fond vert caracteristique n'existe.
    expect(container.querySelector('[class*="34c759"]')).not.toBeInTheDocument();
  });
});

// Cette suite existait avant la reconciliation avec la maquette (elle couvrait
// l'ancien en-tete a base de BarreLogoProfilHero) et continue de s'appliquer :
// la refonte ne change que la ligne date/titre/avatar et la stat Km — anneau
// de progression, badges retard/heure-fin, stats Reste/Cotation et pilules de
// filtre restent le meme JSX qu'avant. On la conserve pour ne pas perdre cette
// couverture de non-regression, adaptee au helper creerMission ci-dessus.
describe("EnTeteTournee — comportements herites (anneau, badges, filtres, majorations)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T09:00:00"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const missions = [
    creerMission({ id: "a", statut: "terminee", heurePrevue: "08:00:00" }),
    creerMission({ id: "b", statut: "absent", heurePrevue: "10:05:00" }),
    creerMission({ id: "c", statut: "a_faire", heurePrevue: "15:15:00" }),
    creerMission({ id: "d", statut: "a_faire", heurePrevue: "16:00:00" }),
    creerMission({ id: "e", statut: "a_faire", heurePrevue: "18:05:00" }),
  ];

  it("affiche le compteur de passages validés sur le total, dans l'anneau", () => {
    render(
      <EnTeteTournee
        missions={missions}
        tournee={TOURNEE}
        contexteTarifaire={CONTEXTE}
        filtre="tout"
        counts={{ tout: 0, a_faire: 0, alertes: 0, valides: 0 }}
        avatarUrl={null}
      />
    );

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("/ 5")).toBeInTheDocument();
  });

  it("affiche le nombre de missions restantes et l'heure de fin estimée", () => {
    render(
      <EnTeteTournee
        missions={missions}
        tournee={TOURNEE}
        contexteTarifaire={CONTEXTE}
        filtre="tout"
        counts={{ tout: 0, a_faire: 0, alertes: 0, valides: 0 }}
        avatarUrl={null}
      />
    );

    expect(screen.getByText("Reste")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/Fin estimée.*18:05/)).toBeInTheDocument();
  });

  it("affiche le montant facturable comme pastille Cotation", () => {
    const avecActes = [
      creerMission({
        id: "a",
        statut: "terminee",
        heurePrevue: "08:00:00",
        actes: [
          { libelle: "Pansement", code: "AMI 2", cotation: 6.3, lettreCle: "AMI", coefficient: 2, derogatoireBsi: false, eligibleMci: false },
        ],
      }),
    ];

    render(
      <EnTeteTournee
        missions={avecActes}
        tournee={TOURNEE}
        contexteTarifaire={CONTEXTE}
        filtre="tout"
        counts={{ tout: 0, a_faire: 0, alertes: 0, valides: 0 }}
        avatarUrl={null}
      />
    );

    expect(screen.getByText("Cotation")).toBeInTheDocument();
    expect(screen.getByText(/6,30/)).toBeInTheDocument();
  });

  it("n'affiche pas la pastille d'heure de fin quand tout est validé", () => {
    const toutesValidees = [
      creerMission({ id: "a", statut: "terminee", heurePrevue: "08:00:00" }),
      creerMission({ id: "b", statut: "terminee", heurePrevue: "10:05:00" }),
    ];

    render(
      <EnTeteTournee
        missions={toutesValidees}
        tournee={TOURNEE}
        contexteTarifaire={CONTEXTE}
        filtre="tout"
        counts={{ tout: 0, a_faire: 0, alertes: 0, valides: 0 }}
        avatarUrl={null}
      />
    );

    expect(screen.queryByText(/Fin estimée/)).not.toBeInTheDocument();
  });

  it("rend les filtres avec leur comptage", () => {
    const counts = { tout: 5, a_faire: 3, alertes: 1, valides: 2 };

    render(
      <EnTeteTournee
        missions={missions}
        tournee={TOURNEE}
        contexteTarifaire={CONTEXTE}
        filtre="tout"
        counts={counts}
        avatarUrl={null}
      />
    );

    expect(screen.getByRole("link", { name: /Tout/ })).toHaveTextContent("5");
    expect(screen.getByRole("link", { name: /Validés/ })).toHaveTextContent("2");
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
    const mission = creerMission({
      id: "a",
      statut: "terminee",
      heurePrevue: "21:00:00",
      actes: [
        { libelle: "Pansement", code: "AMI 2", cotation: 6.3, lettreCle: "AMI", coefficient: 2, derogatoireBsi: false, eligibleMci: false },
      ],
    });

    render(
      <EnTeteTournee
        missions={[mission]}
        tournee={{ ...TOURNEE, date: "2026-07-07" }}
        contexteTarifaire={AVEC_MAJORATIONS}
        filtre="tout"
        counts={{ tout: 0, a_faire: 0, alertes: 0, valides: 0 }}
        avatarUrl={null}
      />
    );

    expect(screen.getByText(/18,20/)).toBeInTheDocument();
    expect(screen.queryByText(/de majorations/)).not.toBeInTheDocument();
  });

  it("affiche le nom et l'adresse du soin en cours", () => {
    const avecEnCours = [
      ...missions,
      creerMission({
        id: "f",
        statut: "en_cours",
        heurePrevue: "14:20:00",
        heureDebutReelle: "2026-08-10T12:32:00.000Z",
        patientAdresse: "12 rue des Lilas",
      }),
    ];

    render(
      <EnTeteTournee
        missions={avecEnCours}
        tournee={TOURNEE}
        contexteTarifaire={CONTEXTE}
        filtre="tout"
        counts={{ tout: 0, a_faire: 0, alertes: 0, valides: 0 }}
        avatarUrl={null}
      />
    );

    expect(screen.getByText("Mme Dupont")).toBeInTheDocument();
    expect(screen.getByText(/12 rue des Lilas/)).toBeInTheDocument();
  });

  it("affiche un badge de retard quand le soin a démarré en retard", () => {
    // Prévu 14:20 Paris, débuté 14:32 Paris (12:32 UTC, été) : 12 min de retard.
    const avecRetard = [
      creerMission({
        id: "f",
        statut: "en_cours",
        heurePrevue: "14:20:00",
        heureDebutReelle: "2026-08-10T12:32:00.000Z",
      }),
    ];

    render(
      <EnTeteTournee
        missions={avecRetard}
        tournee={TOURNEE}
        contexteTarifaire={CONTEXTE}
        filtre="tout"
        counts={{ tout: 0, a_faire: 0, alertes: 0, valides: 0 }}
        avatarUrl={null}
      />
    );

    expect(screen.getByText(/12 min de retard/)).toBeInTheDocument();
  });

  it("n'affiche aucun badge de retard quand le soin a démarré à l'heure", () => {
    const aLHeure = [
      creerMission({
        id: "f",
        statut: "en_cours",
        heurePrevue: "14:20:00",
        heureDebutReelle: "2026-08-10T12:20:00.000Z",
      }),
    ];

    render(
      <EnTeteTournee
        missions={aLHeure}
        tournee={TOURNEE}
        contexteTarifaire={CONTEXTE}
        filtre="tout"
        counts={{ tout: 0, a_faire: 0, alertes: 0, valides: 0 }}
        avatarUrl={null}
      />
    );

    expect(screen.queryByText(/retard/)).not.toBeInTheDocument();
  });

  it("affiche un message de repli quand rien n'est en cours mais qu'il reste des soins", () => {
    render(
      <EnTeteTournee
        missions={missions}
        tournee={TOURNEE}
        contexteTarifaire={CONTEXTE}
        filtre="tout"
        counts={{ tout: 0, a_faire: 0, alertes: 0, valides: 0 }}
        avatarUrl={null}
      />
    );

    expect(screen.getByText(/restant.*aucun en cours/)).toBeInTheDocument();
  });

  it("affiche un message de repli quand tout est validé", () => {
    const toutesValidees = [creerMission({ id: "a", statut: "terminee", heurePrevue: "08:00:00" })];

    render(
      <EnTeteTournee
        missions={toutesValidees}
        tournee={TOURNEE}
        contexteTarifaire={CONTEXTE}
        filtre="tout"
        counts={{ tout: 0, a_faire: 0, alertes: 0, valides: 0 }}
        avatarUrl={null}
      />
    );

    expect(screen.getByText("Tous les soins du jour sont validés")).toBeInTheDocument();
  });
});
