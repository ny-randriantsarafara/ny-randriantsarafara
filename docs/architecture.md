# Architecture

The repository is a pnpm workspace. The target design (conversational portfolio, chat, measurement) is in the [design spec](superpowers/specs/2026-10-13-conversational-portfolio-design.md); this page describes what exists today.

## Workspace

| Package                          | Path                          | Role                                                                                                                      |
| -------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `@portfolio/site`                | `site/`                       | Next.js site in English and French, built from the active publication and exported statically.                            |
| `@portfolio/api`                 | `api/`                        | Content API: active publication, health, publication hook.                                                                |
| `@portfolio/content`             | `packages/content/`           | Publication content schema (zod), active publication contract, validation with readable problem paths, change summaries.  |
| `@portfolio/chat`                | `packages/chat/`              | Chat request/response contract (zod), reply-language detection, question normalization, scripted matcher, evaluation set. |
| `@portfolio/cms-schema`          | `cms/schema/`                 | Directus record types; mapping between working records and publication content.                                           |
| `@portfolio/cms-provision`       | `cms/provision/`              | Applies the Directus configuration idempotently: schema, access, settings, flows, initial content.                        |
| `directus-extension-publication` | `cms/extensions/publication/` | Prepare and activate flow operations.                                                                                     |
| `@portfolio/cms-tests`           | `cms/tests/`                  | Integration tests against Postgres and Directus in Docker.                                                                |

Workspace packages are TypeScript sources run directly by Node 24: relative imports end with `.ts`, and only erasable syntax is allowed.

## Content

Directus holds two kinds of data:

- **Working collections**, edited by the owner and by the assistant through MCP: profile, capabilities, skills, experiences, projects, key figures, answers, chat settings, site settings. Every visitor-facing text is a pair of `_en` and `_fr` fields; references between items are slug lists.
- **Publications**: snapshots of the working content. Visitors only ever see the active publication.

```
working collections --Prepare--> prepared --Publish--> active --next Publish--> superseded
                                     |                                              |
                                next Prepare                                 Publish (rollback)
                                     v                                              v
                                 discarded                                       active
```

- **Prepare** builds the snapshot with `buildPublicationContent`, refuses it with every problem listed when validation fails, and stores the change summary since the active publication.
- **Publish** activates the publication in one transaction, then calls the API hook (`PUBLICATION_HOOK_URL`, bearer `PUBLICATION_HOOK_SECRET`). A hook failure leaves the publication active; publishing the active publication again only calls the hook.
- Both operations run with the permissions of the user who triggers them, so only the owner can write publications.

## Chat (scripted engine)

`packages/chat` holds the chat contract (spec section 7.1), the stop-word reply-language heuristic, normalized term matching, and `createScriptedMatcher`. Each reply runs in order: **sensitive topics** from `chatSettings` (multi-word work-condition phrases such as “fully remote”, not the bare token “remote”), then a **manipulation-phrase guard** (`manipulation-phrases.ts`, documented multi-word jailbreak strings matched as whole phrases in both languages → `unknown`), then **answer scoring**. Scoring takes the best per-sample-question token overlap (weight 4), plus topic overlap (2), answer text (0.5), and an entity boost from experience/project slug tokens (3); the top answer must exceed a score threshold and cover at least 20% of the question tokens, otherwise the outcome is `unknown`. Ties break on publication answer order. The evaluation set under `packages/chat/eval/` runs in CI against the seed publication from `@portfolio/cms-provision/seed` and refuses questions that normalize too closely to seed sample questions.

## Chat API

`POST /chat` on the public API validates `@portfolio/chat` requests, loads the active publication from the cache, and answers in **model** or **scripted** mode. **Sensitive topics** from the scripted matcher run before any model call. Visitor rate limits (15 messages per 10 minutes and 60 per day, keyed by an in-memory hash of IP and user agent) force scripted mode with `failure_reason` `rate_limited` while still returning an answer. **Model mode** requires the all-or-nothing model environment group (base URL, key, name, prices; the budget and the daily limit have defaults and do not enable it); the monthly budget is summed from `chat_exchanges` in Directus (60 s cache, Europe/Paris month). Budget exhaustion, provider errors, invalid structured output or unknown identifiers fall back to scripted mode for that message and record a `failure_reason`. Each message creates one `chat_exchanges` row (questions are not logged). `POST /contact` stores `contact_messages`, applies a honeypot and hourly rate limit, and emails the owner when SMTP is configured.

## Content API

`api/` runs two Hono apps on Node 24, sharing one cache.

- `api/src/publications/directus-publication-source.ts` reads the active publication with the API service token, validates its content with `validatePublicationContent` and returns an `ActivePublication`, or `null` when nothing is active.
- `api/src/publications/active-publication-cache.ts` is the API's only state: it loads the publication on the first request, shares one read between concurrent first requests, and lets only the most recently started read replace the cached value.
- `api/src/http/public-app.ts`, on `API_PORT` (8066, the only routed port), serves `GET /content/active`, `GET /content/photo`, `POST /chat`, `POST /contact`, `POST /events` (CORS allow-list, no credentials), and `GET /health`.
- `api/src/http/internal-app.ts`, on `API_INTERNAL_PORT` (8067, reachable only inside the instance), serves the publication hook: it checks the bearer in constant time, reloads the cache, then asks `api/src/site-build/site-build-dispatcher.ts` to rebuild the site of its environment (`workflow_dispatch` of `content.yml`). A skipped or failed dispatch is logged and never fails the hook.
- `api/src/main.ts` closes both servers on `SIGTERM` and `SIGINT`, within eight seconds.

