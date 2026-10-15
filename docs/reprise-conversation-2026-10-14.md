# Conversation engine handoff — portfolio

Latest decision: Haiku was explicitly chosen by the user and configured in the CMS. See the final section; earlier mentions of a pending choice are historical.

## Request and scope

Improve answers for the visitor using published CMS knowledge, beyond scripted replies. Sober, reliable answers. Keep the right panel visible as history grows. Test and keep this report. The last message explicitly allows tests and refinements, then commit, push, PR creation and merge after validation. No change to the CMS-configured model approved at this stage: one question was pending. Merge to main triggers staging automatically per existing CI; no manual production rollout requested.

## Checkout

Work in `portfolio/` of the `personal-hub/queenfish` hub, branch `fix/conversation-intent`, base `origin/main` at commit `cd45e1981d29843da5c5fbc193f2c8aaa17076fd`. The hub still pins the old portfolio `0859b70`: the pointer change in its status reflects the current checkout, not a delivery. Submodule `the-media` is also initialized, unchanged. Do not touch The Media.

## Diagnosis verified in code

- `api/src/chat/prompt-builder.ts`: only experience/project labels are sent; summaries, highlights, dates and case studies are missing. Scripted answers therefore dominate the context.
- `api/src/chat/openai-compatible-model.ts`: instructions, data and history are mixed in a single user message.
- `api/src/chat/model-output-schema.ts`: `blocks.items` is an object with no properties, sent with `strict: true`. Official docs require closed objects and required properties: <https://developers.openai.com/api/docs/guides/structured-outputs>. Risk of provider refusal and scripted fallback; not yet proof of deployed behavior.
- `site/src/components/chat/conversational-shell.tsx`: columns grow with the page; no independent scroll on desktop.

## Local changes

- `api/src/chat/prompt-builder.ts`: the full active publication, localized in the reply language, is sent with links between experiences, projects, skills and figures. History encoded as JSON; short follow-up language inherited from visitor messages. Targeted synthesis, clarification and uncertainty rules, without copying scripted answers.
- `api/src/chat/openai-compatible-model.ts`: instructions in a separate system message from data and conversation.
- `api/src/chat/model-output-schema.ts`: strict schema for eight card types; optional fields sent as null then normalized to the public contract. No required suggestions.
- `api/src/chat/model-reply.ts`: deduplication, at most two cards and two suggestions for model replies; unknown references always rejected. Budget limits, timeout, sensitive topics and fallbacks stay active.
- `api/src/chat/chat-service.ts`: same contextual language for prompt and normalized replies.
- `site/src/components/chat/{conversational-shell,conversation-log}.tsx`: on desktop, viewport-height area with history and right panel scrolling independently; input and header stay visible. The welcome panel can scroll on short screens too; that regression was found then fixed during review. Mobile keeps its vertical flow and inline cards.
- Related tests in `api/src/chat/` and `site/e2e/conversation.spec.ts`.

## Checks run on 14 October 2026

Dependencies installed via `corepack pnpm install --frozen-lockfile` (Node 24.14.0; use Corepack, global `pnpm` is version 9).

Regression tests observed failing before fix: missing knowledge in FR/EN, unstructured history, no system message, incomplete card schema, null fields rejected, forced suggestions, duplicates and follow-up language. Initial browser test found a panel at y = -2764 px after five turns.

Results after fix:

- `corepack pnpm test`: **422 tests** in 96 files pass, including 165 API and 115 site; includes CMS unit tests, provisioning and extension.
- `corepack pnpm typecheck`: all packages pass, including CMS integration test types.
- `corepack pnpm lint`: pass.
- `corepack pnpm format:check`: pass.
- `corepack pnpm content:seed` then `corepack pnpm build:site`: static export generated.
- `corepack pnpm --filter @portfolio/site exec playwright test e2e/conversation.spec.ts`: **16 tests pass** (desktop, long history, rereading old turns, welcome on 1280 × 600, mobile, FR/EN, keyboard, quick view without JavaScript, forms and local fallback). API calls are mocked in these tests.
- `git diff --check`: pass.

A targeted independent review found the short-screen welcome defect; after fix and a new browser test, it reports no blocker. Its temporary local server was stopped. Second review: no blocker in the product; two evaluation script defects fixed (wait for telemetry between calls and count follow-up failures). Publication authorized in progress.

## Observed remote state and limits

A GET on `https://api.portfolio-staging.apps.nyhasinavalona.com/health` returned `status: ok`, `directus: up`. Active publication `97365fcc-a2a4-4215-a853-e474d3ec95b9`: 7 experiences, 6 projects.

A test call to `/chat` (question « What concrete backend work have you done for Eurosport? ») answered **scripted mode**, with scripted reply `backend-apis`. That confirms behavior reported on existing staging; it does not prove the fallback cause. Fallback reasons are stored in `chat_exchanges`, not exposed in the public response.

**Update: real trials of the new code are in progress with the existing provider, without deploy or CMS configuration change.** Contract and browser tests verify data sent and the UI, not semantic correctness or real resistance to malicious instructions. Secrets stay in the staging API container environment: the evaluation script is bundled locally then run in memory via `docker exec -i ... node --input-type=module -`. No secret copied or printed. Integration with real local Directus (`test:cms`) was not run: no CMS schema, permission or provisioning change.

## Next steps to resume

