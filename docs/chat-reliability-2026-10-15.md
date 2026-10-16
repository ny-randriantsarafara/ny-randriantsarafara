# Chat reliability — 15 October 2026

Technical follow-up to the portfolio audit of 15 October 2026 (technical parts of problems P03–P06 and P14–P18). Branch `fix/chat-reliability`, based on `main` at `86d434ad7239`, the commit staging runs. Nothing here was deployed, no Directus content was written, and the model, providers and budget settings are unchanged. The response cache was reviewed, not enabled. Editorial and static texts were inventoried, not rewritten.

Each finding carries one label:

- **Observed**: measured on staging or in a browser on 15 October 2026.
- **Code**: confirmed by reading or testing the code on this branch.
- **Hypothesis**: consistent with the evidence, not proven.
- **Inaccessible**: not verified; the reason is given.

## Staging on 15 October 2026

| Item                       | Label        | Finding                                                                                                                                                                                                                               |
| -------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deployed commit            | Observed     | GitHub deployment of `main` `86d434ad7239` to `nonprod` succeeded at 19:56:47 UTC.                                                                                                                                                    |
| Site → API wiring          | Observed     | Site CSP `connect-src 'self' https://api.portfolio-staging.apps.nyhasinavalona.com`; browser requests go to the staging API, not the production default.                                                                              |
| API health                 | Observed     | `GET /health` 200 with `Access-Control-Allow-Origin`; active publication `97365fcc-a2a4-4215-a853-e474d3ec95b9`.                                                                                                                      |
| Preflight                  | Observed     | `OPTIONS /chat` 204 with `Access-Control-Allow-Origin`.                                                                                                                                                                               |
| `POST /chat` response      | Observed     | 400 `{"error":"invalid_request"}` for an empty body, without `Access-Control-Allow-Origin` (23:31 UTC). Reproducible without a model call, see below.                                                                                 |
| Chat in a browser          | Observed     | Chromium on the staging site, before the fix: the API processed `/chat` in about 4.3 s (a billed model call), the browser refused to read the response, and the site showed "Answered locally while the chat service is unavailable". |
| Audit's local answers      | Hypothesis   | The audit saw only local answers. The CORS defect explains it for every cross-origin `POST`; without the API logs of that window it stays unproven.                                                                                   |
| Model settings             | Inaccessible | Studio was not read. The audit recorded `anthropic/claude-haiku-5.5`, `legacy` source, 10 000 ms timeout, `max_output_tokens` empty, cache off; those values are inherited, not re-verified.                                          |
| API logs, `chat_exchanges` | Inaccessible | Not read: they contain visitor questions.                                                                                                                                                                                             |

CORS reproduction, no model call:

```sh
curl -si -X POST https://api.portfolio-staging.apps.nyhasinavalona.com/chat \
  -H 'Origin: https://portfolio-staging.apps.nyhasinavalona.com' \
  -H 'Content-Type: application/json' --data '{}' | grep -i '^access-control' || echo 'no CORS header'
```

## Request path

```text
Visitor
└─ ConversationalShell (site)            reducer: pending → reply; no state waits forever
   └─ sendChatMessage                    12 s AbortController covers the request and the body
      ├─ network | timeout | http | contract ──► degradedReply on the site (failure kept)
      └─ POST /chat (Hono: CORS headers set after the handler, body limit)
         └─ chatService.handle
            ├─ request contract (zod)            invalid ──► 400
            ├─ active publication                none ──► 503
            ├─ visitor limits                    exceeded ──► temporarily_unavailable
            ├─ scripted matcher                  focus, follow-ups, clarification
            │   └─ sensitive topic ──► scripted reply; CV/contact request ──► utility card
            ├─ model mode, settings, provider    disabled ──► scripted reply
            │                                    unusable ──► degradedReply
            ├─ input bytes, budget reservation, daily limit, deadline left
            │                                    refused ──► degradedReply
            ├─ response coordinator              cache off by default, ≤ 16 pending
            ├─ provider call                     timeout = min(setting, deadline left)
            │                                    error, timeout, refusal ──► degradedReply
            ├─ schema → quotes → identifiers → claims → selectBlocks
            │                                    rejected ──► scripted reply, reason recorded
            ├─ publication still active          no ──► 503
            └─ exchange recorded (question redacted) ──► JSON reply
      └─ chatResponseSchema ──► ConversationLog + BlockRenderer
```

`degradedReply` (in `@portfolio/chat`) is the single rule for both sides: a confident published answer is served; a local `unknown` becomes `temporarily_unavailable`, because without the model it says nothing about what the publication contains. A model output rejected by the server is different: the model was reached and the publication did not support its claims, so the scripted reply is served as is, `unknown` included.

## Confirmed problems

### 1. Every chat response was unreadable cross-origin

