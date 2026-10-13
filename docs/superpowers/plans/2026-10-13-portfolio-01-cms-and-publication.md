# CMS and Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the repository into a pnpm monorepo (current site moved to `site/`) with a local Directus 12 stack provisioned as code: bilingual portfolio content model, owner / assistant / public access, MCP limited to working content, migration of the current content with French drafts, and a publication extension that prepares validated snapshots with a change summary, then publishes or rolls them back.

**Architecture:** `packages/content` owns the publication schema (zod), validation and change summaries. `cms/schema` owns the Directus record types and the mapping between working records and publication content. `cms/provision` applies schema, access, settings, flows and seed idempotently through the Directus SDK. `cms/extensions/publication` adds two flow operations (prepare, activate) that run with the triggering user's permissions; their decisions are pure functions, and a small store adapter does the Directus reads and transactional writes. Integration tests run against Postgres and Directus in Docker, as in `my-media`.

**Tech Stack:** pnpm 10.32.1, Node 24 (native TypeScript type stripping), TypeScript ~6.0.3 for workspace packages (the site keeps TypeScript 5 until plan 2), zod ^4.6.5, Vitest ^5.0.3 for workspace packages (each declares its `vite` ^8.1.2 peer, otherwise pnpm resolves the site's Vite 5), Directus 12.5.0, `@directus/sdk` 27.0.0, `@directus/extensions-sdk` 18.0.6, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-10-13-conversational-portfolio-design.md` (sections 3.1, 5, 11.5, 12, 13 part 1). Reference implementation for conventions: `my-media` (`cms/provision`, `cms/extensions/editorial`, `cms/tests`).

## Global Constraints

- Node 24 (`.nvmrc`), pnpm `10.32.1` (`packageManager`), Directus image `directus/directus:12.5.0`, Postgres `postgres:17-alpine`.
- Workspace packages extend `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`, `erasableSyntaxOnly`, `allowImportingTsExtensions`, `verbatimModuleSyntax`); relative imports carry the `.ts` extension; Node runs the sources directly.
- No `any`, no `as` type assertions, no `@ts-ignore`, no non-null `!`; `unknown` only when narrowed immediately (zod or a type guard).
- No mutation after initialization; early returns instead of nested `if`; no ternary where it hurts readability.
- Code, comments, documentation and commit messages in English; Conventional Commits; repository Prettier settings (single quotes, semicolons, width 100, ES5 trailing commas).
- Every visitor-facing text has an `_en` and an `_fr` field; references between items are slug lists.
- The assistant never publishes or deletes; the public policy has no permissions.
- No secret in Git: `.env` stays ignored; `.env.example` holds `change-me` placeholders only.
- Local Directus listens on `http://localhost:8065` (`my-media` uses 8055 on the same machine).

## Review Focus

1. A French field emptied after a publication: Prepare refuses and names the item slug and field (Task 2 unit test, Task 11 integration test).
2. Preparing twice: the earlier prepared publication becomes `discarded` and cannot be published (Task 10 unit test, Task 11 integration test).
3. Publishing while the API hook fails: the version stays active, the error says to run Publish again, and running it again only repeats the hook call (Task 10 unit test, Task 11 integration test).
4. The assistant tries to delete through the MCP `items` tool: refused, item intact (Task 7).
5. Provisioning runs again on a seeded database: no duplicated content (Task 8).

## File Map

| Path                                               | Responsibility                                                                   |
| -------------------------------------------------- | -------------------------------------------------------------------------------- |
| `package.json`, `pnpm-workspace.yaml`              | Workspace root: scripts, hooks, formatting.                                      |
| `tsconfig.base.json`, `.nvmrc`                     | Shared TypeScript settings and Node version.                                     |
| `site/`                                            | Current Next.js site, moved unchanged.                                           |
| `packages/content/src/localized.ts`                | Locale, slug and bilingual text schemas.                                         |
| `packages/content/src/blocks.ts`                   | Block catalog schema.                                                            |
| `packages/content/src/publication.ts`              | Publication content schema and types.                                            |
| `packages/content/src/validation.ts`               | Structural and reference validation with readable problem paths.                 |
| `packages/content/src/changes.ts`                  | Change summary between two publications and its Markdown overview.               |
| `packages/content/src/testing/fixture.ts`          | Small valid content used by tests of every package.                              |
| `cms/schema/src/records.ts`                        | Directus record types and `PortfolioSchema`.                                     |
| `cms/schema/src/mapping.ts`                        | Working records to publication content, and content to records (seed).           |
| `cms/schema/src/operations.ts`                     | Identifiers shared by the extension and the provisioning.                        |
| `cms/provision/src/schema/*`                       | Field helpers, collections, relations, idempotent schema application.            |
| `cms/provision/src/access/*`                       | Policies, roles, users.                                                          |
| `cms/provision/src/settings/*`                     | Project and MCP settings, assistant protocol.                                    |
| `cms/provision/src/seed/*`                         | Initial content (current site in English, French drafts) and idempotent seeding. |
| `cms/provision/src/flows/*`                        | Prepare and Publish manual flows.                                                |
| `cms/extensions/publication/src/directus-store.ts` | Reads working records and writes publication statuses through Directus services. |
| `cms/extensions/publication/src/prepare-*/*`       | Prepare operation: snapshot, validation, change summary.                         |
| `cms/extensions/publication/src/activate-*/*`      | Activate operation: status switch and API hook.                                  |
| `cms/tests/src/*`                                  | Integration tests against the local stack.                                       |
| `compose.yaml`, `.env.example`, `scripts/ci/*`     | Local stack and disposable CI environment.                                       |
| `.github/workflows/ci.yml`                         | Unit checks and CMS integration tests.                                           |
| `docs/development.md`, `docs/architecture.md`      | Local development guide; architecture of what exists.                            |

---

### Task 1: pnpm workspace with the site in `site/`

**Files:**

- Move: `app/`, `src/`, `public/`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `tsconfig.json` → `site/`
- Create: `site/package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.nvmrc`
- Modify: `package.json`, `.gitignore`, `.prettierignore`, `.husky/pre-commit`, `.husky/pre-push`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
- Delete: `package-lock.json`

**Interfaces:**

- Produces: root scripts `typecheck`, `lint`, `test`, `format:check`, `build:site`; workspace globs `site`, `packages/*`, `cms/*`, `cms/extensions/*`; package `@portfolio/site`.

- [ ] **Step 1: Move the site**

```bash
mkdir site
git mv app src public next.config.ts postcss.config.mjs eslint.config.mjs vitest.config.ts tsconfig.json site/
git rm -q package-lock.json
```

- [ ] **Step 2: Create `site/package.json`**

```json
{
  "name": "@portfolio/site",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --max-warnings 0",
    "lint:fix": "eslint . --fix",
    "test": "vitest run",
    "test:watch": "vitest --watch",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "lucide-react": "^1.8.0",
    "motion": "^12.38.0",
    "next": "16.1.1",
    "next-themes": "^0.4.6",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "tailwind-merge": "^3.4.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@testing-library/jest-dom": "^6.8.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@typescript-eslint/eslint-plugin": "^8.53.0",
    "@vitejs/plugin-react": "^4.6.0",
    "eslint": "^9",
    "eslint-config-next": "16.1.1",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-prettier": "^5.5.5",
    "jsdom": "^26.1.0",
    "prettier": "3.7.4",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vite": "^5.4.21",
    "vite-tsconfig-paths": "^5.1.4",
    "vitest": "^2.1.9"
  }
}
```

The dependencies are the current ones, with two pins that pnpm needs: `vite` 5 so `@vitejs/plugin-react` resolves its peer to the version Vitest 2 uses (the workspace packages bring Vite 8 with Vitest 5), and Prettier `3.7.4`, the version of the current lockfile, so formatting does not change with the migration.

- [ ] **Step 3: Replace the root `package.json`**

```json
{
  "name": "ny-randriantsarafara",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.32.1",
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "dev:site": "pnpm --filter @portfolio/site dev",
    "build:site": "pnpm --filter @portfolio/site build",
    "lint": "pnpm -r --if-present lint",
    "typecheck": "pnpm -r --if-present typecheck",
    "test": "pnpm -r --filter '!@portfolio/cms-tests' --if-present test",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "validate": "pnpm typecheck && pnpm lint && pnpm format:check",
    "prepare": "husky"
  },
  "lint-staged": {
    "site/**/*.{js,jsx,ts,tsx}": [
      "pnpm --filter @portfolio/site exec eslint --fix --max-warnings 0",
      "prettier --write"
    ],
    "{packages,cms}/**/*.ts": ["prettier --write"],
    "*.{json,md,css,yml,yaml}": ["prettier --write"]
  },
  "devDependencies": {
    "husky": "^9.1.7",
    "lint-staged": "^16.2.7",
    "prettier": "3.7.4"
  }
}
```

- [ ] **Step 4: Create `pnpm-workspace.yaml`, `tsconfig.base.json` and `.nvmrc`**

`pnpm-workspace.yaml`:

```yaml
packages:
  - site
  - packages/*
  - cms/*
  - cms/extensions/*
onlyBuiltDependencies:
  - esbuild
  - sharp
  - unrs-resolver
# jest-dom augments the `vitest` types without declaring the peer; without this, pnpm
# resolves its import to the workspace's Vitest 5 instead of the site's Vitest 2.
packageExtensions:
  '@testing-library/jest-dom':
    peerDependencies:
      vitest: '*'
```

`tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "types": ["node"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

`.nvmrc`:

```text
24
```

- [ ] **Step 5: Update ignore files and hooks**

`.gitignore` (whole file):

```gitignore
# dependencies
node_modules
.pnp
.pnp.*

# testing
coverage
test-results
playwright-report

# next.js
.next/
out/

# builds
build
dist

# local stack
.data

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
.pnpm-debug.log*

# env files
.env*
!.env.example

# typescript
*.tsbuildinfo
next-env.d.ts
```

Append to `.prettierignore`:

```gitignore
# Local stack
.data/
```

`.husky/pre-commit`:

```sh
pnpm exec lint-staged
```

`.husky/pre-push`:

```sh
pnpm test
```

- [ ] **Step 6: Replace `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  checks:
    name: Checks
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Checkout
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - name: pnpm
        uses: pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413 # v6.1.0
      - name: Node
        uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Typecheck
        run: pnpm typecheck
      - name: Lint
        run: pnpm lint
      - name: Formatting
        run: pnpm format:check
      - name: Unit tests
        run: pnpm test
      - name: Build the site
        run: pnpm build:site
```

- [ ] **Step 7: Update `.github/workflows/deploy.yml` for pnpm and `site/out`**

Replace the `steps` of the `build` job with:

<!-- prettier-ignore -->
```yaml
    steps:
      - name: Checkout
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - name: pnpm
        uses: pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413 # v6.1.0
      - name: Node
        uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - name: Setup Pages
        uses: actions/configure-pages@v5
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Build
        run: pnpm build:site
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./site/out
```

- [ ] **Step 8: Install and verify the move**

Run: `corepack enable && pnpm install`
Expected: `pnpm-lock.yaml` created; no "Ignored build scripts" warning. If pnpm lists ignored build scripts, add exactly those package names to `onlyBuiltDependencies` and run `pnpm install` again.

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build:site && pnpm format:check`
Expected: all succeed; `site/out/index.html` and `site/out/CNAME` exist.

- [ ] **Step 9: Commit**

```bash
git add -A site package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json .nvmrc .gitignore .prettierignore .husky .github
git add -u
git commit -m "build: move the site into a pnpm workspace"
```

---

### Task 2: Publication content schema and validation

**Files:**

- Create: `packages/content/package.json`, `packages/content/tsconfig.json`, `packages/content/src/localized.ts`, `packages/content/src/icons.ts`, `packages/content/src/blocks.ts`, `packages/content/src/publication.ts`, `packages/content/src/validation.ts`, `packages/content/src/index.ts`, `packages/content/src/testing/fixture.ts`
- Test: `packages/content/src/validation.test.ts`

**Interfaces:**

- Produces (from `@portfolio/content`):
  - `localeSchema`, `type Locale = 'en' | 'fr'`, `slugSchema`, `localizedTextSchema`, `type LocalizedText = { en: string; fr: string }`, `localizedListSchema`, `type LocalizedList = { en: string[]; fr: string[] }`, `filledLocalizedListSchema` (at least one item per language)
  - `iconNames` (the content icons of the site registry), `iconSchema`, `type IconName`
  - `blockSchema`, `type Block`, `type BlockType`
  - `publicationContentSchema`, `type PublicationContent`, `type Profile`, `type Capability`, `type Skill`, `type Experience`, `type Project`, `type KeyFigure`, `type Answer`, `type SensitiveTopic`, `type ChatSettings`, `type SiteSettings`
  - `validatePublicationContent(candidate: unknown): PublicationValidation` where `PublicationValidation = { valid: true; content: PublicationContent } | { valid: false; problems: PublicationProblem[] }` and `PublicationProblem = { path: string; message: string }`
- Produces (from `@portfolio/content/testing`): `contentFixture: PublicationContent` and the named items it is built from (`warnerExperience`, `itrasExperience`, `eurosportProject`, `visaProject`, `journeyAnswer`, `whyMeAnswer`, …).

- [ ] **Step 1: Create the package files**

`packages/content/package.json`:

```json
{
  "name": "@portfolio/content",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./testing": {
      "types": "./src/testing/fixture.ts",
      "default": "./src/testing/fixture.ts"
    }
  },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^4.6.5"
  },
  "devDependencies": {
    "@types/node": "^24.19.2",
    "typescript": "~6.0.3",
    "vite": "^8.1.2",
    "vitest": "^5.0.3"
  }
}
```

`packages/content/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

Run: `pnpm install`
Expected: workspace package linked.

- [ ] **Step 2: Write the schemas**

`packages/content/src/localized.ts`:

```ts
import { z } from 'zod';

export const localeSchema = z.enum(['en', 'fr']);
export type Locale = z.infer<typeof localeSchema>;

export const textSchema = z.string().trim().min(1, 'Must not be empty');

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Must be a lowercase slug (letters, digits, hyphens)');

export const localizedTextSchema = z.object({ en: textSchema, fr: textSchema });
export type LocalizedText = z.infer<typeof localizedTextSchema>;

export const localizedListSchema = z.object({
  en: z.array(textSchema),
  fr: z.array(textSchema),
});
export type LocalizedList = z.infer<typeof localizedListSchema>;

const filledListSchema = z.array(textSchema).min(1, 'Must have at least one item');

export const filledLocalizedListSchema = z.object({ en: filledListSchema, fr: filledListSchema });
```

`packages/content/src/icons.ts`:

```ts
import { z } from 'zod';

export const iconNames = [
  'brain-circuit',
  'briefcase',
  'cloud',
  'database',
  'layers',
  'map',
  'server',
  'shield-check',
  'sparkles',
  'workflow',
] as const;

export const iconSchema = z.enum(iconNames);
export type IconName = z.infer<typeof iconSchema>;
```

`packages/content/src/blocks.ts`:

```ts
import { z } from 'zod';

import { slugSchema, textSchema } from './localized.ts';

export const blockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('timeline'),
    experienceSlugs: z.array(slugSchema).optional(),
    skillSlug: slugSchema.optional(),
  }),
  z.object({ type: z.literal('experience'), slug: slugSchema }),
  z.object({ type: z.literal('project'), slug: slugSchema }),
  z.object({
    type: z.literal('skills'),
    capabilitySlug: slugSchema.optional(),
    highlightSlugs: z.array(slugSchema).optional(),
  }),
  z.object({ type: z.literal('key-figures'), slugs: z.array(slugSchema).min(1) }),
  z.object({ type: z.literal('strengths'), answerSlug: slugSchema }),
  z.object({ type: z.literal('contact'), topic: textSchema.optional() }),
  z.object({ type: z.literal('cv') }),
]);

export type Block = z.infer<typeof blockSchema>;
export type BlockType = Block['type'];
```

`packages/content/src/publication.ts`:

```ts
import { z } from 'zod';

import { blockSchema } from './blocks.ts';
import { iconSchema } from './icons.ts';
import {
  filledLocalizedListSchema,
  localizedListSchema,
  localizedTextSchema,
  slugSchema,
  textSchema,
} from './localized.ts';

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Must be a YYYY-MM month');
const yearSchema = z.number().int().min(1990).max(2100);
const slugListSchema = z.array(slugSchema);

export const profileSchema = z.object({
  name: textSchema,
  headline: localizedTextSchema,
  introduction: localizedTextSchema,
  location: localizedTextSchema,
  availability: localizedTextSchema,
  workAuthorization: localizedTextSchema,
  languages: localizedTextSchema,
  email: z.email(),
  linkedinUrl: z.url(),
  githubUrl: z.url(),
  photo: z.object({ fileId: z.uuid(), alt: localizedTextSchema }).nullable(),
  disclosure: localizedTextSchema,
});

export const capabilitySchema = z.object({
  slug: slugSchema,
  icon: iconSchema,
  title: localizedTextSchema,
  description: localizedTextSchema,
});

export const skillSchema = z.object({
  slug: slugSchema,
  name: textSchema,
  capabilitySlug: slugSchema,
  featured: z.boolean(),
});

export const experienceSchema = z.object({
  slug: slugSchema,
  company: textSchema,
  role: localizedTextSchema,
  startMonth: monthSchema,
  endMonth: monthSchema.nullable(),
  location: textSchema.nullable(),
  summary: localizedTextSchema,
  highlights: localizedListSchema,
  skillSlugs: slugListSchema,
});

export const projectSchema = z.object({
  slug: slugSchema,
  kind: z.enum(['professional', 'personal']),
  icon: iconSchema.nullable(),
  title: localizedTextSchema,
  company: textSchema.nullable(),
  role: localizedTextSchema.nullable(),
  startYear: yearSchema.nullable(),
  endYear: yearSchema.nullable(),
  summary: localizedTextSchema,
  caseStudy: localizedTextSchema.nullable(),
  skillSlugs: slugListSchema,
});

export const keyFigureSchema = z.object({
  slug: slugSchema,
  value: textSchema,
  label: localizedTextSchema,
});

export const answerSchema = z.object({
  slug: slugSchema,
  topic: localizedTextSchema,
  sampleQuestions: filledLocalizedListSchema,
  text: localizedTextSchema,
  experienceSlugs: slugListSchema,
  projectSlugs: slugListSchema,
  skillSlugs: slugListSchema,
  keyFigureSlugs: slugListSchema,
  blocks: z.array(blockSchema),
  starter: z.boolean(),
});

export const sensitiveTopicSchema = z.object({
  slug: slugSchema,
  keywords: filledLocalizedListSchema,
  reply: localizedTextSchema,
});

export const chatSettingsSchema = z.object({
  unknownReply: localizedTextSchema,
  refusalReply: localizedTextSchema,
  sensitiveTopics: z.array(sensitiveTopicSchema),
  suggestedTopics: localizedListSchema,
});

export const siteSettingsSchema = z.object({
  title: localizedTextSchema,
  description: localizedTextSchema,
});

export const publicationContentSchema = z.object({
  profile: profileSchema,
  capabilities: z.array(capabilitySchema),
  skills: z.array(skillSchema),
  experiences: z.array(experienceSchema),
  projects: z.array(projectSchema),
  keyFigures: z.array(keyFigureSchema),
  answers: z.array(answerSchema),
  chatSettings: chatSettingsSchema,
  siteSettings: siteSettingsSchema,
});

export type Profile = z.infer<typeof profileSchema>;
export type Capability = z.infer<typeof capabilitySchema>;
export type Skill = z.infer<typeof skillSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Project = z.infer<typeof projectSchema>;
export type KeyFigure = z.infer<typeof keyFigureSchema>;
export type Answer = z.infer<typeof answerSchema>;
export type SensitiveTopic = z.infer<typeof sensitiveTopicSchema>;
export type ChatSettings = z.infer<typeof chatSettingsSchema>;
export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export type PublicationContent = z.infer<typeof publicationContentSchema>;
```

- [ ] **Step 3: Write the test fixture**

`packages/content/src/testing/fixture.ts`:

```ts
import type {
  Answer,
  Capability,
  ChatSettings,
  Experience,
  KeyFigure,
  Profile,
  Project,
  PublicationContent,
  SiteSettings,
  Skill,
} from '../publication.ts';

export const profileFixture: Profile = {
  name: 'Ny Hasinavalona Randriantsarafara',
  headline: { en: 'Senior Backend & Cloud Engineer', fr: 'Ingénieur backend et cloud senior' },
  introduction: { en: 'I build reliable systems.', fr: 'Je construis des systèmes fiables.' },
  location: { en: 'Paris, France', fr: 'Paris, France' },
  availability: { en: 'Available', fr: 'Disponible' },
  workAuthorization: { en: 'EU Blue Card', fr: 'Carte bleue européenne' },
  languages: { en: 'French, English', fr: 'Français, anglais' },
  email: 'owner@example.com',
  linkedinUrl: 'https://www.linkedin.com/in/example/',
  githubUrl: 'https://github.com/example',
  photo: null,
  disclosure: {
    en: 'An AI answering from my answers.',
    fr: 'Une IA qui répond avec mes réponses.',
  },
};

export const cloudCapability: Capability = {
  slug: 'cloud',
  icon: 'cloud',
  title: { en: 'Cloud & Infrastructure', fr: 'Cloud et infrastructure' },
  description: { en: 'AWS and Terraform.', fr: 'AWS et Terraform.' },
};

export const backendCapability: Capability = {
  slug: 'backend',
  icon: 'server',
  title: { en: 'Backend & APIs', fr: 'Backend et API' },
  description: { en: 'Node.js and GraphQL.', fr: 'Node.js et GraphQL.' },
};

export const typescriptSkill: Skill = {
  slug: 'typescript',
  name: 'TypeScript',
  capabilitySlug: 'backend',
  featured: true,
};
export const awsSkill: Skill = {
  slug: 'aws',
  name: 'AWS',
  capabilitySlug: 'cloud',
  featured: true,
};
export const javaSkill: Skill = {
  slug: 'java',
  name: 'Java',
  capabilitySlug: 'backend',
  featured: false,
};

export const warnerExperience: Experience = {
  slug: 'warner-bros-discovery',
  company: 'Warner Bros. Discovery',
  role: { en: 'Software Engineer', fr: 'Ingénieur logiciel' },
  startMonth: '2024-03',
  endMonth: null,
  location: 'Issy-les-Moulineaux, FR',
  summary: { en: 'Eurosport content APIs.', fr: 'API de contenu Eurosport.' },
  highlights: { en: ['Migrated to Terraform.'], fr: ['Migration vers Terraform.'] },
  skillSlugs: ['typescript', 'aws'],
};

export const itrasExperience: Experience = {
  slug: 'itras-group',
  company: 'ITRAS Group',
  role: { en: 'Software Engineer', fr: 'Ingénieur logiciel' },
  startMonth: '2018-10',
  endMonth: '2020-02',
  location: 'Antananarivo, MG',
  summary: { en: 'Angular and Spring Boot.', fr: 'Angular et Spring Boot.' },
  highlights: { en: ['Coverage from 0% to 82%.'], fr: ['Couverture de 0 % à 82 %.'] },
  skillSlugs: ['java'],
};

export const eurosportProject: Project = {
  slug: 'eurosport-api-platform',
  kind: 'professional',
  icon: null,
  title: { en: 'Eurosport API platform', fr: 'Plateforme API Eurosport' },
  company: 'Warner Bros. Discovery',
  role: { en: 'Software Engineer', fr: 'Ingénieur logiciel' },
  startYear: 2024,
  endYear: null,
  summary: { en: 'GraphQL content API.', fr: 'API GraphQL de contenu.' },
  caseStudy: null,
  skillSlugs: ['typescript', 'aws'],
};

export const visaProject: Project = {
  slug: 'visa-insight',
  kind: 'personal',
  icon: 'brain-circuit',
  title: { en: 'Visa Insight', fr: 'Visa Insight' },
  company: null,
  role: null,
  startYear: null,
  endYear: null,
  summary: { en: 'Case review platform.', fr: 'Plateforme d’analyse de dossiers.' },
  caseStudy: null,
  skillSlugs: ['typescript'],
};

export const yearsFigure: KeyFigure = {
  slug: 'years-experience',
  value: '8+',
  label: { en: 'Years of experience', fr: 'Années d’expérience' },
};

export const coverageFigure: KeyFigure = {
  slug: 'coverage-achieved',
  value: '82%',
  label: { en: 'Coverage achieved', fr: 'Couverture atteinte' },
};

export const journeyAnswer: Answer = {
  slug: 'journey',
  topic: { en: 'Journey', fr: 'Parcours' },
  sampleQuestions: {
    en: ['Tell me about your background'],
    fr: ['Parle-moi de ton parcours'],
  },
  text: { en: 'I started in Madagascar.', fr: 'J’ai commencé à Madagascar.' },
  experienceSlugs: ['itras-group', 'warner-bros-discovery'],
  projectSlugs: [],
  skillSlugs: [],
  keyFigureSlugs: ['years-experience'],
  blocks: [{ type: 'timeline' }, { type: 'key-figures', slugs: ['years-experience'] }],
  starter: true,
};

export const whyMeAnswer: Answer = {
  slug: 'why-me',
  topic: { en: 'Why me', fr: 'Pourquoi moi' },
  sampleQuestions: { en: ['Why should we hire you?'], fr: ['Pourquoi vous recruter ?'] },
  text: { en: 'I own outcomes.', fr: 'Je m’engage sur les résultats.' },
  experienceSlugs: [],
  projectSlugs: ['eurosport-api-platform'],
  skillSlugs: ['typescript'],
  keyFigureSlugs: [],
  blocks: [
    { type: 'strengths', answerSlug: 'why-me' },
    { type: 'project', slug: 'eurosport-api-platform' },
    { type: 'contact' },
  ],
  starter: true,
};

export const chatSettingsFixture: ChatSettings = {
  unknownReply: { en: 'I have not answered that yet.', fr: 'Je n’ai pas encore répondu à cela.' },
  refusalReply: { en: 'Let us talk about my work.', fr: 'Parlons de mon travail.' },
  sensitiveTopics: [
    {
      slug: 'compensation',
      keywords: { en: ['salary'], fr: ['salaire'] },
      reply: { en: 'Let us discuss it directly.', fr: 'Parlons-en directement.' },
    },
  ],
  suggestedTopics: { en: ['My background'], fr: ['Mon parcours'] },
};

export const siteSettingsFixture: SiteSettings = {
  title: { en: 'Portfolio', fr: 'Portfolio' },
  description: { en: 'Backend engineer.', fr: 'Ingénieur backend.' },
};

export const contentFixture: PublicationContent = {
  profile: profileFixture,
  capabilities: [cloudCapability, backendCapability],
  skills: [typescriptSkill, awsSkill, javaSkill],
  experiences: [warnerExperience, itrasExperience],
  projects: [eurosportProject, visaProject],
  keyFigures: [yearsFigure, coverageFigure],
  answers: [journeyAnswer, whyMeAnswer],
  chatSettings: chatSettingsFixture,
  siteSettings: siteSettingsFixture,
};
```

- [ ] **Step 4: Write the failing validation tests**

`packages/content/src/validation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  backendCapability,
  cloudCapability,
  contentFixture,
  itrasExperience,
  journeyAnswer,
  warnerExperience,
  whyMeAnswer,
} from './testing/fixture.ts';
import { validatePublicationContent } from './validation.ts';

function problemsOf(candidate: unknown): { path: string; message: string }[] {
  const result = validatePublicationContent(candidate);
  if (result.valid) {
    return [];
  }
  return result.problems;
}

