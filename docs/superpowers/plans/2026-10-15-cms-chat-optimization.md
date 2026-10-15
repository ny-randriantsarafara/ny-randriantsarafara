# Plan d’implémentation — optimisation du moteur conversationnel CMS

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Subagent-driven-development is an alternative only if delegation is explicitly selected. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Réduire les appels et le volume d’inférence tout en améliorant la cohérence des réponses sur des publications CMS nouvelles, corrigées ou supprimées.

**Architecture:** Préparer un contexte immuable par publication/langue, faire valider les preuves dans cette publication et dériver les cartes côté serveur. Réutiliser uniquement les réponses validées ayant exactement le même contexte de conversation ; garder les limites de dépenses et un repli sans affirmation hors sujet. Le contrat public `ChatResponse` reste compatible avec le site.

**Tech Stack:** TypeScript strict, Node 24+, pnpm 10.32.1 via Corepack, Hono, Zod, Vitest, Directus/PostgreSQL ; mémoire locale bornée, sans nouveau service ni dépendance de production.

**Spec:** [Recherche et décisions proposées](../../evaluations/2026-10-15-generalizable-optimizations.md), [traces hors staging](../../evaluations/2026-10-15-generalization-results.jsonl). Les décisions explicites de ce plan précisent les choix laissés ouverts dans la recherche. Statut : **plan proposé, aucune implémentation autorisée par ce document seul**.

**Suivi du 15 octobre :** implémentation locale et checks terminés ; détails dans le [rapport de validation](../../evaluations/2026-10-15-implementation-validation.md). Les cases ci-dessous constituent le plan d'origine ; les essais réels, la mesure des gains, l'activation et les commits/livraisons suggérés restent distincts et ne sont pas annoncés exécutés.

## Contraintes globales

- Travail produit dans `portfolio/`, dépôt GitHub `ny-randriantsarafara/ny-randriantsarafara`, pas dans le hub.
- Référence inspectée le 15 octobre : `origin/main` au SHA `7eb2faaf65a44777556adddc1ceeae5f2997a1cc`. Refaire la vérification avant exécution : ce SHA est une référence de lecture, pas une base distante éternelle.
- Le checkout courant épingle encore un ancien commit. Préparer une branche `feat/cms-chat-optimization` depuis la vraie base avant de coder ; préserver les documents non suivis et les autres worktrees. Ne pas mettre à jour les autres sous-modules ni enregistrer le pointeur du hub par commodité.
- Node `>=24`, imports relatifs `.ts`, pas de `any`, assertions `as`, non-null `!`, `@ts-ignore`, nouvelle dépendance ou nouveau service.
- Conserver les textes, chiffres, dates et liens publiés, leurs relations et les deux langues FR/EN. Aucun nom de société, slug, chiffre ou modèle de staging dans les règles de production.
- Conserver le plafond modèle de 10 000 ms et l’attente site de 12 s ; un meilleur temps moyen ne doit pas masquer les timeouts.
- Ne pas supprimer les réponses préparées : elles peuvent contenir des faits uniques. Ne pas remplacer les connaissances par un résumé généré.
- Les tests déterministes n’appellent aucune API. Les évaluations réelles sont explicitement lancées, limitées aux routes gratuites vérifiées et ne modifient ni contenu ni réglage CMS.
- Aucune modification de tarif, sélection de modèle, publication éditoriale, installation de secret, livraison ou opération en production pendant l’implémentation locale.
- Les commits indiqués sont des **messages suggérés** pour une publication ultérieure autorisée ; ne pas les exécuter sur la seule demande de plan.

## Décisions et périmètre

