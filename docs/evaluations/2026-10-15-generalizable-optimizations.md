# Engine optimizations for an evolving CMS

Research and trials on 15 October 2026. No engine, CMS setting or deploy change. Implementation ideas below remain to be validated; unmeasured gains are not claimed as done.

## Conclusion

The best first batch is to **prepare context once per publication, drop metadata useless for inference, reuse strictly identical replies and build cards from evidence**. These rules depend on schema and publication, not staging names or figures.

Simple prompt reduction did not show better reliability. New trials also exposed two generic limits: ids may exist without being relevant to the answer, and fallback to a scripted answer may answer another company’s topic. Those must be fixed before choosing a free model for content quality.

The generalizable scope is portfolio-schema content in supported languages. Unlimited text or contradictory claims in the CMS need extra rules; no model guarantees both cost and latency constant across all volume or every question.

## Current measurements

Code inspected: `origin/main` and staging API container at commit `7eb2faaf65a44777556adddc1ceeae5f2997a1cc`. Publication measured: `97365fcc-a2a4-4215-a853-e474d3ec95b9`.

- Context is already localized in French or English. The system message is stable across conversations in the same language and already contains a cache breakpoint; `session_id` is sent. Budget is already cached 60 seconds and settings 30 seconds: those are not new optimizations to add.
- The full publication is sent on every question. Scripted answers are about 56% of localized knowledge bytes; they include sample questions and display cards.
- Removing only `answers[].sampleQuestions`, `answers[].blocks` and `answers[].starter`, other fields stay exactly the same. Reduction is **17.83% of input bytes in English**, **18.26% in French**, schema and instructions included. No AI summary, removal of factual text, link, title or editorial description in this projection. Examples stay in the CMS and for possible local search.
- Historical sample of the last 50 recorded Haiku exchanges: medians of **15 439 input tokens**, **562 output**, **4 589.5 ms** service duration. That is not a controlled comparison; recorded costs are application estimates.
- Rates `cache_read_price_eur_per_million` and `cache_write_price_eur_per_million` are still `null`. Current calculation then substitutes normal input rate. If the provider serves hits or bills writes, this estimate does not follow their distinct rates. That establishes neither absence of hits nor real invoice savings.

Details are in [JSON measurements](2026-10-15-optimization-measurements.json). Byte percentages are not demonstrated percentages of tokens, invoice or latency; they will change with content.

## Trials off staging content

Four synthetic publications valid per `validatePublicationContent`, each tried with current prompt and compact projection, on free Dots with `reasoning.effort: none`. Synthetic data and exchanges stay in memory; no synthetic publication or telemetry written to Directus. Service, dynamic schema and normalization are from the container. Budget is simulated as “available” and rates zero: this trial does not validate real budget.

| Case                               | Check and result                                                                                                                                                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New companies                      | Aster Labs: 18 → 47%, Beryl Studio: 6 → 81%. Current prompt assigns figures correctly; compact expires.                                                                                                           |
| Corrected figure and stale history | Aster goes to 63 → 91%, while old assistant still says 18 → 47%. Both variants give new values.                                                                                                                   |
| Deleted source                     | Aster disappears from publication but stays in history. Current prompt returns `unknown`. Compact expires and fallback answers with Beryl figures: off-topic reply.                                               |
| New skill and distractors          | Add Meridian project, Rust CSV analyzer, with twelve extra companies. Compact describes Rust/CSV correctly but cites Aster/Beryl answers and shows CV; current prompt expires and fallback answers Aster’s topic. |

Eight variants run: five model replies, three timeouts. Only pair with returned consumption both sides: corrected figure, **2 746 → 2 622 input tokens**, i.e. **−4.52%** for that case. No general fidelity or latency gain shown. This probe’s durations include anti-rate-limit spacing and are not a production benchmark.

Initial oracle checks number presence, absence of old values and expected project; alone it does not prove correct figure-to-company association. Independent human read verified outputs. A future oracle must verify per-entity associations and evidence, not only word or number presence.

[Detailed traces](2026-10-15-generalization-results.jsonl). Final instrumentation field `attempts: 7` counts its seven available HTTP traces, not the eight variants run; one timeout without response missed that trace. The eight `kind: case` results govern attempt count.

Free counter went from 967 to **961 requests remaining**; OpenRouter daily spend stayed exactly unchanged. No paid inference call was launched.

## Recommended first batch

### 1. Compile faithful context per publication

Build a deterministic representation at publication activation or first use: texts in chosen language, ids, relations, dates and figure scopes. Apply the conservative projection measured, without replacing facts with generated summary or removing all scripted answers: they may hold unique facts.

