# Ny Randriantsarafara Portfolio

Personal portfolio site for Ny Hasinavalona Randriantsarafara, built with Next.js App Router.
The site renders a single-page experience for professional positioning, case studies, skills,
and contact details, with content sourced from a static JSON file.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Vitest and Testing Library
- ESLint and Prettier

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000` to view the site.

## Common Commands

| Command                | Purpose                                      |
| ---------------------- | -------------------------------------------- |
| `npm run dev`          | Start the local Next.js development server   |
| `npm run build`        | Create a production build                    |
| `npm run start`        | Serve the production build locally           |
| `npm run lint`         | Run ESLint with warnings treated as failures |
| `npm run typecheck`    | Run TypeScript without emitting files        |
| `npm run format:check` | Check formatting with Prettier               |
| `npm run validate`     | Run typecheck, lint, and format checks       |
| `npm run test:run`     | Run the Vitest suite once                    |

## How Content Works

Portfolio content lives in [`public/data/content.json`](public/data/content.json).
The current setup uses a static content provider:

- [`src/lib/content/providers/static.ts`](src/lib/content/providers/static.ts) reads the JSON file
  from disk.
- [`src/lib/content/service.ts`](src/lib/content/service.ts) exposes the content service used by
  the app.
- [`app/(site)/page.tsx`](<app/(site)/page.tsx>) loads the content, extracts each section, and
  renders the homepage.

To update the visible portfolio content, start with `public/data/content.json`.

## Project Structure

```text
app/
  (site)/page.tsx            Homepage composition and section rendering
  layout.tsx                 Global metadata and font setup
  globals.css                Global styles
src/
  components/
    layout/                  Header and layout primitives
    sections/                Hero, proof, projects, skills, about, contact sections
    ui/                      Reusable UI building blocks
  hooks/                     Client-side interaction hooks
  lib/
    content/                 Content provider, helpers, and extraction utilities
    seo.ts                   Metadata and structured data helpers
    utils/                   Shared utility helpers
  tests/                     Shared test setup
public/
  data/content.json          Portfolio copy and section data
  images/                    Static assets and icons
docs/
  architecture.md            Architecture notes for the site structure
  standards.md               Linting, formatting, and tooling standards
```

## Quality Checks

Before shipping changes, run:

```bash
npm run validate
npm run test:run
```

For a production sanity check, also run:

```bash
npm run build
```

## Testing

The repository uses Vitest with Testing Library. Test files live alongside the source in
`__tests__` directories, for example:

- `src/lib/__tests__/seo.test.ts`
- `src/lib/content/__tests__/service.test.ts`
- `src/components/ui/__tests__/button.test.tsx`

## Additional Documentation

- [`docs/architecture.md`](docs/architecture.md) for the site architecture plan
- [`docs/standards.md`](docs/standards.md) for linting, formatting, and editor standards
