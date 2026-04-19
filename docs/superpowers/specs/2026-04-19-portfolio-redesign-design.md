# Portfolio Redesign — Design Spec

**Date:** 2026-04-19
**Status:** Ready for implementation plan
**Source design:** `~/Downloads/portfolio-redesign` (Figma export, Vite + React 18)
**Source resume:** `~/Downloads/Resume - With Administrative Status.pdf`

## Goal

Replace the current light-only, text-forward portfolio with a glass-morphism, dual-theme visual identity adapted from the Figma export, while:

- Preserving the existing strict architecture (Next.js 16 App Router, server-rendered page, content service abstraction, typed sections)
- Surfacing the updated resume (new title, EU Blue Card, 6-role timeline, R&D initiatives)
- Keeping the static export build (`output: 'export'`) intact for the existing GitHub Pages deployment

This is an integration, not a port. We adopt the visual language of the new design but reject its scaffolding (Vite, Radix, MUI, ShadCN, dnd, recharts, fake "Alex Morgan" content). The repo's coding standards (no `any`, no comments, named exports, strict ESLint, Vitest tests) remain non-negotiable.

## Information architecture

Final page structure, top to bottom:

| #   | Section           | Source                                                                                                         | Notes                                                                   |
| --- | ----------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | Hero              | Current `hero` content (title aligned to resume) + new visual                                                  | 3 floating glass cards (snapshot stats), gradient italic phrase         |
| 2   | About             | Current `about` paragraphs + folded `how-i-work` philosophy + Skills as 4 capability tiles + "Core Stack" tile | Bento layout, replaces standalone Skills + HowIWork                     |
| 3   | Projects          | Current 3 case studies                                                                                         | Alternating glass cards, **text-only** (no images, no stock photos)     |
| 4   | Experience        | **NEW** — sourced from resume                                                                                  | Vertical timeline, 6 roles + collapsed "Earlier" line                   |
| 5   | Initiatives       | **NEW** — sourced from resume R&D block                                                                        | Bento of 3 items: Visa Insight, Lalana/Lemurion, Cloud Platform/Maestro |
| 6   | Contact           | Current `contact` links + admin status + languages                                                             | Glass panel, **no contact form** (no backend)                           |
| –   | Floating Navbar   | New (template)                                                                                                 | Bottom-fixed, scroll-spy, theme toggle                                  |
| –   | Footer            | New (template)                                                                                                 | Copyright, back-to-top, location                                        |
| –   | AmbientBackground | New (template)                                                                                                 | 3 animated gradient blobs, fixed, `pointer-events:none`, `z-[-1]`       |

**Dropped from current page:**

- Standalone `Proof` section (metrics fold into Hero snapshot stats and Experience timeline — stronger evidence in context)
- Standalone `HowIWork` section (philosophy folds into About paragraphs + a single accent line)
- Standalone `Skills` section (becomes 4 capability tiles inside About)
- Sticky top header (replaced by floating bottom navbar)

**Identity update from resume:**

- Title: `Senior Backend & Cloud Engineer | Software Architect` (was: "Senior Software Engineer")
- Location: `Pontault-Combault, France` (was: "Paris")
- Phone: `+33 6 13 20 59 00`
- Admin status: `EU Blue Card Holder (Passeport Talent)` — surfaced in Hero badge or Contact panel
- Languages: Malagasy / French (Fluent) / English (Professional)
- Education: Master's in CS, Centre de télé-enseignement National de Madagascar (2017–2019)

## Visual language

### Theme

Dual theme via CSS variables on `[data-theme="light"]` and `[data-theme="dark"]`. Default is **light** (per user preference). Toggle lives in the floating navbar.

