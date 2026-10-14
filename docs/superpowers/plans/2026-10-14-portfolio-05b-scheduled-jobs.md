# Scheduled jobs and alerts (plan 5b)

**Goal:** In-process Europe/Paris jobs for Search Console import, daily stats, retention, GitHub monitor and alert checks; deduplicated operational alerts (including contact notifications); delivery wiring and documentation. Dashboards and the external monitor workflow remain plan 5c.

**Spec:** `docs/superpowers/specs/2026-10-13-conversational-portfolio-design.md` (sections 8.3, 8.4, 11.4, 10, 12).

## Rulings

| Decision                                                                            | Why                                                                                                                            | Cost if wrong                                     |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| Contact volume via `alerts` rows, not `contact_messages` reads                      | API token cannot read contact PII; 5a proved field-scoped permissions are blocked on Directus 12.5                             | Under-count contacts if alerts fail               |
| Contact message deletion in a Directus scheduled flow                               | API never receives read/delete on `contact_messages`; flow runs with full access                                               | Wrong cron timezone vs Paris copy                 |
| Directus schedule cron `5 3 * * *` (UTC)                                            | Directus documents schedule triggers in server time (UTC on the VPS); ~04:05 Paris in CET, ~05:05 in CEST                      | Summer purge runs one hour later than prose       |
| Search Console `dataState: final`                                                   | Stable rows for aggregates; `all` would churn with late data                                                                   | Slightly delayed metrics vs Search Console UI     |
| Spring-forward 02:30 jobs fire once at 03:00 Paris                                  | Missing local times cannot be scheduled twice                                                                                  | One-hour shift on transition day only             |
| `GOOGLE_SERVICE_ACCOUNT_JSON` optional secret                                       | Staging runs without Google until the owner configures Search Console                                                          | Empty JSON in Compose until set                   |
| Site-build and GitHub alerts once per Paris day                                     | Spec 11.4 daily dedup for operational failures                                                                                 | Repeated emails on every hook failure             |
| Alert rows hold no visitor address; Reply-To travels with the email only            | `alerts` has no retention, so an address there would outlive the three-year contact-message limit                              | Contact email loses its Reply-To                  |
| `raiseAlert` never rejects; an unstored alert sends no email                        | The contact path fires it without awaiting; without a stored row there is no dedup                                             | A lost notification while Directus refuses writes |
| Service-account JSON checked by `delivery_inputs.py` and the API environment parser | The deploy job refuses a malformed key before any server change; the API refuses it at startup; neither message quotes the key | A malformed key blocks every deploy until fixed   |

## File map

| Path                                                                 | Role                                       |
| -------------------------------------------------------------------- | ------------------------------------------ |
| `api/src/jobs/scheduler.ts`, `paris-schedule.ts`                     | Paris wall-clock scheduler, DST handling   |
| `api/src/alerts/*`                                                   | `raiseAlert`, checks, SMTP, Directus store |
| `api/src/search-console/*`                                           | JWT auth, client, import, Directus upsert  |
| `api/src/jobs/daily-stats-*`, `retention-*`, `github-monitor-job.ts` | Scheduled work units                       |
| `api/src/jobs/register-api-jobs.ts`, `api/src/main.ts`               | Registration and graceful shutdown         |
| `cms/provision/src/flows/ensure-retention-flows.ts`                  | Contact message retention flow             |
| `cms/provision/src/access/policies.ts`                               | API no longer deletes contact messages     |
| `deploy/compose.yml.j2`, `delivery_inputs.py`, `deploy.yml`          | Optional Google secret and property var    |

## Task checklist

- [x] Scheduler with DST tests
- [x] Alerts and contact path
- [x] Alert checks every 5 minutes
- [x] Search Console import at 03:00
- [x] Daily stats at 03:30
- [x] Retention at 04:00 and Directus contact flow
- [x] GitHub check at 04:15 and site-build alerts
- [x] Wiring, environment, delivery, docs

## Evidence

```text
pnpm validate   # typecheck (8 packages), eslint (site), prettier --check — exit 0
pnpm test       # @portfolio/content 25, cms/schema 8, cms/provision 38,
                # directus-extension-publication 29, @portfolio/chat 39,
                # @portfolio/api 157, @portfolio/site 115 — exit 0
pnpm provision  # exit 0 (retention flow created)
pnpm test:cms   # 11 files, 65 tests — exit 0
python3 -m unittest discover -s deploy -p 'test_*.py'  # Ran 13 tests — OK
shellcheck deploy/*.sh — exit 0
actionlint — exit 0
deploy/render.sh staging /tmp/r-staging — exit 0
deploy/render.sh prod /tmp/r-prod — exit 0
git diff --check main...HEAD — exit 0
```
