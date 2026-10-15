# Local development

## Prerequisites

- Node 24 (`.nvmrc`). `corepack enable` provides pnpm 10.32.1 (`packageManager`).
- Docker with Compose v2.

## First start

```bash
pnpm install
scripts/ci/write-env.sh   # .env with random secrets; it is ignored by Git
pnpm cms:up               # builds the Directus extension, starts Postgres and Directus
pnpm provision            # schema, access, settings, flows, initial content
pnpm content:seed         # site/content/publication.json from the initial content
```

Directus runs on http://localhost:8065. Sign in as the owner (`OWNER_EMAIL`, `OWNER_PASSWORD`) to work on content; the admin account (`ADMIN_*`) is for provisioning and tests.

`pnpm provision` is idempotent: run it after every change to `cms/provision`. With `SEED_INITIAL_CONTENT=true`, the full initial content loads only while no experience exists; if experiences are already present but the answers collection is empty, provisioning inserts the seed answers once and leaves a non-empty answers collection untouched. To start again from an empty database: `docker compose down --volumes`, then the first start again.

A `.env` written before the content API lacks the `API_*` variables: copy that block from `.env.example`, replace each `change-me` value with a random one (`openssl rand -hex 32`), then run `pnpm provision`.

## Commands

| Command                                                         | Effect                                                                            |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `pnpm dev:site`                                                 | Next.js site on http://localhost:3000                                             |
| `pnpm dev:api`                                                  | Content API on http://localhost:8066 (hook on 8067), reading `.env`               |
| `pnpm content:seed`                                             | Writes `site/content/publication.json` from the initial content                   |
| `pnpm content:pull`                                             | Writes it from `CONTENT_API_URL` (`GET /content/active` and `GET /content/photo`) |
| `pnpm test:e2e`                                                 | Seeds, builds the site, runs Playwright (Chromium) on `site/out`                  |
| `pnpm build:site`                                               | Static export in `site/out`; needs the publication file                           |
| `pnpm lighthouse`                                               | Lighthouse CI on `site/out`, after a build                                        |
| `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm format:check` | Checks run by CI                                                                  |
| `pnpm build:extension`                                          | Builds `cms/extensions/publication`; Directus reloads it                          |
| `pnpm cms:up`, `pnpm cms:down`, `pnpm cms:logs`                 | Local stack                                                                       |
| `pnpm provision`                                                | Applies the CMS configuration                                                     |
| `pnpm test:cms`                                                 | Integration tests against the local stack                                         |

## Accounts

| Account               | Use                                                                                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner (`OWNER_*`)     | Edits content, prepares and publishes. `OWNER_ENFORCE_TFA=true` requires a TOTP code (production).                                                                    |
| Assistant (`AI_*`)    | MCP access for ChatGPT and Claude: creates, reads and updates working content, reads publications and files. Never deletes or publishes.                              |
| API service (`API_*`) | Static token of the content API. Reads publications; creates operational rows (events, salts, analytics imports, chat exchanges, contact messages); no Studio access. |
| Admin (`ADMIN_*`)     | Provisioning and integration tests only.                                                                                                                              |

## Publishing content

1. Edit the working collections (Profile to Site settings) in Directus or through MCP.
2. In Publications, run **Prepare publication**. A refusal lists every missing text or broken reference as `collection[slug].field.locale`.
3. Open the prepared publication and review its changes.
4. Run **Publish** on it. The previous active publication becomes superseded, and the API hook is called.
5. To roll back, run **Publish** on a superseded publication.

With `pnpm dev:api` running, the hook reloads the API cache and `GET /content/active` serves the new publication at once. If the hook fails (for example because the API is stopped), the publication stays active and the error says so; run **Publish** on it again, which only repeats the hook call.

## Content API

