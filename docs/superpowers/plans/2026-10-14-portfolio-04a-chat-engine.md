# Chat Engine and Answer Bank Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `@portfolio/chat` with the chat contract, reply-language detection, question normalization, a deterministic scripted matcher, a draft answer bank in the CMS seed, idempotent answer seeding on already-provisioned instances, and a CI evaluation set (≥ 80 % top-1 accuracy per language).

**Architecture:** The matcher reads a validated `PublicationContent` snapshot (same types as `@portfolio/content`). Sensitive topics from `chatSettings` run before answer scoring. The API and site will call this package in later plans; this plan stops at the library, seed content and tests.

**Tech Stack:** Node 24, TypeScript ~6.0.3, zod ^4, Vitest ^5, `@portfolio/content`, `@portfolio/cms-provision/seed` (devDependency for eval only).

**Spec:** `docs/superpowers/specs/2026-10-13-conversational-portfolio-design.md` (sections 1, 2, 4, 5, 7, 12, 13).

**How this plan was produced:** Written after implementation on branch `feat/chat-engine`, with gate commands and evaluation accuracy recorded under Evidence.

## Global Constraints

- Same code rules as plans 1–3: no `any`, no `as` (including `as const`), no `@ts-ignore`, no non-null `!`; `const` only; early returns; English code, comments, docs and commits; Prettier settings of the repository.
- Answer bank facts must come from existing seed profile, experiences, projects, skills, key figures and capabilities only; first person; EN and FR; owner will rewrite later.
- Evaluation questions must not copy sample questions verbatim.

## Review Focus

1. Sensitive topics match before answer scoring and always return a contact block (`packages/chat/src/matcher.ts`).
2. Empty answers collection on an instance that already has experiences receives the seed bank when `SEED_INITIAL_CONTENT=true` (`cms/provision/src/seed/seed-initial-content.ts`).
3. `validatePublicationContent(initialContent)` passes with twenty answers and four starters (`cms/provision/src/seed/initial-content.test.ts`).
4. Evaluation set asserts ≥ 0.8 accuracy per language on the seed content (`packages/chat/eval/eval.test.ts`).

## Rulings

| Decision                                                              | Why                                                                            | Cost if wrong                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `@portfolio/cms-provision/seed` as devDependency of `@portfolio/chat` | Eval loads real seed content; no cycle (provision does not depend on chat)     | Duplicated fixture content diverging from production seed         |
| Best sample-question score (not pooled tokens) × weight               | Recruiter phrasing varies; one strong sample match should win                  | Weak matches from aggregated noise                                |
| Entity overlap boost on experience/project slug tokens                | Disambiguates company-specific eval questions without hard-coded rules         | Rare false positives on short tokens                              |
| Manipulation multi-word phrases → `unknown` after sensitive checks    | Spec 7.3 order; `refused` is reserved for model mode (plan 4b)                 | Jailbreak text could otherwise match random answers               |
| Off-topic → `unknown` via score threshold + token coverage, not lists | Avoids eval-specific keyword mirrors; football/weather fall through low scores | Needs honest matcher tuning instead of blocklists                 |
| Work-condition sensitive keywords are multi-word only                 | Single token `remote` false-positive on “remote teams/API design”              | Explicit remote/hybrid contract questions must use longer phrases |
| `seedAnswersFromDeps` for unit tests                                  | Typed insert/read deps without generic Directus mock casts                     | Less coverage of the full `seedInitialContent` client wiring      |
| Answer bank in `answer-bank.ts` imported by `initial-content.ts`      | Keeps the seed file readable                                                   | None                                                              |
| No separate spoken-languages answer (20 answers)                      | Languages already on profile; room for contact/CV and role-specific answers    | One fewer explicit recruiter topic (still in profile/quick view)  |

## File Map

| Path                                                       | Responsibility                                   |
| ---------------------------------------------------------- | ------------------------------------------------ |
| `packages/chat/package.json`, `tsconfig.json`              | Workspace package mirroring `@portfolio/content` |
| `packages/chat/src/contract.ts`                            | zod schemas and types for spec 7.1               |
| `packages/chat/src/stop-words.ts`, `language.ts`           | Reply-language heuristic                         |
| `packages/chat/src/normalize.ts`                           | Accent stripping, stop words, light stemming     |
| `packages/chat/src/manipulation-phrases.ts`                | Documented jailbreak phrase list                 |
| `packages/chat/src/overlap.ts`, `matcher.ts`               | Scripted matcher                                 |
| `packages/chat/eval/sample-overlap.ts`                     | Eval vs sample-question regression guard         |
| `packages/chat/eval/*`                                     | Typed eval cases and accuracy test               |
| `cms/provision/src/seed/answer-bank.ts`                    | Draft answer bank                                |
| `cms/provision/src/seed/seed-initial-content.ts` (+ test)  | Full seed + empty-collection answer insert       |
| `docs/architecture.md`, `docs/development.md`, `README.md` | Package and provisioning behaviour               |

