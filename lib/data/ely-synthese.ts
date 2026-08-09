import type { SituationTerrain, SyntheseEly } from "@/lib/types/clinical";
import { journaliserEchec } from "@/lib/journal";

const URL_ANTHROPIC = "https://api.anthropic.com/v1/messages";
const MODELE = "claude-haiku-4-5-20251001";
const DELAI_MAX_MS = 8000;

const PROMPT_SYSTEME = `Tu es Ely, l'assistante de tournée d'une infirmière libérale française.
Tu reçois sa question et jusqu'à trois fiches cliniques déjà validées par
des professionnels. Ta tâche : reformuler brièvement sa situation,
identifier les informations qui manquent pour bien y répondre, puis
sélectionner — parmi le contenu exact des fiches fournies, sans le
reformuler — les contrôles, signes d'alerte et actions pertinents pour sa
question.

Tu es chaleureuse et rassurante, jamais un système froid : tutoie-la. Ce
ton ne s'exprime que dans "situationComprise" et "informationsManquantes"
— les deux seuls champs que tu rédiges toi-même. Reste concise, une ou
deux phrases.

Tu ne dois jamais inventer un contrôle, un signe d'alerte ou une action qui
n'existe pas mot pour mot dans les fiches fournies. Si aucune fiche ne
répond vraiment à la question, dis-le dans "informationsManquantes" plutôt
que de forcer une correspondance.

Tu ne poses pas de diagnostic. Tu n'indiques ni dose ni traitement.
La décision et la responsabilité restent entièrement à l'infirmière — à
toi de l'accompagner, pas de décider pour elle.

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
    },
    required: [
      "situationComprise",
      "informationsManquantes",
      "controlesRetenus",
      "signesAlerteRetenus",
      "actionsRetenues",
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

    const controlesSource = situations.flatMap((s) => s.verifications);
    const signesSource = situations.map((s) => s.quandAvisMedical);
    const actionsSource = situations.flatMap((s) => s.conduiteATenir);

    const controlesRetenus = garderCorrespondancesExactes(brut.controlesRetenus, controlesSource);
    const signesAlerteRetenus = garderCorrespondancesExactes(brut.signesAlerteRetenus, signesSource);
    const actionsRetenues = garderCorrespondancesExactes(brut.actionsRetenues, actionsSource);

    if (controlesRetenus.length === 0 && signesAlerteRetenus.length === 0 && actionsRetenues.length === 0) {
      return null;
    }

    // fichesUtiliseesIds est déduit ici, pas déclaré par le LLM : une fiche
    // n'est "utilisée" — et n'affiche son badge de confiance — que si un de
    // ses éléments a réellement été retenu ci-dessus, mot pour mot. Faire
    // confiance à un id renvoyé par le LLM permettrait d'attribuer à une
    // fiche "validé" un contenu en réalité tiré d'une fiche "brouillon".
    const fichesUtiliseesIds = situations
      .filter(
        (s) =>
          s.verifications.some((v) => controlesRetenus.includes(v)) ||
          signesAlerteRetenus.includes(s.quandAvisMedical) ||
          s.conduiteATenir.some((a) => actionsRetenues.includes(a))
      )
      .map((s) => s.id);
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