1. Read this file, Git status and the PR for `fix/conversation-intent`; respect other changes if checkout moved. Final remote state must be rechecked on GitHub.
2. Before any demo, test the new engine with the actually configured provider and active publication: targeted question absent from scripted answers, follow-up « and the stack there? », compare two experiences, role fit with undocumented skill, invented figure, sensitive topic, role-change attempt, FR and EN. Check concise answer, relevant evidence, no invention, model mode and cost/latency.
3. If the real engine stays in scripted mode, read stored reasons and check CMS config, provider availability, schema, budget and timeout. Do not confuse operational fallback with comprehension failure.
4. Commit, push, PR then merge are now authorized. Use personal GitHub account via process-scoped GH_TOKEN, without changing global auth. Do not auto-record the hub pointer. Staging follows main automatically; do not launch production.

## Refinements and real diagnosis — second pass

Portfolio Staging connector tested read-only. Schemas `model_settings` and `chat_exchanges` read; configured model is `z-ai/glm-5.3-flash:free`, zero price and 10 s timeout. Recent exchanges fail with `model_http_404`. Current OpenRouter catalog does not contain that id. That is a confirmed cause of current scripted replies, independent of the new prompt.

`api/scripts/evaluate-chat.ts` exercises the real service, its active publication, budget and exchange recorder. It does not change settings; a test override must match a model currently free in the catalog. Cases cover precise question, follow-up, French, synthesis, undocumented skill, fake employer, role-change attempt, sensitive topic and legitimate AI project. Unexpected operational fallback fails the command.

First trials: Nemotron Super gives a relevant Visa Insight answer but nears timeout and adds undocumented UI control details; another case exceeds 10 s. Liquid 2.6B is rejected: generic answers, metrics attached to the wrong employer and unknown ids. Dots Note exceeded 10 s on both cases tried. These models are not declared reliable for demo based on these trials.

Refined instructions: explicit current question in the envelope, ban enriching a summary with assumed technical details, metrics attached to their source and suggestions only when knowledge can answer them. The UI discreetly signals API scripted replies, in addition to the already signaled local fallback.

## Latest results and publication

The JSON contract is now built from the active publication: allowed ids are enums, and card types that need empty collections are removed. Regression covered by tests. Transport actually uses this per-publication schema. The evaluation script waits for each cost write before the next call and stops if recording fails; a fallback follow-up also fails evaluation.

After refined instructions and dynamic schema, Liquid answers Euronews and Visa Insight more precisely, but still adds unsupported causal interpretation in coverage comparison. It is still not retained. No CMS model was changed. User authorization for a free replacement remains pending; do not treat silence as agreement.

Full local pass counts **422 unit tests**. Types, lint, format, Directus extension build and site build succeed. For 18 browser tests, use **`corepack pnpm test:e2e`**: the root command enables localhost tracking before build. An attempt with an ordinary build gave 17/18 (no localhost beacon, disabled by default), then the compliant command gave **18/18 tests passed**; that is not a tracking change.

To reproduce an evaluation, from `api/`, with a private `.env` already configured: `node --env-file=../.env scripts/evaluate-chat.ts [free-model] [specific-en,specific-fr,...]`. Without override, the CMS model and its prices are used. Override persists no configuration. JSON results need semantic review; zero code means operational path, not truth of all wording.

Staging follows main automatically; merge is not proof its delivery is finished. Production needs the separate manual workflow and is not requested here. The catalog-missing model remains an operational limit before showcase, independent of the code fix.

## Haiku configured and tested — 14 October 2026

The user explicitly asked to select Haiku and enter its values in the CMS. Update done via Portfolio Staging connector then reread:

- Model: `anthropic/claude-haiku-5.5`.
- Input price: **0.089326 EUR / million**; output: **0.446628 EUR / million**.
- OpenRouter source rates: 0.10 / 0.50 USD per million. ECB conversion on 14 October: 1 EUR = 1.1195 USD. These are euro cost estimates, without extra fees; do not confuse USD and EUR.
- Timeout: **10 000 ms**; monthly cap kept.
- CMS: <https://cms.portfolio-staging.apps.nyhasinavalona.com/admin/content/model_settings/1>.

The first public call still answered scripted: `model_http_400`. Targeted diagnosis from the container, without printing keys: Haiku’s Google route rejected an id enum associated with `type: [string, null]` (`Enum value aws does not match declared type`). Fix: typed `anyOf` alternatives for id and null, without mixing different type values in the enum. References stay limited to the publication; an optional empty collection produces no empty enum. Regression test observed failing then passing.

Corrected code was evaluated in memory against the real provider and active publication, with CMS settings and cost telemetry: **9 exchanges without operational error**, including **8 in model mode** and **1 sensitive topic handled on purpose without model**. Cases: targeted English question, contextual follow-up, French metrics, experience comparison, undocumented skills, fake employer, injection, sensitive topic and Visa Insight. Model call durations: about **3.1 to 7.6 s**. Euronews metrics are correctly distinguished; comparison notes missing Eurosport metric; role-change attempt refused. This remains a sample, not a general correctness guarantee.

Local checks for the fix: **166 API tests pass**, all package types and format pass. The compatibility fix must be published and delivered to staging before the public endpoint uses this schema; verify the following PR on `fix/conversation-intent`, its checks and automatic delivery, then retest `/chat`. No secret copied, no editorial publication, no production launch.
