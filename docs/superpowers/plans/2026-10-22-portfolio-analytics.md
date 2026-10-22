# Portfolio analytics implementation plan

**Goal:** Deliver complete visitor-journey instrumentation and useful Directus dashboards with linked, redacted diagnostics.

**Architecture:** Extend the existing Hono API, shared chat/CMS contracts and site tracker. Add an analytics Directus extension bundle for authenticated queries, panels and scheduled rollups/retention, provisioned with the existing CMS bootstrap.

**Spec:** `docs/superpowers/specs/2026-10-22-portfolio-analytics-design.md`

## Global constraints

- Work only in this portfolio checkout, on `feat/portfolio-analytics` from `9f57131769b0d6638c92fcabcba07db230c464b9`. No commits, pushes, PRs, merges or deployments.
- English code and documentation. Node 24, pnpm 10.32.1, Directus 12.5.0. Preserve unrelated files and existing product behavior. No provider calls or paid inference.
- Detailed redacted analytics retention: 13 calendar months. UTC storage, Europe/Paris reporting. No persistent browser identifier, cookies, session replay, full prompts, secrets or internal reasoning.
- GPC/DNT and bots exclude journey analytics; excluded chat requests retain minimal operational accounting only. Never copy contact contents into analytics.
- Legacy clients remain compatible. Keep current model selection, decisions, budget enforcement and one-generation accounting intact.
- Use meaningful tests first, record RED/GREEN evidence. No subagents from implementers or reviewers. Implementation tasks run serially, reviewed independently before the next task.
- User-authorized plan is the spec. More detailed implementation choices below resolve interfaces, not feature scope.

### Task 1: Server instrumentation, contracts and CMS data foundation

Own the API, `packages/chat`, `cms/schema`, and telemetry collection/policy definitions in `cms/provision`. Do not modify site code or create the analytics extension/UI yet.

Implement the capture and correctness requirements in the spec. Optional chat request fields are `requestId` and `journeyId` (UUIDs), with the existing `conversationId`. Chat responses optionally echo `requestId`. One request ID identifies a browser turn; each server execution and generation has its own server-generated record ID, so a repeated client ID cannot lose billing records. Never use a client request ID as the exchange primary key.

Extend client event contracts with optional `eventId`, `journeyId`, `requestId`, `conversationId`, `occurredAt`; keep old event requests working. Persist server receipt time separately from client-reported time. Stable event IDs deduplicate retries. Add bounded typed client lifecycle events for chat submission/render/failure/cancellation/local fallback, content impressions/clicks and engagement. Server-only `contact_stored` cannot be forged through the public event contract. Keep existing event meanings and add new events instead of relabeling historical rows.

Populate existing metadata plus additive exchange fields for redacted response text, evidence references, validation status, durations, request/journey IDs and analytics version. Operational failures and early failures must be represented without keeping malformed bodies. Extend the internal reply-validation result to carry evidence for recording without exposing it publicly. Store browser-local fallback separately as client-reported telemetry, never overwrite server output.

Add `model_generations` (one row per actual provider attempt, including failures) and `analytics_status` (collector/job health). Use server IDs and observable asynchronous writes with at most three attempts, bounded pending work and shutdown flushing. Keep current exchange budget fields and settlement semantics unchanged. Token/cost nulls remain unknown. Cache/shared rows refer to a generation and have no additional inference spend. Record logging failures without visitor data. Health can persist after recovery; stale health must be visible rather than interpreted as healthy.

The contact service records `contact_stored` only after its awaited store succeeds. Do not include name/email/message in that event. Carry optional correlation through contact requests; spam-accepted paths emit no stored conversion.

Add typed record definitions, collection definitions and least-privilege grants. Telemetry collections are API-written and owner/assistant-readable; `analytics_status` is owner-readable, with no public grants. Add readable English field labels. Existing optional field metadata must be updated only for task-owned telemetry fields, not globally rewritten. Future task owns `chat_reviews` schema and Insights grants.

Tests: legacy/new contracts; question/answer redaction; GPC/DNT/bot behavior; request/render separation; early errors; generation failures; cache/shared cost; retries/dedup/capacity/shutdown; true contact persistence vs spam; authorization definitions. Run focused package tests/typechecks and report exact interfaces for the site and CMS tasks. Do not run real inference.

### Task 2: Browser journey and delivery instrumentation

Own site changes only, including tracking helpers, chat transport/hooks, component event bindings, privacy copy and site tests/E2E. Consume Task 1's actual contracts; do not rewrite API/CMS code. If an upstream contract gap exists, report it to the controller.

Implement a page-memory journey context shared by site event senders. Preserve it through client navigation; a reload starts a new journey. Keep landing acquisition attributes in page memory. No new local/session storage. Use stable event IDs across beacon/fetch fallback. Track old basic events alongside additive versioned events without double-counting dashboard metrics.

Generate a requestId per submitted turn, pass optional correlation to chat/contact, and record submitted, rendered, cancelled, transport failure and locally rendered fallback events. Browser timings use performance elapsed time, not wall clock subtraction. A generated server answer, a received response and a rendered reply are separate states. Callback emission must be once per state, safe under React StrictMode and component rerenders.

For a locally rendered fallback, send bounded, redacted-at-server client-reported reply text and identifiers using the Task 1 contract. Do not send conversation history or free-form question text through generic events. Keep submitted question handling in `/chat` only.

