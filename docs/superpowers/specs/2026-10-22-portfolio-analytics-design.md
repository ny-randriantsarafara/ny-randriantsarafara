# Portfolio tracking and Directus analytics

Approved in the conversation on 22 October 2026. Implement in the portfolio repository. No commit, push, merge, production provisioning or deployment is authorized by implementation alone.

## Outcome

Connect the full visitor journey and make Directus useful for traffic analysis, conversation review and operational diagnosis. Use native Insights with focused custom panels. Keep detailed redacted records for 13 months and anonymous daily totals afterwards. Search Console stays outside this version.

## Capture

- Link page visits, acquisition, content engagement, chat and conversion actions with in-memory journey IDs, conversation IDs and request IDs. Keep daily visitor hashing and introduce no persistent visitor identifier.
- Add optional correlation fields to existing public contracts without breaking old clients. A request ID is safe to echo in the public chat response; private diagnostics remain in the CMS.
- Separate server completion from browser rendering, cancellation, transport failure and local fallback. Capture browser submission-to-render duration alongside server, provider and validation durations.
- Populate provider/profile/configuration/prompt-version/context-size fields. Capture validation status, normalized failure reasons, publication IDs, accepted evidence and delivered cards. Store redacted server answer text and separately labeled browser-reported fallback text. Never log whole prompts, keys, provider payloads or internal reasoning.
- Record one diagnostic model generation per actual provider attempt. Shared and cached deliveries refer to that generation without multiplying cost. Existing budget enforcement and accounting behavior must remain intact.
- Separate actual visible content impressions from clicks. CV events mean CV link clicks. A contact conversion requires successfully stored contact data, never the spam trap's deliberate accepted response.

## Directus

Provision Overview, Acquisition and engagement, Journey and conversions, Chat review, and Model operations dashboards. Default to 30 days and compare with the previous equal period. Shared date/locale filters and applicable model/provider/publication/source/device filters must produce consistent metrics and drill-downs.

Use native metrics, charts and lists where suitable. Use custom panels for funnels, diagnostic metrics and an interactive conversation inspector, backed by an authenticated `/portfolio-analytics` extension endpoint. Show environment, collection coverage, last refresh, missing measurements, failures and incomplete history explicitly.

Owners can annotate reviewed answers with issue tags and redacted notes. Human review is separate from model outcome. The assistant has read-only access to permitted redacted analytics, with no contact contents. Public visitors cannot read analytics. The API service writes telemetry and retains its existing budget-read capability.

Provision idempotently. Update owned dashboards/panels only and preserve unrelated customizations. Package the analytics extension through local Compose, Docker builds and existing delivery checks.

## Correctness and operations

Use stable IDs for idempotent write retries. Keep collectors asynchronous, bounded and observable, flush on shutdown, and document that process-local retries are not durable through a crash. No new queue service is required.

Daily rollups and catch-up are restart-safe. Store UTC timestamps and use Europe/Paris reporting boundaries. Roll up before retention deletes detail. Cleanup includes telemetry copies in Directus revisions and leaves unrelated content/audit data alone. Preserve anonymous daily totals without expiry.

Exclude GPC/DNT and bots from journey analytics. For excluded chat requests, retain only operational accounting without text or journey linkage. Redact questions, answers and notes. Keep contact message contents outside analytics. Raw analytics detail retention is 13 calendar months.

Use daily visitors and visitor-days accurately. An ordered funnel counts correlated journeys, not independent event totals. Historical unknowns stay null/unavailable. Known cost and unknown-cost counts are distinct. Manual review does not silently become an automated accuracy score.

## Acceptance

Cover full journey, deduplication, privacy, cache/shared generations, missing usage, model rejection, publication changes, local fallback, cancellation, telemetry failures, real contact storage, DST/reporting boundaries, idempotent provisioning, retention and authorization. Run focused tests then repository typecheck/lint/format/unit/extension/CMS/full-site E2E gates. Validate the Directus UI with synthetic local data. Staging and production delivery remain separate operations.
