# Ely — synthèse IA de la réponse — Design

> **Pour les exécutants agentiques :** ce document est une spec. L'implémentation passe par superpowers:writing-plans puis superpowers:subagent-driven-development.

## Contexte

Ely est aujourd'hui un moteur de recherche, pas un agent : `poserQuestionElyAction` (`lib/data/ely-actions.ts`) appelle `searchSituationsTerrain` (RPC Postgres `search_situations_terrain` sur la table `situations_terrain`, contenu clinique pré-rédigé et validé par un humain) et renvoie uniquement `resultats[0]`. Aucun appel LLM n'existe dans le code — contrainte explicite posée dans `docs/superpowers/plans/2026-07-14-copilote-clinique.md` : *« Aucun appel LLM, aucune génération de texte clinique par IA — le Copilote ne renvoie que du contenu déjà validé. »*

Ce chantier introduit un premier appel LLM, avec un périmètre volontairement étroit pour ne pas rouvrir cette contrainte à la légère.

## Objectif

Quand l'infirmière pose une question, Ely doit produire une réponse qui répond vraiment à *sa* question précise (pas seulement la fiche la mieux classée), tout en garantissant que :
- le LLM ne reçoit jamais de donnée patient nominative,
- le LLM ne peut jamais fabriquer un contrôle, un signe d'alerte ou une conduite à tenir qui n'existe pas déjà dans une fiche validée,
- l'échec du LLM (réseau, timeout, erreur) ne bloque jamais la réponse — elle se dégrade vers le comportement actuel.

## Décision de conception : filtrage par liste fermée, pas détection générique

Deux flux de données existent : la base de connaissances (`situations_terrain`, déjà générique et validée par construction) et la question tapée/dictée par l'infirmière (qui peut contenir un nom de patient, ex. « Madame Dupont a une plaie qui suinte »). Seul le second flux présente un risque.

Plutôt qu'une détection générique de noms propres (peu fiable, donnerait un faux sentiment de sécurité sur une question de santé), le filtrage s'appuie sur une **liste fermée et connue** : les patients de la tournée du jour de l'infirmière connectée (`getMissionsDuJour`, déjà utilisé sur `/ma-journee`). C'est une vérification contre une dizaine de noms connus, pas une recherche ouverte.

