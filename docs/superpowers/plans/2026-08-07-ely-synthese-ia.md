# Ely — synthèse IA de la réponse — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ely répond à la question réelle de l'infirmière (pas seulement la fiche la mieux classée) via un appel LLM borné, tout en garantissant qu'aucune donnée patient nominative n'est envoyée au LLM et qu'aucun contrôle/signe d'alerte/action n'est affiché sans exister mot pour mot dans une fiche déjà validée.

**Architecture:** La recherche existante (`searchSituationsTerrain`) reste inchangée et tourne sur le texte brut. Une fonction pure filtre les noms des patients de la tournée du jour dans une copie de la question ; cette copie filtrée, avec les 3 meilleures fiches trouvées, part vers Claude (appel `fetch` direct, tool-use forcé pour un JSON structuré). La réponse du LLM est validée côté serveur : chaque contrôle/signe d'alerte/action retenu doit être une correspondance exacte avec le contenu d'une fiche fournie, sinon il est supprimé. Tout échec (pas de clé API, pas de tournée du jour, erreur réseau, timeout, réponse invalide) se résout par un repli silencieux sur le comportement actuel (affichage brut de la première fiche trouvée).

**Tech Stack:** Next.js 16 / React 19 / TypeScript / Supabase / Vitest — aucune nouvelle dépendance npm (appel HTTP via `fetch` natif, comme `lib/distance.ts` le fait déjà pour OpenRouteService).

## Global Constraints

- Le LLM ne reçoit jamais le texte brut de la question — uniquement une copie où les noms des patients de la tournée du jour de l'infirmière ont été remplacés par `[patient]`.
- Si la liste des patients du jour ne peut pas être déterminée (pas de tournée, erreur de récupération, utilisateur non identifié), l'appel LLM est annulé entièrement — jamais d'envoi non filtré.
- `controlesRetenus`, `signesAlerteRetenus` et `actionsRetenues` ne peuvent contenir que des chaînes strictement identiques à une entrée des fiches fournies au LLM ; toute chaîne qui ne correspond pas est supprimée côté serveur.
- Si `controlesRetenus`, `signesAlerteRetenus` et `actionsRetenues` sont tous les trois vides après validation, la synthèse est traitée comme un échec.
- Aucun échec (réseau, timeout, JSON invalide, garde-fou du filtrage) ne doit lever d'exception visible pour l'infirmière — repli silencieux sur le comportement actuel.
- Modèle : `claude-haiku-4-5-20251001`. Timeout : 8000 ms.
- Clé API dans la variable d'environnement `ANTHROPIC_API_KEY`, lue côté serveur uniquement.
- Détection automatique d'urgence, contexte de mission dans le prompt, historique multi-tours et choix de modèle configurable sont hors scope de ce plan.

---

### Task 1: Filtrage des noms de patients

**Files:**
- Create: `lib/ely-redaction.ts`
- Test: `lib/ely-redaction.test.ts`

**Interfaces:**
- Produces: `filtrerNomsPatients(question: string, nomsPatients: string[]): string`

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, expect, it } from "vitest";
import { filtrerNomsPatients } from "./ely-redaction";