describe('validatePublicationContent', () => {
  it('accepts valid content and returns it parsed', () => {
    expect(validatePublicationContent(contentFixture)).toEqual({
      valid: true,
      content: contentFixture,
    });
  });

  it('names the item slug and field of an empty French text', () => {
    const candidate = {
      ...contentFixture,
      experiences: [
        { ...warnerExperience, summary: { en: warnerExperience.summary.en, fr: '  ' } },
        itrasExperience,
      ],
    };

    expect(problemsOf(candidate)).toEqual([
      { path: 'experiences[warner-bros-discovery].summary.fr', message: 'Must not be empty' },
    ]);
  });

  it('reports a missing translation stored as null', () => {
    const candidate = {
      ...contentFixture,
      experiences: [warnerExperience, { ...itrasExperience, role: { en: 'Engineer', fr: null } }],
    };

    expect(problemsOf(candidate).map((problem) => problem.path)).toEqual([
      'experiences[itras-group].role.fr',
    ]);
  });

  it('reports a skill reference that does not exist', () => {
    const candidate = {
      ...contentFixture,
      experiences: [{ ...warnerExperience, skillSlugs: ['typescript', 'cobol'] }, itrasExperience],
    };

    expect(problemsOf(candidate)).toEqual([
      { path: 'experiences[warner-bros-discovery].skillSlugs', message: 'Unknown skill "cobol"' },
    ]);
  });

  it('reports a block pointing to an unknown project', () => {
    const candidate = {
      ...contentFixture,
      answers: [
        journeyAnswer,
        { ...whyMeAnswer, blocks: [{ type: 'project', slug: 'missing-project' }] },
      ],
    };

    expect(problemsOf(candidate)).toEqual([
      { path: 'answers[why-me].blocks[0]', message: 'Unknown project "missing-project"' },
    ]);
  });

  it('reports a block type outside the catalog', () => {
    const candidate = {
      ...contentFixture,
      answers: [journeyAnswer, { ...whyMeAnswer, blocks: [{ type: 'video' }] }],
    };

    expect(problemsOf(candidate).map((problem) => problem.path)).toEqual([
      'answers[why-me].blocks[0].type',
    ]);
  });

  it('reports duplicated slugs', () => {
    const candidate = {
      ...contentFixture,
      experiences: [warnerExperience, { ...itrasExperience, slug: 'warner-bros-discovery' }],
    };

    expect(problemsOf(candidate)).toContainEqual({
      path: 'experiences[warner-bros-discovery]',
      message: 'Duplicate slug',
    });
  });

  it('reports highlights that differ in count between languages', () => {
    const candidate = {
      ...contentFixture,
      experiences: [
        { ...warnerExperience, highlights: { en: ['One.', 'Two.'], fr: ['Un.'] } },
        itrasExperience,
      ],
    };

    expect(problemsOf(candidate)).toEqual([
      {
        path: 'experiences[warner-bros-discovery].highlights',
        message: 'English has 2 items, French has 1',
      },
    ]);
  });

  it('reports an end month before the start month', () => {
    const candidate = {
      ...contentFixture,
      experiences: [warnerExperience, { ...itrasExperience, endMonth: '2017-01' }],
    };

    expect(problemsOf(candidate)).toEqual([
      { path: 'experiences[itras-group].endMonth', message: 'Ends before it starts' },
    ]);
  });

  it('reports a strengths block pointing to an unknown answer', () => {
    const candidate = {
      ...contentFixture,
      answers: [
        journeyAnswer,
        { ...whyMeAnswer, blocks: [{ type: 'strengths', answerSlug: 'x' }] },
      ],
    };

    expect(problemsOf(candidate)).toEqual([
      { path: 'answers[why-me].blocks[0]', message: 'Unknown answer "x"' },
    ]);
  });

  it('reports an icon outside the site registry', () => {
    const candidate = {
      ...contentFixture,
      capabilities: [{ ...cloudCapability, icon: 'rocket' }, backendCapability],
    };

    expect(problemsOf(candidate).map((problem) => problem.path)).toEqual([
      'capabilities[cloud].icon',
    ]);
  });

  it('describes the root when the candidate is not an object', () => {
    expect(problemsOf(null).map((problem) => problem.path)).toEqual(['(content)']);
  });
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `pnpm --filter @portfolio/content test`
Expected: FAIL, `Cannot find module './validation.ts'` (or similar resolution error).

- [ ] **Step 6: Implement validation**

`packages/content/src/validation.ts`:

```ts
import type { Block } from './blocks.ts';
import { publicationContentSchema } from './publication.ts';
import type { Answer, Experience, Project, PublicationContent } from './publication.ts';

export type PublicationProblem = { path: string; message: string };

export type PublicationValidation =
  | { valid: true; content: PublicationContent }
  | { valid: false; problems: PublicationProblem[] };

type Issue = { path: readonly PropertyKey[]; message: string };

type SlugSets = {
  capabilities: ReadonlySet<string>;
  skills: ReadonlySet<string>;
  experiences: ReadonlySet<string>;
  projects: ReadonlySet<string>;
  keyFigures: ReadonlySet<string>;
  answers: ReadonlySet<string>;
};

const slugCollections: ReadonlySet<string> = new Set([
  'capabilities',
  'skills',
  'experiences',
  'projects',
  'keyFigures',
  'answers',
]);

export function validatePublicationContent(candidate: unknown): PublicationValidation {
  const parsed = publicationContentSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      valid: false,
      problems: parsed.error.issues.map((issue) => toProblem(candidate, issue)),
    };
  }
  const problems = findReferenceProblems(parsed.data);
  if (problems.length > 0) {
    return { valid: false, problems };
  }
  return { valid: true, content: parsed.data };
}

function toProblem(candidate: unknown, issue: Issue): PublicationProblem {
  return { path: formatPath(candidate, issue.path), message: issue.message };
}

function formatPath(candidate: unknown, path: readonly PropertyKey[]): string {
  if (path.length === 0) {
    return '(content)';
  }
  const [collection, position, ...rest] = path;
  if (typeof collection !== 'string' || typeof position !== 'number') {
    return joinSegments(path.map(formatSegment));
  }
  if (!slugCollections.has(collection)) {
    return joinSegments(path.map(formatSegment));
  }
  const label = readSlugAt(candidate, collection, position) ?? String(position);
  return joinSegments([`${collection}[${label}]`, ...rest.map(formatSegment)]);
}

function formatSegment(segment: PropertyKey): string {
  if (typeof segment === 'number') {
    return `[${segment}]`;
  }
  return String(segment);
}

function joinSegments(segments: readonly string[]): string {
  return segments.reduce((joined, segment) => {
    if (joined === '') {
      return segment;
    }
    if (segment.startsWith('[')) {
      return `${joined}${segment}`;
    }
    return `${joined}.${segment}`;
  }, '');
}

function readSlugAt(candidate: unknown, collection: string, position: number): string | null {
  if (!isRecord(candidate)) {
    return null;
  }
  const items = candidate[collection];
  if (!Array.isArray(items)) {
    return null;
  }
  const item: unknown = items[position];
  if (!isRecord(item)) {
    return null;
  }
  const slug = item['slug'];
  if (typeof slug !== 'string' || slug === '') {
    return null;
  }
  return slug;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function findReferenceProblems(content: PublicationContent): PublicationProblem[] {
  const slugs: SlugSets = {
    capabilities: slugSet(content.capabilities),
    skills: slugSet(content.skills),
    experiences: slugSet(content.experiences),
    projects: slugSet(content.projects),
    keyFigures: slugSet(content.keyFigures),
    answers: slugSet(content.answers),
  };
  return [
    ...duplicateSlugProblems('capabilities', content.capabilities),
    ...duplicateSlugProblems('skills', content.skills),
    ...duplicateSlugProblems('experiences', content.experiences),
    ...duplicateSlugProblems('projects', content.projects),
    ...duplicateSlugProblems('keyFigures', content.keyFigures),
    ...duplicateSlugProblems('answers', content.answers),
    ...duplicateSlugProblems('chatSettings.sensitiveTopics', content.chatSettings.sensitiveTopics),
    ...content.skills.flatMap((skill) =>
      missingReferences(
        `skills[${skill.slug}].capabilitySlug`,
        [skill.capabilitySlug],
        slugs.capabilities,
        'capability'
      )
    ),
    ...content.experiences.flatMap((experience) => experienceProblems(experience, slugs)),
    ...content.projects.flatMap((project) => projectProblems(project, slugs)),
    ...content.answers.flatMap((answer) => answerProblems(answer, slugs)),
  ];
}

function slugSet(items: readonly { slug: string }[]): ReadonlySet<string> {
  return new Set(items.map((item) => item.slug));
}

function duplicateSlugProblems(
  path: string,
  items: readonly { slug: string }[]
): PublicationProblem[] {
  const slugs = items.map((item) => item.slug);
  const duplicates = new Set(slugs.filter((slug, index) => slugs.indexOf(slug) !== index));
  return [...duplicates].map((slug) => ({ path: `${path}[${slug}]`, message: 'Duplicate slug' }));
}

function missingReferences(
  path: string,
  referenced: readonly string[],
  known: ReadonlySet<string>,
  kind: string
): PublicationProblem[] {
  return referenced
    .filter((slug) => !known.has(slug))
    .map((slug) => ({ path, message: `Unknown ${kind} "${slug}"` }));
}

function experienceProblems(experience: Experience, slugs: SlugSets): PublicationProblem[] {
  const path = `experiences[${experience.slug}]`;
  return [
    ...missingReferences(`${path}.skillSlugs`, experience.skillSlugs, slugs.skills, 'skill'),
    ...highlightCountProblems(path, experience),
    ...monthOrderProblems(path, experience),
  ];
}

function highlightCountProblems(path: string, experience: Experience): PublicationProblem[] {
  const english = experience.highlights.en.length;
  const french = experience.highlights.fr.length;
  if (english === french) {
    return [];
  }
  return [
    { path: `${path}.highlights`, message: `English has ${english} items, French has ${french}` },
  ];
}

function monthOrderProblems(path: string, experience: Experience): PublicationProblem[] {
  if (experience.endMonth === null || experience.endMonth >= experience.startMonth) {
    return [];
  }
  return [{ path: `${path}.endMonth`, message: 'Ends before it starts' }];
}

function projectProblems(project: Project, slugs: SlugSets): PublicationProblem[] {
  const path = `projects[${project.slug}]`;
  return [
    ...missingReferences(`${path}.skillSlugs`, project.skillSlugs, slugs.skills, 'skill'),
    ...yearOrderProblems(path, project),
  ];
}

function yearOrderProblems(path: string, project: Project): PublicationProblem[] {
  if (project.startYear === null || project.endYear === null) {
    return [];
  }
  if (project.endYear >= project.startYear) {
    return [];
  }
  return [{ path: `${path}.endYear`, message: 'Ends before it starts' }];
}

function answerProblems(answer: Answer, slugs: SlugSets): PublicationProblem[] {
  const path = `answers[${answer.slug}]`;
  return [
    ...missingReferences(
      `${path}.experienceSlugs`,
      answer.experienceSlugs,
      slugs.experiences,
      'experience'
    ),
    ...missingReferences(`${path}.projectSlugs`, answer.projectSlugs, slugs.projects, 'project'),
    ...missingReferences(`${path}.skillSlugs`, answer.skillSlugs, slugs.skills, 'skill'),
    ...missingReferences(
      `${path}.keyFigureSlugs`,
      answer.keyFigureSlugs,
      slugs.keyFigures,
      'key figure'
    ),
    ...answer.blocks.flatMap((block, index) =>
      blockProblems(`${path}.blocks[${index}]`, block, slugs)
    ),
  ];
}

function blockProblems(path: string, block: Block, slugs: SlugSets): PublicationProblem[] {
  switch (block.type) {
    case 'timeline':
      return [
        ...missingReferences(path, block.experienceSlugs ?? [], slugs.experiences, 'experience'),
        ...missingReferences(path, optionalList(block.skillSlug), slugs.skills, 'skill'),
      ];
    case 'experience':
      return missingReferences(path, [block.slug], slugs.experiences, 'experience');
    case 'project':
      return missingReferences(path, [block.slug], slugs.projects, 'project');
    case 'skills':
      return [
        ...missingReferences(
          path,
          optionalList(block.capabilitySlug),
          slugs.capabilities,
          'capability'
        ),
        ...missingReferences(path, block.highlightSlugs ?? [], slugs.skills, 'skill'),
      ];
    case 'key-figures':
      return missingReferences(path, block.slugs, slugs.keyFigures, 'key figure');
    case 'strengths':
      return missingReferences(path, [block.answerSlug], slugs.answers, 'answer');
    case 'contact':
    case 'cv':
      return [];
  }
}

function optionalList(value: string | undefined): string[] {
  if (value === undefined) {
    return [];
  }
  return [value];
}
```

`packages/content/src/index.ts`:

```ts
export * from './blocks.ts';
export * from './icons.ts';
export * from './localized.ts';
export * from './publication.ts';
export * from './validation.ts';
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm --filter @portfolio/content test && pnpm --filter @portfolio/content typecheck`
Expected: PASS (12 tests), no type error.

- [ ] **Step 8: Commit**

```bash
git add packages/content pnpm-lock.yaml
git commit -m "feat(content): validate bilingual publication content"
```

---

### Task 3: Change summary between publications

**Files:**

- Create: `packages/content/src/changes.ts`
- Modify: `packages/content/src/index.ts`
- Test: `packages/content/src/changes.test.ts`

**Interfaces:**

- Consumes: `PublicationContent` (Task 2).
- Produces:
  - `type CollectionName = 'capabilities' | 'skills' | 'experiences' | 'projects' | 'keyFigures' | 'answers'`
  - `type SingletonName = 'profile' | 'chatSettings' | 'siteSettings'`
  - `type CollectionChanges = { added: string[]; removed: string[]; changed: { slug: string; fields: string[] }[]; reordered: boolean }`
  - `type ChangeSummary = { firstPublication: boolean; collections: Record<CollectionName, CollectionChanges>; singletons: Record<SingletonName, string[]> }`
  - `summarizeChanges(previous: PublicationContent | null, next: PublicationContent): ChangeSummary`
  - `hasChanges(summary: ChangeSummary): boolean`
  - `formatChangeOverview(summary: ChangeSummary): string`

- [ ] **Step 1: Write the failing tests**

`packages/content/src/changes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { formatChangeOverview, hasChanges, summarizeChanges } from './changes.ts';
import {
  contentFixture,
  eurosportProject,
  itrasExperience,
  profileFixture,
  visaProject,
  warnerExperience,
} from './testing/fixture.ts';

describe('summarizeChanges', () => {
  it('lists every item as added for the first publication', () => {
    const summary = summarizeChanges(null, contentFixture);

    expect(summary.firstPublication).toBe(true);
    expect(summary.collections.experiences.added).toEqual(['warner-bros-discovery', 'itras-group']);
    expect(hasChanges(summary)).toBe(true);
  });

  it('reports added, removed and changed items with their fields', () => {
    const next = {
      ...contentFixture,
      experiences: [
        {
          ...warnerExperience,
          summary: { en: 'New.', fr: 'Nouveau.' },
          skillSlugs: ['typescript'],
        },
      ],
      projects: [eurosportProject, visaProject, { ...visaProject, slug: 'maestro' }],
    };

    const summary = summarizeChanges(contentFixture, next);

    expect(summary.collections.experiences).toEqual({
      added: [],
      removed: ['itras-group'],
      changed: [{ slug: 'warner-bros-discovery', fields: ['skillSlugs', 'summary'] }],
      reordered: false,
    });
    expect(summary.collections.projects.added).toEqual(['maestro']);
  });

  it('detects a new order of the same items', () => {
    const next = { ...contentFixture, experiences: [itrasExperience, warnerExperience] };

    expect(summarizeChanges(contentFixture, next).collections.experiences.reordered).toBe(true);
  });

  it('reports changed singleton fields', () => {
    const next = {
      ...contentFixture,
      profile: { ...profileFixture, headline: { en: 'Architect', fr: 'Architecte' } },
    };

    expect(summarizeChanges(contentFixture, next).singletons.profile).toEqual(['headline']);
  });

  it('finds no change between identical contents', () => {
    expect(hasChanges(summarizeChanges(contentFixture, contentFixture))).toBe(false);
  });
});

describe('formatChangeOverview', () => {
  it('describes a first publication with counts', () => {
    expect(formatChangeOverview(summarizeChanges(null, contentFixture))).toBe(
      [
        'First publication.',
        '',
        '- Capabilities: 2',
        '- Skills: 3',
        '- Experiences: 2',
        '- Projects: 2',
        '- Key figures: 2',
        '- Answers: 2',
      ].join('\n')
    );
  });

  it('lists each change on its own line', () => {
    const next = {
      ...contentFixture,
      experiences: [{ ...warnerExperience, summary: { en: 'New.', fr: 'Nouveau.' } }],
      profile: { ...profileFixture, headline: { en: 'Architect', fr: 'Architecte' } },
    };

    expect(formatChangeOverview(summarizeChanges(contentFixture, next))).toBe(
      [
        'Changes since the active publication:',
        '',
        '- Experiences: removed `itras-group`',
        '- Experiences: changed `warner-bros-discovery` (summary)',
        '- Profile: changed (headline)',
      ].join('\n')
    );
  });

  it('says when nothing changed', () => {
    expect(formatChangeOverview(summarizeChanges(contentFixture, contentFixture))).toBe(
      'No changes since the active publication.'
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @portfolio/content test`
Expected: FAIL, `Cannot find module './changes.ts'`.

- [ ] **Step 3: Implement the change summary**

`packages/content/src/changes.ts`:

```ts
import type { PublicationContent } from './publication.ts';

export type CollectionName =
  | 'capabilities'
  | 'skills'
  | 'experiences'
  | 'projects'
  | 'keyFigures'
  | 'answers';
export type SingletonName = 'profile' | 'chatSettings' | 'siteSettings';
export type ItemChange = { slug: string; fields: string[] };
export type CollectionChanges = {
  added: string[];
  removed: string[];
  changed: ItemChange[];
  reordered: boolean;
};
export type ChangeSummary = {
  firstPublication: boolean;
  collections: Record<CollectionName, CollectionChanges>;
  singletons: Record<SingletonName, string[]>;
};

const collectionNames: readonly CollectionName[] = [
  'capabilities',
  'skills',
  'experiences',
  'projects',
  'keyFigures',
  'answers',
];
const singletonNames: readonly SingletonName[] = ['profile', 'chatSettings', 'siteSettings'];

const collectionLabels: Record<CollectionName, string> = {
  capabilities: 'Capabilities',
  skills: 'Skills',
  experiences: 'Experiences',
  projects: 'Projects',
  keyFigures: 'Key figures',
  answers: 'Answers',
};
const singletonLabels: Record<SingletonName, string> = {
  profile: 'Profile',
  chatSettings: 'Chat settings',
  siteSettings: 'Site settings',
};

export function summarizeChanges(
  previous: PublicationContent | null,
  next: PublicationContent
): ChangeSummary {
  return {
    firstPublication: previous === null,
    collections: {
      capabilities: diffCollection(previous?.capabilities ?? [], next.capabilities),
      skills: diffCollection(previous?.skills ?? [], next.skills),
      experiences: diffCollection(previous?.experiences ?? [], next.experiences),
      projects: diffCollection(previous?.projects ?? [], next.projects),
      keyFigures: diffCollection(previous?.keyFigures ?? [], next.keyFigures),
      answers: diffCollection(previous?.answers ?? [], next.answers),
    },
    singletons: {
      profile: changedSingletonFields(previous?.profile ?? null, next.profile),
      chatSettings: changedSingletonFields(previous?.chatSettings ?? null, next.chatSettings),
      siteSettings: changedSingletonFields(previous?.siteSettings ?? null, next.siteSettings),
    },
  };
}

export function hasChanges(summary: ChangeSummary): boolean {
  if (summary.firstPublication) {
    return true;
  }
  const collectionChanged = Object.values(summary.collections).some(
    (changes) =>
      changes.added.length > 0 ||
      changes.removed.length > 0 ||
      changes.changed.length > 0 ||
      changes.reordered
  );
  const singletonChanged = Object.values(summary.singletons).some((fields) => fields.length > 0);
  return collectionChanged || singletonChanged;
}

export function formatChangeOverview(summary: ChangeSummary): string {
  if (summary.firstPublication) {
    return [
      'First publication.',
      '',
      ...collectionNames.map(
        (name) => `- ${collectionLabels[name]}: ${summary.collections[name].added.length}`
      ),
    ].join('\n');
  }
  const lines = [
    ...collectionNames.flatMap((name) =>
      collectionLines(collectionLabels[name], summary.collections[name])
    ),
    ...singletonNames.flatMap((name) =>
      singletonLines(singletonLabels[name], summary.singletons[name])
    ),
  ];
  if (lines.length === 0) {
    return 'No changes since the active publication.';
  }
  return ['Changes since the active publication:', '', ...lines].join('\n');
}

function diffCollection<Item extends { slug: string }>(
  previous: readonly Item[],
  next: readonly Item[]
): CollectionChanges {
  const previousBySlug = new Map(previous.map((item) => [item.slug, item]));
  const nextSlugs = new Set(next.map((item) => item.slug));
  const commonInPreviousOrder = previous
    .map((item) => item.slug)
    .filter((slug) => nextSlugs.has(slug));
  const commonInNextOrder = next
    .map((item) => item.slug)
    .filter((slug) => previousBySlug.has(slug));
  return {
    added: next.filter((item) => !previousBySlug.has(item.slug)).map((item) => item.slug),
    removed: previous.filter((item) => !nextSlugs.has(item.slug)).map((item) => item.slug),
    changed: next.flatMap((item) => itemChange(previousBySlug.get(item.slug), item)),
    reordered: commonInPreviousOrder.join(',') !== commonInNextOrder.join(','),
  };
}

function itemChange<Item extends { slug: string }>(
  previous: Item | undefined,
  next: Item
): ItemChange[] {
  if (previous === undefined) {
    return [];
  }
  const fields = changedFields(previous, next);
  if (fields.length === 0) {
    return [];
  }
  return [{ slug: next.slug, fields }];
}

function changedSingletonFields(previous: object | null, next: object): string[] {
  if (previous === null) {
    return [];
  }
  return changedFields(previous, next);
}

function changedFields(previous: object, next: object): string[] {
  const previousValues = new Map(Object.entries(previous));
  const nextValues = new Map(Object.entries(next));
  const fieldNames = new Set([...previousValues.keys(), ...nextValues.keys()]);
  return [...fieldNames]
    .filter(
      (name) => JSON.stringify(previousValues.get(name)) !== JSON.stringify(nextValues.get(name))
    )
    .toSorted();
}

function collectionLines(label: string, changes: CollectionChanges): string[] {
  return [
    ...changes.added.map((slug) => `- ${label}: added \`${slug}\``),
    ...changes.removed.map((slug) => `- ${label}: removed \`${slug}\``),
    ...changes.changed.map(
      (change) => `- ${label}: changed \`${change.slug}\` (${change.fields.join(', ')})`
    ),
    ...reorderLine(label, changes.reordered),
  ];
}

function reorderLine(label: string, reordered: boolean): string[] {
  if (!reordered) {
    return [];
  }
  return [`- ${label}: order changed`];
}

function singletonLines(label: string, fields: readonly string[]): string[] {
  if (fields.length === 0) {
    return [];
  }
  return [`- ${label}: changed (${fields.join(', ')})`];
}
```

Add to `packages/content/src/index.ts`:

```ts
export * from './changes.ts';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @portfolio/content test && pnpm --filter @portfolio/content typecheck`
Expected: PASS (20 tests), no type error.

- [ ] **Step 5: Commit**

```bash
git add packages/content
git commit -m "feat(content): summarize changes between publications"
```

---

### Task 4: Directus records and their mapping to publication content

**Files:**

- Create: `cms/schema/package.json`, `cms/schema/tsconfig.json`, `cms/schema/src/records.ts`, `cms/schema/src/mapping.ts`, `cms/schema/src/operations.ts`, `cms/schema/src/index.ts`, `cms/schema/src/testing/records.ts`
- Test: `cms/schema/src/mapping.test.ts`

**Interfaces:**

- Consumes: `validatePublicationContent`, `PublicationContent`, `PublicationValidation` (Task 2).
- Produces (from `@portfolio/cms-schema`):
  - `type JsonValue`, `type JsonObject`
  - Record types `ProfileRecord`, `CapabilityRecord`, `SkillRecord`, `ExperienceRecord`, `ProjectRecord`, `KeyFigureRecord`, `AnswerRecord`, `ChatSettingsRecord`, `SiteSettingsRecord`, `PublicationRecord`, `type PublicationStatus = 'prepared' | 'active' | 'superseded' | 'discarded'`, `type PortfolioSchema`
  - `type WorkingRecords` (singletons are `Partial` because Directus returns a partial row before the first save), `type NewWorkingRecords`
  - `buildPublicationContent(records: WorkingRecords): PublicationValidation`
  - `toWorkingRecords(content: PublicationContent): NewWorkingRecords`
  - From `@portfolio/cms-schema/operations` (no runtime dependency, safe for the Studio bundle): `PREPARE_OPERATION = 'prepare-publication'`, `ACTIVATE_OPERATION = 'activate-publication'`, `PREPARE_FLOW_NAME = 'Prepare publication'`, `PUBLISH_FLOW_NAME = 'Publish'`
  - From `@portfolio/cms-schema/testing`: `storedRecordsOf(content: PublicationContent): WorkingRecords` (records as Directus returns them, with ids)

Field conventions used by the mapping: text pairs `<name>_en` / `<name>_fr`; lists of sentences (highlights, sample questions, keywords, suggested topics) are multiline text with one item per line; slug lists and blocks are JSON; a blank optional pair (both languages empty) means "absent".

- [ ] **Step 1: Create the package files**

`cms/schema/package.json`:

```json
{
  "name": "@portfolio/cms-schema",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./operations": {
      "types": "./src/operations.ts",
      "default": "./src/operations.ts"
    },
    "./testing": {
      "types": "./src/testing/records.ts",
      "default": "./src/testing/records.ts"
    }
  },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@portfolio/content": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^24.19.2",
    "typescript": "~6.0.3",
    "vite": "^8.1.2",
    "vitest": "^5.0.3"
  }
}
```

`cms/schema/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

Run: `pnpm install`

- [ ] **Step 2: Write the record types and shared identifiers**

`cms/schema/src/records.ts`:

```ts
export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
export type JsonObject = { [key: string]: JsonValue | undefined };

export type ProfileRecord = {
  id: number;
  name: string | null;
  headline_en: string | null;
  headline_fr: string | null;
  introduction_en: string | null;
  introduction_fr: string | null;
  location_en: string | null;
  location_fr: string | null;
  availability_en: string | null;
  availability_fr: string | null;
  work_authorization_en: string | null;
  work_authorization_fr: string | null;
  languages_en: string | null;
  languages_fr: string | null;
  email: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  photo: string | null;
  photo_alt_en: string | null;
  photo_alt_fr: string | null;
  disclosure_en: string | null;
  disclosure_fr: string | null;
};

export type CapabilityRecord = {
  id: string;
  sort: number | null;
  slug: string;
  icon: string | null;
  title_en: string | null;
  title_fr: string | null;
  description_en: string | null;
  description_fr: string | null;
};

export type SkillRecord = {
  id: string;
  sort: number | null;
  slug: string;
  name: string | null;
  capability_slug: string | null;
  featured: boolean;
};

export type ExperienceRecord = {
  id: string;
  sort: number | null;
  slug: string;
  company: string | null;
  role_en: string | null;
  role_fr: string | null;
  start_month: string | null;
  end_month: string | null;
  location: string | null;
  summary_en: string | null;
  summary_fr: string | null;
  highlights_en: string | null;
  highlights_fr: string | null;
  skill_slugs: JsonValue;
};

export type ProjectRecord = {
  id: string;
  sort: number | null;
  slug: string;
  kind: string;
  icon: string | null;
  title_en: string | null;
  title_fr: string | null;
  company: string | null;
  role_en: string | null;
  role_fr: string | null;
  start_year: number | null;
  end_year: number | null;
  summary_en: string | null;
  summary_fr: string | null;
  case_study_en: string | null;
  case_study_fr: string | null;
  skill_slugs: JsonValue;
};

export type KeyFigureRecord = {
  id: string;
  sort: number | null;
  slug: string;
  value: string | null;
  label_en: string | null;
  label_fr: string | null;
};

export type AnswerRecord = {
  id: string;
  sort: number | null;
  slug: string;
  topic_en: string | null;
  topic_fr: string | null;
  sample_questions_en: string | null;
  sample_questions_fr: string | null;
  text_en: string | null;
  text_fr: string | null;
  experience_slugs: JsonValue;
  project_slugs: JsonValue;
  skill_slugs: JsonValue;
  key_figure_slugs: JsonValue;
  blocks: JsonValue;
  starter: boolean;
};

export type ChatSettingsRecord = {
  id: number;
  unknown_reply_en: string | null;
  unknown_reply_fr: string | null;
  refusal_reply_en: string | null;
  refusal_reply_fr: string | null;
  sensitive_topics: JsonValue;
  suggested_topics_en: string | null;
  suggested_topics_fr: string | null;
};

export type SiteSettingsRecord = {
  id: number;
  title_en: string | null;
  title_fr: string | null;
  description_en: string | null;
  description_fr: string | null;
};

export type PublicationStatus = 'prepared' | 'active' | 'superseded' | 'discarded';

export type PublicationRecord = {
  id: string;
  status: PublicationStatus;
  content: JsonValue;
  changes: JsonValue;
  changes_overview: string | null;
  activated_at: string | null;
  date_created: string | null;
  user_created: string | null;
};

export type PortfolioSchema = {
  profile: ProfileRecord;
  capabilities: CapabilityRecord[];
  skills: SkillRecord[];
  experiences: ExperienceRecord[];
  projects: ProjectRecord[];
  key_figures: KeyFigureRecord[];
  answers: AnswerRecord[];
  chat_settings: ChatSettingsRecord;
  site_settings: SiteSettingsRecord;
  publications: PublicationRecord[];
};
```

`cms/schema/src/operations.ts`:

```ts
export const PREPARE_OPERATION = 'prepare-publication';
export const ACTIVATE_OPERATION = 'activate-publication';
export const PREPARE_FLOW_NAME = 'Prepare publication';
export const PUBLISH_FLOW_NAME = 'Publish';
```

- [ ] **Step 3: Write the failing mapping tests**

`cms/schema/src/mapping.test.ts`:

```ts
import type { PublicationContent } from '@portfolio/content';
import { contentFixture } from '@portfolio/content/testing';
import { describe, expect, it } from 'vitest';

import { buildPublicationContent } from './mapping.ts';
import type { WorkingRecords } from './mapping.ts';
import { storedRecordsOf } from './testing/records.ts';

function storedRecords(): WorkingRecords {
  return storedRecordsOf(contentFixture);
}

function contentOf(records: WorkingRecords): PublicationContent {
  const result = buildPublicationContent(records);
  if (!result.valid) {
    throw new Error(JSON.stringify(result.problems));
  }
  return result.content;
}

function problemsOf(records: WorkingRecords): { path: string; message: string }[] {
  const result = buildPublicationContent(records);
  if (result.valid) {
    return [];
  }
  return result.problems;
}

describe('buildPublicationContent', () => {
  it('rebuilds the content the records were created from', () => {
    expect(buildPublicationContent(storedRecords())).toEqual({
      valid: true,
      content: contentFixture,
    });
  });

  it('orders items by sort, then by slug', () => {
    const records = storedRecords();

    const content = contentOf({
      ...records,
      skills: records.skills.map((record) => ({ ...record, sort: null })),
      experiences: records.experiences.toReversed(),
    });

    expect(content.skills.map((skill) => skill.slug)).toEqual(['aws', 'java', 'typescript']);
    expect(content.experiences.map((experience) => experience.slug)).toEqual([
      'warner-bros-discovery',
      'itras-group',
    ]);
  });

  it('names the slug and field of an emptied French text', () => {
    const records = storedRecords();
    const experiences = records.experiences.map((record) => ({ ...record, summary_fr: null }));

    expect(problemsOf({ ...records, experiences })).toEqual([
      { path: 'experiences[warner-bros-discovery].summary.fr', message: 'Must not be empty' },
      { path: 'experiences[itras-group].summary.fr', message: 'Must not be empty' },
    ]);
  });

  it('reports a half-filled optional pair as a missing translation', () => {
    const records = storedRecords();
    const projects = records.projects.map((record) => ({ ...record, case_study_en: 'Draft.' }));

    expect(problemsOf({ ...records, projects }).map((problem) => problem.path)).toEqual([
      'projects[eurosport-api-platform].caseStudy.fr',
      'projects[visa-insight].caseStudy.fr',
    ]);
  });

  it('reads one item per line and ignores blank lines', () => {
    const records = storedRecords();
    const experiences = records.experiences.map((record) => ({
      ...record,
      highlights_en: 'First.\n\n  Second.  \n',
      highlights_fr: 'Premier.\r\nDeuxième.',
    }));

    expect(contentOf({ ...records, experiences }).experiences[0]?.highlights).toEqual({
      en: ['First.', 'Second.'],
      fr: ['Premier.', 'Deuxième.'],
    });
  });

  it('reports a block type written outside the catalog', () => {
    const records = storedRecords();
    const answers = records.answers.map((record) => ({ ...record, blocks: [{ type: 'video' }] }));

    expect(problemsOf({ ...records, answers }).map((problem) => problem.path)).toEqual([
      'answers[journey].blocks[0].type',
      'answers[why-me].blocks[0].type',
    ]);
  });

  it('reports a sensitive topic without keywords', () => {
    const records = storedRecords();
    const chatSettings = {
      ...records.chatSettings,
      sensitive_topics: [
        {
          slug: 'compensation',
          keywords_en: ' ',
          keywords_fr: 'salaire',
          reply_en: 'Let us talk.',
          reply_fr: 'Parlons-en.',
        },
      ],
    };

    expect(problemsOf({ ...records, chatSettings })).toEqual([
      {
        path: 'chatSettings.sensitiveTopics[0].keywords.en',
        message: 'Must have at least one item',
      },
    ]);
  });

  it('reports the fields of a profile that was never saved', () => {
    expect(problemsOf({ ...storedRecords(), profile: {} }).map((problem) => problem.path)).toEqual(
      expect.arrayContaining(['profile.name', 'profile.headline.en', 'profile.email'])
    );
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `pnpm --filter @portfolio/cms-schema test`
Expected: FAIL, `Cannot find module './mapping.ts'`.

- [ ] **Step 5: Implement the mapping**

`cms/schema/src/mapping.ts`:

```ts
import { validatePublicationContent } from '@portfolio/content';
import type {
  Answer,
  Capability,
  ChatSettings,
  Experience,
  KeyFigure,
  Profile,
  Project,
  PublicationContent,
  PublicationValidation,
  SensitiveTopic,
  SiteSettings,
  Skill,
} from '@portfolio/content';

