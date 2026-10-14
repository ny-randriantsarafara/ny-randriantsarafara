# Chat API Implementation Plan

**Goal:** CMS operational collections and policies, API environment (CORS, model, SMTP), visitor rate limits and budget gate, model provider and `POST /chat`, contact form and `POST /contact`, delivery wiring, and documentation for plan 4b.

**Spec:** `docs/superpowers/specs/2026-10-13-conversational-portfolio-design.md` (sections 2, 5.2, 5.4, 6, 7, 8.2, 10, 11.4, 11.5, 12).

## Rulings

| Decision                                                                         | Why                                                              | Cost if wrong                                             |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------- |
| Sensitive-topic scripted check before model                                      | Spec 7.2 / owner guardrail; saves budget                         | Model answers compensation questions                      |
| Budget sum via Directus REST aggregate + 60 s cache                              | Matches spec 7.4; avoids SDK filter typing gaps                  | Stale budget for one minute at most                       |
| Honeypot probe before strict zod                                                 | Same success response without leaking validation rules           | Bots see 400 instead of silent accept                     |
| `createWithinBudgetGate` when model group unset                                  | Avoids `budget_unavailable` on scripted-only dev                 | None                                                      |
| Optional secrets in `delivery_inputs.py` like `SITE_BUILD_TOKEN`                 | Staging runs scripted until keys exist                           | Empty strings in Compose until configured                 |
| CORS origins in Ansible per environment                                          | Site origin differs staging vs production                        | Misconfigured browser calls blocked                       |
| Visitor 60/day uses a rolling 24 h window (not Paris midnight)                   | Equivalent protection; simpler than calendar day keys            | Slight mismatch with “calendar day” wording in spec prose |
| Global model cap keyed to Paris calendar day end                                 | Budget is month-to-date in Paris; cap aligns with that day       | Model cap could reset at wrong instant if left rolling    |
| Non-answered model replies use scripted suggestions                              | Owner-configured topics; model cannot steer off-topic follow-ups | Model-chosen suggestions on refusals                      |
| Smoke `POST /chat` uses invalid body only                                        | Proves routing without creating `chat_exchanges` rows            | Smoke does not exercise a full answer path                |
| Assistant grants on `events` / Search Console / `daily_stats` deferred to plan 5 | Those collections do not exist yet in this branch                | Premature MCP/analytics access before schema exists       |

## Declined (review follow-up)

| Proposal                                      | Why declined                                                                  | Cost if wrong                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Paris-calendar visitor 60/day window          | Rolling 24 h is equivalent for abuse protection and keeps limiter keys simple | Visitor count resets on rolling window, not at Paris midnight |
| Assistant read on analytics collections in 4b | Plan 5 adds collections and policies together                                 | Assistant cannot read analytics until plan 5 ships            |

## Task checklist

- [x] CMS `chat_exchanges` and `contact_messages` + policies + integration tests
- [x] API environment (CORS required; model and SMTP all-or-nothing)
- [x] CORS middleware on public routes
- [x] Visitor key + rate limits + Paris calendar helpers
- [x] Monthly budget gate
- [x] OpenAI-compatible model + prompt builder + output validation
- [x] `POST /chat` and `POST /contact`
- [x] Deploy compose, delivery inputs, smoke, workflow secrets
- [x] Docs and `.env.example`

## Evidence

```text
pnpm validate   # typecheck (8 packages), eslint (site), prettier --check — exit 0
pnpm test       # @portfolio/content 25, cms/schema 8, cms/provision 38,
                # directus-extension-publication 29, @portfolio/chat 39, @portfolio/site 75,
                # @portfolio/api 100 — exit 0
pnpm test:cms   # 54 tests — exit 0
python3 -m unittest discover -s deploy -p 'test_*.py'  # 13 tests — OK
shellcheck deploy/*.sh — exit 0
actionlint (.github/workflows/deploy.yml changed) — exit 0
git diff --check main...HEAD — exit 0
```