Use IntersectionObserver for a content impression when at least half the card is visible for one second, once per turn/card/journey. Keep click events separate. Add active-visible engagement durations on visibility change and every 30 seconds while visible. Do not record cursor positions, arbitrary keystrokes or scrolling sessions.

Update both language privacy notices to reflect redacted answers, linked page-memory journeys and 13-month retention. Do not claim perfect anonymization or legal certification. Preserve GPC/DNT, local preview exclusions, reduced-motion behavior and existing UI flow.

Tests first for stable correlation, duplicate prevention, true visibility, hidden tabs, privacy exclusions, abort vs failure, browser fallback, rendered acknowledgement, true form acceptance semantics and both locales. Extend the real full-site E2E with deterministic API responses and captured events. Run focused site tests and typecheck.

### Task 3: Directus analytics queries, dashboards, review and scheduled jobs

Own a new `cms/extensions/analytics` bundle, analytics-specific provision modules/schema/policies and CMS integration tests, plus workspace build/container/Compose/CI wiring as needed. Consume Task 1 record definitions; coordinate any additive corrections with the controller. Do not modify site or model behavior.

Implement native Insights dashboards Overview, Acquisition and engagement, Journey and conversions, Chat review and Model operations. App-owned dashboard/panel IDs must be stable and provisioning repeatable. Preserve unrelated panels/dashboards. Default to a 30-day Europe/Paris period with previous equal-period comparison. Share date/locale filters and applicable source/device/model/provider/publication filters consistently across panels and drill-downs.

Add an authenticated `/portfolio-analytics` extension endpoint, with read-only summary/funnel/conversation routes and owner review writes. Deny anonymous access and API-service access to diagnostic UI queries. Owner gets full analytics/review access. Assistant remains read-only on permitted redacted collection data, no contact contents. Explicit authorization before any direct SQL; parameterize and allowlist all filters. Never return private settings/credentials or contact contents. Owner/admin authorization must use existing policy/accountability identities rather than trusting request parameters.

Use native panels where suitable, plus custom Vue 3 panels for diagnostic metrics, ordered funnels and conversation list/detail review. The inspector shows actual server replies, separately labeled browser-local fallback, delivered cards/evidence/publication links, model/timing/validation/failure metadata and owner issue tags/notes. Add `chat_reviews` records related to exchanges; structured tags include unsupported claim, wrong card, incomplete, irrelevant and supported. Notes must be redacted server-side. Quality counters show reviewed denominator and never equate `answered` with correctness.

Metrics distinguish daily visitors/visitor-days, correlated page journeys, server completions/browser renders, generation spend/cache deliveries, known cost/unknown cost, original vs client timestamps and actual stored contact conversions. Funnels require event order inside one journey and cannot use independent event totals. Click-to-CV is labeled link click, not completed download. Coverage/version/null metadata must be visible for legacy data.

Use an internally shared query service for panels and jobs with indexed time/correlation dimensions. Add a restart-safe daily rollup into existing `daily_stats` plus additive fields needed by the dashboards. Preserve unknown historical values. Idempotently backfill available raw data, with source coverage recorded. Use Directus scheduled hooks, UTC persistence and Europe/Paris boundaries. Take a database advisory lock for each job. The hook may run every 15 minutes, processing closed days once local 03:30 has passed; after local 04:00 purge expired 13-calendar-month raw telemetry only after successful summaries. Keep anonymous aggregates. Cleanup includes telemetry-only Directus revisions and related review/generation details, never unrelated content or contact messages. Record job last-success/error/progress in analytics_status. No email/Slack alerts.

Package/bundle custom panels, endpoints and hooks for Directus 12.5.0; preserve the publication bundle. Wire local Compose mount, Docker build/copy, root extension build script and required CI checks. Add server-set environment labeling for local/staging/prod through deployment configuration, no secret output. No external services or new database required.

Tests first: hand-derived metrics/funnel fixtures (out of order, missing events, duplicates, cache, missing costs); filtered pagination; permission denial; redaction; review updates; DST/month boundaries; catch-up/retry/retention including revision copies; double provisioning preserving user-owned panels. Run extension build, typecheck and focused tests. Add real CMS integration tests using the local Directus/Postgres stack, and run them.

### Task 4: Integration verification, UI QA, docs and final review

Own integration fixes only after Task 1–3 task reviews. Add an operational guide for metric definitions, coverage limitations, run/backfill commands, retention, local setup and additive deployment/rollback order. Update the architecture documentation to describe implemented tracking and remaining Search Console boundary. Ensure the recorded 13-month policy is consistent in both locale notices and settings.

Provision the isolated local stack twice, seed deterministic synthetic telemetry through supported APIs, and inspect all five dashboards as the owner plus a conversation review. Use browser inspection/screenshots for layout, filters, drill-downs, empty/incomplete states and narrow desktop/mobile widths. No real visitor content or paid inference.

Run final `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm format:check`, `corepack pnpm test`, `corepack pnpm build:extension`, `corepack pnpm test:cms`, canonical `corepack pnpm test:e2e`, appropriate deployment checks and `git diff --check`. Inspect complete diff and independent whole-feature review. Fix substantive findings and report implementation vs local validation vs deployment separately. No publishing actions.