import type {
  AnswerRecord,
  CapabilityRecord,
  ChatSettingsRecord,
  ExperienceRecord,
  JsonObject,
  JsonValue,
  KeyFigureRecord,
  ProfileRecord,
  ProjectRecord,
  SiteSettingsRecord,
  SkillRecord,
} from './records.ts';

export type WorkingRecords = {
  profile: Partial<ProfileRecord>;
  capabilities: CapabilityRecord[];
  skills: SkillRecord[];
  experiences: ExperienceRecord[];
  projects: ProjectRecord[];
  keyFigures: KeyFigureRecord[];
  answers: AnswerRecord[];
  chatSettings: Partial<ChatSettingsRecord>;
  siteSettings: Partial<SiteSettingsRecord>;
};

type NewRecord<StoredRecord> = Omit<StoredRecord, 'id'>;

export type NewWorkingRecords = {
  profile: NewRecord<ProfileRecord>;
  capabilities: NewRecord<CapabilityRecord>[];
  skills: NewRecord<SkillRecord>[];
  experiences: NewRecord<ExperienceRecord>[];
  projects: NewRecord<ProjectRecord>[];
  keyFigures: NewRecord<KeyFigureRecord>[];
  answers: NewRecord<AnswerRecord>[];
  chatSettings: NewRecord<ChatSettingsRecord>;
  siteSettings: NewRecord<SiteSettingsRecord>;
};

type Blank = string | null | undefined;
type Sortable = { sort: number | null; slug: string };

export function buildPublicationContent(records: WorkingRecords): PublicationValidation {
  return validatePublicationContent({
    profile: profileCandidate(records.profile),
    capabilities: ordered(records.capabilities).map(capabilityCandidate),
    skills: ordered(records.skills).map(skillCandidate),
    experiences: ordered(records.experiences).map(experienceCandidate),
    projects: ordered(records.projects).map(projectCandidate),
    keyFigures: ordered(records.keyFigures).map(keyFigureCandidate),
    answers: ordered(records.answers).map(answerCandidate),
    chatSettings: chatSettingsCandidate(records.chatSettings),
    siteSettings: siteSettingsCandidate(records.siteSettings),
  });
}

export function toWorkingRecords(content: PublicationContent): NewWorkingRecords {
  return {
    profile: profileRecord(content.profile),
    capabilities: content.capabilities.map(capabilityRecord),
    skills: content.skills.map(skillRecord),
    experiences: content.experiences.map(experienceRecord),
    projects: content.projects.map(projectRecord),
    keyFigures: content.keyFigures.map(keyFigureRecord),
    answers: content.answers.map(answerRecord),
    chatSettings: chatSettingsRecord(content.chatSettings),
    siteSettings: siteSettingsRecord(content.siteSettings),
  };
}

function profileCandidate(record: Partial<ProfileRecord>): JsonObject {
  return {
    name: text(record.name),
    headline: localized(record.headline_en, record.headline_fr),
    introduction: localized(record.introduction_en, record.introduction_fr),
    location: localized(record.location_en, record.location_fr),
    availability: localized(record.availability_en, record.availability_fr),
    workAuthorization: localized(record.work_authorization_en, record.work_authorization_fr),
    languages: localized(record.languages_en, record.languages_fr),
    email: text(record.email),
    linkedinUrl: text(record.linkedin_url),
    githubUrl: text(record.github_url),
    photo: photoCandidate(record),
    disclosure: localized(record.disclosure_en, record.disclosure_fr),
  };
}

function photoCandidate(record: Partial<ProfileRecord>): JsonObject | null {
  const fileId = optionalText(record.photo);
  if (fileId === null) {
    return null;
  }
  return { fileId, alt: localized(record.photo_alt_en, record.photo_alt_fr) };
}

function capabilityCandidate(record: CapabilityRecord): JsonObject {
  return {
    slug: record.slug,
    icon: text(record.icon),
    title: localized(record.title_en, record.title_fr),
    description: localized(record.description_en, record.description_fr),
  };
}

function skillCandidate(record: SkillRecord): JsonObject {
  return {
    slug: record.slug,
    name: text(record.name),
    capabilitySlug: text(record.capability_slug),
    featured: record.featured,
  };
}

function experienceCandidate(record: ExperienceRecord): JsonObject {
  return {
    slug: record.slug,
    company: text(record.company),
    role: localized(record.role_en, record.role_fr),
    startMonth: text(record.start_month),
    endMonth: optionalText(record.end_month),
    location: optionalText(record.location),
    summary: localized(record.summary_en, record.summary_fr),
    highlights: localizedLines(record.highlights_en, record.highlights_fr),
    skillSlugs: list(record.skill_slugs),
  };
}

function projectCandidate(record: ProjectRecord): JsonObject {
  return {
    slug: record.slug,
    kind: record.kind,
    icon: optionalText(record.icon),
    title: localized(record.title_en, record.title_fr),
    company: optionalText(record.company),
    role: optionalLocalized(record.role_en, record.role_fr),
    startYear: record.start_year,
    endYear: record.end_year,
    summary: localized(record.summary_en, record.summary_fr),
    caseStudy: optionalLocalized(record.case_study_en, record.case_study_fr),
    skillSlugs: list(record.skill_slugs),
  };
}

function keyFigureCandidate(record: KeyFigureRecord): JsonObject {
  return {
    slug: record.slug,
    value: text(record.value),
    label: localized(record.label_en, record.label_fr),
  };
}

function answerCandidate(record: AnswerRecord): JsonObject {
  return {
    slug: record.slug,
    topic: localized(record.topic_en, record.topic_fr),
    sampleQuestions: localizedLines(record.sample_questions_en, record.sample_questions_fr),
    text: localized(record.text_en, record.text_fr),
    experienceSlugs: list(record.experience_slugs),
    projectSlugs: list(record.project_slugs),
    skillSlugs: list(record.skill_slugs),
    keyFigureSlugs: list(record.key_figure_slugs),
    blocks: list(record.blocks),
    starter: record.starter,
  };
}

function chatSettingsCandidate(record: Partial<ChatSettingsRecord>): JsonObject {
  return {
    unknownReply: localized(record.unknown_reply_en, record.unknown_reply_fr),
    refusalReply: localized(record.refusal_reply_en, record.refusal_reply_fr),
    sensitiveTopics: sensitiveTopicsCandidate(record.sensitive_topics),
    suggestedTopics: localizedLines(record.suggested_topics_en, record.suggested_topics_fr),
  };
}

function sensitiveTopicsCandidate(value: JsonValue | undefined): JsonValue {
  if (!Array.isArray(value)) {
    return list(value);
  }
  return value.map(sensitiveTopicCandidate);
}

function sensitiveTopicCandidate(entry: JsonValue): JsonValue {
  if (!isJsonObject(entry)) {
    return entry;
  }
  return {
    slug: entry['slug'] ?? '',
    keywords: localizedLines(stringValue(entry['keywords_en']), stringValue(entry['keywords_fr'])),
    reply: localized(stringValue(entry['reply_en']), stringValue(entry['reply_fr'])),
  };
}

function siteSettingsCandidate(record: Partial<SiteSettingsRecord>): JsonObject {
  return {
    title: localized(record.title_en, record.title_fr),
    description: localized(record.description_en, record.description_fr),
  };
}

function profileRecord(profile: Profile): NewRecord<ProfileRecord> {
  return {
    name: profile.name,
    headline_en: profile.headline.en,
    headline_fr: profile.headline.fr,
    introduction_en: profile.introduction.en,
    introduction_fr: profile.introduction.fr,
    location_en: profile.location.en,
    location_fr: profile.location.fr,
    availability_en: profile.availability.en,
    availability_fr: profile.availability.fr,
    work_authorization_en: profile.workAuthorization.en,
    work_authorization_fr: profile.workAuthorization.fr,
    languages_en: profile.languages.en,
    languages_fr: profile.languages.fr,
    email: profile.email,
    linkedin_url: profile.linkedinUrl,
    github_url: profile.githubUrl,
    photo: profile.photo?.fileId ?? null,
    photo_alt_en: profile.photo?.alt.en ?? null,
    photo_alt_fr: profile.photo?.alt.fr ?? null,
    disclosure_en: profile.disclosure.en,
    disclosure_fr: profile.disclosure.fr,
  };
}

function capabilityRecord(capability: Capability, index: number): NewRecord<CapabilityRecord> {
  return {
    sort: index + 1,
    slug: capability.slug,
    icon: capability.icon,
    title_en: capability.title.en,
    title_fr: capability.title.fr,
    description_en: capability.description.en,
    description_fr: capability.description.fr,
  };
}

function skillRecord(skill: Skill, index: number): NewRecord<SkillRecord> {
  return {
    sort: index + 1,
    slug: skill.slug,
    name: skill.name,
    capability_slug: skill.capabilitySlug,
    featured: skill.featured,
  };
}

function experienceRecord(experience: Experience, index: number): NewRecord<ExperienceRecord> {
  return {
    sort: index + 1,
    slug: experience.slug,
    company: experience.company,
    role_en: experience.role.en,
    role_fr: experience.role.fr,
    start_month: experience.startMonth,
    end_month: experience.endMonth,
    location: experience.location,
    summary_en: experience.summary.en,
    summary_fr: experience.summary.fr,
    highlights_en: experience.highlights.en.join('\n'),
    highlights_fr: experience.highlights.fr.join('\n'),
    skill_slugs: experience.skillSlugs,
  };
}

function projectRecord(project: Project, index: number): NewRecord<ProjectRecord> {
  return {
    sort: index + 1,
    slug: project.slug,
    kind: project.kind,
    icon: project.icon,
    title_en: project.title.en,
    title_fr: project.title.fr,
    company: project.company,
    role_en: project.role?.en ?? null,
    role_fr: project.role?.fr ?? null,
    start_year: project.startYear,
    end_year: project.endYear,
    summary_en: project.summary.en,
    summary_fr: project.summary.fr,
    case_study_en: project.caseStudy?.en ?? null,
    case_study_fr: project.caseStudy?.fr ?? null,
    skill_slugs: project.skillSlugs,
  };
}

function keyFigureRecord(keyFigure: KeyFigure, index: number): NewRecord<KeyFigureRecord> {
  return {
    sort: index + 1,
    slug: keyFigure.slug,
    value: keyFigure.value,
    label_en: keyFigure.label.en,
    label_fr: keyFigure.label.fr,
  };
}

function answerRecord(answer: Answer, index: number): NewRecord<AnswerRecord> {
  return {
    sort: index + 1,
    slug: answer.slug,
    topic_en: answer.topic.en,
    topic_fr: answer.topic.fr,
    sample_questions_en: answer.sampleQuestions.en.join('\n'),
    sample_questions_fr: answer.sampleQuestions.fr.join('\n'),
    text_en: answer.text.en,
    text_fr: answer.text.fr,
    experience_slugs: answer.experienceSlugs,
    project_slugs: answer.projectSlugs,
    skill_slugs: answer.skillSlugs,
    key_figure_slugs: answer.keyFigureSlugs,
    blocks: answer.blocks,
    starter: answer.starter,
  };
}

function chatSettingsRecord(settings: ChatSettings): NewRecord<ChatSettingsRecord> {
  return {
    unknown_reply_en: settings.unknownReply.en,
    unknown_reply_fr: settings.unknownReply.fr,
    refusal_reply_en: settings.refusalReply.en,
    refusal_reply_fr: settings.refusalReply.fr,
    sensitive_topics: settings.sensitiveTopics.map(sensitiveTopicRecord),
    suggested_topics_en: settings.suggestedTopics.en.join('\n'),
    suggested_topics_fr: settings.suggestedTopics.fr.join('\n'),
  };
}

function sensitiveTopicRecord(topic: SensitiveTopic): JsonObject {
  return {
    slug: topic.slug,
    keywords_en: topic.keywords.en.join('\n'),
    keywords_fr: topic.keywords.fr.join('\n'),
    reply_en: topic.reply.en,
    reply_fr: topic.reply.fr,
  };
}

function siteSettingsRecord(settings: SiteSettings): NewRecord<SiteSettingsRecord> {
  return {
    title_en: settings.title.en,
    title_fr: settings.title.fr,
    description_en: settings.description.en,
    description_fr: settings.description.fr,
  };
}

function ordered<Item extends Sortable>(items: readonly Item[]): Item[] {
  return items.toSorted(compareBySortThenSlug);
}

function compareBySortThenSlug(first: Sortable, second: Sortable): number {
  const bySort = sortValue(first) - sortValue(second);
  if (bySort !== 0) {
    return bySort;
  }
  return first.slug.localeCompare(second.slug);
}

function sortValue(item: Sortable): number {
  return item.sort ?? Number.MAX_SAFE_INTEGER;
}

function text(value: Blank): string {
  return value ?? '';
}

function optionalText(value: Blank): string | null {
  if (value === null || value === undefined || value.trim() === '') {
    return null;
  }
  return value;
}

function localized(english: Blank, french: Blank): JsonObject {
  return { en: text(english), fr: text(french) };
}

function optionalLocalized(english: Blank, french: Blank): JsonObject | null {
  if (optionalText(english) === null && optionalText(french) === null) {
    return null;
  }
  return localized(english, french);
}

