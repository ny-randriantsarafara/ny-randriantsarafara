# Portfolio Architecture Plan

## Overview

Set up a modern, robust folder architecture for a single-page portfolio with the following sections:

- Header (sticky navigation)
- Hero (animated lava background, stats)
- Proof (metrics cards)
- Projects (timeline case studies)
- Skills (capabilities grid)
- How I Work (philosophy)
- About (personal story)
- Contact/Footer

## Architecture Layers

### 1. Routing Layer (`/app`)

Next.js App Router for routing and layouts.

### 2. Presentation Layer (`/src/components`)

Reusable UI components organized by purpose.

### 3. Application Logic Layer (`/src/hooks`)

Custom React hooks for reusable stateful logic.

### 4. Infrastructure Layer (`/src/lib`)

Utilities, helpers, and configuration.

### 5. Type Definitions (`/src/types`)

Shared TypeScript interfaces.

### 6. Constants (`/src/constants`)

Static data (navigation, skills, projects).

### 7. Static Assets (`/public`)

Images, documents, icons.

---

## Folder Structure to Create

```
ny-randriantsarafara/
├── app/
│   ├── (site)/
│   │   └── page.tsx          # Keep - main homepage
│   ├── globals.css           # Keep - single source
│   ├── layout.tsx            # Keep - root layout
│   └── favicon.ico           # Keep
├── src/
│   ├── components/
│   │   ├── ui/               # Primitives (Button, Card, Badge, etc.)
│   │   ├── layout/           # Header, Footer, Container, Section
│   │   └── sections/         # Hero, Proof, Projects, Skills, About, Contact
│   ├── hooks/                # useScrollPosition, useIntersectionObserver, etc.
│   ├── lib/
│   │   ├── api/              # CMS/API fetchers
│   │   ├── utils/            # cn(), formatDate(), etc.
│   │   └── config/           # Site metadata
│   ├── types/                # Project, Skill, NavItem interfaces (match API schema)
│   └── constants/            # Fallback data if API unavailable
└── public/
    ├── images/
    │   ├── profile/          # Your photos
    │   ├── projects/         # Project screenshots
    │   ├── logos/            # Company logos
    │   └── icons/            # SVG icons
    └── documents/            # Resume PDF
```

---

## Implementation Steps

### Step 1: Create `/src` directories

```bash
mkdir -p src/components/ui
mkdir -p src/components/layout
mkdir -p src/components/sections
mkdir -p src/hooks
mkdir -p src/lib/api
mkdir -p src/lib/utils
mkdir -p src/lib/config
mkdir -p src/types
mkdir -p src/constants
```

### Step 2: Create `/public` subdirectories

```bash
mkdir -p public/images/profile
mkdir -p public/images/projects
mkdir -p public/images/logos
mkdir -p public/images/icons
mkdir -p public/documents
```

### Step 3: Reorganize existing files

**Delete duplicates:**

- Delete `/app/styles/` folder (duplicate globals.css)
- Delete `/app/page.tsx` (keep `/(site)/page.tsx` as homepage)

**Move SVG icons:**

- Move `public/*.svg` files to `public/images/icons/`

### Step 4: Update `tsconfig.json` path aliases

The existing `@/*` alias already covers everything. No changes needed since:

- `@/src/components` will work with the current `"@/*": ["./*"]` config
- All imports like `@/src/components/ui/button` will resolve correctly

**Optional enhancement** (cleaner imports without `/src/`):

```json
"paths": {
  "@/*": ["./*"],
  "@/components/*": ["./src/components/*"],
  "@/hooks/*": ["./src/hooks/*"],
  "@/lib/*": ["./src/lib/*"],
  "@/types/*": ["./src/types/*"],
  "@/constants/*": ["./src/constants/*"]
}
```

This allows `@/components/ui/button` instead of `@/src/components/ui/button`.

---

## Layer Details

### `/src/components/ui/` - UI Primitives

For atomic, reusable components:

- `button/` - Button component
- `card/` - Card container
- `badge/` - Skill badges
- `link/` - Styled links
- `typography/` - Text components (Heading, Text)

### `/src/components/layout/` - Layout Components

For structural components:

- `header/` - Sticky navigation with logo, links, CTA
- `footer/` - Copyright, links
- `container/` - Max-width wrapper
- `section/` - Section wrapper with consistent spacing

### `/src/components/sections/` - Page Sections

For the main portfolio sections:

- `hero/` - Hero with lava animation, headline, stats
- `proof/` - Metrics cards (8+ years, 2M/day, 82%)
- `projects/` - Timeline case studies
- `skills/` - Capabilities grid (Cloud, Backend, Frontend, Quality)
- `how-i-work/` - Philosophy principles
- `about/` - Personal story, sidebar details
- `contact/` - CTAs, social links

### `/src/hooks/` - Custom Hooks

- `use-scroll-spy.ts` - Track active section for navigation
- `use-intersection-observer.ts` - Animate on scroll
- `use-media-query.ts` - Responsive behavior

### `/src/lib/api/` - CMS/API Integration

For fetching portfolio data from your CMS:

- `client.ts` - API client setup (fetch wrapper, error handling)
- `portfolio.ts` - Portfolio data fetcher (getHero, getProjects, getSkills, etc.)
- `types.ts` - API response types (optional, can use /src/types/)

**Example usage in page.tsx:**

```tsx
// app/(site)/page.tsx
import { getPortfolioData } from '@/lib/api/portfolio';

export default async function HomePage() {
  const data = await getPortfolioData();
  return (
    <>
      <Hero {...data.hero} />
      <Projects projects={data.projects} />
    </>
  );
}
```

### `/src/lib/utils/` - Utilities

- `cn.ts` - Class name merger (clsx + tailwind-merge)

### `/src/lib/config/` - Configuration

- `site.ts` - Site metadata, SEO defaults

### `/src/types/` - TypeScript Types

- `project.ts` - Project interface
- `skill.ts` - Skill interface
- `navigation.ts` - NavItem interface

### `/src/constants/` - Fallback/Static Data

Used when API is unavailable or for data that doesn't change:

- `navigation.ts` - Nav links array (usually static)
- `defaults.ts` - Fallback content if CMS fails
- `social.ts` - Social links (if not from CMS)

---

## Files to Modify

| File                     | Action                         |
| ------------------------ | ------------------------------ |
| `app/styles/globals.css` | Delete (duplicate)             |
| `app/page.tsx`           | Delete (use (site)/page.tsx)   |
| `public/*.svg`           | Move to `public/images/icons/` |
| `tsconfig.json`          | Add path aliases               |

---

## CMS/API Integration Pattern

**Data Flow:**

```
CMS/API → src/lib/api/ → app/(site)/page.tsx → Section components (via props)
```

**Key Principles:**

1. **Types define the contract** - `src/types/` interfaces match your API response shape
2. **API layer abstracts the source** - Components don't know if data comes from CMS, REST API, or GraphQL
3. **Server-side fetching** - Next.js App Router fetches data on the server in `page.tsx`
4. **Components are pure** - Sections receive data as props, no direct API calls
5. **Fallbacks in constants** - Default data if API fails

**Supported CMS options:**

- Headless CMS (Contentful, Sanity, Strapi, Payload)
- Custom REST API
- GraphQL endpoint
- Even a simple JSON file to start

---

## Verification

After implementation:

1. Run `npm run dev` to ensure the app still works
2. Verify folder structure matches the plan
3. Check that `tsconfig.json` paths resolve correctly
4. Confirm no duplicate files remain