- **Observed / Code.** `api/src/http/cors.ts` set headers on the Hono context before `next()`. The chat and error handlers return a raw `Response`, which carries only its own headers. Preflight and `GET` routes were unaffected, which hid the defect.
- **Effect.** Each visitor message was billed on the server and answered locally on the site.
- **Fix.** Headers are applied after `next()` with `context.header()`, which Hono copies onto the returned response. Returning a new `Response` from the middleware after `next()` is ignored by Hono's composition; the tests caught that variant.
- **Tests.** `api/src/http/cors.test.ts`, `api/src/http/public-app.test.ts` (raw responses, errors, disallowed origin). Checked in Chromium against a local cross-origin server before and after.

### 2. The server could answer after the site stopped waiting

- **Code.** The model timeout (up to 10 s from settings) ran after publication, settings and budget reads, against the site's 12 s wait. Staging replies of about 9 s and 6.5 s were measured earlier the same day; the raw output was not kept.
- **Fix.** `chat-service.ts` gives the provider `min(configured timeout, 12 000 − 1 000 − 500 − elapsed)` ms, and falls back without a call below 1 s (`reply_deadline`). `CHAT_CLIENT_TIMEOUT_MILLISECONDS` is shared through `@portfolio/chat`. Provider parameters are unchanged.
- **Tests.** `api/src/chat/chat-service.test.ts` (deadline cases); `site/src/lib/chat/__tests__/send-chat-message.test.ts` (timeout).

### 3. An incident looked like missing information (P14)

- **Code.** Operational failures returned the CMS `unknownReply` ("I haven't written an answer…"); the site's local fallback replayed any matcher reply with the same notice.
- **Fix.** Two outcomes are added to the contract: `clarification_required` and `temporarily_unavailable`. The site classifies failures as `network`, `timeout`, `http` or `contract`, keeps the reason on the turn (`data-fallback`) and logs `Chat API failed (<failure>); answered locally.` with `console.warn`. The provenance notice only accompanies answers; an unavailability or clarification text speaks for itself.
- **Tests.** `send-chat-message.test.ts`, `conversation-reducer.test.ts`, `conversational-shell.test.tsx`, `packages/chat/src/matcher.test.ts`, `chat-service.test.ts`.

### 4. The local matcher ignored the conversation and the named entity (P04)

- **Observed in the audit / Code.** "Qu'avez-vous fait chez Euronews ?" selected `quality-delivery`: only the last question was scored lexically.
- **Fix.** `packages/chat/src/entities.ts` builds a catalog of published experiences, projects, employer groups and distinctive name parts. `focus.ts` resolves the focus: explicit, inherited by a follow-up ("And the tests?" after Euronews), or ambiguous, which asks one clarification question. A named entity outranks lexical scoring. Comparisons show the published summaries side by side. An organisation the publication does not name, after "at"/"chez" ("did you work at google?"), gets `unknown` instead of a neighbouring answer.
- **French parity** (Observed on 15 October). Accented stop words never matched the unaccented tokens, so "Parlez-moi de Visa Insight" scored differently from "Tell me about Visa Insight". Stop words are now unaccented like the tokens, and request verbs (parler, raconter, dire, décrire, expliquer, pouvoir) and pronouns were added. Adding `en` or `présente(z)` lowered the French eval, so they stay out.
- **Tests.** `entities.test.ts`, `focus.test.ts`, `matcher.test.ts`, `normalize.test.ts`.

### 5. A figure was shown for the wrong employer (P06, P17)

- **Observed in the snapshot.** `answers/experience-euronews` shows `coverage-achieved` (82 %), a value only the ITRAS Group texts state. This is the only mismatch in the active snapshot.
- **Code.** Evidence validation proved that quotes exist, not that a reply's figures belong to the cited employer. Cards were taken from cited entities and prepared blocks without a question scope.
- **Fix.**
  - Key figures get optional `ownerExperienceSlug` / `ownerProjectSlug`. Publication validation refuses an owner whose texts do not state the value in both languages, and an answer showing a figure whose owner it does not reference.
  - Without a declared owner, `figureOwner` derives it from the texts.
  - `selectBlocks` is shared by the model path and the matcher: a figure is never shown next to another employer's scope, cards repeating each other are dropped, and the number of key figures is bounded.
  - `api/src/chat/reply-claims.ts` rejects a model reply that states a figure, employer, unpublished organisation, commitment or responsibility its cited sources do not support. The reason is recorded as `model_unsupported_claims:<problems>`.
  - Wherever a figure leaves its experience (hero stats, key-figure cards, CV), its caption names the owner: "Coverage achieved — ITRAS Group".