```
[data-theme="light"]  (DEFAULT)
  --bg-base: #f5f5f7
  --text-primary: #18181b
  --text-secondary: #3f3f46
  --text-muted: #71717a
  --text-dimmed: #a1a1aa
  --glass-bg: rgba(255,255,255,0.55)
  --glass-bg-hover/subtle/card/strong: 0.7 / 0.4 / 0.5 / 0.7
  --glass-border: rgba(0,0,0,0.06)
  --glass-border-strong: rgba(0,0,0,0.1)
  --glass-shadow: 0 8px 32px 0 rgba(0,0,0,0.06)
  --input-bg/border/placeholder
  --btn-primary-bg: #18181b → text #ffffff, shadow rgba(0,0,0,0.15)
  --tag-bg/border/text
  --footer-bg/border, --selection-bg, --overlay-bg, --vignette
  Accent gradients (used in italic text, icon highlights):
    indigo-500 → purple-500 → rose-500
    teal-500   → indigo-500
    rose-500   → indigo-500

[data-theme="dark"]
  --bg-base: #09090b
  --text-primary: #f4f4f5
  Same token names, dark values from template (rgba(255,255,255,0.0X) glass)
  Gradient tints: indigo-300 / teal-300 / rose-300 (lighter for legibility)
```

The current `--color-paper / --color-ink / --color-accent / --color-sand` tokens are **removed** entirely. They have no consumers outside the few files we're rewriting.

### Typography

- Font: keep `Geist Sans` (already loaded via `next/font` in `app/layout.tsx`); drop `Geist_Mono` (unused)
- Hero headline: `text-5xl sm:text-7xl lg:text-[6rem]`, `font-semibold`, `tracking-tight`, `leading-[1.1]`
- Section H2s: `text-4xl md:text-6xl`, `font-medium`, `tracking-tight`
- Body: `font-light`, `text-lg`, `leading-relaxed`
- Italic gradient phrase as visual hook, used **sparingly** (≤4 spots): Hero "built to last", About "design and engineering", Projects "Projects", Contact "together"

### Glass + ambient background

Single utility class in `globals.css`:

```css
.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}
```

`<AmbientBackground />`: three large blurred radial blobs (indigo / rose / teal), each animated with `motion` (20–25s loop, `easeInOut`, x/y/scale keyframes), plus a 3% SVG noise overlay. Fixed, `inset-0`, `pointer-events:none`, `z-[-1]`. Wrapped in `<RevealProvider>` style root that respects `prefers-reduced-motion`.

### Iconography