## Measurement

Directus operational collections written by the API (not by visitors): `events`, `visitor_salts`, `search_console_rows`, `daily_stats`, and `alerts`. The owner reads all of them; the assistant reads analytics collections (`events`, `chat_exchanges`, `search_console_rows`, `daily_stats`) but not `alerts` or contact messages; the API service creates and manages these rows for ingestion, retention and scheduled jobs (jobs themselves are plan 5b).

The site sends anonymous audience events with `navigator.sendBeacon` (fallback `fetch` with `keepalive`) to `POST /events` as `text/plain` JSON. The module in `site/src/lib/tracking/` skips tracking when Global Privacy Control or Do Not Track is set, and on `localhost` / `127.0.0.1` unless the build sets `NEXT_PUBLIC_ALLOW_LOCALHOST_TRACKING=true` (e2e only); it stores nothing on the device. The API discards bot user agents and privacy signals (`DNT: 1`, `Sec-GPC: 1`), rate-limits per visitor hash (120 events per 10 minutes), validates event types with zod, and writes rows fire-and-forget. Visitor hashes use `sha256(daily salt ‖ IP ‖ user agent)` truncated to 16 hex characters; the salt is one random 32-byte value per Europe/Paris calendar day in `visitor_salts`, cached in memory and created idempotently under concurrency.

Privacy copy lives on `/privacy` and `/fr/confidentialite`, linked from the chat notice and footer.

## Delivery

Staging and production are instances of the VPS controller, delivered by GitHub Actions from images built once per commit. Production serves the site from GitHub Pages; staging serves the same export with nginx. Details in [delivery.md](delivery.md).

## Site

The site is a static export with two root layouts, `site/app/(en)` for `/` and `site/app/(fr)/fr` for `/fr`, and `site/app/global-not-found.tsx` for `404.html`. With JavaScript, the default experience is chat-first (spec 4.1); without JavaScript, visitors see the quick view (the same semantic sections as before). Full section HTML stays in the export for SEO; JSON-LD is unchanged.

```
initial content --content:seed--+
                                +--> site/content/publication.json --next build--> site/out
GET /content/active --content:pull--+
                                        +--> /data/publication.json (static route, build time)
```

- `site/src/lib/publication/`: reads and validates the publication file on the server (`read-publication.ts`); `parse-publication.ts` validates JSON in the browser; `sections.ts` maps the publication to the typed section view models in `site/src/types/page-sections.ts`.
- `site/app/data/publication.json/route.ts`: exports the active publication snapshot at build time so the client can load it on first interaction without bloating the main bundle.
- `site/src/lib/chat/`: `sendChatMessage` posts to `POST /chat` with a 12 s timeout and zod-validated responses; network errors, timeouts, non-2xx responses and invalid payloads fall back to `createScriptedMatcher` from `@portfolio/chat` on the loaded publication. `conversationId` is a random UUID kept in memory only; the last eight turns (≤ 500 characters each) are sent with each request. No cookies or storage for chat state.
- `site/src/components/chat/`: welcome stage (owner photo when pulled from the API, otherwise initials), conversation log, block renderers (identifiers from published data only), desktop stage and mobile inline blocks, in-chat contact form (`POST /contact` with the same limits as the API, honeypot, elapsed time, mailto fallback); quick-view toggle driven by CSS (`html[data-js]` set before paint). Stage motion uses `LazyMotion` + `domAnimation`; `prefers-reduced-motion` keeps fades only.
- `site/src/lib/contact/`: client validation and `sendContactMessage` for the in-chat form (no storage).
- `GET /content/photo` (`api/src/content/profile-photo.ts`): streams the active publication profile photo from Directus `/assets/<fileId>` with the API token; `404` when absent, `ETag` = fileId, image content types only.
- `site/scripts/write-content.ts` with `--api` (content pull): downloads the profile photo to `site/public/generated/profile-photo.*` (gitignored) and records path/size in the publication manifest used at build time.
- `site/e2e/`: Playwright tests against the static export served by `site/scripts/serve-static-export.ts` (GitHub Pages-style `/fr` → `fr.html`); chat and contact API origins mocked with `page.route`.
- `site/src/lib/i18n/`: locales, paths, file names, the interface dictionary and the French browser preference behind the discreet link to `/fr`.
- `site/src/components/page/`: root document (inline `data-js` script), portfolio shell, quick-view sections and language suggestion; `site/src/components/sections/` renders the quick-view sections.
- `site/src/lib/seo/`: metadata with canonical and `hreflang` alternates (`x-default` on English), `ProfilePage` JSON-LD, site URL and Content Security Policy.
- `site/app/og/[file]/route.tsx` and `site/app/documents/[file]/route.tsx`: Open Graph PNGs and CV PDFs (`site/src/cv/`, React-PDF with the Geist font), exported at build time.

## Access

| Account     | Working collections  | Publications         | Other                                                                                                                                           |
| ----------- | -------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner       | All actions          | Create, read, update | Files; reads users, flows, operations                                                                                                           |
| Assistant   | Create, read, update | Read                 | Reads files; MCP with deletes disabled                                                                                                          |
| API service | None                 | Read                 | Create chat exchanges and contact messages; read chat exchanges for budget; read `directus_files` for profile photo streaming; no Studio access |
| Public      | None                 | None                 | None                                                                                                                                            |

The definitions live in `cms/provision/src/access/policies.ts`; the integration tests compare the stored permissions with them.