- **Limit.** These are deterministic checks on figures and names, not semantic entailment of every sentence; the held-out review recommended by the audit is still needed.
- **Tests.** `packages/content/src/figures.test.ts`, `validation.test.ts`, `packages/chat/src/select-blocks.test.ts`, `api/src/chat/reply-claims.test.ts`, `model-reply.test.ts`, `site/src/lib/publication/__tests__/sections.test.ts`, `block-renderer.test.tsx`.

### 6. "Which npm package do you use?" answered about salary (P18)

- **Observed in the audit / Code.** Published sensitive keywords include words with a technical meaning.
- **Fix.** `packages/chat/src/sensitive-context.ts` ignores `package`, `health`, `remote` and similar keywords only when the question reads technically (a technical phrase, or a published skill, employer or project) and nothing in it reads personally. The keyword lists stay in Directus; the working-copy changes noted by the audit are not overwritten by the old snapshot.
- **Tests.** `sensitive-context.test.ts`; `matcher.test.ts` checks technical questions and real personal ones against both the seed and the keywords active on staging.

### 7. Budget checks could be passed concurrently (P16)

- **Code.** The monthly budget compared a cached sum with the limit; concurrent questions all passed it, and a timed-out call with unknown cost added nothing.
- **Fix.** `api/src/budget/monthly-budget.ts` reserves a pessimistic estimate before the call. The estimate assumes one token per input byte, the whole input written to the prompt cache, and `max_output_tokens` or 2 000 output tokens. The reservation is checked and taken without yielding. It is settled with the real cost, or kept at the estimate when the cost is unknown.
- **Tests.** `monthly-budget.test.ts`, `cost.test.ts`, `chat-service.test.ts`.

### 8. Case studies rendered as raw Markdown (P03)

- **Code.** `caseStudy` was printed as one paragraph.
- **Fix.** `site/src/lib/markdown/parse-markdown.ts` parses headings, paragraphs, lists, emphasis, inline code and links into a typed tree. `components/ui/markdown-text.tsx` renders it with React elements only, so no markup is ever injected. Only `http(s):` and `mailto:` links survive, opened with `rel="noopener noreferrer"`. Headings start below the project title.
- **Tests.** `parse-markdown.test.ts` and `markdown-text.test.tsx` with synthetic fixtures (scripts and `javascript:` links are shown as text); `block-renderer.test.tsx`.

### 9. Animated replies were read twice (P15)

- **Code.** `revealed-text.tsx` exposed the full text to screen readers and the animated words as well.
- **Fix.** The animated words are `aria-hidden`; the `sr-only` text is the single accessible copy. Markup in a reply is shown as text.
- **Tests.** `revealed-text.test.tsx`. No screen reader session was run.

### 10. Pages overflowed at 360 and 390 px (P15)

- **Observed.** On staging content: the English page at 360 px and the French page at 360 and 390 px scrolled sideways (project pill, footer row, navigation gaps).
- **Fix.** Wrapping project pill and footer row; tighter navigation gap below 380 px.
- **Tests.** `site/e2e/responsive.spec.ts` at 360 × 740, 390 × 844 and 768 × 1024: welcome screen, a mocked reply with four evidence cards, a local fallback, and the quick view in both languages. Without the fix the test fails at the observed widths; with live staging content built locally, no element overflows.

## Contract migration and delivery order

The chat contract version becomes `cms-chat-v4-claims`; cached replies of the previous version are never served. The response contract gains `clarification_required` and `temporarily_unavailable`.

1. CMS provisioning creates `key_figures.owner_experience_slug` and `owner_project_slug`. It only creates missing fields, so on existing installations the two new `chat_exchanges.outcome` choices must be added in Studio. They are display labels: the API writes the value either way.
2. The publication extension, shipped in the Directus image, validates owners before publishing.
3. API, then site. A site older than the API would reject the two new outcomes and answer locally.

A staging release delivers all of them at once. Production promotes the release, then rebuilds GitHub Pages, so the site follows the API. Publications prepared before owners existed stay valid: both fields default to `null`.

## Directus correction, prepared and not applied

Validated in memory against the active snapshot with `validatePublicationContent`:

| Item                                   | Change                                                                                              |
| -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `key_figures/coverage-achieved`        | `owner_experience_slug = itras-group`                                                               |
| `key_figures/daily-users`              | `owner_experience_slug = euronews`                                                                  |
| `answers/experience-euronews`          | remove `coverage-achieved` from its key figures and from its `key-figures` block                    |
| `key_figures/coverage-achieved` labels | optional: "Test coverage — ITRAS Group" / "Couverture de tests — ITRAS Group", after owner approval |

The first three changes must be published together: with owners set and the Euronews answer unchanged, validation refuses the publication twice (`keyFigureSlugs` and `blocks[1]`). Afterwards the Euronews answer keeps `daily-users` only. `legacy-modernization`, `quality-delivery` and `flagship-results` still show the 82 % figure; they reference ITRAS Group, so it is captioned with its owner. `years-experience` stays profile-wide. Once this branch is deployed, the derived owner keeps the 82 % card away from Euronews replies even before the correction is published.

