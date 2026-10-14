# Platform and Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the portfolio on the personal VPS as two instances of the VPS controller, `portfolio-staging` and `portfolio-prod`, delivered by GitHub Actions from images built once per commit; rebuild the site of an environment after each publication; deliver staging from `main`. Production is promoted at launch (plan 7), once its DNS names exist.

**Architecture:** One multi-target `Dockerfile` builds `directus` (with the publication extension), `api`, `provision` and, for staging only, `site` (nginx serving the static export). `deploy/` renders one Compose file per instance with `ny.vps.app` and validates it with the controller's own code before any request. The API splits into a public app (`API_PORT` 8066, routed) and an internal app (`API_INTERNAL_PORT` 8067, never routed) for the publication hook; after a reload, the hook dispatches `content.yml`, which rebuilds the site of its environment. Production serves the site from GitHub Pages, built from the production publication at the commit of the `production-release` tag.

**Tech Stack:** Docker Buildx, GHCR, `node:24-alpine`, `directus/directus:12.5.0`, `nginxinc/nginx-unprivileged:1.30-alpine`, Postgres 17.11, ansible-core 2.21.5, `ny.vps` 1.3.1 (vps-services), Python 3.13 `unittest`, ShellCheck, actionlint, GitHub Actions with pinned action SHAs, Hono, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-13-conversational-portfolio-design.md` (sections 11.1, 11.2, 11.5, 13 part 3). Plans 1 and 2 are implemented.

**How this plan was produced:** written after a spike that built every image, rendered both instances, ran the staging instance locally under the controller's normalized Compose (dependency order, limits, healthchecks, `cap_drop ALL`, loopback ports) and published through the hook. Each task names the committed files; the spike measurements are under Evidence.

## Global Constraints

- Code rules of plans 1 and 2: no `any`, no `as` (including `as const`), no `@ts-ignore`, no non-null `!`; `const` only; early returns; English code, comments, docs and commits; Prettier settings of the repository.
- Images by digest only. Every service declares `cpus`, `mem_limit`, `pids_limit` and a healthcheck (retries 1 to 10); no `ports`, `networks`, `build` or `tmpfs` (controller rules).
- Instance budgets: staging 0.85 vCPU / 1 024 MiB, production 0.8 vCPU / 1 088 MiB, inside the environment budgets approved for vps-services (production 3.1 / 5 120, staging 2 / 2 048, previews 1 / 1 024, one preview).
- Secrets live in GitHub environment secrets and in the owner's private files (`~/.config/portfolio/`, `0600`); scripts name missing values and never print one. Workflows pass secrets through `env`, never through command lines.
- `deploy/instances.json` is the only list of host names.
- Pinned action SHAs, identical to the-media where shared.

## Review Focus

1. The hook is unreachable from the public route: the public app answers `404` on it, and only port 8066 is routed (Task 2, `deploy/smoke.sh`).
2. A failed or skipped site build never fails the hook, and a failed reload never dispatches (Task 3).
3. The dispatch token is least privilege: `workflow_dispatch` on `content.yml` needs `actions: write` and `contents: read` only (Task 3).
4. Rendered Compose files pass the controller's `normalize` and stay within the instance budgets (Task 5, `deploy/check_delivery.py`).
5. Production never ships unreleased code: content builds use the `production-release` tag commit; promotion reuses CI digests (Task 6).
6. A private GHCR package stops a delivery before the request, with a clear message (Task 5).

## Rulings

| Decision                                                        | Why                                                                                                                                                        | Cost if wrong                                                                    |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Two API ports; the hook on 8067 only                            | The controller routes one port per hostname; the hook must not be public                                                                                   | One extra listener; a public hook would only be bearer-protected                 |
| `workflow_dispatch` of `content.yml`, not `repository_dispatch` | Fine-grained token with `actions: write` + `contents: read`; `repository_dispatch` needs `contents: write`                                                 | A token with broader rights in the API                                           |
| Dispatch failure answers `204` and is logged                    | The publication is already active; Directus would report a failed publish otherwise                                                                        | A missed rebuild until the alert of plan 5 or a manual run                       |
| Generation in milliseconds                                      | Staging has two writers (code and content); the controller keeps the latest                                                                                | Two deliveries in the same millisecond: the second is refused and can be rerun   |
| `production-release` tag                                        | Content builds of production must use released code                                                                                                        | A wrong tag would build Pages from older code, not deploy images                 |
| First staging site from the seed (`staging-content=seed`)       | The staging API does not exist before the first delivery                                                                                                   | One manual dispatch                                                              |
| `production.yml` input `site`                                   | The first production delivery has no publication yet                                                                                                       | One extra input                                                                  |
| nginx without `read_only`                                       | The unprivileged image writes its temp files under `/tmp`, and `tmpfs` is refused by the controller                                                        | Writable container layer for a static server                                     |
| nginx sends `X-Robots-Tag: noindex, nofollow`                   | Staging must never be indexed                                                                                                                              | None                                                                             |
| No pull request previews                                        | One preview slot on the host; the portfolio has staging                                                                                                    | PR changes are seen on staging after merge                                       |
| TFA and initial content in both instances                       | Same provisioning everywhere; the owner signs in with TOTP from the start                                                                                  | Content seeded in production must be reviewed before launch (plan 4 answer bank) |
| Production delivery waits for plan 7                            | `api.` and `cms.nyhasinavalona.com` do not resolve yet                                                                                                     | None: staging proves the chain                                                   |
| CORS deferred to plan 4                                         | The browser makes no API call before the chat                                                                                                              | None                                                                             |
| Anonymous pull checked before each delivery                     | The package inherited the public repository's visibility at its first push; GitHub has no API to set it, so a later change must stop deliveries clearly    | None observed: the first delivery pulled anonymously                             |
| Pages deployment in its own reusable workflow (`pages.yml`)     | GitHub refuses a run whose nested job asks for more than its caller grants (first CI dispatch: startup failure); staging builds must not hold Pages rights | One more workflow file                                                           |
| No committed local rehearsal script                             | Staging is the rehearsal; the spike script depended on a local registry                                                                                    | Infrastructure changes are tried on staging                                      |

## File Map

| Path                                                                                                | Responsibility                                                                                |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| vps-services `inventories/production/group_vars/all.yml`, `README.md`                               | Portfolio deploy accounts, production aliases, budgets, one preview                           |
| `api/src/environment.ts`                                                                            | `API_INTERNAL_PORT` (distinct from `API_PORT`), optional site build configuration             |
| `api/src/http/public-app.ts`, `internal-app.ts`, `responses.ts`, `index.ts`                         | Public content and health app; internal hook app; shared JSON 404/500                         |
| `api/src/site-build/site-build-dispatcher.ts`                                                       | `workflow_dispatch` of `content.yml`, five-second timeout, outcome descriptions               |
| `api/src/main.ts`                                                                                   | Two servers, graceful shutdown within eight seconds                                           |
| `cms/tests/src/content-api.test.ts`                                                                 | Content API against Directus with both apps                                                   |
| `.env.example`                                                                                      | `API_INTERNAL_PORT`, hook on 8067, empty `SITE_BUILD_*`                                       |
| `Dockerfile`, `.dockerignore`, `deploy/site/nginx.conf`                                             | Image targets; build context; staging static server                                           |
| `site/src/lib/seo/__tests__/site-url.test.ts`                                                       | `getSiteUrl` per environment                                                                  |
| `deploy/instances.json`                                                                             | Host names of both instances                                                                  |
| `deploy/compose.yml.j2`, `deploy/ansible/*`                                                         | Instance Compose, playbook, environment limits, inventory, pinned collection                  |
| `deploy/delivery_inputs.py`, `deploy/test_delivery_inputs.py`                                       | Private delivery inputs from GitHub environment values; unit tests                            |
| `deploy/check_delivery.py`, `deploy/render.sh`                                                      | Render with placeholders and validate with the controller's rules                             |
| `deploy/check-public-images.sh`, `deploy/smoke.sh`                                                  | Anonymous pull check before a delivery; public checks after it                                |
| `deploy/requirements.in`, `deploy/requirements.txt`                                                 | Hashed ansible-core                                                                           |
| `.github/workflows/images.yml`, `site.yml`, `pages.yml`, `deploy.yml`                               | Reusable: images, static export (staging image or Pages artifact), Pages deployment, delivery |
| `.github/workflows/ci.yml`, `content.yml`, `production.yml`                                         | Delivery checks and staging; content builds; production promotion                             |
| `docs/delivery.md`, `docs/architecture.md`, `docs/development.md`, `docs/standards.md`, `README.md` | Documentation                                                                                 |

---

### Task 1: Register the portfolio in vps-services

**Files:** vps-services `inventories/production/group_vars/all.yml`, `README.md`.

- [x] **Step 1:** Generate ed25519 keys `github-actions@portfolio-nonprod` and `github-actions@portfolio-prod` into `~/.config/portfolio/deploy/` (`0600`).
- [x] **Step 2:** Add the accounts (`portfolio-nonprod`: staging; `portfolio-prod`: prod), `vps_instance_hostnames.portfolio-prod: [api.nyhasinavalona.com, cms.nyhasinavalona.com]`, budgets prod 3.1 / 5 120, staging 2 / 2 048, preview 1 / 1 024, `vps_preview_limit: 1`.
- [x] **Step 3:** `make check` (92 tests, ansible-lint, syntax, collection build), PR, CI, merge.
- [x] **Step 4:** `register-app` in check mode, then applied; policy and `vpsctl status` read back.

### Task 2: Public and internal API apps

**Files:** `api/src/environment.ts` (+ test), `api/src/http/{public-app,internal-app,responses,index}.ts` (+ tests), `api/src/main.ts`, `api/package.json` (`./http` export), `cms/tests/src/content-api.test.ts`, `.env.example`. Deleted: `api/src/http/app.ts` and its test.

- [x] **Step 1:** Tests: `API_INTERNAL_PORT` required and different from `API_PORT`; the public app serves content and health and answers `404` on the hook; the internal app keeps the hook contract (`401`, `400`, `204`, `503`).
- [x] **Step 2:** Implement; `main.ts` serves both apps and closes both on `SIGTERM`/`SIGINT`, forcing exit after eight seconds.
- [x] **Step 3:** `pnpm test`, `pnpm test:cms` (stack restarted with the hook on 8067).

### Task 3: Site build dispatcher

**Files:** `api/src/site-build/site-build-dispatcher.ts` (+ test), `api/src/environment.ts`, `api/src/http/internal-app.ts`, `.env.example`.

- [x] **Step 1:** Tests: skipped when unconfigured or without token; request URL, headers and body; `401`/`403` described as a rejected token; other statuses; timeout; network error; outcome descriptions. Environment: all three variables empty means off; environment required when repository or token is set; repository must be `owner/name`.
- [x] **Step 2:** Implement with `AbortSignal.timeout(5000)`; the internal app dispatches only after a successful reload and answers `204` whatever the outcome.

### Task 4: Images

**Files:** `Dockerfile`, `.dockerignore`, `deploy/site/nginx.conf`, `site/src/lib/seo/__tests__/site-url.test.ts`, `.gitignore`.

- [x] **Step 1:** Build each target locally; the API and provision installs use `--prod --ignore-scripts` (the root `prepare` runs Husky).
- [x] **Step 2:** nginx serves `/fr` from `fr.html`, `404.html` for unknown paths, with `X-Robots-Tag: noindex, nofollow`.
- [x] **Step 3:** Restore the `getSiteUrl` tests deleted with `seo.test.ts` in plan 2.

### Task 5: Deploy directory

**Files:** `deploy/instances.json`, `deploy/compose.yml.j2`, `deploy/ansible/{deploy.yml,inventory.yml,known_hosts,requirements.yml,environments/staging.yml,environments/prod.yml}`, `deploy/delivery_inputs.py`, `deploy/test_delivery_inputs.py`, `deploy/check_delivery.py`, `deploy/render.sh`, `deploy/check-public-images.sh`, `deploy/smoke.sh`, `deploy/requirements.{in,txt}`.

- [x] **Step 1:** `python3 -m unittest discover -s deploy -p 'test_*.py'` (13 tests).
- [x] **Step 2:** `deploy/render.sh staging|prod` accepted by the controller's `normalize` within the instance budgets.
- [x] **Step 3:** `shellcheck deploy/*.sh`; `check-public-images.sh` against a public image, a missing digest, a private package and a malformed reference.

### Task 6: Workflows

**Files:** `.github/workflows/{images,site,deploy,ci,content,production}.yml`.

- [x] **Step 1:** actionlint clean.
- [x] **Step 2:** CI gains the `delivery` job; on `main` it publishes images, builds the staging site, delivers staging and keeps `release.json`.

### Task 7: Documentation

- [x] `docs/delivery.md`; architecture, development, standards and README updated.

### Task 8: Operations

- [x] GitHub environments `nonprod` (branch `main`) and `production` (branch `main`, owner review); secrets and variables of `docs/delivery.md`.
- [x] Merge to `main`, push; dispatch `ci.yml` with `staging-content=seed` (the push run was cancelled: the staging API did not exist yet).
- [x] GHCR package: public at its first push, no owner action.
- [x] Publish on staging; `content.yml` for staging; smoke checks green.

## Evidence (staging, 2026-10-14)

- CI on `main` with `staging-content=seed`: images published, staging delivered, 23 smoke checks green, `release.json` recorded.
- Prepare and Publish in the staging CMS: the API served the new publication at once (hook on the internal port, on the VPS).
- `content.yml` for staging, then a CI run on `main` with `content=api`: the site rebuilt from the staging publication and redelivered; `vpsctl status` reports `portfolio-staging` ready, locally and publicly.
- `production.yml` dispatched on a feature branch: accepted by GitHub, every job skipped (they run on `main` only).
- Two startup failures fixed on the way: the Pages job and then the Pages workflow asked for more permissions than their callers granted (`pages.yml`).

## Evidence (spike, 2026-10-13)

- Images built: `directus`, `api`, `provision`, `site`. Under the controller's normalized Compose and the staging limits, startup in dependency order: database 19 s, Directus 21 s (0.5 vCPU, well inside the controller's 120 s wait), provision 17 s, API 19 s, site 6 s.
- Publish through the Directus flows activated a publication; Directus called `http://api:8067/internal/publications/activated`; the API logged the reload and `Site build skipped: SITE_BUILD_TOKEN is not set`; `/health` reported the new publication id.
- `deploy/smoke.sh` against the local instance: all checks passed, including the hook kept off the public port and the staging `noindex` header.
- Gates on the branch: `pnpm validate`, `pnpm test` (225 tests), `pnpm test:cms` (48), delivery unit tests (13), ShellCheck, actionlint, `git diff --check`.