describe("filtrerNomsPatients", () => {
  it("remplace le nom et le prénom d'un patient de la liste", () => {
    expect(filtrerNomsPatients("Madame Dupont a une plaie qui suinte", ["Jean Dupont"])).toBe(
      "Madame [patient] a une plaie qui suinte"
    );
  });

  it("ignore la casse", () => {
    expect(filtrerNomsPatients("DUPONT ne va pas bien", ["Jean Dupont"])).toBe(
      "[patient] ne va pas bien"
    );
  });

  it("ignore les accents, dans les deux sens", () => {
    expect(filtrerNomsPatients("Émilie a de la fièvre", ["Emilie Martin"])).toBe(
      "[patient] a de la fièvre"
    );
    expect(filtrerNomsPatients("Emilie a de la fièvre", ["Émilie Martin"])).toBe(
      "[patient] a de la fièvre"
    );
  });

  it("ne filtre pas les tokens de moins de 2 caractères", () => {
    expect(filtrerNomsPatients("Le patient a du mal à respirer", ["Anne A Dupont"])).toBe(
      "Le patient a du mal à respirer"
    );
  });

  it("ne remplace pas un mot qui contient seulement le token en sous-chaîne", () => {
    expect(filtrerNomsPatients("Elle mange une banane", ["Ana Petit"])).toBe(
      "Elle mange une banane"
    );
  });

  it("filtre plusieurs patients de la tournée du jour", () => {
    expect(
      filtrerNomsPatients("Dupont va bien mais Martin tousse", ["Jean Dupont", "Léa Martin"])
    ).toBe("[patient] va bien mais [patient] tousse");
  });

  it("renvoie la question inchangée sans patient dans la liste", () => {
    expect(filtrerNomsPatients("Une plaie qui s'infecte", [])).toBe("Une plaie qui s'infecte");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/ely-redaction.test.ts`
Expected: FAIL — `Cannot find module './ely-redaction'`

- [ ] **Step 3: Write the implementation**

```typescript
/**
 * Filtre les noms des patients de la tournée du jour avant tout envoi au
 * LLM. Liste fermée (les patients connus de l'infirmière ce jour-là), pas
 * détection générique de noms propres — plus fiable sur une donnée de
 * santé qu'une reconnaissance de noms ouverte, forcément imparfaite.
 */
function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function filtrerNomsPatients(question: string, nomsPatients: string[]): string {
  const tokens = new Set(
    nomsPatients
      .flatMap((nom) => nom.split(/\s+/))
      .map(normaliser)
      .filter((token) => token.length >= 2)
  );

  if (tokens.size === 0) return question;

  return question.replace(/\p{L}+/gu, (mot) => (tokens.has(normaliser(mot)) ? "[patient]" : mot));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/ely-redaction.test.ts`
Expected: PASS — 7 tests

- [ ] **Step 5: Commit**

```bash
git add lib/ely-redaction.ts lib/ely-redaction.test.ts
git commit -m "feat(ely): filtre les noms des patients du jour avant tout envoi au LLM"
```

---

### Task 2: Types et appel LLM avec validation stricte

**Files:**
- Modify: `lib/types/clinical.ts`
- Create: `lib/data/ely-synthese.ts`
- Test: `lib/data/ely-synthese.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `SituationTerrain` (déjà défini dans `lib/types/clinical.ts` : `{ id, titre, observation, verifications: string[], causesPossibles: string[], conduiteATenir: string[], quandAvisMedical: string, sources: string[], specialite, niveauConfiance, version, published }`)
- Produces:
  - `SyntheseEly` (type, dans `lib/types/clinical.ts`)
  - `ReponseEly` (type, dans `lib/types/clinical.ts`)
  - `synthetiserReponseEly(questionFiltree: string, situations: SituationTerrain[]): Promise<SyntheseEly | null>`

- [ ] **Step 1: Add the types to `lib/types/clinical.ts`**

Ajouter à la fin du fichier `lib/types/clinical.ts` (après le dernier type existant) :

```typescript
export interface SyntheseEly {
  situationComprise: string;
  informationsManquantes: string[];
  controlesRetenus: string[];
  signesAlerteRetenus: string[];
  actionsRetenues: string[];
  fichesUtiliseesIds: string[];
}

export interface ReponseEly {
  situationBrute: SituationTerrain | null;
  situationsSources: SituationTerrain[];
  synthese: SyntheseEly | null;
}
```

- [ ] **Step 2: Write the failing tests**

```typescript
import { afterEach, describe, expect, it, vi } from "vitest";
import { synthetiserReponseEly } from "./ely-synthese";
import type { SituationTerrain } from "@/lib/types/clinical";

function situation(overrides: Partial<SituationTerrain> = {}): SituationTerrain {
  return {
    id: "s1",
    titre: "Plaie qui s'infecte",
    observation: "Rougeur et chaleur locale.",
    verifications: ["Vérifier la fièvre", "Vérifier l'écoulement"],
    causesPossibles: [],
    conduiteATenir: ["Nettoyer la plaie", "Contacter le médecin"],
    quandAvisMedical: "Si fièvre ou extension de la rougeur.",
    sources: [],
    specialite: "Plaies",
    niveauConfiance: "valide",
    version: 1,
    published: true,
    ...overrides,
  };
}

function reponseOutil(input: Record<string, unknown>) {
  return new Response(
    JSON.stringify({ content: [{ type: "tool_use", name: "structurer_reponse", input }] }),
    { status: 200 }
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("synthetiserReponseEly", () => {
  it("ne tente aucun appel réseau sans clé API configurée", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const appelReseau = vi.spyOn(globalThis, "fetch");

    expect(await synthetiserReponseEly("une question", [situation()])).toBeNull();
    expect(appelReseau).not.toHaveBeenCalled();
  });

  it("ne tente aucun appel réseau sans fiche fournie", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "cle-de-test");
    const appelReseau = vi.spyOn(globalThis, "fetch");

    expect(await synthetiserReponseEly("une question", [])).toBeNull();
    expect(appelReseau).not.toHaveBeenCalled();
  });

  it("renvoie la synthèse validée quand le LLM répond correctement", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "cle-de-test");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      reponseOutil({
        situationComprise: "Plaie avec rougeur, sans fièvre déclarée.",
        informationsManquantes: ["Présence de fièvre ?"],
        controlesRetenus: ["Vérifier la fièvre"],
        signesAlerteRetenus: ["Si fièvre ou extension de la rougeur."],
        actionsRetenues: ["Nettoyer la plaie"],
        fichesUtiliseesIds: ["s1"],
      })
    );

    const synthese = await synthetiserReponseEly("une question filtrée", [situation()]);

    expect(synthese).toEqual({
      situationComprise: "Plaie avec rougeur, sans fièvre déclarée.",
      informationsManquantes: ["Présence de fièvre ?"],
      controlesRetenus: ["Vérifier la fièvre"],
      signesAlerteRetenus: ["Si fièvre ou extension de la rougeur."],
      actionsRetenues: ["Nettoyer la plaie"],
      fichesUtiliseesIds: ["s1"],
    });
  });

  it("supprime tout contrôle qui n'existe pas mot pour mot dans les fiches fournies", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "cle-de-test");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      reponseOutil({
        situationComprise: "Résumé.",
        informationsManquantes: [],
        controlesRetenus: ["Vérifier la fièvre", "Contrôle inventé qui n'existe dans aucune fiche"],
        signesAlerteRetenus: [],
        actionsRetenues: ["Nettoyer la plaie"],
        fichesUtiliseesIds: ["s1"],
      })
    );

    const synthese = await synthetiserReponseEly("une question", [situation()]);

    expect(synthese?.controlesRetenus).toEqual(["Vérifier la fièvre"]);
  });

  it("supprime les ids de fiches qui n'ont pas été envoyées au LLM", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "cle-de-test");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      reponseOutil({
        situationComprise: "Résumé.",
        informationsManquantes: [],
        controlesRetenus: ["Vérifier la fièvre"],
        signesAlerteRetenus: [],
        actionsRetenues: [],
        fichesUtiliseesIds: ["s1", "id-jamais-envoye"],
      })
    );

    const synthese = await synthetiserReponseEly("une question", [situation({ id: "s1" })]);

    expect(synthese?.fichesUtiliseesIds).toEqual(["s1"]);
  });

  it("échoue quand les trois champs sourcés sont vides après validation", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "cle-de-test");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      reponseOutil({
        situationComprise: "Résumé.",
        informationsManquantes: ["Manque tout"],
        controlesRetenus: ["Contrôle inventé"],
        signesAlerteRetenus: ["Signe inventé"],
        actionsRetenues: ["Action inventée"],
        fichesUtiliseesIds: ["s1"],
      })
    );

    expect(await synthetiserReponseEly("une question", [situation()])).toBeNull();
  });

  it("échoue sur une réponse HTTP non 2xx", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "cle-de-test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }));

    expect(await synthetiserReponseEly("une question", [situation()])).toBeNull();
  });

  it("échoue quand le réseau est coupé", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "cle-de-test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("fetch failed"));

    expect(await synthetiserReponseEly("une question", [situation()])).toBeNull();
  });

  it("échoue sur une réponse sans bloc tool_use", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "cle-de-test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ content: [{ type: "text", text: "pas du JSON structuré" }] }), {
        status: 200,
      })
    );

    expect(await synthetiserReponseEly("une question", [situation()])).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run lib/data/ely-synthese.test.ts`
Expected: FAIL — `Cannot find module './ely-synthese'`

- [ ] **Step 4: Write the implementation**

```typescript
import type { SituationTerrain, SyntheseEly } from "@/lib/types/clinical";
import { journaliserEchec } from "@/lib/journal";

const URL_ANTHROPIC = "https://api.anthropic.com/v1/messages";
const MODELE = "claude-haiku-4-5-20251001";
const DELAI_MAX_MS = 8000;

const PROMPT_SYSTEME = `Tu assistes une infirmière libérale française pendant sa tournée. Tu reçois
sa question et jusqu'à trois fiches cliniques déjà validées par des
professionnels. Ta tâche : reformuler brièvement sa situation, identifier
les informations qui manquent pour bien y répondre, puis sélectionner —
parmi le contenu exact des fiches fournies, sans le reformuler — les
contrôles, signes d'alerte et actions pertinents pour sa question.

Tu ne dois jamais inventer un contrôle, un signe d'alerte ou une action qui
n'existe pas mot pour mot dans les fiches fournies. Si aucune fiche ne
répond vraiment à la question, dis-le dans "informationsManquantes" plutôt
que de forcer une correspondance.

Tu ne poses pas de diagnostic. Tu n'indiques ni dose ni traitement.
La décision et la responsabilité restent entièrement à l'infirmière.

Réponds uniquement en appelant l'outil structurer_reponse.`;

const OUTIL_STRUCTURATION = {
  name: "structurer_reponse",
  description: "Structure la réponse à la question de l'infirmière à partir des fiches fournies.",
  input_schema: {
    type: "object",
    properties: {
      situationComprise: { type: "string" },
      informationsManquantes: { type: "array", items: { type: "string" } },
      controlesRetenus: { type: "array", items: { type: "string" } },
      signesAlerteRetenus: { type: "array", items: { type: "string" } },
      actionsRetenues: { type: "array", items: { type: "string" } },
      fichesUtiliseesIds: { type: "array", items: { type: "string" } },
    },
    required: [
      "situationComprise",
      "informationsManquantes",
      "controlesRetenus",
      "signesAlerteRetenus",
      "actionsRetenues",
      "fichesUtiliseesIds",
    ],
  },
} as const;

function construireMessageUtilisateur(question: string, situations: SituationTerrain[]): string {
  const fiches = situations.map((s) => ({
    id: s.id,
    titre: s.titre,
    verifications: s.verifications,
    quandAvisMedical: s.quandAvisMedical,
    conduiteATenir: s.conduiteATenir,
  }));
  return `Question de l'infirmière : ${question}\n\nFiches disponibles :\n${JSON.stringify(fiches, null, 2)}`;
}

/** Ne garde que les valeurs qui existent mot pour mot dans la source fournie. */
function garderCorrespondancesExactes(valeurs: unknown, source: string[]): string[] {
  if (!Array.isArray(valeurs)) return [];
  return valeurs.filter((v): v is string => typeof v === "string" && source.includes(v));
}

interface ReponseAnthropicBrute {
  content?: { type: string; input?: Record<string, unknown> }[];
}

/**
 * Interroge le LLM pour structurer la réponse à partir de fiches déjà
 * validées. Ne lève jamais : sans clé, sans fiche, sur timeout, erreur
 * réseau ou réponse invalide, l'appelant reçoit null et se rabat sur le
 * résultat de recherche brut plutôt que de bloquer la réponse à
 * l'infirmière.
 */
export async function synthetiserReponseEly(
  questionFiltree: string,
  situations: SituationTerrain[]
): Promise<SyntheseEly | null> {
  const cle = process.env.ANTHROPIC_API_KEY;
  if (!cle || situations.length === 0) return null;

  try {
    const reponse = await fetch(URL_ANTHROPIC, {
      method: "POST",
      headers: {
        "x-api-key": cle,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODELE,
        max_tokens: 1024,
        system: PROMPT_SYSTEME,
        tools: [OUTIL_STRUCTURATION],
        tool_choice: { type: "tool", name: "structurer_reponse" },
        messages: [{ role: "user", content: construireMessageUtilisateur(questionFiltree, situations) }],
      }),
      signal: AbortSignal.timeout(DELAI_MAX_MS),
    });

    if (!reponse.ok) {
      journaliserEchec("synthetiserReponseEly", new Error(`HTTP ${reponse.status}`));
      return null;
    }

    const donnees = (await reponse.json()) as ReponseAnthropicBrute;
    const blocOutil = donnees.content?.find((bloc) => bloc.type === "tool_use");
    const brut = blocOutil?.input;

    if (!brut || typeof brut.situationComprise !== "string") {
      journaliserEchec("synthetiserReponseEly", new Error("Réponse LLM malformée"));
      return null;
    }

    const idsValides = new Set(situations.map((s) => s.id));
    const controlesSource = situations.flatMap((s) => s.verifications);
    const signesSource = situations.map((s) => s.quandAvisMedical);
    const actionsSource = situations.flatMap((s) => s.conduiteATenir);

    const controlesRetenus = garderCorrespondancesExactes(brut.controlesRetenus, controlesSource);
    const signesAlerteRetenus = garderCorrespondancesExactes(brut.signesAlerteRetenus, signesSource);
    const actionsRetenues = garderCorrespondancesExactes(brut.actionsRetenues, actionsSource);

    if (controlesRetenus.length === 0 && signesAlerteRetenus.length === 0 && actionsRetenues.length === 0) {
      return null;
    }

    const fichesUtiliseesIds = Array.isArray(brut.fichesUtiliseesIds)
      ? brut.fichesUtiliseesIds.filter((id): id is string => typeof id === "string" && idsValides.has(id))
      : [];
    const informationsManquantes = Array.isArray(brut.informationsManquantes)
      ? brut.informationsManquantes.filter((v): v is string => typeof v === "string")
      : [];

    return {
      situationComprise: brut.situationComprise,
      informationsManquantes,
      controlesRetenus,
      signesAlerteRetenus,
      actionsRetenues,
      fichesUtiliseesIds,
    };
  } catch (erreur) {
    journaliserEchec("synthetiserReponseEly", erreur);
    return null;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run lib/data/ely-synthese.test.ts`
Expected: PASS — 9 tests

- [ ] **Step 5b: Verify the file type-checks**

`brut` est typé `Record<string, unknown> | undefined` : le rétrécissement de `brut.situationComprise` en `string` après le contrôle `typeof` dépend de l'analyse de flux de TypeScript sur un accès de propriété, pas une variable simple — à vérifier explicitement plutôt que de supposer que `vitest` (qui transpile sans vérifier les types) l'aurait détecté.

Run: `npx tsc --noEmit`
Expected: aucune erreur

- [ ] **Step 6: Document the environment variable**

Ajouter à `.env.example`, après `NEXT_PUBLIC_AUTH_APPLE=` :

```
# Synthèse IA des réponses d'Ely, à partir de fiches déjà validées.
# Clé : https://console.anthropic.com/settings/keys
# Facultative : sans elle, Ely affiche directement la meilleure fiche
# trouvée par la recherche, comme avant ce chantier.
ANTHROPIC_API_KEY=
```

- [ ] **Step 7: Commit**

```bash
git add lib/types/clinical.ts lib/data/ely-synthese.ts lib/data/ely-synthese.test.ts .env.example
git commit -m "feat(ely): appelle le LLM pour structurer la reponse, validee mot pour mot contre les fiches"
```

---

### Task 3: Orchestration — recherche, garde-fou, filtrage, synthèse

**Files:**
- Create: `lib/data/ely.ts`
- Test: `lib/data/ely.test.ts`

**Interfaces:**
- Consumes:
  - `searchSituationsTerrain(supabase, query): Promise<SituationTerrain[]>` (`lib/data/recherche.ts`)
  - `getTourneeDuJour(supabase, idelId): Promise<Tournee | null>` (`lib/data/ma-journee.ts`)
  - `getMissionsDuJour(supabase, tourneeId): Promise<MissionDuJour[]>` (`lib/data/ma-journee.ts`, chaque élément a `patientNom: string`)
  - `filtrerNomsPatients(question, nomsPatients): string` (Task 1)
  - `synthetiserReponseEly(questionFiltree, situations): Promise<SyntheseEly | null>` (Task 2)
  - `journaliserEchec(contexte, erreur): void` (`lib/journal.ts`)
- Produces: `obtenirReponseEly(supabase: SupabaseClient<Database>, question: string, idelId: string | null): Promise<ReponseEly>`

- [ ] **Step 1: Write the failing tests**

```typescript
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import type { SituationTerrain } from "@/lib/types/clinical";

const searchSituationsTerrainMock = vi.fn();
const getTourneeDuJourMock = vi.fn();
const getMissionsDuJourMock = vi.fn();
const filtrerNomsPatientsMock = vi.fn();
const synthetiserReponseElyMock = vi.fn();

vi.mock("@/lib/data/recherche", () => ({
  searchSituationsTerrain: (...args: unknown[]) => searchSituationsTerrainMock(...args),
}));
vi.mock("@/lib/data/ma-journee", () => ({
  getTourneeDuJour: (...args: unknown[]) => getTourneeDuJourMock(...args),
  getMissionsDuJour: (...args: unknown[]) => getMissionsDuJourMock(...args),
}));
vi.mock("@/lib/ely-redaction", () => ({
  filtrerNomsPatients: (...args: unknown[]) => filtrerNomsPatientsMock(...args),
}));
vi.mock("@/lib/data/ely-synthese", () => ({
  synthetiserReponseEly: (...args: unknown[]) => synthetiserReponseElyMock(...args),
}));

const supabase = {} as SupabaseClient<Database>;

function situation(overrides: Partial<SituationTerrain> = {}): SituationTerrain {
  return {
    id: "s1",
    titre: "Hypoglycémie",
    observation: "obs",
    verifications: [],
    causesPossibles: [],
    conduiteATenir: [],
    quandAvisMedical: "avis",
    sources: [],
    specialite: "Diabétologie",
    niveauConfiance: "valide",
    version: 1,
    published: true,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  searchSituationsTerrainMock.mockReset();
  getTourneeDuJourMock.mockReset();
  getMissionsDuJourMock.mockReset();
  filtrerNomsPatientsMock.mockReset();
  synthetiserReponseElyMock.mockReset();
});

describe("obtenirReponseEly", () => {
  it("ne tente rien de plus sans résultat de recherche", async () => {
    const { obtenirReponseEly } = await import("./ely");
    searchSituationsTerrainMock.mockResolvedValue([]);

    const reponse = await obtenirReponseEly(supabase, "question", "idel-1");

    expect(reponse).toEqual({ situationBrute: null, situationsSources: [], synthese: null });
    expect(getTourneeDuJourMock).not.toHaveBeenCalled();
    expect(synthetiserReponseElyMock).not.toHaveBeenCalled();
  });

  it("ne synthétise pas sans infirmière identifiée", async () => {
    const { obtenirReponseEly } = await import("./ely");
    const s1 = situation();
    searchSituationsTerrainMock.mockResolvedValue([s1]);

    const reponse = await obtenirReponseEly(supabase, "question", null);

    expect(reponse).toEqual({ situationBrute: s1, situationsSources: [], synthese: null });
    expect(getTourneeDuJourMock).not.toHaveBeenCalled();
  });

  it("ne synthétise pas sans tournée du jour", async () => {
    const { obtenirReponseEly } = await import("./ely");
    const s1 = situation();
    searchSituationsTerrainMock.mockResolvedValue([s1]);
    getTourneeDuJourMock.mockResolvedValue(null);

    const reponse = await obtenirReponseEly(supabase, "question", "idel-1");

    expect(reponse).toEqual({ situationBrute: s1, situationsSources: [], synthese: null });
    expect(synthetiserReponseElyMock).not.toHaveBeenCalled();
  });

  it("se rabat sans appeler le LLM quand la récupération des missions échoue", async () => {
    const { obtenirReponseEly } = await import("./ely");
    const s1 = situation();
    searchSituationsTerrainMock.mockResolvedValue([s1]);
    getTourneeDuJourMock.mockResolvedValue({ id: "tournee-1" });
    getMissionsDuJourMock.mockRejectedValue(new Error("panne"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const reponse = await obtenirReponseEly(supabase, "question", "idel-1");

    expect(reponse).toEqual({ situationBrute: s1, situationsSources: [], synthese: null });
    expect(synthetiserReponseElyMock).not.toHaveBeenCalled();
  });

  it("filtre la question et synthétise avec les 3 meilleurs résultats au plus", async () => {
    const { obtenirReponseEly } = await import("./ely");
    const s1 = situation({ id: "s1" });
    const s2 = situation({ id: "s2" });
    const s3 = situation({ id: "s3" });
    const s4 = situation({ id: "s4" });
    searchSituationsTerrainMock.mockResolvedValue([s1, s2, s3, s4]);
    getTourneeDuJourMock.mockResolvedValue({ id: "tournee-1" });
    getMissionsDuJourMock.mockResolvedValue([{ patientNom: "Jean Dupont" }]);
    filtrerNomsPatientsMock.mockReturnValue("question filtrée");
    const synthese = {
      situationComprise: "...",
      informationsManquantes: [],
      controlesRetenus: ["c1"],
      signesAlerteRetenus: [],
      actionsRetenues: [],
      fichesUtiliseesIds: ["s1"],
    };
    synthetiserReponseElyMock.mockResolvedValue(synthese);

    const reponse = await obtenirReponseEly(supabase, "question", "idel-1");

    expect(filtrerNomsPatientsMock).toHaveBeenCalledWith("question", ["Jean Dupont"]);
    expect(synthetiserReponseElyMock).toHaveBeenCalledWith("question filtrée", [s1, s2, s3]);
    expect(reponse).toEqual({ situationBrute: s1, situationsSources: [s1, s2, s3], synthese });
  });

  it("garde situationsSources vide quand la synthèse échoue malgré un filtrage réussi", async () => {
    const { obtenirReponseEly } = await import("./ely");
    const s1 = situation();
    searchSituationsTerrainMock.mockResolvedValue([s1]);
    getTourneeDuJourMock.mockResolvedValue({ id: "tournee-1" });
    getMissionsDuJourMock.mockResolvedValue([]);
    filtrerNomsPatientsMock.mockReturnValue("question");
    synthetiserReponseElyMock.mockResolvedValue(null);

    const reponse = await obtenirReponseEly(supabase, "question", "idel-1");

    expect(reponse).toEqual({ situationBrute: s1, situationsSources: [], synthese: null });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/data/ely.test.ts`
Expected: FAIL — `Cannot find module './ely'`

- [ ] **Step 3: Write the implementation**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import type { ReponseEly } from "@/lib/types/clinical";
import { searchSituationsTerrain } from "@/lib/data/recherche";
import { getTourneeDuJour, getMissionsDuJour } from "@/lib/data/ma-journee";
import { filtrerNomsPatients } from "@/lib/ely-redaction";
import { synthetiserReponseEly } from "@/lib/data/ely-synthese";
import { journaliserEchec } from "@/lib/journal";

/**
 * Réponse d'Ely à une question : la fiche brute la mieux classée (repli
 * garanti), et une synthèse LLM quand elle a pu être produite en toute
 * sécurité. Le garde-fou est dans le try/catch : toute panne pendant la
 * détermination de la liste des patients du jour (pas de tournée, erreur
 * de lecture) empêche l'appel au LLM plutôt que de l'appeler sans filtrage.
 */
export async function obtenirReponseEly(
  supabase: SupabaseClient<Database>,
  question: string,
  idelId: string | null
): Promise<ReponseEly> {
  const resultats = await searchSituationsTerrain(supabase, question);
  const situationBrute = resultats[0] ?? null;

  if (resultats.length === 0 || !idelId) {
    return { situationBrute, situationsSources: [], synthese: null };
  }

  try {
    const tournee = await getTourneeDuJour(supabase, idelId);
    if (!tournee) return { situationBrute, situationsSources: [], synthese: null };

    const missions = await getMissionsDuJour(supabase, tournee.id);
    const questionFiltree = filtrerNomsPatients(
      question,
      missions.map((m) => m.patientNom)
    );
    const situationsSources = resultats.slice(0, 3);
    const synthese = await synthetiserReponseEly(questionFiltree, situationsSources);

    return { situationBrute, situationsSources: synthese ? situationsSources : [], synthese };
  } catch (erreur) {
    journaliserEchec("obtenirReponseEly", erreur);
    return { situationBrute, situationsSources: [], synthese: null };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/data/ely.test.ts`
Expected: PASS — 6 tests

- [ ] **Step 5: Commit**

```bash
git add lib/data/ely.ts lib/data/ely.test.ts
git commit -m "feat(ely): orchestre recherche, garde-fou et synthese avec repli garanti"
```

---

### Task 4: Badge « Synthèse IA »

**Files:**
- Create: `components/ui/BadgeSyntheseIA.tsx`
- Test: `components/ui/BadgeSyntheseIA.test.tsx`

**Interfaces:**
- Produces: `BadgeSyntheseIA(): JSX.Element` (aucune prop)

- [ ] **Step 1: Write the failing test**

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BadgeSyntheseIA } from "./BadgeSyntheseIA";

describe("BadgeSyntheseIA", () => {
  it("affiche le texte Synthèse IA", () => {
    render(<BadgeSyntheseIA />);
    expect(screen.getByText("Synthèse IA")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/ui/BadgeSyntheseIA.test.tsx`
Expected: FAIL — `Cannot find module './BadgeSyntheseIA'`

- [ ] **Step 3: Write the implementation**

```typescript
// Distinct de BadgeNiveauConfiance : une synthèse est un texte nouveau,
// jamais relu par un humain, même quand elle s'appuie sur des fiches
// validées — ne pas laisser croire qu'elle a le même statut qu'une fiche.
export function BadgeSyntheseIA() {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] px-2.5 py-1 text-[11.5px] font-semibold"
      style={{ color: "#7C3AED", background: "rgba(124,58,237,.12)" }}
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#7C3AED"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
      </svg>
      Synthèse IA
    </span>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/ui/BadgeSyntheseIA.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/ui/BadgeSyntheseIA.tsx components/ui/BadgeSyntheseIA.test.tsx
git commit -m "feat(ely): ajoute le badge Synthese IA, distinct du niveau de confiance"
```

---

### Task 5: Branchement complet — action, page, interface de conversation

**Files:**
- Modify: `lib/data/ely-actions.ts`
- Modify: `app/(app)/ely/page.tsx`
- Modify: `components/ui/ConversationEly.tsx`
- Modify: `components/ui/ConversationEly.test.tsx`

**Interfaces:**
- Consumes:
  - `obtenirReponseEly(supabase, question, idelId): Promise<ReponseEly>` (Task 3)
  - `BadgeSyntheseIA(): JSX.Element` (Task 4)
  - `getUtilisateurConnecte(): Promise<User | null>` et `createClient()` (`lib/supabase/server.ts`, déjà utilisés ailleurs, ex. `app/(app)/ma-journee/page.tsx`)
  - `ReponseEly`, `SyntheseEly`, `SituationTerrain` (`lib/types/clinical.ts`)

Ces trois fichiers doivent changer ensemble : `ConversationEly` change de forme de props (`situationInitiale` → `reponseInitiale`), donc l'action et la page qui l'alimentent doivent changer dans le même commit pour que le projet compile.

- [ ] **Step 1: Rewrite `lib/data/ely-actions.ts`**

```typescript
"use server";

import { createClient, getUtilisateurConnecte } from "@/lib/supabase/server";
import { obtenirReponseEly } from "@/lib/data/ely";
import type { ReponseEly } from "@/lib/types/clinical";

export async function poserQuestionElyAction(question: string): Promise<ReponseEly> {
  const supabase = await createClient();
  const user = await getUtilisateurConnecte();
  return obtenirReponseEly(supabase, question, user?.id ?? null);
}
```

- [ ] **Step 2: Rewrite `app/(app)/ely/page.tsx`**

```typescript
import { createClient, getUtilisateurConnecte } from "@/lib/supabase/server";
import { obtenirReponseEly } from "@/lib/data/ely";
import { ConversationEly } from "@/components/ui/ConversationEly";
import { PersistanceRecherche } from "@/components/ui/PersistanceRecherche";

export default async function ElyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; patient?: string; soin?: string }>;
}) {
  const { q, patient, soin } = await searchParams;
  const query = q ?? "";

  const supabase = await createClient();
  const user = await getUtilisateurConnecte();
  const reponseInitiale = query.trim()
    ? await obtenirReponseEly(supabase, query, user?.id ?? null)
    : { situationBrute: null, situationsSources: [], synthese: null };

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      {!patient && <PersistanceRecherche cle="ely_derniere_requete" requeteActuelle={query} />}
      <div className="mx-auto flex max-w-2xl flex-col px-6 py-6 sm:py-8">
        <ConversationEly
          requeteInitiale={query}
          reponseInitiale={reponseInitiale}
          patientContexte={patient ?? null}
          soinContexte={soin ?? null}
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Rewrite `components/ui/ConversationEly.tsx`**

```typescript
"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { ReponseEly } from "@/lib/types/clinical";
import { poserQuestionElyAction } from "@/lib/data/ely-actions";
import { IconeMicro } from "@/components/ui/IconeMicro";
import { BadgeNiveauConfiance } from "@/components/ui/BadgeNiveauConfiance";
import { BadgeSyntheseIA } from "@/components/ui/BadgeSyntheseIA";
import { LectureVocaleReponse } from "@/components/ui/LectureVocaleReponse";
import {
  creerReconnaissanceVocale,
  lireSupportVocalClient,
  lireSupportVocalServeur,
  souscrireSupportVocal,
} from "@/lib/reconnaissance-vocale";
import { acquerirMicrophoneForce, relacherMicrophone } from "@/lib/verrou-microphone";
import { couperLecture } from "@/lib/synthese-vocale";

const SUGGESTIONS = [
  "Une plaie qui s'infecte",
  "Mon patient a chuté",
  "Douleur thoracique",
  "Signes d'hypoglycémie",
];

const MESSAGE_AUCUN_RESULTAT = "Je n'ai pas trouvé de réponse à cette question. Essayez de la reformuler.";

function texteAVoixHaute(reponse: ReponseEly): string {
  if (reponse.synthese) {
    return [reponse.synthese.situationComprise, ...reponse.synthese.actionsRetenues].join(". ");
  }
  if (reponse.situationBrute) {
    return [
      reponse.situationBrute.titre,
      reponse.situationBrute.observation,
      ...reponse.situationBrute.conduiteATenir.slice(0, 3),
    ].join(". ");
  }
  return MESSAGE_AUCUN_RESULTAT;
}

interface MessageUtilisateur {
  id: number;
  role: "utilisateur";
  texte: string;
}
interface MessageEly {
  id: number;
  role: "ely";
  reponse: ReponseEly;
}
type Message = MessageUtilisateur | MessageEly;

interface ConversationElyProps {
  requeteInitiale: string;
  reponseInitiale: ReponseEly;
  patientContexte?: string | null;
  soinContexte?: string | null;
}

export function ConversationEly({
  requeteInitiale,
  reponseInitiale,
  patientContexte,
  soinContexte,
}: ConversationElyProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [brouillon, setBrouillon] = useState("");
  const [enChargement, setEnChargement] = useState(false);
  const [ecoute, setEcoute] = useState(false);
  const [derniereReponseId, setDerniereReponseId] = useState<number | null>(null);
  const compteurId = useRef(0);
  const requeteTraitee = useRef<string | null>(null);
  const ancreScroll = useRef<HTMLDivElement>(null);

  const supporteVocal = useSyncExternalStore(souscrireSupportVocal, lireSupportVocalClient, lireSupportVocalServeur);

  function idSuivant() {
    compteurId.current += 1;
    return compteurId.current;
  }

  useEffect(() => {
    if (!requeteInitiale || requeteTraitee.current === requeteInitiale) return;
    requeteTraitee.current = requeteInitiale;
    const idUser = idSuivant();
    const idEly = idSuivant();
    setMessages((m) => [
      ...m,
      { id: idUser, role: "utilisateur", texte: requeteInitiale },
      { id: idEly, role: "ely", reponse: reponseInitiale },
    ]);
    setDerniereReponseId(idEly);
  }, [requeteInitiale, reponseInitiale]);

  useEffect(() => {
    ancreScroll.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, enChargement]);

  async function envoyerQuestion(texte: string) {
    const q = texte.trim();
    if (!q || enChargement) return;
    setMessages((m) => [...m, { id: idSuivant(), role: "utilisateur", texte: q }]);
    setBrouillon("");
    setEnChargement(true);
    const reponse = await poserQuestionElyAction(q);
    const idEly = idSuivant();
    setMessages((m) => [...m, { id: idEly, role: "ely", reponse }]);
    setEnChargement(false);
    setDerniereReponseId(idEly);
  }

  function nouvelleConversation() {
    couperLecture();
    setMessages([]);
    setBrouillon("");
    setDerniereReponseId(null);
    requeteTraitee.current = null;
    window.localStorage.removeItem("ely_derniere_requete");
    router.replace("/ely");
  }

  function demarrerEcoute() {
    const recognition = creerReconnaissanceVocale();
    if (!recognition) return;

    acquerirMicrophoneForce("dictee", () => recognition.stop());

    recognition.onstart = () => setEcoute(true);
    recognition.onend = () => {
      relacherMicrophone("dictee");
      setEcoute(false);
    };
    recognition.onerror = () => {
      relacherMicrophone("dictee");
      setEcoute(false);
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) envoyerQuestion(transcript);
    };

    recognition.start();
  }

  const aDesMessages = messages.length > 0 || enChargement;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-navy/10 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-brand-violet/70">
            <Image
              src="/marketing/ely-nouveau-portrait.webp"
              alt=""
              width={379}
              height={231}
              className="h-[38px] w-[38px] rounded-full object-cover"
            />
          </span>
          <div>
            <p className="font-display text-[17px] font-bold leading-none tracking-tight text-navy">ELY</p>
            <p className="mt-1 flex items-center gap-1.5 text-[12px] text-navy/45">
              <span aria-hidden="true" className="h-[6px] w-[6px] rounded-full bg-[#1a7f37]" />
              Assistant de tournée
            </p>
          </div>
        </div>
        {aDesMessages && (
          <button
            type="button"
            onClick={nouvelleConversation}
            aria-label="Nouvelle conversation"
            className="btn-glace-clair flex h-[38px] w-[38px] items-center justify-center rounded-[12px] border border-navy/10 bg-white text-brand-violet"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[19px] w-[19px]">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 3v5h5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-navy/40">
        Ely vous aide à analyser la situation ; la décision et la responsabilité restent à vous.
      </p>

      {patientContexte && (
        <p className="mt-3 text-[13px] font-semibold text-navy/55">
          Pour {patientContexte}
          {soinContexte ? ` · ${soinContexte}` : ""}
        </p>
      )}

      <div className="py-6">
        {!aDesMessages ? (
          <div className="flex flex-col items-center px-4 pt-6 text-center">
            <span className="relative flex h-[160px] w-[160px] items-center justify-center">
              <span
                aria-hidden="true"
                className="ely-glow absolute h-[110px] w-[110px] rounded-full bg-gradient-to-br from-brand-violet/40 to-brand-rose/40 blur-xl"
              />
              <span className="relative">
                <Image
                  src="/marketing/ely-nouveau-portrait.webp"
                  alt=""
                  width={379}
                  height={231}
                  className="h-[150px] w-auto object-contain drop-shadow-[0_18px_28px_rgba(124,58,237,0.32)]"
                />
              </span>
            </span>
            <h1 className="mt-5 font-display text-[24px] font-bold tracking-tight text-navy">Bonjour, je suis ELY</h1>
            <p className="mt-2 max-w-[280px] text-[15px] leading-relaxed text-navy/55">
              Votre assistant de tournée. Posez-moi une question de terrain, je vous guide sur la conduite à tenir.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => envoyerQuestion(label)}
                  className="btn-glace-clair rounded-[12px] border border-navy/10 bg-white px-4 py-2.5 text-[13.5px] font-semibold text-navy shadow-[0_1px_2px_rgba(15,23,42,.04)]"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message) =>
              message.role === "utilisateur" ? (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[80%] rounded-[18px] rounded-br-[5px] bg-gradient-to-r from-brand-violet to-brand-rose px-4 py-3 text-[15px] text-white shadow-[0_6px_16px_rgba(124,58,237,0.24)]">
                    {message.texte}
                  </div>
                </div>
              ) : (
                <div key={message.id} className="flex items-end gap-2.5">
                  <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-brand-violet/70">
                    <Image
                      src="/marketing/ely-nouveau-portrait.webp"
                      alt=""
                      width={379}
                      height={231}
                      className="h-[26px] w-[26px] rounded-full object-cover"
                    />
                  </span>
                  <div className="max-w-[80%] rounded-[18px] rounded-bl-[5px] border border-navy/[0.06] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,.04)]">
                    {message.reponse.synthese ? (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <BadgeSyntheseIA />
                        </div>
                        <p className="mt-1.5 text-[15px] leading-relaxed text-navy/85">
                          {message.reponse.synthese.situationComprise}
                        </p>
                        {message.reponse.synthese.informationsManquantes.length > 0 && (
                          <div className="mt-2.5">
                            <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-navy/45">
                              À préciser
                            </p>
                            <ul className="mt-1 flex flex-col gap-1">
                              {message.reponse.synthese.informationsManquantes.map((info) => (
                                <li key={info} className="text-[14px] leading-relaxed text-navy/75">
                                  {info}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {message.reponse.synthese.controlesRetenus.length > 0 && (
                          <div className="mt-2.5">
                            <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-navy/45">
                              Contrôles
                            </p>
                            <ul className="mt-1 flex flex-col gap-1.5">
                              {message.reponse.synthese.controlesRetenus.map((item) => (
                                <li key={item} className="flex items-start gap-2 text-[14px] leading-relaxed text-navy/75">
                                  <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-violet/50" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {message.reponse.synthese.actionsRetenues.length > 0 && (
                          <div className="mt-2.5">
                            <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-navy/45">
                              Actions
                            </p>
                            <ul className="mt-1 flex flex-col gap-1.5">
                              {message.reponse.synthese.actionsRetenues.map((item) => (
                                <li key={item} className="flex items-start gap-2 text-[14px] leading-relaxed text-navy/75">
                                  <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-violet/50" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {message.reponse.synthese.signesAlerteRetenus.length > 0 && (
                          <div className="mt-2.5">
                            <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-navy/45">
                              Signes d&apos;alerte
                            </p>
                            <ul className="mt-1 flex flex-col gap-1.5">
                              {message.reponse.synthese.signesAlerteRetenus.map((item) => (
                                <li key={item} className="text-[14px] leading-relaxed text-danger">
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {message.reponse.situationsSources
                          .filter((s) => message.reponse.synthese!.fichesUtiliseesIds.includes(s.id))
                          .length > 0 && (
                          <div className="mt-3 flex flex-col gap-1.5 border-t border-navy/[0.06] pt-2.5">
                            {message.reponse.situationsSources
                              .filter((s) => message.reponse.synthese!.fichesUtiliseesIds.includes(s.id))
                              .map((source) => (
                                <div key={source.id} className="flex items-center justify-between gap-2">
                                  <Link
                                    href={`/situations/${source.id}`}
                                    className="text-[13px] font-semibold text-brand-violet"
                                  >
                                    {source.titre}
                                  </Link>
                                  <BadgeNiveauConfiance niveau={source.niveauConfiance} />
                                </div>
                              ))}
                          </div>
                        )}
                        {message.id === derniereReponseId && (
                          <div className="mt-2.5">
                            <LectureVocaleReponse key={message.id} texte={texteAVoixHaute(message.reponse)} />
                          </div>
                        )}
                      </>
                    ) : message.reponse.situationBrute ? (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <BadgeNiveauConfiance niveau={message.reponse.situationBrute.niveauConfiance} />
                        </div>
                        <p className="mt-1.5 text-[14.5px] font-bold tracking-tight text-brand-violet">
                          {message.reponse.situationBrute.titre}
                        </p>
                        <p className="mt-1.5 text-[15px] leading-relaxed text-navy/85">
                          {message.reponse.situationBrute.observation}
                        </p>
                        {message.reponse.situationBrute.conduiteATenir.length > 0 && (
                          <ul className="mt-2.5 flex flex-col gap-1.5">
                            {message.reponse.situationBrute.conduiteATenir.slice(0, 3).map((etape) => (
                              <li key={etape} className="flex items-start gap-2 text-[14px] leading-relaxed text-navy/75">
                                <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-violet/50" />
                                {etape}
                              </li>
                            ))}
                          </ul>
                        )}
                        <Link
                          href={`/situations/${message.reponse.situationBrute.id}`}
                          className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-violet"
                        >
                          Voir la fiche complète
                          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5">
                            <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </Link>
                        {message.id === derniereReponseId && (
                          <div className="mt-2.5">
                            <LectureVocaleReponse key={message.id} texte={texteAVoixHaute(message.reponse)} />
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-[15px] leading-relaxed text-navy/85">{MESSAGE_AUCUN_RESULTAT}</p>
                        {message.id === derniereReponseId && (
                          <div className="mt-2.5">
                            <LectureVocaleReponse key={message.id} texte={MESSAGE_AUCUN_RESULTAT} />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            )}
            {enChargement && (
              <div className="flex items-end gap-2.5">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-brand-violet/70">
                  <Image
                    src="/marketing/ely-nouveau-portrait.webp"
                    alt=""
                    width={379}
                    height={231}
                    className="h-[26px] w-[26px] rounded-full object-cover"
                  />
                </span>
                <div className="flex gap-1.5 rounded-[18px] rounded-bl-[5px] border border-navy/[0.06] bg-white px-4 py-3.5">
                  <span className="h-[7px] w-[7px] animate-bounce rounded-full bg-brand-violet" />
                  <span className="h-[7px] w-[7px] animate-bounce rounded-full bg-brand-violet [animation-delay:0.15s]" />
                  <span className="h-[7px] w-[7px] animate-bounce rounded-full bg-brand-violet [animation-delay:0.3s]" />
                </div>
              </div>
            )}
            <div ref={ancreScroll} />
          </div>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          envoyerQuestion(brouillon);
        }}
        className="mt-2 flex items-center gap-2.5"
      >
        <div className="flex min-h-[48px] flex-1 items-center gap-2 rounded-[12px] border border-navy/10 bg-white pl-4 pr-1.5">
          <input
            type="text"
            value={brouillon}
            onChange={(event) => setBrouillon(event.target.value)}
            placeholder="Ex. : une plaie qui s'infecte, que faire ?"
            aria-label="Poser une question à Ely"
            className="min-w-0 flex-1 border-0 bg-transparent py-2 text-[15px] text-navy outline-none placeholder:text-navy/40"
          />
          {supporteVocal && (
            <button
              type="button"
              onClick={demarrerEcoute}
              aria-label="Dicter la question au micro"
              aria-pressed={ecoute}
              className={`baguette flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-base ${
                ecoute ? "bg-danger/15 text-danger" : "bg-brand-violet/10 text-brand-violet"
              }`}
            >
              <IconeMicro />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={!brouillon.trim() || enChargement}
          className="btn-glace shrink-0 rounded-[12px] bg-gradient-to-r from-brand-violet to-brand-rose px-5 py-3 text-[15px] font-semibold text-white shadow-[0_6px_16px_rgba(124,58,237,0.28)] disabled:opacity-40 disabled:saturate-50"
        >
          Demander
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Rewrite `components/ui/ConversationEly.test.tsx`**

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReponseEly, SituationTerrain, SyntheseEly } from "@/lib/types/clinical";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

function situation(overrides: Partial<SituationTerrain> = {}): SituationTerrain {
  return {
    id: "s1",
    titre: "Hypoglycémie",
    observation: "Le patient présente des sueurs et des tremblements.",
    verifications: [],
    causesPossibles: [],
    conduiteATenir: ["Resucrage immédiat"],
    quandAvisMedical: "Si pas d'amélioration en 15 minutes.",
    sources: [],
    specialite: "Diabétologie",
    niveauConfiance: "valide",
    version: 1,
    published: true,
    ...overrides,
  };
}

function synthese(overrides: Partial<SyntheseEly> = {}): SyntheseEly {
  return {
    situationComprise: "Le patient présente des signes d'hypoglycémie.",
    informationsManquantes: [],
    controlesRetenus: [],
    signesAlerteRetenus: [],
    actionsRetenues: ["Resucrage immédiat"],
    fichesUtiliseesIds: ["s1"],
    ...overrides,
  };
}

function reponseBrute(situationBrute: SituationTerrain | null): ReponseEly {
  return { situationBrute, situationsSources: [], synthese: null };
}

function reponseSynthetisee(overrides: Partial<SyntheseEly> = {}): ReponseEly {
  return {
    situationBrute: situation(),
    situationsSources: [situation()],
    synthese: synthese(overrides),
  };
}

describe("ConversationEly — repli sur la fiche brute", () => {
  it("affiche le badge Brouillon pour une situation non relue", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(
      <ConversationEly
        requeteInitiale="arrêt cardio-respiratoire"
        reponseInitiale={reponseBrute(situation({ niveauConfiance: "brouillon" }))}
      />
    );

    expect(screen.getByText("Brouillon")).toBeInTheDocument();
  });

  it("affiche le badge Validé pour une situation relue et validée", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(
      <ConversationEly
        requeteInitiale="hypoglycémie"
        reponseInitiale={reponseBrute(situation({ niveauConfiance: "valide" }))}
      />
    );

    expect(screen.getByText("Validé")).toBeInTheDocument();
  });

  it("n'affiche aucun badge quand aucune situation n'est trouvée", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(<ConversationEly requeteInitiale="question sans réponse" reponseInitiale={reponseBrute(null)} />);

    expect(screen.queryByText("Brouillon")).not.toBeInTheDocument();
    expect(screen.queryByText("Relu")).not.toBeInTheDocument();
    expect(screen.queryByText("Validé")).not.toBeInTheDocument();
  });
});

describe("ConversationEly — synthèse IA", () => {
  it("affiche le badge Synthèse IA et le contenu structuré", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(
      <ConversationEly
        requeteInitiale="que faire en cas d'hypoglycémie"
        reponseInitiale={reponseSynthetisee({
          controlesRetenus: ["Vérifier la glycémie"],
          signesAlerteRetenus: ["Si pas d'amélioration en 15 minutes."],
        })}
      />
    );

    expect(screen.getByText("Synthèse IA")).toBeInTheDocument();
    expect(screen.getByText("Le patient présente des signes d'hypoglycémie.")).toBeInTheDocument();
    expect(screen.getByText("Vérifier la glycémie")).toBeInTheDocument();
    expect(screen.getByText("Resucrage immédiat")).toBeInTheDocument();
    expect(screen.getByText("Si pas d'amélioration en 15 minutes.")).toBeInTheDocument();
  });

  it("liste les fiches sources citées, avec leur propre niveau de confiance", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(
      <ConversationEly
        requeteInitiale="que faire en cas d'hypoglycémie"
        reponseInitiale={reponseSynthetisee()}
      />
    );

    expect(screen.getByText("Hypoglycémie")).toBeInTheDocument();
    expect(screen.getByText("Validé")).toBeInTheDocument();
  });

  it("n'affiche pas le badge Synthèse IA en l'absence de synthèse", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(
      <ConversationEly requeteInitiale="hypoglycémie" reponseInitiale={reponseBrute(situation())} />
    );

    expect(screen.queryByText("Synthèse IA")).not.toBeInTheDocument();
  });
});

describe("ConversationEly — rappel de limite", () => {
  it("affiche le rappel de limite dès le départ, sans message", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(<ConversationEly requeteInitiale="" reponseInitiale={reponseBrute(null)} />);

    expect(
      screen.getByText("Ely vous aide à analyser la situation ; la décision et la responsabilité restent à vous.")
    ).toBeInTheDocument();
  });
});

describe("ConversationEly — contexte de mission", () => {
  it("affiche le patient et le soin quand les deux sont fournis", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(
      <ConversationEly
        requeteInitiale=""
        reponseInitiale={reponseBrute(null)}
        patientContexte="Marie Dupont"
        soinContexte="Pansement"
      />
    );

    expect(screen.getByText("Pour Marie Dupont · Pansement")).toBeInTheDocument();
  });

  it("affiche le patient seul sans point médian quand soinContexte est absent", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(
      <ConversationEly requeteInitiale="" reponseInitiale={reponseBrute(null)} patientContexte="Marie Dupont" />
    );

    expect(screen.getByText("Pour Marie Dupont")).toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });

  it("n'affiche aucun rappel de patient quand patientContexte est absent (comportement par défaut)", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(<ConversationEly requeteInitiale="" reponseInitiale={reponseBrute(null)} />);

    expect(screen.queryByText(/^Pour /)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run all tests to verify they pass**

Run: `npx vitest run components/ui/ConversationEly.test.tsx lib/data/ely-actions.test.ts`
Expected: PASS. (`lib/data/ely-actions.ts` n'a pas de test dédié — sa logique est une simple délégation déjà couverte par les tests de `lib/data/ely.ts` (Task 3) ; c'est le comportement observable via `ConversationEly` qui est vérifié ici.)

- [ ] **Step 6: Run the full test suite and the build**

Run: `npx vitest run`
Expected: PASS — tous les tests, y compris ceux des tâches précédentes.

Run: `npx next build`
Expected: build réussi — confirme qu'aucun fichier consommateur de l'ancienne forme de props n'a été oublié.

- [ ] **Step 7: Commit**

```bash
git add lib/data/ely-actions.ts "app/(app)/ely/page.tsx" components/ui/ConversationEly.tsx components/ui/ConversationEly.test.tsx
git commit -m "feat(ely): branche la synthese IA sur l'action, la page et la conversation"
```

---

## Exécution

Après la Task 5, exécuter la suite complète (`npx vitest run`) une dernière fois avant la revue finale de branche.