function lines(value: Blank): string[] {
  return text(value)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

function localizedLines(english: Blank, french: Blank): JsonObject {
  return { en: lines(english), fr: lines(french) };
}

function list(value: JsonValue | undefined): JsonValue {
  return value ?? [];
}

function stringValue(value: JsonValue | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  return value;
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
```

`cms/schema/src/index.ts`:

```ts
export * from './mapping.ts';
export * from './operations.ts';
export * from './records.ts';
```

`cms/schema/src/testing/records.ts`:

```ts
import type { PublicationContent } from '@portfolio/content';

import { toWorkingRecords } from '../mapping.ts';
import type { WorkingRecords } from '../mapping.ts';

export function storedRecordsOf(content: PublicationContent): WorkingRecords {
  const records = toWorkingRecords(content);
  return {
    profile: { id: 1, ...records.profile },
    capabilities: records.capabilities.map((record, index) => ({ id: `c${index}`, ...record })),
    skills: records.skills.map((record, index) => ({ id: `s${index}`, ...record })),
    experiences: records.experiences.map((record, index) => ({ id: `e${index}`, ...record })),
    projects: records.projects.map((record, index) => ({ id: `p${index}`, ...record })),
    keyFigures: records.keyFigures.map((record, index) => ({ id: `k${index}`, ...record })),
    answers: records.answers.map((record, index) => ({ id: `a${index}`, ...record })),
    chatSettings: { id: 1, ...records.chatSettings },
    siteSettings: { id: 1, ...records.siteSettings },
  };
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter @portfolio/cms-schema test && pnpm --filter @portfolio/cms-schema typecheck`
Expected: PASS (8 tests), no type error.

- [ ] **Step 7: Commit**

```bash
git add cms/schema pnpm-lock.yaml
git commit -m "feat(cms): map working records to publication content"
```

---

### Task 5: Local Directus stack and provisioned schema

**Files:**

- Create: `compose.yaml`, `.env.example`, `scripts/ci/write-env.sh`
- Create: `cms/provision/package.json`, `cms/provision/tsconfig.json`, `cms/provision/src/environment.ts`, `cms/provision/src/directus-client.ts`, `cms/provision/src/main.ts`, `cms/provision/src/schema/fields.ts`, `cms/provision/src/schema/collections.ts`, `cms/provision/src/schema/relations.ts`, `cms/provision/src/schema/ensure-schema.ts`
- Create: `cms/tests/package.json`, `cms/tests/tsconfig.json`, `cms/tests/vitest.config.ts`, `cms/tests/src/support/environment.ts`, `cms/tests/src/support/clients.ts`, `cms/tests/src/support/errors.ts`, `cms/tests/src/support/fixtures.ts`
- Modify: `package.json` (scripts)
- Test: `cms/provision/src/environment.test.ts`, `cms/provision/src/schema/definitions.test.ts`, `cms/tests/src/schema.test.ts`

**Interfaces:**

- Consumes: `PortfolioSchema` (Task 4), `iconNames` (Task 2).
- Produces:
  - `readProvisionEnvironment(source): ProvisionEnvironment` with `owner: { email, password, token, roleId, enforceTfa }`, `assistant: { email, password, token, roleId, appAccess }`, `mcpOAuth`, `seedInitialContent`
  - `createAdminClient(url, token): AdminClient`, `type Log`
  - `portfolioCollections: CollectionDefinition[]`, `portfolioRelations: RelationDefinition[]`, `ensureSchema(client, collections, relations, log)`
  - Test support: `adminClient`, `ownerClient`, `assistantClient`, `anonymousClient`, `testEnvironment`, `captureErrorCode(request)`, `uniqueSuffix()`
  - Root scripts `cms:up`, `cms:down`, `cms:logs`, `provision`, `test:cms`

- [ ] **Step 1: Create the local stack files**

`compose.yaml`:

```yaml
name: portfolio

services:
  database:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: directus
      POSTGRES_USER: directus
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
    volumes:
      - database:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U directus -d directus']
      interval: 5s
      timeout: 5s
      retries: 20

  directus:
    image: directus/directus:12.5.0
    depends_on:
      database:
        condition: service_healthy
    ports:
      - '8065:8055'
    volumes:
      - uploads:/directus/uploads
    environment:
      SECRET: ${DIRECTUS_SECRET:?DIRECTUS_SECRET is required}
      PUBLIC_URL: ${DIRECTUS_PUBLIC_URL:?DIRECTUS_PUBLIC_URL is required}
      DB_CLIENT: pg
      DB_HOST: database
      DB_PORT: '5432'
      DB_DATABASE: directus
      DB_USER: directus
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      ADMIN_EMAIL: ${ADMIN_EMAIL}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
      ADMIN_TOKEN: ${ADMIN_TOKEN}
      CACHE_ENABLED: 'false'
      WEBSOCKETS_ENABLED: 'false'
      EXTENSIONS_AUTO_RELOAD: 'true'
      MCP_OAUTH_ENABLED: ${MCP_OAUTH_ENABLED:-false}
      MCP_OAUTH_CIMD_ENABLED: ${MCP_OAUTH_CIMD_ENABLED:-false}
      MCP_OAUTH_DCR_ENABLED: ${MCP_OAUTH_DCR_ENABLED:-false}
      MCP_OAUTH_CIMD_ALLOW_HTTP: ${MCP_OAUTH_CIMD_ALLOW_HTTP:-false}
    healthcheck:
      test: ['CMD-SHELL', 'wget -qO- http://127.0.0.1:8055/server/ping || exit 1']
      interval: 10s
      timeout: 5s
      retries: 30
      start_period: 20s

volumes:
  database:
  uploads:
```

`.env.example`:

```dotenv
# Local development only. Copy to .env and replace every "change-me" value,
# or run scripts/ci/write-env.sh to generate random ones.
POSTGRES_PASSWORD=change-me-postgres
DIRECTUS_SECRET=change-me-directus-secret
DIRECTUS_URL=http://localhost:8065
DIRECTUS_PUBLIC_URL=http://localhost:8065

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me-admin
ADMIN_TOKEN=change-me-admin-token

OWNER_EMAIL=owner@example.com
OWNER_PASSWORD=change-me-owner
OWNER_TOKEN=change-me-owner-token
OWNER_ROLE_ID=e08bff2a-a3d6-43cf-8ce9-4e99c103056d
OWNER_ENFORCE_TFA=false

AI_EMAIL=assistant@example.com
AI_PASSWORD=change-me-assistant
AI_TOKEN=change-me-assistant-token
AI_ROLE_ID=b73bb2c5-d64d-4db6-80bc-5cf2767eb329
AI_APP_ACCESS=false

SEED_INITIAL_CONTENT=true

MCP_OAUTH_ENABLED=false
MCP_OAUTH_CIMD_ENABLED=false
MCP_OAUTH_DCR_ENABLED=false
MCP_OAUTH_CIMD_ALLOW_HTTP=false
```

`scripts/ci/write-env.sh` (then `chmod +x scripts/ci/write-env.sh`):

```bash
#!/usr/bin/env bash
# Writes the repository .env: .env.example with every "change-me" value replaced by a random
# secret. Used by CI and for a disposable local stack.
# Usage: scripts/ci/write-env.sh [output-file]
set -euo pipefail

cd "$(dirname "$0")/../.."
readonly OUTPUT="${1:-.env}"

if [[ -e "$OUTPUT" ]]; then
  echo "$OUTPUT already exists: nothing is overwritten." >&2
  exit 1
fi

umask 077
while IFS= read -r line; do
  if [[ "$line" =~ ^([A-Z_]+)=change-me ]]; then
    echo "${BASH_REMATCH[1]}=$(openssl rand -hex 32)"
  else
    echo "$line"
  fi
done < .env.example > "$OUTPUT"

echo "$OUTPUT written from .env.example."
```

Add to the `scripts` of the root `package.json`:

```json
    "cms:up": "docker compose up -d --wait",
    "cms:down": "docker compose down",
    "cms:logs": "docker compose logs -f directus",
    "provision": "pnpm --filter @portfolio/cms-provision start",
    "test:cms": "pnpm --filter @portfolio/cms-tests test",
```

- [ ] **Step 2: Create the provisioning package and its environment**

`cms/provision/package.json`:

```json
{
  "name": "@portfolio/cms-provision",
  "private": true,
  "type": "module",
  "exports": {
    "./access": "./src/access/policies.ts",
    "./seed": "./src/seed/initial-content.ts"
  },
  "scripts": {
    "start": "node --env-file=../../.env src/main.ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@directus/sdk": "27.0.0",
    "@portfolio/cms-schema": "workspace:*",
    "@portfolio/content": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^24.19.2",
    "typescript": "~6.0.3",
    "vite": "^8.1.2",
    "vitest": "^5.0.3"
  }
}
```

`cms/provision/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

`cms/provision/src/environment.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { readProvisionEnvironment } from './environment.ts';

const requiredSource = {
  DIRECTUS_URL: 'http://localhost:8065',
  ADMIN_TOKEN: 'admin-token',
  OWNER_EMAIL: 'owner@example.com',
  OWNER_PASSWORD: 'owner-password',
  OWNER_ROLE_ID: 'owner-role',
  AI_EMAIL: 'assistant@example.com',
  AI_PASSWORD: 'assistant-password',
  AI_ROLE_ID: 'assistant-role',
};

describe('readProvisionEnvironment', () => {
  it('reads the accounts and treats absent flags as false', () => {
    const environment = readProvisionEnvironment(requiredSource);

    expect(environment.owner).toEqual({
      email: 'owner@example.com',
      password: 'owner-password',
      token: null,
      roleId: 'owner-role',
      enforceTfa: false,
    });
    expect(environment.assistant.appAccess).toBe(false);
    expect(environment.seedInitialContent).toBe(false);
    expect(environment.mcpOAuth).toEqual({ enabled: false, cimdEnabled: false, dcrEnabled: false });
  });

  it('reads flags set to true', () => {
    const environment = readProvisionEnvironment({
      ...requiredSource,
      OWNER_ENFORCE_TFA: 'true',
      SEED_INITIAL_CONTENT: 'true',
      MCP_OAUTH_ENABLED: 'true',
    });

    expect(environment.owner.enforceTfa).toBe(true);
    expect(environment.seedInitialContent).toBe(true);
    expect(environment.mcpOAuth.enabled).toBe(true);
  });

  it('treats a blank token as absent', () => {
    expect(readProvisionEnvironment({ ...requiredSource, AI_TOKEN: '  ' }).assistant.token).toBe(
      null
    );
  });

  it('names a missing required variable', () => {
    expect(() => readProvisionEnvironment({ ...requiredSource, OWNER_ROLE_ID: '' })).toThrow(
      'OWNER_ROLE_ID'
    );
  });
});
```

`cms/provision/src/environment.ts`:

```ts
export type AccountEnvironment = {
  email: string;
  password: string;
  token: string | null;
  roleId: string;
};

export type ProvisionEnvironment = {
  directusUrl: string;
  adminToken: string;
  owner: AccountEnvironment & { enforceTfa: boolean };
  assistant: AccountEnvironment & { appAccess: boolean };
  mcpOAuth: { enabled: boolean; cimdEnabled: boolean; dcrEnabled: boolean };
  seedInitialContent: boolean;
};

type EnvironmentSource = Record<string, string | undefined>;

export function readProvisionEnvironment(source: EnvironmentSource): ProvisionEnvironment {
  return {
    directusUrl: requireValue(source, 'DIRECTUS_URL'),
    adminToken: requireValue(source, 'ADMIN_TOKEN'),
    owner: {
      ...readAccount(source, 'OWNER'),
      enforceTfa: readFlag(source, 'OWNER_ENFORCE_TFA'),
    },
    assistant: {
      ...readAccount(source, 'AI'),
      appAccess: readFlag(source, 'AI_APP_ACCESS'),
    },
    mcpOAuth: {
      enabled: readFlag(source, 'MCP_OAUTH_ENABLED'),
      cimdEnabled: readFlag(source, 'MCP_OAUTH_CIMD_ENABLED'),
      dcrEnabled: readFlag(source, 'MCP_OAUTH_DCR_ENABLED'),
    },
    seedInitialContent: readFlag(source, 'SEED_INITIAL_CONTENT'),
  };
}

function readAccount(source: EnvironmentSource, prefix: string): AccountEnvironment {
  return {
    email: requireValue(source, `${prefix}_EMAIL`),
    password: requireValue(source, `${prefix}_PASSWORD`),
    token: optionalValue(source, `${prefix}_TOKEN`),
    roleId: requireValue(source, `${prefix}_ROLE_ID`),
  };
}

function requireValue(source: EnvironmentSource, name: string): string {
  const value = optionalValue(source, name);
  if (value === null) {
    throw new Error(`The environment variable ${name} is required.`);
  }
  return value;
}

function optionalValue(source: EnvironmentSource, name: string): string | null {
  const value = source[name];
  if (value === undefined || value.trim() === '') {
    return null;
  }
  return value;
}

function readFlag(source: EnvironmentSource, name: string): boolean {
  return source[name] === 'true';
}
```

`cms/provision/src/directus-client.ts`:

```ts
import { createDirectus, rest, staticToken } from '@directus/sdk';
import type { PortfolioSchema } from '@portfolio/cms-schema';

export type Log = (message: string) => void;

export function createAdminClient(url: string, token: string) {
  return createDirectus<PortfolioSchema>(url).with(staticToken(token)).with(rest());
}

export type AdminClient = ReturnType<typeof createAdminClient>;

export function createSystemAdminClient(url: string, token: string) {
  return createDirectus(url).with(staticToken(token)).with(rest());
}

export type SystemAdminClient = ReturnType<typeof createSystemAdminClient>;
```

Run: `pnpm install && pnpm --filter @portfolio/cms-provision test`
Expected: PASS (4 tests).

- [ ] **Step 3: Write the field helpers**

`cms/provision/src/schema/fields.ts`:

```ts
import type { DirectusField, NestedPartial } from '@directus/sdk';
import type { PortfolioSchema } from '@portfolio/cms-schema';

export type FieldDefinition = NestedPartial<DirectusField<PortfolioSchema>> & { field: string };

export type FieldLabel = {
  label: string;
  note?: string;
  required?: boolean;
  unique?: boolean;
  readonly?: boolean;
  hidden?: boolean;
  width?: 'half' | 'full';
};

export type Choice = { text: string; value: string };

export type RepeaterSubfield = {
  field: string;
  name: string;
  interface: 'input' | 'input-multiline';
  width: 'half' | 'full';
};

type LocalizedKind = 'string' | 'text' | 'markdown';

function fieldMeta(options: FieldLabel) {
  return {
    translations: [{ language: 'en-US', translation: options.label }],
    note: options.note ?? null,
    required: options.required ?? false,
    readonly: options.readonly ?? false,
    hidden: options.hidden ?? false,
    width: options.width ?? 'full',
  };
}

function columnSchema(options: FieldLabel) {
  const required = options.required ?? false;
  return {
    is_nullable: !required,
    is_unique: options.unique ?? false,
  };
}

export function uuidPrimaryKey(): FieldDefinition {
  return {
    field: 'id',
    type: 'uuid',
    meta: { special: ['uuid'], interface: 'input', readonly: true, hidden: true },
    schema: { is_primary_key: true, is_nullable: false },
  };
}

export function integerPrimaryKey(): FieldDefinition {
  return {
    field: 'id',
    type: 'integer',
    meta: { interface: 'input', readonly: true, hidden: true },
    schema: { is_primary_key: true, has_auto_increment: true, is_nullable: false },
  };
}

export function sortField(): FieldDefinition {
  return {
    field: 'sort',
    type: 'integer',
    meta: { interface: 'input', hidden: true },
    schema: { is_nullable: true },
  };
}

export function slugField(): FieldDefinition {
  const options: FieldLabel = {
    label: 'Slug',
    note: 'Lowercase letters, digits and hyphens. Other items refer to this item by its slug.',
    required: true,
    unique: true,
    width: 'half',
  };
  return {
    field: 'slug',
    type: 'string',
    meta: { ...fieldMeta(options), interface: 'input', options: { slug: true, trim: true } },
    schema: columnSchema(options),
  };
}

export function stringField(field: string, options: FieldLabel): FieldDefinition {
  return {
    field,
    type: 'string',
    meta: { ...fieldMeta(options), interface: 'input' },
    schema: columnSchema(options),
  };
}

export function urlField(field: string, options: FieldLabel): FieldDefinition {
  return {
    field,
    type: 'text',
    meta: { ...fieldMeta(options), interface: 'input', options: { placeholder: 'https://' } },
    schema: columnSchema(options),
  };
}

export function textField(field: string, options: FieldLabel): FieldDefinition {
  return {
    field,
    type: 'text',
    meta: { ...fieldMeta(options), interface: 'input-multiline' },
    schema: columnSchema(options),
  };
}

export function markdownField(field: string, options: FieldLabel): FieldDefinition {
  return {
    field,
    type: 'text',
    meta: { ...fieldMeta(options), interface: 'input-rich-text-md' },
    schema: columnSchema(options),
  };
}

export function integerField(field: string, options: FieldLabel): FieldDefinition {
  return {
    field,
    type: 'integer',
    meta: { ...fieldMeta(options), interface: 'input' },
    schema: columnSchema(options),
  };
}

export function booleanField(
  field: string,
  options: FieldLabel,
  defaultValue: boolean
): FieldDefinition {
  return {
    field,
    type: 'boolean',
    meta: { ...fieldMeta(options), interface: 'boolean', special: ['cast-boolean'] },
    schema: { ...columnSchema(options), is_nullable: false, default_value: defaultValue },
  };
}

export function choiceField(
  field: string,
  options: FieldLabel,
  choices: Choice[],
  defaultValue: string | null
): FieldDefinition {
  return {
    field,
    type: 'string',
    meta: {
      ...fieldMeta(options),
      interface: 'select-dropdown',
      options: { choices },
      display: 'labels',
      display_options: { choices },
    },
    schema: { ...columnSchema(options), default_value: defaultValue },
  };
}

export function imageField(field: string, options: FieldLabel): FieldDefinition {
  return {
    field,
    type: 'uuid',
    meta: { ...fieldMeta(options), special: ['file'], interface: 'file-image', display: 'image' },
    schema: columnSchema(options),
  };
}

export function timestampField(field: string, options: FieldLabel): FieldDefinition {
  return {
    field,
    type: 'timestamp',
    meta: { ...fieldMeta(options), interface: 'datetime', display: 'datetime' },
    schema: columnSchema(options),
  };
}

export function slugListField(field: string, options: FieldLabel): FieldDefinition {
  return {
    field,
    type: 'json',
    meta: {
      ...fieldMeta(options),
      special: ['cast-json'],
      interface: 'tags',
      options: { whitespace: '-', capitalization: 'lowercase', alphabetize: false },
      display: 'labels',
    },
    schema: { is_nullable: true },
  };
}

export function jsonCodeField(field: string, options: FieldLabel): FieldDefinition {
  return {
    field,
    type: 'json',
    meta: {
      ...fieldMeta(options),
      special: ['cast-json'],
      interface: 'input-code',
      options: { language: 'JSON', lineNumber: true },
    },
    schema: { is_nullable: true },
  };
}

export function repeaterField(
  field: string,
  options: FieldLabel,
  template: string,
  subfields: RepeaterSubfield[]
): FieldDefinition {
  return {
    field,
    type: 'json',
    meta: {
      ...fieldMeta(options),
      special: ['cast-json'],
      interface: 'list',
      options: {
        template,
        fields: subfields.map((subfield) => ({
          field: subfield.field,
          name: subfield.name,
          type: 'text',
          meta: {
            field: subfield.field,
            type: 'text',
            interface: subfield.interface,
            width: subfield.width,
          },
        })),
      },
    },
    schema: { is_nullable: true },
  };
}

export function localizedFields(
  field: string,
  options: FieldLabel,
  kind: LocalizedKind
): FieldDefinition[] {
  const build = localizedBuilders[kind];
  return [
    build(`${field}_en`, { ...options, label: `${options.label} (EN)`, width: 'half' }),
    build(`${field}_fr`, { ...options, label: `${options.label} (FR)`, width: 'half' }),
  ];
}

const localizedBuilders: Record<
  LocalizedKind,
  (field: string, options: FieldLabel) => FieldDefinition
> = {
  string: stringField,
  text: textField,
  markdown: markdownField,
};

export function dateCreatedField(): FieldDefinition {
  return {
    field: 'date_created',
    type: 'timestamp',
    meta: {
      ...fieldMeta({ label: 'Created on', readonly: true, width: 'half' }),
      special: ['date-created'],
      interface: 'datetime',
      display: 'datetime',
    },
    schema: { is_nullable: true },
  };
}

export function userCreatedField(): FieldDefinition {
  return {
    field: 'user_created',
    type: 'uuid',
    meta: {
      ...fieldMeta({ label: 'Created by', readonly: true, width: 'half' }),
      special: ['user-created'],
      interface: 'select-dropdown-m2o',
      options: { template: '{{first_name}}' },
      display: 'user',
    },
    schema: { is_nullable: true },
  };
}
```

- [ ] **Step 4: Write the failing definition tests**

`cms/provision/src/schema/definitions.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { portfolioCollections } from './collections.ts';
import { portfolioRelations } from './relations.ts';

const collectionNames = new Set<string>(
  portfolioCollections.map((definition) => definition.collection)
);

function fieldsOf(collection: string): string[] {
  const definition = portfolioCollections.find((candidate) => candidate.collection === collection);
  if (definition === undefined) {
    throw new Error(`Collection ${collection} is not declared`);
  }
  return definition.fields.map((field) => field.field);
}

describe('portfolio collections', () => {
  it('stays within the 25 collections allowed by Directus Core', () => {
    expect(portfolioCollections.length).toBeLessThanOrEqual(25);
  });

  it('gives every collection an id primary key', () => {
    const withoutId = portfolioCollections.filter(
      (definition) =>
        !definition.fields.some(
          (field) => field.field === 'id' && field.schema?.is_primary_key === true
        )
    );

    expect(withoutId).toEqual([]);
  });

  it('pairs every English field with a French one', () => {
    const unpaired = portfolioCollections.flatMap((definition) => {
      const fields = new Set(definition.fields.map((field) => field.field));
      return [...fields]
        .filter((field) => field.endsWith('_en') || field.endsWith('_fr'))
        .filter((field) => !fields.has(`${field.slice(0, -3)}_${otherLanguage(field)}`))
        .map((field) => `${definition.collection}.${field}`);
    });

    expect(unpaired).toEqual([]);
  });

  it('gives every item collection a unique slug', () => {
    const itemCollections = portfolioCollections.filter(
      (definition) => !definition.singleton && definition.collection !== 'publications'
    );
    const withoutUniqueSlug = itemCollections.filter(
      (definition) =>
        !definition.fields.some(
          (field) => field.field === 'slug' && field.schema?.is_unique === true
        )
    );

    expect(itemCollections.length).toBe(6);
    expect(withoutUniqueSlug).toEqual([]);
  });
});

describe('portfolio relations', () => {
  it('only links declared fields to declared or system collections', () => {
    const invalid = portfolioRelations.filter((relation) => {
      const sourceIsDeclared = fieldsOf(relation.collection).includes(relation.field);
      const target = relation.related_collection ?? '';
      const targetIsKnown = collectionNames.has(target) || target.startsWith('directus_');
      return !sourceIsDeclared || !targetIsKnown;
    });

    expect(invalid).toEqual([]);
  });
});

function otherLanguage(field: string): string {
  if (field.endsWith('_en')) {
    return 'fr';
  }
  return 'en';
}
```

Run: `pnpm --filter @portfolio/cms-provision test`
Expected: FAIL, `Cannot find module './collections.ts'`.

- [ ] **Step 5: Declare the collections and relations**

`cms/provision/src/schema/collections.ts`:

```ts
import type { PortfolioSchema } from '@portfolio/cms-schema';
import { iconNames } from '@portfolio/content';

import {
  booleanField,
  choiceField,
  dateCreatedField,
  imageField,
  integerField,
  integerPrimaryKey,
  jsonCodeField,
  localizedFields,
  markdownField,
  repeaterField,
  slugField,
  slugListField,
  sortField,
  stringField,
  timestampField,
  urlField,
  userCreatedField,
  uuidPrimaryKey,
} from './fields.ts';
import type { Choice, FieldDefinition } from './fields.ts';

export type CollectionDefinition = {
  collection: keyof PortfolioSchema;
  label: { singular: string; plural: string };
  icon: string;
  note: string;
  singleton: boolean;
  hidden: boolean;
  sortField: string | null;
  displayTemplate: string | null;
  fields: FieldDefinition[];
};

const iconChoices: Choice[] = iconNames.map((name) => ({ text: name, value: name }));

const kindChoices: Choice[] = [
  { text: 'Professional', value: 'professional' },
  { text: 'Personal', value: 'personal' },
];

const statusChoices: Choice[] = [
  { text: 'Prepared', value: 'prepared' },
  { text: 'Active', value: 'active' },
  { text: 'Superseded', value: 'superseded' },
  { text: 'Discarded', value: 'discarded' },
];

const ONE_PER_LINE = 'One per line.';
const BLOCKS_NOTE =
  'JSON list of blocks shown with the answer. Types: timeline, experience, project, skills, key-figures, strengths, contact, cv. Example: [{"type":"project","slug":"visa-insight"}]';

function itemFields(): FieldDefinition[] {
  return [uuidPrimaryKey(), sortField(), slugField()];
}

function itemCollection(
  collection: keyof PortfolioSchema,
  label: { singular: string; plural: string },
  icon: string,
  note: string,
  displayTemplate: string,
  fields: FieldDefinition[]
): CollectionDefinition {
  return {
    collection,
    label,
    icon,
    note,
    singleton: false,
    hidden: false,
    sortField: 'sort',
    displayTemplate,
    fields: [...itemFields(), ...fields],
  };
}

function singletonCollection(
  collection: keyof PortfolioSchema,
  label: string,
  icon: string,
  note: string,
  fields: FieldDefinition[]
): CollectionDefinition {
  return {
    collection,
    label: { singular: label, plural: label },
    icon,
    note,
    singleton: true,
    hidden: false,
    sortField: null,
    displayTemplate: null,
    fields: [integerPrimaryKey(), ...fields],
  };
}

export const portfolioCollections: CollectionDefinition[] = [
  singletonCollection(
    'profile',
    'Profile',
    'person',
    'Identity shown on the welcome screen and used by the chat.',
    [
      stringField('name', { label: 'Name' }),
      ...localizedFields('headline', { label: 'Headline' }, 'string'),
      ...localizedFields('introduction', { label: 'Introduction' }, 'text'),
      ...localizedFields('location', { label: 'Location' }, 'string'),
      ...localizedFields('availability', { label: 'Availability' }, 'string'),
      ...localizedFields('work_authorization', { label: 'Work authorization' }, 'string'),
      ...localizedFields('languages', { label: 'Languages' }, 'string'),
      stringField('email', { label: 'Email', width: 'half' }),
      urlField('linkedin_url', { label: 'LinkedIn', width: 'half' }),
      urlField('github_url', { label: 'GitHub', width: 'half' }),
      imageField('photo', { label: 'Photo' }),
      ...localizedFields('photo_alt', { label: 'Photo alt text' }, 'string'),
      ...localizedFields('disclosure', { label: 'AI disclosure' }, 'text'),
    ]
  ),
  itemCollection(
    'capabilities',
    { singular: 'Capability', plural: 'Capabilities' },
    'category',
    'Skill areas shown on the skills map.',
    '{{title_en}}',
    [
      choiceField('icon', { label: 'Icon', required: true, width: 'half' }, iconChoices, 'cloud'),
      ...localizedFields('title', { label: 'Title' }, 'string'),
      ...localizedFields('description', { label: 'Description' }, 'text'),
    ]
  ),
  itemCollection(
    'skills',
    { singular: 'Skill', plural: 'Skills' },
    'psychology',
    'Technologies and practices, grouped by capability.',
    '{{name}}',
    [
      stringField('name', { label: 'Name', required: true, width: 'half' }),
      stringField('capability_slug', { label: 'Capability slug', width: 'half' }),
      booleanField('featured', { label: 'Featured', width: 'half' }, false),
    ]
  ),
  itemCollection(
    'experiences',
    { singular: 'Experience', plural: 'Experiences' },
    'work',
    'Professional experience, most recent first.',
    '{{company}}',
    [
      stringField('company', { label: 'Company', width: 'half' }),
      ...localizedFields('role', { label: 'Role' }, 'string'),
      stringField('start_month', { label: 'Start month', note: 'YYYY-MM', width: 'half' }),
      stringField('end_month', {
        label: 'End month',
        note: 'YYYY-MM, empty while current',
        width: 'half',
      }),
      stringField('location', { label: 'Location', width: 'half' }),
      ...localizedFields('summary', { label: 'Summary' }, 'text'),
      ...localizedFields('highlights', { label: 'Highlights', note: ONE_PER_LINE }, 'text'),
      slugListField('skill_slugs', { label: 'Skill slugs' }),
    ]
  ),
  itemCollection(
    'projects',
    { singular: 'Project', plural: 'Projects' },
    'rocket_launch',
    'Professional case studies and personal projects.',
    '{{title_en}}',
    [
      choiceField(
        'kind',
        { label: 'Kind', required: true, width: 'half' },
        kindChoices,
        'professional'
      ),
      choiceField('icon', { label: 'Icon', width: 'half' }, iconChoices, null),
      ...localizedFields('title', { label: 'Title' }, 'string'),
      stringField('company', { label: 'Company', width: 'half' }),
      ...localizedFields('role', { label: 'Role' }, 'string'),
      integerField('start_year', { label: 'Start year', width: 'half' }),
      integerField('end_year', { label: 'End year', note: 'Empty while ongoing', width: 'half' }),
      ...localizedFields('summary', { label: 'Summary' }, 'text'),
      ...localizedFields('case_study', { label: 'Case study' }, 'markdown'),
      slugListField('skill_slugs', { label: 'Skill slugs' }),
    ]
  ),
  itemCollection(
    'key_figures',
    { singular: 'Key figure', plural: 'Key figures' },
    'monitoring',
    'Figures highlighted on the stage.',
    '{{value}} {{label_en}}',
    [
      stringField('value', { label: 'Value', width: 'half' }),
      ...localizedFields('label', { label: 'Label' }, 'string'),
    ]
  ),
  itemCollection(
    'answers',
    { singular: 'Answer', plural: 'Answers' },
    'forum',
    'Interview answers used by the chat, with the facts and blocks that support them.',
    '{{topic_en}}',
    [
      ...localizedFields('topic', { label: 'Topic' }, 'string'),
      ...localizedFields(
        'sample_questions',
        { label: 'Sample questions', note: ONE_PER_LINE },
        'text'
      ),
      ...localizedFields('text', { label: 'Answer' }, 'text'),
      slugListField('experience_slugs', { label: 'Experience slugs', width: 'half' }),
      slugListField('project_slugs', { label: 'Project slugs', width: 'half' }),
      slugListField('skill_slugs', { label: 'Skill slugs', width: 'half' }),
      slugListField('key_figure_slugs', { label: 'Key figure slugs', width: 'half' }),
      jsonCodeField('blocks', { label: 'Blocks', note: BLOCKS_NOTE }),
      booleanField('starter', { label: 'Starter question', width: 'half' }, false),
    ]
  ),
  singletonCollection(
    'chat_settings',
    'Chat settings',
    'smart_toy',
    'Fallback replies, sensitive topics and suggested topics of the chat.',
    [
      ...localizedFields('unknown_reply', { label: 'Unknown question reply' }, 'text'),
      ...localizedFields('refusal_reply', { label: 'Refusal reply' }, 'text'),
      repeaterField('sensitive_topics', { label: 'Sensitive topics' }, '{{slug}}', [
        { field: 'slug', name: 'Slug', interface: 'input', width: 'full' },
        {
          field: 'keywords_en',
          name: 'Keywords (EN), one per line',
          interface: 'input-multiline',
          width: 'half',
        },
        {
          field: 'keywords_fr',
          name: 'Keywords (FR), one per line',
          interface: 'input-multiline',
          width: 'half',
        },
        { field: 'reply_en', name: 'Reply (EN)', interface: 'input-multiline', width: 'half' },
        { field: 'reply_fr', name: 'Reply (FR)', interface: 'input-multiline', width: 'half' },
      ]),
      ...localizedFields(
        'suggested_topics',
        { label: 'Suggested topics', note: ONE_PER_LINE },
        'text'
      ),
    ]
  ),
  singletonCollection(
    'site_settings',
    'Site settings',
    'tune',
    'Search engine title and description.',
    [
      ...localizedFields('title', { label: 'Title' }, 'string'),
      ...localizedFields('description', { label: 'Description' }, 'text'),
    ]
  ),
  {
    collection: 'publications',
    label: { singular: 'Publication', plural: 'Publications' },
    icon: 'history',
    note: 'Snapshots of the content. Prepare one from this list, review its changes, then Publish it. Publishing a superseded one rolls back.',
    singleton: false,
    hidden: false,
    sortField: null,
    displayTemplate: '{{status}} · {{date_created}}',
    fields: [
      uuidPrimaryKey(),
      choiceField(
        'status',
        { label: 'Status', required: true, readonly: true, width: 'half' },
        statusChoices,
        'prepared'
      ),
      timestampField('activated_at', { label: 'Activated on', readonly: true, width: 'half' }),
      markdownField('changes_overview', { label: 'Changes', readonly: true }),
      jsonCodeField('content', { label: 'Content', readonly: true }),
      jsonCodeField('changes', { label: 'Change details', readonly: true, hidden: true }),
      dateCreatedField(),
      userCreatedField(),
    ],
  },
];
```

`cms/provision/src/schema/relations.ts`:

```ts
import type { DirectusRelation, NestedPartial } from '@directus/sdk';
import type { PortfolioSchema } from '@portfolio/cms-schema';

export type RelationDefinition = NestedPartial<DirectusRelation<PortfolioSchema>> & {
  collection: string;
  field: string;
};

type DeleteAction = 'CASCADE' | 'SET NULL' | 'RESTRICT';

function manyToOne(
  collection: string,
  field: string,
  relatedCollection: string,
  onDelete: DeleteAction
): RelationDefinition {
  return {
    collection,
    field,
    related_collection: relatedCollection,
    meta: { one_field: null, sort_field: null, one_deselect_action: 'nullify' },
    schema: { on_delete: onDelete },
  };
}

export const portfolioRelations: RelationDefinition[] = [
  manyToOne('profile', 'photo', 'directus_files', 'SET NULL'),
  manyToOne('publications', 'user_created', 'directus_users', 'SET NULL'),
];
```

Run: `pnpm --filter @portfolio/cms-provision test`
Expected: PASS (9 tests).

- [ ] **Step 6: Apply the schema idempotently**

`cms/provision/src/schema/ensure-schema.ts`:

```ts
import {
  createCollection,
  createField,
  createRelation,
  readCollections,
  readFieldsByCollection,
  readRelations,
} from '@directus/sdk';

import type { AdminClient, Log } from '../directus-client.ts';
import type { CollectionDefinition } from './collections.ts';
import type { RelationDefinition } from './relations.ts';

export async function ensureSchema(
  client: AdminClient,
  collections: CollectionDefinition[],
  relations: RelationDefinition[],
  log: Log
): Promise<void> {
  const existingCollections = await client.request(readCollections());
  const existingCollectionNames = new Set(
    existingCollections.map((collection) => collection.collection)
  );
  for (const definition of collections) {
    await ensureCollection(
      client,
      definition,
      existingCollectionNames.has(definition.collection),
      log
    );
  }

  const existingRelations = await client.request(readRelations());
  const existingRelationKeys = new Set(
    existingRelations.map((relation) => relationKey(relation.collection, relation.field))
  );
  for (const definition of relations) {
    await ensureRelation(
      client,
      definition,
      existingRelationKeys.has(relationKey(definition.collection, definition.field)),
      log
    );
  }
}

async function ensureCollection(
  client: AdminClient,
  definition: CollectionDefinition,
  exists: boolean,
  log: Log
): Promise<void> {
  if (!exists) {
    await client.request(createCollection(toCollectionPayload(definition)));
    log(`Collection created: ${definition.collection}`);
    return;
  }
  await ensureMissingFields(client, definition, log);
}

async function ensureMissingFields(
  client: AdminClient,
  definition: CollectionDefinition,
  log: Log
): Promise<void> {
  const existingFields = await client.request(readFieldsByCollection(definition.collection));
  const existingFieldNames = new Set(existingFields.map((field) => field.field));
  const missingFields = definition.fields.filter((field) => !existingFieldNames.has(field.field));
  for (const field of missingFields) {
    await client.request(createField(definition.collection, field));
    log(`Field created: ${definition.collection}.${field.field}`);
  }
}

async function ensureRelation(
  client: AdminClient,
  definition: RelationDefinition,
  exists: boolean,
  log: Log
): Promise<void> {
  if (exists) {
    return;
  }
  await client.request(createRelation(definition));
  log(`Relation created: ${definition.collection}.${definition.field}`);
}

function relationKey(collection: string, field: string): string {
  return `${collection}.${field}`;
}

function toCollectionPayload(definition: CollectionDefinition) {
  return {
    collection: definition.collection,
    meta: {
      icon: definition.icon,
      note: definition.note,
      singleton: definition.singleton,
      hidden: definition.hidden,
      sort_field: definition.sortField,
      display_template: definition.displayTemplate,
      accountability: 'all',
      translations: [
        {
          language: 'en-US',
          translation: definition.label.plural,
          singular: definition.label.singular,
          plural: definition.label.plural,
        },
      ],
    },
    schema: {},
    fields: definition.fields,
  };
}
```

`cms/provision/src/main.ts`:

```ts
import { isDirectusError } from '@directus/sdk';

import { createAdminClient } from './directus-client.ts';
import { readProvisionEnvironment } from './environment.ts';
import { portfolioCollections } from './schema/collections.ts';
import { ensureSchema } from './schema/ensure-schema.ts';
import { portfolioRelations } from './schema/relations.ts';

function log(message: string): void {
  console.log(message);
}

async function provision(): Promise<void> {
  const environment = readProvisionEnvironment(process.env);
  const client = createAdminClient(environment.directusUrl, environment.adminToken);

  await ensureSchema(client, portfolioCollections, portfolioRelations, log);
  log('Provisioning complete.');
}

function describeFailure(error: unknown): string {
  if (isDirectusError(error)) {
    return error.errors.map((detail) => `${detail.extensions.code}: ${detail.message}`).join('\n');
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

try {
  await provision();
} catch (error) {
  console.error(`Provisioning failed:\n${describeFailure(error)}`);
  process.exitCode = 1;
}
```

- [ ] **Step 7: Create the integration test package**

`cms/tests/package.json`:

```json
{
  "name": "@portfolio/cms-tests",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@directus/sdk": "27.0.0",
    "@portfolio/cms-provision": "workspace:*",
    "@portfolio/cms-schema": "workspace:*",
    "@portfolio/content": "workspace:*",
    "@types/node": "^24.19.2",
    "typescript": "~6.0.3",
    "vite": "^8.1.2",
    "vitest": "^5.0.3",
    "zod": "^4.6.5"
  }
}
```

`cms/tests/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src", "vitest.config.ts"]
}
```

`cms/tests/vitest.config.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

import { defineConfig } from 'vitest/config';

const environmentFile = fileURLToPath(new URL('../../.env', import.meta.url));

if (!existsSync(environmentFile)) {
  throw new Error('No .env file: copy .env.example to .env at the repository root.');
}

export default defineConfig({
  test: {
    env: parseEnv(readFileSync(environmentFile, 'utf8')),
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
```

`cms/tests/src/support/environment.ts`:

```ts
export function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`The variable ${name} is missing from .env.`);
  }
  return value;
}

export const testEnvironment = {
  directusUrl: requireEnvironment('DIRECTUS_URL'),
  adminToken: requireEnvironment('ADMIN_TOKEN'),
  ownerToken: requireEnvironment('OWNER_TOKEN'),
  assistantToken: requireEnvironment('AI_TOKEN'),
  ownerEnforceTfa: requireEnvironment('OWNER_ENFORCE_TFA') === 'true',
  assistantAppAccess: requireEnvironment('AI_APP_ACCESS') === 'true',
};
```

`cms/tests/src/support/clients.ts`:

```ts
import { createDirectus, rest, staticToken } from '@directus/sdk';
import type { PortfolioSchema } from '@portfolio/cms-schema';

import { testEnvironment } from './environment.ts';

function createTokenClient(token: string) {
  return createDirectus<PortfolioSchema>(testEnvironment.directusUrl)
    .with(staticToken(token))
    .with(rest());
}

export const adminClient = createTokenClient(testEnvironment.adminToken);
export const ownerClient = createTokenClient(testEnvironment.ownerToken);
export const assistantClient = createTokenClient(testEnvironment.assistantToken);
export const anonymousClient = createDirectus<PortfolioSchema>(testEnvironment.directusUrl).with(
  rest()
);
```

`cms/tests/src/support/errors.ts`:

```ts
import { isDirectusError } from '@directus/sdk';

export async function captureErrorCode(request: Promise<unknown>): Promise<string> {
  try {
    await request;
  } catch (error) {
    return readErrorCode(error);
  }
  throw new Error('The request should have been refused, but it succeeded.');
}

function readErrorCode(error: unknown): string {
  if (!isDirectusError(error)) {
    throw error;
  }
  const [firstError] = error.errors;
  if (firstError === undefined) {
    throw new Error(`Directus error without details (HTTP ${error.response.status}).`);
  }
  return firstError.extensions.code;
}
```

`cms/tests/src/support/fixtures.ts`:

```ts
import { randomUUID } from 'node:crypto';

export function uniqueSuffix(): string {
  return randomUUID().slice(0, 8);
}

export function capabilityValues(slug: string) {
  return {
    slug,
    icon: 'cloud',
    title_en: 'Test capability',
    title_fr: 'Capacité de test',
    description_en: 'Created by an integration test.',
    description_fr: 'Créée par un test d’intégration.',
  };
}
```

`cms/tests/src/schema.test.ts`:

```ts
import { createItem, deleteItem, readCollections } from '@directus/sdk';
import { describe, expect, it } from 'vitest';

import { adminClient } from './support/clients.ts';
import { captureErrorCode } from './support/errors.ts';
import { uniqueSuffix } from './support/fixtures.ts';

const expectedCollections = [
  'profile',
  'capabilities',
  'skills',
  'experiences',
  'projects',
  'key_figures',
  'answers',
  'chat_settings',
  'site_settings',
  'publications',
];

describe('provisioned schema', () => {
  it('creates every portfolio collection', async () => {
    const collections = await adminClient.request(readCollections());

    expect(collections.map((collection) => collection.collection)).toEqual(
      expect.arrayContaining(expectedCollections)
    );
  });

  it('rejects a second item with the same slug', async () => {
    const slug = `schema-${uniqueSuffix()}`;
    const created = await adminClient.request(
      createItem('key_figures', { slug, value: '1' }, { fields: ['id'] })
    );
    try {
      const duplicate = adminClient.request(createItem('key_figures', { slug, value: '2' }));

      expect(await captureErrorCode(duplicate)).toBe('RECORD_NOT_UNIQUE');
    } finally {
      await adminClient.request(deleteItem('key_figures', created.id));
    }
  });
});
```

- [ ] **Step 8: Start the stack, provision twice, run the checks**

Run: `pnpm install && scripts/ci/write-env.sh && pnpm cms:up`
Expected: `.env` written; containers `portfolio-database-1` and `portfolio-directus-1` healthy.

Run: `pnpm provision && pnpm provision`
Expected: the first run logs `Collection created: …` for the 10 collections and `Relation created: …` twice; the second run logs only `Provisioning complete.`

Run: `pnpm test:cms && pnpm typecheck && pnpm test`
Expected: integration PASS (2 tests); typecheck and unit tests PASS.

- [ ] **Step 9: Commit**

```bash
git add compose.yaml .env.example scripts/ci/write-env.sh cms/provision cms/tests package.json pnpm-lock.yaml
git commit -m "feat(cms): provision the portfolio schema on a local Directus"
```

---

### Task 6: Owner, assistant and public access

**Files:**

- Create: `cms/provision/src/access/policies.ts`, `cms/provision/src/access/role-policies.ts`, `cms/provision/src/access/ensure-access.ts`
- Modify: `cms/provision/src/main.ts`
- Test: `cms/provision/src/access/policies.test.ts`, `cms/provision/src/access/role-policies.test.ts`, `cms/tests/src/access.test.ts`

**Interfaces:**

- Consumes: `ProvisionEnvironment` (Task 5), `PortfolioSchema` (Task 4).
- Produces (also exported as `@portfolio/cms-provision/access`):
  - `PUBLIC_POLICY_ID`, `OWNER_POLICY_NAME = 'Owner'`, `ASSISTANT_POLICY_NAME = 'Assistant'`, `workingCollections`
  - `ownerPolicy(enforceTfa: boolean): PolicyDefinition`, `assistantPolicy(appAccess: boolean): PolicyDefinition`, `publicGrants: CollectionGrant[]` (empty)
  - `toPermissionRows(policyId, grants)`, `grantKeys(grants): string[]`
  - `ensureAccess(client, environment, log)`

- [ ] **Step 1: Write the failing policy tests**

`cms/provision/src/access/policies.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  assistantPolicy,
  ownerPolicy,
  publicGrants,
  toPermissionRows,
  workingCollections,
} from './policies.ts';
import type { CollectionGrant } from './policies.ts';

function actionsOn(grants: CollectionGrant[], collection: string): string[] {
  return grants
    .filter((grant) => grant.collection === collection)
    .flatMap((grant) => grant.actions);
}

describe('public policy', () => {
  it('grants nothing', () => {
    expect(publicGrants).toEqual([]);
  });
});

describe('assistant policy', () => {
  const grants = assistantPolicy(false).grants;

  it('creates, reads and updates every working collection', () => {
    const incomplete = workingCollections.filter(
      (collection) => actionsOn(grants, collection).join(',') !== 'create,read,update'
    );

    expect(incomplete).toEqual([]);
  });

  it('never deletes', () => {
    expect(grants.filter((grant) => grant.actions.includes('delete'))).toEqual([]);
  });

  it('only reads publications', () => {
    expect(actionsOn(grants, 'publications')).toEqual(['read']);
  });

  it('cannot reach administration collections', () => {
    const administration = [
      'directus_users',
      'directus_flows',
      'directus_operations',
      'directus_permissions',
      'directus_policies',
      'directus_roles',
      'directus_settings',
    ];

    expect(administration.filter((collection) => actionsOn(grants, collection).length > 0)).toEqual(
      []
    );
  });

  it('follows the requested Studio access flag', () => {
    expect(assistantPolicy(true).appAccess).toBe(true);
    expect(assistantPolicy(false).appAccess).toBe(false);
  });
});

describe('owner policy', () => {
  const grants = ownerPolicy(false).grants;

  it('manages every working collection', () => {
    const incomplete = workingCollections.filter(
      (collection) => actionsOn(grants, collection).join(',') !== 'create,read,update,delete'
    );

    expect(incomplete).toEqual([]);
  });

  it('never deletes a publication', () => {
    expect(actionsOn(grants, 'publications')).toEqual(['create', 'read', 'update']);
  });

  it('reads the flows that render the publication buttons', () => {
    expect(actionsOn(grants, 'directus_flows')).toEqual(['read']);
    expect(actionsOn(grants, 'directus_operations')).toEqual(['read']);
  });

  it('follows the two-factor flag', () => {
    expect(ownerPolicy(true).enforceTfa).toBe(true);
    expect(ownerPolicy(false).enforceTfa).toBe(false);
  });
});

describe('permission rows', () => {
  it('only produces rows allowed by Directus Core', () => {
    const rows = toPermissionRows('policy-id', [
      ...ownerPolicy(false).grants,
      ...assistantPolicy(false).grants,
    ]);
    const restricted = rows.filter(
      (row) =>
        row.fields.join(',') !== '*' ||
        row.permissions !== null ||
        row.validation !== null ||
        row.presets !== null
    );

    expect(restricted).toEqual([]);
  });
});
```

`cms/provision/src/access/role-policies.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { rolePolicyIdsMatchExpected } from './role-policies.ts';

describe('rolePolicyIdsMatchExpected', () => {
  it('accepts exactly the expected policy', () => {
    expect(rolePolicyIdsMatchExpected(['policy-1'], 'policy-1')).toBe(true);
  });

  it.each([
    ['no policy', []],
    ['another policy', ['policy-2']],
    ['an extra policy', ['policy-1', 'policy-2']],
  ])('rejects %s', (_case, policyIds) => {
    expect(rolePolicyIdsMatchExpected(policyIds, 'policy-1')).toBe(false);
  });
});
```

Run: `pnpm --filter @portfolio/cms-provision test`
Expected: FAIL, `Cannot find module './policies.ts'`.

- [ ] **Step 2: Implement the policies**

`cms/provision/src/access/policies.ts`:

```ts
import type { PortfolioSchema } from '@portfolio/cms-schema';

export type PermissionAction = 'create' | 'read' | 'update' | 'delete';

export type SystemCollection =
  | 'directus_files'
  | 'directus_folders'
  | 'directus_users'
  | 'directus_flows'
  | 'directus_operations';

export type GrantedCollection = keyof PortfolioSchema | SystemCollection;

export type CollectionGrant = { collection: GrantedCollection; actions: PermissionAction[] };

export type PolicyDefinition = {
  name: string;
  icon: string;
  description: string;
  appAccess: boolean;
  enforceTfa: boolean;
  grants: CollectionGrant[];
};

export type PermissionRow = {
  policy: string;
  collection: GrantedCollection;
  action: PermissionAction;
  fields: string[];
  permissions: null;
  validation: null;
  presets: null;
};

export const PUBLIC_POLICY_ID = 'abf8a154-5b1c-4a46-ac9c-7300570f4f17';
export const OWNER_POLICY_NAME = 'Owner';
export const ASSISTANT_POLICY_NAME = 'Assistant';

export const workingCollections: (keyof PortfolioSchema)[] = [
  'profile',
  'capabilities',
  'skills',
  'experiences',
  'projects',
  'key_figures',
  'answers',
  'chat_settings',
  'site_settings',
];

const allActions: PermissionAction[] = ['create', 'read', 'update', 'delete'];

function grant(collections: GrantedCollection[], actions: PermissionAction[]): CollectionGrant[] {
  return collections.map((collection) => ({ collection, actions }));
}

export const publicGrants: CollectionGrant[] = [];

export function ownerPolicy(enforceTfa: boolean): PolicyDefinition {
  return {
    name: OWNER_POLICY_NAME,
    icon: 'verified_user',
    description: 'Edits the content, prepares, publishes and rolls back publications.',
    appAccess: true,
    enforceTfa,
    grants: [
      ...grant(workingCollections, allActions),
      ...grant(['publications'], ['create', 'read', 'update']),
      ...grant(['directus_files', 'directus_folders'], allActions),
      ...grant(['directus_users', 'directus_flows', 'directus_operations'], ['read']),
    ],
  };
}

export function assistantPolicy(appAccess: boolean): PolicyDefinition {
  return {
    name: ASSISTANT_POLICY_NAME,
    icon: 'smart_toy',
    description: 'Edits the working content through MCP. Never publishes or deletes.',
    appAccess,
    enforceTfa: false,
    grants: [
      ...grant(workingCollections, ['create', 'read', 'update']),
      ...grant(['publications'], ['read']),
      ...grant(['directus_files', 'directus_folders'], ['read']),
    ],
  };
}

export function toPermissionRows(policyId: string, grants: CollectionGrant[]): PermissionRow[] {
  return grants.flatMap((collectionGrant) =>
    collectionGrant.actions.map((action) => ({
      policy: policyId,
      collection: collectionGrant.collection,
      action,
      fields: ['*'],
      permissions: null,
      validation: null,
      presets: null,
    }))
  );
}

export function grantKeys(grants: CollectionGrant[]): string[] {
  return grants
    .flatMap((collectionGrant) =>
      collectionGrant.actions.map((action) => `${collectionGrant.collection}:${action}`)
    )
    .toSorted();
}
```

`cms/provision/src/access/role-policies.ts`:

```ts
export function rolePolicyIdsMatchExpected(
  policyIds: readonly string[],
  expectedPolicyId: string
): boolean {
  if (policyIds.length !== 1) {
    return false;
  }
  return policyIds.at(0) === expectedPolicyId;
}
```

Run: `pnpm --filter @portfolio/cms-provision test`
Expected: PASS (24 tests).

- [ ] **Step 3: Apply policies, roles and users**

`cms/provision/src/access/ensure-access.ts`:

```ts
import {
  createPermissions,
  createPolicy,
  createRole,
  createUser,
  deletePermissions,
  readPermissions,
  readPolicies,
  readRole,
  readRoles,
  readUsers,
  updatePolicy,
  updateRole,
  updateUser,
} from '@directus/sdk';

import { createSystemAdminClient } from '../directus-client.ts';
import type { AdminClient, Log, SystemAdminClient } from '../directus-client.ts';
import type { AccountEnvironment, ProvisionEnvironment } from '../environment.ts';
import {
  assistantPolicy,
  ownerPolicy,
  PUBLIC_POLICY_ID,
  publicGrants,
  toPermissionRows,
} from './policies.ts';
import type { CollectionGrant, PolicyDefinition } from './policies.ts';
import { rolePolicyIdsMatchExpected } from './role-policies.ts';

type RoleDefinition = { id: string; name: string; icon: string; policyId: string };

type UserDefinition = { account: AccountEnvironment; firstName: string };

export async function ensureAccess(
  client: AdminClient,
  environment: ProvisionEnvironment,
  log: Log
): Promise<void> {
  const systemClient = createSystemAdminClient(environment.directusUrl, environment.adminToken);
  const owner = ownerPolicy(environment.owner.enforceTfa);
  const assistant = assistantPolicy(environment.assistant.appAccess);
  const ownerPolicyId = await ensurePolicy(client, owner, log);
  const assistantPolicyId = await ensurePolicy(client, assistant, log);

  await assertPublicPolicyExists(client, PUBLIC_POLICY_ID);
  await replacePermissions(client, PUBLIC_POLICY_ID, publicGrants, log);
  await replacePermissions(client, ownerPolicyId, owner.grants, log);
  await replacePermissions(client, assistantPolicyId, assistant.grants, log);

  await ensureRole(
    client,
    systemClient,
    { id: environment.owner.roleId, name: 'Owner', icon: 'verified_user', policyId: ownerPolicyId },
    log
  );
  await ensureRole(
    client,
    systemClient,
    {
      id: environment.assistant.roleId,
      name: 'Assistant',
      icon: 'smart_toy',
      policyId: assistantPolicyId,
    },
    log
  );

  await ensureUser(client, { account: environment.owner, firstName: 'Owner' }, log);
  await ensureUser(client, { account: environment.assistant, firstName: 'Assistant' }, log);
}

async function ensurePolicy(
  client: AdminClient,
  definition: PolicyDefinition,
  log: Log
): Promise<string> {
  const values = {
    name: definition.name,
    icon: definition.icon,
    description: definition.description,
    app_access: definition.appAccess,
    admin_access: false,
    enforce_tfa: definition.enforceTfa,
  };
  const [existing] = await client.request(
    readPolicies({ filter: { name: { _eq: definition.name } }, fields: ['id'], limit: 1 })
  );
  if (existing === undefined) {
    const created = await client.request(createPolicy(values, { fields: ['id'] }));
    log(`Policy created: ${definition.name}`);
    return created.id;
  }
  await client.request(updatePolicy(existing.id, values));
  return existing.id;
}

async function assertPublicPolicyExists(client: AdminClient, policyId: string): Promise<void> {
  const [existing] = await client.request(
    readPolicies({ filter: { id: { _eq: policyId } }, fields: ['id'], limit: 1 })
  );
  if (existing === undefined) {
    throw new Error(`The public policy ${policyId} was not found.`);
  }
}

async function replacePermissions(
  client: AdminClient,
  policyId: string,
  grants: CollectionGrant[],
  log: Log
): Promise<void> {
  const existing = await client.request(
    readPermissions({ filter: { policy: { _eq: policyId } }, fields: ['id'], limit: -1 })
  );
  // Directus can list synthetic app permissions without an id; only stored rows can be deleted.
  const storedIds = existing
    .map((permission) => permission.id)
    .filter((id) => typeof id === 'number');
  if (storedIds.length > 0) {
    await client.request(deletePermissions(storedIds));
  }
  const rows = toPermissionRows(policyId, grants);
  if (rows.length > 0) {
    await client.request(createPermissions(rows));
  }
  log(`Permissions applied to policy ${policyId}`);
}

async function ensureRole(
  client: AdminClient,
  systemClient: SystemAdminClient,
  definition: RoleDefinition,
  log: Log
): Promise<void> {
  const [existing] = await client.request(
    readRoles({ filter: { id: { _eq: definition.id } }, fields: ['id'], limit: 1 })
  );
  if (existing === undefined) {
    await client.request(
      createRole({
        id: definition.id,
        name: definition.name,
        icon: definition.icon,
        policies: [{ policy: definition.policyId }],
      })
    );
    log(`Role created: ${definition.name}`);
    return;
  }
  const policyIds = await readRolePolicyIds(systemClient, definition.id);
  if (rolePolicyIdsMatchExpected(policyIds, definition.policyId)) {
    return;
  }
  await client.request(updateRole(definition.id, { policies: [{ policy: definition.policyId }] }));
  log(`Role updated: ${definition.name}`);
}

async function readRolePolicyIds(client: SystemAdminClient, roleId: string): Promise<string[]> {
  const role = await client.request(
    readRole(roleId, { fields: [{ policies: [{ policy: ['id'] }] }] })
  );
  return policyIdsFromRole(role);
}

function policyIdsFromRole(role: unknown): string[] {
  if (typeof role !== 'object' || role === null || !('policies' in role)) {
    return [];
  }
  const policies = role.policies;
  if (!Array.isArray(policies)) {
    return [];
  }
  return policies.flatMap((link) => {
    const policyId = readPolicyIdFromAccessRow(link);
    if (policyId === null) {
      return [];
    }
    return [policyId];
  });
}

function readPolicyIdFromAccessRow(row: unknown): string | null {
  if (typeof row !== 'object' || row === null || !('policy' in row)) {
    return null;
  }
  const policy = row.policy;
  if (typeof policy === 'string') {
    return policy;
  }
  if (
    typeof policy === 'object' &&
    policy !== null &&
    'id' in policy &&
    typeof policy.id === 'string'
  ) {
    return policy.id;
  }
  return null;
}

async function ensureUser(
  client: AdminClient,
  definition: UserDefinition,
  log: Log
): Promise<void> {
  const { account } = definition;
  const [existing] = await client.request(
    readUsers({ filter: { email: { _eq: account.email } }, fields: ['id'], limit: 1 })
  );
  if (existing === undefined) {
    await client.request(
      createUser({
        email: account.email,
        password: account.password,
        first_name: definition.firstName,
        role: account.roleId,
        status: 'active',
        token: account.token,
      })
    );
    log(`User created: ${account.email}`);
    return;
  }
  await client.request(
    updateUser(existing.id, { role: account.roleId, status: 'active', token: account.token })
  );
}
```

In `cms/provision/src/main.ts`, import `ensureAccess` and call it after the schema:

```ts
import { ensureAccess } from './access/ensure-access.ts';
```

```ts
await ensureSchema(client, portfolioCollections, portfolioRelations, log);
await ensureAccess(client, environment, log);
log('Provisioning complete.');
```

- [ ] **Step 4: Write the access integration tests**

`cms/tests/src/access.test.ts`:

```ts
import {
  createItem,
  deleteItem,
  readFlows,
  readItems,
  readPermissions,
  readPolicies,
  readSingleton,
  updateItem,
} from '@directus/sdk';
import {
  ASSISTANT_POLICY_NAME,
  assistantPolicy,
  grantKeys,
  OWNER_POLICY_NAME,
  ownerPolicy,
  PUBLIC_POLICY_ID,
  publicGrants,
} from '@portfolio/cms-provision/access';
import type { CollectionGrant } from '@portfolio/cms-provision/access';
import { afterAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { adminClient, anonymousClient, assistantClient, ownerClient } from './support/clients.ts';
import { testEnvironment } from './support/environment.ts';
import { captureErrorCode } from './support/errors.ts';
import { capabilityValues, uniqueSuffix } from './support/fixtures.ts';

type NamedRequest = [string, () => Promise<unknown>];

const suffix = uniqueSuffix();
const ownerCapabilityId = (
  await ownerClient.request(
    createItem('capabilities', capabilityValues(`owner-${suffix}`), { fields: ['id'] })
  )
).id;
const discardedPublicationId = (
  await ownerClient.request(
    createItem(
      'publications',
      { status: 'discarded', content: {}, changes: {}, changes_overview: 'Access test' },
      { fields: ['id'] }
    )
  )
).id;

afterAll(async () => {
  await adminClient.request(deleteItem('capabilities', ownerCapabilityId));
  await adminClient.request(deleteItem('publications', discardedPublicationId));
});

const permissionRow = z.object({
  collection: z.string(),
  action: z.string(),
  fields: z.array(z.string()).nullable(),
  permissions: z.unknown(),
  validation: z.unknown(),
  presets: z.unknown(),
});

async function readPolicy(name: string): Promise<{ id: string; enforceTfa: boolean }> {
  const [policy] = await adminClient.request(
    readPolicies({ filter: { name: { _eq: name } }, fields: ['id', 'enforce_tfa'], limit: 1 })
  );
  if (policy === undefined) {
    throw new Error(`Policy "${name}" not found: run pnpm provision.`);
  }
  return { id: policy.id, enforceTfa: policy.enforce_tfa };
}

async function readStoredGrantKeys(policyId: string): Promise<string[]> {
  const rows = await adminClient.request(
    readPermissions({
      filter: { policy: { _eq: policyId } },
      fields: ['collection', 'action', 'fields', 'permissions', 'validation', 'presets'],
      limit: -1,
    })
  );
  return z
    .array(permissionRow)
    .parse(rows)
    .map((row) => `${row.collection}:${row.action}`)
    .toSorted();
}

async function capabilityExists(id: string): Promise<boolean> {
  const found = await adminClient.request(
    readItems('capabilities', { filter: { id: { _eq: id } }, fields: ['id'] })
  );
  return found.length === 1;
}

describe('anonymous visitor', () => {
  const reads: NamedRequest[] = [
    ['the profile', () => anonymousClient.request(readSingleton('profile'))],
    ['capabilities', () => anonymousClient.request(readItems('capabilities'))],
    ['experiences', () => anonymousClient.request(readItems('experiences'))],
    ['publications', () => anonymousClient.request(readItems('publications'))],
  ];

  it.each(reads)('cannot read %s', async (_name, request) => {
    expect(await captureErrorCode(request())).toBe('FORBIDDEN');
  });
});

describe('assistant', () => {
  it('creates and updates working content', async () => {
    const created = await assistantClient.request(
      createItem('capabilities', capabilityValues(`assistant-${suffix}`), { fields: ['id'] })
    );
    try {
      await assistantClient.request(
        updateItem('capabilities', created.id, { title_en: 'Updated by the assistant' })
      );
      const [stored] = await adminClient.request(
        readItems('capabilities', { filter: { id: { _eq: created.id } }, fields: ['title_en'] })
      );

      expect(stored?.title_en).toBe('Updated by the assistant');
    } finally {
      await adminClient.request(deleteItem('capabilities', created.id));
    }
  });

  it('reads publications', async () => {
    await expect(assistantClient.request(readItems('publications'))).resolves.toBeDefined();
  });

  const refusals: NamedRequest[] = [
    [
      'deleting working content',
      () => assistantClient.request(deleteItem('capabilities', ownerCapabilityId)),
    ],
    [
      'creating a publication',
      () =>
        assistantClient.request(
          createItem('publications', { status: 'prepared', content: {}, changes: {} })
        ),
    ],
    [
      'updating a publication',
      () =>
        assistantClient.request(
          updateItem('publications', discardedPublicationId, { status: 'active' })
        ),
    ],
    ['reading flows', () => assistantClient.request(readFlows())],
    ['reading permissions', () => assistantClient.request(readPermissions())],
  ];

  it.each(refusals)('is refused %s', async (_name, request) => {
    expect(await captureErrorCode(request())).toBe('FORBIDDEN');
  });

  it('leaves the owner content in place after the refused delete', async () => {
    expect(await capabilityExists(ownerCapabilityId)).toBe(true);
  });
});

describe('owner', () => {
  it('creates, updates and deletes working content', async () => {
    const created = await ownerClient.request(
      createItem('capabilities', capabilityValues(`owner-crud-${suffix}`), { fields: ['id'] })
    );
    await ownerClient.request(updateItem('capabilities', created.id, { title_en: 'Renamed' }));
    await ownerClient.request(deleteItem('capabilities', created.id));

    expect(await capabilityExists(created.id)).toBe(false);
  });

  it('cannot delete a publication', async () => {
    expect(
      await captureErrorCode(
        ownerClient.request(deleteItem('publications', discardedPublicationId))
      )
    ).toBe('FORBIDDEN');
  });

  it('reads the flows that render the publication buttons', async () => {
    await expect(ownerClient.request(readFlows())).resolves.toBeDefined();
  });
});

describe('stored policies', () => {
  const managed: [string, () => Promise<string>, CollectionGrant[]][] = [
    ['Public', async () => PUBLIC_POLICY_ID, publicGrants],
    [
      OWNER_POLICY_NAME,
      async () => (await readPolicy(OWNER_POLICY_NAME)).id,
      ownerPolicy(testEnvironment.ownerEnforceTfa).grants,
    ],
    [
      ASSISTANT_POLICY_NAME,
      async () => (await readPolicy(ASSISTANT_POLICY_NAME)).id,
      assistantPolicy(testEnvironment.assistantAppAccess).grants,
    ],
  ];

  it.each(managed)('stores exactly the %s permissions', async (_name, readId, expected) => {
    expect(await readStoredGrantKeys(await readId())).toEqual(grantKeys(expected));
  });

  it('requires two-factor authentication for the owner as configured', async () => {
    expect((await readPolicy(OWNER_POLICY_NAME)).enforceTfa).toBe(testEnvironment.ownerEnforceTfa);
  });
});
```

- [ ] **Step 5: Provision and run the tests**

Run: `pnpm provision && pnpm test:cms && pnpm typecheck`
Expected: the provisioning logs `Policy created: Owner`, `Policy created: Assistant`, both roles and users; integration PASS (21 tests); no type error.

- [ ] **Step 6: Commit**

```bash
git add cms/provision cms/tests
git commit -m "feat(cms): give the owner and the assistant separate access"
```

---

### Task 7: Project settings and MCP for the assistant

**Files:**

- Create: `cms/provision/src/settings/ensure-settings.ts`, `cms/provision/src/assistant-protocol.md`, `cms/tests/src/support/mcp.ts`
- Modify: `cms/provision/src/main.ts`
- Test: `cms/tests/src/mcp.test.ts`

**Interfaces:**

- Consumes: `ProvisionEnvironment.mcpOAuth` (Task 5), the assistant account (Task 6).
- Produces: `ensureSettings(client, environment, assistantProtocol, log)`; test support `listMcpTools(token)`, `callMcpTool(token, name, args): Promise<ToolOutcome>`, `readToolErrorCodes(outcome)`.

- [ ] **Step 1: Write the settings and the assistant protocol**

`cms/provision/src/settings/ensure-settings.ts`:

```ts
import { updateSettings } from '@directus/sdk';

import type { AdminClient, Log } from '../directus-client.ts';
import type { ProvisionEnvironment } from '../environment.ts';

export async function ensureSettings(
  client: AdminClient,
  environment: ProvisionEnvironment,
  assistantProtocol: string,
  log: Log
): Promise<void> {
  await client.request(
    updateSettings({
      project_name: 'Portfolio',
      default_language: 'en-US',
      mcp_enabled: true,
      mcp_allow_deletes: false,
      mcp_system_prompt_enabled: true,
      mcp_system_prompt: assistantProtocol,
      mcp_oauth_enabled: environment.mcpOAuth.enabled,
      mcp_oauth_cimd_enabled: environment.mcpOAuth.cimdEnabled,
      mcp_oauth_dcr_enabled: environment.mcpOAuth.dcrEnabled,
    })
  );
  log('Project and MCP settings applied');
}
```

`cms/provision/src/assistant-protocol.md`:

```markdown
# Portfolio assistant protocol

You help Ny Hasinavalona Randriantsarafara keep his portfolio content accurate in Directus. The portfolio answers recruiters in his name, so every fact must be true. He reviews and publishes; you never publish.

## Before you start

1. Call the `schema` tool to list the collections and their fields.
2. Read `profile`, `capabilities`, `skills`, `experiences`, `projects`, `key_figures`, `answers`, `chat_settings` and `site_settings`.
3. Read the active publication (`publications` whose `status` is `active`) to see what visitors currently see.

## Writing content

- Every visitor-facing text has an English field (`_en`) and a French field (`_fr`). Fill both. In French, address the visitor as « vous ».
- Lists of sentences (highlights, sample questions, suggested topics, sensitive-topic keywords) hold one item per line.
- Items refer to each other by slug: `skill_slugs`, `experience_slugs`, `project_slugs`, `key_figure_slugs`, `capability_slug`. Only use slugs that exist.
- A new item needs a unique slug made of lowercase letters, digits and hyphens.
- The `blocks` of an answer is a JSON list. Allowed types: `timeline` (optional `experienceSlugs`, `skillSlug`), `experience` (`slug`), `project` (`slug`), `skills` (optional `capabilitySlug`, `highlightSlugs`), `key-figures` (`slugs`), `strengths` (`answerSlug`), `contact` (optional `topic`), `cv`.
- Never invent employers, dates, figures or opinions. When information is missing, ask the owner instead of guessing.

## Analysis

Compare the working content with the active publication. Report missing translations, broken slug references and answers without supporting facts.

## Not allowed

- You never publish: the owner prepares and publishes publications in Directus.
- You never delete anything. When an item should go, tell the owner.
- You do not change users, roles, policies, flows or settings.
```

In `cms/provision/src/main.ts`, add the imports:

```ts
import { readFile } from 'node:fs/promises';
```

```ts
import { ensureSettings } from './settings/ensure-settings.ts';
```

and apply the settings after the access:

```ts
const assistantProtocol = await readFile(
  new URL('./assistant-protocol.md', import.meta.url),
  'utf8'
);

await ensureSchema(client, portfolioCollections, portfolioRelations, log);
await ensureAccess(client, environment, log);
await ensureSettings(client, environment, assistantProtocol, log);
log('Provisioning complete.');
```

- [ ] **Step 2: Write the MCP test support**

`cms/tests/src/support/mcp.ts`:

```ts
import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import { testEnvironment } from './environment.ts';

export type ToolOutcome = { isError: boolean; text: string };

const toolCallResponse = z.object({
  result: z.object({
    isError: z.boolean().optional(),
    content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
  }),
});
const toolListResponse = z.object({
  result: z.object({ tools: z.array(z.object({ name: z.string() })) }),
});
const toolErrors = z.array(z.object({ error: z.string(), code: z.string().optional() }));

async function postMcp(
  token: string,
  method: string,
  params: Record<string, unknown>
): Promise<unknown> {
  const response = await fetch(`${testEnvironment.directusUrl}/mcp`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: randomUUID(), method, params }),
  });
  if (!response.ok) {
    throw new Error(`MCP answered HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

export async function listMcpTools(token: string): Promise<string[]> {
  const parsed = toolListResponse.parse(await postMcp(token, 'tools/list', {}));
  return parsed.result.tools.map((tool) => tool.name);
}

export async function callMcpTool(
  token: string,
  name: string,
  args: Record<string, unknown>
): Promise<ToolOutcome> {
  const parsed = toolCallResponse.parse(
    await postMcp(token, 'tools/call', { name, arguments: args })
  );
  return {
    isError: parsed.result.isError ?? false,
    text: parsed.result.content.map((part) => part.text ?? '').join('\n'),
  };
}

export function readToolErrorCodes(outcome: ToolOutcome): string[] {
  const parsed: unknown = JSON.parse(outcome.text);
  return toolErrors
    .parse(parsed)
    .map((error) => error.code)
    .filter((code) => code !== undefined);
}
```

- [ ] **Step 3: Write the MCP integration tests**

`cms/tests/src/mcp.test.ts`:

```ts
import { createItem, deleteItem, readItems } from '@directus/sdk';
import { afterAll, describe, expect, it } from 'vitest';

import { adminClient, ownerClient } from './support/clients.ts';
import { testEnvironment } from './support/environment.ts';
import { capabilityValues, uniqueSuffix } from './support/fixtures.ts';
import { callMcpTool, listMcpTools, readToolErrorCodes } from './support/mcp.ts';

const suffix = uniqueSuffix();
const token = testEnvironment.assistantToken;
const keyFigureSlug = `mcp-${suffix}`;
const ownerCapabilityId = (
  await ownerClient.request(
    createItem('capabilities', capabilityValues(`mcp-owner-${suffix}`), { fields: ['id'] })
  )
).id;

afterAll(async () => {
  await adminClient.request(deleteItem('capabilities', ownerCapabilityId));
  const created = await adminClient.request(
    readItems('key_figures', { filter: { slug: { _eq: keyFigureSlug } }, fields: ['id'] })
  );
  await Promise.all(created.map((item) => adminClient.request(deleteItem('key_figures', item.id))));
});

async function readKeyFigure(): Promise<{ id: string; value: string | null } | undefined> {
  const [found] = await adminClient.request(
    readItems('key_figures', { filter: { slug: { _eq: keyFigureSlug } }, fields: ['id', 'value'] })
  );
  return found;
}

describe('MCP for the assistant', () => {
  it('exposes the content tools and the assistant protocol', async () => {
    expect(await listMcpTools(token)).toEqual(
      expect.arrayContaining(['items', 'schema', 'system-prompt'])
    );

    const protocol = await callMcpTool(token, 'system-prompt', {});

    expect(protocol.isError).toBe(false);
    expect(protocol.text).toContain('You never publish');
  });

  it('creates then updates working content through the items tool', async () => {
    const created = await callMcpTool(token, 'items', {
      action: 'create',
      collection: 'key_figures',
      data: {
        slug: keyFigureSlug,
        value: '3',
        label_en: 'Created via MCP',
        label_fr: 'Créé via MCP',
      },
    });
    const stored = await readKeyFigure();

    expect(created.isError).toBe(false);
    expect(stored?.value).toBe('3');

    const updated = await callMcpTool(token, 'items', {
      action: 'update',
      collection: 'key_figures',
      data: [{ id: stored?.id, value: '4' }],
    });

    expect(updated.isError).toBe(false);
    expect((await readKeyFigure())?.value).toBe('4');
  });

  it('refuses a delete and leaves the item in place', async () => {
    const outcome = await callMcpTool(token, 'items', {
      action: 'delete',
      collection: 'capabilities',
      keys: [ownerCapabilityId],
    });
    const remaining = await adminClient.request(
      readItems('capabilities', { filter: { id: { _eq: ownerCapabilityId } }, fields: ['id'] })
    );

    expect(outcome.isError).toBe(true);
    expect(remaining).toHaveLength(1);
  });

  const refusals: [string, string, Record<string, unknown>, string][] = [
    [
      'creating a publication',
      'items',
      {
        action: 'create',
        collection: 'publications',
        data: { status: 'active', content: {}, changes: {} },
      },
      'FORBIDDEN',
    ],
    ['reading flows', 'flows', { action: 'read' }, 'FORBIDDEN'],
    [
      'reading permissions as items',
      'items',
      { action: 'read', collection: 'directus_permissions' },
      'INVALID_PAYLOAD',
    ],
  ];

  it.each(refusals)('refuses %s', async (_name, tool, args, code) => {
    const outcome = await callMcpTool(token, tool, args);

    expect(outcome.isError).toBe(true);
    expect(readToolErrorCodes(outcome)).toContain(code);
  });
});
```

- [ ] **Step 4: Provision and run the tests**

Run: `pnpm provision && pnpm test:cms && pnpm typecheck`
Expected: the provisioning logs `Project and MCP settings applied`; integration PASS (27 tests). If the delete refusal returns a tool error code, keep the assertion on `isError` and the remaining item: the code is not part of the contract.

- [ ] **Step 5: Commit**

```bash
git add cms/provision cms/tests
git commit -m "feat(cms): expose working content to the assistant through MCP"
```

---

### Task 8: Initial content from the current site

**Files:**

- Create: `cms/provision/src/seed/initial-content.ts`, `cms/provision/src/seed/seed-initial-content.ts`
- Modify: `cms/provision/src/main.ts`
- Test: `cms/provision/src/seed/initial-content.test.ts`, `cms/tests/src/seed.test.ts`

**Interfaces:**

- Consumes: `toWorkingRecords` (Task 4), `validatePublicationContent` (Task 2), `SEED_INITIAL_CONTENT` (Task 5).
- Produces: `initialContent: PublicationContent` (exported as `@portfolio/cms-provision/seed`), `seedInitialContent(client, log)`.

The English texts come from `site/public/data/content.json`; the French texts are drafts for the owner to review before the first publication. The fifth capability (frontend), the experience summaries, the profile disclosure and the chat settings are new texts written from the existing facts. `answers` stays empty: the answer bank is drafted in plan 4.

- [ ] **Step 1: Write the failing content test**

`cms/provision/src/seed/initial-content.test.ts`:

```ts
import { validatePublicationContent } from '@portfolio/content';
import { describe, expect, it } from 'vitest';

import { initialContent } from './initial-content.ts';

describe('initial content', () => {
  it('is a valid publication in both languages', () => {
    expect(validatePublicationContent(initialContent)).toEqual({
      valid: true,
      content: initialContent,
    });
  });

  it('keeps every experience of the current site', () => {
    expect(initialContent.experiences.map((experience) => experience.slug)).toEqual([
      'warner-bros-discovery',
      'euronews',
      'numer-hei',
      'novity',
      'bocasay',
      'itras-group',
      'allo-application',
    ]);
  });

  it('keeps the current case studies and side projects', () => {
    expect(initialContent.projects.map((project) => `${project.kind}:${project.slug}`)).toEqual([
      'professional:eurosport-api-platform',
      'professional:high-traffic-media-platform',
      'professional:saas-for-craftsmen',
      'personal:visa-insight',
      'personal:lalana-lemurion',
      'personal:cloud-platform-maestro',
    ]);
  });

  it('features the core stack of the current site', () => {
    expect(
      initialContent.skills.filter((skill) => skill.featured).map((skill) => skill.name)
    ).toEqual(['AWS', 'Terraform', 'TypeScript', 'Node.js', 'GraphQL', 'PostgreSQL']);
  });
});
```

Run: `pnpm --filter @portfolio/cms-provision test`
Expected: FAIL, `Cannot find module './initial-content.ts'`.

- [ ] **Step 2: Write the initial content**

`cms/provision/src/seed/initial-content.ts`:

```ts
import type { PublicationContent, Skill } from '@portfolio/content';

function skill(slug: string, name: string, capabilitySlug: string, featured: boolean): Skill {
  return { slug, name, capabilitySlug, featured };
}

const softwareEngineer = { en: 'Software Engineer', fr: 'Ingénieur logiciel' };
const softwareDeveloper = { en: 'Software Developer', fr: 'Développeur logiciel' };
const leadDeveloper = { en: 'Lead Developer', fr: 'Développeur principal' };

export const initialContent: PublicationContent = {
  profile: {
    name: 'Ny Hasinavalona Randriantsarafara',
    headline: { en: 'Senior Backend & Cloud Engineer', fr: 'Ingénieur backend et cloud senior' },
    introduction: {
      en: 'Design-then-implement, deterministic rules. From Madagascar roots to global-scale systems used by millions.',
      fr: 'Concevoir avant d’implémenter, avec des règles déterministes. De mes débuts à Madagascar aux systèmes utilisés par des millions de personnes.',
    },
    location: {
      en: 'Pontault-Combault (Paris area), France',
      fr: 'Pontault-Combault (région parisienne), France',
    },
    availability: {
      en: 'Available for senior backend and architect roles in the EU',
      fr: 'Disponible pour des postes backend senior et architecte dans l’UE',
    },
    workAuthorization: {
      en: 'EU Blue Card · Passeport Talent, simplified mobility',
      fr: 'Carte bleue européenne · Passeport Talent, mobilité simplifiée',
    },
    languages: {
      en: 'Malagasy · French (fluent) · English (professional)',
      fr: 'Malgache · français (courant) · anglais (professionnel)',
    },
    email: 'nyhasinavalonar@gmail.com',
    linkedinUrl: 'https://www.linkedin.com/in/ny-randriantsarafara/',
    githubUrl: 'https://github.com/ny-randriantsarafara',
    photo: null,
    disclosure: {
      en: 'You are talking to an AI that replies with the answers I wrote. For anything important, contact me directly.',
      fr: 'Vous échangez avec une IA qui répond à partir des réponses que j’ai rédigées. Pour toute question importante, contactez-moi directement.',
    },
  },
  capabilities: [
    {
      slug: 'cloud',
      icon: 'cloud',
      title: { en: 'Cloud & Infrastructure', fr: 'Cloud et infrastructure' },
      description: {
        en: 'AWS (Lambda, API Gateway, DynamoDB, SQS, SNS, EC2). Terraform-first. Serverless and event-driven architectures.',
        fr: 'AWS (Lambda, API Gateway, DynamoDB, SQS, SNS, EC2). Terraform en priorité. Architectures serverless et événementielles.',
      },
    },
    {
      slug: 'backend',
      icon: 'server',
      title: { en: 'Backend & APIs', fr: 'Backend et API' },
      description: {
        en: 'Node.js, TypeScript, GraphQL, REST. High-traffic API design, integrations, performance optimization.',
        fr: 'Node.js, TypeScript, GraphQL, REST. Conception d’API à fort trafic, intégrations, optimisation des performances.',
      },
    },
    {
      slug: 'data',
      icon: 'database',
      title: { en: 'Data & Observability', fr: 'Données et observabilité' },
      description: {
        en: 'PostgreSQL, OpenSearch, Redis. Prometheus / Grafana. ETL pipelines and zero-downtime migrations.',
        fr: 'PostgreSQL, OpenSearch, Redis. Prometheus / Grafana. Pipelines ETL et migrations sans interruption de service.',
      },
    },
    {
      slug: 'quality',
      icon: 'shield-check',
      title: { en: 'Quality & Delivery', fr: 'Qualité et livraison' },
      description: {
        en: 'TDD, CI/CD automation, legacy refactoring, technical leadership and mentoring.',
        fr: 'TDD, automatisation CI/CD, refonte de code existant, leadership technique et mentorat.',
      },
    },
    {
      slug: 'frontend',
      icon: 'layers',
      title: { en: 'Frontend', fr: 'Frontend' },
      description: {
        en: 'React, Angular and TypeScript single-page applications, including migrations away from legacy front ends.',
        fr: 'Applications monopages React, Angular et TypeScript, y compris la migration d’anciens frontends.',
      },
    },
  ],
  skills: [
    skill('aws', 'AWS', 'cloud', true),
    skill('terraform', 'Terraform', 'cloud', true),
    skill('aws-lambda', 'AWS Lambda', 'cloud', false),
    skill('api-gateway', 'API Gateway', 'cloud', false),
    skill('dynamodb', 'DynamoDB', 'cloud', false),
    skill('sqs', 'SQS', 'cloud', false),
    skill('sns', 'SNS', 'cloud', false),
    skill('ec2', 'EC2', 'cloud', false),
    skill('serverless', 'Serverless', 'cloud', false),
    skill('caddy', 'Caddy', 'cloud', false),
    skill('typescript', 'TypeScript', 'backend', true),
    skill('nodejs', 'Node.js', 'backend', true),
    skill('graphql', 'GraphQL', 'backend', true),
    skill('rest', 'REST', 'backend', false),
    skill('java', 'Java', 'backend', false),
    skill('spring-boot', 'Spring Boot', 'backend', false),
    skill('elixir', 'Elixir', 'backend', false),
    skill('postgresql', 'PostgreSQL', 'data', true),
    skill('opensearch', 'OpenSearch', 'data', false),
    skill('redis', 'Redis', 'data', false),
    skill('prometheus', 'Prometheus', 'data', false),
    skill('grafana', 'Grafana', 'data', false),
    skill('etl', 'ETL pipelines', 'data', false),
    skill('nlp', 'NLP', 'data', false),
    skill('openstreetmap', 'OpenStreetMap', 'data', false),
    skill('tdd', 'TDD', 'quality', false),
    skill('ci-cd', 'CI/CD', 'quality', false),
    skill('k6', 'k6', 'quality', false),
    skill('mentoring', 'Mentoring', 'quality', false),
    skill('react', 'React', 'frontend', false),
    skill('angular', 'Angular', 'frontend', false),
    skill('javascript', 'JavaScript', 'frontend', false),
  ],
  experiences: [
    {
      slug: 'warner-bros-discovery',
      company: 'Warner Bros. Discovery (Eurosport)',
      role: softwareEngineer,
      startMonth: '2024-03',
      endMonth: null,
      location: 'Issy-les-Moulineaux, FR',
      summary: {
        en: 'Eurosport content APIs and their AWS infrastructure, through the Olympics and the HBO Max launches.',
        fr: 'Les API de contenu d’Eurosport et leur infrastructure AWS, pendant les Jeux olympiques et les lancements de HBO Max.',
      },
      highlights: {
        en: [
          'Migrated backend services from Serverless framework to Terraform.',
          'Extended core GraphQL content API for Eurosport (Olympics, HBO Max launches).',
          'Engineered zero-downtime DynamoDB → PostgreSQL data migration.',
          'Introduced caching strategies and SQS/SNS stabilization for high-visibility events.',
        ],
        fr: [
          'Migration des services backend du framework Serverless vers Terraform.',
          'Évolution de l’API GraphQL de contenu d’Eurosport (Jeux olympiques, lancements de HBO Max).',
          'Migration des données de DynamoDB vers PostgreSQL sans interruption de service.',
          'Stratégies de cache et stabilisation SQS/SNS pour les événements à forte visibilité.',
        ],
      },
      skillSlugs: [
        'typescript',
        'graphql',
        'aws',
        'terraform',
        'postgresql',
        'dynamodb',
        'sqs',
        'sns',
      ],
    },
    {
      slug: 'euronews',
      company: 'Euronews',
      role: softwareEngineer,
      startMonth: '2023-03',
      endMonth: '2024-03',
      location: 'Lyon, FR',
      summary: {
        en: 'Backend APIs and AWS infrastructure of a news platform with about 2 million daily active users.',
        fr: 'Les API backend et l’infrastructure AWS d’une plateforme d’information d’environ 2 millions d’utilisateurs actifs par jour.',
      },
      highlights: {
        en: [
          'Maintained backend APIs / EC2 infra for ~2M daily active users.',
          'Led test coverage from 5% → 65% (TypeScript: 20% → 55%).',
          'Migrated critical legacy components from JavaScript to strict TypeScript.',
        ],
        fr: [
          'Maintenance des API backend et de l’infrastructure EC2 pour environ 2 millions d’utilisateurs actifs par jour.',
          'Couverture de tests portée de 5 % à 65 % (TypeScript : de 20 % à 55 %).',
          'Migration de composants critiques de JavaScript vers TypeScript strict.',
        ],
      },
      skillSlugs: ['typescript', 'nodejs', 'aws', 'ec2', 'tdd'],
    },
    {
      slug: 'numer-hei',
      company: 'Numer · HEI',
      role: leadDeveloper,
      startMonth: '2022-01',
      endMonth: '2023-03',
      location: 'Paris, FR',
      summary: {
        en: 'A web and mobile platform for craftsmen, led from concept to production.',
        fr: 'Une plateforme web et mobile pour les artisans, menée de la conception à la production.',
      },
      highlights: {
        en: [
          'Directed web + mobile platform for craftsmen, concept → production.',
          'Coordinated mobile, back-office, landing teams; shaped core architecture.',
        ],
        fr: [
          'Pilotage d’une plateforme web et mobile pour artisans, de la conception à la production.',
          'Coordination des équipes mobile, back-office et site vitrine ; choix d’architecture structurants.',
        ],
      },
      skillSlugs: ['react', 'typescript'],
    },
    {
      slug: 'novity',
      company: 'Novity',
      role: softwareDeveloper,
      startMonth: '2021-09',
      endMonth: '2023-03',
      location: 'Antananarivo, MG',
      summary: {
        en: 'Test coverage and team mentoring during a move from a monolith to an API-driven architecture.',
        fr: 'Couverture de tests et mentorat des équipes pendant le passage d’un monolithe à une architecture orientée API.',
      },
      highlights: {
        en: [
          'Boosted React/TypeScript frontend coverage 50% → 70%, Java/Spring 20% → 39%.',
          'Mentored three technical teams; transitioned monolith → API-driven.',
        ],
        fr: [
          'Couverture du frontend React/TypeScript portée de 50 % à 70 %, et de Java/Spring de 20 % à 39 %.',
          'Mentorat de trois équipes techniques ; passage d’un monolithe à une architecture orientée API.',
        ],
      },
      skillSlugs: ['react', 'typescript', 'java', 'spring-boot', 'tdd', 'mentoring'],
    },
    {
      slug: 'bocasay',
      company: 'Bocasay',
      role: softwareEngineer,
      startMonth: '2020-02',
      endMonth: '2021-08',
      location: 'Antananarivo, MG',
      summary: {
        en: 'Modernization of a legacy monolith into a single-page application, with a faster delivery pipeline.',
        fr: 'Modernisation d’un monolithe existant en application monopage, avec une chaîne de livraison plus rapide.',
      },
      highlights: {
        en: [
          'Refactored legacy monolith → SPA: +40% speed, −30% load times.',
          'Streamlined CI/CD: −25% time-to-market.',
        ],
        fr: [
          'Refonte d’un monolithe existant en application monopage : +40 % de rapidité, −30 % de temps de chargement.',
          'Chaîne CI/CD simplifiée : −25 % de délai de mise sur le marché.',
        ],
      },
      skillSlugs: ['javascript', 'ci-cd'],
    },
    {
      slug: 'itras-group',
      company: 'ITRAS Group',
      role: softwareEngineer,
      startMonth: '2018-10',
      endMonth: '2020-02',
      location: 'Antananarivo, MG',
      summary: {
        en: 'Migration of an application to Angular and Spring Boot, with test coverage built from scratch.',
        fr: 'Migration d’une application vers Angular et Spring Boot, avec une couverture de tests construite de zéro.',
      },
      highlights: {
        en: [
          'Migrated frontend → Angular/TypeScript, backend → Spring Boot. −40% load.',
          'Drove code coverage 0% → 82%.',
        ],
        fr: [
          'Migration du frontend vers Angular/TypeScript et du backend vers Spring Boot : −40 % de charge.',
          'Couverture de code portée de 0 % à 82 %.',
        ],
      },
      skillSlugs: ['angular', 'typescript', 'spring-boot', 'tdd'],
    },
    {
      slug: 'allo-application',
      company: 'Allo Application',
      role: softwareDeveloper,
      startMonth: '2017-01',
      endMonth: '2018-09',
      location: null,
      summary: {
        en: 'My first role as a software developer.',
        fr: 'Mon premier poste de développeur logiciel.',
      },
      highlights: {
        en: ['Reduced API response times by 30%.'],
        fr: ['Temps de réponse des API réduits de 30 %.'],
      },
      skillSlugs: [],
    },
  ],
  projects: [
    {
      slug: 'eurosport-api-platform',
      kind: 'professional',
      icon: null,
      title: { en: 'Eurosport API platform', fr: 'Plateforme API Eurosport' },
      company: 'Warner Bros. Discovery',
      role: softwareEngineer,
      startYear: 2024,
      endYear: null,
      summary: {
        en: 'Extended core GraphQL content API for Olympics + HBO Max launches. Migrated infra from Serverless framework to Terraform. Engineered zero-downtime DynamoDB → PostgreSQL data migration with dual-run safety.',
        fr: 'Évolution de l’API GraphQL de contenu pour les Jeux olympiques et les lancements de HBO Max. Migration de l’infrastructure du framework Serverless vers Terraform. Migration des données de DynamoDB vers PostgreSQL sans interruption, sécurisée par une double exécution.',
      },
      caseStudy: null,
      skillSlugs: ['typescript', 'graphql', 'aws', 'terraform', 'postgresql', 'dynamodb'],
    },
    {
      slug: 'high-traffic-media-platform',
      kind: 'professional',
      icon: null,
      title: { en: 'High-traffic media platform', fr: 'Plateforme média à fort trafic' },
      company: 'Euronews',
      role: softwareEngineer,
      startYear: 2023,
      endYear: 2024,
      summary: {
        en: 'Maintained backend APIs and AWS EC2 infra serving ~2M daily active users. Led a quality initiative raising platform test coverage from 5% to 65%, and TypeScript-specific coverage from 20% to 55%.',
        fr: 'Maintenance des API backend et de l’infrastructure AWS EC2 pour environ 2 millions d’utilisateurs actifs par jour. Pilotage d’une démarche qualité qui a porté la couverture de tests de 5 % à 65 %, et celle du code TypeScript de 20 % à 55 %.',
      },
      caseStudy: null,
      skillSlugs: ['typescript', 'aws', 'ec2', 'nodejs'],
    },
    {
      slug: 'saas-for-craftsmen',
      kind: 'professional',
      icon: null,
      title: { en: 'SaaS for craftsmen', fr: 'SaaS pour artisans' },
      company: 'Numer · HEI',
      role: leadDeveloper,
      startYear: 2022,
      endYear: 2023,
      summary: {
        en: 'Directed a web + mobile platform from concept to production. Coordinated mobile, back-office, and landing teams. Shaped core architectural decisions.',
        fr: 'Pilotage d’une plateforme web et mobile de la conception à la production. Coordination des équipes mobile, back-office et site vitrine. Choix d’architecture structurants.',
      },
      caseStudy: null,
      skillSlugs: ['react', 'typescript'],
    },
    {
      slug: 'visa-insight',
      kind: 'personal',
      icon: 'brain-circuit',
      title: { en: 'Visa Insight', fr: 'Visa Insight' },
      company: null,
      role: null,
      startYear: null,
      endYear: null,
      summary: {
        en: 'NLP & AI-assisted case review. End-to-end case review platform with a rules-first multilingual extraction pipeline (French/Malagasy). Evidence-linked workspace lets analysts validate machine outputs against raw texts. Self-hosted VPS with fully automated CI/CD.',
        fr: 'Analyse de dossiers assistée par le NLP et l’IA. Plateforme complète d’analyse de dossiers, avec une chaîne d’extraction multilingue fondée d’abord sur des règles (français/malgache). Un espace de travail relié aux preuves permet aux analystes de valider les résultats de la machine face aux textes bruts. Hébergée sur un VPS, avec une CI/CD entièrement automatisée.',
      },
      caseStudy: null,
      skillSlugs: ['nlp', 'ci-cd'],
    },
    {
      slug: 'lalana-lemurion',
      kind: 'personal',
      icon: 'map',
      title: { en: 'Lalana & Lemurion', fr: 'Lalana et Lemurion' },
      company: null,
      role: null,
      startYear: null,
      endYear: null,
      summary: {
        en: 'Geospatial & transit systems. Geospatial nav stack from scratch: OSM ingestion pipeline, routing backend with Redis caching. Full-stack transit planning platform with editable network graph, distributed tracing, k6 load testing.',
        fr: 'Systèmes géospatiaux et de transport. Une pile de navigation géospatiale construite de zéro : chaîne d’ingestion OSM, backend de calcul d’itinéraires avec cache Redis. Une plateforme complète de planification des transports, avec un graphe de réseau modifiable, du traçage distribué et des tests de charge k6.',
      },
      caseStudy: null,
      skillSlugs: ['openstreetmap', 'redis', 'k6'],
    },
    {
      slug: 'cloud-platform-maestro',
      kind: 'personal',
      icon: 'workflow',
      title: { en: 'Cloud Platform · Maestro', fr: 'Plateforme cloud · Maestro' },
      company: null,
      role: null,
      startYear: null,
      endYear: null,
      summary: {
        en: 'Personal cloud + Elixir orchestrator. Personal cloud platform: Caddy ingress, PostgreSQL, Redis, Prometheus/Grafana observability. Authored “Maestro”, an Elixir-based orchestrator using state machines and supervision trees to automate ticket-to-PR workflows.',
        fr: 'Cloud personnel et orchestrateur Elixir. Plateforme cloud personnelle : entrée Caddy, PostgreSQL, Redis, observabilité Prometheus/Grafana. Conception de « Maestro », un orchestrateur Elixir qui s’appuie sur des machines à états et des arbres de supervision pour automatiser le passage d’un ticket à une pull request.',
      },
      caseStudy: null,
      skillSlugs: ['elixir', 'caddy', 'postgresql', 'redis', 'prometheus', 'grafana'],
    },
  ],
  keyFigures: [
    {
      slug: 'years-experience',
      value: '8+',
      label: { en: 'Years of experience', fr: 'Années d’expérience' },
    },
    {
      slug: 'daily-users',
      value: '~2M',
      label: { en: 'Daily users served', fr: 'Utilisateurs servis chaque jour' },
    },
    {
      slug: 'coverage-achieved',
      value: '82%',
      label: { en: 'Coverage achieved', fr: 'Couverture atteinte' },
    },
  ],
  answers: [],
  chatSettings: {
    unknownReply: {
      en: 'I haven’t written an answer to that yet. Ask me something else, or send me the question and I’ll reply personally.',
      fr: 'Je n’ai pas encore rédigé de réponse à cette question. Posez-m’en une autre, ou envoyez-moi la question et je vous répondrai personnellement.',
    },
    refusalReply: {
      en: 'I’d rather keep this conversation about my work. Ask me about my projects, my stack or how I work.',
      fr: 'Je préfère garder cette conversation centrée sur mon travail. Interrogez-moi sur mes projets, ma stack ou ma façon de travailler.',
    },
    sensitiveTopics: [
      {
        slug: 'compensation',
        keywords: {
          en: ['salary', 'compensation', 'pay', 'daily rate', 'package'],
          fr: ['salaire', 'rémunération', 'prétentions', 'TJM', 'package'],
        },
        reply: {
          en: 'I prefer to discuss compensation directly, once we know the role fits. Send me a message and I’ll get back to you.',
          fr: 'Je préfère parler de rémunération directement, une fois que nous savons que le poste correspond. Envoyez-moi un message et je vous répondrai.',
        },
      },
      {
        slug: 'notice-period',
        keywords: {
          en: ['notice period', 'start date', 'when can you start'],
          fr: ['préavis', 'date de début', 'date de disponibilité'],
        },
        reply: {
          en: 'My start date depends on the role and the timing. Let’s discuss it directly: send me a message.',
          fr: 'Ma date de démarrage dépend du poste et du calendrier. Parlons-en directement : envoyez-moi un message.',
        },
      },
      {
        slug: 'work-conditions',
        keywords: {
          en: ['remote', 'hybrid', 'contract', 'freelance', 'relocation'],
          fr: ['télétravail', 'hybride', 'contrat', 'freelance', 'déménagement'],
        },
        reply: {
          en: 'Remote work, contract type and relocation depend on the role. I’d be glad to discuss them directly.',
          fr: 'Le télétravail, le type de contrat ou un déménagement dépendent du poste. J’en discuterai volontiers directement.',
        },
      },
      {
        slug: 'personal-life',
        keywords: {
          en: ['family', 'married', 'children', 'age', 'personal life'],
          fr: ['famille', 'marié', 'enfants', 'âge', 'vie privée'],
        },
        reply: {
          en: 'I keep my personal life out of this conversation, but I’m happy to talk about my work.',
          fr: 'Je garde ma vie personnelle en dehors de cette conversation, mais je parle volontiers de mon travail.',
        },
      },
      {
        slug: 'health',
        keywords: {
          en: ['health', 'illness', 'disability'],
          fr: ['santé', 'maladie', 'handicap'],
        },
        reply: {
          en: 'I don’t discuss health here. Let’s talk about my work instead.',
          fr: 'Je n’aborde pas la santé ici. Parlons plutôt de mon travail.',
        },
      },
      {
        slug: 'politics-religion',
        keywords: {
          en: ['politics', 'religion', 'vote'],
          fr: ['politique', 'religion', 'vote'],
        },
        reply: {
          en: 'I keep politics and religion out of professional conversations.',
          fr: 'Je laisse la politique et la religion en dehors des échanges professionnels.',
        },
      },
    ],
    suggestedTopics: {
      en: [
        'My background',
        'Cloud and infrastructure work',
        'How I approach quality',
        'Side projects',
      ],
      fr: [
        'Mon parcours',
        'Mon travail cloud et infrastructure',
        'Ma façon d’aborder la qualité',
        'Mes projets personnels',
      ],
    },
  },
  siteSettings: {
    title: {
      en: 'Ny Hasinavalona Randriantsarafara | Senior Backend & Cloud Engineer | Software Architect',
      fr: 'Ny Hasinavalona Randriantsarafara | Ingénieur backend et cloud senior | Architecte logiciel',
    },
    description: {
      en: 'Senior Software Engineer. Design-then-implement, deterministic rules. Building infrastructure that gets out of the way.',
      fr: 'Ingénieur logiciel senior. Concevoir avant d’implémenter, règles déterministes. Des infrastructures qui savent se faire oublier.',
    },
  },
};
```

Run: `pnpm --filter @portfolio/cms-provision test`
Expected: PASS (28 tests).

- [ ] **Step 3: Seed once, resumably**

`cms/provision/src/seed/seed-initial-content.ts`:

```ts
import { createItems, readItems, updateSingleton } from '@directus/sdk';
import { toWorkingRecords } from '@portfolio/cms-schema';

import type { AdminClient, Log } from '../directus-client.ts';
import { initialContent } from './initial-content.ts';

// Seeding runs only while no experience exists; within a run, items whose slug already
// exists are skipped so an interrupted run can be resumed.
export async function seedInitialContent(client: AdminClient, log: Log): Promise<void> {
  const experiences = await client.request(readItems('experiences', { fields: ['id'], limit: 1 }));
  if (experiences.length > 0) {
    log('Initial content skipped: experiences already exist.');
    return;
  }
  const records = toWorkingRecords(initialContent);

  await client.request(updateSingleton('profile', records.profile));
  await client.request(updateSingleton('chat_settings', records.chatSettings));
  await client.request(updateSingleton('site_settings', records.siteSettings));
  await client.request(
    createItems(
      'capabilities',
      missingBySlug(records.capabilities, await readSlugs(client, 'capabilities'))
    )
  );
  await client.request(
    createItems('skills', missingBySlug(records.skills, await readSlugs(client, 'skills')))
  );
  await client.request(
    createItems(
      'key_figures',
      missingBySlug(records.keyFigures, await readSlugs(client, 'key_figures'))
    )
  );
  await client.request(
    createItems('projects', missingBySlug(records.projects, await readSlugs(client, 'projects')))
  );
  await client.request(createItems('experiences', records.experiences));
  log(
    `Initial content loaded: ${records.experiences.length} experiences, ${records.projects.length} projects, ${records.skills.length} skills.`
  );
}

type SluggedCollection = 'capabilities' | 'skills' | 'key_figures' | 'projects';

async function readSlugs(
  client: AdminClient,
  collection: SluggedCollection
): Promise<ReadonlySet<string>> {
  const items = await client.request(readItems(collection, { fields: ['slug'], limit: -1 }));
  return new Set(items.map((item) => item.slug));
}

function missingBySlug<Item extends { slug: string }>(
  items: readonly Item[],
  existingSlugs: ReadonlySet<string>
): Item[] {
  return items.filter((item) => !existingSlugs.has(item.slug));
}
```

In `cms/provision/src/main.ts`, add the import:

```ts
import { seedInitialContent } from './seed/seed-initial-content.ts';
```

and seed after the settings:

```ts
await ensureSettings(client, environment, assistantProtocol, log);
if (environment.seedInitialContent) {
  await seedInitialContent(client, log);
}
log('Provisioning complete.');
```

- [ ] **Step 4: Write the seeding integration test**

`cms/tests/src/seed.test.ts`:

```ts
import { readItems, readSingleton } from '@directus/sdk';
import { initialContent } from '@portfolio/cms-provision/seed';
import { describe, expect, it } from 'vitest';

import { adminClient } from './support/clients.ts';

describe('initial content', () => {
  it('loads every initial experience, project and skill', async () => {
    const [experiences, projects, skills] = await Promise.all([
      adminClient.request(readItems('experiences', { fields: ['slug'], limit: -1 })),
      adminClient.request(readItems('projects', { fields: ['slug'], limit: -1 })),
      adminClient.request(readItems('skills', { fields: ['slug'], limit: -1 })),
    ]);

    expect(experiences.map((item) => item.slug)).toEqual(
      expect.arrayContaining(initialContent.experiences.map((item) => item.slug))
    );
    expect(projects.map((item) => item.slug)).toEqual(
      expect.arrayContaining(initialContent.projects.map((item) => item.slug))
    );
    expect(skills.map((item) => item.slug)).toEqual(
      expect.arrayContaining(initialContent.skills.map((item) => item.slug))
    );
  });

  it('fills the profile', async () => {
    const profile = await adminClient.request(readSingleton('profile', { fields: ['name'] }));

    expect(profile.name).toBe(initialContent.profile.name);
  });
});
```

- [ ] **Step 5: Provision twice and run the tests**

Run: `pnpm provision && pnpm provision`
Expected: the first run logs `Initial content loaded: 7 experiences, 6 projects, 32 skills.`; the second logs `Initial content skipped: experiences already exist.`

Run: `pnpm test:cms && pnpm typecheck && pnpm test`
Expected: integration PASS (29 tests); typecheck and unit tests PASS.

- [ ] **Step 6: Commit**

```bash
git add cms/provision cms/tests
git commit -m "feat(cms): seed the current site content with French drafts"
```

---

### Task 9: Publication extension with the prepare operation

**Files:**

- Create: `cms/extensions/publication/package.json`, `cms/extensions/publication/tsconfig.json`
- Create: `cms/extensions/publication/src/errors.ts`, `src/guards.ts`, `src/publication-store.ts`, `src/directus-store.ts`, `src/testing/fake-store.ts`
- Create: `cms/extensions/publication/src/prepare-publication/prepare.ts`, `api.ts`, `app.ts`
- Modify: `package.json` (scripts), `pnpm-workspace.yaml`, `compose.yaml` (extension mount)
- Test: `cms/extensions/publication/src/prepare-publication/prepare.test.ts`

**Interfaces:**

- Consumes: `buildPublicationContent`, `WorkingRecords`, `PublicationStatus` (Task 4), `storedRecordsOf` (Task 4 testing export), `summarizeChanges`, `hasChanges`, `formatChangeOverview` (Task 3), `publicationContentSchema`, `PublicationProblem` (Task 2), `PREPARE_OPERATION` (Task 4).
- Produces:
  - `type PublicationStore` with `readWorkingRecords()`, `readActivePublication()`, `readPublication(id)`, `savePrepared(publication)`, `activate(id, activatedAt)`; `type StoredPublication = { id; status; content: unknown }`; `type PreparedPublication = { content; changes; changesOverview }`
  - `openPublicationStore(context: OperationContext): Promise<PublicationStore>` (refuses a call without accountability)
  - Errors `PublicationInvalidError`, `NothingToPublishError`, `PublicationSelectionError`, `PublicationStateError`, `PublicationHookError`, `PublicationConfigurationError`, and `invalidContentError(problems)`
  - `planPreparation(records, active): PreparedPublication`, `preparePublication(store): Promise<{ publication; status: 'prepared'; overview }>`
  - Test support `fakeStore(overrides)`
  - Root script `build:extension`; `cms:up` builds the extension first

Both operations read and write through `ItemsService` with the triggering user's accountability, so Directus permissions apply: the assistant cannot write publications even through a flow. Decisions (`planPreparation`, and `planActivation` in Task 10) are pure functions tested without Directus; the store adapter is covered by the integration tests of Task 11.

- [ ] **Step 1: Create the extension package and its shared modules**

`cms/extensions/publication/package.json`:

```json
{
  "name": "directus-extension-publication",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "directus:extension": {
    "type": "bundle",
    "path": {
      "app": "dist/app.js",
      "api": "dist/api.js"
    },
    "entries": [
      {
        "type": "operation",
        "name": "prepare-publication",
        "source": {
          "app": "src/prepare-publication/app.ts",
          "api": "src/prepare-publication/api.ts"
        }
      }
    ],
    "host": "^12.5.0"
  },
  "scripts": {
    "build": "directus-extension build",
    "dev": "directus-extension build --watch --no-minify",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@directus/errors": "3.0.0",
    "@portfolio/cms-schema": "workspace:*",
    "@portfolio/content": "workspace:*"
  },
  "devDependencies": {
    "@directus/extensions-sdk": "18.0.6",
    "@directus/types": "18.0.0",
    "@types/node": "^24.19.2",
    "knex": "3.1.0",
    "pino": "9.7.0",
    "typescript": "~6.0.3",
    "vite": "^8.1.2",
    "vitest": "^5.0.3"
  }
}
```

`cms/extensions/publication/tsconfig.json`:

```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler"
  },
  "include": ["src"]
}
```

`cms/extensions/publication/src/errors.ts`:

```ts
import { createError } from '@directus/errors';
import type { PublicationProblem } from '@portfolio/content';

export const PublicationInvalidError = createError<{ problems: string }>(
  'PUBLICATION_INVALID',
  ({ problems }) => `The content cannot be published yet:\n${problems}`,
  400
);

export const NothingToPublishError = createError(
  'NOTHING_TO_PUBLISH',
  'Nothing changed since the active publication.',
  400
);

export const PublicationSelectionError = createError(
  'PUBLICATION_SELECTION',
  'Select exactly one publication.',
  400
);

export const PublicationStateError = createError<{ status: string }>(
  'PUBLICATION_STATE',
  ({ status }) => `A ${status} publication cannot be published. Prepare a new one.`,
  409
);

export const PublicationHookError = createError<{ publication: string; reason: string }>(
  'PUBLICATION_HOOK_FAILED',
  ({ publication, reason }) =>
    `Publication ${publication} is active, but the API was not notified (${reason}). Run Publish on it again to retry.`,
  502
);

export const PublicationConfigurationError = createError<{ variable: string }>(
  'PUBLICATION_CONFIGURATION',
  ({ variable }) => `Incomplete configuration: ${variable} is missing.`,
  503
);

export function invalidContentError(problems: readonly PublicationProblem[]) {
  return new PublicationInvalidError({
    problems: problems.map((problem) => `- ${problem.path}: ${problem.message}`).join('\n'),
  });
}
```

`cms/extensions/publication/src/guards.ts`:

```ts
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
```

`cms/extensions/publication/src/publication-store.ts`:

```ts
import type { PublicationStatus, WorkingRecords } from '@portfolio/cms-schema';
import type { ChangeSummary, PublicationContent } from '@portfolio/content';

export type StoredPublication = { id: string; status: PublicationStatus; content: unknown };

export type PreparedPublication = {
  content: PublicationContent;
  changes: ChangeSummary;
  changesOverview: string;
};

export type PublicationStore = {
  readWorkingRecords(): Promise<WorkingRecords>;
  readActivePublication(): Promise<StoredPublication | null>;
  readPublication(id: string): Promise<StoredPublication>;
  /** Discards every earlier prepared publication in the same transaction. Returns the new id. */
  savePrepared(publication: PreparedPublication): Promise<string>;
  /** Supersedes the active publication in the same transaction. */
  activate(id: string, activatedAt: Date): Promise<void>;
};
```

- [ ] **Step 2: Write the failing preparation tests**

`cms/extensions/publication/src/testing/fake-store.ts`:

```ts
import { storedRecordsOf } from '@portfolio/cms-schema/testing';
import { contentFixture } from '@portfolio/content/testing';
import { vi } from 'vitest';

import type { PublicationStore } from '../publication-store.ts';

export function fakeStore(overrides: Partial<PublicationStore> = {}): PublicationStore {
  return {
    readWorkingRecords: vi.fn<PublicationStore['readWorkingRecords']>(async () =>
      storedRecordsOf(contentFixture)
    ),
    readActivePublication: vi.fn<PublicationStore['readActivePublication']>(async () => null),
    readPublication: vi.fn<PublicationStore['readPublication']>(async (id) => ({
      id,
      status: 'prepared',
      content: contentFixture,
    })),
    savePrepared: vi.fn<PublicationStore['savePrepared']>(async () => 'prepared-publication'),
    activate: vi.fn<PublicationStore['activate']>(async () => undefined),
    ...overrides,
  };
}
```

`cms/extensions/publication/src/prepare-publication/prepare.test.ts`:

```ts
import type { WorkingRecords } from '@portfolio/cms-schema';
import { storedRecordsOf } from '@portfolio/cms-schema/testing';
import { contentFixture, warnerExperience } from '@portfolio/content/testing';
import { describe, expect, it, vi } from 'vitest';

import { NothingToPublishError, PublicationInvalidError } from '../errors.ts';
import type { PublicationStore, StoredPublication } from '../publication-store.ts';
import { fakeStore } from '../testing/fake-store.ts';
import { planPreparation, preparePublication } from './prepare.ts';

const records = storedRecordsOf(contentFixture);

function activePublication(content: unknown): StoredPublication {
  return { id: 'active-publication', status: 'active', content };
}

describe('planPreparation', () => {
  it('prepares the first publication from the working records', () => {
    const prepared = planPreparation(records, null);

    expect(prepared.content).toEqual(contentFixture);
    expect(prepared.changes.firstPublication).toBe(true);
    expect(prepared.changesOverview).toContain('First publication.');
  });

  it('refuses a missing French text and names the item and field', () => {
    const edited: WorkingRecords = {
      ...records,
      experiences: records.experiences.map((experience) => ({ ...experience, summary_fr: null })),
    };

    expect(() => planPreparation(edited, null)).toThrow(PublicationInvalidError);
    expect(() => planPreparation(edited, null)).toThrow(
      `experiences[${warnerExperience.slug}].summary.fr`
    );
  });

  it('refuses when nothing changed since the active publication', () => {
    expect(() => planPreparation(records, activePublication(contentFixture))).toThrow(
      NothingToPublishError
    );
  });

  it('summarizes the changes since the active publication', () => {
    const edited: WorkingRecords = {
      ...records,
      siteSettings: { ...records.siteSettings, description_en: 'A new description.' },
    };

    const prepared = planPreparation(edited, activePublication(contentFixture));

    expect(prepared.changes.singletons.siteSettings).toEqual(['description']);
    expect(prepared.changesOverview).toContain('Changes since the active publication:');
  });

  it('treats an active publication it cannot read as no publication', () => {
    const prepared = planPreparation(records, activePublication({ profile: 'outdated' }));

    expect(prepared.changes.firstPublication).toBe(true);
  });
});

describe('preparePublication', () => {
  it('stores the prepared publication and returns its overview', async () => {
    const savePrepared = vi.fn<PublicationStore['savePrepared']>(
      async () => 'prepared-publication'
    );
    const expected = planPreparation(records, null);

    const result = await preparePublication(fakeStore({ savePrepared }));

    expect(result).toEqual({
      publication: 'prepared-publication',
      status: 'prepared',
      overview: expected.changesOverview,
    });
    expect(savePrepared).toHaveBeenCalledWith(expected);
  });
});
```

Append to `pnpm-workspace.yaml` (the extension SDK pulls in `vue-demi`, whose install script the build does not need):

```yaml
ignoredBuiltDependencies:
  - vue-demi
```

Run: `pnpm install && pnpm --filter directus-extension-publication test`
Expected: no "Ignored build scripts" warning; FAIL, `Cannot find module './prepare.ts'`.

- [ ] **Step 3: Implement the preparation**

`cms/extensions/publication/src/prepare-publication/prepare.ts`:

```ts
import { buildPublicationContent } from '@portfolio/cms-schema';
import type { WorkingRecords } from '@portfolio/cms-schema';
import {
  formatChangeOverview,
  hasChanges,
  publicationContentSchema,
  summarizeChanges,
} from '@portfolio/content';
import type { PublicationContent } from '@portfolio/content';

import { invalidContentError, NothingToPublishError } from '../errors.ts';
import type {
  PreparedPublication,
  PublicationStore,
  StoredPublication,
} from '../publication-store.ts';

export type PreparationResult = { publication: string; status: 'prepared'; overview: string };

export function planPreparation(
  records: WorkingRecords,
  active: StoredPublication | null
): PreparedPublication {
  const validation = buildPublicationContent(records);
  if (!validation.valid) {
    throw invalidContentError(validation.problems);
  }
  const changes = summarizeChanges(readContent(active), validation.content);
  if (!hasChanges(changes)) {
    throw new NothingToPublishError();
  }
  return { content: validation.content, changes, changesOverview: formatChangeOverview(changes) };
}

export async function preparePublication(store: PublicationStore): Promise<PreparationResult> {
  const prepared = planPreparation(
    await store.readWorkingRecords(),
    await store.readActivePublication()
  );
  const publication = await store.savePrepared(prepared);
  return { publication, status: 'prepared', overview: prepared.changesOverview };
}

// Parsing restores the schema's key order, which the change summary relies on. An active
// publication written with an older schema is compared as if there were none.
function readContent(publication: StoredPublication | null): PublicationContent | null {
  if (publication === null) {
    return null;
  }
  const parsed = publicationContentSchema.safeParse(publication.content);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}
```

Run: `pnpm --filter directus-extension-publication test`
Expected: PASS (6 tests).

- [ ] **Step 4: Write the Directus store and the operation**

`cms/extensions/publication/src/directus-store.ts`:

```ts
import { ForbiddenError } from '@directus/errors';
import type {
  Accountability,
  ApiExtensionContext,
  Item,
  OperationContext,
  Query,
  SchemaOverview,
} from '@directus/types';
import type {
  AnswerRecord,
  CapabilityRecord,
  ChatSettingsRecord,
  ExperienceRecord,
  KeyFigureRecord,
  ProfileRecord,
  ProjectRecord,
  PublicationRecord,
  SiteSettingsRecord,
  SkillRecord,
  WorkingRecords,
} from '@portfolio/cms-schema';
import type { Knex } from 'knex';

import type {
  PreparedPublication,
  PublicationStore,
  StoredPublication,
} from './publication-store.ts';

type DirectusAccess = {
  services: ApiExtensionContext['services'];
  database: Knex;
  accountability: Accountability;
  schema: SchemaOverview;
};

const ALL_ITEMS: Query = { fields: ['*'], limit: -1 };
const SINGLETON: Query = { fields: ['*'] };
const PUBLICATION_FIELDS: Query = { fields: ['id', 'status', 'content'] };

export async function openPublicationStore(context: OperationContext): Promise<PublicationStore> {
  if (context.accountability === null) {
    throw new ForbiddenError();
  }
  return createDirectusStore({
    services: context.services,
    database: context.database,
    accountability: context.accountability,
    schema: await context.getSchema(),
  });
}

function createDirectusStore(access: DirectusAccess): PublicationStore {
  return {
    readWorkingRecords: () => readWorkingRecords(access),
    readActivePublication: () => readActivePublication(access),
    readPublication: (id) => readPublication(access, id),
    savePrepared: (publication) => savePrepared(access, publication),
    activate: (id, activatedAt) => activate(access, id, activatedAt),
  };
}

function itemsOf<StoredItem extends Item>(
  access: DirectusAccess,
  collection: string,
  knex: Knex = access.database
) {
  return new access.services.ItemsService<StoredItem>(collection, {
    accountability: access.accountability,
    schema: access.schema,
    knex,
  });
}

async function readWorkingRecords(access: DirectusAccess): Promise<WorkingRecords> {
  const [
    profile,
    capabilities,
    skills,
    experiences,
    projects,
    keyFigures,
    answers,
    chatSettings,
    siteSettings,
  ] = await Promise.all([
    itemsOf<ProfileRecord>(access, 'profile').readSingleton(SINGLETON),
    itemsOf<CapabilityRecord>(access, 'capabilities').readByQuery(ALL_ITEMS),
    itemsOf<SkillRecord>(access, 'skills').readByQuery(ALL_ITEMS),
    itemsOf<ExperienceRecord>(access, 'experiences').readByQuery(ALL_ITEMS),
    itemsOf<ProjectRecord>(access, 'projects').readByQuery(ALL_ITEMS),
    itemsOf<KeyFigureRecord>(access, 'key_figures').readByQuery(ALL_ITEMS),
    itemsOf<AnswerRecord>(access, 'answers').readByQuery(ALL_ITEMS),
    itemsOf<ChatSettingsRecord>(access, 'chat_settings').readSingleton(SINGLETON),
    itemsOf<SiteSettingsRecord>(access, 'site_settings').readSingleton(SINGLETON),
  ]);
  return {
    profile,
    capabilities,
    skills,
    experiences,
    projects,
    keyFigures,
    answers,
    chatSettings,
    siteSettings,
  };
}

async function readActivePublication(access: DirectusAccess): Promise<StoredPublication | null> {
  const [active] = await itemsOf<PublicationRecord>(access, 'publications').readByQuery({
    ...PUBLICATION_FIELDS,
    filter: { status: { _eq: 'active' } },
    limit: 1,
  });
  if (active === undefined) {
    return null;
  }
  return toStoredPublication(active);
}

async function readPublication(access: DirectusAccess, id: string): Promise<StoredPublication> {
  const publication = await itemsOf<PublicationRecord>(access, 'publications').readOne(
    id,
    PUBLICATION_FIELDS
  );
  return toStoredPublication(publication);
}

async function savePrepared(
  access: DirectusAccess,
  publication: PreparedPublication
): Promise<string> {
  return access.database.transaction(async (transaction) => {
    const publications = itemsOf<PublicationRecord>(access, 'publications', transaction);
    await publications.updateByQuery(
      { filter: { status: { _eq: 'prepared' } }, limit: -1 },
      { status: 'discarded' }
    );
    const id = await publications.createOne({
      status: 'prepared',
      content: publication.content,
      changes: publication.changes,
      changes_overview: publication.changesOverview,
    });
    return String(id);
  });
}

async function activate(access: DirectusAccess, id: string, activatedAt: Date): Promise<void> {
  await access.database.transaction(async (transaction) => {
    const publications = itemsOf<PublicationRecord>(access, 'publications', transaction);
    await publications.updateByQuery(
      { filter: { status: { _eq: 'active' } }, limit: -1 },
      { status: 'superseded' }
    );
    await publications.updateOne(id, { status: 'active', activated_at: activatedAt.toISOString() });
  });
}

function toStoredPublication(record: PublicationRecord): StoredPublication {
  return { id: record.id, status: record.status, content: record.content };
}
```

`cms/extensions/publication/src/prepare-publication/api.ts`:

```ts
import { defineOperationApi } from '@directus/extensions-sdk';
import { PREPARE_OPERATION } from '@portfolio/cms-schema/operations';

import { openPublicationStore } from '../directus-store.ts';
import { preparePublication } from './prepare.ts';

export default defineOperationApi<Record<string, never>>({
  id: PREPARE_OPERATION,
  handler: async (_options, context) => preparePublication(await openPublicationStore(context)),
});
```

`cms/extensions/publication/src/prepare-publication/app.ts`:

```ts
import { defineOperationApp } from '@directus/extensions-sdk';
import { PREPARE_OPERATION } from '@portfolio/cms-schema/operations';

export default defineOperationApp({
  id: PREPARE_OPERATION,
  name: 'Prepare publication',
  icon: 'fact_check',
  description:
    'Validates the working content and stores it as a prepared publication with its changes.',
  overview: () => [
    { label: 'Effect', text: 'Discards earlier prepared publications. Publishes nothing.' },
  ],
  options: [],
});
```

- [ ] **Step 5: Build the extension into the local stack**

In the root `package.json` scripts, replace `cms:up` and add `build:extension`:

```json
    "build:extension": "pnpm --filter directus-extension-publication build",
    "cms:up": "pnpm build:extension && docker compose up -d --wait",
```

In `compose.yaml`, mount the extension in the `directus` service:

<!-- prettier-ignore -->
```yaml
    volumes:
      - uploads:/directus/uploads
      - ./cms/extensions/publication:/directus/extensions/publication:ro
```

Run: `pnpm cms:up && docker compose logs directus | grep -i extension`
Expected: `cms/extensions/publication/dist/api.js` and `dist/app.js` exist (Rollup warnings about comments inside zod are harmless); the Directus log shows `Loaded extensions: directus-extension-publication` and no extension error.

Run: `pnpm typecheck && pnpm test && pnpm test:cms`
Expected: PASS; integration still 29 tests.

- [ ] **Step 6: Commit**

```bash
git add cms/extensions/publication package.json pnpm-workspace.yaml compose.yaml pnpm-lock.yaml
git commit -m "feat(cms): prepare validated publications with their changes"
```

---

### Task 10: Activate operation and API hook

**Files:**

- Create: `cms/extensions/publication/src/activate-publication/trigger.ts`, `hook.ts`, `activate.ts`, `api.ts`, `app.ts`
- Modify: `cms/extensions/publication/package.json` (second entry), `compose.yaml`, `.env.example`
- Test: `cms/extensions/publication/src/activate-publication/trigger.test.ts`, `hook.test.ts`, `activate.test.ts`

**Interfaces:**

- Consumes: `PublicationStore`, `openPublicationStore`, the errors and `fakeStore` (Task 9), `validatePublicationContent` (Task 2), `ACTIVATE_OPERATION` (Task 4).
- Produces:
  - `readSelectedPublicationId(flowData): string`
  - `readHookConfiguration(environment): HookConfiguration`, `notifyPublicationHook(configuration, publicationId, fetchHook): Promise<void>`; the hook receives `POST` with `Authorization: Bearer <PUBLICATION_HOOK_SECRET>` and body `{"publicationId":"<uuid>"}`, and must answer 2xx within 10 s
  - `planActivation(publication): 'activate' | 'notify-again'`, `activatePublication(publicationId, { store, notify, now }): Promise<{ publication; status: 'active'; step }>`
  - Environment `PUBLICATION_HOOK_URL`, `PUBLICATION_HOOK_SECRET` (required by `compose.yaml`)

- [ ] **Step 1: Write the failing tests**

`cms/extensions/publication/src/activate-publication/trigger.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { PublicationSelectionError } from '../errors.ts';
import { readSelectedPublicationId } from './trigger.ts';

describe('readSelectedPublicationId', () => {
  it('reads the single selected publication from the manual trigger', () => {
    expect(
      readSelectedPublicationId({
        $trigger: { body: { collection: 'publications', keys: ['publication-1'] } },
      })
    ).toBe('publication-1');
  });

  it.each([
    ['no trigger', {}],
    ['no body', { $trigger: {} }],
    ['no keys', { $trigger: { body: { collection: 'publications' } } }],
    ['several publications', { $trigger: { body: { keys: ['publication-1', 'publication-2'] } } }],
    ['a numeric key', { $trigger: { body: { keys: [42] } } }],
    ['an empty key', { $trigger: { body: { keys: [''] } } }],
  ])('rejects %s', (_case, flowData) => {
    expect(() => readSelectedPublicationId(flowData)).toThrow(PublicationSelectionError);
  });
});
```

`cms/extensions/publication/src/activate-publication/hook.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import { PublicationConfigurationError, PublicationHookError } from '../errors.ts';
import { notifyPublicationHook, readHookConfiguration } from './hook.ts';
import type { HookFetch } from './hook.ts';

const configuration = {
  url: 'http://api.test/internal/publications/activated',
  secret: 'hook-secret',
};

describe('readHookConfiguration', () => {
  it('reads the hook URL and secret', () => {
    expect(
      readHookConfiguration({
        PUBLICATION_HOOK_URL: configuration.url,
        PUBLICATION_HOOK_SECRET: configuration.secret,
      })
    ).toEqual(configuration);
  });

  it.each(['PUBLICATION_HOOK_URL', 'PUBLICATION_HOOK_SECRET'])('fails when %s is empty', (name) => {
    const environment = {
      PUBLICATION_HOOK_URL: configuration.url,
      PUBLICATION_HOOK_SECRET: configuration.secret,
      [name]: '',
    };

    expect(() => readHookConfiguration(environment)).toThrow(PublicationConfigurationError);
  });
});

describe('notifyPublicationHook', () => {
  it('posts the publication id with the shared secret', async () => {
    const fetchHook = vi.fn<HookFetch>(async () => new Response(null, { status: 204 }));

    await notifyPublicationHook(configuration, 'publication-1', fetchHook);

    expect(fetchHook).toHaveBeenCalledWith(
      configuration.url,
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer hook-secret', 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicationId: 'publication-1' }),
      })
    );
  });

  it('reports a refused call with its status', async () => {
    const fetchHook = vi.fn<HookFetch>(async () => new Response('Failure', { status: 500 }));

    await expect(notifyPublicationHook(configuration, 'publication-1', fetchHook)).rejects.toThrow(
      'Publication publication-1 is active, but the API was not notified (HTTP 500). Run Publish on it again to retry.'
    );
  });

  it('reports an unreachable API', async () => {
    const fetchHook = vi.fn<HookFetch>(async () => {
      throw new TypeError('fetch failed');
    });

    await expect(notifyPublicationHook(configuration, 'publication-1', fetchHook)).rejects.toThrow(
      PublicationHookError
    );
  });

  it('reports an API that does not answer in time', async () => {
    const fetchHook = vi.fn<HookFetch>(async () => {
      throw new DOMException('The operation timed out.', 'TimeoutError');
    });

    await expect(notifyPublicationHook(configuration, 'publication-1', fetchHook)).rejects.toThrow(
      '(no answer within 10 s)'
    );
  });
});
```

`cms/extensions/publication/src/activate-publication/activate.test.ts`:

```ts
import type { PublicationStatus } from '@portfolio/cms-schema';
import { contentFixture } from '@portfolio/content/testing';
import { describe, expect, it, vi } from 'vitest';