| Sujet                            | Décision                                                                                                                                                                                                                                |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cache de contexte                | LRU de quatre couples publication/langue, maximum cumulé 2 MiB ; construire à la demande. Une entrée trop grosse reste non cachée.                                                                                                      |
| Projection                       | Omettre uniquement `answers[].sampleQuestions`, `answers[].blocks`, `answers[].starter` du prompt. Garder ces champs dans la publication et le moteur scripté.                                                                          |
| Cache de réponses                | LRU local de 64 réponses, plafond cumulé 2 MiB, TTL 300 s, au plus 16 calculs simultanés distincts. Pas de Redis ni de cache sémantique.                                                                                                |
| Activation                       | Ajouter `response_cache_enabled` dans les réglages CMS, défaut `false`. Activer seulement après validation du lot ; son changement s’applique avec le cache de réglages existant de 30 s.                                               |
| Réponses cachables               | Uniquement `answered`, preuves validées, génération complète, pas de refus/absence de preuve/réponse sensible/erreur.                                                                                                                   |
| Clé                              | Publication, langue effective, messages complets ordonnés, provider/modèle, paramètres de génération et version des règles/du contrat. Sérialisation stable et SHA-256 ; aucun secret dans la clé journalisée.                          |
| Changement de publication en vol | Ne pas livrer l’ancienne réponse. Retourner `503 { error: 'unavailable' }`, enregistrer la dépense sous la publication du calcul, raison `publication_changed`, sans retry.                                                             |
| Ordre des contrôles              | Validation → publication → limites visiteur → sujets sensibles → réglages → lookup/join du cache. Budget et limite globale modèle seulement pour le propriétaire d’un nouvel appel.                                                     |
| Preuves                          | Références à des champs/extraits de la publication courante ; cartes dérivées côté serveur. Leur validation mécanique n’est pas une preuve d’implication sémantique de tout le texte.                                                   |
| Repli opérationnel               | `unknownReply` de la langue effective, aucune carte ni réponse factuelle approximative. Le mode volontairement scripté garde son moteur existant.                                                                                       |
| Contexte volumineux              | `max_input_bytes`, défaut 65 536, mesure UTF-8 du corps utile instructions + conversation + schéma. Au-delà : aucun appel, raison `model_context_limit`, pas de troncature silencieuse. C’est une limite applicative, pas un tokenizer. |
| Routage multi-fournisseur        | [Lot indépendant](2026-10-15-cms-model-providers.md). Ce plan accepte une identité de provider stable pour ne pas créer de couplage avec OpenRouter.                                                                                    |

## Carte des fichiers

| Zone                 | Fichiers                                                                                                                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Corpus et évaluation | Nouveaux `api/src/chat/testing/cms-corpus.ts`, `api/src/chat/generalization.test.ts`, `api/scripts/evaluate-cms-corpus.ts` ; modifier `api/scripts/evaluate-chat.ts`.                                     |
| Contexte compilé     | Nouveaux `api/src/chat/publication-context.ts`, `publication-context.test.ts` ; modifier `prompt-builder.ts`, son test, `chat-service.ts`, `main.ts`.                                                     |
| Preuves et cartes    | Nouveaux `api/src/chat/evidence.ts`, `evidence.test.ts` ; modifier `model-output-schema.ts`, `model-reply.ts`, leurs tests et `publication-identifiers.ts`.                                               |
| Orchestration        | Nouveaux `api/src/chat/response-coordinator.ts`, son test ; modifier `chat-service.ts`, ses tests et `main.ts`.                                                                                           |
| Coût/observabilité   | Modifier `chat-model.ts`, `openai-compatible-model.ts`, leurs tests, `exchange-recorder.ts`, `cost.ts` et ses tests.                                                                                      |
| CMS                  | Modifier `cms/schema/src/records.ts`, `cms/provision/src/schema/collections.ts`, `definitions.test.ts`, les lecteurs/résolveurs sous `api/src/model-settings/` et `cms/tests/src/model-settings.test.ts`. |
| Documentation        | Modifier `docs/architecture.md`, `docs/development.md` ; ajouter les rapports d’évaluation sous `docs/evaluations/`.                                                                                      |

Les noms ci-dessous sont les interfaces cibles. Les extraits de tests constituent des contrats à implémenter, pas des déclarations de checks déjà passés. Les blocs d’interface déclarent les signatures cibles ; leur implémentation et les tests passent ensemble dans la tâche indiquée.

## Tâche 1 — Base de tests indépendante des données staging

**Fichiers :** créer `api/src/chat/testing/cms-corpus.ts`, `api/src/chat/generalization.test.ts` et la première version fonctionnelle de `api/scripts/evaluate-cms-corpus.ts` ; compléter `api/src/chat/chat-service.test.ts` et `model-reply.test.ts`.

**Interfaces :**

```ts
type CorpusMutation = 'initial' | 'updated' | 'deleted' | 'new-skill' | 'empty' | 'conflicting';
type ExpectedFact = { entitySlug: string; field: string; value: string };
type CorpusCase = {
  active: ActivePublication;
  request: ChatRequest;
  expectedFacts: ExpectedFact[];
  forbiddenFacts: ExpectedFact[];
  expectedEvidenceSlugs: string[];
};
function makeCmsCorpus(seed: number, mutation: CorpusMutation): CorpusCase;
```

