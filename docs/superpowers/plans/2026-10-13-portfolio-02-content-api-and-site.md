# Content API and Bilingual Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the active publication through a small content API (`GET /content/active`, `GET /health`, the publication hook) and rebuild the site from that publication in English at `/` and French at `/fr`, with canonical and `hreflang` metadata, JSON-LD, a bilingual sitemap, Open Graph images, CV PDFs, a Content Security Policy and Lighthouse CI. The GitHub Pages deployment is frozen until plan 3 delivers the release workflows.

**Architecture:** `packages/content` gains the `ActivePublication` contract shared by the API and the site. `api/` (`@portfolio/api`) is a Hono app on Node 24: a Directus publication source reads the active publication with a read-only service token and validates it, an in-memory cache holds the API's only state, and the hook route reloads that cache after an activation. The site stays a static export: `site/scripts/write-content.ts` writes the gitignored `site/content/publication.json` from the initial content (`--seed`) or from the API (`--api`); two root layouts (`app/(en)`, `app/(fr)/fr`) render the same page from typed section view models, with UI strings in a dictionary and every fact taken from the publication. Open Graph images and CV PDFs are static route handlers exported at build time.

**Tech Stack:** pnpm 10.32.1, Node 24 (native TypeScript type stripping), TypeScript ~6.0.3 everywhere (the site moves from TypeScript 5), zod ^4.6.5, Vitest ^5.0.3 with `vite` ^8.1.2 in every package, Hono ^4.13.13 with `@hono/node-server` ^2.1.5, `@directus/sdk` 27.0.0, Next.js 16.4.0, React 19.3.0, `@react-pdf/renderer`, `@lhci/cli`, jsdom ^29.0.2 (jsdom 30 needs Node ≥ 24.15).

**Spec:** `docs/superpowers/specs/2026-10-13-conversational-portfolio-design.md` (sections 4.3, 5.3, 5.4, 6, 9, 13 part 2). Plan 1 (`2026-10-13-portfolio-01-cms-and-publication.md`) is implemented; this plan builds on its real interfaces.

## Global Constraints

- Node 24 (`.nvmrc`), pnpm `10.32.1`. Workspace packages extend `tsconfig.base.json`; relative imports carry the `.ts` extension; Node runs the sources directly. The site sets `allowImportingTsExtensions` so Next can compile `@portfolio/content` sources.
- No `any`, no `as` type assertions (including `as const`), no `@ts-ignore`, no non-null `!`; `unknown` only when narrowed immediately (zod or a type guard).
- No mutation after initialization (`const` only, no `let`); early returns instead of nested `if`; no ternary where it hurts readability.
- Code, comments, documentation and commit messages in English; Conventional Commits; repository Prettier settings (single quotes, semicolons, width 100, ES5 trailing commas). Quote paths containing `(`, `)`, `[` or `]` in shell commands (zsh globbing).
- `GET /content/active` returns the `ActivePublication` with `ETag: "<publicationId>"` and `Cache-Control: public, max-age=60`; `304` on a matching `If-None-Match`; `404 {"error":"not_found"}` when nothing is active; `503 {"error":"unavailable"}` when Directus fails. Content is served only after `validatePublicationContent`.
- The hook compares the bearer in constant time; `401` on a wrong secret, `400` on an invalid body, `204` after a reload, `503` when the reload fails. No CORS in this plan (the browser makes no API call yet).
- The API service Directus account reads `publications` and nothing else; it has no Studio access.
- The API listens on `API_PORT` (8066 locally). The CMS integration tests bind the same port for their fake hook server: stop `pnpm dev:api` before `pnpm test:cms`.
- The site is a static export (`output: 'export'`) built from `site/content/publication.json` (gitignored). The seed publication has id `00000000-0000-4000-8000-000000000000` and `activatedAt` `2026-01-01T00:00:00.000Z`; tests use `activePublicationFixture` from `@portfolio/content/testing`.
- UI strings live in `site/src/lib/i18n/dictionary.ts`; facts come only from the publication. `/` is English, `/fr` French, `x-default` is English, with no automatic redirect.
- A dependency is added in the task that first uses it, and that task commits `pnpm-lock.yaml`.
- Lighthouse mobile assertions on `/` and `/fr`: performance ≥ 0.9, accessibility ≥ 0.95, SEO = 1, best practices ≥ 0.95.
- No secret in Git or in command output: `.env` stays ignored, `.env.example` holds `change-me` placeholders only.

## Review Focus

1. The active publication schema accepts `Z` and offset timestamps and rejects bad ids and content (Task 1).
2. The API service account reads publications only: no profile, no flows, no users, no publication writes, no Studio (Task 2 unit and integration tests).
3. The publication cache: lazy first read, retry after `null`, one shared first read, reload on the hook, a failed reload keeps the previous value, an older read never overwrites a newer reload (Task 6).
4. The hook bearer is checked in constant time; wrong secret `401`, body that is not JSON `400`, valid reload `204` (Tasks 7 and 8).
5. `/content/active` caching headers and `304` (Task 8); prepare, publish, then `GET /content/active` returns the active id against the real stack (Task 10).
6. The toolchain upgrade keeps the legacy site building until the publication wiring replaces it (Tasks 11 to 14).
7. The publication file is validated at build time, with a readable error when it is missing or invalid (Task 12).
8. Bilingual layouts, canonical and `hreflang` alternates, language switch and the discreet French suggestion (Task 15).
9. JSON-LD, sitemap alternates, Open Graph PNGs (Task 16); CV PDFs render `→` with the Geist font, CSP restricts `connect-src` to the API origin (Task 17).
10. Lighthouse passes every assertion on `/` and `/fr`; the GitHub Pages deploy workflow is removed (Task 18).

## File Map

| Path                                                                            | Responsibility                                                                     |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `packages/content/src/active-publication.ts`                                    | Zod schema and type of the active publication JSON contract.                       |
| `packages/content/src/testing/fixture.ts`                                       | `activePublicationFixture` for API and site tests.                                 |
| `cms/provision/src/environment.ts`                                              | Reads the `API_*` account variables; requires `API_TOKEN`.                         |
| `cms/provision/src/access/policies.ts`, `ensure-access.ts`                      | API service policy (publications read-only), role and user.                        |
| `.env.example`                                                                  | `API_*` and `API_PORT` placeholders (`scripts/ci/write-env.sh` fills them for CI). |
| `cms/tests/src/support/*`, `cms/tests/src/access.test.ts`                       | `apiClient`, API service access matrix and stored grants.                          |
| `cms/tests/src/content-api.test.ts`                                             | The API against the local Directus stack.                                          |
| `api/package.json`, `api/tsconfig.json`                                         | `@portfolio/api` workspace package.                                                |
| `api/src/environment.ts`                                                        | Reads `API_PORT`, `DIRECTUS_URL`, `API_TOKEN`, `PUBLICATION_HOOK_SECRET`.          |
| `api/src/publications/*`                                                        | Directus publication source, errors, active publication cache.                     |
| `api/src/http/*`                                                                | Hook authorization and the Hono app.                                               |
| `api/src/main.ts`                                                               | Node entrypoint on `API_PORT`.                                                     |
| `pnpm-workspace.yaml`                                                           | Adds `api`; drops the jest-dom `packageExtensions`.                                |
| `package.json`                                                                  | Root `dev:api`, `content:seed`, `content:pull`, `lighthouse` scripts.              |
| `site/package.json`, `site/tsconfig.json`, `site/vitest.config.ts`              | Toolchain: Next 16, React 19.3, TypeScript 6, Vitest 5, ESM.                       |
| `site/scripts/write-content.ts`, `site/src/lib/publication/content-source.ts`   | Write the publication file from the seed or the API.                               |
| `site/src/lib/publication/read-publication.ts`                                  | Read and validate the publication file at build time.                              |
| `site/src/lib/i18n/*`                                                           | Locales, paths, file names, UI dictionary, French preference.                      |
| `site/src/lib/publication/sections.ts`, `site/src/types/page-sections.ts`       | Section view models built from the publication.                                    |
| `site/src/components/page/*`, `site/src/components/sections/*`                  | Page shell, root document, language suggestion, sections.                          |
| `site/app/(en)/*`, `site/app/(fr)/fr/*`, `site/app/global-not-found.tsx`        | English and French root layouts and pages; static 404.                             |
| `site/src/lib/seo/*`, `site/app/sitemap.ts`, `site/app/robots.ts`               | Metadata, JSON-LD, site URL, CSP.                                                  |
| `site/app/og/[file]/route.tsx`                                                  | Open Graph PNG per locale.                                                         |
| `site/src/cv/*`, `site/app/documents/[file]/route.tsx`                          | CV model, React-PDF document, PDF per locale.                                      |
| `site/lighthouserc.json`, `.github/workflows/ci.yml`                            | Lighthouse CI; seed before the site build.                                         |
| `.github/workflows/deploy.yml`                                                  | Deleted: the live site stays at its last deployment.                               |
| `docs/architecture.md`, `docs/development.md`, `docs/standards.md`, `README.md` | Documentation of what exists after this plan.                                      |

---

### Task 1: Active publication contract in `@portfolio/content`

**Files:**

- Create: `packages/content/src/active-publication.ts`
- Create: `packages/content/src/active-publication.test.ts`
- Modify: `packages/content/src/index.ts`, `packages/content/src/testing/fixture.ts`
  **Interfaces:**
- Produces: `activePublicationSchema`, type `ActivePublication`, `activePublicationFixture` (id `3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42`, `activatedAt` `2026-10-13T08:00:00.000Z`, content `contentFixture`).
- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';

import { activePublicationSchema } from './active-publication.ts';
import { contentFixture } from './testing/fixture.ts';

const publicationId = '3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42';