import { PublicationHookError, PublicationInvalidError, PublicationStateError } from '../errors.ts';
import type { PublicationStore, StoredPublication } from '../publication-store.ts';
import { fakeStore } from '../testing/fake-store.ts';
import { activatePublication, planActivation } from './activate.ts';
import type { NotifyApi } from './activate.ts';

const activatedAt = new Date('2026-10-13T09:00:00.000Z');

function publication(
  status: PublicationStatus,
  content: unknown = contentFixture
): StoredPublication {
  return { id: 'publication-1', status, content };
}

function storeWith(stored: StoredPublication, activate: PublicationStore['activate']) {
  return fakeStore({ readPublication: async () => stored, activate });
}

describe('planActivation', () => {
  it.each<PublicationStatus>(['prepared', 'superseded'])(
    'activates a valid %s publication',
    (status) => {
      expect(planActivation(publication(status))).toBe('activate');
    }
  );

  it('only notifies again for the active publication', () => {
    expect(planActivation(publication('active'))).toBe('notify-again');
  });

  it('refuses a discarded publication', () => {
    expect(() => planActivation(publication('discarded'))).toThrow(
      'A discarded publication cannot be published. Prepare a new one.'
    );
  });

  it('refuses a publication whose content is not valid', () => {
    expect(() => planActivation(publication('prepared', { profile: {} }))).toThrow(
      PublicationInvalidError
    );
  });
});