`ActivePublication` vient de `@portfolio/content`, `ChatRequest` de `@portfolio/chat`. La fabrique est réservée aux tests/scripts et valide chaque contenu avec `validatePublicationContent`. Les noms, slugs et valeurs dérivent de la graine ; ne pas charger le JSON du staging. Les variantes partagent les mêmes entités pour pouvoir tester une correction ou une suppression.

- [ ] Générer deux entreprises avec chiffres distincts, une compétence/projet ajouté, des collections vides et un historique d’assistant périmé. La variante `conflicting` laisse volontairement une contradiction entre deux textes publiés ; son oracle interdit d’affirmer une résolution certaine inventée.
- [ ] Écrire les régressions observées : ancien chiffre réutilisé, entreprise supprimée, projet nouveau avec carte CV, preuve issue d’une autre entreprise, réponse factuelle hors sujet après timeout. Exprimer les associations par entité, pas seulement par présence des nombres.

```ts
it.each([7, 23, 61])('preserves the new publication after an update (seed %i)', async (seed) => {
  const previous = makeCmsCorpus(seed, 'initial');
  const updated = makeCmsCorpus(seed, 'updated');
  expect(updated.active.publicationId).not.toBe(previous.active.publicationId);
  expect(validatePublicationContent(updated.active.content).valid).toBe(true);
  expect(updated.expectedFacts).not.toEqual(previous.expectedFacts);
});
```

- [ ] Lancer `corepack pnpm --filter @portfolio/api test src/chat/generalization.test.ts` ; vérifier que les cas exposant le moteur actuel échouent pour la raison attendue, pas sur une fixture invalide.
- [ ] Séparer ces régressions des invariants déjà vrais : données inconnues rejetées, politique sensible avant appel et budget épuisé. Chaque tâche suivante rend ses cas verts ; ne pas masquer les échecs connus avec des attentes sur le comportement incorrect.
- [ ] Avant la première modification du moteur, exécuter ce runner sur le moteur actuel et conserver son checkout/snapshot isolé avec le corpus, les dépendances et le SHA, sans credentials. Le runner reçoit un corpus JSON, une configuration de transport injectée et renvoie `ChatResponse` plus usage ; il ne dépend pas du contrat JSON interne de la future tâche 4. Ce baseline sera réutilisé par la tâche 8.
- [ ] Commit suggéré après correction associée : `test(chat): cover changing CMS publications`.

**Sortie :** corpus réutilisable et régressions rattachées aux tâches 3–5 ; aucun benchmark réseau dans `pnpm test`.

## Tâche 2 — Conserver la consommation même lorsque la sortie est rejetée

**Fichiers :** `chat-model.ts`, `openai-compatible-model.ts`, `openai-compatible-model.test.ts`, `exchange-recorder.ts`, `cost.test.ts`, `cms/schema/src/records.ts`, `cms/provision/src/schema/collections.ts`, `definitions.test.ts`, nouveau `exchange-recorder.test.ts`.

**Interfaces :** étendre `ChatModelUsage` avec `reasoningTokens: number | null` ; étendre les résultats avec métadonnées optionnelles `generationId`, `servedModel`, `providerCostUsd`. Ajouter `status: 'invalid_output'` à `ChatModelFailure` et y autoriser `usage: ChatModelUsage | null`. Une absence de consommation connue reste `null`, pas une dépense affirmée nulle.

- [ ] Écrire un test de réponse HTTP 200 avec JSON de complétion invalide mais `usage` valide : le service doit revenir en repli **et conserver la dépense**. Tester aussi refus fournisseur, `finish_reason: length`, données d’usage manquantes et nombres négatifs/non finis.

```ts
expect(result).toMatchObject({
  status: 'invalid_output',
  usage: { inputTokens: 1200, outputTokens: 80 },
});
```