---

### Task 1: Chat contract package

**Files:** `packages/chat/package.json`, `tsconfig.json`, `src/contract.ts`, `src/contract.test.ts`, `src/index.ts`, `pnpm-lock.yaml`.

- [x] **Step 1:** Add `@portfolio/chat` with zod contract aligned to spec 7.1 and `@portfolio/content` `blockSchema` / `Locale`.
- [x] **Step 2:** Vitest tests for request, reply and response parsing.
- [x] **Step 3:** Commit `feat(chat): add the chat contract package`.

### Task 2: Reply language detection

**Files:** `packages/chat/src/stop-words.ts`, `language.ts`, `language.test.ts`.

- [x] **Step 1:** Stop-word counts plus accented-character signal; inconclusive → page locale.
- [x] **Step 2:** Commit `feat(chat): add reply language detection`.

### Task 3: Question normalization

**Files:** `packages/chat/src/normalize.ts`, `normalize.test.ts`.

- [x] **Step 1:** Lowercase, NFD accent removal, stop-word removal, light EN/FR stemming.
- [x] **Step 2:** Commit `feat(chat): add question normalization`.

### Task 4: Scripted matcher

**Files:** `packages/chat/src/overlap.ts`, `matcher.ts`, `matcher.test.ts`, `index.ts`.

- [x] **Step 1:** Sensitive topics, weighted scoring, suggestions, deterministic ties.
- [x] **Step 2:** Commit `feat(chat): add the scripted matcher`.

### Task 5: Answer bank seed

**Files:** `cms/provision/src/seed/answer-bank.ts`, `initial-content.ts`, `initial-content.test.ts`.

- [x] **Step 1:** Twenty grounded answers, four starters (`about-me`, `career-journey`, `flagship-results`, `why-hire`).
- [x] **Step 2:** Commit `feat(cms): draft the answer bank seed content`.

### Task 6: Provision answers on existing instances

**Files:** `cms/provision/src/seed/seed-initial-content.ts`, `seed-initial-content.test.ts`.

- [x] **Step 1:** Insert answers when experiences exist and answers collection is empty.
- [x] **Step 2:** Commit `feat(cms): seed answers when the collection is empty`.

### Task 7: Matcher tuning and evaluation set

**Files:** `packages/chat/src/matcher.ts`, `cms/provision/src/seed/answer-bank.ts`, `packages/chat/eval/*`.

- [x] **Step 1:** Per-sample scoring, entity boost, off-topic guard; broaden sample questions (paraphrased, not eval copies).
- [x] **Step 2:** Fifty EN and fifty FR eval cases; CI accuracy ≥ 0.8.
- [x] **Step 3:** Commits `feat(chat): improve scripted matching accuracy`, `chore(cms): broaden answer sample question coverage`, `test(chat): add the evaluation set`.

### Task 8: Documentation

**Files:** `docs/architecture.md`, `docs/development.md`, `README.md`, this plan.

- [x] **Step 1:** Architecture Chat section, provisioning note for answer seeding, README path table.
- [x] **Step 2:** Commit `docs: record chat engine plan 4a`.

## Evidence

```text
pnpm validate   # typecheck (8 packages), eslint (site), prettier --check — exit 0
pnpm test       # @portfolio/content 25, cms/schema 8, api 55, cms/provision 36,
                # directus-extension-publication 29, @portfolio/chat 28, @portfolio/site 75 — exit 0
pnpm test:cms   # 48 tests (local Directus stack up) — exit 0
```

Scripted matcher evaluation on seed content (`initialContent`) after eval/generalization rewrite: English **0.880** (44/50), French **0.860** (43/50). Prior to rewrite (verbatim sample overlap): English **0.920**, French **0.960**. CI threshold remains ≥ 0.80 via `packages/chat/eval/eval.test.ts`; overlap guard requires zero eval questions matching seed samples (Jaccard ≥ 0.85).