describe('activatePublication', () => {
  it('activates the publication, then notifies the API', async () => {
    const activate = vi.fn<PublicationStore['activate']>(async () => undefined);
    const notify = vi.fn<NotifyApi>(async () => undefined);

    const result = await activatePublication('publication-1', {
      store: storeWith(publication('prepared'), activate),
      notify,
      now: () => activatedAt,
    });

    expect(result).toEqual({ publication: 'publication-1', status: 'active', step: 'activate' });
    expect(activate).toHaveBeenCalledWith('publication-1', activatedAt);
    expect(activate).toHaveBeenCalledBefore(notify);
    expect(notify).toHaveBeenCalledWith('publication-1');
  });

  it('only notifies the API for the active publication', async () => {
    const activate = vi.fn<PublicationStore['activate']>(async () => undefined);
    const notify = vi.fn<NotifyApi>(async () => undefined);

    const result = await activatePublication('publication-1', {
      store: storeWith(publication('active'), activate),
      notify,
      now: () => activatedAt,
    });

    expect(result.step).toBe('notify-again');
    expect(activate).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith('publication-1');
  });

  it('keeps the activation when the API hook fails', async () => {
    const activate = vi.fn<PublicationStore['activate']>(async () => undefined);
    const notify = vi.fn<NotifyApi>(async () => {
      throw new PublicationHookError({ publication: 'publication-1', reason: 'HTTP 500' });
    });

    await expect(
      activatePublication('publication-1', {
        store: storeWith(publication('prepared'), activate),
        notify,
        now: () => activatedAt,
      })
    ).rejects.toThrow(PublicationHookError);
    expect(activate).toHaveBeenCalledWith('publication-1', activatedAt);
  });

  it('changes nothing for a discarded publication', async () => {
    const activate = vi.fn<PublicationStore['activate']>(async () => undefined);
    const notify = vi.fn<NotifyApi>(async () => undefined);

    await expect(
      activatePublication('publication-1', {
        store: storeWith(publication('discarded'), activate),
        notify,
        now: () => activatedAt,
      })
    ).rejects.toThrow(PublicationStateError);
    expect(activate).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });
});
```

Run: `pnpm --filter directus-extension-publication test`
Expected: FAIL, `Cannot find module './trigger.ts'` (and `./hook.ts`, `./activate.ts`).

- [ ] **Step 2: Implement the trigger, the hook and the activation**

`cms/extensions/publication/src/activate-publication/trigger.ts`:

```ts
import { PublicationSelectionError } from '../errors.ts';
import { isRecord } from '../guards.ts';

