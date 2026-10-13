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