**Risque résiduel assumé** (accepté explicitement par l'utilisateur) :
- une déformation du nom par la dictée vocale peut échapper au filtre ;
- une personne mentionnée hors de la tournée du jour (patient d'une collègue, membre de la famille nommé) n'est pas filtrée ;
- ce n'est pas une garantie structurelle comme le serait "le LLM ne voit jamais la question" — c'est un filtre.

## Flux de données

1. L'infirmière pose sa question (texte tapé ou dicté) — inchangé.
2. **Filtrage** : pour chaque mission de `getMissionsDuJour(supabase, tourneeId)` du jour de l'infirmière connectée, `patientNom` (ex. `"Jean Dupont"`) est découpé en tokens sur les espaces. Chaque token de 2 caractères ou plus est recherché dans le texte de la question par correspondance sur mot entier (limites de mot), insensible à la casse **et aux accents** (normalisation Unicode NFD, suppression des marques diacritiques, sur le texte de la question ET sur les tokens avant comparaison — le texte affiché à l'infirmière n'est jamais modifié, seule la copie envoyée au LLM l'est). Chaque token trouvé est remplacé par `[patient]` dans la copie destinée au LLM.
3. **Garde-fou obligatoire** : si la liste des patients du jour ne peut pas être déterminée pour quelque raison que ce soit (pas de tournée générée pour aujourd'hui, erreur de récupération, utilisateur non identifié) — l'appel au LLM est **annulé entièrement**, pas seulement le filtrage. Une liste vide ou indéterminée ne doit jamais se traduire par un envoi de question non filtrée : mieux vaut ne pas appeler le LLM du tout que de l'appeler sans garantie de filtrage. Dans ce cas, comportement identique à un échec du LLM (repli sur le résultat brut, point 7).
4. **La recherche existante (`searchSituationsTerrain`) tourne sur le texte original, non filtré** — elle interroge du contenu clinique générique, jamais des noms ; filtrer avant la recherche ferait courir un risque de perte de pertinence sans bénéfice de confidentialité.
5. Si la recherche renvoie 0 résultat : comportement inchangé, message actuel (`MESSAGE_AUCUN_RESULTAT`).
6. Si la recherche renvoie ≥1 résultat et que le filtrage (point 2-3) a réussi : les 3 meilleurs résultats (ou moins s'il y en a moins) et la question **filtrée** partent vers le LLM.
7. Le LLM renvoie une réponse structurée (voir ci-dessous), validée côté serveur, puis affichée.
8. En cas d'échec à n'importe quelle étape (garde-fou du point 3, réseau, timeout après 8000 ms, réponse malformée, ou validation qui ne laisse plus aucun contenu exploitable) : repli silencieux sur le comportement actuel — affichage brut du premier résultat de recherche (`resultats[0]`), sans message d'erreur visible pour l'infirmière.

## Ce que le LLM a le droit de faire — et ce qu'il n'a pas le droit de faire

Pour réduire au maximum la surface d'invention, le LLM ne rédige librement que deux des six champs ; les quatre autres sont des **sélections** parmi le contenu déjà validé des fiches fournies, jamais des reformulations :

| Champ | Origine | Validation |
|---|---|---|
| `situationComprise` | Texte libre du LLM (1-2 phrases, reformule la question filtrée en langage clinique) | Aucune — c'est de la reformulation, pas un fait clinique nouveau |
| `informationsManquantes` | Texte libre du LLM (liste, ce qui manque pour bien répondre : ex. « durée d'évolution », « présence de fièvre ») | Aucune — ce sont des questions procédurales, pas des affirmations |
| `controlesRetenus` | Sous-ensemble des `verifications[]` des fiches fournies | Chaque chaîne renvoyée doit être **strictement égale** à une entrée de `verifications` d'une des fiches fournies ; sinon supprimée côté serveur |
| `signesAlerteRetenus` | Sous-ensemble des `quandAvisMedical` (un string par fiche) des fiches fournies | Chaque chaîne renvoyée doit être **strictement égale** au `quandAvisMedical` d'une des fiches fournies ; sinon supprimée côté serveur |
| `actionsRetenues` | Sous-ensemble des `conduiteATenir[]` des fiches fournies | Chaque chaîne renvoyée doit être **strictement égale** à une entrée de `conduiteATenir` d'une des fiches fournies ; sinon supprimée côté serveur |
| `fichesUtilisees` | Sous-ensemble des ids des fiches fournies au LLM | Chaque id renvoyé doit être un id effectivement envoyé au LLM ; sinon supprimé côté serveur |

Si après validation `controlesRetenus`, `signesAlerteRetenus` et `actionsRetenues` sont tous les trois vides, c'est traité comme un échec (voir repli ci-dessus) : une réponse sans aucun contenu sourcé n'a pas d'intérêt à afficher.

## Prompt système

```
Tu assistes une infirmière libérale française pendant sa tournée. Tu reçois
sa question et jusqu'à trois fiches cliniques déjà validées par des
professionnels. Ta tâche : reformuler brièvement sa situation, identifier
les informations qui manquent pour bien y répondre, puis sélectionner
- parmi le contenu exact des fiches fournies, sans le reformuler - les
contrôles, signes d'alerte et actions pertinents pour sa question.

Tu ne dois jamais inventer un contrôle, un signe d'alerte ou une action qui
n'existe pas mot pour mot dans les fiches fournies. Si aucune fiche ne
répond vraiment à la question, dis-le dans "informationsManquantes" plutôt
que de forcer une correspondance.

Tu ne poses pas de diagnostic. Tu n'indiques ni dose ni traitement.
La décision et la responsabilité restent entièrement à l'infirmière.

Réponds uniquement au format JSON demandé.
```

## Modèle et coûts

- Modèle : `claude-haiku-4-5-20251001` (économique, tâche bornée à de la sélection/reformulation courte, pas de raisonnement ouvert).
- Déclenchement : dès qu'il y a ≥1 résultat de recherche (pas seulement ≥2 — contrairement à une architecture où le LLM ne verrait jamais la question, ici il apporte de la valeur même sur un seul résultat en interprétant la question précise).
- Coût estimé : ~1500-2500 tokens entrée, ~300-500 tokens sortie par appel → de l'ordre de 0,003-0,006 €/appel. Pour 50 infirmières actives × 20 questions/jour, environ 22 000 appels/mois → **~70-130 €/mois**. À réévaluer si la qualité déçoit et qu'un modèle plus capable (Sonnet) s'avère nécessaire.
- Clé API : variable d'environnement `ANTHROPIC_API_KEY`, côté serveur uniquement (Server Action) — jamais exposée au client. À ajouter aux variables d'environnement Vercel en production (étape opérationnelle, hors code).

## Interface utilisateur

- **Badge de synthèse** : un badge compact « Synthèse IA », visuellement distinct de `BadgeNiveauConfiance`, affiché sur les réponses synthétisées (jamais sur le repli brut, qui garde l'affichage actuel avec `BadgeNiveauConfiance`).
- **Fiches sources** : chaque fiche listée dans `fichesUtilisees` reste affichée avec son propre `BadgeNiveauConfiance` et son lien « Voir la fiche complète » (`/situations/{id}`), comme aujourd'hui.
- **Rappel de limite persistant** : sous l'en-tête d'Ely (ligne « Assistant de tournée »), une ligne de texte toujours visible : *« Ely vous aide à analyser la situation ; la décision et la responsabilité restent à vous. »*
- **Lecture vocale** : la synthèse vocale existante (`LectureVocaleReponse`) lit désormais `situationComprise` + `actionsRetenues` (au lieu de `titre` + `observation` + `conduiteATenir` pour une réponse brute) ; sur repli, comportement actuel inchangé.

## Hors scope

- **Détection automatique d'urgence** (interrompre la conversation, orienter vers le 15/112) : fonctionnalité à part entière avec ses propres garde-fous non-LLM ; chantier séparé si souhaité.
- **Contexte de mission dans le prompt** (`patientContexte`/`soinContexte`, déjà affiché mais purement décoratif) : reste exclu du contenu envoyé au LLM — c'est une donnée patient nominative (prénom du patient), donc hors périmètre du filtrage par tournée du jour qui porte sur le texte libre de la question, pas sur ces props.
- **Historique de conversation multi-tours** : chaque question reste traitée indépendamment, comme aujourd'hui.
- **Choix de modèle/fournisseur configurable** : le modèle est une constante dans le code, pas un réglage utilisateur.

## Tests

- Filtrage : noms avec/sans accents, casse variée, noms courts (1 caractère, non filtrés), tokens qui apparaissent comme sous-chaîne d'un autre mot (ne doivent pas être filtrés — limites de mot), plusieurs patients du jour.
- Garde-fou liste vide/indéterminée : pas de tournée du jour, erreur de récupération des missions → aucun appel LLM, repli direct sur le résultat brut (le texte non filtré ne doit jamais partir vers le LLM).
- Validation serveur : réponse LLM contenant une chaîne qui n'existe dans aucune fiche fournie → supprimée ; réponse où les trois champs sourcés sont vides après validation → traitée comme échec.
- Repli : erreur réseau, timeout, JSON malformé → comportement actuel (résultat brut), pas d'erreur visible.
- 0 résultat de recherche → comportement actuel inchangé, aucun appel LLM.
