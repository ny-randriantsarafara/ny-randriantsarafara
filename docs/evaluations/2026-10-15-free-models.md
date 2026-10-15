# OpenRouter free model evaluation — 15 October 2026

## Proposed decision

The **1 000 free requests per day quota is enabled** on the account used by staging. Trials increased no spend: **39 attempts**, **33 requests counted** by the free counter, **967 remaining**. OpenRouter daily spend is identical before and after; all 21 complete inference responses expose `usage.cost = 0`.

For free technical trials, **Liquid** is the fastest candidate tested and **Dots with `reasoning.effort = none`** also completes the full path. Neither reaches enough documentary fidelity in this sample to replace Haiku for a content demo. Accepted JSON does not prove facts are correct.

**No CMS setting was changed.** After trials, staging keeps `anthropic/claude-haiku-5.5`, default effort and 10 000 ms timeout. No deploy or Haiku inference call during this evaluation.

## Protocol and limits

- Engine actually present in the staging API container, image from commit `7eb2faaf65a44777556adddc1ceeae5f2997a1cc`. Run `api/scripts/evaluate-chat.ts` in the container; secrets stay in its environment.
- Active publication: `97365fcc-a2a4-4215-a853-e474d3ec95b9`. Replies were reread against its experiences, projects and published answers, with a second independent read.
- Same prompt, JSON schema built from published ids, local validation, budget and exchange recording as the service. Provider timeout of 10 seconds stays active.
- Path: Eurosport migration in English, contextual follow-up, Euronews metrics in French, Euronews/Eurosport comparison, undocumented Rust/Kubernetes, fake Google employer, injection, sensitive salary, Visa Insight. Follow-up runs only if the first model reply succeeds. Sensitive case is handled before the model and is not scored.
- First pass with default parameters. Second pass: two targeted questions with Dots `none` and Nemotron `low`. Then other Dots `none` cases; that profile therefore covers the same eight calls as Liquid, in two runs. Gemma: two questions, then an isolated retry after other trials.
- Temporary instrumentation checks `:free` id, all announced prices at zero and no fallback model or added tool. For `none`/`low` profiles, only the reasoning parameter is replaced in memory in the test request; nothing persisted in settings.
- Durations are service times, including Directus budget read among others. They are neither time-to-first-token nor browser measures. Instrumentation may observe HTTP 200 headers before body read expiry: the service’s final result governs.

## Operational results

“Accepted” means `mode: model` with output validated by the engine, including normalized `unknown`/`refused` outcomes. That is not a truth score. Medians over all calls launched for the profile, errors included.

| Model                                    | Effort  | Accepted / calls | Median service duration | Failures                           |
| ---------------------------------------- | ------- | ---------------: | ----------------------: | ---------------------------------- |
| `liquid/lfm-2.5-2.6b:free`               | Default |            8 / 8 |                  4.94 s | No operational failure             |
| `dots-studio/dots-3-note-preview:free`   | Default |            4 / 8 |                 11.89 s | 4 timeouts                         |
| `dots-studio/dots-3-note-preview:free`   | `none`  |            8 / 8 |                  6.75 s | No operational failure             |
| `nvidia/nemotron-3-super-120b-a12b:free` | Default |            1 / 7 |                 12.52 s | 6 timeouts; follow-up not launched |
| `nvidia/nemotron-3-super-120b-a12b:free` | `low`   |            0 / 2 |                 12.50 s | 2 timeouts                         |
| `google/gemma-4-31b-it:free`             | Default |            0 / 3 |                  5.50 s | 3 HTTP 429                         |
| `google/gemma-4-26b-a4b-it:free`         | Default |            0 / 3 |                  3.18 s | 3 HTTP 429                         |

Gemma retries name `Google AI Studio` as the error source, with no `Retry-After` or detailed cause. The account’s daily quota remains available; the precise upstream limit cause is not established. No conclusion on their quality or real JSON compatibility here.

Timeouts sometimes push service duration past the site’s 12 s wait. An reply accepted by this script is therefore not proof it would display in the browser.

## Quality observed after normalization

### Liquid

All four Euronews metrics are correct, but the model then claims initial TypeScript coverage is lower than overall coverage: **20% is still above 5%**. It also speaks of « your period » when it should answer as the candidate.

The Eurosport follow-up adds full cross-database consistency checks and assigns a broader AWS list to that role than published contextual items. Double run is documented; those full checks are not. Visa Insight becomes a technical audit trail and trust guarantee, beyond the evidence-linked workspace to source texts actually published.

The synthesis is long and uses Markdown despite concise plain-text rules. Several replies omit evidence cards. Raw card duplicates are removed by the engine.

### Dots

With default effort, the English migration answer contains Chinese characters and claims simultaneous dual writes and rollback capability not documented.

With `none`, French figures are correct and all eight calls succeed, but additions remain: frontend/backend scope of coverage, traceability/reproducibility guarantee for every Visa Insight change, consistency validation before cutover. The synthesis also suggests a question mixing French and Chinese. All five `answered` replies of this profile return a CV card, poorly relevant to requested evidence.

### Nemotron and protections

Nemotron’s only complete reply correctly separates missing published evidence from missing Rust/Kubernetes experience. Other calls do not allow judging fidelity.

Texts for `unknown`, `refused` and `sensitive` issues are replaced by CMS intended replies. Their safe wording must not be attributed to the model. No salary was asked of the provider: the sensitive case was intercepted by the engine.

## Recommended usage

To avoid spend during automated tests, keep mocked replies and deterministic tests; add free trials as an occasional real check of connectivity, contract, budget and fallback. Availability swings must not make all CI depend on a free model.

For exploratory staging, Liquid is the first technical candidate for latency; Dots `none` is an alternative, with higher latency and language/card defects. Such selection must stay explicit and does not validate text fidelity. To evaluate fidelity, the question set and gaps above must stay visible.

The 1 000 requests are shared across free models, with an official limit of 20 per minute. Available quota does not guarantee provider capacity. Active values were reread via `GET /api/v1/key`. Sources: [OpenRouter limits](https://openrouter.ai/docs/api/reference/limits), [official catalog](https://openrouter.ai/api/v1/models), [structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs), [reasoning](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens).

## Traces

[Detailed JSONL results](2026-10-15-free-models-results.jsonl): profiles and timestamps, provider outputs without internal reasoning, normalized replies, latencies, errors, returned costs and account state before/after. No secret included.

Sample limited to one trial window, no contemporary paid comparison, no load test or browser validation. These results do not guarantee future behavior of models or their free routes.
