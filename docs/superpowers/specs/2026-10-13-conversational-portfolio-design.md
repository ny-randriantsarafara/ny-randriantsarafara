# Conversational portfolio — design

Status: draft for owner review. Date: 2026-10-13.

## 1. Intent

`nyhasinavalona.com` becomes a portfolio discovered by talking to an AI. The conversation is the main interface, not a chatbot added to a classic page. Recruiters and engineering managers hiring senior backend / architect profiles in the EU ask what they would ask in an interview and get the answers the owner would give, while the interface shows the matching timeline, experiences, projects, skills and figures.

Three principles drive every choice:

1. Premium, fluid interface with deliberate animations.
2. Reliable answers grounded only in content the owner wrote and published.
3. Minimal cost: at most 5 € per month of new spending.

### Success criteria

- A visitor asking any question of the evaluation set (section 7.6), in English or French, gets a grounded answer and relevant blocks.
- No fact reaches a visitor unless it is part of the active publication (section 5.3).
- The chat keeps answering in scripted mode when the model fails, the budget is exhausted or the VPS is unreachable.
- The owner edits content in Directus or through ChatGPT/Claude (MCP), publishes with one click, and the public site reflects it within 5 minutes; the chat reflects it immediately.
- One Directus instance shows traffic, chat usage, unanswered questions, contact messages and Google Search Console data, and the MCP can read all of it.
- The full content is present in the static HTML; Lighthouse targets of section 9 pass.
- Production data is backed up every night off-server and a restore has been tested.

### Out of scope

Voice input, visitor accounts, per-PR preview environments, automated SEO reports, session replay, funnels, A/B testing, languages other than English and French, blog.

## 2. Decisions

| #   | Decision                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Audience: recruiters and engineering managers. Conversion: contact message, email/LinkedIn, CV download.                                       |
| D2  | Hybrid engine: a small paid model composes answers only from the owner's answer bank; a deterministic scripted engine is the fallback.         |
| D3  | The AI speaks in the first person, with a visible disclosure: "AI answering from my own interview answers".                                    |
| D4  | English at `/`, French at `/fr`. Facts, answers, CV and UI exist in both languages. The chat replies in the language of the visitor's message. |
| D5  | The owner writes the answer bank in both languages; the first draft is prepared from existing content.                                         |
| D6  | Chat-first experience; a quick view shows everything without conversation; full content in the HTML.                                           |
| D7  | Dedicated Directus instance on the VPS: CMS, MCP and analytics in one tool.                                                                    |
| D8  | Public site stays static on GitHub Pages; API and CMS run on the VPS.                                                                          |
| D9  | Model budget: hard cap of 5 € per month, enforced by the API and by the provider's spending limit.                                             |
| D10 | The whole scope ships together: the current site stays live until everything works on staging.                                                 |
| D11 | The AI (MCP) edits working content only; the owner publishes. Analytics are read-only for the AI; no deletion; no access to contact messages.  |
| D12 | The model selects blocks by identifier; blocks render from published data, never from model text.                                              |
| D13 | Desktop: conversation plus a stage composed by the AI. Mobile: blocks inline in the thread.                                                    |
| D14 | Guardrails of section 7.5; the sensitive-topic list is editable in the CMS.                                                                    |
| D15 | In-chat contact form; email notification to the owner through Gmail SMTP.                                                                      |
| D16 | `api.nyhasinavalona.com` and `cms.nyhasinavalona.com`.                                                                                         |
| D17 | Production (owner approval) and staging (follows `main`); no per-PR previews.                                                                  |
| D18 | CV PDFs (EN, FR) generated at each build from the published content.                                                                           |
| D19 | Privacy rules of section 10.                                                                                                                   |
| D20 | SEO advice on demand through the MCP only.                                                                                                     |
| D21 | Evolve the current visual identity (glass, light/dark, ambient gradients); owner photo on the welcome stage.                                   |
| D22 | Nightly encrypted backups to Cloudflare R2, built in `vps-services` for every production app.                                                  |
| D23 | Health dashboard and email alerts of section 11.4.                                                                                             |

## 3. Architecture

