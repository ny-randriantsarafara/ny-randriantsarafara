# Implementation plan — CMS conversational engine optimization

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Subagent-driven-development is an alternative only if delegation is explicitly selected. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut calls and inference volume while improving reply consistency on new, corrected or removed CMS publications.

**Architecture:** Prepare immutable context per publication/language, validate evidence in that publication and derive cards server-side. Reuse only validated replies with exactly the same conversation context; keep spend limits and fallback without off-topic claims. Public `ChatResponse` contract stays compatible with the site.

**Tech Stack:** Strict TypeScript, Node 24+, pnpm 10.32.1 via Corepack, Hono, Zod, Vitest, Directus/PostgreSQL; bounded local memory, no new production service or dependency.

**Spec:** [Proposed research and decisions](../../evaluations/2026-10-15-generalizable-optimizations.md), [off-staging traces](../../evaluations/2026-10-15-generalization-results.jsonl). Explicit decisions in this plan pin choices left open in the research. Status: **proposed plan, no implementation authorized by this document alone**.

**15 October follow-up:** local implementation and checks finished; details in the [validation report](../../evaluations/2026-10-15-implementation-validation.md). Checkboxes below are the original plan; real trials, gain measurement, activation and suggested commits/deliveries stay separate and are not announced as done.

## Global constraints

- Product work in `portfolio/`, GitHub repo `ny-randriantsarafara/ny-randriantsarafara`, not in the hub.
- Reference inspected 15 October: `origin/main` at SHA `7eb2faaf65a44777556adddc1ceeae5f2997a1cc`. Re-verify before execution: this SHA is a read reference, not an eternal remote base.
- Current checkout still pins an old commit. Prepare branch `feat/cms-chat-optimization` from the real base before coding; preserve untracked docs and other worktrees. Do not update other submodules or record the hub pointer for convenience.
- Node `>=24`, relative `.ts` imports, no `any`, `as` assertions, non-null `!`, `@ts-ignore`, new dependency or service.
- Keep published texts, figures, dates and links, their relations and both FR/EN languages. No staging company name, slug, figure or model in production rules.
- Keep 10 000 ms model cap and 12 s site wait; better average time must not hide timeouts.
- Do not remove scripted answers: they may hold unique facts. Do not replace knowledge with generated summary.
- Deterministic tests call no API. Real evaluations are explicitly launched, limited to verified free routes and change neither content nor CMS settings.
- No rate, model selection, editorial publication, secret install, delivery or production operation during local implementation.
- Listed commits are **suggested messages** for a later authorized publication; do not run them on plan request alone.

## Decisions and scope

| Topic                        | Decision                                                                                                                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Context cache                | LRU of four publication/language pairs, 2 MiB cumulative max; build on demand. An entry too large stays uncached.                                                                                             |
| Projection                   | Omit only `answers[].sampleQuestions`, `answers[].blocks`, `answers[].starter` from the prompt. Keep those fields in publication and scripted engine.                                                         |
| Response cache               | Local LRU of 64 replies, 2 MiB cumulative cap, TTL 300 s, at most 16 distinct concurrent computes. No Redis or semantic cache.                                                                                |
| Activation                   | Add `response_cache_enabled` in CMS settings, default `false`. Enable only after batch validation; its change applies with existing 30 s settings cache.                                                      |
| Cacheable replies            | Only `answered`, validated evidence, complete generation, no refusal/missing evidence/sensitive/error.                                                                                                        |
| Key                          | Publication, effective language, full ordered messages, provider/model, generation parameters and rules/contract version. Stable serialization and SHA-256; no secret in logged key.                          |
| In-flight publication change | Do not deliver old reply. Return `503 { error: 'unavailable' }`, record spend under compute publication, reason `publication_changed`, no retry.                                                              |
| Control order                | Validation → publication → visitor limits → sensitive topics → settings → cache lookup/join. Budget and global model limit only for owner of a new call.                                                      |
| Evidence                     | References to fields/excerpts of current publication; server-derived cards. Mechanical validation is not proof of semantic implication of all text.                                                           |
| Operational fallback         | Effective language `unknownReply`, no card or approximate factual reply. Intentionally scripted mode keeps its existing engine.                                                                               |
| Large context                | `max_input_bytes`, default 65 536, UTF-8 measure of useful body instructions + conversation + schema. Above: no call, reason `model_context_limit`, no silent truncation. Application limit, not a tokenizer. |
| Multi-provider routing       | [Independent batch](2026-10-15-cms-model-providers.md). This plan accepts stable provider identity to avoid OpenRouter coupling.                                                                              |