export function readSelectedPublicationId(flowData: Record<string, unknown>): string {
  const trigger = flowData['$trigger'];
  if (!isRecord(trigger)) {
    throw new PublicationSelectionError();
  }
  const body = trigger['body'];
  if (!isRecord(body)) {
    throw new PublicationSelectionError();
  }
  const keys = body['keys'];
  if (!Array.isArray(keys)) {
    throw new PublicationSelectionError();
  }
  const selectedKeys: unknown[] = keys;
  const [publicationId] = selectedKeys;
  if (selectedKeys.length !== 1 || typeof publicationId !== 'string' || publicationId === '') {
    throw new PublicationSelectionError();
  }
  return publicationId;
}
```

`cms/extensions/publication/src/activate-publication/hook.ts`:

```ts
import { PublicationConfigurationError, PublicationHookError } from '../errors.ts';

export type HookConfiguration = { url: string; secret: string };
export type HookFetch = (url: string, init: RequestInit) => Promise<Response>;

const HOOK_TIMEOUT_SECONDS = 10;

export function readHookConfiguration(environment: Record<string, unknown>): HookConfiguration {
  return {
    url: readVariable(environment, 'PUBLICATION_HOOK_URL'),
    secret: readVariable(environment, 'PUBLICATION_HOOK_SECRET'),
  };
}

export async function notifyPublicationHook(
  configuration: HookConfiguration,
  publicationId: string,
  fetchHook: HookFetch
): Promise<void> {
  const response = await callHook(configuration, publicationId, fetchHook);
  if (!response.ok) {
    throw new PublicationHookError({
      publication: publicationId,
      reason: `HTTP ${response.status}`,
    });
  }
}

function readVariable(environment: Record<string, unknown>, name: string): string {
  const value = environment[name];
  if (typeof value !== 'string' || value === '') {
    throw new PublicationConfigurationError({ variable: name });
  }
  return value;
}

async function callHook(
  configuration: HookConfiguration,
  publicationId: string,
  fetchHook: HookFetch
): Promise<Response> {
  try {
    return await fetchHook(configuration.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${configuration.secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicationId }),
      signal: AbortSignal.timeout(HOOK_TIMEOUT_SECONDS * 1000),
    });
  } catch (error) {
    throw new PublicationHookError({
      publication: publicationId,
      reason: describeNetworkFailure(error),
    });
  }
}