```
Visitor ── nyhasinavalona.com (GitHub Pages, static Next.js export)
             │  chat, events, contact (CORS)
             ▼
          api.nyhasinavalona.com ── portfolio API (Node) ── model provider
             │  Directus REST (service token)            ── Google Search Console API
             ▼                                           ── Gmail SMTP, GitHub API
          cms.nyhasinavalona.com ── Directus 12 + Postgres
             ▲
Owner ── Directus app / ChatGPT or Claude through Directus MCP (OAuth)
```

| Component                       | Hosting                          | Address                                                                        |
| ------------------------------- | -------------------------------- | ------------------------------------------------------------------------------ |
| Static site                     | GitHub Pages                     | `nyhasinavalona.com`, `www`                                                    |
| Portfolio API                   | VPS instance `portfolio-prod`    | `api.nyhasinavalona.com`                                                       |
| Directus (CMS, MCP, dashboards) | VPS instance `portfolio-prod`    | `cms.nyhasinavalona.com`                                                       |
| Staging site, API, CMS          | VPS instance `portfolio-staging` | `portfolio-staging.apps.nyhasinavalona.com`, `api.` and `cms.` one label below |
| Backups                         | Cloudflare R2                    | —                                                                              |

### 3.1 Repository layout

The repository becomes a pnpm monorepo, following `my-media` (Node ≥ 24, pnpm workspaces):

| Path                          | Responsibility                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `site/`                       | Next.js 16 static export (current app moved here), chat UI, stage, quick view, tracker, CV generation.             |
| `api/`                        | HTTP API (Hono on Node): content, chat, events, contact, internal hooks, scheduled jobs.                           |
| `packages/content/`           | Publication snapshot schema (zod), TypeScript types, test fixtures. Shared by site, API and CMS.                   |
| `packages/chat/`              | Chat contract (request/response schemas), block catalog, scripted matcher, evaluation set. Shared by site and API. |
| `cms/schema/`                 | Directus record types and the mapping between working records and the publication content.                         |
| `cms/provision/`              | Directus schema, policies, dashboards and settings as code, applied idempotently at each delivery.                 |
| `cms/extensions/publication/` | Directus extension: Prepare and Publish flow operations (snapshot, validation, change summary, activation, hook).  |
| `cms/tests/`                  | Integration tests against a local stack: schema, permissions, MCP access, publication.                             |
| `deploy/`                     | Compose template, Ansible environments, smoke checks, following `vps-services/docs/APP-CONTRACT.md`.               |

`docs/architecture.md` and `docs/standards.md` are rewritten for the new layout.

## 4. Visitor experience

### 4.1 Layout

- **Welcome (before the first message):** photo, name, headline, a two-line introduction, four starter questions, quick-view button, language and theme toggles, AI disclosure.
- **Desktop:** conversation column and a large stage. Each answer recomposes the stage with its blocks; the previous composition stays reachable from the message that produced it.
- **Mobile:** full-screen conversation; blocks render inline under the answer.
- **Quick view:** the full content as semantic sections (profile, key figures, timeline, projects, skills, contact). It is the server-rendered HTML of the page: without JavaScript, the visitor sees the quick view; with JavaScript, the conversation is the default and the quick view is one click away.
- **Contact block:** opens the contact form, prefilled with the topic of the conversation.

### 4.2 Motion

- The answer text reveals progressively once the validated response arrives (no token streaming, see 7.2).
- Blocks enter the stage with shared-layout transitions: a project card expands into its case study, the timeline zooms on an experience, the skills map filters.
- `prefers-reduced-motion` replaces transitions with fades.
- The current identity is kept: glass surfaces, light/dark themes, ambient gradients, `motion` library.

### 4.3 Languages

`/` serves English, `/fr` French, with `hreflang` alternates and `x-default` on English. No automatic redirect; a French-speaking browser sees a discreet link to `/fr`. UI strings live in the site; content strings come from the publication.

### 4.4 Accessibility

Conversation log in an `aria-live="polite"` region, full keyboard operation, focus moved to new answers, visible focus, contrast AA in both themes, blocks expose their content as text.

## 5. Content and publication

### 5.1 Working collections

Every visitor-facing text exists in English and French as a pair of fields (`headline_en`, `headline_fr`) shown side by side in Directus. With two fixed languages, pairs are simpler than Directus translations for the owner, for MCP edits and for validation. References between items are lists of slugs, checked when a publication is prepared.

