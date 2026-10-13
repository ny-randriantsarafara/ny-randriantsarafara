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
```

Directus runs on http://localhost:8065. Sign in as the owner (`OWNER_EMAIL`, `OWNER_PASSWORD`) to work on content; the admin account (`ADMIN_*`) is for provisioning and tests.

`pnpm provision` is idempotent: run it after every change to `cms/provision`. The initial content is loaded only while no experience exists and `SEED_INITIAL_CONTENT=true`. To start again from an empty database: `docker compose down --volumes`, then the first start again.

## Commands

| Command                                                         | Effect                                                   |
| --------------------------------------------------------------- | -------------------------------------------------------- |
| `pnpm dev:site`                                                 | Next.js site on http://localhost:3000                    |
| `pnpm build:site`                                               | Static export in `site/out`                              |
| `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm format:check` | Checks run by CI                                         |
| `pnpm build:extension`                                          | Builds `cms/extensions/publication`; Directus reloads it |
| `pnpm cms:up`, `pnpm cms:down`, `pnpm cms:logs`                 | Local stack                                              |
| `pnpm provision`                                                | Applies the CMS configuration                            |
| `pnpm test:cms`                                                 | Integration tests against the local stack                |

## Accounts

| Account            | Use                                                                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Owner (`OWNER_*`)  | Edits content, prepares and publishes. `OWNER_ENFORCE_TFA=true` requires a TOTP code (production).                                       |
| Assistant (`AI_*`) | MCP access for ChatGPT and Claude: creates, reads and updates working content, reads publications and files. Never deletes or publishes. |
| Admin (`ADMIN_*`)  | Provisioning and integration tests only.                                                                                                 |

## Publishing content

1. Edit the working collections (Profile to Site settings) in Directus or through MCP.
2. In Publications, run **Prepare publication**. A refusal lists every missing text or broken reference as `collection[slug].field.locale`.
3. Open the prepared publication and review its changes.
4. Run **Publish** on it. The previous active publication becomes superseded, and the API hook is called.
5. To roll back, run **Publish** on a superseded publication.

If the hook fails, the publication stays active and the error says so; run **Publish** on it again, which only repeats the hook call. Until the API exists (plan 2), nothing listens on `PUBLICATION_HOOK_URL` outside the integration tests, so a manual Publish ends with this error.

## MCP

Directus serves MCP at http://localhost:8065/mcp. Locally, a client authenticates with the assistant token (`Authorization: Bearer <AI_TOKEN>`). The assistant protocol, `cms/provision/src/assistant-protocol.md`, is the MCP system prompt. OAuth for ChatGPT and Claude is enabled in production (plan 3).

## Integration tests

`pnpm test:cms` needs the stack started and provisioned with the initial content. The publication tests listen on port 8066 of the host for the hook; Directus reaches them through `host.docker.internal`. They leave publications behind, because the owner cannot delete publications.
