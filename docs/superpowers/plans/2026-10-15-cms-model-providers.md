# Implementation plan — selectable model providers in the CMS

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Subagent-driven-development is an alternative only if delegation is explicitly selected. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Choose OpenRouter, Google AI Studio or OpenAI from the CMS, with saved model configurations and secrets on the server only.

**Architecture:** Add private editable profiles, select a single active profile from the existing singleton and route each request to an explicit adapter. Share HTTP transport, parsing and error handling when the contract is common; build each provider’s parameters separately. Engine optimizations stay independent via a provider/configuration identity.

**Tech Stack:** Current Node 24+/TypeScript/Zod/Directus stack, native `fetch`. No extra SDK or service needed for documented compatible JSON transport; revisit if required features are unsupported by an endpoint.

**Spec:** Initial connector request, [pricing research](../../ai-provider-pricing-2026-10-15.md), [engine plan](2026-10-15-cms-chat-optimization.md). Status: **proposed plan, not implemented**.

**15 October follow-up:** local implementation and checks finished; details in the [validation report](../../evaluations/2026-10-15-implementation-validation.md). Checkboxes below are the original plan; real trials, gain measurement, activation and suggested commits/deliveries stay separate and are not announced as done.

## Global constraints

- Same repo, base to verify, Node/Corepack version, TypeScript standards, Git scope and permissions as the engine plan.
- No secret, arbitrary API URL or publication access added to the CMS. No active provider/model changed online during development.
- Three direct providers: OpenRouter, Google AI Studio and OpenAI. Anthropic/Grok remain reachable via OpenRouter; their direct connector is not in this batch.
- No automatic fallback to another provider, especially paid. Unconfigured provider, incomplete profile or incompatible effort: cautious fallback, explicit reason.
- Selection applied under the existing 30 s settings cache, without site rebuild.
- Check official docs at implementation time: endpoints, capabilities and model names change. No “current” model name hard-coded as universal default.

## Configuration and compatibility decisions

Create `model_provider_profiles` (private collection): UUID `id`, `name`, `provider`, then existing model fields, input/output/cache prices, effort and timeout. Add `max_input_bytes`, `max_output_tokens` and `response_cache_enabled` if the engine batch is already integrated; otherwise add them in that later batch.

In `model_settings`, add `configuration_source` (`legacy`, `profile`, `disabled`, default `legacy`) and nullable relation `active_profile`. Studio shows “Current configuration”, with a readable profile selector `name · provider · model`. Once profile mode is chosen, changing only the active profile is enough to switch from Haiku/OpenRouter to Gemini or another saved model.

- `legacy`: keep behavior of `MODEL_API_BASE_URL`/`MODEL_API_KEY` variables and singleton legacy fields, for OpenRouter.
- `profile`: read only the active profile. Null relation → model disabled; invalid/inaccessible profile → fallback, **never** implicit return to legacy model.
- `disabled`: no call and no model response cache hit.

Local migration creates a profile from legacy values if no migrated profile exists, but does not change `configuration_source` or owner selection. Do not overwrite existing profiles on later provisions. Legacy fields remain for explicit rollback.

## Task 1 — Private profiles and settings resolution

**Files:** `cms/schema/src/records.ts`, `index.ts` if needed, `cms/provision/src/schema/collections.ts`, `relations.ts`, `definitions.test.ts`, `cms/provision/src/access/policies.ts`, its tests, new `cms/provision/src/settings/ensure-model-profiles.ts` and its test; `api/src/model-settings/model-settings.ts`, `directus-model-settings-source.ts` and their tests; `cms/tests/src/model-settings.test.ts`.

**Interfaces:**

```ts
type ModelProviderId = 'openrouter' | 'google-ai-studio' | 'openai';
type ResolvedModelProfile = ModelSettings & {
  profileId: string | null;
  providerId: ModelProviderId;
  configurationFingerprint: string;
};
```

`ModelSettings` is the existing type, extended by the engine batch if already integrated. Fingerprint covers read parameters and contract version, without API key. Branches `configured`, `disabled`, `invalid`, `unavailable` stay explicit.

- [ ] Write resolution tests for legacy, profile, disable, removed relation and edited profile. Verify two profiles of the same provider can save two distinct models.

```ts
expect(resolveModelSettings({ configuration_source: 'profile', active_profile: null })).toEqual({
  status: 'disabled',
});
```

For this test, define the read type discriminated by `configuration_source` first; do not bypass missing fields with a type assertion.

- [ ] Add collection, relation and fields, then idempotent provisioning. Reserve UUID `c4a040b6-e4a0-5b9a-8134-98be450983d2` for this migrated profile in provisioning and its tests; search that ID, not an editable name. Create nothing if legacy configuration is disabled or invalid. A second provision never modifies an existing profile.
- [ ] Owner: read/create/edit profiles and select active profile. API: read. Assistant: read only, like current settings. Anonymous: no access. Grant no extra access to secrets.
- [ ] Read singleton and linked profile in one relational query so old selection is not combined with new profile. Validate at Directus boundary, then resolve an immutable snapshot for the request.
- [ ] Verify response cache invalidation after profile/effort/price/provider change and 30 s delay; no settings read mid-generation.
- [ ] Run provisioning/resolution tests and local CMS access, migration and edit tests. Document Studio steps and keeping legacy mode.
- [ ] Suggested commit: `feat(cms): manage saved model provider profiles`.

## Task 2 — Credentials and server routing

**Files:** `api/src/environment.ts`, its test, new `api/src/chat/model-provider.ts` and its test, `api/src/main.ts`, `chat-model.ts` if needed, `.env.example`, `compose.yaml`, `deploy/compose.yml.j2`, `deploy/delivery_inputs.py`, its test, `.github/workflows/deploy.yml`, `docs/development.md`, `docs/delivery.md`.

