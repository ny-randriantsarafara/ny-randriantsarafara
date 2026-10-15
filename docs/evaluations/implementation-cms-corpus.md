# Corpus and isolated baseline — local implementation on 15 October 2026

Snapshot `/tmp/portfolio-baseline-ZYPpuK` comes from `git archive 7eb2faaf65a44777556adddc1ceeae5f2997a1cc`, before engine changes. It contains only tracked files from that commit, with links to local dependencies; no secret was copied. This temp directory is not a durable artifact shipped with Git.

The shared runner loads each engine in a separate Node process. It receives publication and conversation JSON, calls its `createChatService`, passes the schema produced by that engine to its own transport and keeps the public reply and exchanges. It does not impose a common internal JSON contract across both versions. Response cache is disabled and each scenario uses a fresh process.

## Deterministic run performed

```sh
node api/scripts/evaluate-cms-corpus.ts --engine-dir=/tmp/portfolio-baseline-ZYPpuK --engine-sha=7eb2faaf65a44777556adddc1ceeae5f2997a1cc --variant=baseline --offline --seeds=7 --output=/tmp/cms-baseline-offline-isolated-complete.jsonl
```

Six scenarios finished with no network call. Injected transport simulates a timeout. For a question about `company-7-a`, the baseline notably provides `Coverage at company-7-b: 94%.` and a card for that other company. Service regressions now require `unknown` fallback, with no card. That shows the fallback defect, not quality of a real generation. The baseline does not implement the new contract’s evidence invariant; it cannot be declared verified from this trace.

## Reproduction and review

Use three development seeds by default (`7,23,61`); `--held-out` selects the three reserved seeds (`101,137,193`). Each seed covers correction, deletion, new Rust project, empty collections and published contradiction. The oracle ties value, field and entity; it does not score simple number presence. Contradictory text deliberately has no certain expected fact.

With `--compare-engine-dir=/path/other/engine`, the runner alternates order of the two variants each scenario, with exactly the same inputs. Each attempt is written before transport and includes failures with no usage. The cap is 60 attempts, and network starts are spaced 3.2 seconds before timing in the child. Traces separate wait, provider time and service time. Offline mode does not artificially wait between simulated timeouts.

Human review is still required for paraphrases, company relations, language, ambiguities, contradictions and card relevance. Internal references are not in `ChatResponse`; evidence unit tests and content review complement these traces. No automatic semantic implication score is claimed.

## Cost guard and limits

Real mode requires an exact `:free` route, all price categories explicitly zero, authentication and sufficient free request quota. Monetary balance or `usage_daily` in dollars does not prove request quota. The guard requires authenticated field `free_model_daily_requests` (`used`, `limit`, `remaining`) documented by [OpenRouter](https://openrouter.ai/docs/api/reference/limits). It refuses a response without that counter, an inconsistent counter or remaining below requested budget. That counter must not be inferred from `is_free_tier`. No workaround, paid model or provider fallback is used.

Missing provider costs stay unknown. A zero CMS rate is not proof of zero provider invoice. No real comparison of tokens, cost, p50/p95, timeout or model quality was run during this implementation; no performance gain is claimed. Repeated cache measurement and large corpus remain separate validations, not covered by this first timeout trace.

## Additional local checks

Targeted batch `generalization.test.ts`, `corpus-engine.test.ts` and `evaluation-safety.test.ts` passes: 15 tests (including full timing check). An offline comparison of both engines finished on the six mutations of seed 7 (`/tmp/cms-paired-offline.jsonl`). Injected timeout durations are not inference measures and justify no performance conclusion. Optimized returns `unknown` with no card for operational errors; baseline may return another company’s scripted answer.

`--locale=fr` adds a final French question while keeping stale history; `--large` adds published prose to stress the byte limit without removing facts. `node api/scripts/summarize-cms-evaluation.ts /path/trace.jsonl` computes distributions and known/unknown totals separately per variant. Cost per faithful reply awaits human review.