function describeNetworkFailure(error: unknown): string {
  if (error instanceof Error && error.name === 'TimeoutError') {
    return `no answer within ${HOOK_TIMEOUT_SECONDS} s`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'network failure';
}
```

`cms/extensions/publication/src/activate-publication/activate.ts`:

```ts
import { validatePublicationContent } from '@portfolio/content';

import { invalidContentError, PublicationStateError } from '../errors.ts';
import type { PublicationStore, StoredPublication } from '../publication-store.ts';

export type ActivationStep = 'activate' | 'notify-again';
export type NotifyApi = (publicationId: string) => Promise<void>;

export type ActivationResult = { publication: string; status: 'active'; step: ActivationStep };

export type ActivationDependencies = {
  store: PublicationStore;
  notify: NotifyApi;
  now: () => Date;
};

export function planActivation(publication: StoredPublication): ActivationStep {
  if (publication.status === 'active') {
    return 'notify-again';
  }
  if (publication.status === 'discarded') {
    throw new PublicationStateError({ status: publication.status });
  }
  // The owner may edit a publication row by hand: only valid content goes live.
  const validation = validatePublicationContent(publication.content);
  if (!validation.valid) {
    throw invalidContentError(validation.problems);
  }
  return 'activate';
}

export async function activatePublication(
  publicationId: string,
  dependencies: ActivationDependencies
): Promise<ActivationResult> {
  const publication = await dependencies.store.readPublication(publicationId);
  const step = planActivation(publication);
  if (step === 'activate') {
    await dependencies.store.activate(publication.id, dependencies.now());
  }
  await dependencies.notify(publication.id);
  return { publication: publication.id, status: 'active', step };
}
```

Run: `pnpm --filter directus-extension-publication test`
Expected: PASS (29 tests).

- [ ] **Step 3: Write the operation and register it**

`cms/extensions/publication/src/activate-publication/api.ts`:

```ts
import { defineOperationApi } from '@directus/extensions-sdk';
import { ACTIVATE_OPERATION } from '@portfolio/cms-schema/operations';

import { openPublicationStore } from '../directus-store.ts';
import { activatePublication } from './activate.ts';
import { notifyPublicationHook, readHookConfiguration } from './hook.ts';
import { readSelectedPublicationId } from './trigger.ts';

export default defineOperationApi<Record<string, never>>({
  id: ACTIVATE_OPERATION,
  handler: async (_options, context) => {
    const publicationId = readSelectedPublicationId(context.data);
    const hook = readHookConfiguration(context.env);
    return activatePublication(publicationId, {
      store: await openPublicationStore(context),
      notify: (id) => notifyPublicationHook(hook, id, fetch),
      now: () => new Date(),
    });
  },
});
```

`cms/extensions/publication/src/activate-publication/app.ts`:

```ts
import { defineOperationApp } from '@directus/extensions-sdk';
import { ACTIVATE_OPERATION } from '@portfolio/cms-schema/operations';

export default defineOperationApp({
  id: ACTIVATE_OPERATION,
  name: 'Activate publication',
  icon: 'publish',
  description: 'Makes the selected publication the one visitors see, then notifies the API.',
  overview: () => [
    { label: 'Effect', text: 'Supersedes the active publication and calls the publication hook.' },
  ],
  options: [],
});
```

In `cms/extensions/publication/package.json`, add the second entry after `prepare-publication`:

```json
{
  "type": "operation",
  "name": "activate-publication",
  "source": {
    "app": "src/activate-publication/app.ts",
    "api": "src/activate-publication/api.ts"
  }
}
```

- [ ] **Step 4: Configure the hook in the local stack**

In `compose.yaml`, add to the `directus` service (after `ports`):

<!-- prettier-ignore -->
```yaml
    extra_hosts:
      - 'host.docker.internal:host-gateway'
```

and to its `environment`:

<!-- prettier-ignore -->
```yaml
      PUBLICATION_HOOK_URL: ${PUBLICATION_HOOK_URL:?PUBLICATION_HOOK_URL is required}
      PUBLICATION_HOOK_SECRET: ${PUBLICATION_HOOK_SECRET:?PUBLICATION_HOOK_SECRET is required}
```

Append to `.env.example`:

```dotenv

# Called when a publication becomes active. The API (plan 2) will listen here;
# until then only the integration tests do, on port 8066 of the host.
PUBLICATION_HOOK_URL=http://host.docker.internal:8066/internal/publications/activated
PUBLICATION_HOOK_SECRET=change-me-hook-secret
```

Add the same variables to the existing local `.env` (it is never overwritten):

```bash
printf '\nPUBLICATION_HOOK_URL=http://host.docker.internal:8066/internal/publications/activated\nPUBLICATION_HOOK_SECRET=%s\n' "$(openssl rand -hex 32)" >> .env
```

Run: `pnpm cms:up && docker compose logs directus | grep -i extension`
Expected: the Directus container is recreated and healthy; the log shows `Loaded extensions: directus-extension-publication` and no extension error.

Run: `pnpm typecheck && pnpm test && pnpm test:cms`
Expected: PASS; integration still 29 tests.

- [ ] **Step 5: Commit**

```bash
git add cms/extensions/publication compose.yaml .env.example
git commit -m "feat(cms): publish a prepared publication and notify the API"
```

---

### Task 11: Prepare and Publish flows, end to end

**Files:**

- Create: `cms/provision/src/flows/flow-operation.ts`, `cms/provision/src/flows/ensure-publication-flows.ts`
- Create: `cms/tests/src/support/hook-server.ts`, `cms/tests/src/support/publication.ts`
- Modify: `cms/provision/src/main.ts`, `cms/tests/src/support/environment.ts`
- Test: `cms/provision/src/flows/flow-operation.test.ts`, `cms/tests/src/publication.test.ts`

**Interfaces:**

- Consumes: `PREPARE_OPERATION`, `ACTIVATE_OPERATION`, `PREPARE_FLOW_NAME`, `PUBLISH_FLOW_NAME` (Task 4), the operations (Tasks 9 and 10), `callMcpTool`, `readToolErrorCodes` (Task 7).
- Produces:
  - Manual flow `Prepare publication` (publications list, no selection) and `Publish` (one publication, with confirmation), each running one operation with the triggering user's permissions
  - `ensurePublicationFlows(client, log)`, `operationFieldsDiffer(current, declared)`
  - Test support `startHookServer(hookUrl, respond: HookResponder): Promise<HookServer>`, `readFlowId(name)`, `triggerFlow(token, flowId, keys): Promise<FlowAttempt>`, `readPublication(id)`, `readActivePublicationIds()`; `testEnvironment.hookUrl`, `testEnvironment.hookSecret`

The publication tests rely on the seeded initial content (`SEED_INITIAL_CONTENT=true`): Prepare needs valid working content.

- [ ] **Step 1: Write the failing drift test**

`cms/provision/src/flows/flow-operation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { operationFieldsDiffer } from './flow-operation.ts';
import type { OperationFields } from './flow-operation.ts';

const declared: OperationFields = {
  type: 'prepare-publication',
  name: 'Prepare publication',
  position_x: 19,
  position_y: 1,
  options: {},
};

describe('operationFieldsDiffer', () => {
  it('reports no drift when the stored fields match the declaration', () => {
    expect(operationFieldsDiffer(declared, declared)).toBe(false);
    expect(operationFieldsDiffer({ ...declared, options: null }, declared)).toBe(false);
  });

  it('detects drift on type, name, position or options', () => {
    expect(operationFieldsDiffer({ ...declared, type: 'log' }, declared)).toBe(true);
    expect(operationFieldsDiffer({ ...declared, name: 'Other' }, declared)).toBe(true);
    expect(operationFieldsDiffer({ ...declared, position_x: 0 }, declared)).toBe(true);
    expect(operationFieldsDiffer({ ...declared, options: { level: 'info' } }, declared)).toBe(true);
  });
});
```

Run: `pnpm --filter @portfolio/cms-provision test`
Expected: FAIL, `Cannot find module './flow-operation.ts'`.

- [ ] **Step 2: Provision the flows**

`cms/provision/src/flows/flow-operation.ts`:

```ts
export type OperationOptions = Record<string, string | number | boolean | null>;

export type OperationFields = {
  type: string;
  name: string;
  position_x: number;
  position_y: number;
  options: OperationOptions | null;
};

export function operationFieldsDiffer(
  current: OperationFields,
  declared: OperationFields
): boolean {
  return (
    current.type !== declared.type ||
    current.name !== declared.name ||
    current.position_x !== declared.position_x ||
    current.position_y !== declared.position_y ||
    optionsJson(current.options) !== optionsJson(declared.options)
  );
}

function optionsJson(options: OperationOptions | null): string {
  return JSON.stringify(options ?? {});
}
```

Run: `pnpm --filter @portfolio/cms-provision test`
Expected: PASS (30 tests).

`cms/provision/src/flows/ensure-publication-flows.ts`:

```ts
import {
  createFlow,
  createOperation,
  readFlows,
  readOperations,
  updateFlow,
  updateOperation,
} from '@directus/sdk';
import {
  ACTIVATE_OPERATION,
  PREPARE_FLOW_NAME,
  PREPARE_OPERATION,
  PUBLISH_FLOW_NAME,
} from '@portfolio/cms-schema/operations';

import type { AdminClient, Log } from '../directus-client.ts';
import { operationFieldsDiffer } from './flow-operation.ts';
import type { OperationFields } from './flow-operation.ts';

type ManualFlow = {
  name: string;
  icon: string;
  color: string;
  description: string;
  status: string;
  trigger: string;
  accountability: string;
  options: Record<string, string | boolean | string[]>;
};

type PublicationFlow = { flow: ManualFlow; operationKey: string; operation: OperationFields };

const publicationFlows: PublicationFlow[] = [
  {
    flow: {
      name: PREPARE_FLOW_NAME,
      icon: 'fact_check',
      color: '#2F6F4E',
      description:
        'Validates the working content and stores it as a prepared publication with its changes.',
      status: 'active',
      trigger: 'manual',
      accountability: 'all',
      options: {
        collections: ['publications'],
        location: 'collection',
        requireSelection: false,
        requireConfirmation: false,
        async: false,
        error_on_reject: true,
      },
    },
    operationKey: 'prepare',
    operation: {
      type: PREPARE_OPERATION,
      name: 'Prepare publication',
      position_x: 19,
      position_y: 1,
      options: {},
    },
  },
  {
    flow: {
      name: PUBLISH_FLOW_NAME,
      icon: 'publish',
      color: '#7A3D32',
      description:
        'Makes the selected publication the one visitors see. On a superseded publication, rolls back to it.',
      status: 'active',
      trigger: 'manual',
      accountability: 'all',
      options: {
        collections: ['publications'],
        location: 'item',
        requireSelection: true,
        requireConfirmation: true,
        confirmationDescription: 'Visitors will see this publication once the site is rebuilt.',
        async: false,
        error_on_reject: true,
      },
    },
    operationKey: 'activate',
    operation: {
      type: ACTIVATE_OPERATION,
      name: 'Activate publication',
      position_x: 19,
      position_y: 1,
      options: {},
    },
  },
];

export async function ensurePublicationFlows(client: AdminClient, log: Log): Promise<void> {
  for (const definition of publicationFlows) {
    const flowId = await ensureFlow(client, definition.flow, log);
    await ensureOperation(client, flowId, definition, log);
  }
}

async function ensureFlow(client: AdminClient, flow: ManualFlow, log: Log): Promise<string> {
  const [existing] = await client.request(
    readFlows({ filter: { name: { _eq: flow.name } }, fields: ['id'], limit: 1 })
  );
  if (existing === undefined) {
    const created = await client.request(createFlow(flow, { fields: ['id'] }));
    log(`Flow created: ${flow.name}`);
    return created.id;
  }
  await client.request(updateFlow(existing.id, flow));
  return existing.id;
}

async function ensureOperation(
  client: AdminClient,
  flowId: string,
  definition: PublicationFlow,
  log: Log
): Promise<void> {
  const [existing] = await client.request(
    readOperations({
      filter: { flow: { _eq: flowId }, key: { _eq: definition.operationKey } },
      fields: ['id', 'type', 'name', 'position_x', 'position_y', 'options'],
      limit: 1,
    })
  );
  const operation = { flow: flowId, key: definition.operationKey, ...definition.operation };
  if (existing === undefined) {
    const created = await client.request(createOperation(operation, { fields: ['id'] }));
    await client.request(updateFlow(flowId, { operation: created.id }));
    log(`Operation created: ${definition.operation.name}`);
    return;
  }
  if (operationFieldsDiffer(storedOperationFields(existing), definition.operation)) {
    await client.request(updateOperation(existing.id, operation));
    log(`Operation updated: ${definition.operation.name}`);
  }
  await client.request(updateFlow(flowId, { operation: existing.id }));
}

function storedOperationFields(operation: {
  type: string;
  name: string | null;
  position_x: number;
  position_y: number;
  options: OperationFields['options'];
}): OperationFields {
  return {
    type: operation.type,
    name: operation.name ?? '',
    position_x: operation.position_x,
    position_y: operation.position_y,
    options: operation.options,
  };
}
```

In `cms/provision/src/main.ts`, add the import:

```ts
import { ensurePublicationFlows } from './flows/ensure-publication-flows.ts';
```

and provision the flows after the access:

```ts
await ensureAccess(client, environment, log);
await ensurePublicationFlows(client, log);
```

Run: `pnpm provision && pnpm provision`
Expected: the first run logs `Flow created: Prepare publication`, `Operation created: Prepare publication`, `Flow created: Publish`, `Operation created: Activate publication`; the second run logs neither.

- [ ] **Step 3: Write the integration test support**

In `cms/tests/src/support/environment.ts`, add to `testEnvironment`:

```ts
  hookUrl: requireEnvironment('PUBLICATION_HOOK_URL'),
  hookSecret: requireEnvironment('PUBLICATION_HOOK_SECRET'),
```

`cms/tests/src/support/hook-server.ts`:

```ts
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { text } from 'node:stream/consumers';

export type HookCall = { authorization: string | undefined; body: unknown };

export type HookResponder = (call: HookCall) => number;

export type HookServer = { close(): Promise<void> };

// Directus reaches the host through host.docker.internal, so the server listens on every
// interface, on the port of PUBLICATION_HOOK_URL. The responder returns the HTTP status.
export async function startHookServer(
  hookUrl: string,
  respond: HookResponder
): Promise<HookServer> {
  const server = createServer(async (request, response) => {
    const body = await text(request);
    const status = respond({ authorization: request.headers.authorization, body: readJson(body) });
    response.writeHead(status).end();
  });
  await listen(server, Number(new URL(hookUrl).port));
  return { close: () => closeServer(server) };
}

function readJson(body: string): unknown {
  try {
    const parsed: unknown = JSON.parse(body);
    return parsed;
  } catch {
    return body;
  }
}

function listen(server: Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '0.0.0.0', () => resolve());
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error === undefined) {
        resolve();
        return;
      }
      reject(error);
    });
  });
}
```

`cms/tests/src/support/publication.ts`:

```ts
import { readFlows, readItem, readItems } from '@directus/sdk';
import type { PublicationStatus } from '@portfolio/cms-schema';
import { z } from 'zod';

import { adminClient } from './clients.ts';
import { testEnvironment } from './environment.ts';

export type FlowAttempt =
  | { status: 'succeeded'; publication: string }
  | { status: 'rejected'; httpStatus: number; code: string; message: string };

const successResponse = z.object({ publication: z.string() });
const errorResponse = z.object({
  errors: z.array(z.object({ message: z.string(), extensions: z.object({ code: z.string() }) })),
});

export async function readFlowId(name: string): Promise<string> {
  const flows = await adminClient.request(
    readFlows({ filter: { name: { _eq: name } }, fields: ['id'], limit: 2 })
  );
  const [flow] = flows;
  if (flow === undefined || flows.length > 1) {
    throw new Error(
      `Expected one flow named "${name}", found ${flows.length}: run pnpm provision.`
    );
  }
  return flow.id;
}

export async function triggerFlow(
  token: string,
  flowId: string,
  keys: string[]
): Promise<FlowAttempt> {
  const response = await fetch(`${testEnvironment.directusUrl}/flows/trigger/${flowId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ collection: 'publications', keys }),
  });
  const body: unknown = await response.json();
  if (response.ok) {
    return { status: 'succeeded', publication: successResponse.parse(body).publication };
  }
  const [error] = errorResponse.parse(body).errors;
  if (error === undefined) {
    throw new Error(`Error response without details (HTTP ${response.status}).`);
  }
  return {
    status: 'rejected',
    httpStatus: response.status,
    code: error.extensions.code,
    message: error.message,
  };
}

export async function readPublication(
  id: string
): Promise<{ status: PublicationStatus; activatedAt: string | null }> {
  const publication = await adminClient.request(
    readItem('publications', id, { fields: ['status', 'activated_at'] })
  );
  return { status: publication.status, activatedAt: publication.activated_at };
}

export async function readActivePublicationIds(): Promise<string[]> {
  const publications = await adminClient.request(
    readItems('publications', { filter: { status: { _eq: 'active' } }, fields: ['id'], limit: -1 })
  );
  return publications.map((publication) => publication.id);
}
```

- [ ] **Step 4: Write the publication integration tests**

`cms/tests/src/publication.test.ts`:

```ts
import { randomUUID } from 'node:crypto';

import { createItem, deleteItem, readSingleton, updateItem, updateSingleton } from '@directus/sdk';
import { PREPARE_FLOW_NAME, PUBLISH_FLOW_NAME } from '@portfolio/cms-schema/operations';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { adminClient, ownerClient } from './support/clients.ts';
import { testEnvironment } from './support/environment.ts';
import { uniqueSuffix } from './support/fixtures.ts';
import { startHookServer } from './support/hook-server.ts';
import type { HookResponder } from './support/hook-server.ts';
import { callMcpTool, readToolErrorCodes } from './support/mcp.ts';
import {
  readActivePublicationIds,
  readFlowId,
  readPublication,
  triggerFlow,
} from './support/publication.ts';

const suffix = uniqueSuffix();
const ownerToken = testEnvironment.ownerToken;
const prepareFlowId = await readFlowId(PREPARE_FLOW_NAME);
const publishFlowId = await readFlowId(PUBLISH_FLOW_NAME);
const hookResponder = vi.fn<HookResponder>(() => 204);
const hookServer = await startHookServer(testEnvironment.hookUrl, hookResponder);
const originalSettings = await adminClient.request(
  readSingleton('site_settings', { fields: ['description_en'] })
);

afterAll(async () => {
  await adminClient.request(
    updateSingleton('site_settings', { description_en: originalSettings.description_en })
  );
  await hookServer.close();
});

async function changeContent(label: string): Promise<void> {
  await ownerClient.request(
    updateSingleton('site_settings', { description_en: `${label} (${suffix})` })
  );
}

async function prepare(): Promise<string> {
  const attempt = await triggerFlow(ownerToken, prepareFlowId, []);
  if (attempt.status === 'rejected') {
    throw new Error(`Prepare was refused: ${attempt.code} ${attempt.message}`);
  }
  return attempt.publication;
}

async function publish(publicationId: string): Promise<void> {
  const attempt = await triggerFlow(ownerToken, publishFlowId, [publicationId]);
  if (attempt.status === 'rejected') {
    throw new Error(`Publish was refused: ${attempt.code} ${attempt.message}`);
  }
}

describe('publication', () => {
  it('discards an earlier prepared publication and publishes the latest one', async () => {
    await changeContent('First draft');
    const earlier = await prepare();
    await changeContent('Second draft');
    const latest = await prepare();

    expect((await readPublication(earlier)).status).toBe('discarded');
    expect(await triggerFlow(ownerToken, publishFlowId, [earlier])).toMatchObject({
      status: 'rejected',
      httpStatus: 409,
      code: 'PUBLICATION_STATE',
    });

    await publish(latest);

    expect(await readActivePublicationIds()).toEqual([latest]);
    expect(hookResponder).toHaveBeenLastCalledWith({
      authorization: `Bearer ${testEnvironment.hookSecret}`,
      body: { publicationId: latest },
    });
  });

  it('refuses to prepare when nothing changed since the active publication', async () => {
    await changeContent('Unchanged');
    await publish(await prepare());

    expect(await triggerFlow(ownerToken, prepareFlowId, [])).toMatchObject({
      status: 'rejected',
      httpStatus: 400,
      code: 'NOTHING_TO_PUBLISH',
    });
  });

  it('only notifies the API again when the active publication is published again', async () => {
    await changeContent('Notified again');
    const publicationId = await prepare();
    await publish(publicationId);
    const activated = await readPublication(publicationId);
    const callCount = hookResponder.mock.calls.length;

    await publish(publicationId);

    expect(await readPublication(publicationId)).toEqual(activated);
    expect(hookResponder).toHaveBeenCalledTimes(callCount + 1);
  });

  it('refuses a missing French text and names the item and field', async () => {
    const slug = `integration-${suffix}`;
    const created = await ownerClient.request(
      createItem(
        'experiences',
        {
          slug,
          company: 'Integration',
          role_en: 'Tester',
          role_fr: 'Testeur',
          start_month: '2026-01',
          summary_en: 'Created by an integration test.',
          summary_fr: 'Créée par un test d’intégration.',
          highlights_en: 'Checked.',
          highlights_fr: 'Vérifié.',
          skill_slugs: [],
        },
        { fields: ['id'] }
      )
    );
    try {
      await ownerClient.request(updateItem('experiences', created.id, { summary_fr: null }));

      const attempt = await triggerFlow(ownerToken, prepareFlowId, []);

      expect(attempt).toMatchObject({
        status: 'rejected',
        httpStatus: 400,
        code: 'PUBLICATION_INVALID',
        message: expect.stringContaining(`experiences[${slug}].summary.fr`),
      });
    } finally {
      await ownerClient.request(deleteItem('experiences', created.id));
    }
  });

  it('keeps a publication active when the API hook fails, and a retry only notifies', async () => {
    await changeContent('Hook failure');
    const publicationId = await prepare();
    hookResponder.mockReturnValueOnce(500);

    const attempt = await triggerFlow(ownerToken, publishFlowId, [publicationId]);

    expect(attempt).toMatchObject({
      status: 'rejected',
      httpStatus: 502,
      code: 'PUBLICATION_HOOK_FAILED',
      message: expect.stringContaining('Run Publish on it again'),
    });
    expect((await readPublication(publicationId)).status).toBe('active');

    const callCount = hookResponder.mock.calls.length;
    await publish(publicationId);

    expect(await readActivePublicationIds()).toEqual([publicationId]);
    expect(hookResponder).toHaveBeenCalledTimes(callCount + 1);
  });

  it('rolls back by publishing a superseded publication', async () => {
    await changeContent('Before the rollback');
    const previous = await prepare();
    await publish(previous);
    await changeContent('After the rollback');
    const latest = await prepare();
    await publish(latest);

    expect((await readPublication(previous)).status).toBe('superseded');

    await publish(previous);

    expect(await readActivePublicationIds()).toEqual([previous]);
    expect((await readPublication(latest)).status).toBe('superseded');
  });

  it('refuses Prepare and Publish to the assistant', async () => {
    const assistantToken = testEnvironment.assistantToken;

    expect(await triggerFlow(assistantToken, prepareFlowId, [])).toMatchObject({
      status: 'rejected',
      code: 'FORBIDDEN',
    });
    expect(await triggerFlow(assistantToken, publishFlowId, [randomUUID()])).toMatchObject({
      status: 'rejected',
      code: 'FORBIDDEN',
    });
  });

  it('refuses the MCP flow trigger to the assistant', async () => {
    const outcome = await callMcpTool(testEnvironment.assistantToken, 'trigger-flow', {
      id: prepareFlowId,
      collection: 'publications',
      keys: [],
    });

    expect(outcome.isError).toBe(true);
    expect(readToolErrorCodes(outcome)).toContain('FORBIDDEN');
  });
});
```

- [ ] **Step 5: Run every check**

Run: `pnpm test:cms`
Expected: PASS (37 tests). If port 8066 is taken, the suite fails at `startHookServer` with `EADDRINUSE`: free the port, or change the port in `PUBLICATION_HOOK_URL` and run `pnpm cms:up` again.

Run: `pnpm typecheck && pnpm test && pnpm format:check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add cms/provision cms/tests
git commit -m "feat(cms): add the Prepare and Publish flows"
```

---

### Task 12: CMS integration tests in CI

**Files:**

- Modify: `.github/workflows/ci.yml`

**Interfaces:**

- Consumes: `scripts/ci/write-env.sh`, `cms:up`, `provision`, `test:cms` (Task 5), `build:extension` (Task 9).
- Produces: CI jobs `Checks` (now also builds the extension) and `CMS integration`.

- [ ] **Step 1: Build the extension in the checks job**

In `.github/workflows/ci.yml`, add before `Build the site`:

<!-- prettier-ignore -->
```yaml
      - name: Build the Directus extension
        run: pnpm build:extension
```

- [ ] **Step 2: Add the integration job**

Append to `jobs` in `.github/workflows/ci.yml`:

<!-- prettier-ignore -->
```yaml
  integration:
    name: CMS integration
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - name: Checkout
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - name: pnpm
        uses: pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413 # v6.1.0
      - name: Node
        uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Disposable environment
        run: scripts/ci/write-env.sh
      - name: Start Postgres and Directus
        run: pnpm cms:up
      - name: Provision
        run: pnpm provision
      - name: Provision again
        run: pnpm provision
      - name: Integration tests
        run: pnpm test:cms
      - name: Directus logs
        if: failure()
        run: docker compose logs --no-color directus
```

- [ ] **Step 3: Check the workflow locally**

Run: `pnpm format:check && docker compose config --quiet`
Expected: PASS. Run the same steps as the job against a disposable copy to rehearse it:

```bash
docker compose down --volumes
mv .env .env.local-backup
scripts/ci/write-env.sh && pnpm cms:up && pnpm provision && pnpm provision && pnpm test:cms
docker compose down --volumes
mv .env.local-backup .env && pnpm cms:up && pnpm provision
```

Expected: the second provisioning creates nothing: it logs the permission and settings refresh (`Permissions applied to policy …` three times, `Project and MCP settings applied`), then `Initial content skipped: experiences already exist.` and `Provisioning complete.`; integration PASS (37 tests); the local stack is back with your own `.env`. The CI run itself is checked once the branch is pushed, which is a separate action.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run the CMS integration tests"
```

---

### Task 13: Documentation

**Files:**

- Create: `docs/development.md`
- Modify: `docs/architecture.md` (replaced), `docs/standards.md`, `README.md` (replaced)

**Interfaces:**

- Consumes: everything above. Produces no code.

- [ ] **Step 1: Write the development guide**

`docs/development.md` (whole file):

````md
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
````

- [ ] **Step 2: Replace the architecture document**

`docs/architecture.md` (whole file):

````md
# Architecture

The repository is a pnpm workspace. The target design (conversational portfolio, API, chat, measurement) is in the [design spec](superpowers/specs/2026-10-13-conversational-portfolio-design.md); this page describes what exists today.

## Workspace

| Package                          | Path                          | Role                                                                                               |
| -------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------- |
| `@portfolio/site`                | `site/`                       | Next.js site, exported statically to GitHub Pages.                                                 |
| `@portfolio/content`             | `packages/content/`           | Publication content schema (zod), validation with readable problem paths, change summaries.        |
| `@portfolio/cms-schema`          | `cms/schema/`                 | Directus record types; mapping between working records and publication content.                    |
| `@portfolio/cms-provision`       | `cms/provision/`              | Applies the Directus configuration idempotently: schema, access, settings, flows, initial content. |
| `directus-extension-publication` | `cms/extensions/publication/` | Prepare and activate flow operations.                                                              |
| `@portfolio/cms-tests`           | `cms/tests/`                  | Integration tests against Postgres and Directus in Docker.                                         |

Workspace packages are TypeScript sources run directly by Node 24: relative imports end with `.ts`, and only erasable syntax is allowed.

## Content

Directus holds two kinds of data:

- **Working collections**, edited by the owner and by the assistant through MCP: profile, capabilities, skills, experiences, projects, key figures, answers, chat settings, site settings. Every visitor-facing text is a pair of `_en` and `_fr` fields; references between items are slug lists.
- **Publications**: snapshots of the working content. Visitors will only ever see the active publication.

```
working collections --Prepare--> prepared --Publish--> active --next Publish--> superseded
                                     |                                              |
                                next Prepare                                 Publish (rollback)
                                     v                                              v
                                 discarded                                       active
```

- **Prepare** builds the snapshot with `buildPublicationContent`, refuses it with every problem listed when validation fails, and stores the change summary since the active publication.
- **Publish** activates the publication in one transaction, then calls the API hook (`PUBLICATION_HOOK_URL`, bearer `PUBLICATION_HOOK_SECRET`). A hook failure leaves the publication active; publishing the active publication again only calls the hook.
- Both operations run with the permissions of the user who triggers them, so only the owner can write publications.

## Access

| Account   | Working collections  | Publications         | Other                                  |
| --------- | -------------------- | -------------------- | -------------------------------------- |
| Owner     | All actions          | Create, read, update | Files; reads users, flows, operations  |
| Assistant | Create, read, update | Read                 | Reads files; MCP with deletes disabled |
| Public    | None                 | None                 | None                                   |

The definitions live in `cms/provision/src/access/policies.ts`; the integration tests compare the stored permissions with them.

## Site

The site in `site/` is unchanged by the CMS work; plan 2 builds it from the active publication.

- `site/app/`: App Router routes, layout, `robots.ts`, `sitemap.ts`.
- `site/src/components/`: `ui/`, `layout/`, `sections/`, `providers/`.
- `site/src/lib/content/`: content service; `StaticContentProvider` reads `site/public/data/content.json`.
- `site/src/hooks/`, `site/src/types/`, `site/src/lib/` (icons, SEO, utilities).
````

- [ ] **Step 3: Update the standards for the workspace**

In `docs/standards.md`, replace the Quick Reference table with:

```md
| Command                                  | Description                                |
| ---------------------------------------- | ------------------------------------------ |
| `pnpm lint`                              | Run ESLint on the site (fails on warnings) |
| `pnpm --filter @portfolio/site lint:fix` | Auto-fix ESLint issues                     |
| `pnpm format`                            | Format all files with Prettier             |
| `pnpm format:check`                      | Check formatting without changes           |
| `pnpm typecheck`                         | Run TypeScript type checking everywhere    |
| `pnpm test`                              | Run the unit tests of every package        |
| `pnpm validate`                          | Run typecheck, lint and format check       |
| `pnpm build:site`                        | Build the site                             |

CMS commands are in [development.md](development.md).
```

Replace `Configuration: [eslint.config.mjs](../eslint.config.mjs)` with:

```md
Configuration: [site/eslint.config.mjs](../site/eslint.config.mjs). ESLint covers the site; workspace packages rely on strict TypeScript and Prettier.
```

Insert before `## Editor Configuration`:

```md
## TypeScript in Workspace Packages

- Packages extend [tsconfig.base.json](../tsconfig.base.json): strict mode, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `erasableSyntaxOnly`.
- Node 24 runs the sources directly: relative imports end with `.ts`; no enums, namespaces or parameter properties.
- No `any`, no `as` assertions, no `@ts-ignore`, no non-null `!`. Narrow `unknown` with zod or a type guard.
- Tests sit next to the code as `*.test.ts` and run with Vitest.

---
```

Replace the body of `## CI/CD Integration` (the sentence and the YAML example) with:

```md
[.github/workflows/ci.yml](../.github/workflows/ci.yml) runs typecheck, lint, format check, unit tests and the extension and site builds, then the CMS integration tests against Postgres and Directus.
```

Replace the `## File Structure` block with:

````md
```
.
├── .editorconfig        # Editor settings
├── .prettierrc          # Prettier config
├── .prettierignore      # Files to skip formatting
├── package.json         # Workspace scripts
├── pnpm-workspace.yaml  # Workspace packages
├── tsconfig.base.json   # Shared TypeScript settings
├── site/
│   ├── eslint.config.mjs  # ESLint flat config
│   └── tsconfig.json      # Site TypeScript config
├── packages/            # Shared libraries
└── cms/                 # Directus configuration, extension and integration tests
```
````

In `## Troubleshooting`, replace `npm ls eslint` with `pnpm --filter @portfolio/site ls eslint`, `npm run lint:fix && npm run format` with `pnpm --filter @portfolio/site lint:fix && pnpm format`, and `npm run typecheck` with `pnpm typecheck`.

- [ ] **Step 4: Replace the README**

`README.md` (whole file):

```md
# Ny Hasinavalona Randriantsarafara — portfolio

Source of [nyhasinavalona.com](https://nyhasinavalona.com), on its way to becoming a conversational portfolio: a chat that answers recruiters from published content and drives the page.

| Path                | Content                                                                  |
| ------------------- | ------------------------------------------------------------------------ |
| `site/`             | Next.js site, exported statically to GitHub Pages                        |
| `packages/content/` | Publication content schema, validation and change summaries              |
| `cms/`              | Directus configuration as code, publication extension, integration tests |
| `docs/`             | Architecture, standards, development guide, design spec and plans        |

Start with [docs/development.md](docs/development.md). The design is in [docs/superpowers/specs/2026-10-13-conversational-portfolio-design.md](docs/superpowers/specs/2026-10-13-conversational-portfolio-design.md).
```

- [ ] **Step 5: Check and commit**

Run: `pnpm format && pnpm format:check && git diff --check`
Expected: PASS; only the four documents change.

```bash
git add docs/development.md docs/architecture.md docs/standards.md README.md
git commit -m "docs: describe the workspace, the CMS and the publication workflow"
```

---

## Final Verification

From a clean database, with your own `.env`:

```bash
docker compose down --volumes
pnpm cms:up && pnpm provision && pnpm provision
pnpm validate && pnpm test && pnpm build:site && pnpm test:cms
git status --short && git diff --check
```

Expected: the second provisioning creates nothing (only the `Permissions applied …` and `Project and MCP settings applied` refresh lines, `Initial content skipped: experiences already exist.` and `Provisioning complete.`); every check passes (unit tests: content 20, cms-schema 8, provision 30, extension 29, plus the site's own; integration 37); the working tree is clean.

Then sign in to Directus as the owner and walk through the owner's path once: Publications → **Prepare publication** → open the prepared publication → **Publish** (with confirmation). Without the API, Publish ends with the hook error while the publication becomes active, as documented.

Review Focus check: each of the five scenarios at the top of this plan is covered by the named test, and the corresponding test passed in this run.