| Endpoint                                | Behavior                                                                                                                                                                                                                                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /content/active`                   | Active publication `{ publicationId, activatedAt, content }`. `ETag: "<publicationId>"`, `Cache-Control: public, max-age=60`, `304` on a matching `If-None-Match`, `404` when nothing is active, `503` when Directus fails.                                                               |
| `GET /content/photo`                    | Profile photo bytes from Directus when the active publication has `profile.photo`. `404` when no photo, `ETag: "<fileId>"`, `Cache-Control: public`, content type restricted to `image/*`.                                                                                                |
| `GET /health`                           | `{ status, directus, publicationId }`; `200` when Directus answers, otherwise `503` with `status: "degraded"`.                                                                                                                                                                            |
| `POST /chat`                            | One visitor message (`@portfolio/chat` contract). `200` with `mode` `model` or `scripted`, `400` on invalid input, `503` when no publication is active. Requires `CORS_ALLOWED_ORIGINS` (local default `http://localhost:3000`). Model and SMTP groups are optional (see `.env.example`). |
| `POST /contact`                         | Contact form JSON (honeypot, rate limit). `200` `{ "status": "accepted" }`, `400` on invalid input, `429` when rate limited.                                                                                                                                                              |
| `POST /events`                          | Audience beacon (`text/plain` or JSON body). `204` when stored or silently discarded (bots, DNT/GPC, rate limit), `400` on invalid input. Visitor hash uses the daily salt in Directus.                                                                                                   |
| `POST /internal/publications/activated` | Publication hook, on `API_INTERNAL_PORT` only. `Authorization: Bearer <PUBLICATION_HOOK_SECRET>`, body `{ "publicationId": "<uuid>" }`; `204` after the reload, `401` on a wrong secret, `400` on an invalid body, `503` with `{"error":"unavailable"}` when the reload fails.            |

The API keeps the active publication in memory and loads it on the first request. It reads Directus with `API_TOKEN`, serves content and health on `API_PORT` (8066) and the hook on `API_INTERNAL_PORT` (8067), which deployed instances never route.

After a reload, a deployed API dispatches the site build of its environment (`SITE_BUILD_ENVIRONMENT`, `SITE_BUILD_REPOSITORY`, `SITE_BUILD_TOKEN`; see [delivery.md](delivery.md)). Locally these stay empty and the API logs `Site build skipped: site builds are not configured`.

A `.env` written before the hook moved to its own port: add `API_INTERNAL_PORT=8067` and the three empty `SITE_BUILD_*` lines from `.env.example`, set the port of `PUBLICATION_HOOK_URL` to 8067, then run `pnpm cms:up` so Directus reads it.

## Site

The site is a static export: `/` in English, `/fr` in French. The build reads `site/content/publication.json` (ignored by Git), written by `pnpm content:seed` or `pnpm content:pull`, and fails with a readable message when the file is missing or invalid. Facts come only from the publication; interface strings live in `site/src/lib/i18n/dictionary.ts`.

| Variable               | Default                          | Use                                          |
| ---------------------- | -------------------------------- | -------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | `https://nyhasinavalona.com`     | Canonical URLs, sitemap, Open Graph, JSON-LD |
| `NEXT_PUBLIC_API_URL`  | `https://api.nyhasinavalona.com` | `connect-src` of the Content Security Policy |
| `CONTENT_API_URL`      | none                             | API read by `pnpm content:pull`              |

The build also produces `/data/publication.json` (publication snapshot for the chat client), `/og/og-en.png`, `/og/og-fr.png`, `/documents/ny-randriantsarafara-cv-en.pdf`, `/documents/ny-randriantsarafara-cv-fr.pdf`, `sitemap.xml`, `robots.txt` and `404.html`. After `pnpm content:pull`, the owner photo may be copied to `site/public/generated/` for the welcome avatar (seed mode keeps initials when no file is present).

Playwright e2e: `pnpm test:e2e` (install Chromium once with `pnpm --filter @portfolio/site exec playwright install --with-deps chromium`). CI runs the same job after unit checks. End-to-end tests mock the API; verifying chat answers against a live publication stack stays in `pnpm test:cms` and staging smoke checks, not browser e2e.

With JavaScript enabled, the home pages default to the conversational UI; the quick view remains one click away and is what no-JS visitors see. Chat calls use `NEXT_PUBLIC_API_URL` (`POST /chat`); when the API is unreachable, the browser falls back to the scripted matcher using the loaded publication JSON.

nyhasinavalona.com keeps its last GitHub Pages deployment until production is launched (plan 7); the workflows that will replace it are described in [delivery.md](delivery.md).

## MCP

Directus serves MCP at http://localhost:8065/mcp. Locally, a client authenticates with the assistant token (`Authorization: Bearer <AI_TOKEN>`). The assistant protocol, `cms/provision/src/assistant-protocol.md`, is the MCP system prompt. Staging enables OAuth with Dynamic Client Registration and Client ID Metadata Document registration for ChatGPT and Claude at https://cms.portfolio-staging.apps.nyhasinavalona.com/mcp. Sign in with the dedicated assistant account to retain its content-only permissions. Production OAuth remains disabled until launch (plan 7).

## Integration tests

`pnpm test:cms` needs the stack started and provisioned with the initial content. Stop `pnpm dev:api` first: the publication tests listen on the port of `PUBLICATION_HOOK_URL` (8067) on the host, and Directus reaches them through `host.docker.internal`. The content API test runs the API in process against Directus. The tests leave publications behind, because the owner cannot delete publications.

### Profils de fournisseurs du chat

Le provisioning ajoute la collection privée `model_provider_profiles`. Le propriétaire peut y enregistrer plusieurs configurations (`name · provider · model`) et choisir `configuration_source = profile` puis `active_profile` dans « Chat model ». Le snapshot singleton/profil est lu ensemble et mis en cache 30 secondes. Une relation vide désactive le modèle, sans retour implicite à legacy. `disabled` bloque également les réponses modèle en cache. Les paramètres, prix et identité du profil participent à l'identité du cache.

Les clés restent uniquement sur le serveur : `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`. Une clé seule active les budgets globaux ; aucune clé d'un autre fournisseur n'est substituée. OpenRouter peut réutiliser `MODEL_API_KEY` uniquement avec la base legacy exacte `https://openrouter.ai/api/v1`. Le mode `legacy` conserve l'ancienne base et les anciens réglages. Le provisioning sauvegarde une seule fois la configuration legacy valide sous l'identifiant réservé `c4a040b6-e4a0-5b9a-8134-98be450983d2`, sans changer la sélection et sans écraser ce profil ensuite.

Les endpoints des profils sont fixes côté serveur. Les paramètres OpenRouter (`session_id`, breakpoint de cache, `reasoning`) ne sont jamais envoyés à Google/OpenAI ; OpenAI utilise `max_completion_tokens`, Gemini `max_tokens`. Gemini refuse localement `none` hors modèles 2.5 non-Pro ; les autres incompatibilités de modèle restent des erreurs explicites, sans retry payant. Vérifier les capacités du modèle avant de sélectionner son profil. Références officielles vérifiées le 15 octobre 2026 : [Google OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai), [OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create).
