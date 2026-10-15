# Local validation of CMS engine and providers — 15 October 2026

Implementation in `portfolio`, branch `feat/cms-chat-optimization`, from `7eb2faaf65a44777556adddc1ceeae5f2997a1cc`. No commit, push, deploy, remote CMS setting or server secret installed.

## Deliverable changes

- Private profiles for OpenRouter, Google AI Studio and OpenAI, atomic selection in the CMS, legacy mode kept and explicit disable. Separate secrets per provider, fixed endpoints, no retry or automatic paid fallback.
- Localized context compiled per publication, projection without altering kept facts, evidence contract and server-derived cards. Operational `unknown` fallback with no approximate factual card.
- Exact bounded cache, off by default, concurrent call coordination, publication check before delivery. Usage and cost of one generation counted once; unknown consumption kept at `null`.
- CMS input/output bounds, unchanged model timeout, global budget and quota kept. Synthetic corpus independent of staging and isolated runner with free preflight and strict cap.

## Checks run

| Check                                                   | Result                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| `corepack pnpm typecheck`                               | Pass in all packages                                         |
| `corepack pnpm lint`                                    | Pass                                                         |
| `corepack pnpm format:check`                            | Pass                                                         |
| `corepack pnpm test`                                    | Pass, API/site/content/chat/CMS/provision/extension suites   |
| `corepack pnpm test:cms`                                | 74 tests pass against local Directus/PostgreSQL              |
| `corepack pnpm test:e2e`                                | Site build and 18 Chromium tests pass                        |
| `python3 -m unittest discover -s deploy -p 'test_*.py'` | 13 tests pass                                                |
| `actionlint .github/workflows/deploy.yml`               | Pass, temporary actionlint 1.7.12, with ShellCheck available |
| `git diff --check`                                      | Pass                                                         |

The local database was first provisioned with baseline code, then upgraded and provisioned once more. A complementary trial confirmed single copy of a valid legacy model, keeping a profile later edited and no automatic selection. CMS tests verify owner edit, forbidden assistant/anonymous access and removing the active profile disables the model.

Review fixed two more defects: completion timing until body receive/parse and dropping a cached reply if publication changes between validation and delivery. Associated regressions pass. Runner test starts six Node processes; its test timeout is separate from the ten-second model timeout.

## Real validation still separate

Google/OpenAI/OpenRouter transports were tested with mocked HTTP, no real inference during implementation. That does not validate credentials or real account capabilities. Evidence validation establishes source membership and excerpt presence; it does not prove semantic implication of every generated sentence.

The [corpus report](implementation-cms-corpus.md) describes the isolated baseline, offline traces, reserved seeds and required human review. Injected timeouts demonstrate fallback invariants; they do not measure model quality or real p50/p95. No fidelity or savings percentage is claimed. Cache activation and online provider change remain later operations.

For an authorized delivery: provision collections/fields/permissions before the API, install keys server-side only, keep legacy mode until validation then explicitly select the profile. Cache stays false by default. Rollback via `configuration_source = legacy` or `disabled`, without deleting profiles or legacy fields.