**Interfaces:**

```ts
type ModelProviderCredentials = Partial<Record<ModelProviderId, { apiKey: string }>>;
type ModelRuntimeConfiguration = {
  credentials: ModelProviderCredentials;
  monthlyBudgetEur: number;
  dailyCallLimit: number;
  legacy: ModelProviderConfiguration | null;
};
type ModelProviderRegistry = {
  forProfile(profile: ResolvedModelProfile): ChatModel | null;
};
function createModelProviderRegistry(
  credentials: ModelProviderCredentials,
  fetchImpl: typeof fetch
): ModelProviderRegistry;
```

`ModelProviderConfiguration` is the current legacy type. Add `modelRuntime: ModelRuntimeConfiguration | null` to the environment during transition: null when no key nor legacy configuration exists; default budgets do not enable it. Callers then use this snapshot for global gates and registry. Fix bases on the server: OpenRouter `https://openrouter.ai/api/v1`, Google `https://generativelanguage.googleapis.com/v1beta/openai`, OpenAI `https://api.openai.com/v1`. Keep legacy URL only in the already configured legacy path.

- [ ] Write configured/unconfigured provider tests and changed selection. Zero network call if selected provider’s key is missing; no other provider’s key sent by substitution.
- [ ] Add optional secrets `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`. Keep `MODEL_API_KEY`/`MODEL_API_BASE_URL` for legacy mode; for an OpenRouter profile, accept its specific key or legacy key if base is OpenRouter’s. Reject base ambiguity.
- [ ] Decouple global budgets/limits from a single provider: an instance with only Gemini configured must use the same gates. Other providers’ keys may stay absent.
- [ ] Propagate secret names in Compose, workflow and delivery render, without real values or global auth change. Test environment with one provider at a time and with all three.
- [ ] Wire registry to each request’s profile snapshot. Expose non-secret `providerIdentity` to the engine for exact response key.
- [ ] Run `corepack pnpm --filter @portfolio/api test`, `corepack pnpm typecheck`, `python3 -m unittest discover -s deploy -p 'test_*.py'`; ShellCheck/actionlint only for shell/workflow files actually touched.
- [ ] Suggested commit: `feat(api): route model calls with provider-specific credentials`.

## Task 3 — Provider-specific parameters and errors

**Files:** `api/src/chat/openai-compatible-model.ts`, its test; new `api/src/chat/provider-parameters.ts`, `provider-parameters.test.ts`; `model-provider.ts`, `model-settings.ts`, evaluation scripts.

**Interface:**

```ts
function createProviderParameters(
  providerId: ModelProviderId,
  request: ChatModelRequest
): Record<string, unknown>;
```

- [ ] Write payload snapshots from Zod-parsed objects, with mocked fetch; test requested model, auth, exact schema, timeout and output cap.

```ts
expect(openAiBody).not.toHaveProperty('session_id');
expect(openAiBody).not.toHaveProperty('reasoning');
expect(geminiBody).not.toHaveProperty('session_id');
expect(openRouterBody.session_id).toBe(request.sessionId);
```

- [ ] OpenRouter: keep `session_id`, its `cache_control` breakpoint and `reasoning` parameter. Respect chosen model capabilities/efforts; disabling reasoning is not just hiding its display.
- [ ] OpenAI: text system message without Anthropic `cache_control`, no OpenRouter fields, effort in official `reasoning_effort` format, strict JSON Schema; adapt output cap name to actually supported model. Check refusals and truncations without losing usage.
- [ ] Gemini: official compatible endpoint, text system and JSON Schema, no OpenRouter fields. Map efforts per model capabilities. A mandatory-reasoning model must not get a « none » promise; profile is invalidated or minimal effort is explicitly chosen by the owner.
- [ ] Do not introduce a perishable table of all models in code. Check capabilities at configuration/evaluation; keep explicit errors if configuration becomes incompatible.
- [ ] Share timeout, HTTP, parsing, refusals, usage and output errors. Test 400, 401, 429, 5xx, timeout, incomplete body, invalid JSON, zero free cost and non-conforming output; no retry chain or paid fallback.
- [ ] Run transport, parameters and registry tests; typecheck and format. Tests do not call real services.
- [ ] Suggested commit: `feat(chat): adapt structured requests for Gemini and OpenAI`.

## Task 4 — Validation and proposed delivery

- [ ] Test an already provisioned local database: profile add, second provision without duplication, old mode unchanged, profiles editable by owner only, explicit disable and removing active profile.
- [ ] Verify via service a profile change with caches: no OpenRouter reply reused after Gemini or OpenAI selection; no duplicated cost on hit/join.
- [ ] Run repo checks: `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm format:check`, `corepack pnpm test`, `corepack pnpm test:cms`, `git diff --check`. Verify delivery render after optional secrets added.
- [ ] Use the engine-plan-independent corpus for explicitly requested real trials. OpenRouter free only by default; Google/OpenAI mocked until real budget authorized. A green mock does not prove credentials or real account compatibility.
- [ ] For a later authorized delivery: provision collections and permissions before API, server keys installed before profile selection, keep legacy mode until validation. Selecting a new provider in the CMS remains a separate action.
- [ ] Rollback: set `configuration_source = legacy` explicitly, then restore image if needed; do not delete profiles or legacy fields. Image rollback clears in-memory caches.

## Order with the engine plan

Profiles/credentials can be implemented separately from compact context. Evidence and normalization stay common across all three providers; do not copy the engine per provider. After integration, a CMS selection must atomically change identity, model, prices and parameters used in billing and in the cache key. Do not stack provider, model and prompt changes in one comparative measure.
