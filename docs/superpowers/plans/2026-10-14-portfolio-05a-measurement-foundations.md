# Measurement foundations (plan 5a)

**Goal:** Operational Directus collections and policies for audience measurement, visitor day hashing, `POST /events`, the site tracker, bilingual privacy pages, smoke and e2e coverage, and documentation. Scheduled jobs, dashboards and Search Console import remain plan 5b/5c.

**Spec:** `docs/superpowers/specs/2026-10-13-conversational-portfolio-design.md` (sections 5.2, 5.4, 8.1, 10, 12).

## Rulings

| Decision                                                                     | Why                                                                                                                                                                                                                                             | Cost if wrong                                                                          |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Assistant reads analytics collections, not `alerts`                          | Alerts are operational dedup for email, not recruiter-facing analytics; MCP still gets SEO/chat data via events and Search Console rows                                                                                                         | Owner asks the assistant about alert history and gets nothing                          |
| API contact retention read deferred to 5b                                    | Directus Core returns `RESOURCE_RESTRICTED: custom_permission_rules_enabled is a restricted resource` when creating field-scoped permissions (proved in `cms/tests/src/directus-field-permissions.test.ts`); full contact read would expose PII | Retention job uses admin credentials in 5b until Core allows field lists               |
| Privacy retention copy describes 5b job behaviour                            | Public site stays on present tense; actual deletion is implemented in plan 5b scheduled retention                                                                                                                                               | Copy accurate before the job ships; depends on 5b delivery                             |
| No model processor in privacy text while model mode is off                   | No provider processes chat questions until plan 7 enables model mode                                                                                                                                                                            | Plan 7 adds one entry via `chatModelProcessor` in `site/src/lib/privacy/processors.ts` |
| Visitor hash truncated to 16 hex                                             | Spec 10; matches `events.visitor_hash` column                                                                                                                                                                                                   | Slightly higher collision rate vs full digest (acceptable for audience counts)         |
| `VisitorSaltSchema` subset for salt client                                   | Full `PortfolioSchema` hits Directus SDK collection union limits in tsc for `visitor_salts`                                                                                                                                                     | Second tiny schema type to maintain                                                    |
| Chat/contact share the same async visitor hasher                             | One daily salt path for rate limits and events                                                                                                                                                                                                  | Salt read on every chat message (cached per Paris day)                                 |
| Separate in-memory rate limiters for chat/contact vs events                  | Avoids chat eviction clearing event counters and vice versa                                                                                                                                                                                     | Two sweeper timers instead of one                                                      |
| Referrer host trimmed on client; API still normalises URL or hostname        | Smaller beacon payload; server guard for legacy full URLs                                                                                                                                                                                       | None                                                                                   |
| Lighthouse adds privacy URLs                                                 | SEO target 100 on legal pages too                                                                                                                                                                                                               | CI runs four URLs instead of two                                                       |
| Skip tracker on localhost unless `NEXT_PUBLIC_ALLOW_LOCALHOST_TRACKING=true` | Static export Lighthouse on `localhost` must not call production API (console network errors); e2e build sets the flag                                                                                                                          | Local manual preview on localhost never sends beacons unless rebuilt with the flag     |
| Privacy link `prefetch={false}` in chat notice                               | Next prefetch requested `/privacy/` on the static file server (404) and hurt Lighthouse best-practices on home                                                                                                                                  | Slightly slower privacy navigation from chat                                           |
| E2e DNT via `navigator.doNotTrack` init script                               | Tracker honours DNT in the client, not the HTTP header alone                                                                                                                                                                                    | None                                                                                   |
| `contact_messages.date_updated` on schema                                    | Retention copy and future 5b job key off last update time                                                                                                                                                                                       | Extra system field on one collection                                                   |

## File map

| Path                                                                          | Role                                                    |
| ----------------------------------------------------------------------------- | ------------------------------------------------------- |
| `cms/schema/src/records.ts`, `cms/provision/src/schema/collections.ts`        | Events, salts, Search Console rows, daily stats, alerts |
| `cms/provision/src/access/policies.ts`                                        | Owner, API service, assistant grants                    |
| `cms/tests/src/measurement-access.test.ts`                                    | Integration access for new collections                  |
| `api/src/events/*`, `api/src/visitor/*`, `api/src/rate-limit/event-limits.ts` | Beacon ingestion and day hash                           |
| `site/src/lib/tracking/*`                                                     | sendBeacon client, page_view deferral                   |
| `site/app/(en)/privacy`, `site/app/(fr)/fr/confidentialite`                   | Static privacy pages                                    |
| `deploy/smoke.sh`, `site/e2e/measurement.spec.ts`                             | Delivery and browser checks                             |

## Task checklist

- [x] CMS schema and policies for measurement collections
- [x] CMS integration tests
- [x] Visitor day hash with Directus salts
- [x] `POST /events`
- [x] Site tracker and event wiring
- [x] Privacy pages and links
- [x] Smoke and e2e
- [x] Docs and this plan
- [x] Review fixes (privacy copy, processors, referrer, contact tracking, permissions proof, uniqueness, beacon blob, rate limiters)

## Evidence

```text
pnpm validate   # exit 0
pnpm test       # @portfolio/content 25, cms/schema 8, cms/provision 38,
                # directus-extension-publication 29, @portfolio/chat 39,
                # @portfolio/api 133, @portfolio/site 115 — exit 0
pnpm provision  # exit 0
pnpm test:cms   # 9 files, 62 tests — exit 0
pnpm content:seed && pnpm build:site  # exit 0 (14 static routes incl. privacy pages)
pnpm test:e2e   # 16 passed — exit 0
pnpm build:site && pnpm --filter @portfolio/site lighthouse  # 4 URLs × 3 runs, all assertions passed — exit 0
python3 -m unittest discover -s deploy -p 'test_*.py'  # Ran 13 tests — OK
shellcheck deploy/*.sh  # exit 0
deploy/render.sh staging /tmp/r-staging  # exit 0
git diff --check main...HEAD  # exit 0
```

Lighthouse category scores (mean of three runs per URL, static export on localhost, build **without** `NEXT_PUBLIC_ALLOW_LOCALHOST_TRACKING`):

| URL                        | Performance | Accessibility | Best practices | SEO  |
| -------------------------- | ----------- | ------------- | -------------- | ---- |
| `/index.html`              | 0.96        | 1.00          | 0.96           | 1.00 |
| `/fr.html`                 | 0.96        | 0.96          | 0.96           | 1.00 |
| `/privacy.html`            | 0.99        | 0.95          | 0.96           | 1.00 |
| `/fr/confidentialite.html` | 0.99        | 0.95          | 0.96           | 1.00 |