## File map

| Area               | Files                                                                                                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Corpus and eval    | New `api/src/chat/testing/cms-corpus.ts`, `api/src/chat/generalization.test.ts`, `api/scripts/evaluate-cms-corpus.ts`; change `api/scripts/evaluate-chat.ts`.                                       |
| Compiled context   | New `api/src/chat/publication-context.ts`, `publication-context.test.ts`; change `prompt-builder.ts`, its test, `chat-service.ts`, `main.ts`.                                                       |
| Evidence and cards | New `api/src/chat/evidence.ts`, `evidence.test.ts`; change `model-output-schema.ts`, `model-reply.ts`, their tests and `publication-identifiers.ts`.                                                |
| Orchestration      | New `api/src/chat/response-coordinator.ts`, its test; change `chat-service.ts`, its tests and `main.ts`.                                                                                            |
| Cost/observability | Change `chat-model.ts`, `openai-compatible-model.ts`, their tests, `exchange-recorder.ts`, `cost.ts` and its tests.                                                                                 |
| CMS                | Change `cms/schema/src/records.ts`, `cms/provision/src/schema/collections.ts`, `definitions.test.ts`, readers/resolvers under `api/src/model-settings/` and `cms/tests/src/model-settings.test.ts`. |
| Documentation      | Change `docs/architecture.md`, `docs/development.md`; add evaluation reports under `docs/evaluations/`.                                                                                             |

Names below are target interfaces. Test excerpts are contracts to implement, not claims checks already pass. Interface blocks declare target signatures; implementation and tests pass together in the indicated task.

## Task 1 — Test base independent of staging data

**Files:** create `api/src/chat/testing/cms-corpus.ts`, `api/src/chat/generalization.test.ts` and first working version of `api/scripts/evaluate-cms-corpus.ts`; extend `api/src/chat/chat-service.test.ts` and `model-reply.test.ts`.

**Interfaces:**

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

`ActivePublication` from `@portfolio/content`, `ChatRequest` from `@portfolio/chat`. Factory is for tests/scripts only and validates each content with `validatePublicationContent`. Names, slugs and values derive from seed; do not load staging JSON. Variants share entities to test correction or deletion.

- [ ] Generate two companies with distinct figures, added skill/project, empty collections and stale assistant history. `conflicting` variant deliberately leaves contradiction between two published texts; its oracle forbids inventing a certain resolution.
- [ ] Write observed regressions: old figure reused, deleted company, new project with CV card, evidence from another company, off-topic factual reply after timeout. Express associations per entity, not only number presence.

```ts
it.each([7, 23, 61])('preserves the new publication after an update (seed %i)', async (seed) => {
  const previous = makeCmsCorpus(seed, 'initial');
  const updated = makeCmsCorpus(seed, 'updated');
  expect(updated.active.publicationId).not.toBe(previous.active.publicationId);
  expect(validatePublicationContent(updated.active.content).valid).toBe(true);
  expect(updated.expectedFacts).not.toEqual(previous.expectedFacts);
});
```