- [ ] Faire parser les métadonnées d’usage avant le contenu, distinguer erreur HTTP, JSON d’enveloppe invalide, sortie modèle invalide et timeout. Ne jamais copier un corps d’erreur contenant la requête ou les credentials dans les logs.
- [ ] Ajouter aux échanges les champs nullable `generation_id`, `served_model`, `cache_read_tokens`, `cache_write_tokens`, `reasoning_tokens`, `provider_cost_usd`, et `delivery_source` (`provider`, `cache`, `shared`, `scripted`). `cost_eur` reste l’estimation utilisée par le budget ; aucune conversion implicite USD→EUR.
- [ ] Conserver `outputTokens` comme total de sortie facturable : ne pas additionner `reasoningTokens` une seconde fois. Garder les tarifs cache configurables et leur fallback conservateur actuel ; aucun changement de valeur en ligne.
- [ ] Lancer les tests du transport, de l’enregistreur et de coût, puis `corepack pnpm typecheck`. Mettre à jour les notes de collections et la documentation de mesure.
- [ ] Commit suggéré : `fix(chat): preserve usage for rejected model replies`.

**Migration :** champs ajoutés, anciens échanges conservés. Provisionner avant l’API qui les écrit ; tester cette migration sur une base locale déjà provisionnée.

## Tâche 3 — Compiler et réutiliser le contexte de publication

**Fichiers :** nouveau `publication-context.ts` et son test ; `prompt-builder.ts`, son test, `chat-service.ts`, `main.ts`.

**Interfaces :**

```ts
type CompiledPublicationContext = {
  publicationId: string;
  locale: Locale;
  contractVersion: string;
  instructions: string;
  outputSchema: Record<string, unknown>;
};
type PublicationContextCache = {
  get(active: ActivePublication, locale: Locale): CompiledPublicationContext;
};
function createPublicationContextCache(): PublicationContextCache;
function buildConversationPrompt(request: ChatRequest): string;
```

`Locale` vient de `@portfolio/content`. Le contrat commence à `cms-chat-v2`, incrémenté quand règles, projection ou schéma changent. La tâche 4 ajoutera le catalogue de preuves à ce contexte ; cette tâche ne dépend pas encore de ce catalogue.

- [ ] Écrire un test de projection vérifiant tous les champs conservés, notamment les textes uniques d’une réponse préparée, études de cas, dates, langues, liens et politiques sensibles. Tester deux publications aux mêmes slugs mais aux valeurs différentes, puis un rollback.

```ts
const a = makeCmsCorpus(23, 'initial');
const b = makeCmsCorpus(23, 'updated');
const contexts = createPublicationContextCache();
expect(contexts.get(a.active, 'fr')).toBe(contexts.get(a.active, 'fr'));
expect(contexts.get(b.active, 'fr').instructions).not.toBe(
  contexts.get(a.active, 'fr').instructions
);
expect(contexts.get(a.active, 'en').instructions).not.toBe(
  contexts.get(a.active, 'fr').instructions
);
```

- [ ] Implémenter une projection déterministe ne retirant que les trois champs de réponses décidés plus haut. Ne pas muter `active.content`. Séparer connaissances stables et historique variable, sans modifier la détection de langue existante.
- [ ] Implémenter les bornes LRU annoncées ; tester éviction, couple FR/EN et entrée supérieure à 2 MiB non retenue. Aucun accumulateur de toutes les publications passées.
- [ ] Réutiliser le contexte dans le service ; maintenir `buildChatPrompt` comme wrapper de compatibilité pendant le changement de ses appelants, puis supprimer uniquement le code devenu inutilisé dans ce lot.
- [ ] Lancer `corepack pnpm --filter @portfolio/api test src/chat/publication-context.test.ts src/chat/prompt-builder.test.ts src/chat/chat-service.test.ts`.
- [ ] Mesurer les octets sur corpus petits, gros et sans réponses préparées. Exiger une projection sans modification des champs conservés ; ne pas exiger un gain fixe de 18 % sur tous les contenus.
- [ ] Commit suggéré : `perf(chat): compile localized publication context`.

## Tâche 4 — Preuves typées et cartes dérivées côté serveur

**Fichiers :** nouveau `evidence.ts`, `evidence.test.ts` ; `publication-context.ts`, `model-output-schema.ts`, `model-output-schema.test.ts`, `model-reply.ts`, `model-reply.test.ts`, `publication-identifiers.ts`, `prompt-builder.ts` ; créer `requested-utility.ts` et son test.

**Interfaces :**

