# Conversational APIs for the portfolio — check on 15 October 2026

Read-only document research, primary sources. No inference call, account, personal quota or production configuration verified. The Haiku version actually used by the portfolio is still unknown; a fixture does not prove production configuration. Prices below are USD per million tokens, standard interactive rate, excluding tax, tools, cache and payment fees.

## Rates and a comparable example

Computed example: **1 000 single-turn conversations**, each with 3 000 billed input tokens and 500 billed output tokens, i.e. 3 M input + 0.5 M output. Cost = `3 × input price + 0.5 × output price`. Multiple turns multiply cost and re-sent history increases input. This compares identical token volumes, not identical text across tokenizers.

| Provider / direct API id                                         | Input | Output | 1 000 turns | Official source                                                                       |
| ---------------------------------------------------------------- | ----: | -----: | ----------: | ------------------------------------------------------------------------------------- |
| Google `gemini-3.8-flash`                                        | $0.75 |  $3.75 |      $4.125 | [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.8-flash)      |
| Google `gemini-3.5-flash-lite`                                   | $0.30 |  $2.50 |       $2.15 | [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.5-flash-lite) |
| Google `gemini-3.1-flash-lite`                                   | $0.25 |  $1.50 |       $1.50 | [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.1-flash-lite) |
| Google `gemini-2.5-flash-lite`                                   | $0.10 |  $0.40 |       $0.50 | [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing#gemini-2.5-flash-lite) |
| Anthropic `claude-haiku-5-5`                                     | $0.10 |  $0.50 |       $0.55 | [Haiku 5.5](https://platform.claude.com/docs/en/models/haiku-5-5/overview)            |
| Anthropic `claude-haiku-4-5-20251001` / alias `claude-haiku-4-5` | $1.00 |  $5.00 |       $5.50 | [Haiku 4.5, legacy](https://platform.claude.com/docs/en/models/haiku-4-5/overview)    |
| OpenAI `gpt-6-luna`                                              | $0.10 |  $0.50 |       $0.55 | [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)                |
| OpenAI `gpt-5.4-mini`                                            | $0.75 |  $4.50 |       $4.50 | [GPT-5.4 Mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini)            |
| OpenAI `gpt-5.4-nano`, marked deprecated                         | $0.20 |  $1.25 |      $1.225 | [GPT-5.4 nano](https://developers.openai.com/api/docs/models/gpt-5.4-nano)            |
| OpenAI `gpt-5-nano`, marked deprecated                           | $0.05 |  $0.40 |       $0.35 | [GPT-5 nano](https://developers.openai.com/api/docs/models/gpt-5-nano)                |
| xAI `grok-4.3`                                                   | $1.25 |  $2.50 |       $5.00 | [Grok 4.3](https://docs.x.ai/developers/models/grok-4.3)                              |
| xAI `grok-4.7`                                                   | $2.00 |  $6.00 |       $9.00 | [xAI catalog](https://docs.x.ai/developers/models)                                    |

**Gemini 3.8 Flash is an official current name.** Its listed price is promotional until 31 December 2026; from 1 January 2027: **$1.50 / $7.50**, i.e. $8.25 for this example. Gemini output includes thinking tokens. The pricing page is dated 14 October 2026. [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)

Haiku 5.5 applies these prices up to 100 000 input tokens per request; above that: $0.50 / $2.50. Its tokenizer counts about 30% more tokens than Haiku 4.5 for the same text. Cache: read $0.01, write 5 min $0.125, 1 h $0.20 at the short rate. Adaptive thinking, default effort `medium`. [Haiku 5.5](https://platform.claude.com/docs/en/models/haiku-5-5/overview)

GPT-6 Luna: cache read $0.01, write $0.125; above 272k input tokens, input/cache ×2 and output ×1.5 for the full request. Effort `none` available; default `medium`. Free tier not supported. [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)

OpenAI reasoning tokens, even when invisible, are billed as output; the example does not hold for 500 visible tokens plus reasoning. [Reasoning models](https://developers.openai.com/api/docs/guides/reasoning)

Grok 4.3: cache $0.20; higher prices above 200k tokens; configurable reasoning with `none`. No permanent API free tier established from current sources consulted. The $25/month promotion explicitly concerned the beta ending late 2024 and does not support a current free tier. [Grok 4.3](https://docs.x.ai/developers/models/grok-4.3), [historical xAI announcement](https://x.ai/news/api)

## Free tier: Google AI Studio, Gemini API and France

All four Gemini models in the table show a free input/output tier. AI Studio also advertises free use in available regions. That does not mean unlimited capacity or free access transferable to OpenRouter. [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)

**For a portfolio reachable by users in France/EEA, plan on Gemini API with billing enabled.** Google terms require Paid Services for API Clients made available to EEA, Swiss or UK users. For Gemini API, that requires a Cloud project linked to an active billing account. France is in the available regions. [Gemini terms, effective 23 March 2026](https://ai.google.dev/gemini-api/terms), [regions](https://ai.google.dev/gemini-api/docs/available-regions)

Data: general free-tier rule, Google uses prompts/responses to improve products; Paid rule, it does not for that purpose. **Regional exception: for a user in the EEA/Switzerland/UK, Paid data rules also apply to AI Studio and the unpaid quota.** Temporary security logs remain; that does not promise no processing or EU residency. [Gemini terms](https://ai.google.dev/gemini-api/terms)

Gemini quotas: RPM, input TPM and RPD, per project not per key; RPD reset at midnight Pacific. Active values depend on model, tier and account and must be read in AI Studio; docs do not publish one universal current free-tier value for Flash 3.8. Do not reuse an old table or another account’s quota. Announced capacity not guaranteed. [Gemini limits, dated 13 October 2026](https://ai.google.dev/gemini-api/docs/rate-limits)

Anthropic describes small test credits for new users, not a permanent free quota. Max/Team subscriptions now include claimable API credits ($100 Max 5x, $200 Max 20x; Team pool capped at $500), usable only on Claude Platform, not via OpenRouter; expire per cycle. That benefit requires an eligible subscription. [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing), [Max/Team credits](https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers)

## OpenRouter: pricing, top-ups, free models

OpenRouter bills inference at the announced provider rate, with no per-request markup. Standard top-up carries **5.5% fees** (Business 8%), excluding applicable tax. The official constants file states **Stripe minimum $0.80**, crypto 5%. So a $10 credit top-up via Stripe costs $10.80 before tax in theory; the minimum makes the effective percentage above 5.5% for small top-ups. Actual amount must be checked at checkout. [OpenRouter pricing](https://openrouter.ai/pricing), [official constants](https://github.com/OpenRouterTeam/docs/blob/main/snippets/exports/constants.mdx)

Example Haiku 5.5 or GPT-6 Luna: $0.55 inference / 1 000 turns; economic cost with proportional Standard top-up fees $0.58025, if the top-up exceeds the fee minimum. This is not a $0.55 top-up.

The public API catalog currently confirms `anthropic/claude-haiku-5.5` at $0.10 / $0.50, `anthropic/claude-haiku-4.5` at $1 / $5, `google/gemini-3.8-flash` at $0.75 / $3.75, `openai/gpt-6-luna` at $0.10 / $0.50 and `x-ai/grok-4.3` at $1.25 / $2.50. Capabilities `response_format` and `structured_outputs` are declared. Catalog read directly on 15 October 2026; endpoint availability for a given account not tested. [OpenRouter models API](https://openrouter.ai/api/v1/models)

OpenRouter free: variants explicitly catalogued `:free`, and router `openrouter/free`, which picks a free model; that router does not guarantee a constant model identity. Examples currently at $0 input/output: `nvidia/nemotron-3.5-lightning:free`, `liquid/lfm-2.5-2.6b:free`. That is not free credit applicable to paid Gemini or Haiku. [FAQ](https://openrouter.ai/docs/faq), [catalog](https://openrouter.ai/api/v1/models)

Documented free limits: **20 requests/minute**, **50/day** below the historical purchase threshold of 10 credits; **1 000/day** above. Documentary code grants the higher cap from 9 credits purchased to absorb rounding/fees. Purchases are lifetime on the account, not remaining balance. Field `free_model_daily_requests` on `GET /api/v1/key` gives real cap and counter; documented exceptions by account/endpoints. These caps are global across concerned free models. [Limits](https://openrouter.ai/docs/api/reference/limits), [official constants used by this page](https://github.com/OpenRouterTeam/docs/blob/main/snippets/exports/constants.mdx)

BYOK: OpenRouter currently states $25 000 catalog-price inference per month without BYOK fees on Standard/Business, then 5%; the provider bills its inference directly. That does not turn the provider API free. [OpenRouter pricing](https://openrouter.ai/pricing)

## Constraints useful for three profile design

A shared Chat Completions transport is documented: OpenRouter `https://openrouter.ai/api/v1/chat/completions`; Google `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`; OpenAI `https://api.openai.com/v1/chat/completions`. Google documents the OpenAI SDK with `baseURL=https://generativelanguage.googleapis.com/v1beta/openai/`, model `gemini-3.8-flash`; the layer remains beta. **Provider settings must stay separate.** [OpenRouter FAQ](https://openrouter.ai/docs/faq), [Google compatibility](https://ai.google.dev/gemini-api/docs/openai), [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)

Google accepts structured JSON via `chat.completions.parse` with `response_format` from `zodResponseFormat`, official Flash 3.8 example. Its `reasoning_effort` mapping accepts `minimal`, `low`, `medium`, `high` for Gemini 3 Flash; **`none` does not disable Gemini 3 thinking**. Do not copy OpenAI’s `none`. `minimal` reduces reasoning without promising zero tokens. Gemini cache via Google-specific parameters. [Google compatibility, dated 14 October 2026](https://ai.google.dev/gemini-api/docs/openai)

Google’s current native path also shows `POST /v1beta/interactions` with `response_format: { type: "text", mime_type: "application/json", schema: ... }`; it does not implicitly replace compatible-layer parameter names. JSON Schema subset, schemas sometimes rejected when too complex; validate on the application side. [Structured outputs, dated 13 October 2026](https://ai.google.dev/gemini-api/docs/structured-output)

OpenAI GPT-6 Luna supports Structured Outputs and Responses. Its docs recommend Responses for built-in tools and function calling; Chat Completions allows function calling only with effort `none`. For simple conversational JSON, verify the exact contract used and chosen model; do not infer parity of all options from the shared transport format. [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)

## Interpretation and remaining validation

On token price alone, Haiku 5.5 and GPT-6 Luna are much cheaper than Flash 3.8 today; migrating Haiku 4.5 to 5.5 changes cost more than going from Haiku 5.5 to Gemini 3.8. That does not show conversational superiority. No provider benchmark here proves CV fidelity, French, refusal to invent, expected JSON or portfolio latency. Compare profiles on the same real scenarios, full `usage` cost and errors included, before choosing the default. Gemini free tier must not be the reason to put the French portfolio in production.