- [ ] Run `corepack pnpm --filter @portfolio/api test src/chat/generalization.test.ts`; verify cases exposing current engine fail for expected reason, not invalid fixture.
- [ ] Separate these regressions from invariants already true: unknown data rejected, sensitive policy before call and exhausted budget. Each later task turns its cases green; do not hide known failures with expectations on wrong behavior.
- [ ] Before first engine change, run this runner on current engine and keep isolated checkout/snapshot with corpus, dependencies and SHA, without credentials. Runner receives corpus JSON, injected transport config and returns `ChatResponse` plus usage; it does not depend on future task 4 internal JSON contract. Baseline reused by task 8.
- [ ] Suggested commit after associated fix: `test(chat): cover changing CMS publications`.

**Output:** reusable corpus and regressions tied to tasks 3–5; no network benchmark in `pnpm test`.

## Task 2 — Keep consumption when output is rejected

**Files:** `chat-model.ts`, `openai-compatible-model.ts`, `openai-compatible-model.test.ts`, `exchange-recorder.ts`, `cost.test.ts`, `cms/schema/src/records.ts`, `cms/provision/src/schema/collections.ts`, `definitions.test.ts`, new `exchange-recorder.test.ts`.

**Interfaces:** extend `ChatModelUsage` with `reasoningTokens: number | null`; extend results with optional `generationId`, `servedModel`, `providerCostUsd`. Add `status: 'invalid_output'` to `ChatModelFailure` and allow `usage: ChatModelUsage | null` there. Unknown consumption stays `null`, not asserted zero spend.

- [ ] Write test for HTTP 200 with invalid completion JSON but valid `usage`: service must fallback **and keep spend**. Also test provider refusal, `finish_reason: length`, missing usage data and negative/non-finite numbers.

```ts
expect(result).toMatchObject({
  status: 'invalid_output',
  usage: { inputTokens: 1200, outputTokens: 80 },
});
```

- [ ] Parse usage metadata before content, distinguish HTTP error, invalid envelope JSON, invalid model output and timeout. Never copy error body containing request or credentials into logs.
- [ ] Add nullable exchange fields `generation_id`, `served_model`, `cache_read_tokens`, `cache_write_tokens`, `reasoning_tokens`, `provider_cost_usd`, and `delivery_source` (`provider`, `cache`, `shared`, `scripted`). `cost_eur` stays budget estimate; no implicit USD→EUR conversion.
- [ ] Keep `outputTokens` as total billable output: do not add `reasoningTokens` a second time. Keep configurable cache rates and current conservative fallback; no online value change.
- [ ] Run transport, recorder and cost tests, then `corepack pnpm typecheck`. Update collection notes and measurement docs.
- [ ] Suggested commit: `fix(chat): preserve usage for rejected model replies`.

**Migration:** fields added, old exchanges kept. Provision before API writes them; test migration on already provisioned local database.

## Task 3 — Compile and reuse publication context

**Files:** new `publication-context.ts` and its test; `prompt-builder.ts`, its test, `chat-service.ts`, `main.ts`.

**Interfaces:**

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

`Locale` from `@portfolio/content`. Contract starts at `cms-chat-v2`, incremented when rules, projection or schema change. Task 4 will add evidence catalog to this context; this task does not depend on that catalog yet.

- [ ] Write projection test verifying all kept fields, including unique scripted answer texts, case studies, dates, languages, links and sensitive policies. Test two publications with same slugs but different values, then rollback.

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

- [ ] Implement deterministic projection removing only the three answer fields decided above. Do not mutate `active.content`. Separate stable knowledge and variable history, without changing existing language detection.
- [ ] Implement announced LRU bounds; test eviction, FR/EN pair and entry over 2 MiB not retained. No accumulator of all past publications.
- [ ] Reuse context in service; keep `buildChatPrompt` as compatibility wrapper while callers change, then remove only unused code in this batch.
- [ ] Run `corepack pnpm --filter @portfolio/api test src/chat/publication-context.test.ts src/chat/prompt-builder.test.ts src/chat/chat-service.test.ts`.
- [ ] Measure bytes on small, large and no-scripted-answer corpora. Require projection without changing kept fields; do not require fixed 18% gain on all content.
- [ ] Suggested commit: `perf(chat): compile localized publication context`.

