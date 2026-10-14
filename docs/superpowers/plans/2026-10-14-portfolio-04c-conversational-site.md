# Conversational site (plan 4c)

**Goal:** Chat-first static site with quick view, client publication loading, browser scripted fallback, block stage, and tests (part 1). Part 2 adds contact form, motion polish, profile photo, and Playwright e2e/CI.

**Spec:** `docs/superpowers/specs/2026-10-13-conversational-portfolio-design.md` (sections 2, 4, 7.1, 7.3, 9, 10, 12).

## Rulings

| Decision                                                      | Why                                                                                               | Cost if wrong                                                    |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `/data/publication.json` static route + lazy client fetch     | Keeps publication out of the main JS bundle while giving the matcher the same snapshot as the API | Extra request on first chat interaction                          |
| `parse-publication.ts` separate from `read-publication.ts`    | Client imports must not pull `node:fs` into Turbopack browser chunks                              | Build failure or accidental server-only code in the client       |
| `html[data-js]` inline script before paint + CSS visibility   | Avoids flash of chat for no-JS users and flash of quick view for JS users without hiding SEO HTML | Mis-tuned CSS could hide content from crawlers or users          |
| Desktop stage vs mobile inline blocks via CSS (`lg:`)         | Spec 4.1 / D13 without a JS layout fork                                                           | Stage blocks duplicated in DOM on mobile only when answers exist |
| `onOpenContact` optional hook on contact blocks               | Part 2 in-chat form; part 1 keeps email/LinkedIn CTAs                                             | Form wiring needs a follow-up pass                               |
| Re-export `parseActivePublication` from `read-publication.ts` | Existing tests and build routes keep one import path                                              | None                                                             |

## File map

| Path                                                  | Role                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------- |
| `site/app/data/publication.json/route.ts`             | Build-time publication JSON for the browser                          |
| `site/src/lib/publication/parse-publication.ts`       | Zod validation shared by server and client                           |
| `site/src/lib/publication/load-publication-client.ts` | Fetch + idle prefetch                                                |
| `site/src/lib/chat/*`                                 | History trim, send + fallback, reducer, welcome data, block resolver |
| `site/src/components/chat/*`                          | UI, blocks, conversation shell                                       |
| `site/src/components/page/quick-view-sections.tsx`    | SSR quick view sections                                              |
| `site/app/globals.css`                                | `data-js` visibility rules                                           |
| `site/src/lib/i18n/dictionary.ts`                     | Chat UI strings EN/FR                                                |

## Task checklist

### Part 1

- [x] Static publication JSON route and client loader with validation
- [x] Chat client (`sendChatMessage`, scripted fallback, history, in-memory conversation id)
- [x] Conversation reducer and stage selection
- [x] Layout: welcome, desktop stage, mobile inline blocks, quick view toggle, no-JS quick view
- [x] Block renderers from publication identifiers
- [x] Basic motion (revealed answer text, block enter, reduced motion)
- [x] Accessibility: live region, focus, keyboard, labels
- [x] Dictionary strings EN/FR
- [x] Vitest coverage for client, reducer, blocks, welcome, shell
- [x] Lighthouse on `/` and `/fr`
- [x] Architecture documentation

### Part 2 (pending)

- [ ] In-chat contact form and `onOpenContact` wiring
- [ ] Motion polish (shared layout, photo)
- [ ] Playwright e2e and CI job
- [ ] Privacy page link under the input

## Evidence

```text
pnpm validate   # exit 0
pnpm test       # @portfolio/content 25, cms/schema 8, cms/provision 38,
                # directus-extension-publication 29, @portfolio/chat 39,
                # @portfolio/site 99, @portfolio/api 104 — exit 0
pnpm content:seed && pnpm build:site — exit 0
pnpm lighthouse — exit 0 (see scores below)
git diff --check main...HEAD — exit 0 (after commits)
```

Lighthouse (mobile, representative runs, 2026-10-14 local `pnpm lighthouse`):

| URL   | Performance | Accessibility | Best practices | SEO  |
| ----- | ----------- | ------------- | -------------- | ---- |
| `/`   | 0.97        | 1.00          | 0.96           | 1.00 |
| `/fr` | 0.97        | 0.96          | 0.96           | 1.00 |

`pnpm lighthouse` exit 0; assertions in `site/lighthouserc.json` satisfied.
