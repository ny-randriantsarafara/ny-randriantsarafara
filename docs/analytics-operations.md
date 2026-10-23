# Portfolio analytics operations

This guide covers metric definitions, coverage limits, scheduled jobs, local verification, retention and additive deployment order for the portfolio analytics feature. It complements the [design spec](superpowers/specs/2026-10-22-portfolio-analytics-design.md).

## Scope and boundaries

- **In scope:** audience events, chat exchanges, model generations, daily rollups, Directus Insights dashboards, owner review tags and the authenticated `/portfolio-analytics` extension API.
- **Out of scope (this version):** Google Search Console import and dashboards. `search_console_rows` remains a separate operational collection; privacy copy still describes its unlimited retention because those rows hold no personal data.
- **Environment label:** every telemetry row and rollup is tagged with `environment` (`local`, `staging` or `prod` from `ANALYTICS_ENVIRONMENT`). Dashboard filters default to the deployment label. Deliveries set it to the instance (`staging` or `prod`) for Directus, the provisioning job and the API, and `deploy/render.sh` refuses a render where one of them differs. Provisioning refuses to run without it; Directus and the API still fall back to `local`.

## Storage migration

Directus cannot declare a composite unique key or change a column type, so provisioning finishes the analytics storage in SQL after it ensures the schema (`cms/provision/src/analytics/migrate-analytics-storage.ts`, one transaction, safe to rerun):

- `daily_stats.day` becomes a `date`, so native time-series panels can group by day. Provisioning stops if a stored day is not a `YYYY-MM-DD` date.
- `daily_stats` gets the unique key `daily_stats_day_environment_unique` on `(day, environment)`, which the rollup upsert needs. Any unique key on `day` alone, created by releases before analytics, is removed. Provisioning stops, without changing anything, when two rows share a day and an environment.
- Rows stored before analytics (`events`, `chat_exchanges`, `model_generations`) get `received_at` from their `date_created`, the time Directus stored them. Rows without `environment` get the deployment label. In `staging` and `prod`, rows labelled `local` (written while deliveries lacked `ANALYTICS_ENVIRONMENT`) are relabelled, and so are `daily_stats` rows unless that day already has a row for the deployment label.

Provisioning needs `POSTGRES_HOST`, `POSTGRES_PORT` and `POSTGRES_PASSWORD` for this step (user and database `directus`).

History that cannot be rebuilt stays empty: rows from before analytics have no `journey_id`, `request_id`, `occurred_at`, `analytics_version`, model cost or token measurements, so they count in daily totals but never in the ordered funnel. The release before analytics already dropped events with GPC, DNT or a bot user agent, but it stored chat exchanges without any privacy signal: those keep `analytics_excluded = false` because the signal cannot be recovered.

## Retention

- **Detailed redacted telemetry** (`events`, `chat_exchanges`, `model_generations`, linked `chat_reviews`, and matching Directus revision copies): **13 calendar months** from each row’s `received_at`, using Europe/Paris calendar boundaries. The public privacy notices (English and French) and collection notes in Directus state the same rule.
- **Daily aggregates** (`daily_stats`): kept without expiry; they contain no personal data.
- **Contact messages:** three years after last update (unchanged; contents never enter analytics).
- **Visitor salts:** removed when detailed telemetry before the cutoff is purged.

Rollup always runs before retention in the same scheduled pass. Retention runs only after a successful rollup in that pass and only at the Paris 04:00 window (see below).

## Metric definitions

Reporting windows default to **30 Paris days** ending yesterday, with a **previous equal period** comparison on API panels.