## Task 4 — Typed evidence and server-derived cards

**Files:** new `evidence.ts`, `evidence.test.ts`; `publication-context.ts`, `model-output-schema.ts`, `model-output-schema.test.ts`, `model-reply.ts`, `model-reply.test.ts`, `publication-identifiers.ts`, `prompt-builder.ts`; create `requested-utility.ts` and its test.

**Interfaces:**

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

`Block`, `PublicationContent`, `Locale` from `@portfolio/content`. Stable id within a publication: e.g. `experiences/<slug>/summary/fr`, or `projects/<slug>/caseStudy/en`. List item indices included for highlights. Publication stays separate from context/cache identity.

- [ ] Write tests for excerpt present but wrong source, absent excerpt, deleted source, wrong language, duplicate references and empty text. For `answered`, require at least one evidence; for other issues, normalize with CMS as today.

```ts
const sources = buildEvidenceSources(makeCmsCorpus(61, 'new-skill').active.content, 'en');
const byId = new Map(sources.map((source) => [source.id, source]));
expect(resolveEvidence([{ sourceId: 'missing', quote: 'CSV' }], byId)).toEqual({
  status: 'invalid_evidence',
});
```

- [ ] Bump contract to `cms-chat-v3-evidence` and add `evidenceSources: ReadonlyMap<string, EvidenceSource>` to compiled context.
- [ ] Build catalog from published fields and entity context. Resolution catalog stays server-side: do not add a second copy of texts to the prompt. Model receives knowledge already present and allowed field ids in schema, with convention spelled in rules. Keep employer/project relations and dates; do not flatten all numbers into one global list.
- [ ] Replace free `blocks`/`answerSlugs` in internal model contract with `evidence`. Keep `outcome`, `text`, `suggestions`, `sensitiveTopicSlug`. `sourceId` constrained by enum and each object closed. If no textual source exists, reply without call rather than fabricate empty enum.
- [ ] Validate exact excerpt match after Unicode NFC normalization only; no fuzzy match. Build at most two deduplicated cards from validated sources and `answerSlugs` from scripted-answer sources only.
- [ ] Direct cards: experience→`experience`, project→`project`, skill/capability→`skills`, figure→`key-figures`, scripted answer→`strengths`, profile→no automatic card. CV/contact actions cannot come from the model. `requestedUtility` inspects only last visitor message, normalized Unicode/punctuation/case, and requires whole phrase in small FR/EN lexicon: `cv`, `resume`, `curriculum vitae`, `your cv`, `votre cv`, `ton cv`, `send me your cv`, `envoyez-moi votre cv`; for contact: `contact`, `how can i contact you`, `comment vous contacter`, `comment te contacter`. Test that a project mentioning CV or old contact question triggers nothing. After sensitive topics and before model, produce explicit card with « Voici mon CV. » / « Here is my CV. », or « Vous pouvez me contacter via ce formulaire. » / « You can contact me using this form. », in scripted mode and without call. These texts are UI hints, not new candidate facts.
- [ ] Keep existing public `ChatReply`/`ChatResponse` contract: only backend-to-model contract changes. Add new normalization to service tests.
- [ ] Document limit: existing excerpt and coherent card do not prove every free sentence is supported or source is relevant. Quality evaluations still needed; no promise of general hallucination removal.
- [ ] Run evidence, schema, normalization, context and service tests; then `corepack pnpm typecheck`.
- [ ] Suggested commit: `feat(chat): derive reply cards from publication evidence`.

## Task 5 — Operational fallback without off-topic factual reply

**Files:** `chat-service.ts`, `chat-service.test.ts`, `generalization.test.ts`; create `operational-fallback.ts`, `operational-fallback.test.ts`.