```ts
type EvidenceReference = { sourceId: string; quote: string };
type EvidenceSource = {
  id: string;
  collection:
    | 'profile'
    | 'capabilities'
    | 'skills'
    | 'experiences'
    | 'projects'
    | 'keyFigures'
    | 'answers';
  entitySlug: string | null;
  field: string;
  text: string;
  block: Block | null;
};
function buildEvidenceSources(content: PublicationContent, locale: Locale): EvidenceSource[];
function requestedUtility(request: ChatRequest): 'cv' | 'contact' | null;
function resolveEvidence(
  refs: EvidenceReference[],
  sources: ReadonlyMap<string, EvidenceSource>
): { status: 'ok'; sources: EvidenceSource[] } | { status: 'invalid_evidence' };
```

`Block`, `PublicationContent`, `Locale` viennent de `@portfolio/content`. Identifiant stable à l’intérieur d’une publication : par exemple `experiences/<slug>/summary/fr`, ou `projects/<slug>/caseStudy/en`. Les indices d’éléments de listes sont inclus pour les highlights. La publication reste une dimension séparée de l’identité de contexte/cache.

- [ ] Écrire les tests d’extrait présent mais mauvaise source, extrait absent, source supprimée, mauvais langage, références dupliquées et texte vide. Pour `answered`, exiger au moins une preuve ; pour les autres issues, normaliser avec le CMS comme aujourd’hui.

```ts
const sources = buildEvidenceSources(makeCmsCorpus(61, 'new-skill').active.content, 'en');
const byId = new Map(sources.map((source) => [source.id, source]));
expect(resolveEvidence([{ sourceId: 'missing', quote: 'CSV' }], byId)).toEqual({
  status: 'invalid_evidence',
});
```

- [ ] Incrémenter le contrat à `cms-chat-v3-evidence` et ajouter `evidenceSources: ReadonlyMap<string, EvidenceSource>` au contexte compilé.
- [ ] Construire le catalogue à partir des champs publiés et de leur contexte d’entité. Le catalogue de résolution reste côté serveur : ne pas ajouter une deuxième copie des textes au prompt. Le modèle reçoit les connaissances déjà présentes et les identifiants de champs autorisés dans le schéma, avec leur convention explicitée dans les règles. Conserver les relations d’employeur/projet et les dates ; ne pas aplatir tous les nombres dans une liste globale.
- [ ] Remplacer les `blocks`/`answerSlugs` libres dans le contrat interne modèle par `evidence`. Garder `outcome`, `text`, `suggestions`, `sensitiveTopicSlug`. `sourceId` est contraint par enum et chaque objet est fermé. Si aucune source textuelle n’existe, répondre sans appel plutôt que fabriquer un enum vide.
- [ ] Valider une correspondance d’extrait exacte après normalisation Unicode NFC uniquement ; aucune correspondance floue. Construire au plus deux cartes dédupliquées depuis les sources validées et `answerSlugs` depuis les seules sources de type réponse préparée.
- [ ] Cartes directes : expérience→`experience`, projet→`project`, compétence/capacité→`skills`, chiffre→`key-figures`, réponse préparée→`strengths`, profil→aucune carte automatique. Les actions CV/contact ne peuvent pas venir du modèle. `requestedUtility` examine uniquement le dernier message visiteur, normalisé Unicode/ponctuation/casse, et exige une phrase entière dans un petit lexique FR/EN : `cv`, `resume`, `curriculum vitae`, `your cv`, `votre cv`, `ton cv`, `send me your cv`, `envoyez-moi votre cv` ; pour le contact : `contact`, `how can i contact you`, `comment vous contacter`, `comment te contacter`. Tester qu’un projet évoquant un CV ou une ancienne question contact ne déclenche rien. Après les sujets sensibles et avant modèle, produire la carte explicite avec « Voici mon CV. » / « Here is my CV. », ou « Vous pouvez me contacter via ce formulaire. » / « You can contact me using this form. », en mode scripté et sans appel. Ces textes sont des indications d’interface, pas de nouveaux faits sur le candidat.
- [ ] Garder le contrat public `ChatReply`/`ChatResponse` existant : seul le contrat entre backend et modèle change. Ajouter la nouvelle normalisation aux tests du service.
- [ ] Documenter la limite : extrait existant et carte cohérente ne prouvent pas que chaque phrase libre est soutenue ni que la source est pertinente. Les évaluations de qualité restent nécessaires ; aucune promesse de suppression générale des hallucinations.
- [ ] Lancer tests de preuve, schéma, normalisation, contexte et service ; puis `corepack pnpm typecheck`.
- [ ] Commit suggéré : `feat(chat): derive reply cards from publication evidence`.

