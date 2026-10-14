# Delivery

The portfolio runs on the personal VPS as two instances of the `portfolio` application, managed by the VPS controller of [vps-services](https://github.com/ny-randriantsarafara/vps-services) (collection `ny.vps`, role `ny.vps.app`). GitHub Actions builds the images once, delivers them to staging, then promotes the same digests to production.

## Environments

| Instance            | Deploy account      | Site                                        | API and CMS                                                                                      |
| ------------------- | ------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `portfolio-staging` | `portfolio-nonprod` | `portfolio-staging.apps.nyhasinavalona.com` | `api.portfolio-staging.apps.nyhasinavalona.com`, `cms.portfolio-staging.apps.nyhasinavalona.com` |
| `portfolio-prod`    | `portfolio-prod`    | `nyhasinavalona.com` (GitHub Pages)         | `api.nyhasinavalona.com`, `cms.nyhasinavalona.com`                                               |

`deploy/instances.json` is the single list of these host names; the workflows, the Ansible playbook and the delivery checks read it. Each instance runs Postgres, Directus, the provisioning job and the API. Staging also serves its static export with nginx, marked `noindex`; production serves the same export from GitHub Pages. There are no pull request previews.

The VPS accepts a delivery only within the instance budgets of `deploy/ansible/environments/*.yml` (staging 0.85 vCPU / 1 024 MiB, production 0.8 vCPU / 1 088 MiB) and the platform's Compose rules: images by digest, CPU, memory and process limits, healthchecks, no ports, networks, builds or tmpfs.

## Images

The `Dockerfile` has one target per image, all in the package `ghcr.io/ny-randriantsarafara/portfolio`:

| Target      | Content                                                                  |
| ----------- | ------------------------------------------------------------------------ |
| `directus`  | Directus 12.5.0 with the publication extension                           |
| `api`       | The content API (public port 8066, internal hook port 8067)              |
| `provision` | The idempotent CMS provisioning, run before the API starts               |
| `site`      | Staging only: nginx with the static export (named context `site-export`) |

The VPS pulls without credentials: the package must be public. `deploy/check-public-images.sh` stops a delivery before the request when an image cannot be pulled anonymously.

## Workflows

| Workflow                                            | Trigger                                | Effect                                                                                                                                                                                                        |
| --------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`                                            | Pull request, push to `main`, manual   | Checks, delivery checks, images. On `main`: publishes the images, builds the staging site from the staging publication, delivers staging, keeps `release.json` 90 days.                                       |
| `content.yml`                                       | The API after a publication, or manual | Rebuilds the site of the environment whose publication changed: staging redelivers its last release with a new site image; production redeploys GitHub Pages.                                                 |
| `production.yml`                                    | Manual, with the `production` approval | Promotes the release of a successful CI run on `main`, moves the `production-release` tag to its commit, then rebuilds GitHub Pages from the production publication.                                          |
| `images.yml`, `site.yml`, `pages.yml`, `deploy.yml` | Called by the workflows above          | Build the images; build the static export; deploy it to GitHub Pages (production only, the only job with Pages rights); send one request to the VPS controller and check the public URLs (`deploy/smoke.sh`). |

A content build of production uses the commit of the `production-release` tag, so publishing content never ships unreleased code. Deliveries to one environment run one at a time and are never cancelled midway. Every delivery carries a generation in milliseconds: the controller accepts whichever delivery is the latest, from code or content.

Rollback: run `production.yml` with the `run_id` of an older successful CI run on `main`. Content rollback stays in the CMS: **Publish** on a superseded publication.

`release.json` is kept 90 days, the maximum for a public repository. Promotion, rollback and staging content builds need the artifact of their CI run: after 90 days without a commit, rerun `ci.yml` on `main` first. Production content builds read the `production-release` tag and do not expire.

## Publication to site

```
Publish in Directus --hook (api:8067)--> API reloads its cache --workflow_dispatch content.yml--> site rebuilt
```

The hook port is reachable only inside the instance; the public route of the API is port 8066. After a reload, the API dispatches `content.yml` with `SITE_BUILD_TOKEN`, a fine-grained GitHub token limited to this repository with `actions: write` and `contents: read`. Without the token, the API logs `Site build skipped: SITE_BUILD_TOKEN is not set`; a rejected dispatch is logged and the hook still answers `204`, so the publication stays active and `content.yml` can be run by hand.

## GitHub configuration

| Environment  | Protection                                  | Secrets and variables |
| ------------ | ------------------------------------------- | --------------------- |
| `nonprod`    | Branch `main`                               | Staging values        |
| `production` | Branch `main`, required review by the owner | Production values     |

Secrets of each environment: `VPS_SSH_PRIVATE_KEY` (key of its deploy account), `POSTGRES_PASSWORD`, `DIRECTUS_SECRET`, `ADMIN_PASSWORD`, `ADMIN_TOKEN`, `OWNER_PASSWORD`, `AI_PASSWORD`, `API_PASSWORD`, `API_TOKEN`, `PUBLICATION_HOOK_SECRET` and, optionally, `SITE_BUILD_TOKEN`, `MODEL_API_KEY` and `SMTP_PASSWORD`. Variables: `ADMIN_EMAIL`, `OWNER_EMAIL`, `AI_EMAIL`, `API_EMAIL`. Optional GitHub variables for the API (non-secret, empty until configured): `MODEL_API_BASE_URL`, `MODEL_NAME`, `MODEL_INPUT_PRICE_EUR_PER_MILLION`, `MODEL_OUTPUT_PRICE_EUR_PER_MILLION`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `CONTACT_RECIPIENT`, `CONTACT_SENDER`; wire them through Ansible when set. `CORS_ALLOWED_ORIGINS` comes from `deploy/ansible/environments/*.yml` (staging site origin; production `nyhasinavalona.com` and `www`). Without the model group, every chat reply stays scripted (`model_disabled`). Without SMTP, contact messages are stored and the API logs once per message that email was skipped. `deploy/delivery_inputs.py` names any missing required value without printing one. Both instances require a TOTP code for the owner from the first sign-in.

## First delivery

1. Run `ci.yml` on `main` with `staging-content=seed`: the staging API does not exist yet, so the first staging site is built from the initial content.
2. The package inherited the repository's public visibility at its first push. If a delivery ever stops on `deploy/check-public-images.sh`, make the package public again (package settings, Change visibility) and rerun the failed jobs.
3. In the staging CMS, run **Prepare publication**, then **Publish**. With `SITE_BUILD_TOKEN`, the API dispatches `content.yml`; otherwise run it by hand with `staging`.
4. Production: once `api.nyhasinavalona.com` and `cms.nyhasinavalona.com` point to the VPS, run `production.yml` with `site` off, publish in the production CMS, then let `content.yml` (or a manual run with `production`) replace GitHub Pages.

## Local checks

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install --require-hashes -r deploy/requirements.txt
ansible-galaxy collection install -r deploy/ansible/requirements.yml
python3 -m unittest discover -s deploy -p 'test_*.py'
deploy/render.sh staging /tmp/portfolio-render-staging
deploy/render.sh prod /tmp/portfolio-render-prod
```

`deploy/render.sh` renders a delivery with placeholder images and secrets and validates it with the controller's own code (`deploy/check_delivery.py`), without contacting the server. `deploy/smoke.sh --api <url> --cms <url> [--site <url>]` checks a running instance: health, content, the hook kept off the public route, anonymous access refused on every collection and on MCP, and the staging site with its `noindex` header.
