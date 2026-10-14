# Chat API Implementation Plan

**Goal:** CMS operational collections and policies, API environment (CORS, model, SMTP), visitor rate limits and budget gate, model provider and `POST /chat`, contact form and `POST /contact`, delivery wiring, and documentation for plan 4b.

**Spec:** `docs/superpowers/specs/2026-10-13-conversational-portfolio-design.md` (sections 2, 5.2, 5.4, 6, 7, 8.2, 10, 11.4, 11.5, 12).

## Rulings

| Decision                                                         | Why                                                    | Cost if wrong                             |
| ---------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------- |
| Sensitive-topic scripted check before model                      | Spec 7.2 / owner guardrail; saves budget               | Model answers compensation questions      |
| Budget sum via Directus REST aggregate + 60 s cache              | Matches spec 7.4; avoids SDK filter typing gaps        | Stale budget for one minute at most       |
| Honeypot probe before strict zod                                 | Same success response without leaking validation rules | Bots see 400 instead of silent accept     |
| `createWithinBudgetGate` when model group unset                  | Avoids `budget_unavailable` on scripted-only dev       | None                                      |
| Optional secrets in `delivery_inputs.py` like `SITE_BUILD_TOKEN` | Staging runs scripted until keys exist                 | Empty strings in Compose until configured |
| CORS origins in Ansible per environment                          | Site origin differs staging vs production              | Misconfigured browser calls blocked       |

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

(Filled after gate runs on branch `feat/chat-api`.)