## Tâche 5 — Repli opérationnel sans réponse factuelle hors sujet

**Fichiers :** `chat-service.ts`, `chat-service.test.ts`, `generalization.test.ts` ; créer `operational-fallback.ts`, `operational-fallback.test.ts`.

**Interface :**

```ts
function createOperationalFallback(content: PublicationContent, locale: Locale): ChatReply;
```

- [ ] Écrire un test où la publication ne contient plus l’entreprise mentionnée dans l’historique, le modèle expire et une autre entreprise possède une réponse préparée sur le même thème. Exiger `unknown`, zéro carte et aucun chiffre de l’autre entreprise.
- [ ] Écrire le cas symétrique du nouveau projet Rust avec timeout : ne pas répondre avec une ancienne expérience choisie par proximité lexicale.
- [ ] Implémenter le repli avec `chatSettings.unknownReply[locale]` et les suggestions éditoriales existantes, sans carte de preuve. Appliquer ce repli aux erreurs fournisseur, sortie/preuve invalide, budget indisponible/épuisé, limites de modèle et contexte trop grand.
- [ ] Garder les sujets sensibles avant modèle et les réponses intentionnellement scriptées (`model_disabled`) dans le parcours existant. Documenter que cette tâche cible les erreurs opérationnelles, sans prétendre résoudre toute ambiguïté du moteur scripté.
- [ ] Utiliser `replyLanguageForRequest`, pas seulement `request.locale`, pour conserver la langue d’une relance ambiguë.
- [ ] Lancer tests du repli, des publications variables et du service ; vérifier qu’un refus ou sujet sensible n’appelle toujours pas de modèle supplémentaire.
- [ ] Commit suggéré : `fix(chat): use a factual-safe operational fallback`.

## Tâche 6 — Coordination des appels et cache exact borné

**Fichiers :** nouveau `response-coordinator.ts`, son test ; `chat-service.ts`, `chat-service.test.ts`, `main.ts`, `exchange-recorder.ts`, lecteurs/résolveurs de réglages, schéma/provisioning et tests CMS.

**Interfaces :**

```ts
type GenerationDecision =
  | {
      status: 'completed';
      reply: ChatReply;
      usage: ChatModelUsage;
      generationId: string;
      costEur: number;
    }
  | {
      status: 'fallback';
      reason: string;
      usage: ChatModelUsage | null;
      generationId: string | null;
      costEur: number | null;
    };
type CoordinatedDecision = {
  source: 'provider' | 'cache' | 'shared' | 'rejected';
  decision: GenerationDecision;
};
type ResponseCoordinator = {
  resolve(key: string, compute: () => Promise<GenerationDecision>): Promise<CoordinatedDecision>;
};
function createResponseCoordinator(clock: () => Date): ResponseCoordinator;
function createResponseKey(input: {
  publicationId: string;
  locale: Locale;
  request: ChatRequest;
  providerIdentity: string;
  settings: ModelSettings;
  contractVersion: string;
}): string;
```

`completed` conserve aussi les issues valides `unknown`/`refused`/`sensitive`, avec leur normalisation CMS ; elles ne sont pas cachées. `rejected` identifie une admission refusée sans appel et produit une télémétrie scriptée. Le `generationId` interne peut être un UUID local, distinct du numéro fournisseur optionnel. Il sert à corréler les livraisons d’un même calcul et à ne compter sa consommation qu’une fois. Tous les types importés sont ceux des tâches précédentes ou du dépôt.

- [ ] Écrire les tests via le service : deux questions identiques→un appel ; historique différent→deux appels ; publication B→pas de hit A ; rollback A→réutilisation seulement si l’entrée existe encore et son TTL est valide ; changement modèle/provider/effort/contrat→miss.
- [ ] Tester limites visiteur et sujets sensibles avant cache, modèle désactivé ou réglages invalides sans réponse cachée, hit autorisé avec budget fournisseur épuisé, et quota global incrémenté seulement lors d’un nouvel appel.