| Metric / field                                        | Source              | Definition                                                                                            |
| ----------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------- |
| `visitors`                                            | `events`            | Distinct `visitor_hash` on the Paris day.                                                             |
| `visitor_days`                                        | `events`            | Distinct `visitor_hash` plus Paris day (multi-day windows sum daily pairs, not one pair per visitor). |
| `page_views`                                          | `events`            | Count of `page_view` rows.                                                                            |
| `content_impressions`                                 | `events`            | Count of `content_impression` (visible block impressions, not clicks).                                |
| `cv_link_clicks`                                      | `events`            | Funnel helper counts `cv_click` and legacy `cv_download` link intents.                                |
| `contact_stored`                                      | `events`            | Server-emitted `contact_stored` after a real stored contact (not honeypot accepts).                   |
| `conversations`                                       | `events`            | Distinct non-empty `conversation_id` on events.                                                       |
| `chat_submitted` / `chat_rendered`                    | `events`            | Client lifecycle markers for chat turns.                                                              |
| Chat outcomes                                         | `chat_exchanges`    | Counts by `outcome` where `analytics_excluded` is false.                                              |
| `generation_attempts`                                 | `model_generations` | One row per real provider attempt (failures included).                                                |
| `generations_known_cost` / `generations_unknown_cost` | `model_generations` | Split on nullable `cost_eur`.                                                                         |
| `model_cost_eur`                                      | `model_generations` | Sum of known `cost_eur` for included generations.                                                     |
| `cache_deliveries`                                    | `chat_exchanges`    | Deliveries with `delivery_source` cache or shared.                                                    |
| Ordered funnel                                        | extension API       | Document-bounded `journey_id` sequences; not independent event totals.                                |

GPC, DNT and bot traffic are excluded from journey analytics at ingestion. Excluded chat paths may still record minimal operational rows without journey linkage.

## Dashboard filters

- **Portfolio API panels** (diagnostic metrics, ordered funnel, conversation review) honour all shared dashboard variables when the value is non-empty. Cleared optional inputs are ignored.
- **Native Directus metric and time-series panels** read `daily_stats` over the default window: the last 30 complete Paris days, ending yesterday (`$NOW(-31 days)`, since rollups never include today). Activity from today appears after the next night's rollup.
- **Native Directus metric, time-series and list panels** bind **environment only** (the variable with a provisioned default). Locale, device, UTM, model, provider and publication filters do not apply to native SQL panels because Directus 12.5.0 substitutes unset or blank variables into filters literally. Dashboard and panel notes in Insights describe this split.

## Scheduled jobs

The analytics extension registers a Directus hook:

- **Schedule:** every 15 minutes (`*/15 * * * *`).
- **Rollup:** when `shouldRunRollup(reference)` is true, backfills `daily_stats` from the day after the latest rollup through **yesterday** (Paris), per environment. With no rollup yet, it starts at the Paris day of the earliest `received_at`, so the first run after the storage migration summarizes the whole retained history. The latest day is summarized again on each run until a newer day exists.
- **Retention:** when `shouldRunRetention(reference)` is true **and** rollup succeeded in the same run, purges detailed telemetry before the 13-month Paris cutoff and deletes related revision rows.
- **Status:** the `analytics_status` singleton stores job outcomes; the Overview **Diagnostic metrics** panel reads its `environment`, `analytics_version`, `last_refresh_at`, `last_success_at`, `last_failure_at` and `progress_details` fields (rollup day lists and retention cutoffs appear in **Job progress** when jobs have run).

There is no separate operator command in production beyond deploying the extension and keeping Directus running. For a manual catch-up after an outage, run `runAnalyticsJobs` against the instance database with the same config the hook uses (integration tests in `cms/extensions/analytics/src/query/jobs.test.ts` document the contract).

## Local setup

Use Compose project **`candlefish-analytics`** (or set `COMPOSE_PROJECT_NAME`) so volumes stay isolated:

```bash
pnpm install
scripts/ci/write-env.sh    # once; creates git-ignored .env
pnpm build:extension
docker compose -p candlefish-analytics up -d --wait
pnpm provision             # idempotent; run after provision or extension changes (needs POSTGRES_HOST/PORT)
pnpm dev:api               # POST /events, /chat, /contact on :8066
```