**Interface:**

```ts
function createOperationalFallback(content: PublicationContent, locale: Locale): ChatReply;
```

- [ ] Write test where publication no longer contains company mentioned in history, model times out and another company has scripted answer on same theme. Require `unknown`, zero cards and no figure from other company.
- [ ] Write symmetric case for new Rust project with timeout: do not answer with old experience chosen by lexical proximity.
- [ ] Implement fallback with `chatSettings.unknownReply[locale]` and existing editorial suggestions, without evidence card. Apply to provider errors, invalid output/evidence, budget unavailable/exhausted, model limits and context too large.
- [ ] Keep sensitive topics before model and intentionally scripted replies (`model_disabled`) on existing path. Document this task targets operational errors, without claiming to resolve all scripted-engine ambiguity.
- [ ] Use `replyLanguageForRequest`, not only `request.locale`, to keep language of ambiguous follow-up.
- [ ] Run fallback, variable publication and service tests; verify refusal or sensitive topic never calls extra model.
- [ ] Suggested commit: `fix(chat): use a factual-safe operational fallback`.

## Task 6 — Call coordination and bounded exact cache

**Files:** new `response-coordinator.ts`, its test; `chat-service.ts`, `chat-service.test.ts`, `main.ts`, `exchange-recorder.ts`, settings readers/resolvers, schema/provisioning and CMS tests.

**Interfaces:**

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

`completed` also keeps valid `unknown`/`refused`/`sensitive` issues with CMS normalization; they are not cached. `rejected` marks admission refused without call and produces scripted telemetry. Internal `generationId` may be local UUID, distinct from optional provider number. It correlates deliveries of same compute and counts its consumption once. All imported types from prior tasks or repo.

- [ ] Write service tests: two identical questions→one call; different history→two calls; publication B→no hit from A; rollback A→reuse only if entry still exists and TTL valid; model/provider/effort/contract change→miss.
- [ ] Test visitor limits and sensitive topics before cache, disabled model or invalid settings without cached reply, allowed hit with exhausted provider budget, and global quota incremented only on new call.

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

- [ ] Implement LRU/TTL/bounds without global timer. Record pending entry synchronously before first `await`; remove pending in `finally`. Beyond 16 distinct computes, produce `model_busy` fallback without launching over-limit call. Only `completed` with `reply.outcome === 'answered'` is cached. Error is never cached or auto-retried.
- [ ] Check active publication after any generation/shared cache `await` and before delivery; on change, do not insert/serve old reply, return decided 503 response and keep real compute spend once.
- [ ] One exchange row per visitor: owner→compute cost, hit/join→zero additional cost and same compute id. Billed call with rejected output still counted once. Hits do not copy first visitor’s question or conversation id.
- [ ] Add nullable/default-false `response_cache_enabled` in settings, types, reader, resolver, definitions and CMS tests. Without cache, service keeps one call per request and same limits.
- [ ] Run coordinator, service and settings tests; local CMS integration for new fields. Verify memory counters and concurrency with mocked clock/fetch.
- [ ] Suggested commit: `perf(chat): reuse exact replies by publication and conversation`.

## Task 7 — Context and output bounds, CMS-configurable

**Files:** CMS and API settings, `chat-model.ts`, transport and tests, `chat-service.ts`, evaluation script, `.env.example` only if new variable needed (editable bounds stay in CMS).

- [ ] Add `max_input_bytes` (positive integer, default 65 536) and `max_output_tokens` (nullable for existing configs, positive integer when set). Do not use fixed character/token ratio to claim exact model context limit.
- [ ] Test body at bound, above bound and large schema: above, zero calls, `model_context_limit`, cautious fallback. Include schema and history in measure; do not truncate factual fields.
- [ ] Send output cap only when set, with provider parameter. Keep billed tokens when generation hits cap and fails to produce complete JSON.
- [ ] Test efforts recognized by model/provider. “Hide” must not mean “disable” reasoning; no unsupported effort sent silently by default.
- [ ] Run settings, transport, cost, context and service tests. Change no value currently configured in real CMS.
- [ ] Suggested commit: `feat(chat): bound model context and output from CMS settings`.