```ts
const coordinator = createResponseCoordinator(() => new Date('2026-10-15T10:00:00Z'));
const reply: ChatReply = {
  outcome: 'answered',
  text: 'A published result.',
  answerSlugs: [],
  blocks: [],
  suggestions: [],
};
const compute = vi.fn(
  async (): Promise<GenerationDecision> => ({
    status: 'completed',
    reply,
    generationId: 'local-generation-1',
    costEur: 0.0001,
    usage: {
      inputTokens: 40,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 8,
      reasoningTokens: null,
    },
  })
);
await coordinator.resolve('same-key', compute);
await coordinator.resolve('same-key', compute);
expect(compute).toHaveBeenCalledTimes(1);
```

- [ ] Implémenter LRU/TTL/bornes sans timer global. Enregistrer l’entrée pending synchroniquement avant le premier `await` ; supprimer le pending en `finally`. Au-delà de 16 calculs distincts, produire le repli `model_busy`, sans lancer un appel hors limite. Seul `completed` avec `reply.outcome === 'answered'` est caché. Une erreur n’est jamais mise en cache ni automatiquement retentée.
- [ ] Vérifier la publication active après tout `await` de génération/cache partagé et avant livraison ; en cas de changement, ne pas insérer/servir l’ancienne réponse, retourner la réponse 503 décidée plus haut et conserver la dépense du calcul réel une seule fois.
- [ ] Une ligne d’échange par visiteur : propriétaire→coût du calcul, hit/join→coût additionnel zéro et même identifiant de calcul. Un appel facturé dont la sortie est rejetée reste comptabilisé une seule fois. Les hits ne recopient ni question ni identifiant de conversation du premier visiteur.
- [ ] Ajouter `response_cache_enabled` nullable/défaut faux dans les réglages, leurs types, lecteur, résolveur, définitions et tests CMS. Hors cache, le service garde un appel par requête et les mêmes limites.
- [ ] Lancer tests du coordinateur, du service et des réglages ; tests d’intégration CMS locaux pour les nouveaux champs. Vérifier compteurs de mémoire et concurrence avec horloge/fetch simulés.
- [ ] Commit suggéré : `perf(chat): reuse exact replies by publication and conversation`.

## Tâche 7 — Bornes de contexte et de sortie, réglables dans le CMS

**Fichiers :** réglages CMS et API, `chat-model.ts`, transport et tests, `chat-service.ts`, script d’évaluation, `.env.example` seulement si une nouvelle variable s’avère nécessaire (les bornes éditables restent au CMS).

- [ ] Ajouter `max_input_bytes` (entier positif, défaut 65 536) et `max_output_tokens` (nullable pour compatibilité avec les configurations existantes, entier positif quand renseigné). Ne pas utiliser un ratio fixe caractères/tokens pour annoncer une limite de contexte modèle exacte.
- [ ] Tester un corps à la borne, un corps au-dessus et un schéma volumineux : au-dessus, zéro appel, `model_context_limit`, repli prudent. Inclure schéma et historique dans le calcul ; ne pas tronquer les champs factuels.
- [ ] Envoyer le plafond de sortie uniquement s’il est renseigné, avec le paramètre du provider. Conserver les tokens facturés quand la génération atteint sa borne et échoue à produire le JSON complet.
- [ ] Tester les efforts reconnus par le modèle/provider. « Masquer » ne doit pas être interprété comme « désactiver » le raisonnement ; aucun effort non supporté envoyé silencieusement par défaut.
- [ ] Lancer tests de réglages, transport, coût, contexte et service. Ne modifier aucune valeur actuellement configurée dans le CMS réel.
- [ ] Commit suggéré : `feat(chat): bound model context and output from CMS settings`.

## Tâche 8 — Évaluation reproductible et critères d’acceptation

**Fichiers :** compléter `api/scripts/evaluate-cms-corpus.ts` créé en tâche 1, modifier `evaluate-chat.ts`, `docs/development.md`, `docs/architecture.md` ; rapports sous `docs/evaluations/`.