Directus Insights: `http://localhost:8065` (owner account). Rebuild the extension and restart Directus when `cms/extensions/analytics/dist` is older than source (`pnpm build:extension` then `docker compose -p candlefish-analytics restart directus`).

### Deterministic synthetic telemetry

Use the public API only (no paid inference):

1. `POST /events` with `text/plain` JSON (`page_view`, `content_impression`, `cv_click`, correlated `journeyId` / `eventId` UUIDs). Use a normal browser user agent; omit DNT/GPC.
2. `POST /chat` with the published `@portfolio/chat` contract for scripted exchanges (optional `journeyId` / `requestId`).
3. `POST /contact` with a valid body when testing `contact_stored` (respect honeypot and rate limits).

Wait for the scheduled rollup or invoke `rollupParisDay` for the Paris day under test if native `daily_stats` panels must show same-day seeds immediately.

## Additive deployment order

Deploy in this order so new schema, extension and API collectors stay compatible:

1. **Provision job** (schema, storage migration, access, dashboards, flows) — adds collections, fields, grants and Insights metadata, keys `daily_stats` by day and environment and backfills older telemetry.
2. **Directus image** — includes built `directus-extension-analytics` and publication extension bundles. Directus needs `OWNER_ROLE_ID`, `AI_ROLE_ID` and `API_ROLE_ID`, the same ids provisioning uses: without them it skips the `/portfolio-analytics` endpoint and the Diagnostic metrics, funnel and conversation panels answer 404. `deploy/render.sh` refuses a render where Directus lacks one.
3. **API image** — emits extended telemetry and serves unchanged public contracts for legacy clients.
4. **Site static export** — ships tracker and privacy copy (no CMS dependency beyond existing API URL).

Rollback (code): redeploy previous digests in reverse order (site, API, Directus, provision is usually not re-run). Rollback (data): provisioning is additive; retention and manual deletes are the only shrink paths for telemetry volume.

## Deployment checks (no remote delivery from implementation)

From the repository root with the pinned Python venv ([delivery.md](delivery.md)):

```bash
. .venv/bin/activate
python3 -m unittest discover -s deploy -p 'test_*.py'
deploy/render.sh staging /tmp/portfolio-render-staging
deploy/render.sh prod /tmp/portfolio-render-prod
```

Rendered Compose must include both Directus extensions. Staging smoke (`deploy/smoke.sh`) still validates health, auth boundaries and `POST /events` privacy behaviour; it does not log into Insights.

## Observability and limits

- **API collector:** bounded async queue with in-process retries; not durable across a hard crash. `GET /health` reflects Directus reachability and active publication id; it does not expose per-beacon delivery.
- **Overview — Diagnostic metrics panel** (`portfolio-diagnostic-metrics`): loads `/portfolio-analytics/summary` and renders two blocks (same headings and labels as in Insights):
  - **Coverage and job health** — six rows from `payload.coverage.analytics_status`: **Environment**, **Analytics version**, **Last refresh**, **Last rollup success**, **Last failure**, **Job progress** (`progress_details`, or the literal `none` when empty). This block does not show `daily_stats.rollup_coverage`, collection row counts, or a missing-measurements list.
  - **Metric grid** — current value and **Δ** vs the previous 30-day window for: **Visitors**, **Visitor-days**, **Page views**, **Browser renders**, **Server model exchanges**, **Cache deliveries**, **Stored contacts**, **CV link clicks**, **Generations with unknown cost** (from `payload.current` / `payload.previous`). Null counts display as `unavailable`.
- **Rollup coverage JSON** on `daily_stats` rows is written during scheduled rollups for operator/SQL use; surfacing it in this panel is deferred.
- **Authorization:** only owner and assistant roles read analytics; review writes are owner-only; API service token cannot call `/portfolio-analytics`.