## Task 8 — Reproducible evaluation and acceptance criteria

**Files:** complete `api/scripts/evaluate-cms-corpus.ts` created in task 1, change `evaluate-chat.ts`, `docs/development.md`, `docs/architecture.md`; reports under `docs/evaluations/`.

- [ ] Add runner args `--model`, `--variant=baseline|optimized`, `--seeds`, `--output`, `--max-calls`. Use baseline checkout/snapshot kept in task 1 before production changes, with same corpus runner, dependencies and SHA. Add `--engine-dir` to run baseline and optimized version in two separate processes, via respective `createChatService` and same corpus JSON input. No key copy in snapshot, no baseline path in production engine. Outputs must be public contract and usage trace, not assumed common internal contract between versions.
- [ ] Verify exact free route and **all** its price categories, real quota and local cap of 60 attempts per run. No paid model or added search plugin/tool. Refuse incomplete configuration before first call.
- [ ] Use three development seeds and three other reserved seeds. Run same requests and histories for each variant, alternating order. Space call starts at least 3.2 s **before** inference timer start; separate quota wait, provider time and service time.
- [ ] Trace each attempt from start, even without headers or `usage`, to avoid incomplete probe counter. Keep report separating known/unknown costs, provider billing and CMS estimate.
- [ ] Disable response cache during generation comparisons; measure cache gains separately on declared repeat load. Report fallback outputs, not only HTTP 200.
- [ ] Evaluate fact associations, evidence/cards, corrections/deletions, language, ambiguities, contradictions and large corpus. Number presence score is not fidelity score. Keep human review of paraphrases and undecidable cases.

**Gates:**

1. Deterministic tests: 100% publication/cache/policy/cost invariants pass; no kept content changed by projection.
2. Cache: zero new call on hit and single compute on join; cost counted once; no A reply after B activation, including in flight.
3. Quality: no wrong company/figure, old evidence or card without evidence in reserved corpus; contradiction cases do not assert invented resolution. Otherwise batch stays disabled even if tokens drop.
4. Performance: publish input/output/cache, cost per valid reply, p50/p95 and fallback rate per corpus. Accept generation tuning only if it adds no fidelity error and does not worsen observed baseline timeout rate; noisy run needs confirmation before conclusion.
5. No fixed percentage gain promised before result. No paid test required to ship code; real paid provider validation stays separate explicitly requested operation.

**Checks at execution:**

```bash
corepack pnpm --filter @portfolio/api test
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm format:check
corepack pnpm test
corepack pnpm test:cms
git diff --check
```

CMS tests need local stack provisioned; do not point them at staging. `corepack pnpm test:e2e` required if public contract or visible reply branches changed, with root script configuring test build correctly. Commands listed here are planned, not run while writing the plan.

## Conditional extension — source selection for large corpora

Do not add a vector engine in the first batch. Context guard gives explicit limit. If several representative corpora exceed it, compare hot full context and local lexical index per publication/language, including sample questions and relations; widen search for summaries and follow-ups. Enable this path only after showing no omissions on reserved corpus. Hybrid selection and structured canonical metrics for contradictory publications then need their own plan.

## Proposed delivery and rollback

Split into reviewable changes: (1) regressions/consumption, (2) compact context, (3) evidence/fallback, (4) cache off by default, (5) bounds/evaluation. Each batch keeps site usable; internal evidence contract and validation ship atomically in same API batch.

Provision field additions before API binary uses them. Keep legacy fields and old data; no destructive migration. Disable cache via its setting to return to no-reuse path; image rollback clears memory caches. Model or content changes stay separate actions. Commit, push, PR, merge and delivery happen only in scope requested at that time.