describe('activePublicationSchema', () => {
  it('accepts a valid fixture with Z timestamp', () => {
    const parsed = activePublicationSchema.parse({
      publicationId,
      activatedAt: '2026-10-13T08:00:00.000Z',
      content: contentFixture,
    });

    expect(parsed.publicationId).toBe(publicationId);
  });

  it('accepts an ISO timestamp with a numeric offset', () => {
    const parsed = activePublicationSchema.parse({
      publicationId,
      activatedAt: '2026-10-13T10:00:00.000+02:00',
      content: contentFixture,
    });

    expect(parsed.activatedAt).toBe('2026-10-13T10:00:00.000+02:00');
  });

  it('refuses a non-UUID publication id', () => {
    const result = activePublicationSchema.safeParse({
      publicationId: 'not-a-uuid',
      activatedAt: '2026-10-13T08:00:00.000Z',
      content: contentFixture,
    });

    expect(result.success).toBe(false);
  });

  it('refuses a non-ISO activatedAt', () => {
    const result = activePublicationSchema.safeParse({
      publicationId,
      activatedAt: '2026-10-13',
      content: contentFixture,
    });

    expect(result.success).toBe(false);
  });

  it('refuses invalid publication content', () => {
    const result = activePublicationSchema.safeParse({
      publicationId,
      activatedAt: '2026-10-13T08:00:00.000Z',
      content: { profile: null },
    });

    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @portfolio/content exec vitest run src/active-publication.test.ts`

Expected: FAIL (cannot find `./active-publication.ts` or `activePublicationSchema` is not defined)

- [ ] **Step 3: Add the schema and export it**

```typescript
import { z } from 'zod';

import { publicationContentSchema } from './publication.ts';

export const activePublicationSchema = z.object({
  publicationId: z.uuid(),
  activatedAt: z.iso.datetime({ offset: true }),
  content: publicationContentSchema,
});

export type ActivePublication = z.infer<typeof activePublicationSchema>;
```

In `packages/content/src/index.ts`, add as the first export line:

```typescript
export * from './active-publication.ts';
```

- [ ] **Step 4: Export `activePublicationFixture` from `packages/content/src/testing/fixture.ts`**

Add `import type { ActivePublication } from '../active-publication.ts';` with the other imports, then after `contentFixture`:

```typescript
export const activePublicationFixture: ActivePublication = {
  publicationId: '3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42',
  activatedAt: '2026-10-13T08:00:00.000Z',
  content: contentFixture,
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @portfolio/content exec vitest run src/active-publication.test.ts`

Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
pnpm exec prettier --write packages/content/src/active-publication.ts packages/content/src/active-publication.test.ts packages/content/src/index.ts packages/content/src/testing/fixture.ts
git add packages/content/src/active-publication.ts packages/content/src/active-publication.test.ts packages/content/src/index.ts packages/content/src/testing/fixture.ts
git commit -m "feat(content): add active publication schema and fixture"
```

---

### Task 2: API service account in provisioning

**Files:**

- Modify: `cms/provision/src/environment.ts`, `cms/provision/src/environment.test.ts`
- Modify: `cms/provision/src/access/policies.ts`, `cms/provision/src/access/policies.test.ts`, `cms/provision/src/access/ensure-access.ts`
- Modify: `.env.example`, `cms/tests/src/support/environment.ts`, `cms/tests/src/support/clients.ts`, `cms/tests/src/access.test.ts`

**Interfaces:**

- Consumes: `ActivePublication` contract (not used directly here).
- Produces: `apiServicePolicy()`, `API_SERVICE_POLICY_NAME`, provisioned role id from `API_ROLE_ID`, `testEnvironment.apiToken`, `apiClient`.

- [ ] **Step 1: Extend provisioning environment tests**

```typescript
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
  API_EMAIL: 'api@example.com',
  API_PASSWORD: 'api-password',
  API_TOKEN: 'api-token',
  API_ROLE_ID: 'api-role',
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

  it('requires the API token', () => {
    expect(() => readProvisionEnvironment({ ...requiredSource, API_TOKEN: '' })).toThrow(
      'API_TOKEN'
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @portfolio/cms-provision exec vitest run src/environment.test.ts`

Expected: FAIL (`api` missing / API_TOKEN test fails)

- [ ] **Step 3: Implement API account in `cms/provision/src/environment.ts`**

```typescript
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
  api: AccountEnvironment;
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
    api: readAccountWithRequiredToken(source, 'API'),
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

function readAccountWithRequiredToken(
  source: EnvironmentSource,
  prefix: string
): AccountEnvironment {
  const account = readAccount(source, prefix);
  if (account.token === null) {
    throw new Error(`The environment variable ${prefix}_TOKEN is required.`);
  }
  return account;
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

- [ ] **Step 4: Add API service policy**

Append to `cms/provision/src/access/policies.ts`:

```typescript
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
export const API_SERVICE_POLICY_NAME = 'API service';

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

export function apiServicePolicy(): PolicyDefinition {
  return {
    name: API_SERVICE_POLICY_NAME,
    icon: 'api',
    description: 'Reads the active publication for the portfolio API.',
    appAccess: false,
    enforceTfa: false,
    grants: grant(['publications'], ['read']),
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

- [ ] **Step 5: Write policy unit tests**

```typescript
import { describe, expect, it } from 'vitest';

import {
  apiServicePolicy,
  assistantPolicy,
  grantKeys,
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

describe('API service policy', () => {
  const definition = apiServicePolicy();

  it('only reads publications', () => {
    expect(grantKeys(definition.grants)).toEqual(['publications:read']);
  });

  it('has no Studio access', () => {
    expect(definition.appAccess).toBe(false);
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

- [ ] **Step 6: Run policy tests (fail until ensure-access wired)**

Run: `pnpm --filter @portfolio/cms-provision exec vitest run src/access/policies.test.ts`

Expected: PASS for API service policy tests

- [ ] **Step 7: Wire `ensure-access.ts`**

```typescript
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
  apiServicePolicy,
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
  const apiService = apiServicePolicy();
  const ownerPolicyId = await ensurePolicy(client, owner, log);
  const assistantPolicyId = await ensurePolicy(client, assistant, log);
  const apiServicePolicyId = await ensurePolicy(client, apiService, log);

  await assertPublicPolicyExists(client, PUBLIC_POLICY_ID);
  await replacePermissions(client, PUBLIC_POLICY_ID, publicGrants, log);
  await replacePermissions(client, ownerPolicyId, owner.grants, log);
  await replacePermissions(client, assistantPolicyId, assistant.grants, log);
  await replacePermissions(client, apiServicePolicyId, apiService.grants, log);

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

  await ensureRole(
    client,
    systemClient,
    {
      id: environment.api.roleId,
      name: 'API service',
      icon: 'api',
      policyId: apiServicePolicyId,
    },
    log
  );

  await ensureUser(client, { account: environment.owner, firstName: 'Owner' }, log);
  await ensureUser(client, { account: environment.assistant, firstName: 'Assistant' }, log);
  await ensureUser(client, { account: environment.api, firstName: 'API service' }, log);
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
  const rows = toPermissionRows(policyId, grants);
  if (rows.length > 0) {
    await client.request(createPermissions(rows));
  }
  // Create before delete so a failed provision never leaves the policy with zero permissions.
  if (storedIds.length > 0) {
    await client.request(deletePermissions(storedIds));
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

- [ ] **Step 8: Update `.env.example`**

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

API_EMAIL=api@example.com
API_PASSWORD=change-me-api
API_TOKEN=change-me-api-token
API_ROLE_ID=a4c8e2b1-9f3d-4a7e-8c6d-2e5f1a9b0c3d
API_PORT=8066

SEED_INITIAL_CONTENT=true

MCP_OAUTH_ENABLED=false
MCP_OAUTH_CIMD_ENABLED=false
MCP_OAUTH_DCR_ENABLED=false
MCP_OAUTH_CIMD_ALLOW_HTTP=false

# Called when a publication becomes active. The API listens here in development
# (`pnpm dev:api`); the integration tests' fake hook server uses the same port,
# so stop the API before `pnpm test:cms`.
PUBLICATION_HOOK_URL=http://host.docker.internal:8066/internal/publications/activated
PUBLICATION_HOOK_SECRET=change-me-hook-secret
```

- [ ] **Step 9: Extend CMS test support and access tests**

`cms/tests/src/support/environment.ts` adds `apiToken`. `cms/tests/src/support/clients.ts` exports `apiClient`. Update `cms/tests/src/access.test.ts`:

```typescript
import {
  createItem,
  deleteItem,
  readFlows,
  readItems,
  readPermissions,
  readPolicies,
  readSingleton,
  readUsers,
  updateItem,
} from '@directus/sdk';
import {
  API_SERVICE_POLICY_NAME,
  ASSISTANT_POLICY_NAME,
  apiServicePolicy,
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

import {
  adminClient,
  anonymousClient,
  apiClient,
  assistantClient,
  ownerClient,
} from './support/clients.ts';
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

describe('API service', () => {
  it('reads publications', async () => {
    await expect(apiClient.request(readItems('publications'))).resolves.toBeDefined();
  });

  const refusals: NamedRequest[] = [
    ['reading the profile singleton', () => apiClient.request(readSingleton('profile'))],
    ['reading capabilities', () => apiClient.request(readItems('capabilities'))],
    [
      'creating a publication',
      () =>
        apiClient.request(
          createItem('publications', { status: 'prepared', content: {}, changes: {} })
        ),
    ],
    [
      'updating a publication',
      () =>
        apiClient.request(updateItem('publications', discardedPublicationId, { status: 'active' })),
    ],
    ['reading flows', () => apiClient.request(readFlows())],
    ['reading users', () => apiClient.request(readUsers())],
  ];

  it.each(refusals)('is refused %s', async (_name, request) => {
    expect(await captureErrorCode(request())).toBe('FORBIDDEN');
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
    [
      API_SERVICE_POLICY_NAME,
      async () => (await readPolicy(API_SERVICE_POLICY_NAME)).id,
      apiServicePolicy().grants,
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

- [ ] **Step 10: Run unit tests**

Run: `pnpm --filter @portfolio/cms-provision test`

Expected: PASS

- [ ] **Step 11: Add API variables to local `.env` and provision**

Generate secrets without printing them:

```bash
# append once if missing
grep -q '^API_EMAIL=' .env || printf '\nAPI_EMAIL=api@example.com\nAPI_PASSWORD=%s\nAPI_TOKEN=%s\nAPI_ROLE_ID=a4c8e2b1-9f3d-4a7e-8c6d-2e5f1a9b0c3d\nAPI_PORT=8066\n' "$(openssl rand -hex 16)" "$(openssl rand -hex 32)" >> .env
pnpm provision
```

Expected: log lines `Policy created: API service`, `Role created: API service`, `User created: api@example.com`, `Provisioning complete.`

- [ ] **Step 12: Verify `write-env.sh` still works**

Run: `bash scripts/ci/write-env.sh /tmp/portfolio-env-check && grep -c '^API_TOKEN=' /tmp/portfolio-env-check && rm /tmp/portfolio-env-check`

Expected: prints `1`

- [ ] **Step 13: Run CMS access tests (stop anything on port 8066 first)**

Run: `pnpm test:cms -- src/access.test.ts`

Expected: PASS (includes `API service` describe block)

- [ ] **Step 14: Commit**

```bash
pnpm exec prettier --write cms/provision/src/environment.ts cms/provision/src/environment.test.ts cms/provision/src/access/policies.ts cms/provision/src/access/policies.test.ts cms/provision/src/access/ensure-access.ts .env.example cms/tests/src/support/environment.ts cms/tests/src/support/clients.ts cms/tests/src/access.test.ts
git add cms/provision/src/environment.ts cms/provision/src/environment.test.ts cms/provision/src/access/policies.ts cms/provision/src/access/policies.test.ts cms/provision/src/access/ensure-access.ts .env.example cms/tests/src/support/environment.ts cms/tests/src/support/clients.ts cms/tests/src/access.test.ts
git commit -m "feat(cms): provision API service account and access tests"
```

---

### Task 3: Scaffold `@portfolio/api` workspace package

**Files:**

- Create: `api/package.json`, `api/tsconfig.json`
- Modify: `pnpm-workspace.yaml`, `pnpm-lock.yaml`

**Interfaces:**

- Produces: package `@portfolio/api` with exports `./app` and `./publications`.

- [ ] **Step 1: Add the workspace member**

In `pnpm-workspace.yaml`, insert after `  - site`:

```yaml
- api
```

- [ ] **Step 2: Create `api/package.json` and `api/tsconfig.json`**

```json
{
  "name": "@portfolio/api",
  "private": true,
  "type": "module",
  "exports": {
    "./app": "./src/http/app.ts",
    "./publications": "./src/publications/index.ts"
  },
  "scripts": {
    "start": "node src/main.ts",
    "dev": "node --env-file=../.env --watch src/main.ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@directus/sdk": "27.0.0",
    "@hono/node-server": "^2.1.5",
    "@portfolio/cms-schema": "workspace:*",
    "@portfolio/content": "workspace:*",
    "hono": "^4.13.13",
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

```json
{
  "extends": "../tsconfig.base.json",
  "include": ["src"]
}
```

- [ ] **Step 3: Install dependencies**

Run: `pnpm install`

Expected: lockfile updated; `@portfolio/api` linked.

- [ ] **Step 4: Commit**

```bash
pnpm exec prettier --write api/package.json api/tsconfig.json pnpm-workspace.yaml pnpm-lock.yaml
git add api/package.json api/tsconfig.json pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "chore(api): add @portfolio/api workspace package"
```

---

### Task 4: API environment reader

**Files:**

- Create: `api/src/environment.ts`, `api/src/environment.test.ts`

**Interfaces:**

- Produces: `readApiEnvironment(source) => ApiEnvironment` with `{ port, directusUrl, directusToken, hookSecret }`.

- [ ] **Step 1: Write failing environment tests**

```typescript
import { describe, expect, it } from 'vitest';

import { readApiEnvironment } from './environment.ts';

const validSource = {
  API_PORT: '8066',
  DIRECTUS_URL: 'http://localhost:8065',
  API_TOKEN: 'api-token',
  PUBLICATION_HOOK_SECRET: 'hook-secret',
};

describe('readApiEnvironment', () => {
  it('reads the API settings', () => {
    expect(readApiEnvironment(validSource)).toEqual({
      port: 8066,
      directusUrl: 'http://localhost:8065',
      directusToken: 'api-token',
      hookSecret: 'hook-secret',
    });
  });

  it('rejects a non-numeric port', () => {
    expect(() => readApiEnvironment({ ...validSource, API_PORT: 'abc' })).toThrow('API_PORT');
  });

  it('rejects a port outside the allowed range', () => {
    expect(() => readApiEnvironment({ ...validSource, API_PORT: '70000' })).toThrow('API_PORT');
  });

  it('names a missing required variable', () => {
    expect(() => readApiEnvironment({ ...validSource, API_TOKEN: '' })).toThrow('API_TOKEN');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @portfolio/api exec vitest run src/environment.test.ts`

Expected: FAIL (`readApiEnvironment` not found)

- [ ] **Step 3: Implement `api/src/environment.ts`**

```typescript
export type ApiEnvironment = {
  port: number;
  directusUrl: string;
  directusToken: string;
  hookSecret: string;
};

type EnvironmentSource = Record<string, string | undefined>;

export function readApiEnvironment(source: EnvironmentSource): ApiEnvironment {
  return {
    port: readPort(source),
    directusUrl: requireValue(source, 'DIRECTUS_URL'),
    directusToken: requireValue(source, 'API_TOKEN'),
    hookSecret: requireValue(source, 'PUBLICATION_HOOK_SECRET'),
  };
}

function readPort(source: EnvironmentSource): number {
  const raw = requireValue(source, 'API_PORT');
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`API_PORT must be an integer between 1 and 65535 (received "${raw}").`);
  }
  return parsed;
}

function requireValue(source: EnvironmentSource, name: string): string {
  const value = source[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(`The environment variable ${name} is required.`);
  }
  return value;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @portfolio/api exec vitest run src/environment.test.ts`

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
pnpm exec prettier --write api/src/environment.ts api/src/environment.test.ts
git add api/src/environment.ts api/src/environment.test.ts
git commit -m "feat(api): read API environment configuration"
```

---

### Task 5: Directus publication source

**Files:**

- Create: `api/src/publications/publication-source.ts`, `api/src/publications/directus-publication-source.ts`, `api/src/publications/directus-publication-source.test.ts`

**Interfaces:**

- Consumes: `activePublicationSchema`, `validatePublicationContent`, `PortfolioSchema`.
- Produces: `PublicationSource`, `PublicationSourceError`, `createDirectusPublicationSource(url, token)`, `toActivePublication(row)`.

- [ ] **Step 1: Write failing tests for `toActivePublication`**

```typescript
import { contentFixture } from '@portfolio/content/testing';
import { describe, expect, it } from 'vitest';

import { toActivePublication } from './directus-publication-source.ts';

const publicationId = '3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42';

describe('toActivePublication', () => {
  it('maps a valid Directus row', () => {
    expect(
      toActivePublication({
        id: publicationId,
        content: contentFixture,
        activated_at: '2026-10-13T08:00:00.000Z',
      })
    ).toEqual({
      publicationId,
      activatedAt: '2026-10-13T08:00:00.000Z',
      content: contentFixture,
    });
  });

  it('refuses a row without activated_at', () => {
    expect(() =>
      toActivePublication({ id: publicationId, content: contentFixture, activated_at: null })
    ).toThrow('activation timestamp');
  });

  it('refuses invalid content without echoing values', () => {
    expect(() =>
      toActivePublication({
        id: publicationId,
        content: { profile: null },
        activated_at: '2026-10-13T08:00:00.000Z',
      })
    ).toThrow(/Invalid publication content/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @portfolio/api exec vitest run src/publications/directus-publication-source.test.ts`

Expected: FAIL

- [ ] **Step 3: Add publication source types and Directus adapter**

```typescript
import type { ActivePublication } from '@portfolio/content';

export type PublicationSource = {
  readActive(): Promise<ActivePublication | null>;
  ping(): Promise<boolean>;
};

export class PublicationSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PublicationSourceError';
  }
}
```

```typescript
import { createDirectus, readItems, rest, staticToken } from '@directus/sdk';
import type { PortfolioSchema } from '@portfolio/cms-schema';
import {
  activePublicationSchema,
  type ActivePublication,
  validatePublicationContent,
} from '@portfolio/content';
import { z } from 'zod';

import { PublicationSourceError, type PublicationSource } from './publication-source.ts';

const publicationRowSchema = z.object({
  id: z.uuid(),
  content: z.unknown(),
  activated_at: z.string().nullable(),
});

type PublicationRow = z.infer<typeof publicationRowSchema>;

export function createDirectusPublicationSource(url: string, token: string): PublicationSource {
  const client = createDirectus<PortfolioSchema>(url).with(staticToken(token)).with(rest());

  return {
    readActive: async () => {
      const rows = await client.request(
        readItems('publications', {
          filter: { status: { _eq: 'active' } },
          fields: ['id', 'content', 'activated_at'],
          limit: 2,
        })
      );
      if (rows.length === 0) {
        return null;
      }
      if (rows.length > 1) {
        throw new PublicationSourceError('Several publications are active');
      }
      return toActivePublication(publicationRowSchema.parse(rows[0]));
    },
    ping: async () => pingDirectus(url),
  };
}

export function toActivePublication(row: PublicationRow): ActivePublication {
  if (row.activated_at === null) {
    throw new PublicationSourceError('The active publication has no activation timestamp');
  }
  const validation = validatePublicationContent(row.content);
  if (!validation.valid) {
    const summary = validation.problems
      .slice(0, 5)
      .map((problem) => `${problem.path}: ${problem.message}`)
      .join('; ');
    throw new PublicationSourceError(`Invalid publication content (${summary})`);
  }
  return activePublicationSchema.parse({
    publicationId: row.id,
    activatedAt: row.activated_at,
    content: validation.content,
  });
}

async function pingDirectus(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/server/ping`, { signal: AbortSignal.timeout(3000) });
    return response.ok;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @portfolio/api exec vitest run src/publications/directus-publication-source.test.ts`

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
pnpm exec prettier --write api/src/publications/publication-source.ts api/src/publications/directus-publication-source.ts api/src/publications/directus-publication-source.test.ts
git add api/src/publications/publication-source.ts api/src/publications/directus-publication-source.ts api/src/publications/directus-publication-source.test.ts
git commit -m "feat(api): read active publication from Directus"
```

---

### Task 6: Active publication cache

**Files:**

- Create: `api/src/publications/active-publication-cache.ts`, `api/src/publications/active-publication-cache.test.ts`, `api/src/publications/index.ts`

**Interfaces:**

- Consumes: `PublicationSource`.
- Produces: `ActivePublicationCache`, `createActivePublicationCache(source)`.

- [ ] **Step 1: Write failing cache tests**

`api/src/publications/active-publication-cache.test.ts`:

```typescript
import type { ActivePublication } from '@portfolio/content';
import { activePublicationFixture } from '@portfolio/content/testing';
import { describe, expect, it, vi } from 'vitest';

import { createActivePublicationCache } from './active-publication-cache.ts';
import type { PublicationSource } from './publication-source.ts';

const updatedPublication: ActivePublication = {
  ...activePublicationFixture,
  publicationId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
};

function sourceReading(readActive: PublicationSource['readActive']): PublicationSource {
  return { readActive, ping: async () => true };
}

function resolveLater(
  publication: ActivePublication | null,
  delayMs: number
): Promise<ActivePublication | null> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(publication), delayMs);
  });
}

describe('createActivePublicationCache', () => {
  it('loads lazily and reuses a cached publication', async () => {
    const readActive = vi
      .fn<PublicationSource['readActive']>()
      .mockResolvedValue(activePublicationFixture);
    const cache = createActivePublicationCache(sourceReading(readActive));

    expect(readActive).not.toHaveBeenCalled();
    await expect(cache.current()).resolves.toEqual(activePublicationFixture);
    await expect(cache.current()).resolves.toEqual(activePublicationFixture);
    expect(readActive).toHaveBeenCalledTimes(1);
  });

  it('reads again after finding no active publication', async () => {
    const readActive = vi
      .fn<PublicationSource['readActive']>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(activePublicationFixture);
    const cache = createActivePublicationCache(sourceReading(readActive));

    await expect(cache.current()).resolves.toBeNull();
    await expect(cache.current()).resolves.toEqual(activePublicationFixture);
    expect(readActive).toHaveBeenCalledTimes(2);
  });

  it('shares one read between concurrent first requests', async () => {
    const readActive = vi
      .fn<PublicationSource['readActive']>()
      .mockImplementation(() => resolveLater(activePublicationFixture, 10));
    const cache = createActivePublicationCache(sourceReading(readActive));

    await expect(Promise.all([cache.current(), cache.current()])).resolves.toEqual([
      activePublicationFixture,
      activePublicationFixture,
    ]);
    expect(readActive).toHaveBeenCalledTimes(1);
  });

  it('always reads the source on reload', async () => {
    const readActive = vi
      .fn<PublicationSource['readActive']>()
      .mockResolvedValueOnce(activePublicationFixture)
      .mockResolvedValueOnce(updatedPublication);
    const cache = createActivePublicationCache(sourceReading(readActive));

    await cache.current();
    await expect(cache.reload()).resolves.toEqual(updatedPublication);
    await expect(cache.current()).resolves.toEqual(updatedPublication);
    expect(readActive).toHaveBeenCalledTimes(2);
  });

  it('keeps the previous publication when a reload fails', async () => {
    const readActive = vi
      .fn<PublicationSource['readActive']>()
      .mockResolvedValueOnce(activePublicationFixture)
      .mockRejectedValueOnce(new Error('Directus down'));
    const cache = createActivePublicationCache(sourceReading(readActive));

    await cache.current();
    await expect(cache.reload()).rejects.toThrow('Directus down');
    await expect(cache.current()).resolves.toEqual(activePublicationFixture);
  });

  it('never lets an older read overwrite a newer reload', async () => {
    const readActive = vi
      .fn<PublicationSource['readActive']>()
      .mockImplementationOnce(() => resolveLater(activePublicationFixture, 20))
      .mockResolvedValueOnce(updatedPublication);
    const cache = createActivePublicationCache(sourceReading(readActive));

    const firstRequest = cache.current();
    await expect(cache.reload()).resolves.toEqual(updatedPublication);
    await firstRequest;
    await expect(cache.current()).resolves.toEqual(updatedPublication);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @portfolio/api exec vitest run src/publications/active-publication-cache.test.ts`

Expected: FAIL (cannot resolve `./active-publication-cache.ts`)

- [ ] **Step 3: Implement cache**

`api/src/publications/active-publication-cache.ts`:

```typescript
import type { ActivePublication } from '@portfolio/content';

import type { PublicationSource } from './publication-source.ts';

export type ActivePublicationCache = {
  current(): Promise<ActivePublication | null>;
  reload(): Promise<ActivePublication | null>;
};

type CacheState = {
  publication: ActivePublication | null;
  latestRead: number;
  pendingFirstRead: Promise<ActivePublication | null> | null;
};

export function createActivePublicationCache(source: PublicationSource): ActivePublicationCache {
  // The API's only state between requests. Only the most recently started read may replace the
  // cached publication, so a slow read that began before an activation cannot undo a reload.
  const state: CacheState = { publication: null, latestRead: 0, pendingFirstRead: null };

  async function read(): Promise<ActivePublication | null> {
    state.latestRead += 1;
    const readNumber = state.latestRead;
    const publication = await source.readActive();
    if (readNumber === state.latestRead) {
      state.publication = publication;
    }
    return publication;
  }

  function sharedFirstRead(): Promise<ActivePublication | null> {
    if (state.pendingFirstRead === null) {
      state.pendingFirstRead = read().finally(() => {
        state.pendingFirstRead = null;
      });
    }
    return state.pendingFirstRead;
  }

  return {
    current: async () => {
      if (state.publication !== null) {
        return state.publication;
      }
      return sharedFirstRead();
    },
    reload: read,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @portfolio/api exec vitest run src/publications/active-publication-cache.test.ts`

Expected: PASS (6 tests)

- [ ] **Step 5: Export from `api/src/publications/index.ts`**

```typescript
export * from './active-publication-cache.ts';
export * from './directus-publication-source.ts';
export * from './publication-source.ts';
```

- [ ] **Step 6: Commit**

```bash
pnpm exec prettier --write api/src/publications/active-publication-cache.ts api/src/publications/active-publication-cache.test.ts api/src/publications/index.ts
git add api/src/publications/active-publication-cache.ts api/src/publications/active-publication-cache.test.ts api/src/publications/index.ts
git commit -m "feat(api): cache active publication reads"
```

---

### Task 7: Hook bearer authorization

**Files:**

- Create: `api/src/http/hook-authorization.ts`, `api/src/http/hook-authorization.test.ts`

**Interfaces:**

- Produces: `isAuthorizedHookCall(header, secret): boolean`.

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, expect, it } from 'vitest';

import { isAuthorizedHookCall } from './hook-authorization.ts';

const secret = 'hook-secret-value';

describe('isAuthorizedHookCall', () => {
  it('accepts the correct bearer secret', () => {
    expect(isAuthorizedHookCall(`Bearer ${secret}`, secret)).toBe(true);
  });

  it('rejects a wrong secret', () => {
    expect(isAuthorizedHookCall('Bearer wrong-secret', secret)).toBe(false);
  });

  it('rejects a missing header', () => {
    expect(isAuthorizedHookCall(undefined, secret)).toBe(false);
  });

  it('rejects another authorization scheme', () => {
    expect(isAuthorizedHookCall(`Basic ${secret}`, secret)).toBe(false);
  });

  it('rejects an empty bearer token', () => {
    expect(isAuthorizedHookCall('Bearer ', secret)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @portfolio/api exec vitest run src/http/hook-authorization.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement authorization helper**

```typescript
import { createHash, timingSafeEqual } from 'node:crypto';

export function isAuthorizedHookCall(header: string | undefined, secret: string): boolean {
  if (header === undefined) {
    return false;
  }
  const match = /^Bearer\s+(\S+)\s*$/u.exec(header);
  if (match === null) {
    return false;
  }
  const token = match[1];
  if (token === undefined || token.length === 0) {
    return false;
  }
  return safeEqual(token, secret);
}

function safeEqual(left: string, right: string): boolean {
  const leftDigest = createHash('sha256').update(left, 'utf8').digest();
  const rightDigest = createHash('sha256').update(right, 'utf8').digest();
  return timingSafeEqual(leftDigest, rightDigest);
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @portfolio/api exec vitest run src/http/hook-authorization.test.ts`

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
pnpm exec prettier --write api/src/http/hook-authorization.ts api/src/http/hook-authorization.test.ts
git add api/src/http/hook-authorization.ts api/src/http/hook-authorization.test.ts
git commit -m "feat(api): authorize publication hook calls"
```

---

### Task 8: Hono HTTP application

**Files:**

- Create: `api/src/http/app.ts`, `api/src/http/app.test.ts`

**Interfaces:**

- Consumes: `ActivePublicationCache`, `PublicationSource`, `isAuthorizedHookCall`.
- Produces: `createApp(dependencies): Hono` with routes `/content/active`, `/health`, `/internal/publications/activated`.

- [ ] **Step 1: Write failing HTTP tests**

```typescript
import { activePublicationFixture } from '@portfolio/content/testing';
import { describe, expect, it, vi } from 'vitest';

import { createActivePublicationCache } from '../publications/active-publication-cache.ts';
import {
  PublicationSourceError,
  type PublicationSource,
} from '../publications/publication-source.ts';
import { createApp } from './app.ts';

function createTestApp(source: PublicationSource, hookSecret = 'hook-secret') {
  const log = vi.fn<(message: string) => void>();
  const cache = createActivePublicationCache(source);
  const app = createApp({ cache, source, hookSecret, log });
  return { app, log, cache };
}

describe('createApp', () => {
  it('returns the active publication with caching headers', async () => {
    const source: PublicationSource = {
      readActive: async () => activePublicationFixture,
      ping: async () => true,
    };
    const { app } = createTestApp(source);

    const response = await app.request('http://localhost/content/active');

    expect(response.status).toBe(200);
    expect(response.headers.get('ETag')).toBe(`"${activePublicationFixture.publicationId}"`);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
    await expect(response.json()).resolves.toEqual(activePublicationFixture);
  });

  it('returns 304 when If-None-Match matches the publication id', async () => {
    const source: PublicationSource = {
      readActive: async () => activePublicationFixture,
      ping: async () => true,
    };
    const { app } = createTestApp(source);

    const response = await app.request('http://localhost/content/active', {
      headers: { 'If-None-Match': `"${activePublicationFixture.publicationId}"` },
    });

    expect(response.status).toBe(304);
    expect(response.headers.get('ETag')).toBe(`"${activePublicationFixture.publicationId}"`);
  });

  it('returns 404 when no publication is active', async () => {
    const source: PublicationSource = {
      readActive: async () => null,
      ping: async () => true,
    };
    const { app } = createTestApp(source);

    const response = await app.request('http://localhost/content/active');

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'not_found' });
  });

  it('returns 503 when the source fails', async () => {
    const source: PublicationSource = {
      readActive: async () => {
        throw new PublicationSourceError('Directus unavailable');
      },
      ping: async () => true,
    };
    const { app } = createTestApp(source);

    const response = await app.request('http://localhost/content/active');

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: 'unavailable' });
  });

  it('returns 200 health when Directus responds', async () => {
    const source: PublicationSource = {
      readActive: async () => activePublicationFixture,
      ping: async () => true,
    };
    const { app } = createTestApp(source);

    const response = await app.request('http://localhost/health');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      directus: 'up',
      publicationId: activePublicationFixture.publicationId,
    });
  });

  it('returns 503 health when Directus is down', async () => {
    const source: PublicationSource = {
      readActive: async () => activePublicationFixture,
      ping: async () => false,
    };
    const { app } = createTestApp(source);

    const response = await app.request('http://localhost/health');

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      status: 'degraded',
      directus: 'down',
      publicationId: activePublicationFixture.publicationId,
    });
  });

  it('rejects an unauthorized hook call', async () => {
    const source: PublicationSource = {
      readActive: async () => null,
      ping: async () => true,
    };
    const { app } = createTestApp(source);

    const response = await app.request('http://localhost/internal/publications/activated', {
      method: 'POST',
      headers: { Authorization: 'Bearer wrong' },
      body: JSON.stringify({ publicationId: activePublicationFixture.publicationId }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'unauthorized' });
  });

  it('rejects an invalid hook body', async () => {
    const source: PublicationSource = {
      readActive: async () => null,
      ping: async () => true,
    };
    const { app } = createTestApp(source);

    const response = await app.request('http://localhost/internal/publications/activated', {
      method: 'POST',
      headers: { Authorization: 'Bearer hook-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicationId: 'not-a-uuid' }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'invalid_request' });
  });

  it('rejects a hook body that is not JSON', async () => {
    const source: PublicationSource = {
      readActive: async () => null,
      ping: async () => true,
    };
    const { app } = createTestApp(source);

    const response = await app.request('http://localhost/internal/publications/activated', {
      method: 'POST',
      headers: { Authorization: 'Bearer hook-secret', 'Content-Type': 'application/json' },
      body: '{"publicationId":',
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'invalid_request' });
  });

  it('reloads the cache on a valid hook call', async () => {
    const readActive = vi
      .fn<PublicationSource['readActive']>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(activePublicationFixture);
    const source: PublicationSource = {
      readActive,
      ping: async () => true,
    };
    const { app, log } = createTestApp(source);

    await app.request('http://localhost/content/active');
    const response = await app.request('http://localhost/internal/publications/activated', {
      method: 'POST',
      headers: { Authorization: 'Bearer hook-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicationId: activePublicationFixture.publicationId }),
    });

    expect(response.status).toBe(204);
    expect(log).toHaveBeenCalledWith(
      `Publication ${activePublicationFixture.publicationId} activated; serving ${activePublicationFixture.publicationId}`
    );
    const activeResponse = await app.request('http://localhost/content/active');
    await expect(activeResponse.json()).resolves.toEqual(activePublicationFixture);
  });

  it('returns 503 when reload fails after a hook call', async () => {
    const source: PublicationSource = {
      readActive: async () => {
        throw new PublicationSourceError('read failed');
      },
      ping: async () => true,
    };
    const { app } = createTestApp(source);

    const response = await app.request('http://localhost/internal/publications/activated', {
      method: 'POST',
      headers: { Authorization: 'Bearer hook-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicationId: activePublicationFixture.publicationId }),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: 'unavailable' });
  });

  it('returns 404 for unknown routes', async () => {
    const source: PublicationSource = {
      readActive: async () => null,
      ping: async () => true,
    };
    const { app } = createTestApp(source);

    const response = await app.request('http://localhost/unknown');

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'not_found' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @portfolio/api exec vitest run src/http/app.test.ts`

Expected: FAIL (`createApp` not found)

- [ ] **Step 3: Implement Hono app**

```typescript
import type { ActivePublication } from '@portfolio/content';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';

import type { ActivePublicationCache } from '../publications/active-publication-cache.ts';
import type { PublicationSource } from '../publications/publication-source.ts';
import { isAuthorizedHookCall } from './hook-authorization.ts';

const activationBodySchema = z.object({ publicationId: z.uuid() }).strict();

export type AppDependencies = {
  cache: ActivePublicationCache;
  source: PublicationSource;
  hookSecret: string;
  log: (message: string) => void;
};

export function createApp(dependencies: AppDependencies): Hono {
  const app = new Hono();

  app.get('/content/active', async (context) => {
    try {
      const active = await dependencies.cache.current();
      if (active === null) {
        return context.json({ error: 'not_found' }, 404);
      }
      return respondWithActivePublication(context, active);
    } catch (error) {
      dependencies.log(`Active publication unavailable: ${describeError(error)}`);
      return context.json({ error: 'unavailable' }, 503);
    }
  });

  app.get('/health', async (context) => {
    const directusUp = await dependencies.source.ping();
    const publicationId = await readPublicationIdSafely(dependencies.cache);
    if (!directusUp) {
      return context.json({ status: 'degraded', directus: 'down', publicationId }, 503);
    }
    return context.json({ status: 'ok', directus: 'up', publicationId }, 200);
  });

  app.post('/internal/publications/activated', async (context) => {
    if (!isAuthorizedHookCall(context.req.header('Authorization'), dependencies.hookSecret)) {
      return context.json({ error: 'unauthorized' }, 401);
    }
    const body = await readActivationBody(context);
    if (body === null) {
      return context.json({ error: 'invalid_request' }, 400);
    }
    try {
      const active = await dependencies.cache.reload();
      dependencies.log(
        `Publication ${body.publicationId} activated; serving ${active?.publicationId ?? 'none'}`
      );
      return context.body(null, 204);
    } catch (error) {
      dependencies.log(`Reload after activation failed: ${describeError(error)}`);
      return context.json({ error: 'unavailable' }, 503);
    }
  });

  app.notFound((context) => context.json({ error: 'not_found' }, 404));

  app.onError((error, context) => {
    dependencies.log(`Unexpected error: ${describeError(error)}`);
    return context.json({ error: 'internal_error' }, 500);
  });

  return app;
}

function respondWithActivePublication(context: Context, active: ActivePublication): Response {
  const etag = `"${active.publicationId}"`;
  const ifNoneMatch = context.req.header('If-None-Match');
  if (ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        'Cache-Control': 'public, max-age=60',
      },
    });
  }
  return context.json(active, 200, {
    ETag: etag,
    'Cache-Control': 'public, max-age=60',
  });
}

async function readActivationBody(context: Context): Promise<{ publicationId: string } | null> {
  const body = await readJsonBody(context);
  const parsed = activationBodySchema.safeParse(body);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}

async function readJsonBody(context: Context): Promise<unknown> {
  try {
    const body: unknown = await context.req.json();
    return body;
  } catch {
    return null;
  }
}

async function readPublicationIdSafely(cache: ActivePublicationCache): Promise<string | null> {
  try {
    const active = await cache.current();
    return active?.publicationId ?? null;
  } catch {
    return null;
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @portfolio/api exec vitest run src/http/app.test.ts`

Expected: PASS (12 tests)

- [ ] **Step 5: Run full API package tests**

Run: `pnpm --filter @portfolio/api test`

Expected: PASS (30 tests)

- [ ] **Step 6: Commit**

```bash
pnpm exec prettier --write api/src/http/app.ts api/src/http/app.test.ts
git add api/src/http/app.ts api/src/http/app.test.ts
git commit -m "feat(api): expose content and hook HTTP routes"
```

---

### Task 9: API entrypoint and `pnpm dev:api`

**Files:**

- Create: `api/src/main.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes: `readApiEnvironment`, `createDirectusPublicationSource`, `createActivePublicationCache`, `createApp`.

- [ ] **Step 1: Add `api/src/main.ts`**

```typescript
import { serve } from '@hono/node-server';

import { createApp } from './http/app.ts';
import { readApiEnvironment } from './environment.ts';
import type { ApiEnvironment } from './environment.ts';
import { createActivePublicationCache } from './publications/active-publication-cache.ts';
import { createDirectusPublicationSource } from './publications/directus-publication-source.ts';

function readEnvironmentOrExit(): ApiEnvironment {
  try {
    return readApiEnvironment(process.env);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function main(): void {
  const environment = readEnvironmentOrExit();
  const source = createDirectusPublicationSource(
    environment.directusUrl,
    environment.directusToken
  );
  const cache = createActivePublicationCache(source);
  const app = createApp({
    cache,
    source,
    hookSecret: environment.hookSecret,
    log: (message) => {
      console.log(message);
    },
  });
  const server = serve({ fetch: app.fetch, port: environment.port }, (info) => {
    console.log(`API listening on http://localhost:${info.port}`);
  });

  const shutdown = (): void => {
    server.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
```

- [ ] **Step 2: Add root script after `build:site` in `package.json`**

```json
    "dev:api": "pnpm --filter @portfolio/api dev",
```

- [ ] **Step 3: Confirm root tests include the API package**

Run: `pnpm test`

Expected: `@portfolio/api` Vitest summary with 30 passed tests.

- [ ] **Step 4: Manual verification against local Directus (API must be the only listener on 8066)**

Run in one terminal: `pnpm dev:api`

Expected console line: `API listening on http://localhost:8066`

In another terminal (no secret values printed):

```bash
curl -s localhost:8066/health
# Expected JSON containing "status":"ok" and "directus":"up"

curl -si localhost:8066/content/active | head -20
# Expected HTTP/1.1 200, ETag header "<uuid>", Cache-Control: public, max-age=60
# When no active publication exists: HTTP/1.1 404 and {"error":"not_found"}

HOOK_SECRET=$(grep '^PUBLICATION_HOOK_SECRET=' .env | cut -d= -f2-)
ACTIVE_ID=$(curl -s localhost:8066/health | sed -n 's/.*"publicationId":"\([^"]*\)".*/\1/p')
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:8066/internal/publications/activated \
  -H "Authorization: Bearer wrong" -H "Content-Type: application/json" \
  -d "{\"publicationId\":\"$ACTIVE_ID\"}"
# Expected: 401

curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:8066/internal/publications/activated \
  -H "Authorization: Bearer ${HOOK_SECRET}" -H "Content-Type: application/json" \
  -d "{\"publicationId\":\"$ACTIVE_ID\"}"
# Expected: 204
```

Stop the dev server before CMS integration tests.

- [ ] **Step 5: Commit**

```bash
pnpm exec prettier --write api/src/main.ts package.json
git add api/src/main.ts package.json
git commit -m "feat(api): add dev server entrypoint and root script"
```

---

### Task 10: CMS integration test of the content API

**Files:**

- Create: `cms/tests/src/content-api.test.ts`
- Modify: `cms/tests/package.json`, `pnpm-lock.yaml`

**Interfaces:**

- Consumes: `createApp`, `createDirectusPublicationSource`, `createActivePublicationCache`, publication flow helpers, `testEnvironment.apiToken`, `testEnvironment.hookSecret`.

- [ ] **Step 1: Add devDependency in `cms/tests/package.json`**

```json
    "@portfolio/api": "workspace:*",
```

Run: `pnpm install`

- [ ] **Step 2: Write integration test file**

```typescript
import { readSingleton, updateSingleton } from '@directus/sdk';
import { createApp } from '@portfolio/api/app';
import {
  createActivePublicationCache,
  createDirectusPublicationSource,
} from '@portfolio/api/publications';
import { PREPARE_FLOW_NAME, PUBLISH_FLOW_NAME } from '@portfolio/cms-schema/operations';
import { validatePublicationContent } from '@portfolio/content';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { adminClient, ownerClient } from './support/clients.ts';
import { testEnvironment } from './support/environment.ts';
import { uniqueSuffix } from './support/fixtures.ts';
import { startHookServer } from './support/hook-server.ts';
import type { HookResponder } from './support/hook-server.ts';
import { readActivePublicationIds, readFlowId, triggerFlow } from './support/publication.ts';

const suffix = uniqueSuffix();
const ownerToken = testEnvironment.ownerToken;
const prepareFlowId = await readFlowId(PREPARE_FLOW_NAME);
const publishFlowId = await readFlowId(PUBLISH_FLOW_NAME);
const hookResponder = vi.fn<HookResponder>(() => 204);
const hookServer = await startHookServer(testEnvironment.hookUrl, hookResponder);
const source = createDirectusPublicationSource(
  testEnvironment.directusUrl,
  testEnvironment.apiToken
);
const cache = createActivePublicationCache(source);
const app = createApp({
  cache,
  source,
  hookSecret: testEnvironment.hookSecret,
  log: () => undefined,
});
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

describe('content API against Directus', () => {
  it('serves the active publication after Prepare and Publish', async () => {
    await changeContent('Content API');
    const publicationId = await prepare();
    await publish(publicationId);

    const response = await app.request('http://test/content/active');
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ publicationId });
    const content =
      typeof body === 'object' && body !== null && 'content' in body ? body.content : undefined;
    expect(validatePublicationContent(content).valid).toBe(true);
    expect(await readActivePublicationIds()).toEqual([publicationId]);
  });

  it('authorizes the activation hook and keeps serving the active publication', async () => {
    const unauthorized = await app.request('http://test/internal/publications/activated', {
      method: 'POST',
      headers: { Authorization: 'Bearer wrong-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicationId: '3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42' }),
    });
    expect(unauthorized.status).toBe(401);

    const activeIds = await readActivePublicationIds();
    const [activeId] = activeIds;
    if (activeId === undefined) {
      throw new Error('Expected an active publication from earlier tests.');
    }

    const authorized = await app.request('http://test/internal/publications/activated', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${testEnvironment.hookSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicationId: activeId }),
    });
    expect(authorized.status).toBe(204);

    const activeResponse = await app.request('http://test/content/active');
    await expect(activeResponse.json()).resolves.toMatchObject({ publicationId: activeId });
  });

  it('reports Directus as up on health', async () => {
    const response = await app.request('http://test/health');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: 'ok', directus: 'up' });
  });
});
```

- [ ] **Step 3: Ensure port 8066 is free, then run CMS tests**

Run: `lsof -i :8066 || echo "port 8066 free"`

Run: `pnpm test:cms`

Expected: PASS (48 tests), including `content API against Directus`.

The dev API (`pnpm dev:api`) must not run during this suite.

- [ ] **Step 4: Commit**

```bash
pnpm exec prettier --write cms/tests/package.json cms/tests/src/content-api.test.ts pnpm-lock.yaml
git add cms/tests/package.json cms/tests/src/content-api.test.ts pnpm-lock.yaml
git commit -m "test(cms): cover content API against Directus"
```

---

### Task 11: Site toolchain upgrade

**Files:**

- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `site/package.json`
- `site/src/hooks/__tests__/use-scroll-spy.test.ts`
- `site/vitest.config.ts`

- [ ] **Step 1: Add dependencies**

```bash
cd site
pnpm remove vite-tsconfig-paths
pnpm add next@16.4.0 react@19.3.0 react-dom@19.3.0
pnpm add -D eslint-config-next@16.4.0 typescript@~6.0.3 vite@^8.3.4 vitest@^5.0.4 @vitejs/plugin-react@^6.1.2 jsdom@^29.0.2 @types/node@^24.19.2 @types/react@^19.3.0 @types/react-dom@^19.3.0 @testing-library/jest-dom@^7.0.1
```

- [ ] **Step 2: Write the failing test(s)**

Create `site/src/hooks/__tests__/use-scroll-spy.test.ts`:

```typescript
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useScrollSpy } from '@/hooks/use-scroll-spy';

type ObserverCallback = (entries: IntersectionObserverEntry[]) => void;

class FakeObserver implements IntersectionObserver {
  static lastInstance: FakeObserver | null = null;

  readonly root = null;
  readonly rootMargin = '';
  readonly scrollMargin = '';
  readonly thresholds: ReadonlyArray<number> = [];
  readonly callback: ObserverCallback;
  readonly observed: Element[] = [];

  constructor(callback: ObserverCallback) {
    this.callback = callback;
    FakeObserver.lastInstance = this;
  }

  observe(target: Element): void {
    this.observed.push(target);
  }

  unobserve(): void {}

  disconnect(): void {}

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  trigger(entries: IntersectionObserverEntry[]): void {
    this.callback(entries);
  }
}

beforeEach(() => {
  FakeObserver.lastInstance = null;
  vi.stubGlobal('IntersectionObserver', FakeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function setupSections(ids: readonly string[]): void {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
  for (const id of ids) {
    const section = document.createElement('section');
    section.id = id;
    document.body.appendChild(section);
  }
}

function makeEntry(id: string, ratio: number): IntersectionObserverEntry {
  const element = document.createElement('section');
  element.id = id;
  return {
    target: element,
    isIntersecting: ratio > 0,
    intersectionRatio: ratio,
    boundingClientRect: element.getBoundingClientRect(),
    intersectionRect: element.getBoundingClientRect(),
    rootBounds: null,
    time: 0,
  };
}

describe('useScrollSpy', () => {
  it('returns the first section id by default', () => {
    setupSections(['hero', 'about']);
    const { result } = renderHook(() => useScrollSpy(['hero', 'about']));
    expect(result.current).toBe('hero');
  });

  it('returns the most-intersecting section id when entries change', () => {
    setupSections(['hero', 'about']);
    const { result, rerender } = renderHook(() => useScrollSpy(['hero', 'about']));

    const observer = FakeObserver.lastInstance;
    if (!observer) throw new Error('Observer not registered');

    observer.trigger([makeEntry('hero', 0.1), makeEntry('about', 0.9)]);
    rerender();

    expect(result.current).toBe('about');
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run: `pnpm --filter @portfolio/site exec vitest run site/src/hooks/__tests__/use-scroll-spy.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 4: Implement**

**`pnpm-workspace.yaml`** — delete the jest-dom comment and `packageExtensions` block only (leave `packages:` entries unchanged, including the `  - api` entry added in Task 3):

```diff
 packages:
   - site
+  - api
   - packages/*
   - cms/*
   - cms/extensions/*
 onlyBuiltDependencies:
   - esbuild
   - sharp
   - unrs-resolver
 ignoredBuiltDependencies:
   - vue-demi
-# jest-dom augments the `vitest` types without declaring the peer; without this, pnpm
-# resolves its import to the workspace's Vitest 5 instead of the site's Vitest 2.
-packageExtensions:
-  '@testing-library/jest-dom':
-    peerDependencies:
-      vitest: '*'
```

**`site/package.json`**:

```json
{
  "name": "@portfolio/site",
  "version": "0.1.0",
  "private": true,
  "type": "module",
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
    "next": "16.4.0",
    "next-themes": "^0.4.6",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "tailwind-merge": "^3.4.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@testing-library/jest-dom": "^7.0.1",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/node": "^24.19.2",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@typescript-eslint/eslint-plugin": "^8.53.0",
    "@vitejs/plugin-react": "^6.1.2",
    "eslint": "^9",
    "eslint-config-next": "16.4.0",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-prettier": "^5.5.5",
    "jsdom": "^29.1.1",
    "prettier": "3.7.4",
    "tailwindcss": "^4",
    "typescript": "^6.0.3",
    "vite": "^8.3.4",
    "vitest": "^5.0.4"
  }
}
```

**`site/vitest.config.ts`**:

```typescript
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    css: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
```

- [ ] **Step 5: Run verification**

Run: `pnpm --filter @portfolio/site typecheck`

Expected: PASS

Run: `pnpm --filter @portfolio/site lint`

Expected: PASS

Run: `pnpm --filter @portfolio/site test`

Expected: PASS — **47 passed**

Run: `pnpm --filter @portfolio/site build`

Expected: PASS

Run: `pnpm validate`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add pnpm-lock.yaml pnpm-workspace.yaml site/package.json site/src/hooks/__tests__/use-scroll-spy.test.ts site/vitest.config.ts
git commit -m "chore(site): upgrade Next 16.4 toolchain for plan 2"
```

### Task 12: Build-time publication file

**Files:**

- `.gitignore`
- `package.json`
- `pnpm-lock.yaml`
- `site/package.json`
- `site/scripts/write-content.ts`
- `site/src/lib/publication/__tests__/content-source.test.ts`
- `site/src/lib/publication/__tests__/read-publication.test.ts`
- `site/src/lib/publication/content-source.ts`
- `site/src/lib/publication/read-publication.ts`
- `site/tsconfig.json`

- [ ] **Step 1: Add dependencies**

```bash
cd site
pnpm add '@portfolio/content@workspace:*'
pnpm add -D '@portfolio/cms-provision@workspace:*'
```

- [ ] **Step 2: Write the failing test(s)**

Create `site/src/lib/publication/__tests__/content-source.test.ts`:

```typescript
import { contentFixture } from '@portfolio/content/testing';
import { describe, expect, it, vi } from 'vitest';

import { fetchActivePublication, seedPublication } from '../content-source.ts';

describe('seedPublication', () => {
  it('wraps content with the fixed seed identifiers', () => {
    expect(seedPublication(contentFixture)).toEqual({
      publicationId: '00000000-0000-4000-8000-000000000000',
      activatedAt: '2026-01-01T00:00:00.000Z',
      content: contentFixture,
    });
  });
});

describe('fetchActivePublication', () => {
  it('returns JSON from a successful response', async () => {
    const body = { publicationId: '3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42' };
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
    await expect(fetchActivePublication('http://127.0.0.1:8066', fetchImpl)).resolves.toEqual(body);
  });

  it('throws on non-200 responses', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 503 }));
    await expect(fetchActivePublication('http://127.0.0.1:8066', fetchImpl)).rejects.toThrow(/503/);
  });
});
```

Create `site/src/lib/publication/__tests__/read-publication.test.ts`:

```typescript
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { activePublicationFixture } from '@portfolio/content/testing';
import { describe, expect, it } from 'vitest';

import { parseActivePublication, readPublicationFile } from '../read-publication.ts';

describe('parseActivePublication', () => {
  it('accepts a valid active publication', () => {
    expect(parseActivePublication(activePublicationFixture)).toEqual(activePublicationFixture);
  });

  it('rejects invalid content references', () => {
    const broken = {
      ...activePublicationFixture,
      content: { ...activePublicationFixture.content, skills: [] },
    };
    expect(() => parseActivePublication(broken)).toThrow(/Invalid publication content/);
  });
});

describe('readPublicationFile', () => {
  it('reads a publication from disk', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'publication-'));
    const filePath = path.join(directory, 'publication.json');
    await writeFile(filePath, JSON.stringify(activePublicationFixture));
    expect(readPublicationFile(filePath)).toEqual(activePublicationFixture);
  });

  it('throws when the file is missing', () => {
    expect(() => readPublicationFile('/tmp/missing-publication.json')).toThrow(
      /No publication at.*content:seed/
    );
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run: `pnpm --filter @portfolio/site exec vitest run site/src/lib/publication/__tests__/content-source.test.ts site/src/lib/publication/__tests__/read-publication.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 4: Implement**

**`.gitignore`**:

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
site/content/

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

**`package.json`**:

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
    "dev:api": "pnpm --filter @portfolio/api dev",
    "content:seed": "pnpm --filter @portfolio/site content:seed",
    "content:pull": "pnpm --filter @portfolio/site content:pull",
    "lint": "pnpm -r --if-present lint",
    "typecheck": "pnpm -r --if-present typecheck",
    "test": "pnpm -r --filter '!@portfolio/cms-tests' --if-present test",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "validate": "pnpm typecheck && pnpm lint && pnpm format:check",
    "build:extension": "pnpm --filter directus-extension-publication build",
    "cms:up": "pnpm build:extension && docker compose up -d --wait",
    "cms:down": "docker compose down",
    "cms:logs": "docker compose logs -f directus",
    "provision": "pnpm --filter @portfolio/cms-provision start",
    "test:cms": "pnpm --filter @portfolio/cms-tests test",
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

**`site/package.json`**:

```json
{
  "name": "@portfolio/site",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --max-warnings 0",
    "lint:fix": "eslint . --fix",
    "test": "vitest run",
    "test:watch": "vitest --watch",
    "typecheck": "tsc --noEmit",
    "content:seed": "node scripts/write-content.ts --seed",
    "content:pull": "node scripts/write-content.ts --api"
  },
  "dependencies": {
    "@portfolio/content": "workspace:*",
    "clsx": "^2.1.1",
    "lucide-react": "^1.8.0",
    "motion": "^12.38.0",
    "next": "16.4.0",
    "next-themes": "^0.4.6",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "tailwind-merge": "^3.4.0"
  },
  "devDependencies": {
    "@portfolio/cms-provision": "workspace:*",
    "@tailwindcss/postcss": "^4",
    "@testing-library/jest-dom": "^7.0.1",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/node": "^24.19.2",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@typescript-eslint/eslint-plugin": "^8.53.0",
    "@vitejs/plugin-react": "^6.1.2",
    "eslint": "^9",
    "eslint-config-next": "16.4.0",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-prettier": "^5.5.5",
    "jsdom": "^29.1.1",
    "prettier": "3.7.4",
    "tailwindcss": "^4",
    "typescript": "^6.0.3",
    "vite": "^8.3.4",
    "vitest": "^5.0.4"
  }
}
```

**`site/scripts/write-content.ts`**:

```typescript
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { initialContent } from '@portfolio/cms-provision/seed';

import { fetchActivePublication, seedPublication } from '../src/lib/publication/content-source.ts';
import { parseActivePublication } from '../src/lib/publication/read-publication.ts';

const outputPath = path.join(process.cwd(), 'content', 'publication.json');

async function writePublication(publication: unknown): Promise<void> {
  const validated = parseActivePublication(publication);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(validated, null, 2)}\n`, 'utf8');
}

async function runSeed(): Promise<void> {
  await writePublication(seedPublication(initialContent));
}

async function runPull(): Promise<void> {
  const apiUrl = process.env.CONTENT_API_URL;
  if (!apiUrl) {
    throw new Error('CONTENT_API_URL is required for content:pull');
  }
  const json = await fetchActivePublication(apiUrl, fetch);
  await writePublication(json);
}

const mode = process.argv[2];
if (mode === '--seed') {
  await runSeed();
} else if (mode === '--api') {
  await runPull();
} else {
  throw new Error('Usage: node scripts/write-content.ts --seed | --api');
}
```

**`site/src/lib/publication/content-source.ts`**:

```typescript
import type { ActivePublication, PublicationContent } from '@portfolio/content';

const seedPublicationId = '00000000-0000-4000-8000-000000000000';
const seedActivatedAt = '2026-01-01T00:00:00.000Z';

export function seedPublication(content: PublicationContent): ActivePublication {
  return {
    publicationId: seedPublicationId,
    activatedAt: seedActivatedAt,
    content,
  };
}

export async function fetchActivePublication(
  apiUrl: string,
  fetchImpl: typeof fetch
): Promise<unknown> {
  const url = `${apiUrl}/content/active`;
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) {
    throw new Error(`Content API returned ${response.status} from ${url}`);
  }
  const body: unknown = await response.json();
  return body;
}
```

**`site/src/lib/publication/read-publication.ts`**:

```typescript
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  activePublicationSchema,
  validatePublicationContent,
  type ActivePublication,
} from '@portfolio/content';

function parseJson(text: string): unknown {
  return JSON.parse(text);
}

function formatSchemaPaths(issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey> }>): string {
  return issues
    .map((issue) => {
      const segments = issue.path.map(String);
      return segments.length > 0 ? segments.join('.') : '(root)';
    })
    .join(', ');
}

export function parseActivePublication(json: unknown): ActivePublication {
  const parsed = activePublicationSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`Invalid publication: ${formatSchemaPaths(parsed.error.issues)}`);
  }
  const validation = validatePublicationContent(parsed.data.content);
  if (!validation.valid) {
    const paths = validation.problems.map((problem) => problem.path);
    throw new Error(`Invalid publication content: ${paths.join(', ')}`);
  }
  return parsed.data;
}

export function readPublicationFile(filePath: string): ActivePublication {
  if (!existsSync(filePath)) {
    throw new Error(
      `No publication at ${filePath}: run \`pnpm content:seed\` or \`pnpm content:pull\`.`
    );
  }
  const raw = parseJson(readFileSync(filePath, 'utf8'));
  return parseActivePublication(raw);
}

export function readPublication(): ActivePublication {
  return readPublicationFile(path.join(process.cwd(), 'content', 'publication.json'));
}
```

**`site/tsconfig.json`**:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./src/components/*"],
      "@/hooks": ["./src/hooks"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types": ["./src/types"],
      "@/types/*": ["./src/types/*"],
      "@/constants/*": ["./src/constants/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Run verification**

Run: `pnpm --filter @portfolio/site typecheck`

Expected: PASS

Run: `pnpm --filter @portfolio/site lint`

Expected: PASS

Run: `pnpm --filter @portfolio/site test`

Expected: PASS — **54 passed**

Run: `pnpm --filter @portfolio/site build`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add .gitignore package.json pnpm-lock.yaml site/package.json site/scripts/write-content.ts site/src/lib/publication/__tests__/content-source.test.ts site/src/lib/publication/__tests__/read-publication.test.ts site/src/lib/publication/content-source.ts site/src/lib/publication/read-publication.ts site/tsconfig.json
git commit -m "feat(site): load build-time publication from seed or API"
```

### Task 13: Locales and UI dictionary

**Files:**

- `site/src/lib/i18n/__tests__/locales.test.ts`
- `site/src/lib/i18n/dictionary.ts`
- `site/src/lib/i18n/locales.ts`

- [ ] **Step 1: Write the failing test(s)**

Create `site/src/lib/i18n/__tests__/locales.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import {
  cvFileName,
  cvPath,
  localePath,
  locales,
  ogImagePath,
  openGraphLocale,
  otherLocale,
} from '../locales.ts';

describe('locales', () => {
  it('lists both site locales', () => {
    expect(locales).toEqual(['en', 'fr']);
  });

  it('maps locale paths and Open Graph locales', () => {
    expect(localePath('en')).toBe('/');
    expect(localePath('fr')).toBe('/fr');
    expect(openGraphLocale('en')).toBe('en_US');
    expect(openGraphLocale('fr')).toBe('fr_FR');
  });

  it('builds asset paths', () => {
    expect(cvFileName('en')).toBe('ny-randriantsarafara-cv-en.pdf');
    expect(cvPath('fr')).toBe('/documents/ny-randriantsarafara-cv-fr.pdf');
    expect(ogImagePath('en')).toBe('/og/og-en.png');
  });

  it('returns the alternate locale', () => {
    expect(otherLocale('en')).toBe('fr');
    expect(otherLocale('fr')).toBe('en');
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm --filter @portfolio/site exec vitest run site/src/lib/i18n/__tests__/locales.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Implement**

**`site/src/lib/i18n/dictionary.ts`**:

```typescript
import type { Locale } from '@portfolio/content';

export type Dictionary = {
  skipLink: string;
  nav: {
    home: string;
    about: string;
    work: string;
    experience: string;
    contact: string;
    ariaLabel: string;
  };
  theme: {
    switchToLight: string;
    switchToDark: string;
  };
  language: {
    switchLabel: string;
    targetName: string;
    suggestionLink: string;
  };
  hero: {
    headlinePrefix: string;
    headlineHighlight: string;
    headlineSuffix: string;
    primaryCta: string;
    secondaryCta: string;
    focusLabel: string;
    stackLabel: string;
  };
  about: {
    eyebrow: string;
    headlinePrefix: string;
    headlineHighlight: string;
    headlineSuffix: string;
    journeyTitle: string;
    coreStackTitle: string;
  };
  projects: {
    eyebrow: string;
    headlinePrefix: string;
    headlineHighlight: string;
    footnote: string;
  };
  experience: {
    eyebrow: string;
    headlinePrefix: string;
    headlineHighlight: string;
    description: string;
  };
  initiatives: {
    eyebrow: string;
    headlinePrefix: string;
    headlineHighlight: string;
    description: string;
  };
  contact: {
    eyebrow: string;
    headlinePrefix: string;
    headlineHighlight: string;
    cta: string;
    locationLabel: string;
    languagesLabel: string;
    statusLabel: string;
    channelEmail: string;
    channelLinkedin: string;
    channelGithub: string;
  };
  footer: {
    tagline: string;
    backToTop: string;
  };
  periods: {
    present: string;
  };
  cv: {
    profile: string;
    experience: string;
    projects: string;
    skills: string;
    keyFigures: string;
    contact: string;
    personalProjects: string;
  };
  og: {
    tagline: string;
  };
  notFound: {
    title: string;
    description: string;
    frenchLine: string;
    homeLink: string;
    frenchLink: string;
  };
};

const english: Dictionary = {
  skipLink: 'Skip to content',
  nav: {
    home: 'Home',
    about: 'About',
    work: 'Work',
    experience: 'Experience',
    contact: 'Contact',
    ariaLabel: 'Primary',
  },
  theme: {
    switchToLight: 'Switch to light mode',
    switchToDark: 'Switch to dark mode',
  },
  language: {
    switchLabel: 'Switch to French',
    targetName: 'French',
    suggestionLink: 'Version française',
  },
  hero: {
    headlinePrefix: 'Crafting cloud systems',
    headlineHighlight: 'built to last',
    headlineSuffix: 'not to impress.',
    primaryCta: 'Explore work',
    secondaryCta: 'Resume',
    focusLabel: 'Focus',
    stackLabel: 'Stack',
  },
  about: {
    eyebrow: 'About',
    headlinePrefix: 'Bridging',
    headlineHighlight: 'reliability and clarity',
    headlineSuffix: 'in cloud systems.',
    journeyTitle: 'My journey',
    coreStackTitle: 'Core stack',
  },
  projects: {
    eyebrow: 'Featured work',
    headlinePrefix: 'Selected',
    headlineHighlight: 'case studies',
    footnote: 'Detailed case studies available on request.',
  },
  experience: {
    eyebrow: 'Career path',
    headlinePrefix: 'Professional',
    headlineHighlight: 'experience',
    description:
      'Design-then-implement delivery across global media, scale-ups, and distributed teams.',
  },
  initiatives: {
    eyebrow: 'R&D & engineering initiatives',
    headlinePrefix: 'Side',
    headlineHighlight: 'investments',
    description: 'Personal R&D in NLP/AI, geospatial systems, and cloud orchestration.',
  },
  contact: {
    eyebrow: 'Next steps',
    headlinePrefix: "Let's work",
    headlineHighlight: 'together',
    cta: 'Get in touch',
    locationLabel: 'Location',
    languagesLabel: 'Languages',
    statusLabel: 'Status',
    channelEmail: 'Email',
    channelLinkedin: 'LinkedIn',
    channelGithub: 'GitHub',
  },
  footer: {
    tagline: 'Built with care.',
    backToTop: 'Back to top',
  },
  periods: {
    present: 'Present',
  },
  cv: {
    profile: 'Profile',
    experience: 'Experience',
    projects: 'Professional projects',
    skills: 'Skills',
    keyFigures: 'Key figures',
    contact: 'Contact',
    personalProjects: 'Personal projects',
  },
  og: {
    tagline: 'Senior backend and cloud engineering',
  },
  notFound: {
    title: 'Page not found',
    description: 'The page you requested does not exist on this site.',
    frenchLine: 'Page introuvable.',
    homeLink: 'Back to home',
    frenchLink: 'Version française',
  },
};

const french: Dictionary = {
  skipLink: 'Aller au contenu',
  nav: {
    home: 'Accueil',
    about: 'À propos',
    work: 'Projets',
    experience: 'Parcours',
    contact: 'Contact',
    ariaLabel: 'Navigation principale',
  },
  theme: {
    switchToLight: 'Passer en mode clair',
    switchToDark: 'Passer en mode sombre',
  },
  language: {
    switchLabel: 'Passer en anglais',
    targetName: 'English',
    suggestionLink: 'Version française',
  },
  hero: {
    headlinePrefix: 'Des systèmes cloud',
    headlineHighlight: 'faits pour durer',
    headlineSuffix: 'pas pour impressionner.',
    primaryCta: 'Voir les projets',
    secondaryCta: 'CV',
    focusLabel: 'Focus',
    stackLabel: 'Stack',
  },
  about: {
    eyebrow: 'À propos',
    headlinePrefix: 'Relier',
    headlineHighlight: 'fiabilité et clarté',
    headlineSuffix: 'dans le cloud.',
    journeyTitle: 'Mon parcours',
    coreStackTitle: 'Stack principal',
  },
  projects: {
    eyebrow: 'Travaux sélectionnés',
    headlinePrefix: 'Études de cas',
    headlineHighlight: 'marquantes',
    footnote: 'Études de cas détaillées sur demande.',
  },
  experience: {
    eyebrow: 'Parcours',
    headlinePrefix: 'Expérience',
    headlineHighlight: 'professionnelle',
    description:
      'Livraison design-then-implement dans la media internationale, les scale-ups et les équipes distribuées.',
  },
  initiatives: {
    eyebrow: 'R&D et initiatives',
    headlinePrefix: 'Investissements',
    headlineHighlight: 'personnels',
    description: 'R&D personnelle en NLP/IA, systèmes géospatiaux et orchestration cloud.',
  },
  contact: {
    eyebrow: 'Prochaines étapes',
    headlinePrefix: 'Travaillons',
    headlineHighlight: 'ensemble',
    cta: 'Me contacter',
    locationLabel: 'Localisation',
    languagesLabel: 'Langues',
    statusLabel: 'Statut',
    channelEmail: 'E-mail',
    channelLinkedin: 'LinkedIn',
    channelGithub: 'GitHub',
  },
  footer: {
    tagline: 'Construit avec soin.',
    backToTop: 'Retour en haut',
  },
  periods: {
    present: 'aujourd’hui',
  },
  cv: {
    profile: 'Profil',
    experience: 'Expérience',
    projects: 'Projets professionnels',
    skills: 'Compétences',
    keyFigures: 'Chiffres clés',
    contact: 'Contact',
    personalProjects: 'Projets personnels',
  },
  og: {
    tagline: 'Ingénierie backend et cloud senior',
  },
  notFound: {
    title: 'Page introuvable',
    description: 'La page demandée n’existe pas sur ce site.',
    frenchLine: 'Page introuvable.',
    homeLink: 'Retour à l’accueil',
    frenchLink: 'English version',
  },
};

export const dictionaries: Record<Locale, Dictionary> = {
  en: english,
  fr: french,
};

export function dictionaryFor(locale: Locale): Dictionary {
  return dictionaries[locale];
}
```

**`site/src/lib/i18n/locales.ts`**:

```typescript
import type { Locale } from '@portfolio/content';

export const locales = ['en', 'fr'] satisfies readonly Locale[];

export function localePath(locale: Locale): string {
  if (locale === 'fr') {
    return '/fr';
  }
  return '/';
}

export function openGraphLocale(locale: Locale): string {
  if (locale === 'fr') {
    return 'fr_FR';
  }
  return 'en_US';
}

export function cvFileName(locale: Locale): string {
  return `ny-randriantsarafara-cv-${locale}.pdf`;
}

export function cvPath(locale: Locale): string {
  return `/documents/${cvFileName(locale)}`;
}

export function ogImagePath(locale: Locale): string {
  return `/og/og-${locale}.png`;
}

export function otherLocale(locale: Locale): Locale {
  if (locale === 'fr') {
    return 'en';
  }
  return 'fr';
}
```

- [ ] **Step 4: Run verification**

Run: `pnpm --filter @portfolio/site typecheck`

Expected: PASS

Run: `pnpm --filter @portfolio/site lint`

Expected: PASS

Run: `pnpm --filter @portfolio/site test`

Expected: PASS — **58 passed**

Run: `pnpm --filter @portfolio/site build`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add site/src/lib/i18n/__tests__/locales.test.ts site/src/lib/i18n/dictionary.ts site/src/lib/i18n/locales.ts
git commit -m "feat(site): add locale paths and UI dictionary"
```

### Task 14: Sections built from the publication

**Files:**

- `site/public/data/content.json`
- `site/public/documents/resume.pdf`
- `site/src/components/layout/__tests__/footer.test.tsx`
- `site/src/components/layout/footer.tsx`
- `site/src/components/sections/__tests__/about.test.tsx`
- `site/src/components/sections/__tests__/contact.test.tsx`
- `site/src/components/sections/__tests__/experience.test.tsx`
- `site/src/components/sections/__tests__/hero.test.tsx`
- `site/src/components/sections/__tests__/initiatives.test.tsx`
- `site/src/components/sections/about.tsx`
- `site/src/components/sections/contact.tsx`
- `site/src/components/sections/experience.tsx`
- `site/src/components/sections/hero.tsx`
- `site/src/components/sections/initiatives.tsx`
- `site/src/lib/__tests__/icons.test.ts`
- `site/src/lib/__tests__/seo.test.ts`
- `site/src/lib/content/__tests__/helpers.test.ts`
- `site/src/lib/content/__tests__/service.test.ts`
- `site/src/lib/content/helpers.ts`
- `site/src/lib/content/index.ts`
- `site/src/lib/content/providers/index.ts`
- `site/src/lib/content/providers/static.ts`
- `site/src/lib/content/service.ts`
- `site/src/lib/content/types.ts`
- `site/src/lib/publication/__tests__/sections.test.ts`
- `site/src/lib/publication/sections.ts`
- `site/src/lib/seo.ts`
- `site/src/types/content.ts`
- `site/src/types/index.ts`
- `site/src/types/page-sections.ts`
- `site/src/types/sections/about.ts`
- `site/src/types/sections/contact.ts`
- `site/src/types/sections/experience.ts`
- `site/src/types/sections/hero.ts`
- `site/src/types/sections/index.ts`
- `site/src/types/sections/initiatives.ts`
- `site/src/types/sections/projects.ts`

- [ ] **Step 1: Write the failing test(s)**

Create `site/src/components/layout/__tests__/footer.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Footer } from '@/components/layout/footer';

describe('Footer', () => {
  it('renders copyright, location, tagline, and back-to-top link', () => {
    render(
      <Footer
        data={{
          copyright: 'Ny Hasinavalona Randriantsarafara',
          tagline: 'Built with care.',
          location: 'Pontault-Combault, FR',
          backToTop: 'Back to top',
        }}
      />
    );

    const year = new Date().getFullYear();
    expect(screen.getByText(`© ${year}`)).toBeInTheDocument();
    expect(screen.getByText('Ny Hasinavalona Randriantsarafara')).toBeInTheDocument();
    expect(screen.getByText('Pontault-Combault, FR')).toBeInTheDocument();
    expect(screen.getByText('Built with care.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to top/i })).toHaveAttribute('href', '#hero');
  });
});
```

Create `site/src/components/sections/__tests__/about.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { About } from '@/components/sections/about';

import type { AboutSectionData } from '@/types';

const aboutData: AboutSectionData = {
  eyebrow: 'About',
  headlinePrefix: 'Bridging',
  headlineHighlight: 'reliability and clarity',
  headlineSuffix: 'in cloud systems.',
  journeyTitle: 'My journey',
  journeyParagraphs: ['I am a Senior Backend Engineer.', 'Design-then-implement.'],
  stat: { value: '8+', label: 'Years building production systems' },
  coreStackTitle: 'Core stack',
  coreStack: ['TypeScript', 'AWS'],
  features: [
    { icon: 'cloud', title: 'Cloud & Infrastructure', description: 'AWS, Terraform.' },
    { icon: 'server', title: 'Backend & APIs', description: 'GraphQL, REST.' },
  ],
};

describe('About', () => {
  it('renders the eyebrow, headline parts, journey paragraphs, stat, core stack, and features', () => {
    render(<About data={aboutData} />);

    expect(screen.getByText(/about/i)).toBeInTheDocument();
    expect(screen.getByText(/bridging/i)).toBeInTheDocument();
    expect(screen.getByText(/reliability and clarity/i)).toBeInTheDocument();
    expect(screen.getByText(/in cloud systems/i)).toBeInTheDocument();
    expect(screen.getByText('My journey')).toBeInTheDocument();
    expect(screen.getByText('I am a Senior Backend Engineer.')).toBeInTheDocument();
    expect(screen.getByText('Design-then-implement.')).toBeInTheDocument();
    expect(screen.getByText('8+')).toBeInTheDocument();
    expect(screen.getByText('Years building production systems')).toBeInTheDocument();
    expect(screen.getByText('Core stack')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Cloud & Infrastructure')).toBeInTheDocument();
    expect(screen.getByText('Backend & APIs')).toBeInTheDocument();
  });
});
```

Create `site/src/components/sections/__tests__/contact.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Contact } from '@/components/sections/contact';

import type { ContactSectionData } from '@/types';

const contactData: ContactSectionData = {
  eyebrow: 'Next steps',
  headlinePrefix: "Let's work",
  headlineHighlight: 'together',
  description: 'Open to senior backend roles.',
  ctaLabel: 'Get in touch',
  channels: [
    {
      kind: 'email',
      kindLabel: 'Email',
      label: 'nyhasinavalonar@gmail.com',
      href: 'mailto:nyhasinavalonar@gmail.com',
    },
    {
      kind: 'linkedin',
      kindLabel: 'LinkedIn',
      label: 'linkedin.com/in/ny-randriantsarafara',
      href: 'https://www.linkedin.com/in/ny-randriantsarafara/',
    },
  ],
  details: [
    { label: 'Location', value: 'Pontault-Combault, France' },
    { label: 'Languages', value: 'Malagasy · French · English' },
  ],
};

describe('Contact', () => {
  it('renders the eyebrow, headline, and description', () => {
    render(<Contact data={contactData} />);
    expect(screen.getByText(/next steps/i)).toBeInTheDocument();
    expect(screen.getByText(/let's work/i)).toBeInTheDocument();
    expect(screen.getByText(/together/i)).toBeInTheDocument();
    expect(screen.getByText(/open to senior backend roles/i)).toBeInTheDocument();
    expect(screen.getByText('Get in touch')).toBeInTheDocument();
  });

  it('renders each channel as a link with its href', () => {
    render(<Contact data={contactData} />);
    expect(screen.getByRole('link', { name: /nyhasinavalonar@gmail.com/i })).toHaveAttribute(
      'href',
      'mailto:nyhasinavalonar@gmail.com'
    );
    expect(screen.getByRole('link', { name: /linkedin/i })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/ny-randriantsarafara/'
    );
  });

  it('renders each detail as a definition list entry', () => {
    render(<Contact data={contactData} />);
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Pontault-Combault, France')).toBeInTheDocument();
    expect(screen.getByText('Languages')).toBeInTheDocument();
    expect(screen.getByText('Malagasy · French · English')).toBeInTheDocument();
  });
});
```

Create `site/src/components/sections/__tests__/experience.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Experience } from '@/components/sections/experience';

import type { ExperienceSectionData } from '@/types';

const experienceData: ExperienceSectionData = {
  eyebrow: 'Career path',
  headlinePrefix: 'Professional',
  headlineHighlight: 'experience',
  description: 'Design-then-implement delivery.',
  items: [
    {
      company: 'Warner Bros. Discovery (Eurosport)',
      role: 'Software Engineer',
      period: 'Mar 2024 — Present',
      location: 'Issy-les-Moulineaux, FR',
      bullets: ['Migrated to Terraform.', 'Extended GraphQL API.'],
      tech: ['TypeScript', 'AWS'],
    },
    {
      company: 'Euronews',
      role: 'Software Engineer',
      period: 'Mar 2023 — Mar 2024',
      location: 'Lyon, FR',
      bullets: ['~2M DAU.'],
      tech: ['Node.js'],
    },
  ],
};

describe('Experience', () => {
  it('renders the eyebrow, headline, and description', () => {
    render(<Experience data={experienceData} />);
    expect(screen.getByText(/career path/i)).toBeInTheDocument();
    expect(screen.getByText(/professional/i)).toBeInTheDocument();
    expect(screen.getByText(/experience/i)).toBeInTheDocument();
    expect(screen.getByText(/design-then-implement delivery/i)).toBeInTheDocument();
  });

  it('renders each role with company, period, location, bullets, tech', () => {
    render(<Experience data={experienceData} />);
    expect(screen.getByText('Warner Bros. Discovery (Eurosport)')).toBeInTheDocument();
    expect(screen.getAllByText('Software Engineer').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Mar 2024 — Present')).toBeInTheDocument();
    expect(screen.getByText('Issy-les-Moulineaux, FR')).toBeInTheDocument();
    expect(screen.getByText('Migrated to Terraform.')).toBeInTheDocument();
    expect(screen.getByText('Extended GraphQL API.')).toBeInTheDocument();
    expect(screen.getByText('Euronews')).toBeInTheDocument();
    expect(screen.getByText('~2M DAU.')).toBeInTheDocument();
  });
});
```

Create `site/src/components/sections/__tests__/hero.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Hero } from '@/components/sections/hero';

import type { HeroSectionData } from '@/types';

const heroData: HeroSectionData = {
  tagline: 'Pontault-Combault, France · AWS · Terraform · TypeScript',
  availabilityBadge: 'EU Blue Card · Available for new roles',
  headlinePrefix: 'Crafting cloud systems',
  headlineHighlight: 'built to last',
  headlineSuffix: 'not to impress.',
  subheadline: 'Senior Backend & Cloud Engineer.',
  primaryCta: { label: 'Explore work', href: '#projects' },
  secondaryCta: { label: 'Resume', href: '/documents/ny-randriantsarafara-cv-en.pdf' },
  email: 'nyhasinavalonar@gmail.com',
  focusLabel: 'Focus',
  stackLabel: 'Stack',
  snapshot: {
    role: 'Senior Backend & Cloud Engineer',
    location: 'Pontault-Combault, FR',
    stats: [{ value: '8+', label: 'Years experience' }],
    stack: ['TypeScript', 'AWS', 'Terraform'],
  },
};

describe('Hero', () => {
  it('renders the headline parts and CTAs', () => {
    render(<Hero data={heroData} />);
    expect(screen.getByText(/crafting cloud systems/i)).toBeInTheDocument();
    expect(screen.getByText(/built to last/i)).toBeInTheDocument();
    expect(screen.getByText(/not to impress/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /explore work/i })).toHaveAttribute(
      'href',
      '#projects'
    );
    expect(screen.getByRole('link', { name: /resume/i })).toHaveAttribute(
      'href',
      '/documents/ny-randriantsarafara-cv-en.pdf'
    );
  });

  it('renders the availability badge', () => {
    render(<Hero data={heroData} />);
    expect(screen.getByText(/eu blue card/i)).toBeInTheDocument();
  });

  it('renders the snapshot role, location, stats, and stack', () => {
    render(<Hero data={heroData} />);
    expect(screen.getAllByText(/senior backend & cloud engineer/i).length).toBeGreaterThanOrEqual(
      1
    );
    expect(screen.getByText('Pontault-Combault, FR')).toBeInTheDocument();
    expect(screen.getByText('8+')).toBeInTheDocument();
    expect(screen.getByText('Years experience')).toBeInTheDocument();
    expect(screen.getAllByText('TypeScript').length).toBeGreaterThanOrEqual(1);
  });
});
```

Create `site/src/components/sections/__tests__/initiatives.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Initiatives } from '@/components/sections/initiatives';

import type { InitiativesSectionData } from '@/types';

const initiativesData: InitiativesSectionData = {
  eyebrow: 'R&D & engineering initiatives',
  headlinePrefix: 'Side',
  headlineHighlight: 'investments',
  description: 'Personal R&D.',
  items: [
    {
      icon: 'brain-circuit',
      title: 'Visa Insight',
      description: 'Multilingual extraction.',
      tags: ['NLP', 'CI/CD'],
    },
    {
      icon: 'map',
      title: 'Lalana',
      description: 'Routing backend.',
      tags: ['OSM'],
    },
  ],
};

describe('Initiatives', () => {
  it('renders the eyebrow, headline, and description', () => {
    render(<Initiatives data={initiativesData} />);
    expect(screen.getByText(/r&d & engineering initiatives/i)).toBeInTheDocument();
    expect(screen.getByText(/side/i)).toBeInTheDocument();
    expect(screen.getByText(/investments/i)).toBeInTheDocument();
    expect(screen.getByText(/personal r&d/i)).toBeInTheDocument();
  });

  it('renders each initiative with title, description, and tags', () => {
    render(<Initiatives data={initiativesData} />);
    expect(screen.getByText('Visa Insight')).toBeInTheDocument();
    expect(screen.getByText('Multilingual extraction.')).toBeInTheDocument();
    expect(screen.getByText('NLP')).toBeInTheDocument();
    expect(screen.getByText('Lalana')).toBeInTheDocument();
    expect(screen.getByText('Routing backend.')).toBeInTheDocument();
  });
});
```

Create `site/src/lib/__tests__/icons.test.ts`:

```typescript
import { iconNames } from '@portfolio/content';
import { describe, expect, it } from 'vitest';

import { iconRegistry, isKnownIcon } from '@/lib/icons';

import type { IconName } from '@/lib/icons';

describe('iconRegistry', () => {
  it('exposes a component for every content icon name', () => {
    for (const name of iconNames) {
      if (!isKnownIcon(name)) {
        throw new Error(`Missing icon registry entry for ${name}`);
      }
      expect(iconRegistry[name]).toBeDefined();
    }
  });

  it('exposes UI icons used by the site chrome', () => {
    const uiIcons: IconName[] = [
      'download',
      'arrow-up-right',
      'arrow-right',
      'mail',
      'map-pin',
      'languages',
      'home',
      'user',
      'sun',
      'moon',
    ];
    for (const name of uiIcons) {
      expect(iconRegistry[name]).toBeDefined();
    }
  });

  it('isKnownIcon narrows arbitrary strings to IconName', () => {
    expect(isKnownIcon('cloud')).toBe(true);
    expect(isKnownIcon('not-an-icon')).toBe(false);
  });
});
```

Create `site/src/lib/publication/__tests__/sections.test.ts`:

```typescript
import { contentFixture } from '@portfolio/content/testing';
import { describe, expect, it } from 'vitest';

import { dictionaryFor } from '../../i18n/dictionary.ts';
import {
  buildPageSections,
  channelLabel,
  formatMonthPeriod,
  formatYearPeriod,
  featuredSkillNames,
  skillNames,
} from '../sections.ts';

describe('formatMonthPeriod', () => {
  it('formats English months with a present end', () => {
    expect(formatMonthPeriod('2024-03', null, 'en', 'Present')).toBe('Mar 2024 — Present');
  });

  it('formats French months with a present end', () => {
    expect(formatMonthPeriod('2024-03', null, 'fr', 'aujourd’hui')).toBe('mars 2024 — aujourd’hui');
  });
});

describe('formatYearPeriod', () => {
  it('formats open-ended years', () => {
    expect(formatYearPeriod(2024, null, 'Present')).toBe('2024—Present');
  });

  it('returns a single year when start and end match', () => {
    expect(formatYearPeriod(2022, 2022, 'Present')).toBe('2022');
  });

  it('returns empty when both years are missing', () => {
    expect(formatYearPeriod(null, null, 'Present')).toBe('');
  });
});

describe('skillNames', () => {
  it('keeps slug order and skips unknown slugs', () => {
    expect(skillNames(['typescript', 'missing', 'aws'], contentFixture.skills)).toEqual([
      'TypeScript',
      'AWS',
    ]);
  });
});

describe('featuredSkillNames', () => {
  it('returns featured skills up to the limit', () => {
    expect(featuredSkillNames(contentFixture.skills, 2)).toEqual(['TypeScript', 'AWS']);
  });
});

describe('channelLabel', () => {
  it('strips www and trailing slashes', () => {
    expect(channelLabel('https://www.linkedin.com/in/example/')).toBe('linkedin.com/in/example');
  });
});

describe('buildPageSections', () => {
  it('builds a hero tagline from location and featured skills', () => {
    const sections = buildPageSections(contentFixture, 'en', dictionaryFor('en'));
    expect(sections.hero.tagline).toContain('Paris, France');
    expect(sections.hero.primaryCta.href).toBe('#projects');
    expect(sections.projects.items.length).toBeGreaterThan(0);
    expect(sections.initiatives.items.every((item) => item.tags.length >= 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm --filter @portfolio/site exec vitest run site/src/components/layout/__tests__/footer.test.tsx site/src/components/sections/__tests__/about.test.tsx site/src/components/sections/__tests__/contact.test.tsx site/src/components/sections/__tests__/experience.test.tsx site/src/components/sections/__tests__/hero.test.tsx site/src/components/sections/__tests__/initiatives.test.tsx site/src/lib/__tests__/icons.test.ts site/src/lib/__tests__/seo.test.ts site/src/lib/content/__tests__/helpers.test.ts site/src/lib/content/__tests__/service.test.ts site/src/lib/publication/__tests__/sections.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Implement**

**`site/src/components/layout/footer.tsx`**:

```typescript
'use client';

import { motion } from 'motion/react';

import type { FooterSectionData } from '@/types';

interface FooterProps {
  data: FooterSectionData;
}

export function Footer({ data }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className="relative z-10 w-full px-6 py-12 backdrop-blur-3xl sm:px-12"
      style={{ background: 'var(--footer-bg)', borderTop: '1px solid var(--footer-border)' }}
    >
      <div
        className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-6 text-xs font-medium uppercase tracking-widest md:flex-row"
        style={{ color: 'var(--text-dimmed)' }}
      >
        <div className="flex items-center gap-3" style={{ color: 'var(--text-secondary)' }}>
          <span>© {year}</span>
          <span
            aria-hidden="true"
            className="h-px w-4"
            style={{ background: 'var(--glass-border)' }}
          />
          <span>{data.copyright}</span>
        </div>

        <div className="flex items-center gap-6">
          <a
            href="#hero"
            className="group flex items-center gap-2 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <span>{data.backToTop}</span>
            <motion.span
              aria-hidden="true"
              animate={{ y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              ↑
            </motion.span>
          </a>
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: 'var(--glass-border)' }}
          />
          <span style={{ color: 'var(--text-muted)' }}>{data.location}</span>
        </div>
      </div>

      <p className="mt-6 text-center text-xs" style={{ color: 'var(--text-dimmed)' }}>
        {data.tagline}
      </p>
    </footer>
  );
}
```

**`site/src/components/sections/about.tsx`**:

```typescript
'use client';

import { motion } from 'motion/react';

import { Badge } from '@/components/ui';
import { iconRegistry } from '@/lib/icons';

import type { AboutSectionData } from '@/types';

interface AboutProps {
  data: AboutSectionData;
}

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];
const inViewMargin = '-100px';

export function About({ data }: AboutProps) {
  return (
    <section
      id="about"
      className="relative z-20 flex w-full max-w-[1400px] flex-col gap-16 px-6 py-24 sm:px-12"
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: inViewMargin }}
        transition={{ duration: 1, ease: easeOut }}
        className="flex w-full max-w-3xl flex-col gap-6"
      >
        <Badge accent="indigo">{data.eyebrow}</Badge>
        <h2
          className="text-4xl font-medium leading-tight tracking-tight md:text-6xl"
          style={{ color: 'var(--text-primary)' }}
        >
          {data.headlinePrefix}{' '}
          <span className="bg-gradient-to-r from-teal-500 via-indigo-500 to-rose-500 bg-clip-text italic text-transparent">
            {data.headlineHighlight}
          </span>{' '}
          {data.headlineSuffix}
        </h2>
      </motion.div>

      <div className="grid auto-rows-[minmax(200px,auto)] grid-cols-1 gap-6 md:grid-cols-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: inViewMargin }}
          transition={{ duration: 1, ease: easeOut }}
          className="glass-panel relative row-span-2 overflow-hidden rounded-[2.5rem] p-8 shadow-2xl sm:p-12 md:col-span-8"
        >
          <h3
            className="mb-6 text-2xl font-medium sm:text-3xl"
            style={{ color: 'var(--text-primary)' }}
          >
            {data.journeyTitle}
          </h3>
          <div
            className="relative z-10 space-y-6 text-lg font-light leading-relaxed sm:text-xl"
            style={{ color: 'var(--text-secondary)' }}
          >
            {data.journeyParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </motion.div>

        {data.stat && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: inViewMargin }}
            transition={{ duration: 1, delay: 0.1, ease: easeOut }}
            className="glass-panel row-span-1 flex flex-col items-center justify-center rounded-[2.5rem] p-8 text-center shadow-2xl md:col-span-4"
          >
            <div
              className="mb-2 text-5xl font-semibold tracking-tighter sm:text-6xl"
              style={{ color: 'var(--text-primary)' }}
            >
              {data.stat.value}
            </div>
            <div
              className="text-sm font-medium uppercase tracking-widest"
              style={{ color: 'var(--text-muted)' }}
            >
              {data.stat.label}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: inViewMargin }}
          transition={{ duration: 1, delay: 0.2, ease: easeOut }}
          className="glass-panel row-span-1 flex flex-col justify-between rounded-[2.5rem] p-8 shadow-2xl md:col-span-4"
        >
          <h3
            className="mb-6 text-sm font-medium uppercase tracking-widest"
            style={{ color: 'var(--text-muted)' }}
          >
            {data.coreStackTitle}
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.coreStack.map((item) => (
              <span
                key={item}
                className="rounded-xl px-4 py-2 text-sm font-medium"
                style={{
                  background: 'var(--tag-bg)',
                  border: '1px solid var(--tag-border)',
                  color: 'var(--tag-text)',
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: inViewMargin }}
        transition={{ duration: 1, delay: 0.3, ease: easeOut }}
        className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        {data.features.map((feature) => {
          const Icon = iconRegistry[feature.icon];
          return (
            <div
              key={feature.title}
              className="glass-panel group flex cursor-default flex-col gap-4 rounded-[2rem] p-8"
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-500 group-hover:scale-110"
                style={{
                  background: 'var(--tag-bg)',
                  border: '1px solid var(--tag-border)',
                  color: 'var(--text-secondary)',
                }}
              >
                <Icon size={24} strokeWidth={1.5} aria-hidden="true" />
              </div>
              <h3 className="text-xl font-medium" style={{ color: 'var(--text-primary)' }}>
                {feature.title}
              </h3>
              <p
                className="text-sm font-light leading-relaxed"
                style={{ color: 'var(--text-muted)' }}
              >
                {feature.description}
              </p>
            </div>
          );
        })}
      </motion.div>
    </section>
  );
}
```

**`site/src/components/sections/contact.tsx`**:

```typescript
'use client';

import { motion } from 'motion/react';

import { Badge } from '@/components/ui';
import { iconRegistry } from '@/lib/icons';

import type { IconName } from '@/lib/icons';
import type { ContactChannelKind, ContactSectionData } from '@/types';

interface ContactProps {
  data: ContactSectionData;
}

const channelIconByKind: Record<ContactChannelKind, IconName> = {
  email: 'mail',
  linkedin: 'arrow-up-right',
  github: 'arrow-up-right',
};

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];
const inViewMargin = '-100px';

export function Contact({ data }: ContactProps) {
  return (
    <section
      id="contact"
      className="relative z-20 mb-24 flex w-full max-w-[1400px] flex-col items-center justify-center overflow-hidden px-6 py-32 sm:px-12"
    >
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: inViewMargin }}
        transition={{ duration: 1, ease: easeOut }}
        className="z-10 flex w-full max-w-4xl flex-col items-center text-center"
      >
        <Badge accent="indigo" className="mb-8">
          {data.eyebrow}
        </Badge>
        <h2
          className="text-5xl font-medium leading-[0.95] tracking-tighter sm:text-7xl lg:text-[7rem]"
          style={{ color: 'var(--text-primary)' }}
        >
          {data.headlinePrefix} <br />
          <span className="bg-gradient-to-r from-teal-500 via-indigo-500 to-rose-500 bg-clip-text pr-6 italic text-transparent">
            {data.headlineHighlight}
          </span>
          .
        </h2>
        <p className="mt-6 max-w-xl text-lg font-light" style={{ color: 'var(--text-muted)' }}>
          {data.description}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: inViewMargin }}
        transition={{ duration: 1, delay: 0.2, ease: easeOut }}
        className="glass-panel z-10 mt-16 grid w-full max-w-3xl grid-cols-1 gap-12 rounded-[3rem] p-8 backdrop-blur-3xl md:p-12 lg:grid-cols-2"
      >
        <div className="flex flex-col gap-8">
          <h3
            className="text-2xl font-medium tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {data.ctaLabel}
          </h3>
          <ul className="flex flex-col gap-6">
            {data.channels.map((channel) => {
              const Icon = iconRegistry[channelIconByKind[channel.kind]];
              const isExternal = channel.kind !== 'email';
              return (
                <li key={channel.href}>
                  <a
                    href={channel.href}
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noopener noreferrer' : undefined}
                    className="group flex items-start gap-4"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-2xl text-indigo-400 transition-colors group-hover:text-indigo-500"
                      style={{
                        background: 'var(--tag-bg)',
                        border: '1px solid var(--tag-border)',
                      }}
                    >
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <span className="flex flex-col gap-1">
                      <span
                        className="text-xs font-semibold uppercase tracking-widest"
                        style={{ color: 'var(--text-dimmed)' }}
                      >
                        {channel.kindLabel}
                      </span>
                      <span className="break-all text-base font-light">{channel.label}</span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        <dl className="flex flex-col gap-6">
          {data.details.map((detail) => (
            <div key={detail.label} className="flex flex-col gap-1">
              <dt
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'var(--text-dimmed)' }}
              >
                {detail.label}
              </dt>
              <dd className="text-base font-light" style={{ color: 'var(--text-secondary)' }}>
                {detail.value}
              </dd>
            </div>
          ))}
        </dl>
      </motion.div>
    </section>
  );
}
```

**`site/src/components/sections/experience.tsx`**:

```typescript
'use client';

import { motion } from 'motion/react';

import { Badge } from '@/components/ui';

import type { ExperienceSectionData } from '@/types';

interface ExperienceProps {
  data: ExperienceSectionData;
}

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];
const inViewMargin = '-100px';

export function Experience({ data }: ExperienceProps) {
  return (
    <section
      id="experience"
      className="relative z-20 flex w-full max-w-[1400px] flex-col gap-12 px-6 py-32 sm:px-12 lg:flex-row lg:gap-16"
    >
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: inViewMargin }}
        transition={{ duration: 1, ease: easeOut }}
        className="flex h-fit w-full flex-col gap-6 lg:sticky lg:top-32 lg:w-1/3"
      >
        <Badge accent="rose">{data.eyebrow}</Badge>
        <h2
          className="text-4xl font-medium leading-tight tracking-tight md:text-5xl lg:text-6xl"
          style={{ color: 'var(--text-primary)' }}
        >
          {data.headlinePrefix} <br />
          <span className="bg-gradient-to-r from-rose-500 to-indigo-500 bg-clip-text italic text-transparent">
            {data.headlineHighlight}
          </span>
          .
        </h2>
        <p
          className="mt-4 max-w-sm font-light leading-relaxed"
          style={{ color: 'var(--text-muted)' }}
        >
          {data.description}
        </p>
      </motion.div>

      <div className="flex w-full flex-col gap-8 lg:w-2/3">
        {data.items.map((item, index) => (
          <motion.article
            key={`${item.company}-${item.period}`}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.8, ease: easeOut, delay: index * 0.05 }}
            className="glass-panel relative flex flex-col gap-6 overflow-hidden rounded-[2.5rem] p-8 shadow-2xl md:p-10"
          >
            <header className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <h3
                className="text-2xl font-medium lg:text-3xl"
                style={{ color: 'var(--text-primary)' }}
              >
                {item.company}
              </h3>
              <span
                className="w-fit rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest"
                style={{
                  background: 'var(--tag-bg)',
                  border: '1px solid var(--tag-border)',
                  color: 'var(--text-secondary)',
                }}
              >
                {item.period}
              </span>
            </header>

            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex flex-wrap items-baseline gap-3">
                <h4 className="text-xl font-medium italic text-rose-400">{item.role}</h4>
                <span className="text-sm" style={{ color: 'var(--text-dimmed)' }}>
                  {item.location}
                </span>
              </div>
              <ul
                className="ml-5 list-disc space-y-2 text-base font-light leading-relaxed md:text-lg"
                style={{ color: 'var(--text-secondary)' }}
              >
                {item.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>

            <div className="relative z-10 mt-2 flex flex-wrap gap-2">
              {item.tech.map((tech) => (
                <span
                  key={tech}
                  className="rounded-xl px-4 py-2 text-sm font-medium"
                  style={{
                    background: 'var(--tag-bg)',
                    border: '1px solid var(--tag-border)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {tech}
                </span>
              ))}
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
```

**`site/src/components/sections/hero.tsx`**:

```typescript
'use client';

import { motion } from 'motion/react';

import { Badge, Button } from '@/components/ui';
import { iconRegistry } from '@/lib/icons';

import type { HeroSectionData } from '@/types';

interface HeroProps {
  data: HeroSectionData;
}

const SparklesIcon = iconRegistry.sparkles;
const ArrowUpRightIcon = iconRegistry['arrow-up-right'];
const DownloadIcon = iconRegistry.download;

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function Hero({ data }: HeroProps) {
  const [primaryStat] = data.snapshot.stats;

  return (
    <section
      id="hero"
      className="relative flex min-h-screen w-full max-w-[1400px] flex-col items-center justify-between overflow-hidden px-6 py-32 sm:px-12 md:flex-row md:py-0"
    >
      <div className="z-20 flex w-full flex-col items-start gap-8 md:w-1/2">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: easeOut }}
        >
          <Badge>
            <SparklesIcon size={16} aria-hidden="true" className="text-indigo-400" />
            <span>{data.availabilityBadge}</span>
          </Badge>
        </motion.div>

        <h1
          className="text-5xl font-semibold leading-[1.1] tracking-tight drop-shadow-xl sm:text-7xl lg:text-[6rem]"
          style={{ color: 'var(--text-primary)' }}
        >
          {data.headlinePrefix} <br />
          <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 bg-clip-text pr-4 italic text-transparent">
            {data.headlineHighlight}
          </span>{' '}
          {data.headlineSuffix}
        </h1>

        <p
          className="max-w-lg text-lg font-light leading-relaxed sm:text-xl"
          style={{ color: 'var(--text-muted)' }}
        >
          {data.subheadline}
        </p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: easeOut }}
          className="mt-4 flex flex-wrap items-center gap-4"
        >
          <Button href={data.primaryCta.href}>
            {data.primaryCta.label}
            <ArrowUpRightIcon
              size={18}
              aria-hidden="true"
              className="transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
            />
          </Button>
          <Button href={data.secondaryCta.href} variant="glass" download>
            {data.secondaryCta.label}
            <DownloadIcon
              size={18}
              aria-hidden="true"
              className="opacity-70 group-hover:opacity-100"
            />
          </Button>
          <a
            href={`mailto:${data.email}`}
            className="text-sm transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            {data.email}
          </a>
        </motion.div>

        <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-dimmed)' }}>
          {data.tagline}
        </p>
      </div>

      <div className="relative mt-16 hidden h-[500px] w-full md:mt-0 md:block md:h-screen md:w-1/2">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.2, delay: 0.2, type: 'spring', stiffness: 100 }}
          className="glass-panel absolute left-1/2 top-1/2 z-20 h-[450px] w-[320px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[3rem] sm:w-[380px]"
        >
          <div className="relative z-10 flex h-full flex-col justify-between p-8">
            <div className="flex items-start justify-between">
              <div className="glass-panel flex h-16 w-16 items-center justify-center rounded-2xl text-2xl shadow-lg">
                ⚙️
              </div>
              <span
                className="glass-panel rounded-full px-3 py-1 text-xs font-semibold tracking-wide"
                style={{ color: 'var(--text-secondary)' }}
              >
                {data.snapshot.location}
              </span>
            </div>
            <div className="mt-auto flex flex-col gap-2">
              <div
                className="text-sm font-semibold uppercase tracking-widest"
                style={{ color: 'var(--text-muted)' }}
              >
                {data.focusLabel}
              </div>
              <div
                className="text-2xl font-medium tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                {data.snapshot.role}
              </div>
            </div>
          </div>
        </motion.div>

        {primaryStat && (
          <motion.div
            initial={{ opacity: 0, x: -100, rotate: -15 }}
            animate={{ opacity: 1, x: 0, rotate: -6 }}
            transition={{ duration: 1, delay: 0.4, type: 'spring', stiffness: 80 }}
            className="glass-panel absolute left-[-10%] top-[20%] z-30 rounded-3xl px-6 py-5 shadow-2xl sm:left-[5%]"
          >
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-teal-500 to-indigo-500 bg-clip-text text-3xl font-bold text-transparent">
                {primaryStat.value}
              </div>
              <div
                className="text-xs font-medium uppercase leading-tight tracking-wide"
                style={{ color: 'var(--text-secondary)' }}
              >
                {primaryStat.label}
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, x: 100, rotate: 15 }}
          animate={{ opacity: 1, x: 0, rotate: 8 }}
          transition={{ duration: 1, delay: 0.6, type: 'spring', stiffness: 80 }}
          className="glass-panel absolute bottom-[15%] right-[-10%] z-10 rounded-[2rem] p-6 shadow-2xl sm:right-[5%]"
        >
          <div className="flex flex-col gap-3">
            <div
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              {data.stackLabel}
            </div>
            <div className="flex flex-wrap gap-2">
              {data.snapshot.stack.map((item) => (
                <span
                  key={item}
                  className="rounded-full px-3 py-1.5 text-xs font-medium"
                  style={{
                    background: 'var(--tag-bg)',
                    border: '1px solid var(--tag-border)',
                    color: 'var(--tag-text)',
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
```

**`site/src/components/sections/initiatives.tsx`**:

```typescript
'use client';

import { motion } from 'motion/react';

import { Badge } from '@/components/ui';
import { iconRegistry } from '@/lib/icons';

import type { InitiativesSectionData } from '@/types';

interface InitiativesProps {
  data: InitiativesSectionData;
}

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];
const inViewMargin = '-100px';

export function Initiatives({ data }: InitiativesProps) {
  return (
    <section
      id="initiatives"
      className="relative z-20 flex w-full max-w-[1400px] flex-col gap-12 px-6 py-32 sm:px-12"
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: inViewMargin }}
        transition={{ duration: 1, ease: easeOut }}
        className="flex max-w-3xl flex-col gap-6"
      >
        <Badge accent="teal">{data.eyebrow}</Badge>
        <h2
          className="text-4xl font-medium leading-tight tracking-tight md:text-5xl"
          style={{ color: 'var(--text-primary)' }}
        >
          {data.headlinePrefix}{' '}
          <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-500 bg-clip-text italic text-transparent">
            {data.headlineHighlight}
          </span>
          .
        </h2>
        <p className="font-light leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {data.description}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {data.items.map((item, index) => {
          const Icon = iconRegistry[item.icon];
          return (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: inViewMargin }}
              transition={{ duration: 0.8, ease: easeOut, delay: index * 0.1 }}
              className="glass-panel flex flex-col gap-4 rounded-[2rem] p-8"
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{
                  background: 'var(--tag-bg)',
                  border: '1px solid var(--tag-border)',
                  color: 'var(--text-secondary)',
                }}
              >
                <Icon size={24} strokeWidth={1.5} aria-hidden="true" />
              </div>
              <header>
                <h3 className="text-xl font-medium" style={{ color: 'var(--text-primary)' }}>
                  {item.title}
                </h3>
              </header>
              <p
                className="text-sm font-light leading-relaxed"
                style={{ color: 'var(--text-muted)' }}
              >
                {item.description}
              </p>
              <div className="mt-auto flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      background: 'var(--tag-bg)',
                      border: '1px solid var(--tag-border)',
                      color: 'var(--tag-text)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
```

**`site/src/lib/publication/sections.ts`**:

```typescript
import { cvPath } from '../i18n/locales.ts';

import type { PageSections } from '../../types/page-sections.ts';
import type { Dictionary } from '../i18n/dictionary.ts';
import type {
  Capability,
  Experience,
  IconName,
  KeyFigure,
  Locale,
  LocalizedList,
  LocalizedText,
  Project,
  PublicationContent,
  Skill,
} from '@portfolio/content';

function localized(text: LocalizedText, locale: Locale): string {
  return text[locale];
}

function localizedBullets(list: LocalizedList, locale: Locale): readonly string[] {
  if (locale === 'fr') {
    return list.fr;
  }
  return list.en;
}

function monthDate(month: string): Date {
  return new Date(`${month}-01T00:00:00.000Z`);
}

export function formatMonthPeriod(
  startMonth: string,
  endMonth: string | null,
  locale: Locale,
  presentLabel: string
): string {
  const formatter = new Intl.DateTimeFormat(locale, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const start = formatter.format(monthDate(startMonth));
  if (endMonth === null) {
    return `${start} — ${presentLabel}`;
  }
  const end = formatter.format(monthDate(endMonth));
  return `${start} — ${end}`;
}

export function formatYearPeriod(
  startYear: number | null,
  endYear: number | null,
  presentLabel: string
): string {
  if (startYear === null && endYear === null) {
    return '';
  }
  if (startYear !== null && endYear === null) {
    return `${startYear}—${presentLabel}`;
  }
  if (startYear !== null && endYear !== null) {
    if (startYear === endYear) {
      return String(startYear);
    }
    return `${startYear}—${endYear}`;
  }
  if (endYear !== null) {
    return String(endYear);
  }
  return '';
}

export function skillNames(slugs: readonly string[], skills: readonly Skill[]): string[] {
  const bySlug = new Map(skills.map((skill) => [skill.slug, skill.name]));
  return slugs.flatMap((slug) => {
    const name = bySlug.get(slug);
    if (name === undefined) {
      return [];
    }
    return [name];
  });
}

export function featuredSkillNames(skills: readonly Skill[], limit: number): string[] {
  return skills
    .filter((skill) => skill.featured)
    .slice(0, limit)
    .map((skill) => skill.name);
}

export function channelLabel(url: string): string {
  const parsed = new URL(url);
  const host = parsed.hostname.replace(/^www\./, '');
  const path = parsed.pathname.replace(/\/$/, '');
  if (path.length === 0) {
    return host;
  }
  return `${host}${path}`;
}

function resolveIcon(icon: IconName | null): IconName {
  if (icon === null) {
    return 'sparkles';
  }
  return icon;
}

function buildHero(
  content: PublicationContent,
  locale: Locale,
  dictionary: Dictionary
): PageSections['hero'] {
  const { profile, skills, keyFigures } = content;
  const featured = featuredSkillNames(skills, 3);
  const taglineParts = [localized(profile.location, locale), ...featured];
  const headline = localized(profile.headline, locale);
  const introduction = localized(profile.introduction, locale);
  return {
    tagline: taglineParts.join(' · '),
    availabilityBadge: localized(profile.availability, locale),
    headlinePrefix: dictionary.hero.headlinePrefix,
    headlineHighlight: dictionary.hero.headlineHighlight,
    headlineSuffix: dictionary.hero.headlineSuffix,
    subheadline: `${headline}. ${introduction}`,
    primaryCta: { label: dictionary.hero.primaryCta, href: '#projects' },
    secondaryCta: { label: dictionary.hero.secondaryCta, href: cvPath(locale) },
    email: profile.email,
    focusLabel: dictionary.hero.focusLabel,
    stackLabel: dictionary.hero.stackLabel,
    snapshot: {
      role: headline,
      location: localized(profile.location, locale),
      stats: keyFigures.map((figure) => ({
        value: figure.value,
        label: localized(figure.label, locale),
      })),
      stack: featuredSkillNames(skills, 3),
    },
  };
}

function firstKeyFigure(
  figures: readonly KeyFigure[],
  locale: Locale
): PageSections['about']['stat'] {
  const [first] = figures;
  if (first === undefined) {
    return null;
  }
  return {
    value: first.value,
    label: localized(first.label, locale),
  };
}

function buildAbout(
  content: PublicationContent,
  locale: Locale,
  dictionary: Dictionary
): PageSections['about'] {
  const { profile, capabilities, skills } = content;
  const journeyParagraphs = [
    localized(profile.introduction, locale),
    localized(profile.availability, locale),
    localized(profile.workAuthorization, locale),
  ];
  return {
    eyebrow: dictionary.about.eyebrow,
    headlinePrefix: dictionary.about.headlinePrefix,
    headlineHighlight: dictionary.about.headlineHighlight,
    headlineSuffix: dictionary.about.headlineSuffix,
    journeyTitle: dictionary.about.journeyTitle,
    journeyParagraphs,
    stat: firstKeyFigure(content.keyFigures, locale),
    coreStackTitle: dictionary.about.coreStackTitle,
    coreStack: skills.filter((skill) => skill.featured).map((skill) => skill.name),
    features: capabilities.map((capability: Capability) => ({
      icon: capability.icon,
      title: localized(capability.title, locale),
      description: localized(capability.description, locale),
    })),
  };
}

function buildProjects(
  content: PublicationContent,
  locale: Locale,
  dictionary: Dictionary
): PageSections['projects'] {
  const professional = content.projects.filter((project) => project.kind === 'professional');
  return {
    eyebrow: dictionary.projects.eyebrow,
    headlinePrefix: dictionary.projects.headlinePrefix,
    headlineHighlight: dictionary.projects.headlineHighlight,
    footnote: dictionary.projects.footnote,
    items: professional.map((project: Project) => ({
      title: localized(project.title, locale),
      role: project.role === null ? '' : localized(project.role, locale),
      year: formatYearPeriod(project.startYear, project.endYear, dictionary.periods.present),
      company: project.company ?? '',
      description: localized(project.summary, locale),
      tech: skillNames(project.skillSlugs, content.skills),
    })),
  };
}

function buildExperience(
  content: PublicationContent,
  locale: Locale,
  dictionary: Dictionary
): PageSections['experience'] {
  return {
    eyebrow: dictionary.experience.eyebrow,
    headlinePrefix: dictionary.experience.headlinePrefix,
    headlineHighlight: dictionary.experience.headlineHighlight,
    description: dictionary.experience.description,
    items: content.experiences.map((experience: Experience) => ({
      company: experience.company,
      role: localized(experience.role, locale),
      period: formatMonthPeriod(
        experience.startMonth,
        experience.endMonth,
        locale,
        dictionary.periods.present
      ),
      location: experience.location ?? '',
      bullets: [...localizedBullets(experience.highlights, locale)],
      tech: skillNames(experience.skillSlugs, content.skills),
    })),
  };
}

function buildInitiatives(
  content: PublicationContent,
  locale: Locale,
  dictionary: Dictionary
): PageSections['initiatives'] {
  const personal = content.projects.filter((project) => project.kind === 'personal');
  return {
    eyebrow: dictionary.initiatives.eyebrow,
    headlinePrefix: dictionary.initiatives.headlinePrefix,
    headlineHighlight: dictionary.initiatives.headlineHighlight,
    description: dictionary.initiatives.description,
    items: personal.map((project: Project) => ({
      icon: resolveIcon(project.icon),
      title: localized(project.title, locale),
      description: localized(project.summary, locale),
      tags: skillNames(project.skillSlugs, content.skills),
    })),
  };
}

function channelKindLabel(kind: 'email' | 'linkedin' | 'github', dictionary: Dictionary): string {
  if (kind === 'email') {
    return dictionary.contact.channelEmail;
  }
  if (kind === 'linkedin') {
    return dictionary.contact.channelLinkedin;
  }
  return dictionary.contact.channelGithub;
}

function channelKind(url: string): 'email' | 'linkedin' | 'github' {
  if (url.startsWith('mailto:')) {
    return 'email';
  }
  if (url.includes('linkedin.com')) {
    return 'linkedin';
  }
  return 'github';
}

function buildContact(
  content: PublicationContent,
  locale: Locale,
  dictionary: Dictionary
): PageSections['contact'] {
  const { profile } = content;
  const channelUrls = [
    { href: `mailto:${profile.email}` },
    { href: profile.linkedinUrl },
    { href: profile.githubUrl },
  ];
  const channels = channelUrls.map(({ href }) => {
    const kind = channelKind(href);
    const kindLabel = channelKindLabel(kind, dictionary);
    const label = kind === 'email' ? profile.email : channelLabel(href);
    return {
      kind,
      kindLabel,
      label,
      href,
    };
  });
  return {
    eyebrow: dictionary.contact.eyebrow,
    headlinePrefix: dictionary.contact.headlinePrefix,
    headlineHighlight: dictionary.contact.headlineHighlight,
    description: localized(profile.availability, locale),
    ctaLabel: dictionary.contact.cta,
    channels,
    details: [
      {
        label: dictionary.contact.locationLabel,
        value: localized(profile.location, locale),
      },
      {
        label: dictionary.contact.languagesLabel,
        value: localized(profile.languages, locale),
      },
      {
        label: dictionary.contact.statusLabel,
        value: localized(profile.workAuthorization, locale),
      },
    ],
  };
}

function buildFooter(
  content: PublicationContent,
  locale: Locale,
  dictionary: Dictionary
): PageSections['footer'] {
  return {
    copyright: content.profile.name,
    tagline: dictionary.footer.tagline,
    location: localized(content.profile.location, locale),
    backToTop: dictionary.footer.backToTop,
  };
}

export function buildPageSections(
  content: PublicationContent,
  locale: Locale,
  dictionary: Dictionary
): PageSections {
  return {
    hero: buildHero(content, locale, dictionary),
    about: buildAbout(content, locale, dictionary),
    projects: buildProjects(content, locale, dictionary),
    experience: buildExperience(content, locale, dictionary),
    initiatives: buildInitiatives(content, locale, dictionary),
    contact: buildContact(content, locale, dictionary),
    footer: buildFooter(content, locale, dictionary),
  };
}
```

**`site/src/types/index.ts`**:

```typescript
export type { Link } from './common';
export type {
  PageSections,
  HeroSectionData,
  HeroSnapshotStat,
  AboutSectionData,
  AboutFeature,
  ProjectsSectionData,
  ProjectItem,
  ExperienceSectionData,
  ExperienceItem,
  InitiativesSectionData,
  InitiativeItem,
  ContactSectionData,
  ContactChannel,
  ContactChannelKind,
  ContactDetail,
  FooterSectionData,
} from './page-sections';
```

**`site/src/types/page-sections.ts`**:

```typescript
import type { IconName as ContentIconName } from '@portfolio/content';

export type Link = {
  label: string;
  href: string;
};

export type HeroSnapshotStat = {
  value: string;
  label: string;
};

export type HeroSectionData = {
  tagline: string;
  availabilityBadge: string;
  headlinePrefix: string;
  headlineHighlight: string;
  headlineSuffix: string;
  subheadline: string;
  primaryCta: Link;
  secondaryCta: Link;
  email: string;
  focusLabel: string;
  stackLabel: string;
  snapshot: {
    role: string;
    location: string;
    stats: HeroSnapshotStat[];
    stack: string[];
  };
};

export type AboutFeature = {
  icon: ContentIconName;
  title: string;
  description: string;
};

export type AboutSectionData = {
  eyebrow: string;
  headlinePrefix: string;
  headlineHighlight: string;
  headlineSuffix: string;
  journeyTitle: string;
  journeyParagraphs: string[];
  stat: HeroSnapshotStat | null;
  coreStackTitle: string;
  coreStack: string[];
  features: AboutFeature[];
};

export type ProjectItem = {
  title: string;
  role: string;
  year: string;
  company: string;
  description: string;
  tech: string[];
};

export type ProjectsSectionData = {
  eyebrow: string;
  headlinePrefix: string;
  headlineHighlight: string;
  footnote: string;
  items: ProjectItem[];
};

export type ExperienceItem = {
  company: string;
  role: string;
  period: string;
  location: string;
  bullets: string[];
  tech: string[];
};

export type ExperienceSectionData = {
  eyebrow: string;
  headlinePrefix: string;
  headlineHighlight: string;
  description: string;
  items: ExperienceItem[];
};

export type InitiativeItem = {
  icon: ContentIconName;
  title: string;
  description: string;
  tags: string[];
};

export type InitiativesSectionData = {
  eyebrow: string;
  headlinePrefix: string;
  headlineHighlight: string;
  description: string;
  items: InitiativeItem[];
};

export type ContactChannelKind = 'email' | 'linkedin' | 'github';

export type ContactChannel = {
  kind: ContactChannelKind;
  kindLabel: string;
  label: string;
  href: string;
};

export type ContactDetail = {
  label: string;
  value: string;
};

export type ContactSectionData = {
  eyebrow: string;
  headlinePrefix: string;
  headlineHighlight: string;
  description: string;
  ctaLabel: string;
  channels: ContactChannel[];
  details: ContactDetail[];
};

export type FooterSectionData = {
  copyright: string;
  tagline: string;
  location: string;
  backToTop: string;
};

export type PageSections = {
  hero: HeroSectionData;
  about: AboutSectionData;
  projects: ProjectsSectionData;
  experience: ExperienceSectionData;
  initiatives: InitiativesSectionData;
  contact: ContactSectionData;
  footer: FooterSectionData;
};
```

**Transitional wiring (keep the legacy `app/(site)/` route green until Task 15 removes it):**

Create `site/src/lib/seo/site-url.ts`:

```typescript
const defaultSiteUrl = 'https://nyhasinavalona.com';

export function getSiteUrl(): URL {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!envUrl) {
    return new URL(defaultSiteUrl);
  }
  const normalized = envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
  return new URL(normalized);
}
```

Replace `site/app/(site)/page.tsx`:

```typescript
import { AmbientBackground, Footer, Navbar, Section } from '@/components/layout';
import { About, Contact, Experience, Hero, Initiatives, Projects } from '@/components/sections';
import { dictionaryFor } from '@/lib/i18n/dictionary.ts';
import { readPublication } from '@/lib/publication/read-publication.ts';
import { buildPageSections } from '@/lib/publication/sections.ts';

export default function Home() {
  const publication = readPublication();
  const dictionary = dictionaryFor('en');
  const sections = buildPageSections(publication.content, 'en', dictionary);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:px-4 focus:py-2"
        style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
      >
        {dictionary.skipLink}
      </a>

      <AmbientBackground />

      <main id="main" className="relative z-10 flex w-full flex-col items-center pb-24 md:pb-32">
        <Hero data={sections.hero} />

        <Section id="about-wrapper">
          <About data={sections.about} />
        </Section>

        <Section id="projects-wrapper">
          <Projects data={sections.projects} />
        </Section>

        <Section id="experience-wrapper">
          <Experience data={sections.experience} />
        </Section>

        <Section id="initiatives-wrapper">
          <Initiatives data={sections.initiatives} />
        </Section>

        <Section id="contact-wrapper">
          <Contact data={sections.contact} />
        </Section>
      </main>

      <Footer data={sections.footer} />
      <Navbar />
    </>
  );
}
```

Replace `site/app/layout.tsx`:

```typescript
import { Geist } from 'next/font/google';

import { ThemeProvider } from '@/components/providers';
import { readPublication } from '@/lib/publication/read-publication.ts';
import { getSiteUrl } from '@/lib/seo/site-url.ts';

import type { Metadata, Viewport } from 'next';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export function generateMetadata(): Metadata {
  const publication = readPublication();
  const siteUrl = getSiteUrl();
  const profile = publication.content.profile;
  const title = publication.content.siteSettings.title.en;
  const description = publication.content.siteSettings.description.en;

  return {
    metadataBase: siteUrl,
    title,
    description,
    authors: [{ name: profile.name }],
    creator: profile.name,
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      url: siteUrl,
      title,
      description,
      siteName: profile.name,
      locale: 'en_US',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function generateViewport(): Viewport {
  return {
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: '#f5f5f7' },
      { media: '(prefers-color-scheme: dark)', color: '#09090b' },
    ],
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

In `site/app/robots.ts`, import `getSiteUrl` from `@/lib/seo/site-url.ts`.

Replace `site/app/sitemap.ts`:

```typescript
import { readPublication } from '@/lib/publication/read-publication.ts';
import { getSiteUrl } from '@/lib/seo/site-url.ts';

import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const publication = readPublication();
  const baseUrl = siteUrl.toString().replace(/\/$/, '');

  return [
    {
      url: baseUrl,
      lastModified: publication.activatedAt,
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
```

- [ ] **Step 4: Run verification**

Run: `pnpm --filter @portfolio/site typecheck`

Expected: PASS

Run: `pnpm --filter @portfolio/site lint`

Expected: PASS

Run: `pnpm --filter @portfolio/site test`

Expected: PASS — **57 passed**

Run: `pnpm --filter @portfolio/site build`

Expected: PASS after `pnpm content:seed` (publication file required for layout metadata and sitemap).

- [ ] **Step 5: Commit**

```bash
git add 'site/app/(site)/page.tsx' site/app/layout.tsx site/app/robots.ts site/app/sitemap.ts site/public/data/content.json site/public/documents/resume.pdf site/src/components/layout/__tests__/footer.test.tsx site/src/lib/seo/site-url.ts site/src/components/layout/footer.tsx site/src/components/sections/__tests__/about.test.tsx site/src/components/sections/__tests__/contact.test.tsx site/src/components/sections/__tests__/experience.test.tsx site/src/components/sections/__tests__/hero.test.tsx site/src/components/sections/__tests__/initiatives.test.tsx site/src/components/sections/about.tsx site/src/components/sections/contact.tsx site/src/components/sections/experience.tsx site/src/components/sections/hero.tsx site/src/components/sections/initiatives.tsx site/src/lib/__tests__/icons.test.ts site/src/lib/__tests__/seo.test.ts site/src/lib/content/__tests__/helpers.test.ts site/src/lib/content/__tests__/service.test.ts site/src/lib/content/helpers.ts site/src/lib/content/index.ts site/src/lib/content/providers/index.ts site/src/lib/content/providers/static.ts site/src/lib/content/service.ts site/src/lib/content/types.ts site/src/lib/publication/__tests__/sections.test.ts site/src/lib/publication/sections.ts site/src/lib/seo.ts site/src/types/content.ts site/src/types/index.ts site/src/types/page-sections.ts site/src/types/sections/about.ts site/src/types/sections/contact.ts site/src/types/sections/experience.ts site/src/types/sections/hero.ts site/src/types/sections/index.ts site/src/types/sections/initiatives.ts site/src/types/sections/projects.ts
git commit -m "feat(site): map publication content into section view models"
```

### Task 15: Pages, metadata, and language switch

**Files:**

- `site/app/(en)/layout.tsx`
- `site/app/(en)/page.tsx`
- `site/app/(fr)/fr/page.tsx`
- `site/app/(fr)/layout.tsx`
- `site/app/(site)/page.tsx`
- `site/app/global-not-found.tsx`
- `site/app/layout.tsx`
- `site/app/robots.ts`
- `site/app/sitemap.ts`
- `site/src/components/layout/__tests__/navbar.test.tsx`
- `site/src/components/layout/navbar.tsx`
- `site/src/components/page/language-suggestion.tsx`
- `site/src/components/page/portfolio-page.tsx`
- `site/src/components/page/root-document.tsx`
- `site/src/lib/i18n/__tests__/prefers-french.test.ts`
- `site/src/lib/i18n/prefers-french.ts`
- `site/src/lib/seo/__tests__/metadata.test.ts`
- `site/src/lib/seo/metadata.ts`
- `site/src/lib/seo/site-url.ts`

- [ ] **Step 1: Write the failing test(s)**

Create `site/src/components/layout/__tests__/navbar.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Navbar } from '@/components/layout/navbar';
import { dictionaryFor } from '@/lib/i18n/dictionary.ts';

vi.mock('next-themes', () => {
  const setTheme = vi.fn();
  return {
    useTheme: () => ({ theme: 'light', setTheme, themes: ['light', 'dark'] }),
  };
});

vi.mock('@/hooks', () => ({
  useScrollSpy: () => 'hero',
}));

describe('Navbar', () => {
  const dictionary = dictionaryFor('en');

  it('renders all nav items with their labels', () => {
    render(<Navbar locale="en" dictionary={dictionary} />);
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '#hero');
    expect(screen.getByRole('link', { name: /about/i })).toHaveAttribute('href', '#about');
    expect(screen.getByRole('link', { name: /work/i })).toHaveAttribute('href', '#projects');
    expect(screen.getByRole('link', { name: /experience/i })).toHaveAttribute(
      'href',
      '#experience'
    );
    expect(screen.getByRole('link', { name: /contact/i })).toHaveAttribute('href', '#contact');
    expect(screen.getByRole('link', { name: /switch to french/i })).toHaveAttribute('href', '/fr');
  });

  it('marks the active section with aria-current', () => {
    render(<Navbar locale="en" dictionary={dictionary} />);
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /about/i })).not.toHaveAttribute('aria-current');
  });

  it('exposes a theme toggle button with an accessible label', async () => {
    render(<Navbar locale="en" dictionary={dictionary} />);
    const toggle = screen.getByRole('button', { name: /switch to dark mode/i });
    await userEvent.click(toggle);
    expect(toggle).toBeInTheDocument();
  });
});
```

Create `site/src/lib/i18n/__tests__/prefers-french.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import { prefersFrench } from '../prefers-french.ts';

describe('prefersFrench', () => {
  it('detects French browser preferences', () => {
    expect(prefersFrench(['fr-FR', 'en'])).toBe(true);
    expect(prefersFrench(['fr-CA'])).toBe(true);
    expect(prefersFrench(['fr'])).toBe(true);
  });

  it('returns false for English-first or empty lists', () => {
    expect(prefersFrench(['en-US', 'fr'])).toBe(false);
    expect(prefersFrench([])).toBe(false);
  });
});
```

Create `site/src/lib/seo/__tests__/metadata.test.ts`:

```typescript
import { activePublicationFixture } from '@portfolio/content/testing';
import { describe, expect, it } from 'vitest';

import { buildMetadata } from '../metadata.ts';

describe('buildMetadata', () => {
  it('sets canonical and language alternates for English', () => {
    const metadata = buildMetadata(activePublicationFixture, 'en');
    expect(metadata.alternates?.canonical).toBe('/');
    expect(metadata.alternates?.languages).toEqual({
      en: '/',
      fr: '/fr',
      'x-default': '/',
    });
  });

  it('sets the French canonical path', () => {
    const metadata = buildMetadata(activePublicationFixture, 'fr');
    expect(metadata.alternates?.canonical).toBe('/fr');
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm --filter @portfolio/site exec vitest run site/src/components/layout/__tests__/navbar.test.tsx site/src/lib/i18n/__tests__/prefers-french.test.ts site/src/lib/seo/__tests__/metadata.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Implement**

**`site/app/(en)/layout.tsx`**:

```typescript
import { RootDocument } from '@/components/page/root-document.tsx';
import { readPublication } from '@/lib/publication/read-publication.ts';
import { buildMetadata, buildViewport } from '@/lib/seo/metadata.ts';

import type { ReactNode } from 'react';

import '../globals.css';

export function generateMetadata() {
  const publication = readPublication();
  return buildMetadata(publication, 'en');
}

export const viewport = buildViewport();

export default function EnglishLayout({ children }: { children: ReactNode }) {
  return <RootDocument locale="en">{children}</RootDocument>;
}
```

**`site/app/(en)/page.tsx`**:

```typescript
import { PortfolioPage } from '@/components/page/portfolio-page.tsx';

export default function EnglishHomePage() {
  return <PortfolioPage locale="en" />;
}
```

**`site/app/(fr)/fr/page.tsx`**:

```typescript
import { PortfolioPage } from '@/components/page/portfolio-page.tsx';

export default function FrenchHomePage() {
  return <PortfolioPage locale="fr" />;
}
```

**`site/app/(fr)/layout.tsx`**:

```typescript
import { RootDocument } from '@/components/page/root-document.tsx';
import { readPublication } from '@/lib/publication/read-publication.ts';
import { buildMetadata, buildViewport } from '@/lib/seo/metadata.ts';

import type { ReactNode } from 'react';

import '../globals.css';

export function generateMetadata() {
  const publication = readPublication();
  return buildMetadata(publication, 'fr');
}

export const viewport = buildViewport();

export default function FrenchLayout({ children }: { children: ReactNode }) {
  return <RootDocument locale="fr">{children}</RootDocument>;
}
```

**`site/app/global-not-found.tsx`**:

```typescript
import Link from 'next/link';

import { dictionaryFor } from '@/lib/i18n/dictionary.ts';

import './globals.css';

export default function GlobalNotFound() {
  const english = dictionaryFor('en');
  const french = dictionaryFor('fr');

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-3xl font-semibold">{english.notFound.title}</h1>
        <p>{english.notFound.description}</p>
        <p lang="fr">{french.notFound.frenchLine}</p>
        <div className="flex gap-4 text-sm">
          <Link href="/">{english.notFound.homeLink}</Link>
          <Link href="/fr" hrefLang="fr" lang="fr">
            {english.notFound.frenchLink}
          </Link>
        </div>
      </body>
    </html>
  );
}
```

**`site/app/robots.ts`**:

```typescript
import { getSiteUrl } from '@/lib/seo/site-url.ts';

import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  const baseUrl = siteUrl.toString().replace(/\/$/, '');

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
```

**`site/app/sitemap.ts`**:

```typescript
import { getSiteUrl } from '@/lib/seo/site-url.ts';

import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const baseUrl = siteUrl.toString().replace(/\/$/, '');

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
```

**`site/src/components/layout/navbar.tsx`**:

```typescript
'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

import { useScrollSpy } from '@/hooks';
import { localePath, otherLocale } from '@/lib/i18n/locales.ts';
import { iconRegistry } from '@/lib/icons';

import type { Dictionary } from '@/lib/i18n/dictionary.ts';
import type { IconName } from '@/lib/icons';
import type { Locale } from '@portfolio/content';

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function useHasMounted(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}

interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: IconName;
}

interface NavbarProps {
  locale: Locale;
  dictionary: Dictionary;
}

function navItemsFor(dictionary: Dictionary): readonly NavItem[] {
  return [
    { id: 'hero', href: '#hero', label: dictionary.nav.home, icon: 'home' },
    { id: 'about', href: '#about', label: dictionary.nav.about, icon: 'user' },
    { id: 'projects', href: '#projects', label: dictionary.nav.work, icon: 'layers' },
    { id: 'experience', href: '#experience', label: dictionary.nav.experience, icon: 'briefcase' },
    { id: 'contact', href: '#contact', label: dictionary.nav.contact, icon: 'mail' },
  ];
}

export function Navbar({ locale, dictionary }: NavbarProps) {
  const items = navItemsFor(dictionary);
  const navIds = items.map((item) => item.id);
  const activeId = useScrollSpy(navIds);
  const { theme, setTheme } = useTheme();
  const mounted = useHasMounted();

  const isDark = theme === 'dark';
  const SunIcon = iconRegistry.sun;
  const MoonIcon = iconRegistry.moon;
  const alternate = otherLocale(locale);
  const languageCode = alternate.toUpperCase();
  const themeLabel = isDark ? dictionary.theme.switchToLight : dictionary.theme.switchToDark;

  return (
    <motion.nav
      aria-label={dictionary.nav.ariaLabel}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full px-2 py-2"
    >
      {items.map((item) => {
        const Icon = iconRegistry[item.icon];
        const isActive = activeId === item.id;

        return (
          <a
            key={item.id}
            href={item.href}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            className="relative flex items-center justify-center rounded-full p-3 transition-colors duration-300 sm:px-5 sm:py-3"
            style={{
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            {isActive && (
              <motion.span
                layoutId="navbar-active-pill"
                aria-hidden="true"
                className="absolute inset-0 rounded-full"
                style={{ background: 'var(--glass-bg-strong)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
              <span
                className={`hidden overflow-hidden text-sm font-medium transition-all duration-300 sm:block ${
                  isActive ? 'ml-1 w-auto opacity-100' : 'm-0 w-0 opacity-0'
                }`}
              >
                {item.label}
              </span>
            </span>
          </a>
        );
      })}

      <span
        aria-hidden="true"
        className="mx-1 h-6 w-px"
        style={{ background: 'var(--glass-border)' }}
      />

      <a
        href={localePath(alternate)}
        hrefLang={alternate}
        lang={alternate}
        aria-label={dictionary.language.switchLabel}
        className="rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-widest"
        style={{ color: 'var(--text-muted)' }}
      >
        {languageCode}
      </a>

      <button
        type="button"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label={themeLabel}
        className="relative flex cursor-pointer items-center justify-center rounded-full p-3 transition-colors duration-300"
        style={{ color: 'var(--text-muted)' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {mounted && isDark ? (
            <motion.span
              key="sun"
              initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.3 }}
            >
              <SunIcon size={20} strokeWidth={1.5} aria-hidden="true" />
            </motion.span>
          ) : (
            <motion.span
              key="moon"
              initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.3 }}
            >
              <MoonIcon size={20} strokeWidth={1.5} aria-hidden="true" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </motion.nav>
  );
}
```

**`site/src/components/page/language-suggestion.tsx`**:

```typescript
'use client';

import { useSyncExternalStore } from 'react';

import { prefersFrench } from '@/lib/i18n/prefers-french.ts';

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function useHasMounted(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}

interface LanguageSuggestionProps {
  linkLabel: string;
}

export function LanguageSuggestion({ linkLabel }: LanguageSuggestionProps) {
  const mounted = useHasMounted();
  if (!mounted) {
    return null;
  }
  if (!prefersFrench(navigator.languages)) {
    return null;
  }
  return (
    <p className="fixed right-6 top-6 z-40 text-sm" style={{ color: 'var(--text-muted)' }}>
      <a href="/fr" hrefLang="fr" lang="fr" className="underline-offset-4 hover:underline">
        {linkLabel}
      </a>
    </p>
  );
}
```

**`site/src/components/page/portfolio-page.tsx`**:

```typescript
import { AmbientBackground, Footer, Navbar, Section } from '@/components/layout';
import { LanguageSuggestion } from '@/components/page/language-suggestion.tsx';
import { About, Contact, Experience, Hero, Initiatives, Projects } from '@/components/sections';
import { dictionaryFor } from '@/lib/i18n/dictionary.ts';
import { readPublication } from '@/lib/publication/read-publication.ts';
import { buildPageSections } from '@/lib/publication/sections.ts';

import type { Locale } from '@portfolio/content';

interface PortfolioPageProps {
  locale: Locale;
}

export function PortfolioPage({ locale }: PortfolioPageProps) {
  const publication = readPublication();
  const dictionary = dictionaryFor(locale);
  const sections = buildPageSections(publication.content, locale, dictionary);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:px-4 focus:py-2"
        style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
      >
        {dictionary.skipLink}
      </a>

      {locale === 'en' && <LanguageSuggestion linkLabel={dictionary.language.suggestionLink} />}

      <AmbientBackground />

      <main id="main" className="relative z-10 flex w-full flex-col items-center pb-24 md:pb-32">
        <Hero data={sections.hero} />

        <Section id="about-wrapper">
          <About data={sections.about} />
        </Section>

        <Section id="projects-wrapper">
          <Projects data={sections.projects} />
        </Section>

        <Section id="experience-wrapper">
          <Experience data={sections.experience} />
        </Section>

        <Section id="initiatives-wrapper">
          <Initiatives data={sections.initiatives} />
        </Section>

        <Section id="contact-wrapper">
          <Contact data={sections.contact} />
        </Section>
      </main>

      <Footer data={sections.footer} />
      <Navbar locale={locale} dictionary={dictionary} />
    </>
  );
}
```

**`site/src/components/page/root-document.tsx`**:

```typescript
import { Geist } from 'next/font/google';

import { ThemeProvider } from '@/components/providers';

import type { Locale } from '@portfolio/content';
import type { ReactNode } from 'react';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

interface RootDocumentProps {
  locale: Locale;
  children: ReactNode;
}

export function RootDocument({ locale, children }: RootDocumentProps) {
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

**`site/src/lib/i18n/prefers-french.ts`**:

```typescript
export function prefersFrench(languages: readonly string[]): boolean {
  const [first] = languages;
  if (first === undefined) {
    return false;
  }
  const normalized = first.toLowerCase();
  if (normalized === 'fr') {
    return true;
  }
  if (normalized.startsWith('fr-')) {
    return true;
  }
  return false;
}
```

**`site/src/lib/seo/metadata.ts`**:

```typescript
import { localePath, ogImagePath, openGraphLocale } from '../i18n/locales.ts';

import { getSiteUrl } from './site-url.ts';

import type { ActivePublication, Locale } from '@portfolio/content';
import type { Metadata, Viewport } from 'next';

const lightThemeColor = '#f5f5f7';
const darkThemeColor = '#09090b';

function localizedTitle(publication: ActivePublication, locale: Locale): string {
  return publication.content.siteSettings.title[locale];
}

function localizedDescription(publication: ActivePublication, locale: Locale): string {
  return publication.content.siteSettings.description[locale];
}

export function buildMetadata(publication: ActivePublication, locale: Locale): Metadata {
  const siteUrl = getSiteUrl();
  const profile = publication.content.profile;
  const canonicalPath = localePath(locale);
  const title = localizedTitle(publication, locale);
  const description = localizedDescription(publication, locale);
  const alternateLocale = locale === 'en' ? 'fr_FR' : 'en_US';

  return {
    metadataBase: siteUrl,
    title,
    description,
    authors: [{ name: profile.name }],
    creator: profile.name,
    alternates: {
      canonical: canonicalPath,
      languages: {
        en: '/',
        fr: '/fr',
        'x-default': '/',
      },
    },
    openGraph: {
      type: 'website',
      url: new URL(canonicalPath, siteUrl).toString(),
      siteName: profile.name,
      locale: openGraphLocale(locale),
      alternateLocale: [alternateLocale],
      title,
      description,
      images: [
        {
          url: ogImagePath(locale),
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function buildViewport(): Viewport {
  return {
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: lightThemeColor },
      { media: '(prefers-color-scheme: dark)', color: darkThemeColor },
    ],
  };
}
```

**`site/src/lib/seo/site-url.ts`**:

```typescript
const defaultSiteUrl = 'https://nyhasinavalona.com';

export function getSiteUrl(): URL {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!envUrl) {
    return new URL(defaultSiteUrl);
  }
  const normalized = envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
  return new URL(normalized);
}
```

- [ ] **Step 4: Run verification**

Run: `pnpm --filter @portfolio/site typecheck`

Expected: PASS

Run: `pnpm --filter @portfolio/site lint`

Expected: PASS

Run: `pnpm --filter @portfolio/site test`

Expected: PASS — **61 passed**

Run: `pnpm content:seed`

Expected: writes `site/content/publication.json`

Run: `pnpm --filter @portfolio/site build`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "site/app/(en)/layout.tsx" "site/app/(en)/page.tsx" "site/app/(fr)/fr/page.tsx" "site/app/(fr)/layout.tsx" "site/app/(site)/page.tsx" site/app/global-not-found.tsx site/app/layout.tsx site/app/robots.ts site/app/sitemap.ts site/src/components/layout/__tests__/navbar.test.tsx site/src/components/layout/navbar.tsx site/src/components/page/language-suggestion.tsx site/src/components/page/portfolio-page.tsx site/src/components/page/root-document.tsx site/src/lib/i18n/__tests__/prefers-french.test.ts site/src/lib/i18n/prefers-french.ts site/src/lib/seo/__tests__/metadata.test.ts site/src/lib/seo/metadata.ts site/src/lib/seo/site-url.ts
git commit -m "feat(site): add bilingual static routes and portfolio page shell"
```

### Task 16: SEO JSON-LD, sitemap, robots, OG images

**Files:**

- `site/app/og/[file]/route.tsx`
- `site/app/sitemap.ts`
- `site/src/components/page/portfolio-page.tsx`
- `site/src/lib/i18n/__tests__/og-image-locale.test.ts`
- `site/src/lib/i18n/og-image-locale.ts`
- `site/src/lib/seo/__tests__/structured-data.test.ts`
- `site/src/lib/seo/structured-data.ts`

- [ ] **Step 1: Write the failing test(s)**

Create `site/src/lib/i18n/__tests__/og-image-locale.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import { cvLocale, ogImageLocale } from '../og-image-locale.ts';

describe('ogImageLocale', () => {
  it('maps known filenames to locales', () => {
    expect(ogImageLocale('og-en.png')).toBe('en');
    expect(ogImageLocale('og-fr.png')).toBe('fr');
  });

  it('throws for unknown filenames', () => {
    expect(() => ogImageLocale('missing.png')).toThrow(/Unknown OG image/);
  });
});

describe('cvLocale', () => {
  it('maps CV filenames to locales', () => {
    expect(cvLocale('ny-randriantsarafara-cv-en.pdf')).toBe('en');
    expect(cvLocale('ny-randriantsarafara-cv-fr.pdf')).toBe('fr');
  });
});
```

Create `site/src/lib/seo/__tests__/structured-data.test.ts`:

```typescript
import { activePublicationFixture } from '@portfolio/content/testing';
import { describe, expect, it } from 'vitest';

import { buildProfilePageJsonLd, serializeJsonLd } from '../structured-data.ts';

describe('structured data', () => {
  it('builds a ProfilePage with a Person main entity', () => {
    const json = buildProfilePageJsonLd(
      activePublicationFixture,
      'en',
      new URL('https://nyhasinavalona.com')
    );
    expect(json['@type']).toBe('ProfilePage');
    const mainEntity = json.mainEntity;
    if (typeof mainEntity !== 'object' || mainEntity === null || Array.isArray(mainEntity)) {
      throw new Error('Expected mainEntity object');
    }
    expect(mainEntity['@type']).toBe('Person');
    expect(mainEntity.name).toBe(activePublicationFixture.content.profile.name);
  });

  it('escapes angle brackets in serialized JSON-LD', () => {
    const serialized = serializeJsonLd({ '@type': 'Thing', note: '<script>' });
    expect(serialized).toContain('\\u003c');
    expect(serialized).not.toContain('<script>');
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm --filter @portfolio/site exec vitest run site/src/lib/i18n/__tests__/og-image-locale.test.ts site/src/lib/seo/__tests__/structured-data.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Implement**

**`site/app/og/[file]/route.tsx`**:

```typescript
import { ImageResponse } from 'next/og';

import { dictionaryFor } from '@/lib/i18n/dictionary.ts';
import { ogImageFiles, ogImageLocale } from '@/lib/i18n/og-image-locale.ts';
import { readPublication } from '@/lib/publication/read-publication.ts';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return ogImageFiles().map((file) => ({ file }));
}

export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  const locale = ogImageLocale(file);
  const publication = readPublication();
  const dictionary = dictionaryFor(locale);
  const profile = publication.content.profile;
  const headline = profile.headline[locale];
  const location = profile.location[locale];

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        padding: 64,
        background: '#09090b',
        color: '#f4f4f5',
      }}
    >
      <div style={{ fontSize: 28, opacity: 0.8 }}>{dictionary.og.tagline}</div>
      <div
        style={{
          fontSize: 64,
          fontWeight: 600,
          background: 'linear-gradient(90deg, #6366f1, #a855f7, #f43f5e)',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        {profile.name}
      </div>
      <div style={{ fontSize: 36, marginTop: 16 }}>{headline}</div>
      <div style={{ fontSize: 24, marginTop: 8, opacity: 0.75 }}>{location}</div>
    </div>,
    { width: 1200, height: 630 }
  );
}
```

**`site/app/sitemap.ts`**:

```typescript
import { localePath, locales } from '@/lib/i18n/locales.ts';
import { readPublication } from '@/lib/publication/read-publication.ts';
import { getSiteUrl } from '@/lib/seo/site-url.ts';

import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const publication = readPublication();
  const baseUrl = siteUrl.toString().replace(/\/$/, '');
  const lastModified = new Date(publication.activatedAt);

  return locales.map((locale) => ({
    url: `${baseUrl}${localePath(locale)}`,
    lastModified,
    changeFrequency: 'monthly',
    priority: locale === 'en' ? 1 : 0.9,
    alternates: {
      languages: {
        en: `${baseUrl}/`,
        fr: `${baseUrl}/fr`,
        'x-default': `${baseUrl}/`,
      },
    },
  }));
}
```

**`site/src/components/page/portfolio-page.tsx`**:

```typescript
import { AmbientBackground, Footer, Navbar, Section } from '@/components/layout';
import { LanguageSuggestion } from '@/components/page/language-suggestion.tsx';
import { About, Contact, Experience, Hero, Initiatives, Projects } from '@/components/sections';
import { dictionaryFor } from '@/lib/i18n/dictionary.ts';
import { readPublication } from '@/lib/publication/read-publication.ts';
import { buildPageSections } from '@/lib/publication/sections.ts';
import { getSiteUrl } from '@/lib/seo/site-url.ts';
import { buildPageJsonLdScript } from '@/lib/seo/structured-data.ts';

import type { Locale } from '@portfolio/content';

interface PortfolioPageProps {
  locale: Locale;
}

export function PortfolioPage({ locale }: PortfolioPageProps) {
  const publication = readPublication();
  const dictionary = dictionaryFor(locale);
  const sections = buildPageSections(publication.content, locale, dictionary);
  const jsonLd = buildPageJsonLdScript(publication, locale, getSiteUrl());

  return (
    <>
      <script type="application/ld+json">{jsonLd}</script>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:px-4 focus:py-2"
        style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
      >
        {dictionary.skipLink}
      </a>

      {locale === 'en' && <LanguageSuggestion linkLabel={dictionary.language.suggestionLink} />}

      <AmbientBackground />

      <main id="main" className="relative z-10 flex w-full flex-col items-center pb-24 md:pb-32">
        <Hero data={sections.hero} />

        <Section id="about-wrapper">
          <About data={sections.about} />
        </Section>

        <Section id="projects-wrapper">
          <Projects data={sections.projects} />
        </Section>

        <Section id="experience-wrapper">
          <Experience data={sections.experience} />
        </Section>

        <Section id="initiatives-wrapper">
          <Initiatives data={sections.initiatives} />
        </Section>

        <Section id="contact-wrapper">
          <Contact data={sections.contact} />
        </Section>
      </main>

      <Footer data={sections.footer} />
      <Navbar locale={locale} dictionary={dictionary} />
    </>
  );
}
```

**`site/src/lib/i18n/og-image-locale.ts`**:

```typescript
import { cvFileName } from './locales.ts';

import type { Locale } from '@portfolio/content';

export function ogImageLocale(file: string): Locale {
  if (file === 'og-en.png') {
    return 'en';
  }
  if (file === 'og-fr.png') {
    return 'fr';
  }
  throw new Error(`Unknown OG image file: ${file}`);
}

export function ogImageFiles(): readonly string[] {
  return ['og-en.png', 'og-fr.png'];
}

export function cvLocale(file: string): Locale {
  if (file === cvFileName('en')) {
    return 'en';
  }
  if (file === cvFileName('fr')) {
    return 'fr';
  }
  throw new Error(`Unknown CV file: ${file}`);
}
```

**`site/src/lib/seo/structured-data.ts`**:

```typescript
import { localePath } from '../i18n/locales.ts';
import { featuredSkillNames } from '../publication/sections.ts';

import type { ActivePublication, Locale } from '@portfolio/content';

type JsonLdValue = string | number | boolean | null | JsonLdObject | JsonLdValue[];

type JsonLdObject = {
  [key: string]: JsonLdValue;
};

function localizedText(
  publication: ActivePublication,
  locale: Locale,
  field: { en: string; fr: string }
): string {
  if (locale === 'fr') {
    return field.fr;
  }
  return field.en;
}

function currentEmployer(publication: ActivePublication): JsonLdObject | null {
  const experience = publication.content.experiences.find((item) => item.endMonth === null);
  if (experience === undefined) {
    return null;
  }
  return {
    '@type': 'Organization',
    name: experience.company,
  };
}

export function buildProfilePageJsonLd(
  publication: ActivePublication,
  locale: Locale,
  siteUrl: URL
): JsonLdObject {
  const { profile, skills } = publication.content;
  const pageUrl = new URL(localePath(locale), siteUrl).toString();
  const employer = currentEmployer(publication);
  const person: JsonLdObject = {
    '@type': 'Person',
    name: profile.name,
    jobTitle: localizedText(publication, locale, profile.headline),
    description: localizedText(publication, locale, profile.introduction),
    email: `mailto:${profile.email}`,
    url: pageUrl,
    sameAs: [profile.linkedinUrl, profile.githubUrl],
    knowsAbout: featuredSkillNames(skills, skills.length),
    knowsLanguage: localizedText(publication, locale, profile.languages),
    homeLocation: {
      '@type': 'Place',
      name: localizedText(publication, locale, profile.location),
    },
  };
  if (employer !== null) {
    person.worksFor = employer;
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: person,
    inLanguage: locale,
    url: pageUrl,
    dateModified: publication.activatedAt,
  };
}

export function serializeJsonLd(value: JsonLdObject): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function buildPageJsonLdScript(
  publication: ActivePublication,
  locale: Locale,
  siteUrl: URL
): string {
  const payload = buildProfilePageJsonLd(publication, locale, siteUrl);
  return serializeJsonLd(payload);
}
```

- [ ] **Step 4: Run verification**

Run: `pnpm --filter @portfolio/site typecheck`

Expected: PASS

Run: `pnpm --filter @portfolio/site lint`

Expected: PASS

Run: `pnpm --filter @portfolio/site test`

Expected: PASS — **66 passed**

Run: `pnpm content:seed`

Expected: writes `site/content/publication.json`

Run: `pnpm --filter @portfolio/site build`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add 'site/app/og/[file]/route.tsx' site/app/sitemap.ts site/src/components/page/portfolio-page.tsx site/src/lib/i18n/__tests__/og-image-locale.test.ts site/src/lib/i18n/og-image-locale.ts site/src/lib/seo/__tests__/structured-data.test.ts site/src/lib/seo/structured-data.ts
git commit -m "feat(site): add JSON-LD sitemap and static OG images"
```

### Task 17: CV PDFs and CSP

**Files:**

- `pnpm-lock.yaml`
- `site/app/documents/[file]/route.tsx`
- `site/package.json`
- `site/src/components/page/root-document.tsx`
- `site/src/cv/__tests__/render-cv.test.tsx`
- `site/src/cv/cv-document.tsx`
- `site/src/cv/cv-model.ts`
- `site/src/cv/register-geist-fonts.ts`
- `site/src/cv/render-cv.tsx`
- `site/src/lib/seo/__tests__/content-security-policy.test.ts`
- `site/src/lib/seo/content-security-policy.ts`
- `site/tsconfig.json`

- [ ] **Step 1: Add dependencies**

```bash
cd site
pnpm add geist@1.7.2 @react-pdf/renderer@4.9.0
```

Do **not** add `@lhci/cli` or a `"lighthouse"` script in this task (Task 18).

- [ ] **Step 2: Write the failing test(s)**

Create `site/src/cv/__tests__/render-cv.test.tsx`:

```typescript
// @vitest-environment node
import { contentFixture } from '@portfolio/content/testing';
import { describe, expect, it } from 'vitest';

import { dictionaryFor } from '../../lib/i18n/dictionary.ts';
import { locales } from '../../lib/i18n/locales.ts';
import { buildCvModel } from '../cv-model.ts';
import { renderCv } from '../render-cv.tsx';

describe('renderCv', () => {
  it.each(locales)('renders a PDF for the %s locale', async (locale) => {
    const model = buildCvModel(contentFixture, locale, dictionaryFor(locale));
    const bytes = await renderCv(model);
    const header = String.fromCharCode(...bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(2048);
  });
});
```

Create `site/src/lib/seo/__tests__/content-security-policy.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import { buildContentSecurityPolicy } from '../content-security-policy.ts';

describe('buildContentSecurityPolicy', () => {
  it('includes the API origin in connect-src', () => {
    const policy = buildContentSecurityPolicy('https://api.nyhasinavalona.com/content/active');
    expect(policy).toContain("connect-src 'self' https://api.nyhasinavalona.com");
    expect(policy).toContain("object-src 'none'");
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run: `pnpm --filter @portfolio/site exec vitest run site/src/cv/__tests__/render-cv.test.tsx site/src/lib/seo/__tests__/content-security-policy.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 4: Implement**

**`site/app/documents/[file]/route.tsx`**:

```typescript
import { buildCvModel } from '@/cv/cv-model.ts';
import { renderCv } from '@/cv/render-cv.tsx';
import { dictionaryFor } from '@/lib/i18n/dictionary.ts';
import { cvFileName, locales } from '@/lib/i18n/locales.ts';
import { cvLocale } from '@/lib/i18n/og-image-locale.ts';
import { readPublication } from '@/lib/publication/read-publication.ts';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return locales.map((locale) => ({ file: cvFileName(locale) }));
}

export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  const locale = cvLocale(file);
  const publication = readPublication();
  const model = buildCvModel(publication.content, locale, dictionaryFor(locale));
  const bytes = await renderCv(model);
  const body = Uint8Array.from(bytes);
  return new Response(body, {
    headers: {
      'Content-Type': 'application/pdf',
    },
  });
}
```

**`site/package.json`**:

```json
{
  "name": "@portfolio/site",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --max-warnings 0",
    "lint:fix": "eslint . --fix",
    "test": "vitest run",
    "test:watch": "vitest --watch",
    "typecheck": "tsc --noEmit",
    "content:seed": "node scripts/write-content.ts --seed",
    "content:pull": "node scripts/write-content.ts --api"
  },
  "dependencies": {
    "@portfolio/content": "workspace:*",
    "@react-pdf/renderer": "4.9.0",
    "clsx": "^2.1.1",
    "geist": "1.7.2",
    "lucide-react": "^1.8.0",
    "motion": "^12.38.0",
    "next": "16.4.0",
    "next-themes": "^0.4.6",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "tailwind-merge": "^3.4.0"
  },
  "devDependencies": {
    "@portfolio/cms-provision": "workspace:*",
    "@tailwindcss/postcss": "^4",
    "@testing-library/jest-dom": "^7.0.1",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/node": "^24.19.2",
    "@types/react": "19.3.0",
    "@types/react-dom": "^19.3.0",
    "@typescript-eslint/eslint-plugin": "^8.53.0",
    "@vitejs/plugin-react": "^6.1.2",
    "eslint": "^9",
    "eslint-config-next": "16.4.0",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-prettier": "^5.5.5",
    "jsdom": "^29.1.1",
    "prettier": "3.7.4",
    "tailwindcss": "^4",
    "typescript": "^6.0.3",
    "vite": "^8.3.4",
    "vitest": "^5.0.4"
  }
}
```

**`site/src/components/page/root-document.tsx`**:

```typescript
import { Geist } from 'next/font/google';

import { ThemeProvider } from '@/components/providers';
import { buildContentSecurityPolicy, defaultApiUrl } from '@/lib/seo/content-security-policy.ts';

import type { Locale } from '@portfolio/content';
import type { ReactNode } from 'react';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

interface RootDocumentProps {
  locale: Locale;
  children: ReactNode;
}

export function RootDocument({ locale, children }: RootDocumentProps) {
  const policy = buildContentSecurityPolicy(defaultApiUrl());

  return (
    <html lang={locale} suppressHydrationWarning>
      {/* eslint-disable-next-line @next/next/no-head-element -- CSP meta belongs on the locale root layout. */}
      <head>
        <meta httpEquiv="Content-Security-Policy" content={policy} />
      </head>
      <body className={`${geistSans.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

**`site/src/cv/cv-document.tsx`**:

```typescript
import { Document, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

import type { CvModel } from './cv-model.ts';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Geist',
    fontSize: 10,
    padding: 40,
    lineHeight: 1.4,
  },
  h1: { fontSize: 20, fontWeight: 600, marginBottom: 4 },
  h2: { fontSize: 12, fontWeight: 600, marginTop: 16, marginBottom: 6 },
  muted: { color: '#52525b', marginBottom: 8 },
  paragraph: { marginBottom: 6 },
  itemTitle: { fontWeight: 600 },
});

interface CvDocumentProps {
  model: CvModel;
}

export function CvDocument({ model }: CvDocumentProps) {
  return (
    <Document
      title={`${model.header.name} CV`}
      author={model.header.name}
      language={model.language}
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>{model.header.name}</Text>
        <Text style={styles.muted}>
          {model.header.headline} · {model.header.location}
        </Text>
        <Text style={styles.paragraph}>{model.introduction}</Text>
        <Text style={styles.h2}>{model.labels.contact}</Text>
        <Text>{model.header.email}</Text>
        <Link src={model.header.linkedinUrl}>{model.header.linkedinLabel}</Link>
        <Link src={model.header.githubUrl}>{model.header.githubLabel}</Link>
        <Text style={styles.h2}>{model.labels.experience}</Text>
        {model.experiences.map((experience) => (
          <View key={`${experience.company}-${experience.period}`} style={{ marginBottom: 8 }}>
            <Text style={styles.itemTitle}>
              {experience.role} — {experience.company}
            </Text>
            <Text style={styles.muted}>
              {experience.period} · {experience.location}
            </Text>
            {experience.highlights.map((highlight) => (
              <Text key={highlight}>• {highlight}</Text>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}
```

**`site/src/cv/cv-model.ts`**:

```typescript
import { formatMonthPeriod, formatYearPeriod, skillNames } from '../lib/publication/sections.ts';

import type { Dictionary } from '../lib/i18n/dictionary.ts';
import type { Locale, PublicationContent } from '@portfolio/content';

export type CvExperience = {
  role: string;
  company: string;
  period: string;
  location: string;
  highlights: readonly string[];
};

export type CvProject = {
  title: string;
  meta: string;
  summary: string;
};

export type CvSkillGroup = {
  title: string;
  skills: readonly string[];
};

export type CvModel = {
  header: {
    name: string;
    headline: string;
    location: string;
    email: string;
    linkedinLabel: string;
    linkedinUrl: string;
    githubLabel: string;
    githubUrl: string;
    workAuthorization: string;
    languages: string;
    availability: string;
  };
  introduction: string;
  keyFigures: readonly { value: string; label: string }[];
  experiences: readonly CvExperience[];
  professionalProjects: readonly CvProject[];
  personalProjects: readonly CvProject[];
  skillGroups: readonly CvSkillGroup[];
  labels: Dictionary['cv'];
  language: Locale;
};

function localized(content: PublicationContent, locale: Locale, field: { en: string; fr: string }) {
  if (locale === 'fr') {
    return field.fr;
  }
  return field.en;
}

function localizedList(
  content: PublicationContent,
  locale: Locale,
  field: { en: string[]; fr: string[] }
) {
  if (locale === 'fr') {
    return field.fr;
  }
  return field.en;
}

export function buildCvModel(
  content: PublicationContent,
  locale: Locale,
  dictionary: Dictionary
): CvModel {
  const { profile, capabilities, skills, experiences, projects, keyFigures } = content;
  const professional = projects.filter((project) => project.kind === 'professional');
  const personal = projects.filter((project) => project.kind === 'personal');

  const skillGroups = capabilities.flatMap((capability) => {
    const names = skills
      .filter((skill) => skill.capabilitySlug === capability.slug)
      .map((skill) => skill.name);
    if (names.length === 0) {
      return [];
    }
    return [
      {
        title: localized(content, locale, capability.title),
        skills: names,
      },
    ];
  });

  return {
    header: {
      name: profile.name,
      headline: localized(content, locale, profile.headline),
      location: localized(content, locale, profile.location),
      email: profile.email,
      linkedinLabel: dictionary.contact.channelLinkedin,
      linkedinUrl: profile.linkedinUrl,
      githubLabel: dictionary.contact.channelGithub,
      githubUrl: profile.githubUrl,
      workAuthorization: localized(content, locale, profile.workAuthorization),
      languages: localized(content, locale, profile.languages),
      availability: localized(content, locale, profile.availability),
    },
    introduction: localized(content, locale, profile.introduction),
    keyFigures: keyFigures.map((figure) => ({
      value: figure.value,
      label: localized(content, locale, figure.label),
    })),
    experiences: experiences.map((experience) => ({
      role: localized(content, locale, experience.role),
      company: experience.company,
      period: formatMonthPeriod(
        experience.startMonth,
        experience.endMonth,
        locale,
        dictionary.periods.present
      ),
      location: experience.location ?? '',
      highlights: localizedList(content, locale, experience.highlights),
    })),
    professionalProjects: professional.map((project) => ({
      title: localized(content, locale, project.title),
      meta: [
        project.role === null ? '' : localized(content, locale, project.role),
        formatYearPeriod(project.startYear, project.endYear, dictionary.periods.present),
        project.company ?? '',
      ]
        .filter((part) => part.length > 0)
        .join(' · '),
      summary: localized(content, locale, project.summary),
    })),
    personalProjects: personal.map((project) => ({
      title: localized(content, locale, project.title),
      meta: skillNames(project.skillSlugs, skills).join(' · '),
      summary: localized(content, locale, project.summary),
    })),
    skillGroups,
    labels: dictionary.cv,
    language: locale,
  };
}
```

**`site/src/cv/register-geist-fonts.ts`**:

```typescript
import path from 'node:path';

import { Font } from '@react-pdf/renderer';

// The geist package does not export its TTF files; `process.cwd()` is `site/` during the build and tests.
const fontDirectory = path.join(process.cwd(), 'node_modules/geist/dist/fonts/geist-sans');

Font.register({
  family: 'Geist',
  fonts: [
    { src: path.join(fontDirectory, 'Geist-Regular.ttf') },
    { src: path.join(fontDirectory, 'Geist-SemiBold.ttf'), fontWeight: 600 },
  ],
});
```

**`site/src/cv/render-cv.tsx`**:

```typescript
import './register-geist-fonts.ts';

import { renderToBuffer } from '@react-pdf/renderer';

import { CvDocument } from './cv-document.tsx';

import type { CvModel } from './cv-model.ts';

export async function renderCv(model: CvModel): Promise<Uint8Array> {
  const buffer = await renderToBuffer(<CvDocument model={model} />);
  return new Uint8Array(buffer);
}
```

**`site/src/lib/seo/content-security-policy.ts`**:

```typescript
export function buildContentSecurityPolicy(apiUrl: string): string {
  const origin = new URL(apiUrl).origin;
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' ${origin}`,
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}

export function defaultApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? 'https://api.nyhasinavalona.com';
}
```

**`site/tsconfig.json`**:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./src/components/*"],
      "@/hooks": ["./src/hooks"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types": ["./src/types"],
      "@/types/*": ["./src/types/*"],
      "@/constants/*": ["./src/constants/*"],
      "@/cv/*": ["./src/cv/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Run verification**

Run: `pnpm --filter @portfolio/site typecheck`

Expected: PASS

Run: `pnpm --filter @portfolio/site lint`

Expected: PASS

Run: `pnpm --filter @portfolio/site test`

Expected: PASS — **68 passed**

Run: `pnpm content:seed`

Expected: writes `site/content/publication.json`

Run: `pnpm --filter @portfolio/site build`

Expected: PASS

Run: `pdftotext site/out/documents/ny-randriantsarafara-cv-en.pdf - | grep '→'`

Expected: lines containing `→` (not `'` corruption)

- [ ] **Step 6: Commit**

```bash
git add pnpm-lock.yaml 'site/app/documents/[file]/route.tsx' site/package.json site/src/components/page/root-document.tsx site/src/cv/__tests__/render-cv.test.tsx site/src/cv/cv-document.tsx site/src/cv/cv-model.ts site/src/cv/register-geist-fonts.ts site/src/cv/render-cv.tsx site/src/lib/seo/__tests__/content-security-policy.test.ts site/src/lib/seo/content-security-policy.ts site/tsconfig.json
git commit -m "feat(site): generate CV PDFs and add content security policy"
```

### Task 18: Lighthouse CI and CI workflow

**Files:**

- Delete: `.github/workflows/deploy.yml`
- Modify: `.github/workflows/ci.yml`, `.gitignore`, `package.json`, `pnpm-lock.yaml`, `site/package.json`, `site/app/globals.css`, `site/src/components/layout/ambient-background.tsx`
- Create: `site/lighthouserc.json`

- [ ] **Step 1: Add dependencies and the site script**

```bash
cd site
pnpm add -D @lhci/cli@0.15.1
```

In `site/package.json`, add after `"content:pull"`:

```json
    "lighthouse": "lhci autorun"
```

(add the comma after the `content:pull` line.) Delete the GitHub Pages deployment: `git rm .github/workflows/deploy.yml`.

- [ ] **Step 2: Implement**

**`.github/workflows/ci.yml`**:

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
      - name: Build the Directus extension
        run: pnpm build:extension
      - name: Seed publication content
        run: pnpm content:seed
      - name: Build the site
        run: pnpm build:site

  lighthouse:
    name: Lighthouse
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
      - name: Seed publication content
        run: pnpm content:seed
      - name: Build the site
        run: pnpm build:site
      - name: Lighthouse
        run: pnpm lighthouse
      - name: Upload Lighthouse reports
        if: failure()
        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: lighthouse-reports
          path: site/.lighthouseci

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

**`.gitignore`**:

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
site/content/
.lighthouseci/
site/.lighthouseci/

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

**`package.json`**:

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
    "dev:api": "pnpm --filter @portfolio/api dev",
    "content:seed": "pnpm --filter @portfolio/site content:seed",
    "content:pull": "pnpm --filter @portfolio/site content:pull",
    "lighthouse": "pnpm --filter @portfolio/site lighthouse",
    "lint": "pnpm -r --if-present lint",
    "typecheck": "pnpm -r --if-present typecheck",
    "test": "pnpm -r --filter '!@portfolio/cms-tests' --if-present test",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "validate": "pnpm typecheck && pnpm lint && pnpm format:check",
    "build:extension": "pnpm --filter directus-extension-publication build",
    "cms:up": "pnpm build:extension && docker compose up -d --wait",
    "cms:down": "docker compose down",
    "cms:logs": "docker compose logs -f directus",
    "provision": "pnpm --filter @portfolio/cms-provision start",
    "test:cms": "pnpm --filter @portfolio/cms-tests test",
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

**`site/app/globals.css`**:

```css
@import 'tailwindcss';

@theme inline {
  --font-sans: var(--font-geist-sans);
}

:root,
[data-theme='light'] {
  --bg-base: #f5f5f7;
  --text-primary: #18181b;
  --text-secondary: #3f3f46;
  --text-muted: #71717a;
  --text-dimmed: #a1a1aa;
  --glass-bg: rgba(255, 255, 255, 0.55);
  --glass-bg-hover: rgba(255, 255, 255, 0.7);
  --glass-bg-subtle: rgba(255, 255, 255, 0.4);
  --glass-bg-card: rgba(255, 255, 255, 0.5);
  --glass-bg-strong: rgba(255, 255, 255, 0.7);
  --glass-border: rgba(0, 0, 0, 0.06);
  --glass-border-strong: rgba(0, 0, 0, 0.1);
  --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.06);
  --input-bg: rgba(255, 255, 255, 0.7);
  --input-border: rgba(0, 0, 0, 0.1);
  --input-placeholder: #a1a1aa;
  --btn-primary-bg: #18181b;
  --btn-primary-text: #ffffff;
  --btn-primary-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  --tag-bg: rgba(0, 0, 0, 0.04);
  --tag-border: rgba(0, 0, 0, 0.08);
  --tag-text: #3f3f46;
  --footer-bg: rgba(255, 255, 255, 0.4);
  --footer-border: rgba(0, 0, 0, 0.06);
  --selection-bg: rgba(99, 102, 241, 0.2);
  --overlay-bg: rgba(255, 255, 255, 0.5);
  --vignette: rgba(255, 255, 255, 0.6);
  --accent-indigo: #6366f1;
  --accent-rose: #f43f5e;
  --accent-teal: #14b8a6;
}

[data-theme='dark'] {
  --bg-base: #09090b;
  --text-primary: #f4f4f5;
  --text-secondary: #d4d4d8;
  --text-muted: #a1a1aa;
  --text-dimmed: #71717a;
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-bg-hover: rgba(255, 255, 255, 0.06);
  --glass-bg-subtle: rgba(255, 255, 255, 0.02);
  --glass-bg-card: rgba(255, 255, 255, 0.04);
  --glass-bg-strong: rgba(255, 255, 255, 0.08);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-border-strong: rgba(255, 255, 255, 0.2);
  --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  --input-bg: rgba(255, 255, 255, 0.05);
  --input-border: rgba(255, 255, 255, 0.1);
  --input-placeholder: #71717a;
  --btn-primary-bg: #ffffff;
  --btn-primary-text: #18181b;
  --btn-primary-shadow: 0 8px 32px rgba(255, 255, 255, 0.2);
  --tag-bg: rgba(255, 255, 255, 0.05);
  --tag-border: rgba(255, 255, 255, 0.1);
  --tag-text: #e4e4e7;
  --footer-bg: rgba(0, 0, 0, 0.2);
  --footer-border: rgba(255, 255, 255, 0.05);
  --selection-bg: rgba(99, 102, 241, 0.3);
  --overlay-bg: rgba(0, 0, 0, 0.4);
  --vignette: rgba(0, 0, 0, 0.6);
}

html {
  scroll-behavior: smooth;
}

body {
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-sans), Arial, Helvetica, sans-serif;
  transition:
    background-color 300ms ease,
    color 300ms ease;
}

::selection {
  background: var(--selection-bg);
  color: var(--text-primary);
}

::-webkit-scrollbar {
  width: 0;
  background: transparent;
}

.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}

.ambient-background {
  background-color: var(--bg-base);
  background-image:
    radial-gradient(circle at 10% 10%, rgba(99, 102, 241, 0.12), transparent 55%),
    radial-gradient(circle at 90% 80%, rgba(244, 63, 94, 0.1), transparent 55%),
    radial-gradient(circle at 50% 40%, rgba(20, 184, 166, 0.08), transparent 50%);
}

@media (prefers-reduced-motion: reduce) {
  .ambient-background {
    background-image: none;
  }
}

@media (max-width: 767px) {
  .ambient-background {
    background-image: radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.1), transparent 60%);
  }
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  body {
    transition: none;
  }
}
```

**`site/lighthouserc.json`**:

```json
{
  "ci": {
    "collect": {
      "staticDistDir": "./out",
      "url": ["http://localhost/index.html", "http://localhost/fr.html"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["error", { "minScore": 0.95 }],
        "categories:seo": ["error", { "minScore": 1 }]
      }
    },
    "upload": {
      "target": "filesystem",
      "outputDir": ".lighthouseci"
    }
  }
}
```

**`site/src/components/layout/ambient-background.tsx`**:

```typescript
export function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="ambient-background pointer-events-none fixed inset-0 z-[-1] overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    />
  );
}
```

- [ ] **Step 3: Run verification**

Run: `pnpm --filter @portfolio/site typecheck`

Expected: PASS

Run: `pnpm --filter @portfolio/site lint`

Expected: PASS

Run: `pnpm --filter @portfolio/site test`

Expected: PASS — **68 passed**

Run: `pnpm content:seed`

Expected: writes `site/content/publication.json`

Run: `pnpm --filter @portfolio/site build`

Expected: PASS

Run: `pnpm lighthouse`

Expected: all assertions pass (index **0.99** / fr **0.98** performance)

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml .gitignore package.json pnpm-lock.yaml site/package.json site/app/globals.css site/lighthouserc.json site/src/components/layout/ambient-background.tsx
git commit -m "ci(site): add Lighthouse CI and performance tuning"
```

---

### Task 19: Documentation

**Files:**

- Modify: `docs/development.md` (replaced), `docs/architecture.md` (replaced), `docs/standards.md`, `README.md` (replaced)

**Interfaces:**

- Consumes: everything above. Produces no code.

- [ ] **Step 1: Replace the development guide**

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
pnpm content:seed         # site/content/publication.json from the initial content
```

Directus runs on http://localhost:8065. Sign in as the owner (`OWNER_EMAIL`, `OWNER_PASSWORD`) to work on content; the admin account (`ADMIN_*`) is for provisioning and tests.

`pnpm provision` is idempotent: run it after every change to `cms/provision`. The initial content is loaded only while no experience exists and `SEED_INITIAL_CONTENT=true`. To start again from an empty database: `docker compose down --volumes`, then the first start again.

A `.env` written before the content API lacks the `API_*` variables: copy that block from `.env.example`, replace each `change-me` value with a random one (`openssl rand -hex 32`), then run `pnpm provision`.

## Commands

| Command                                                         | Effect                                                          |
| --------------------------------------------------------------- | --------------------------------------------------------------- |
| `pnpm dev:site`                                                 | Next.js site on http://localhost:3000                           |
| `pnpm dev:api`                                                  | Content API on http://localhost:8066, reading `.env`            |
| `pnpm content:seed`                                             | Writes `site/content/publication.json` from the initial content |
| `pnpm content:pull`                                             | Writes it from `CONTENT_API_URL` (`GET /content/active`)        |
| `pnpm build:site`                                               | Static export in `site/out`; needs the publication file         |
| `pnpm lighthouse`                                               | Lighthouse CI on `site/out`, after a build                      |
| `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm format:check` | Checks run by CI                                                |
| `pnpm build:extension`                                          | Builds `cms/extensions/publication`; Directus reloads it        |
| `pnpm cms:up`, `pnpm cms:down`, `pnpm cms:logs`                 | Local stack                                                     |
| `pnpm provision`                                                | Applies the CMS configuration                                   |
| `pnpm test:cms`                                                 | Integration tests against the local stack                       |

## Accounts

| Account               | Use                                                                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Owner (`OWNER_*`)     | Edits content, prepares and publishes. `OWNER_ENFORCE_TFA=true` requires a TOTP code (production).                                       |
| Assistant (`AI_*`)    | MCP access for ChatGPT and Claude: creates, reads and updates working content, reads publications and files. Never deletes or publishes. |
| API service (`API_*`) | Static token of the content API. Reads publications, nothing else; no Studio access.                                                     |
| Admin (`ADMIN_*`)     | Provisioning and integration tests only.                                                                                                 |

## Publishing content

1. Edit the working collections (Profile to Site settings) in Directus or through MCP.
2. In Publications, run **Prepare publication**. A refusal lists every missing text or broken reference as `collection[slug].field.locale`.
3. Open the prepared publication and review its changes.
4. Run **Publish** on it. The previous active publication becomes superseded, and the API hook is called.
5. To roll back, run **Publish** on a superseded publication.

With `pnpm dev:api` running, the hook reloads the API cache and `GET /content/active` serves the new publication at once. If the hook fails (for example because the API is stopped), the publication stays active and the error says so; run **Publish** on it again, which only repeats the hook call.

## Content API

| Endpoint                                | Behavior                                                                                                                                                                                                                    |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /content/active`                   | Active publication `{ publicationId, activatedAt, content }`. `ETag: "<publicationId>"`, `Cache-Control: public, max-age=60`, `304` on a matching `If-None-Match`, `404` when nothing is active, `503` when Directus fails. |
| `GET /health`                           | `{ status, directus, publicationId }`; `200` when Directus answers, otherwise `503` with `status: "degraded"`.                                                                                                              |
| `POST /internal/publications/activated` | Publication hook. `Authorization: Bearer <PUBLICATION_HOOK_SECRET>`, body `{ "publicationId": "<uuid>" }`; `204` after the reload, `401` on a wrong secret, `400` on an invalid body.                                       |

The API keeps the active publication in memory and loads it on the first request. It reads Directus with `API_TOKEN` and listens on `API_PORT` (8066).

## Site

The site is a static export: `/` in English, `/fr` in French. The build reads `site/content/publication.json` (ignored by Git), written by `pnpm content:seed` or `pnpm content:pull`, and fails with a readable message when the file is missing or invalid. Facts come only from the publication; interface strings live in `site/src/lib/i18n/dictionary.ts`.

| Variable               | Default                          | Use                                          |
| ---------------------- | -------------------------------- | -------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | `https://nyhasinavalona.com`     | Canonical URLs, sitemap, Open Graph, JSON-LD |
| `NEXT_PUBLIC_API_URL`  | `https://api.nyhasinavalona.com` | `connect-src` of the Content Security Policy |
| `CONTENT_API_URL`      | none                             | API read by `pnpm content:pull`              |

The build also produces `/og/og-en.png`, `/og/og-fr.png`, `/documents/ny-randriantsarafara-cv-en.pdf`, `/documents/ny-randriantsarafara-cv-fr.pdf`, `sitemap.xml`, `robots.txt` and `404.html`.

The GitHub Pages deploy workflow is removed: nyhasinavalona.com keeps its last deployment until the release workflows (plan 3) replace it.

## MCP

Directus serves MCP at http://localhost:8065/mcp. Locally, a client authenticates with the assistant token (`Authorization: Bearer <AI_TOKEN>`). The assistant protocol, `cms/provision/src/assistant-protocol.md`, is the MCP system prompt. OAuth for ChatGPT and Claude is enabled in production at launch (plan 7).

## Integration tests

`pnpm test:cms` needs the stack started and provisioned with the initial content. Stop `pnpm dev:api` first: the publication tests listen on port 8066 of the host for the hook, and Directus reaches them through `host.docker.internal`. The content API test runs the API in process against Directus. The tests leave publications behind, because the owner cannot delete publications.
````

- [ ] **Step 2: Replace the architecture page**

`docs/architecture.md` (whole file):

````md
# Architecture

The repository is a pnpm workspace. The target design (conversational portfolio, chat, measurement) is in the [design spec](superpowers/specs/2026-10-13-conversational-portfolio-design.md); this page describes what exists today.

## Workspace

| Package                          | Path                          | Role                                                                                                                     |
| -------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `@portfolio/site`                | `site/`                       | Next.js site in English and French, built from the active publication and exported statically.                           |
| `@portfolio/api`                 | `api/`                        | Content API: active publication, health, publication hook.                                                               |
| `@portfolio/content`             | `packages/content/`           | Publication content schema (zod), active publication contract, validation with readable problem paths, change summaries. |
| `@portfolio/cms-schema`          | `cms/schema/`                 | Directus record types; mapping between working records and publication content.                                          |
| `@portfolio/cms-provision`       | `cms/provision/`              | Applies the Directus configuration idempotently: schema, access, settings, flows, initial content.                       |
| `directus-extension-publication` | `cms/extensions/publication/` | Prepare and activate flow operations.                                                                                    |
| `@portfolio/cms-tests`           | `cms/tests/`                  | Integration tests against Postgres and Directus in Docker.                                                               |

Workspace packages are TypeScript sources run directly by Node 24: relative imports end with `.ts`, and only erasable syntax is allowed.

## Content

Directus holds two kinds of data:

- **Working collections**, edited by the owner and by the assistant through MCP: profile, capabilities, skills, experiences, projects, key figures, answers, chat settings, site settings. Every visitor-facing text is a pair of `_en` and `_fr` fields; references between items are slug lists.
- **Publications**: snapshots of the working content. Visitors only ever see the active publication.

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

## Content API

`api/` is a Hono app on Node 24.

- `publications/directus-publication-source.ts` reads the active publication with the API service token, validates its content with `validatePublicationContent` and returns an `ActivePublication`, or `null` when nothing is active.
- `publications/active-publication-cache.ts` is the API's only state: it loads the publication on the first request, shares one read between concurrent first requests, and lets only the most recently started read replace the cached value.
- `http/app.ts` serves `GET /content/active` (ETag on the publication id, one-minute public cache), `GET /health` and the hook, which checks the bearer in constant time and reloads the cache.

## Site

The site is a static export with two root layouts, `site/app/(en)` for `/` and `site/app/(fr)/fr` for `/fr`, and `site/app/global-not-found.tsx` for `404.html`.

```
initial content --content:seed--+
                                +--> site/content/publication.json --next build--> site/out
GET /content/active --content:pull--+
```

- `site/src/lib/publication/`: reads and validates the publication file; `sections.ts` maps the publication to the typed section view models in `site/src/types/page-sections.ts`.
- `site/src/lib/i18n/`: locales, paths, file names, the interface dictionary and the French browser preference behind the discreet link to `/fr`.
- `site/src/components/page/`: root document, page shell and language suggestion; `site/src/components/sections/` renders the sections.
- `site/src/lib/seo/`: metadata with canonical and `hreflang` alternates (`x-default` on English), `ProfilePage` JSON-LD, site URL and Content Security Policy.
- `site/app/og/[file]/route.tsx` and `site/app/documents/[file]/route.tsx`: Open Graph PNGs and CV PDFs (`site/src/cv/`, React-PDF with the Geist font), exported at build time.

## Access

| Account     | Working collections  | Publications         | Other                                  |
| ----------- | -------------------- | -------------------- | -------------------------------------- |
| Owner       | All actions          | Create, read, update | Files; reads users, flows, operations  |
| Assistant   | Create, read, update | Read                 | Reads files; MCP with deletes disabled |
| API service | None                 | Read                 | None; no Studio access                 |
| Public      | None                 | None                 | None                                   |

The definitions live in `cms/provision/src/access/policies.ts`; the integration tests compare the stored permissions with them.
````

- [ ] **Step 3: Update the standards page**

In `docs/standards.md`, replace the CI paragraph under `## CI/CD Integration` with:

```md
[.github/workflows/ci.yml](../.github/workflows/ci.yml) runs typecheck, lint, format check, unit tests and the extension and site builds, Lighthouse on the exported site, then the CMS integration tests against Postgres and Directus.
```

In the `## File Structure` tree, add `├── api/                 # Content API` before the `├── site/` line.

- [ ] **Step 4: Replace the README**

`README.md` (whole file):

```md
# Ny Hasinavalona Randriantsarafara — portfolio

Source of [nyhasinavalona.com](https://nyhasinavalona.com), on its way to becoming a conversational portfolio: a chat that answers recruiters from published content and drives the page.

| Path                | Content                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `site/`             | Next.js site in English and French, built from the active publication and exported statically |
| `api/`              | Content API serving the active publication                                                    |
| `packages/content/` | Publication content schema, validation and change summaries                                   |
| `cms/`              | Directus configuration as code, publication extension, integration tests                      |
| `docs/`             | Architecture, standards, development guide, design spec and plans                             |

Start with [docs/development.md](docs/development.md). The design is in [docs/superpowers/specs/2026-10-13-conversational-portfolio-design.md](docs/superpowers/specs/2026-10-13-conversational-portfolio-design.md).
```

- [ ] **Step 5: Format and check**

Run: `pnpm exec prettier --write docs/development.md docs/architecture.md docs/standards.md README.md && pnpm format:check`

Expected: Prettier aligns the tables; `format:check` passes.

- [ ] **Step 6: Commit**

```bash
git add docs/development.md docs/architecture.md docs/standards.md README.md
git commit -m "docs: describe the content API and the bilingual site"
```
