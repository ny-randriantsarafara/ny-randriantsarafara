# Delivery

The portfolio keeps its production API/CMS on the personal VPS and its static site on GitHub Pages. Pull requests replace permanent staging with isolated previews. GitHub Actions builds immutable images; the VPS controller (`ny.vps.app` in [vps-services](https://github.com/ny-randriantsarafara/vps-services)) admits and runs them.

## Instances and budgets

| Instance         | Deploy account      | Site                                     | API / CMS                                                                                   |
| ---------------- | ------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| `portfolio-prod` | `portfolio-prod`    | `nyhasinavalona.com` (Pages)             | `api.nyhasinavalona.com` / `cms.nyhasinavalona.com`                                         |
| `portfolio-pr-N` | `portfolio-nonprod` | `portfolio-pr-N.apps.nyhasinavalona.com` | `api.portfolio-pr-N.apps.nyhasinavalona.com` / `cms.portfolio-pr-N.apps.nyhasinavalona.com` |

`deploy/instances.json` owns these addresses. Preview PR numbers must be positive canonical integers. Each preview has instance-scoped database/uploads volumes and credentials derived with HMAC-SHA256 from the **nonprod** `DIRECTUS_SECRET` and its PR number. Keep that nonprod seed stable while a preview exists: rotating it requires destroying/recreating the disposable preview first. No production secret, database, upload or content export is copied.

Production retains its limits: 0.8 vCPU / 1,088 MiB, including provisioning. A complete preview declares 0.85 vCPU / 1,024 MiB across Postgres, Directus, provisioning, API and nginx; the platform permits at most 1 vCPU / 1,024 MiB. Initialization counts even when services run sequentially. The shared platform admits only **one preview globally**, without evicting another application, within its 6,144 MiB application ceiling. A busy slot fails delivery; retry CI after the slot is released. The controller removes previews after 72 hours without delivery or when a PR closes.

Retire `portfolio-staging` through the platform administrator's retirement operation before enabling previews. Retirement preserves its named volumes, private Compose and retired registry record. This application pipeline does not retire production or delete staging data.

## Opening a preview CMS

For PR 42, open `https://cms.portfolio-pr-42.apps.nyhasinavalona.com` and sign in as `owner-pr-42@example.invalid`. TFA enrollment remains required. Retrieve **only** its derived owner password in your private terminal through your administrator SSH account (replace `ADMIN` with your account and `42` with the PR):

```bash
ssh ADMIN@51.210.10.127 sudo -n python3 - 42 <<'PY'
import json
import re
import sys
from pathlib import Path

number = sys.argv[1]
if not re.fullmatch(r"[1-9][0-9]{0,9}", number) or int(number) > 2147483647:
    raise SystemExit("Invalid preview PR number")
policy = json.loads(Path("/etc/vps-platform/policy.json").read_text())
path = Path(policy.get("apps_dir", "/srv/vps/apps")) / "portfolio" / ("pr-" + number) / "compose.json"
compose = json.loads(path.read_text())
print(compose["services"]["provision"]["environment"]["OWNER_PASSWORD"])
PY
```

Run this yourself, never in Actions or a recorded/shared session. It reads the root-owned private Compose already retained by the controller, prints just this preview's password, and never reads or sends the derivation seed to the VPS. The app deploy account cannot perform this administrator operation. A closed or expired preview no longer provides a working CMS; retained Compose is not evidence it is still running. Keep the enrolled TFA until the preview is destroyed. Recreating it from empty volumes requires enrolling again. Production login and provisioning are unchanged.

## Workflow and trust boundaries

| Workflow                                            | Trigger and result                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`                                            | PRs, main pushes, manual checks. Typecheck, lint, formatting, unit tests, extension/site builds, Playwright, Lighthouse, CMS integration, delivery renders and image builds remain gates. Successful **pushes** to main record `release.json` with immutable image digests, retained 90 days. No permanent staging delivery. |
| `preview.yml`                                       | Called only after all PR gates, for a same-repository, non-draft PR. Reconciles the **current** PR state under one non-cancelling lifecycle lock, builds and delivers synthetic content to that PR's URLs. The close event calls the same reconciliation, requiring only the nonprod SSH key for cleanup.                    |
| `production.yml`                                    | Successful CI completion on main automatically selects the same release. Manual dispatch requires an explicit successful main push CI run ID for redelivery or rollback. Admission validates provenance and current-main freshness before joining the delivery queue.                                                        |
| `production-delivery.yml`                           | Under the production lock: revalidate, deliver selected commit/digests, update `production-release`, build from the production publication, deploy Pages.                                                                                                                                                                    |
| `content.yml`                                       | Production API publication hook, or manual retry. Reads `production-release`, rebuilds from the active **production** publication and deploys Pages, using the same production lock. Never ships unreleased main code.                                                                                                       |
| `images.yml`, `site.yml`, `deploy.yml`, `pages.yml` | Reusable build, static export, controller delivery and Pages operations. Pages rights are limited to the Pages deployment job.                                                                                                                                                                                               |

Promotion validates repository and head repository, exact CI workflow path/name, push event, main branch, successful completed run, run ID and immutable commit. Automatic promotion also requires the current main SHA, checked again after queueing immediately before private inputs. `release.commit`, image repository, image target, commit tag and SHA256 digest must match that run. Artifacts cannot supply scripts or choose a production commit independently. Delivery checks out the selected release commit; the current main policy checks it separately. No image is rebuilt during promotion.

A stale workflow-run retry fails **before** entering the shared production queue. The shared code/content lock uses GitHub’s native `queue: max`: up to 100 pending operations are preserved, in order of entering the queue, and additional arrivals are cancelled when full. Valid content builds therefore do not evict a pending code delivery. The lock covers delivery, release tagging and Pages completion; content builds read the correct production tag. See [GitHub’s concurrency contract](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency). In-flight CI and lifecycle operations are never cancelled. Current PR reconciliation ensures that a delayed checked run replacing a pending close performs cleanup when the PR is now closed, and an obsolete checked head cannot deploy after reopen/update.

Rollback: manually run `production.yml` with the older trusted successful **push CI** `run_id`. It promotes that run's images and selected source commit, then moves the release tag and rebuilds Pages. Keep `site` enabled unless performing the first launch before an active publication exists. This does not reverse database migrations or restore content. Model-profile rollback still requires selecting `configuration_source = legacy` before an incompatible image restore. Keep legacy profiles/fields. After the 90-day artifact retention period, an expired release cannot be promoted; production content builds still work from `production-release`.

## Preview content, hooks and analytics

`PREVIEW_CONTENT=true` selects the same synthetic seed for the preview's static site and CMS provisioning. Production/local content seeding stays unchanged. The preview static export is rebuilt on **PR updates**, not CMS publication; it never pulls production content. Its canonical site URL, CSP, chat, contact and analytics API destination all use that PR's own URLs. The nginx site sends `X-Robots-Tag: noindex`.

The CMS publication hook stays internal: `http://api:8067/internal/publications/activated`. The public API routes only 8066. In a preview **all three** `SITE_BUILD_ENVIRONMENT`, `SITE_BUILD_REPOSITORY` and `SITE_BUILD_TOKEN` are empty; the grouped API configuration remains valid and no production build can be dispatched. Model keys and SMTP credentials are empty too: chat uses scripted content and contact messages stay inside the preview. A new CMS has synthetic working content; publish it in that CMS to exercise its API publication/cache flow. The static frontend remains the synthetic PR-build snapshot.

The existing analytics schema names non-production data `staging`; preview Directus, provisioning and API deliberately use that label in their **isolated database**. The label does not route telemetry. Browser events go only to the preview API; no production analytics endpoint is used. CI browser tests explicitly use localhost origins.

Production publication behavior remains:

```text
Publish in Directus → internal API hook/cache reload → content.yml dispatch → production-release code + active publication → GitHub Pages
```

Only production receives `SITE_BUILD_TOKEN`, a fine-grained repository token with `actions: write` and `contents: read`. A missing/rejected token is logged without reversing publication; manually run `content.yml` with `production` to retry.

## GitHub configuration and publication prerequisites

The `production` environment holds the existing production SSH/application secrets and account email variables. Optional keys remain `SITE_BUILD_TOKEN`, `MODEL_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `SMTP_PASSWORD`. Existing production provider/SMTP/CORS settings and TFA policy are preserved. In particular its configured OpenRouter base requires its matching production key.

The `nonprod` environment needs only its deploy-account `VPS_SSH_PRIVATE_KEY` and a stable random `DIRECTUS_SECRET` of at least 32 characters as the preview derivation seed. Preview cleanup requires only the SSH key. It never receives a production dispatch, provider or SMTP credential.

Before publication, configure nonprod deployment rules for the exact trusted PR refs in addition to main; retain explicit same-repository/draft checks in CI. Align production environment protection with merge-to-production (the current owner-review gate otherwise adds another approval). Configure effective main protection/required gates. These are account settings, not permissions for this code change to alter live accounts. Images in `ghcr.io/ny-randriantsarafara/portfolio` must be public for anonymous VPS pulls; the workflow checks this before delivery.

## Local verification

Use Node 24 and the repository's pnpm 10.32.1. Install the pinned Ansible dependencies and collection in an isolated environment:

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install --require-hashes -r deploy/requirements.txt
ansible-galaxy collection install -r deploy/ansible/requirements.yml
python3 -m unittest discover -s deploy -p 'test_*.py' -v
actionlint
shellcheck deploy/*.sh
deploy/render.sh preview /tmp/portfolio-render-preview 42
deploy/render.sh prod /tmp/portfolio-render-prod
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
git diff --check
```

Renders never contact the VPS. They validate digest pins, budgets including initialization, routes, analytics roles/labels, preview hook/dispatch isolation and the API's real startup parser. Render outputs contain private placeholders; keep real deliveries in private directories. `deploy/smoke.sh --api <url> --cms <url> [--site <preview-url>]` checks health, content, private collection/MCP access, the unrouted hook, preview noindex and browser CORS/chat/contact/events behavior. Full CI also runs CMS integration, Playwright, Lighthouse and Docker target builds.