- [ ] Ajouter au runner les arguments `--model`, `--variant=baseline|optimized`, `--seeds`, `--output`, `--max-calls`. Utiliser le checkout/snapshot baseline conservé en tâche 1 avant les changements de production, avec le même runner de corpus, ses dépendances et son SHA. Ajouter `--engine-dir` au runner pour exécuter le baseline et la version optimisée dans deux processus séparés, via leur `createChatService` respectif et la même entrée JSON de corpus. Aucune copie de clés dans ce snapshot, aucun chemin baseline dans le moteur de production. Les sorties doivent être le contrat public et la trace d’usage, pas un contrat interne commun supposé entre deux versions.
- [ ] Vérifier la route gratuite exacte et **toutes** ses catégories de prix, le quota réel et le plafond local de 60 tentatives par exécution. Aucun modèle payant ni plugin/outillage de recherche ajouté. Refuser une configuration incomplète avant le premier appel.
- [ ] Utiliser trois graines de développement et trois autres graines réservées. Exécuter les mêmes requêtes et histoires pour chaque variante, en alternant l’ordre. Espacer les débuts d’appels d’au moins 3,2 s **avant** démarrage du chronomètre d’inférence ; distinguer attente de quota, temps fournisseur et temps service.
- [ ] Tracer chaque tentative dès son départ, même sans en-têtes ni `usage`, afin de ne pas reproduire le compteur incomplet du probe. Conserver un rapport séparant coûts connus/inconnus, facturation fournisseur et estimation CMS.
- [ ] Désactiver le cache de réponse pendant les comparaisons de générations ; mesurer séparément les gains du cache sur une charge avec répétitions déclarée. Rapporter les sorties de repli, pas seulement les HTTP 200.
- [ ] Évaluer associations de faits, preuves/cartes, corrections/suppressions, langue, ambiguïtés, contradictions et corpus volumineux. Un score de présence de nombres n’est pas un score de fidélité. Conserver une revue humaine des paraphrases et des cas non décidables automatiquement.

**Gates :**

1. Tests déterministes : 100 % des invariants publication/cache/politique/coût passent ; aucun contenu conservé modifié par projection.
2. Cache : zéro nouvel appel sur hit et un seul calcul sur join ; coût compté une seule fois ; aucune réponse A après activation B, y compris en vol.
3. Qualité : aucun cas d’entreprise/chiffre incorrect, ancienne preuve ou carte sans preuve dans le corpus réservé ; les cas de contradiction n’affirment pas une solution inventée. Sinon le lot reste désactivé, même si les tokens baissent.
4. Performance : publier input/output/cache, coût par réponse valide, p50/p95 et taux de repli pour chaque corpus. Accepter un réglage de génération seulement s’il n’ajoute pas d’erreur de fidélité et n’aggrave pas le taux de timeout du baseline observé ; un run bruité nécessite confirmation avant conclusion.
5. Aucun gain fixe en pourcentage promis avant résultat. Aucun test payant requis pour livrer le code ; une validation réelle d’un provider payant reste une opération distincte explicitement demandée.

**Checks à l’exécution :**

```bash
corepack pnpm --filter @portfolio/api test
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm format:check
corepack pnpm test
corepack pnpm test:cms
git diff --check
```

Les tests CMS nécessitent la stack locale provisionnée ; ne pas les diriger vers le staging. `corepack pnpm test:e2e` est requis si le contrat public ou les branches de réponse visibles ont changé, avec le script racine qui configure correctement le build de test. Les commandes listées ici sont prévues, pas exécutées pendant la rédaction du plan.

## Extension conditionnelle — sélection de sources pour gros corpus

Ne pas ajouter un moteur vectoriel dans le premier lot. Le garde-fou de contexte donne une limite explicite. Si plusieurs corpus représentatifs la dépassent, comparer contexte complet chaud et index lexical local par publication/langue, incluant les questions exemples et les relations ; élargir la recherche pour synthèses et suivis. N’activer ce parcours qu’après avoir démontré l’absence d’omissions sur le corpus réservé. La sélection hybride et des métriques canoniques structurées pour les publications contradictoires nécessitent alors leur propre plan.

## Livraison proposée et retour arrière

Découper en changements reviewables : (1) régressions/consommation, (2) contexte compact, (3) preuves/repli, (4) cache désactivé par défaut, (5) bornes/évaluation. Chaque lot garde le site utilisable ; le contrat interne preuve et sa validation sont livrés atomiquement dans le même lot API.

Provisionner les ajouts de champs avant le binaire API qui les utilise. Garder les anciens champs et les anciennes données ; pas de migration destructive. Désactiver le cache via son réglage pour revenir au parcours sans réutilisation ; le rollback d’image vide les caches mémoire. Les changements de modèle ou de contenu restent des actions séparées. Commit, push, PR, merge et livraison seront effectués uniquement dans le périmètre demandé à ce moment-là.