| Collection                  | Content                                                                                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profile` (singleton)       | Name, headline, introduction, location, availability, work authorization, languages, email, LinkedIn and GitHub links, photo and its alt text, disclosure text. |
| `capabilities`              | Slug, icon, title, description, sort (cloud and infrastructure, backend and APIs, data and observability, quality and delivery, frontend).                      |
| `skills`                    | Slug, name, capability slug, featured flag, sort.                                                                                                               |
| `experiences`               | Slug, company, role, start and end months, location, summary, highlights, skill slugs, sort.                                                                    |
| `projects`                  | Slug, kind (`professional` or `personal`), optional icon, title, company, role, start and end years, summary, case study, skill slugs, sort.                    |
| `key_figures`               | Slug, value, label, sort.                                                                                                                                       |
| `answers`                   | Slug, topic, sample questions (several per language), answer text, experience, project, skill and key-figure slugs, suggested blocks, starter flag, sort.       |
| `chat_settings` (singleton) | Unknown-question reply, refusal reply, sensitive topics (keywords per language and the reply for each), suggested topics.                                       |
| `site_settings` (singleton) | SEO title and description.                                                                                                                                      |

`public/data/content.json` is migrated into these collections, then removed from the site.

### 5.2 Operational collections

Written by the API, never by visitors directly.

| Collection            | Content                                                                               |
| --------------------- | ------------------------------------------------------------------------------------- |
| `publications`        | Immutable snapshots (section 5.3).                                                    |
| `events`              | Tracker events (section 8.1).                                                         |
| `chat_exchanges`      | One row per answered message (section 8.2).                                           |
| `contact_messages`    | Name, email, company, message, locale, conversation topic, status (`new`, `handled`). |
| `search_console_rows` | Date, query, page, country, device, clicks, impressions, CTR, position.               |
| `daily_stats`         | One row per day of aggregates kept after raw data expires.                            |
| `alerts`              | Sent alerts, used for deduplication.                                                  |
| `visitor_salts`       | Current day's random salt for visitor hashing (section 10).                           |

### 5.3 Publication

Visitors only ever see the **active publication**: an immutable JSON snapshot of all working collections, validated by the `packages/content` schema.

- **Prepare** (owner only, button on the publications list): builds the snapshot, validates it and stores it as a `prepared` publication with its change summary; earlier prepared publications become `discarded`. Validation refuses when a visitor-facing field lacks English or French, when a slug reference points to a missing item, or when a suggested block is not in the catalog. Preparing without any change since the active publication is refused.
- **Change summary:** the prepared publication shows the items and fields changed since the active publication, so edits made through the MCP are reviewed before they go public.
- **Publish** (owner only, button on a prepared publication, with confirmation): marks it `active`, the previous one `superseded`, and calls the API hook. Running it again on the active publication only repeats the hook call.
- **Rollback** (owner only): Publish on a superseded publication.
- **API hook:** reloads the active publication (chat updated immediately) and dispatches the site build to GitHub (`repository_dispatch`, event `content-published`, environment in the payload).
- **Site build:** fetches the active publication from `GET /content/active` on the API of the target environment, generates pages and CV PDFs, deploys. For production, a content-triggered build checks out the commit of the current production release, so unreleased code on `main` never reaches the public site through a content change.

### 5.4 Access policies

| Policy                     | Rights                                                                                                                                                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner                      | Everything on content; publish and rollback; read analytics; update contact message status. TOTP 2FA required.                                                                                                              |
| Assistant (MCP)            | Create, read, update on working collections; read publications and analytics (`events`, `chat_exchanges`, `search_console_rows`, `daily_stats`). No contact messages, no delete, no publish, no settings, users or secrets. |
| API service (static token) | Read publications; create rows in operational collections; delete expired rows for retention.                                                                                                                               |
| Public                     | Nothing.                                                                                                                                                                                                                    |

The MCP uses Directus's built-in server with OAuth for ChatGPT and Claude, configured as in `my-media`.

## 6. API

| Endpoint                                | Purpose                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------ |
| `GET /content/active`                   | Active publication (public content), cached, with its identifier.                    |
| `POST /chat`                            | Answer one visitor message (section 7).                                              |
| `POST /events`                          | Tracker beacon (section 8.1).                                                        |
| `POST /contact`                         | Contact message (section 7.7).                                                       |
| `GET /health`                           | Liveness and dependency status, for the external monitor.                            |
| `POST /internal/publications/activated` | Publication hook; shared secret; only reachable from the Directus container network. |

CORS allows the production and staging site origins and `localhost` in development. All request bodies are validated with zod; any invalid input is a `400` with no detail echoed back. Scheduled jobs (section 8.4) run in-process in the single API replica, in the `Europe/Paris` timezone.

## 7. Chat

### 7.1 Contract

```ts
type ChatRequest = {
  locale: 'en' | 'fr'; // page locale
  messages: { role: 'visitor' | 'assistant'; text: string }[]; // last 8 turns, each ≤ 500 chars
  conversationId: string; // random UUID kept in memory by the page
};