`lucide-react`, stroke-1.5, sized 16–24px. Engineer-appropriate icons (replacing the template's design-leaning ones):

- Navbar: `Home`, `User`, `Layers`, `Briefcase`, `Mail`, `Sun`, `Moon`
- Hero: `Sparkles`, `Download`, `ArrowUpRight`
- About capability tiles: `Cloud`, `Server`, `Database`, `ShieldCheck` (was MonitorSmartphone/Palette/Layers/Workflow)
- Initiatives: `BrainCircuit`, `Map`, `Workflow`
- Contact: `Mail`, `MapPin`, `Languages`, `Globe`

### Motion

Library: `motion` (formerly framer-motion).

Patterns:

- Section entrance: `whileInView` with `viewport={{ once: true, margin: "-100px" }}`, `duration: 1`, `ease: [0.16, 1, 0.3, 1]`
- Hero entrance: opacity + y-30 → 0, staggered 100ms
- Hero floating cards: spring entry + parallax via `useScroll` + `useTransform`
- Navbar active pill: shared `layoutId="active-pill"`
- Theme toggle: `AnimatePresence` rotate + scale crossfade Sun/Moon
- All entrance animations must remain readable when JS is disabled: components render in their final state with no transform if motion isn't initialized (no `opacity:0` baked into static HTML).

`prefers-reduced-motion`:

- AmbientBackground stops animating (static blobs remain)
- Section entrances become instant
- Theme toggle and hover micro-interactions remain (functional, not decorative)

### Dependencies

Added (production):

- `motion` — entrance, parallax, layout animations
- `lucide-react` — icons
- `next-themes` — SSR-safe theme provider, no FOUC

**Not added** (template ships them, we reject them): all `@radix-ui/*`, `@mui/*`, `@emotion/*`, `react-router`, `react-dnd*`, `react-slick`, `recharts`, `react-popper`, `@popperjs/core`, `cmdk`, `vaul`, `sonner`, `embla-carousel-react`, `react-hook-form`, `react-day-picker`, `input-otp`, `react-resizable-panels`, `react-responsive-masonry`, `tw-animate-css`, `class-variance-authority`, `canvas-confetti`, `next-themes` peer deps' extras. We don't need any of them.

Removed (no longer used):

- (none — current dep set is minimal; we keep `clsx`, `tailwind-merge`, etc.)

## Component architecture

The layered architecture from `docs/architecture.md` is preserved. Mapping:

```
app/
├─ layout.tsx                           [modified]   wrap children in <ThemeProvider>
├─ globals.css                          [rewritten]  new tokens, glass-panel, theme vars
├─ (site)/page.tsx                      [modified]   new section order, drops Proof/HowIWork/Skills
└─ favicon.png / icon.png               [unchanged]

src/
├─ components/
│  ├─ providers/                        [NEW]
│  │  ├─ theme-provider.tsx             [NEW]   wraps next-themes, defaultTheme="light"
│  │  └─ index.ts
│  ├─ layout/
│  │  ├─ ambient-background.tsx         [NEW]   client, motion blobs + noise overlay
│  │  ├─ navbar.tsx                     [NEW]   client, floating bottom, scroll-spy, theme toggle
│  │  ├─ footer.tsx                     [NEW]   server, copyright + back-to-top + location
│  │  ├─ section.tsx                    [modified]  drops `variant` entirely; just `id` + scroll-margin + max-width wrapper. Backgrounds are owned by sections themselves (glass over ambient bg).
│  │  ├─ header.tsx                     [DELETED]   replaced by navbar
│  │  └─ index.ts                       [updated]
│  ├─ sections/
│  │  ├─ hero.tsx                       [rewritten]  glass cards, gradient italic, motion
│  │  ├─ about.tsx                      [rewritten]  bento + 4 capability tiles + core stack
│  │  ├─ projects.tsx                   [rewritten]  alternating glass cards, text-only
│  │  ├─ experience.tsx                 [NEW]        vertical timeline, sticky left column
│  │  ├─ initiatives.tsx                [NEW]        bento of 3 R&D items
│  │  ├─ contact.tsx                    [rewritten]  glass panel, no form
│  │  ├─ proof.tsx                      [DELETED]
│  │  ├─ how-i-work.tsx                 [DELETED]
│  │  ├─ skills.tsx                     [DELETED]    content moves into about.tsx
│  │  └─ index.ts                       [updated]
│  ├─ ui/
│  │  ├─ button.tsx                     [extended]   add `variant: "glass"` + icon slot
│  │  ├─ badge.tsx                      [extended]   add gradient-tinted variants
│  │  ├─ card.tsx                       [extended]   add `glass` prop
│  │  └─ index.ts
│  └─ reveal-provider.tsx               [DELETED]    motion's whileInView replaces it
├─ hooks/
│  ├─ use-reveal.ts                     [DELETED]    replaced by motion's whileInView
│  ├─ use-scroll-spy.ts                 [NEW]        navbar active section
│  └─ index.ts                          [updated]
├─ lib/
│  ├─ content/
│  │  ├─ types.ts                       [unchanged]
│  │  ├─ service.ts                     [unchanged]
│  │  ├─ helpers.ts                     [updated]    add extractExperienceSection, extractInitiativesSection; remove proof/howIWork/skills extractors
│  │  ├─ providers/static.ts            [unchanged]
│  │  └─ index.ts                       [updated]
│  └─ utils/cn.ts                       [unchanged]
├─ types/
│  ├─ sections/
│  │  ├─ hero.ts                        [updated]    snapshot stats reduced to 3, add `availabilityNote` for "EU Blue Card"
│  │  ├─ about.ts                       [updated]    add `coreStack: string[]`, `features: { title, description, icon }[]`, `journey: { title, paragraphs }`, `stat: { value, label }`
│  │  ├─ projects.ts                    [updated]    add `year`, `role` per project
│  │  ├─ experience.ts                  [NEW]        ExperienceSection { items: { company, role, period, location, bullets, tech }[] }
│  │  ├─ initiatives.ts                 [NEW]        InitiativesSection { items: { title, subtitle, description, tags, icon }[] }
│  │  ├─ contact.ts                     [updated]    add `email`, `location`, `languages`, `adminStatus`
│  │  ├─ proof.ts                       [DELETED]
│  │  ├─ how-i-work.ts                  [DELETED]
│  │  ├─ skills.ts                      [DELETED]
│  │  └─ index.ts                       [updated]
│  ├─ common.ts                         [unchanged]
│  └─ content.ts                        [updated]    Section discriminated union add experience/initiatives, drop proof/howIWork/skills

public/
├─ data/content.json                    [rewritten]  new schema, all data from current + resume
├─ documents/resume.pdf                 [NEW]        copy of "Resume - With Administrative Status.pdf"
└─ images/                              [unchanged]  (no new images required)
```

### Server vs client boundaries

- `app/(site)/page.tsx` stays a **Server Component** (calls `contentService` at build time, generates JSON-LD)
- `app/layout.tsx` stays Server, but children wrapped in `<ThemeProvider>` (client) at the top of the body
- Client components: `<ThemeProvider>`, `<AmbientBackground>`, `<Navbar>` (scroll-spy + toggle), each section component (all use `motion` for `whileInView`), `<Footer>` (uses motion for the back-to-top arrow)
- Page receives data as props (current pattern preserved)

### Content schema (`public/data/content.json`)

The discriminated-union `Section` pattern is preserved. New shape:

```jsonc
{
  "metadata": {
    "title": "Ny Hasinavalona Randriantsarafara — Senior Backend & Cloud Engineer | Software Architect",
    "description": "Senior Backend & Cloud Engineer focused on system reliability, clean architecture, and design-then-implement. AWS, TypeScript, Terraform.",
    "themeColor": "#f5f5f7",
  },
  "sections": [
    {
      "type": "hero",
      "id": "hero",
      "data": {
        "tagline": "Pontault-Combault, France · AWS · Terraform · TypeScript",
        "availabilityBadge": "EU Blue Card · Available for new roles",
        "headlinePrefix": "Crafting cloud systems",
        "headlineHighlight": "built to last",
        "headlineSuffix": "not to impress.",
        "subheadline": "Senior Backend & Cloud Engineer. Design-then-implement, deterministic rules, calm operations. From Madagascar roots to global-scale systems used by millions.",
        "primaryCta": { "label": "Explore work", "href": "#projects" },
        "secondaryCta": { "label": "Resume", "href": "/documents/resume.pdf" },
        "email": "nyhasinavalonar@gmail.com",
        "snapshot": {
          "role": "Senior Backend & Cloud Engineer",
          "location": "Pontault-Combault, FR",
          "stats": [
            { "value": "8+", "label": "Years experience" },
            { "value": "~2M", "label": "Daily users served" },
            { "value": "82%", "label": "Coverage achieved" },
          ],
          "stack": ["TypeScript", "AWS", "Terraform"],
        },
      },
    },
    {
      "type": "about",
      "id": "about",
      "data": {
        "eyebrow": "About",
        "headlinePrefix": "Bridging",
        "headlineHighlight": "reliability and clarity",
        "headlineSuffix": "in cloud systems.",
        "journey": {
          "title": "My journey",
          "paragraphs": [
            "I'm a Senior Backend & Cloud Engineer based near Paris, with 8+ years building production systems used by millions.",
            "My approach is design-then-implement: write the spec, favor simple deterministic rules, then build. I started in Madagascar where reliability wasn't optional and learning fast was a necessity — that foundation shaped how I work today.",
            "I now lead infrastructure modernization and high-traffic API work in international teams. When I commit to a project, I treat it as my own.",
          ],
        },
        "stat": { "value": "8+", "label": "Years building production systems" },
        "coreStack": {
          "title": "Core stack",
          "items": ["TypeScript", "Node.js", "AWS", "Terraform", "PostgreSQL", "GraphQL"],
        },
        "features": [
          {
            "icon": "cloud",
            "title": "Cloud & Infrastructure",
            "description": "AWS (Lambda, API Gateway, DynamoDB, SQS, SNS, EC2). Terraform-first. Serverless and event-driven architectures.",
          },
          {
            "icon": "server",
            "title": "Backend & APIs",
            "description": "Node.js, TypeScript, GraphQL, REST. High-traffic API design, integrations, performance optimization.",
          },
          {
            "icon": "database",
            "title": "Data & Observability",
            "description": "PostgreSQL, OpenSearch, Redis. Prometheus / Grafana. ETL pipelines and zero-downtime migrations.",
          },
          {
            "icon": "shield-check",
            "title": "Quality & Delivery",
            "description": "TDD, CI/CD automation, legacy refactoring, technical leadership and mentoring.",
          },
        ],
      },
    },
    {
      "type": "projects",
      "id": "projects",
      "data": {
        "eyebrow": "Featured work",
        "headlinePrefix": "Selected",
        "headlineHighlight": "case studies",
        "items": [
          {
            "title": "Eurosport / HBO Max API platform",
            "role": "Software Engineer",
            "year": "2024—Present",
            "company": "Warner Bros. Discovery",
            "description": "Extended core GraphQL content API for Olympics + HBO Max launches. Migrated infra from Serverless framework to Terraform. Engineered zero-downtime DynamoDB → PostgreSQL data migration with dual-run safety.",
            "tech": ["TypeScript", "GraphQL", "AWS", "Terraform", "PostgreSQL", "DynamoDB"],
          },
          {
            "title": "High-traffic media platform",
            "role": "Software Engineer",
            "year": "2023—2024",
            "company": "Euronews",
            "description": "Maintained backend APIs and AWS EC2 infra serving ~2M daily active users. Led a quality initiative raising platform test coverage from 5% to 65%, and TypeScript-specific coverage from 20% to 55%.",
            "tech": ["TypeScript", "AWS", "EC2", "Node.js"],
          },
          {
            "title": "SaaS for craftsmen",
            "role": "Lead Developer",
            "year": "2022—2023",
            "company": "Numer · HEI",
            "description": "Directed a web + mobile platform from concept to production. Coordinated mobile, back-office, and landing teams. Shaped core architectural decisions.",
            "tech": ["React", "TypeScript", "Cloud infrastructure"],
          },
        ],
        "footnote": "Detailed case studies available on request.",
      },
    },
    {
      "type": "experience",
      "id": "experience",
      "data": {
        "eyebrow": "Career path",
        "headlinePrefix": "Professional",
        "headlineHighlight": "experience",
        "description": "8+ years across global media, scale-ups, and Madagascar-based teams. Design-then-implement, end-to-end ownership.",
        "items": [
          {
            "company": "Warner Bros. Discovery (Eurosport)",
            "role": "Software Engineer",
            "period": "Mar 2024 — Present",
            "location": "Issy-les-Moulineaux, FR",
            "bullets": [
              "Migrated backend services from Serverless framework to Terraform.",
              "Extended core GraphQL content API for Eurosport (Olympics, HBO Max launches).",
              "Engineered zero-downtime DynamoDB → PostgreSQL data migration.",
              "Introduced caching strategies and SQS/SNS stabilization for high-visibility events.",
            ],
            "tech": ["TypeScript", "GraphQL", "AWS", "Terraform", "PostgreSQL"],
          },
          {
            "company": "Euronews",
            "role": "Software Engineer",
            "period": "Mar 2023 — Mar 2024",
            "location": "Lyon, FR",
            "bullets": [
              "Maintained backend APIs / EC2 infra for ~2M daily active users.",
              "Led test coverage from 5% → 65% (TypeScript: 20% → 55%).",
              "Migrated critical legacy components from JavaScript to strict TypeScript.",
            ],
            "tech": ["TypeScript", "AWS", "Node.js"],
          },
          {
            "company": "Numer · HEI",
            "role": "Lead Developer",
            "period": "Jan 2022 — Mar 2023",
            "location": "Paris, FR",
            "bullets": [
              "Directed web + mobile platform for craftsmen, concept → production.",
              "Coordinated mobile, back-office, landing teams; shaped core architecture.",
            ],
            "tech": ["React", "TypeScript", "Cloud infra"],
          },
          {
            "company": "Novity",
            "role": "Software Developer",
            "period": "Sep 2021 — Mar 2023",
            "location": "Antananarivo, MG",
            "bullets": [
              "Boosted React/TypeScript frontend coverage 50% → 70%, Java/Spring 20% → 39%.",
              "Mentored three technical teams; transitioned monolith → API-driven.",
            ],
            "tech": ["React", "TypeScript", "Java", "Spring"],
          },
          {
            "company": "Bocasay",
            "role": "Software Engineer",
            "period": "Feb 2020 — Aug 2021",
            "location": "Antananarivo, MG",
            "bullets": [
              "Refactored legacy monolith → SPA: +40% speed, −30% load times.",
              "Streamlined CI/CD: −25% time-to-market.",
            ],
            "tech": ["JavaScript", "CI/CD"],
          },
          {
            "company": "ITRAS Group",
            "role": "Software Engineer",
            "period": "Oct 2018 — Feb 2020",
            "location": "Antananarivo, MG",
            "bullets": [
              "Migrated frontend → Angular/TypeScript, backend → Spring Boot. −40% load.",
              "Drove code coverage 0% → 82%.",
            ],
            "tech": ["Angular", "TypeScript", "Spring Boot"],
          },
        ],
        "earlierLine": "Earlier: Software Developer at Allo Application (Jan 2017 — Sep 2018) — reduced API response times by 30%.",
      },
    },
    {
      "type": "initiatives",
      "id": "initiatives",
      "data": {
        "eyebrow": "R&D & engineering initiatives",
        "headlinePrefix": "Side",
        "headlineHighlight": "investments",
        "description": "Personal R&D in NLP/AI, geospatial systems, and cloud orchestration.",
        "items": [
          {
            "icon": "brain-circuit",
            "title": "Visa Insight",
            "subtitle": "NLP & AI-assisted case review",
            "description": "End-to-end case review platform with a rules-first multilingual extraction pipeline (French/Malagasy). Evidence-linked workspace lets analysts validate machine outputs against raw texts. Self-hosted VPS with fully automated CI/CD.",
            "tags": ["NLP", "Multilingual", "CI/CD", "VPS"],
          },
          {
            "icon": "map",
            "title": "Lalana & Lemurion",
            "subtitle": "Geospatial & transit systems",
            "description": "Geospatial nav stack from scratch: OSM ingestion pipeline, routing backend with Redis caching. Full-stack transit planning platform with editable network graph, distributed tracing, k6 load testing.",
            "tags": ["OSM", "Routing", "Redis", "k6"],
          },
          {
            "icon": "workflow",
            "title": "Cloud Platform · Maestro",
            "subtitle": "Personal cloud + Elixir orchestrator",
            "description": "Personal cloud platform: Caddy ingress, PostgreSQL, Redis, Prometheus/Grafana observability. Authored \"Maestro\", an Elixir-based orchestrator using state machines and supervision trees to automate ticket-to-PR workflows.",
            "tags": ["Elixir", "PostgreSQL", "Caddy", "Prometheus"],
          },
        ],
      },
    },
    {
      "type": "contact",
      "id": "contact",
      "data": {
        "eyebrow": "Next steps",
        "headlinePrefix": "Let's work",
        "headlineHighlight": "together",
        "description": "Open to senior backend / cloud / architect roles in the EU. EU Blue Card holder — simplified mobility.",
        "channels": [
          {
            "kind": "email",
            "label": "nyhasinavalonar@gmail.com",
            "href": "mailto:nyhasinavalonar@gmail.com",
          },
          {
            "kind": "linkedin",
            "label": "linkedin.com/in/ny-randriantsarafara",
            "href": "https://www.linkedin.com/in/ny-randriantsarafara/",
          },
          {
            "kind": "github",
            "label": "github.com/ny-randriantsarafara",
            "href": "https://github.com/ny-randriantsarafara",
          },
        ],
        "details": [
          { "label": "Location", "value": "Pontault-Combault, France" },
          { "label": "Languages", "value": "Malagasy · French (Fluent) · English (Professional)" },
          { "label": "Status", "value": "EU Blue Card · Passeport Talent" },
        ],
        "footer": {
          "copyright": "Ny Hasinavalona Randriantsarafara",
          "tagline": "Built with care.",
        },
      },
    },
  ],
}
```

The schema uses the same discriminated-union `type` discriminant. Section helpers (`extractXxxSection`) follow the existing naming. Old types (`ProofSection`, `HowIWorkSection`, `SkillsSection`) are deleted; their consumers (page, sections, tests) are updated in the same change.

### Icon mapping

`features[].icon` and `initiatives[].icon` are stored as **string keys** in JSON (e.g. `"cloud"`, `"server"`). A small typed registry in `src/lib/icons.ts` maps them to lucide components. This keeps `content.json` JSON-pure (no React imports), preserves the strict typing (registry is `Record<KnownIcon, LucideIcon>`), and keeps icons easy to swap without touching components.

```ts
// src/lib/icons.ts
import { BrainCircuit, Cloud, Database, Map, Server, ShieldCheck, Workflow } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type IconName =
  | 'cloud'
  | 'server'
  | 'database'
  | 'shield-check'
  | 'brain-circuit'
  | 'map'
  | 'workflow';

export const iconRegistry: Record<IconName, LucideIcon> = {
  cloud: Cloud,
  server: Server,
  database: Database,
  'shield-check': ShieldCheck,
  'brain-circuit': BrainCircuit,
  map: Map,
  workflow: Workflow,
};
```

## Behavior

### Theme

- `next-themes` `<ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem={false} disableTransitionOnChange>`
- Toggle in navbar swaps `data-theme` on `<html>`. Persisted in `localStorage`.
- No FOUC: `next-themes` injects a synchronous script in `<head>` before paint.

### Navbar

- Fixed at `bottom-6`, centered, `z-50`
- Sections: Home / About / Work (Projects) / Experience / Contact
- Active section detected by `useScrollSpy` (IntersectionObserver-based, picks the section whose top is closest to viewport center)
- Active item shows pill background via shared `layoutId` (motion)
- Hover label tooltip above icon (desktop only, `sm:` breakpoint)
- Theme toggle on the right with Sun/Moon crossfade
- Skip-link from current page is preserved (kept `<a href="#main">` at the top of `page.tsx`)

### Hero

- Two-column on `md:`, stacked on mobile
- Left: availability badge (with EU Blue Card mention), headline (gradient italic on the highlighted phrase), subheadline, two CTAs (`Explore work` → `#projects`, `Resume` → `/documents/resume.pdf` opens in new tab with `download` hint)
- Right: 3 floating glass cards
  - Main card (rotated to upright): role + location + emoji
  - Top-left card: years experience stat with gradient number
  - Bottom-right card: stack tags
- Parallax via `useScroll` + `useTransform` (different `y` ranges per card)
- Floating cards are `hidden md:block` (cramped on mobile; the snapshot stats are already implied by the headline). On mobile only the text column renders, with the resume CTA acting as the visual anchor.

### About

- Full-width eyebrow + headline (gradient italic)
- Bento grid:
  - Left wide tall card: "My journey" with 3 paragraphs
  - Top-right small card: "8+" stat with gradient
  - Bottom-right card: "Core stack" with stack chips
- Below the bento: 4 capability tiles (Cloud / Backend / Data / Quality), single row on `lg:`, 2×2 on `md:`, stacked on mobile
- Hover on tiles: subtle `y: -5` lift via motion

### Projects

- 3 alternating cards (no images): each card spans full width, glass panel, large project title (gradient italic on hover), year + role + company chip on top, description, tech tags, GitHub/External buttons hidden if no links
- Footnote at the bottom: "Detailed case studies available on request."

### Experience

- Two-column on `lg:`: sticky-left intro (eyebrow + headline + description), right is the timeline
- Timeline = stacked glass cards, one per role
- Each card: company (large), period chip (top right), role (italic with rose accent), bullets (markdown-light), tech tags
- Bottom: `earlierLine` rendered as a single small muted line (no card), italic, centered under the timeline

### Initiatives

- Eyebrow + headline + description, then a 3-column bento on `md:` (stacked on mobile)
- Each card: icon (top-left), title, subtitle (italic), description, tag chips

### Contact

- Centered eyebrow + huge gradient italic headline
- Below: glass panel with two columns
  - Left: 3 channel rows (icon + label/href). No form.
  - Right: details list (Location, Languages, Status)
- Bottom: handled by `<Footer>`

### Footer

- Copyright + back-to-top + location (current footer copy carried over)

### Static export compatibility

- All routes remain server-rendered at build (`output: 'export'`)
- Client components are hydrated on the static HTML (motion + theme toggle)
- No runtime APIs needed; resume PDF is a static asset

## Testing strategy

The repo uses **Vitest + Testing Library + jsdom**. The current rule (`unit/E2E tests when applicable`) applies.

### Tests to keep / update

- `src/components/ui/__tests__/{button,card,badge}.test.tsx` — update for new variants (`glass` card, gradient badge)
- `src/components/layout/__tests__/section.test.tsx` — update for the simplified `<Section>`
- `src/lib/__tests__/seo.test.ts` — unchanged
- `src/lib/content/__tests__/{helpers,service}.test.ts` — update for new section types (drop proof/howIWork/skills extractors, add experience/initiatives extractors)
- `src/lib/utils/__tests__/cn.test.ts` — unchanged

### Tests to add

- `src/components/sections/__tests__/hero.test.tsx` — renders headline, CTAs, snapshot stats
- `src/components/sections/__tests__/about.test.tsx` — paragraphs + features render with correct icons
- `src/components/sections/__tests__/projects.test.tsx` — items render with title/role/year/tech
- `src/components/sections/__tests__/experience.test.tsx` — timeline items render in order with bullets
- `src/components/sections/__tests__/initiatives.test.tsx` — items render with icon + tags
- `src/components/sections/__tests__/contact.test.tsx` — channels and details render
- `src/components/layout/__tests__/navbar.test.tsx` — renders all nav items, theme toggle calls `setTheme`, scroll-spy marks active
- `src/components/layout/__tests__/footer.test.tsx` — copyright + back-to-top
- `src/hooks/__tests__/use-scroll-spy.test.ts` — IntersectionObserver mock, returns active id
- `src/lib/__tests__/icons.test.ts` — registry returns expected component per known key
- `src/lib/content/__tests__/helpers.test.ts` — new extractors return typed sections, return null on mismatch

### Tests intentionally not added

- `motion` animation behavior — animation libs are visual; we test that the final markup is correct, not that frames interpolate.
- `next-themes` provider internals — third-party.
- Visual regression — out of scope, no Playwright in repo.

## Validation gates

Before considering the change complete, the following must pass:

1. `npm run typecheck` — strict, no `any`, no `as`, no `@ts-ignore`
2. `npm run lint` — `--max-warnings 0`
3. `npm run format:check`
4. `npm run test:run` — all unit tests
5. `npm run build` — static export builds clean
6. Manual smoke (documented in plan, not automated):
   - Light + dark theme both readable, no broken contrast
   - Navbar scroll-spy highlights correct section while scrolling
   - Resume CTA downloads/opens the PDF
   - Reduced-motion: ambient blobs static, sections render without entrance delay
   - Mobile (375px): hero stacks, navbar collapses to icons, no horizontal scroll

## Out of scope

Explicitly **not** in this change:

- Backend / contact form (would require deploying functions; current site is static)
- Project screenshots / company logos (none currently exist; gradient placeholders rejected by user)
- Blog or any new route — single-page app stays single-page
- i18n (resume mentions French/Malagasy/English — copy stays English-only for now)
- Analytics / tracking
- Migrating to Next.js Image optimization (static export keeps `images: { unoptimized: true }`)
- Replacing `Geist` font
- Updating `architecture.md` or `standards.md` — these will be touched in a follow-up doc-pass (the implementation plan will note this as a follow-up todo, not a blocker)

## Open questions

None remaining. All clarifying questions answered:

1. Section structure → "you choose" → resolved to the IA above
2. Theme → "light by default + dark toggle"
3. Deps → "yes — motion + lucide-react + next-themes"
4. Project visuals → "drop the image side, text-only cards"
5. Subsequent design sections (visual language, components, tests) → "trusting you, proceed to plan"