## Schema evolution proposed

Key figures would gain, after owner validation: measurement period, scope ("unit tests of the billing API"), definition, provenance (document or link kept private) and validation date. Only the public fields would join the publication projection; private provenance and notes would stay in Studio and out of the model context. The audit's other proposals (case study structure, skill evidence) are editorial and wait for the owner.

## Static texts outside Directus

Defined in `site/src/lib/i18n/dictionary.ts` and asserted by the section tests:

| Location                | English (line)                                                   | French (line)                                 |
| ----------------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| Hero headline           | "Crafting cloud systems / built to last / not to impress." (176) | "Des systèmes cloud / …" (330)                |
| About headline          | "Bridging / reliability and clarity / in cloud systems." (186)   | "Relier / …" (340)                            |
| Projects footnote       | "Detailed case studies available on request." (196)              | "Études de cas détaillées sur demande." (350) |
| Chat unavailability     | `packages/chat/src/operational-copy.ts`, wording from audit P14  | same file                                     |
| Clarification questions | `packages/chat/src/operational-copy.ts`                          | same file                                     |

The projects footnote will contradict the site once case studies are published. Rendering it only when no project has a case study, or moving the three headlines into `site_settings`, would remove that risk; both are left to the owner.

## Budget, cache and limits

- **Budget.** Strict within one API process. Two instances could each spend the remaining amount. Strict enforcement across instances would need a reservation stored in Postgres; with one instance per environment today, this is documented, not built. The budget sum is read from `chat_exchanges` with a sixty-second cache.
- **Output bound.** Without `max_output_tokens` the provider bounds nothing and the reservation assumes 2 000 tokens. Setting it in "Chat model" makes cost and latency predictable; not changed, as it alters provider parameters.
- **Cache.** Reviewed in `response-coordinator.ts`. Keys hash publication, language, exact messages, provider configuration, settings and contract version. Only answered replies are kept: 64 entries, 2 MiB, five minutes, per process. Identical pending questions share one call; more than 16 distinct pending calls get `model_busy`. Enabling it is safe and would save repeated starter questions; the decision stays with the owner.
- **Limits.** 15 messages per ten minutes and 60 per day per visitor, a global daily model-call limit, eight messages of at most 500 characters per request, one provider call per question with no retry or chained fallback.

## Security and privacy

- **Visitor questions** are stored after `redactQuestion`: email addresses, numbers of nine digits or more (phones, accounts; not a year range), and credential-like runs of 24 characters or more mixing letters and digits (API keys, IBANs) are replaced. Logs carry stable reason codes and `Chat exchange recording failed: <message>`, never a question.
- **Retention.** The privacy notice deletes chat exchanges and raw audience events after thirteen months, contact messages after three years. No job in the repository does it yet: the measurement plan of 14 October defers scheduled retention to plan 5b. The job must ship before production relies on that notice.
- **Unpublished data.** The chat reads only the active publication. The zod schema strips fields it does not know, tested with extra private fields that never reach the prompt.
- **Prompt injection.** The conversation is sent as an untrusted JSON envelope. An injected instruction naming an unpublished employer is rejected by the claims check (`unpublished_organization`); the visitor gets the scripted reply.
- **Markup** in replies and case studies is rendered as text.

## Verification of the final tree

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check` and `git diff --check` pass.
- `pnpm test`: 750 tests pass (API 292, chat 156, site 143, CMS provisioning 69, content 53, publication extension 29, CMS schema 8).
- `pnpm test:e2e`: 33 Playwright tests pass on a fresh seed build, 15 of them in `responsive.spec.ts`.
- Matcher evaluation, top-1 with card types, against the seed: English 45/50 (`main`: 44/50), French 43/50 (`main`: 43/50); CI requires 0.8.
  - Fixed: both "test coverage at Euronews" questions.
  - New miss: "…Terraform et GraphQL sur la plateforme Eurosport ?" now gets `project-eurosport`, whose topic is "Plateforme Eurosport" and whose text answers it; the expected `experience-warner` was kept rather than relabelled.
  - Thirteen expectations (six English, seven French) changed card types only, following the selection rules above: no project card repeating its employer's, no `strengths` card pointing at the answer itself, and the two projects a question names instead of all three.

## Remaining limits

- The unpublished-organisation guard catches lowercase names only when the publication never uses the word; "at scale" stays a phrase, an unusual lowercase employer name may pass.
- The matcher still misses some paraphrases; it is a fallback, and a confident one is required before it answers.
- Model reply quality was not re-measured: no billed call was made on staging after the fix.