type ChatResponse = {
  mode: 'model' | 'scripted';
  publicationId: string;
  reply: {
    text: string;
    answerSlugs: string[]; // answers the text is built from
    blocks: Block[];
    suggestions: string[]; // 2 or 3 follow-up questions
    outcome: 'answered' | 'unknown' | 'sensitive' | 'refused';
  };
};

type Block =
  | { type: 'timeline'; experienceSlugs?: string[]; skillSlug?: string }
  | { type: 'experience'; slug: string }
  | { type: 'project'; slug: string }
  | { type: 'skills'; capabilitySlug?: string; highlightSlugs?: string[] }
  | { type: 'key-figures'; slugs: string[] }
  | { type: 'strengths'; answerSlug: string }
  | { type: 'contact'; topic?: string }
  | { type: 'cv' };
```

The API is stateless: the page sends the recent history with each message.

The **reply language** is the language of the visitor's last message, detected by a stop-word heuristic in `packages/chat`; when the detection is inconclusive, the page locale applies. Both modes use the answers written in that language, so a French question is answered with the owner's French wording.

### 7.2 Model mode

1. Check the visitor rate limit and the monthly budget (7.4). Either exceeded: scripted mode.
2. Build the prompt: behaviour rules, the catalog of fact identifiers with short labels, the answers in the reply language with their identifiers, `chat_settings`, the history.
3. Call the model with structured output matching the reply schema, timeout 8 s.
4. Parse with zod, then check every identifier against the active publication. Any failure: scripted mode for this message, failure recorded.
5. Return the response; record the exchange with token usage and cost.

Responses are not streamed: an answer is shown only after validation, and the page animates its reveal.

Behaviour rules given to the model: speak as the owner in the first person; use only the provided answers and facts; never invent figures, employers, dates or opinions; reply in the reply language; one short paragraph by default; choose blocks that support the answer; when nothing in the answers covers the question, return `unknown`.

The model is selected by a benchmark of two or three small models on the real answer bank and evaluation set. Criteria: answer accuracy on the evaluation set, schema compliance, latency, cost, the provider's commitment not to train on API data, EU hosting preferred. The model sits behind a provider-agnostic interface so it can be replaced by configuration.

### 7.3 Scripted mode

`packages/chat` contains a deterministic matcher used by the API (budget or model failure) and by the site (API unreachable, using the answers embedded at build time):

- Detect the reply language (7.1), then normalize the question (lowercase, accents removed, stop words of that language removed).
- Check sensitive-topic keywords first: match gives `sensitive` with the configured reply and a contact block.
- Score answers by weighted term overlap against their sample questions, topic and title; the best answer above a threshold gives `answered` with its suggested blocks.
- Otherwise `unknown`, with the configured reply and suggested topics.

### 7.4 Limits and budget

- Per visitor: 15 messages per 10 minutes and 60 per day, keyed by a hash of IP and user agent held in memory only.
- Global safety: 2,000 model calls per day.
- Monthly budget: `MONTHLY_MODEL_BUDGET_EUR=5`. Cost per exchange is computed from the provider's token usage and a per-model price table in configuration, expressed in euros. Month-to-date cost is summed from `chat_exchanges` (cached 60 s). At 100 %, every message uses scripted mode until the next month.
- The owner also sets the provider's own spending limit.

### 7.5 Guardrails

- Salary, compensation, notice period, remote or contract conditions: never answered with figures; `sensitive` reply inviting direct contact, with the contact block.
- Off-topic requests and manipulation attempts ("ignore your instructions", code generation, other personas): short polite refusal (`refused`) and suggestions.
- Current and past employers: nothing beyond what the answers state.
- Unanswered questions: `unknown`, logged and listed in the dashboard as content gaps.
- Initial sensitive topics: compensation, notice period, remote and contract conditions, personal and family life, health, politics, religion. The owner completes the list in `chat_settings`.

### 7.6 Evaluation set

`packages/chat/eval/` holds recruiter questions in English and French (at least 40 per language) with the expected answer slug, outcome and block types, written against the test fixtures. CI runs it on the scripted matcher with a minimum top-1 accuracy of 80 %. A script runs the same set against the model and the real active publication for the benchmark and after significant content changes; it is not run in CI because it spends budget.

### 7.7 Contact

`POST /contact`: name (≤ 100), email, company (optional, ≤ 100), message (≤ 2,000), locale, conversation topic. Anti-spam: hidden honeypot field, submission faster than 3 s rejected, 3 messages per hour per visitor hash. The message is stored, then an email is sent to the owner with the visitor's address as `Reply-To`. No email is ever sent to the visitor.

## 8. Measurement

### 8.1 Tracker

A small script in the site sends events with `navigator.sendBeacon` to `POST /events`: `page_view`, `quick_view_open`, `block_view` (type and identifier), `suggestion_click`, `cv_download` (locale), `contact_click` (channel), `contact_submit`, `locale_switch`.

Stored per event: time, type, path, locale, referrer host, UTM source/medium/campaign, device class, visitor day hash, event payload. Requests from bots, or carrying `Sec-GPC: 1` or `DNT: 1`, are discarded.

### 8.2 Chat log

Per exchange: time, locale, conversation identifier, question, mode, outcome, answer identifiers, blocks, latency, model, tokens, cost, failure reason when the model was bypassed.

### 8.3 Search Console

Domain property `sc-domain:nyhasinavalona.com`, read through a Google service account with read access. A daily job imports the last 10 days (data arrives with a delay) by date, query, page, country and device, upserting rows so reruns are idempotent.

### 8.4 Scheduled jobs

| Time        | Job                                                                                                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 03:00       | Search Console import.                                                                                                                                                                        |
| 03:30       | `daily_stats` for the previous day: visitors, page views, conversations, model vs scripted, outcomes, contact messages, CV downloads, impressions, clicks, CTR, average position, model cost. |
| 04:00       | Retention purge (section 10); delete previous days' visitor salts.                                                                                                                            |
| 04:15       | Check the GitHub token and re-enable the external monitor workflow if GitHub disabled it.                                                                                                     |
| Every 5 min | Alert checks (section 11.4).                                                                                                                                                                  |

### 8.5 Dashboards

Provisioned as code in Directus Insights:

- **Audience:** visitors and page views per day, referrers, devices, locales, quick-view and CV usage.
- **Chat:** conversations per day, model vs scripted, outcomes, latest unanswered questions, month-to-date cost against the budget, latency, model failures.
- **Search:** impressions, clicks, CTR, average position, top queries and pages.
- **Contact:** new messages.

The MCP reads the same collections, so the owner can ask ChatGPT or Claude for analyses and SEO advice.

## 9. SEO and performance

- Static HTML with the full content per language, canonical URLs, `hreflang` alternates, sitemap with both locales, robots.
- JSON-LD `ProfilePage` with a `Person` (name, job title, employer, skills, languages, links).
- Open Graph image per language generated at build.
- CV PDFs at `/documents/ny-randriantsarafara-cv-en.pdf` and `-fr.pdf`, generated with `@react-pdf/renderer`.
- Lighthouse CI on `/` and `/fr`, mobile profile: performance ≥ 90, accessibility ≥ 95, SEO = 100, best practices ≥ 95.
- Content Security Policy restricting `connect-src` to the API origin.

## 10. Privacy

- No cookie and no tracking storage on the visitor's device. The conversation identifier lives in page memory. The only stored value is the theme the visitor explicitly chooses (local storage), a preference exempt from consent.
- IP addresses are never stored. Unique visitors are counted with `sha256(daily salt ‖ IP ‖ user agent)` truncated to 16 hex characters; the salt is random, changes every day and is deleted afterwards.
- No consent banner: the measurement is designed for the CNIL audience-measurement exemption (single purpose, anonymous statistics, no cross-site tracking).
- Notice under the chat input: questions are recorded anonymously to improve answers.
- Retention: events and chat exchanges 13 months; daily aggregates without limit; contact messages 3 years after the last exchange; Search Console rows without limit (no personal data).
- Privacy page at `/privacy` and `/fr/confidentialite`, linked from the quick view and footer. It lists the processors: the model provider (chat questions), Google (contact notification emails), OVHcloud (VPS), GitHub (site hosting) and Cloudflare (backups).
- Contact messages stay in Directus: neither the MCP nor the model ever receives them.

## 11. Operations

### 11.1 Delivery

Following `my-media`'s CI/CD design (`my-media/docs/superpowers/specs/2026-10-11-cicd-design.md`) and the `vps-services` application contract:

- **Pull request:** typecheck, lint, format, unit tests, evaluation set, site build on fixtures, extension build, Compose rendering; integration job with a local stack (provision, CMS tests, end-to-end Playwright tests, Lighthouse CI).
- **`main`:** images built in CI and pushed to GHCR by digest; `portfolio-staging` deployed with the non-production account; staging site rebuilt from the staging active publication.
- **Production:** "Deploy production" workflow with the owner's approval in a GitHub environment: deploys `portfolio-prod`, records the release commit, builds the site from the production active publication and deploys it to GitHub Pages.
- **Content publication:** builds and deploys the site of the publishing environment without approval: publishing is the owner's approval.

The staging site is served by a static container in `portfolio-staging`, because GitHub Pages hosts one site per repository.

### 11.2 Instances, domains and capacity

`portfolio-prod` and `portfolio-staging` contain Postgres, Directus (with the publication extension), the API, the provisioning job and, for staging only, the static site. Initial limits, to be confirmed by measuring staging:

| Service          | Production              | Staging                  |
| ---------------- | ----------------------- | ------------------------ |
| Postgres         | 0.1 vCPU, 192 MiB       | 0.1 vCPU, 160 MiB        |
| Directus         | 0.4 vCPU, 512 MiB       | 0.5 vCPU, 448 MiB        |
| API              | 0.2 vCPU, 192 MiB       | 0.1 vCPU, 160 MiB        |
| Provisioning job | 0.1 vCPU, 192 MiB       | 0.1 vCPU, 192 MiB        |
| Static site      | —                       | 0.05 vCPU, 64 MiB        |
| **Total**        | **0.8 vCPU, 1,088 MiB** | **0.85 vCPU, 1,024 MiB** |

**Capacity decision to confirm.** Admission budgets in `vps-services` cover all instances of an environment. Declared today: production 2.1 vCPU / 3,968 MiB (my-media and Home Assistant) for a 2.25 / 4,096 budget; staging 1 vCPU / 1,024 MiB (my-media) for a 1 / 1,024 budget. Neither can admit the portfolio. Recommended change in `vps-services`:

| Budget     | Today                          | Proposed                       |
| ---------- | ------------------------------ | ------------------------------ |
| Production | 2.25 vCPU, 4,096 MiB           | 3.1 vCPU, 5,120 MiB            |
| Staging    | 1 vCPU, 1,024 MiB              | 2 vCPU, 2,048 MiB              |
| Previews   | 2 vCPU, 2,048 MiB, 2 at a time | 1 vCPU, 1,024 MiB, 1 at a time |

Declared memory then totals the host's 8 GiB. These are ceilings: the last documented real usage was 1.4 GiB, and the controller keeps refusing admissions below its minimum free memory. CPU is already shared beyond 4 vCPU by design. The alternatives are a larger VPS (new cost) or no portfolio staging.

Domains:

- Production: `api.nyhasinavalona.com` and `cms.nyhasinavalona.com`, A and AAAA records to the VPS, not proxied, declared for `portfolio-prod` in `vps_instance_hostnames`.
- Staging: platform convention under `apps.nyhasinavalona.com`.
- Search Console: TXT verification record at the apex.

### 11.3 Backups

Built in `vps-services` (separate specification and pull requests), for every production instance:

- Nightly encrypted restic backup to a Cloudflare R2 bucket: Postgres dumps of `portfolio-prod` and `my-media-prod`, and `my-media` uploads.
- Retention: 7 daily, 4 weekly, 6 monthly snapshots.
- Documented and tested restore procedure.
- Email to the owner when a backup fails or none succeeded for 36 hours.
- Cloudflare usage-based billing notification at 8 GB of R2 storage, below the 10 GB free tier, since overage is billed to the card on file.

### 11.4 Health and alerts

Emails through Gmail SMTP, deduplicated through `alerts`:

| Condition                                                       | Frequency                    |
| --------------------------------------------------------------- | ---------------------------- |
| Month-to-date model cost reaches 80 %, then 100 % of the budget | Once per threshold per month |
| 5 model failures within 15 minutes                              | At most hourly               |
| Search Console import failed                                    | Once per day                 |
| Site build dispatch failed, or GitHub token rejected            | Once per day                 |
| New contact message                                             | Each message                 |

External monitor: a scheduled GitHub Actions workflow every 15 minutes checks the site (HTTP 200 and a content marker), `GET /health` and Directus `/server/ping`; a failure fails the workflow and GitHub emails the owner. GitHub disables scheduled workflows of public repositories after 60 days without activity; the API's daily job re-enables it (section 8.4).

### 11.5 Security

- Secrets (model API key, GitHub token, Google service account, SMTP password, Directus secrets) in GitHub environments, passed to Compose as required environment variables; never in Git, logs or command output.
- GitHub token: fine-grained, portfolio repository only, `actions: write` and `contents: read`.
- Directus public role without permissions; owner with TOTP; MCP OAuth limited to the ChatGPT and Claude redirect domains.
- The publication hook is not routed publicly.

## 12. Testing

- **Unit (Vitest):** content schema and validation rules, chat contract, matcher and evaluation set, prompt building, model response validation, budget and rate limits, tracker filtering and hashing, retention selection, alert deduplication, Search Console upserts, site components and blocks.
- **Integration (`cms/tests`):** provisioning idempotency, each policy's permissions, MCP cannot publish or delete, publication validation and rollback, API service token scope.
- **End-to-end (Playwright, local stack):** welcome to answer with stage blocks, mobile inline blocks, scripted fallback when the API is unreachable, quick view without JavaScript, language switch, contact form, publication reflected in the chat.
- **Lighthouse CI:** targets of section 9.

## 13. Delivery plan

Each part gets its own implementation plan, written once the previous part is implemented so it builds on real interfaces. They are built in this order; the public site switches only when all of them work on staging.

1. **CMS and publication** (local): monorepo with the site moved to `site/`, `packages/content`, Directus schema, policies, MCP settings, migration of `content.json` with French drafts, publication extension, integration tests, CI.
2. **Content API and bilingual site** (local): API skeleton with `GET /content/active` and the publication hook, site built from the publication at `/` and `/fr`, SEO, CV PDFs.
3. **Platform and delivery:** `vps-services` admission budgets, `portfolio-prod` hostnames and deploy accounts; images, Compose template, staging and production workflows, content-triggered builds.
4. **Conversational experience:** chat contract, model mode with budget, scripted matcher and evaluation set, answer bank first draft, welcome, stage, blocks, quick view, contact.
5. **Measurement:** tracker, chat log, Search Console import, aggregates, retention, dashboards, alerts, external monitor.
6. **Backups** (`vps-services`, own specification): nightly restic backups to R2.
7. **Launch:** answer bank validated by the owner, model benchmark, MCP OAuth, DNS records, Search Console verification, production deployment, hub documentation (`docs/vps.md`).

## 14. Owner actions

- Confirm the capacity change of section 11.2.
- Rewrite and validate the answer bank in English and French.
- Provide the photo.
- Create the model provider account with a spending limit, once the benchmark has chosen it.
- Create a Gmail app password.
- Verify the domain in Search Console and grant read access to the service account.
- Activate R2 with a card and set the usage notification.
- Create the fine-grained GitHub token.
- Authorize the DNS changes when they are due, and approve production deployments.