Reuse context and schema by `(publicationId, language, contract version)` with bounded memory. A new publication builds new entries; rollback finds its publication’s immutable facts. This prep reduces repeated local work. Inference gain comes from what is actually omitted from the prompt, not server memoization alone.

### 2. Reuse strictly identical replies

Short application cache, size-bounded, after reply validation. Key: publication, effective language, full history, question, model/provider, generation parameters and rules/schema versions. Do not use only the last message or semantic similarity: « and there? » depends on context. Apply visitor limits and sensitive-topic policy before reuse.

New publication, deletion or policy change invalidates the key. Merge identical concurrent requests into one call. On hit, no new call or inference token; record hit and zero additional cost, without copying initial cost. Infrastructure keeps its cost. Global gain depends on repeat rate, still unknown.

OpenRouter also offers beta response cache on full request body; an explicit application key eases publication and accounting control. Do not stack caches without observability. [Official response caching](https://openrouter.ai/docs/guides/features/response-caching)

### 3. Link replies, evidence and cards

Return sources used with collection, id, field and exact excerpt. Verify those references in the current publication, then build cards server-side from those sources. That stops a project answer from freely producing a CV block or evidence from another company, and lightens the card contract given to the model.

Valid reference and exact excerpt do not prove the whole reply is supported or answers the question. For information needing strict fidelity, prefer extractive rendering or server-computed structured values; free natural text keeps semantic risk. Do not add a second “judge” call on every reply without showing benefit and cost.

Native Anthropic citations are not compatible with strict Structured Outputs; application references fit the shared JSON transport. [Citations documentation](https://platform.claude.com/docs/en/build-with-claude/citations)

### 4. Make fallback cautious

Provider timeout or error must not trigger a factual answer from another company on word proximity alone. When scripted answer evidence does not cover the request, return a limit message or clarification. The deletion case above must become a regression independent of company names.

This improvement avoids misleading replies and useless retries. It does not turn absence of answer into success and does not guarantee a higher complete-reply rate.

### 5. Measure cost and steer reasoning

Keep input tokens, cache read/write, output, reasoning when available, provider cost, actually served model, application hit and latency. Align CMS rates with real categories, especially before using the estimate to block budget.

Haiku 5.5 bills standard input $0.10/million, cache reads $0.01, 5-minute writes $0.125 and 1-hour $0.20 under long-context threshold. Read is ten times cheaper on concerned tokens, not on the whole invoice. [Official rates](https://platform.claude.com/docs/en/models/haiku-5-5/overview)

Do not systematically replace the current five-minute TTL with one hour: measure intervals and hits. Also measure disabled/low reasoning and a reasonable output budget per model, counting truncations. Hiding reasoning with `exclude` does not remove its computation; too low a budget can block JSON output. [OpenRouter cache](https://openrouter.ai/docs/guides/best-practices/prompt-caching), [reasoning](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens)

## When the CMS grows

Define a context budget per model, with output reserve. While compact content fits comfortably, keep full cachable context: variable non-cached excerpts can cost more. [Full context and retrieval](https://www.anthropic.com/engineering/contextual-retrieval)

If volume justifies it, add a local lexical index rebuilt per publication, also using sample questions removed from the prompt. Include linked sources, entity inventory and follow-up context. Summaries must be able to widen selection. A missed source never proves a skill is unpublished. Compare hybrid search only if paraphrases/languages show omissions; no vector DB or embedding cost imposed upfront.

Facts may repeat across experiences, projects and scripted answers. If an edit leaves contradictory values in the same publication, compaction and search do not fix it. Structured metrics tied to a canonical source, or asking for clarification, beat arbitrary value picking.

## Durable validation

Create generated corpora from the schema, with varying names, ids, figures and relations. The evaluation set must include: corrections, deletions, new skills, line permutation, distractors, large corpus, empty collections, contradictions, language change and old histories. Reserve unused corpora for rule tuning.

Verify separately: per-entity fidelity, evidence/card relevance, replies to missing evidence, cache invalidation, call count, invoice, tokens and p50/p95 latencies. Lower average cost must not hide more fallbacks or false replies. Cache/invalidation tests must go through the module’s public engine; real model evaluations stay separate from deterministic tests and are explicitly run on free models for no-budget trials.

Proposed build order: **versioned projection and prep → exact cache and metrics → evidence/cards and fallback → variable evaluations → reasoning tuning → retrieval under volume constraint**. No “always faster” promise: accept an optimization after measuring its cost and regressions across several contents.
