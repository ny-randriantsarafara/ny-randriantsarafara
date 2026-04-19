# Portfolio Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current light-only, text-forward portfolio with the glass-morphism, dual-theme visual identity from `~/Downloads/portfolio-redesign`, while preserving the existing strict architecture (Next.js App Router, server-rendered page, content service, typed sections), adding new Experience and Initiatives sections sourced from the updated resume, and keeping the static export build intact.

**Architecture:** Next.js 16 App Router, server-rendered page at `app/(site)/page.tsx` consumes `contentService.getPageContent()` (static JSON-backed). Each section is a `'use client'` component (entrance animations via `motion`'s `whileInView`). Theme is wired via `next-themes` (`data-theme` attribute, light default). Floating bottom navbar handles section navigation + theme toggle. All glass surfaces use a single `.glass-panel` utility over an animated `<AmbientBackground />` (fixed, `z-[-1]`).

**Tech Stack:** Next.js 16, React 19, TypeScript (strict), Tailwind CSS v4, `motion` (Framer Motion successor), `lucide-react`, `next-themes`, Vitest + Testing Library + jsdom.

**Companion spec:** [`docs/superpowers/specs/2026-04-19-portfolio-redesign-design.md`](../specs/2026-04-19-portfolio-redesign-design.md)

---

## Sequencing Notes

- **Branch:** all work on a single feature branch `feat/portfolio-redesign`. Created in Task 0.
- **Validation gates:** every task ends with `npm run validate` (typecheck + lint + format:check) and the relevant `npm run test:run` subset green. The full `npm run build` runs in Task 32 (final gate). Mid-plan commits may be transiently broken at the page level (`app/(site)/page.tsx`), but library/component-level tests stay green throughout.
- **Husky:** lint-staged runs on commit. Do NOT bypass (`--no-verify`). If lint-staged auto-formats, amend per the safety rules in the agent harness.
- **Repo standards (from `CLAUDE.md` and `.cursor` user rules):** no `any`, no `as` casts, no `@ts-ignore`, no `@ts-nocheck`. No code comments unless explicitly required (no JSDoc). Named exports for components, default export only for `app/` pages/layouts. Inline `type` imports. Single quotes, 2-space indent, 100 char width, semicolons. Functions ≤20 lines (best effort), files ≤250 lines.
- **No mutation after init:** prefer `const` and pure functions; avoid `let` unless necessary; no in-place mutation of arrays/objects (use spread/map/filter).
- **TS strictness:** when reshaping section types, never use `as Section`, `as unknown as X`, or `any`. Prefer discriminated-union narrowing via `isSectionType` or the `extract*` helpers. The two pre-existing `as` casts inside `extractSection` / `extractSections` (a `.find()` over a discriminated union which TS can't narrow) are kept as-is — they encode the discriminated narrowing through a generic, the call sites stay fully typed.
- **JSON-LD injection:** the page uses the modern `<script type="application/ld+json">{JSON.stringify(...)}</script>` pattern (script element with text children). React server components render this as inline text; SEO crawlers see it in the SSR'd HTML. Our data is hardcoded — no risk of `</script>` collision.

---

## Task 0: Create feature branch

**Files:** none (git only)

- [ ] **Step 1: Create + switch to feature branch**

```bash
git checkout -b feat/portfolio-redesign
```

- [ ] **Step 2: Verify clean working tree**

```bash
git status
```

Expected: `nothing to commit, working tree clean`. The spec was already committed on `main`.

---

## Task 1: Add new dependencies

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json` (auto-generated)

- [ ] **Step 1: Install motion, lucide-react, next-themes**

```bash
npm install motion lucide-react next-themes
```

- [ ] **Step 2: Verify versions land in dependencies**

```bash
npm pkg get dependencies.motion dependencies.lucide-react dependencies.next-themes
```

Expected: three quoted version strings, none `undefined`.

- [ ] **Step 3: Verify install is clean**

```bash
npm run typecheck
```

Expected: PASS. (Adding deps shouldn't break types.)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add motion, lucide-react, next-themes for portfolio redesign"
```

---

## Task 2: Drop the resume PDF into public/documents

**Files:**

- Create: `public/documents/resume.pdf` (copy of `~/Downloads/Resume - With Administrative Status.pdf`)

- [ ] **Step 1: Copy file**

```bash
cp "$HOME/Downloads/Resume - With Administrative Status.pdf" public/documents/resume.pdf
```

- [ ] **Step 2: Verify the file is non-empty and is a PDF**

```bash
file public/documents/resume.pdf
```

Expected: output contains `PDF document`.

- [ ] **Step 3: Commit**

```bash
git add public/documents/resume.pdf
git commit -m "chore(content): add updated resume PDF"
```

---

## Task 3: Add icon registry

**Files:**

- Create: `src/lib/icons.ts`
- Create: `src/lib/__tests__/icons.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/__tests__/icons.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { iconRegistry, isKnownIcon } from '@/lib/icons';

import type { IconName } from '@/lib/icons';

describe('iconRegistry', () => {
  it('exposes a component for every declared IconName', () => {
    const knownIcons: IconName[] = [
      'cloud',
      'server',
      'database',
      'shield-check',
      'brain-circuit',
      'map',
      'workflow',
      'sparkles',
      'download',
      'arrow-up-right',
      'arrow-right',
      'mail',
      'map-pin',
      'languages',
      'home',
      'user',
      'layers',
      'briefcase',
      'sun',
      'moon',
    ];

    for (const name of knownIcons) {
      expect(iconRegistry[name]).toBeDefined();
    }
  });

  it('isKnownIcon narrows arbitrary strings to IconName', () => {
    expect(isKnownIcon('cloud')).toBe(true);
    expect(isKnownIcon('not-an-icon')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/lib/__tests__/icons.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the registry**

`src/lib/icons.ts`:

```ts
import {
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  Briefcase,
  Cloud,
  Database,
  Download,
  Home,
  Languages,
  Layers,
  Mail,
  Map,
  MapPin,
  Moon,
  Server,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

export type IconName =
  | 'cloud'
  | 'server'
  | 'database'
  | 'shield-check'
  | 'brain-circuit'
  | 'map'
  | 'workflow'
  | 'sparkles'
  | 'download'
  | 'arrow-up-right'
  | 'arrow-right'
  | 'mail'
  | 'map-pin'
  | 'languages'
  | 'home'
  | 'user'
  | 'layers'
  | 'briefcase'
  | 'sun'
  | 'moon';

export const iconRegistry: Record<IconName, LucideIcon> = {
  cloud: Cloud,
  server: Server,
  database: Database,
  'shield-check': ShieldCheck,
  'brain-circuit': BrainCircuit,
  map: Map,
  workflow: Workflow,
  sparkles: Sparkles,
  download: Download,
  'arrow-up-right': ArrowUpRight,
  'arrow-right': ArrowRight,
  mail: Mail,
  'map-pin': MapPin,
  languages: Languages,
  home: Home,
  user: User,
  layers: Layers,
  briefcase: Briefcase,
  sun: Sun,
  moon: Moon,
};

const knownIcons = new Set<string>(Object.keys(iconRegistry));

export function isKnownIcon(value: string): value is IconName {
  return knownIcons.has(value);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/lib/__tests__/icons.test.ts
```

Expected: PASS.

- [ ] **Step 5: Validate**

```bash
npm run validate
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/icons.ts src/lib/__tests__/icons.test.ts
git commit -m "feat(lib): add typed lucide icon registry"
```

---

## Task 4: Add new section types (experience, initiatives) alongside old ones

**Files:**

- Create: `src/types/sections/experience.ts`
- Create: `src/types/sections/initiatives.ts`
- Modify: `src/types/sections/index.ts`

This task only adds types; the discriminated union in `content.ts` is updated in Task 7.

- [ ] **Step 1: Add Experience types**

`src/types/sections/experience.ts`:

```ts
export interface ExperienceItem {
  company: string;
  role: string;
  period: string;
  location: string;
  bullets: string[];
  tech: string[];
}

export interface ExperienceSectionData {
  eyebrow: string;
  headlinePrefix: string;
  headlineHighlight: string;
  description: string;
  items: ExperienceItem[];
  earlierLine: string;
}

export interface ExperienceSection {
  type: 'experience';
  id: string;
  data: ExperienceSectionData;
}
```

- [ ] **Step 2: Add Initiatives types**

`src/types/sections/initiatives.ts`:

```ts
import type { IconName } from '@/lib/icons';

export interface InitiativeItem {
  icon: IconName;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
}

export interface InitiativesSectionData {
  eyebrow: string;
  headlinePrefix: string;
  headlineHighlight: string;
  description: string;
  items: InitiativeItem[];
}

export interface InitiativesSection {
  type: 'initiatives';
  id: string;
  data: InitiativesSectionData;
}
```

- [ ] **Step 3: Re-export from sections barrel**

Add the following two lines to `src/types/sections/index.ts` (keep all existing exports):

```ts
export type { ExperienceSection, ExperienceSectionData, ExperienceItem } from './experience';
export type { InitiativesSection, InitiativesSectionData, InitiativeItem } from './initiatives';
```

- [ ] **Step 4: Validate**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/sections/experience.ts src/types/sections/initiatives.ts src/types/sections/index.ts
git commit -m "feat(types): add Experience and Initiatives section types"
```

---

## Task 5: Reshape Hero, About, Projects, Contact section types

**Files:**

- Modify: `src/types/sections/hero.ts`
- Modify: `src/types/sections/about.ts`
- Modify: `src/types/sections/projects.ts`
- Modify: `src/types/sections/contact.ts`
- Modify: `src/types/sections/index.ts`
- Modify: `src/types/index.ts`

This task changes the shapes. Old fields are replaced, not kept alongside, because the only consumer (the section components + page) is being rewritten in this same plan. Existing tests using the old shapes will be updated in Tasks 8 and 21–26.

- [ ] **Step 1: Replace `hero.ts`**

`src/types/sections/hero.ts`:

```ts
import type { Link } from '../common';

export interface HeroSnapshotStat {
  value: string;
  label: string;
}

export interface HeroSnapshot {
  role: string;
  location: string;
  stats: HeroSnapshotStat[];
  stack: string[];
}

export interface HeroSectionData {
  tagline: string;
  availabilityBadge: string;
  headlinePrefix: string;
  headlineHighlight: string;
  headlineSuffix: string;
  subheadline: string;
  primaryCta: Link;
  secondaryCta: Link;
  email: string;
  snapshot: HeroSnapshot;
}

export interface HeroSection {
  type: 'hero';
  id: string;
  data: HeroSectionData;
}
```

- [ ] **Step 2: Replace `about.ts`**

`src/types/sections/about.ts`:

```ts
import type { IconName } from '@/lib/icons';

export interface AboutFeature {
  icon: IconName;
  title: string;
  description: string;
}

export interface AboutCoreStack {
  title: string;
  items: string[];
}

export interface AboutJourney {
  title: string;
  paragraphs: string[];
}

export interface AboutStat {
  value: string;
  label: string;
}

export interface AboutSectionData {
  eyebrow: string;
  headlinePrefix: string;
  headlineHighlight: string;
  headlineSuffix: string;
  journey: AboutJourney;
  stat: AboutStat;
  coreStack: AboutCoreStack;
  features: AboutFeature[];
}

export interface AboutSection {
  type: 'about';
  id: string;
  data: AboutSectionData;
}
```

- [ ] **Step 3: Replace `projects.ts`**

`src/types/sections/projects.ts`:

```ts
export interface Project {
  title: string;
  role: string;
  year: string;
  company: string;
  description: string;
  tech: string[];
}

export interface ProjectsSectionData {
  eyebrow: string;
  headlinePrefix: string;
  headlineHighlight: string;
  items: Project[];
  footnote: string;
}

export interface ProjectsSection {
  type: 'projects';
  id: string;
  data: ProjectsSectionData;
}
```

- [ ] **Step 4: Replace `contact.ts`**

`src/types/sections/contact.ts`:

```ts
export type ContactChannelKind = 'email' | 'linkedin' | 'github';

export interface ContactChannel {
  kind: ContactChannelKind;
  label: string;
  href: string;
}

export interface ContactDetail {
  label: string;
  value: string;
}

export interface ContactFooter {
  copyright: string;
  tagline: string;
}

export interface ContactSectionData {
  eyebrow: string;
  headlinePrefix: string;
  headlineHighlight: string;
  description: string;
  channels: ContactChannel[];
  details: ContactDetail[];
  footer: ContactFooter;
}

export interface ContactSection {
  type: 'contact';
  id: string;
  data: ContactSectionData;
}
```

- [ ] **Step 5: Update sections barrel**

Replace `src/types/sections/index.ts` with:

```ts
export type { HeroSection, HeroSectionData, HeroSnapshot, HeroSnapshotStat } from './hero';
export type { ProofSection, ProofSectionData, Metric } from './proof';
export type { ProjectsSection, ProjectsSectionData, Project } from './projects';
export type { SkillsSection, SkillsSectionData, Skill } from './skills';
export type { HowIWorkSection, HowIWorkSectionData } from './how-i-work';
export type {
  AboutSection,
  AboutSectionData,
  AboutFeature,
  AboutCoreStack,
  AboutJourney,
  AboutStat,
} from './about';
export type {
  ContactSection,
  ContactSectionData,
  ContactChannel,
  ContactChannelKind,
  ContactDetail,
  ContactFooter,
} from './contact';
export type { ExperienceSection, ExperienceSectionData, ExperienceItem } from './experience';
export type { InitiativesSection, InitiativesSectionData, InitiativeItem } from './initiatives';
```

(Old `proof`/`skills`/`how-i-work` exports remain for now; they're deleted in Task 28.)

- [ ] **Step 6: Update top-level types barrel**

Replace `src/types/index.ts` with:

```ts
export type { Link, Image, StatItem } from './common';
export type {
  HeroSection,
  HeroSectionData,
  HeroSnapshot,
  HeroSnapshotStat,
  ProofSection,
  ProofSectionData,
  Metric,
  ProjectsSection,
  ProjectsSectionData,
  Project,
  SkillsSection,
  SkillsSectionData,
  Skill,
  HowIWorkSection,
  HowIWorkSectionData,
  AboutSection,
  AboutSectionData,
  AboutFeature,
  AboutCoreStack,
  AboutJourney,
  AboutStat,
  ContactSection,
  ContactSectionData,
  ContactChannel,
  ContactChannelKind,
  ContactDetail,
  ContactFooter,
  ExperienceSection,
  ExperienceSectionData,
  ExperienceItem,
  InitiativesSection,
  InitiativesSectionData,
  InitiativeItem,
} from './sections';
export type { SectionType, Section, PageMetadata, PageContent } from './content';
```

(Note: `QuickDetail` is dropped — no longer present in the new About shape.)

- [ ] **Step 7: Typecheck**

```bash
npm run typecheck
```

Expected: many failures in `src/components/sections/*.tsx` and `src/lib/content/__tests__/helpers.test.ts` because their hero/about/projects/contact references no longer compile. **This is expected and intentional.** The next tasks fix them.

- [ ] **Step 8: Commit (transient red)**

```bash
git add src/types/
git commit -m "feat(types): reshape hero/about/projects/contact, drop QuickDetail"
```

---

## Task 6: Update content.json to the new schema

**Files:**

- Modify: `public/data/content.json` (full rewrite)

- [ ] **Step 1: Rewrite the file**

Write `public/data/content.json` exactly as below (canonical content shape, derived from the existing JSON + the resume + the design spec):

```json
{
  "metadata": {
    "title": "Ny Hasinavalona Randriantsarafara — Senior Backend & Cloud Engineer | Software Architect",
    "description": "Senior Backend & Cloud Engineer focused on system reliability, clean architecture, and design-then-implement. AWS, TypeScript, Terraform.",
    "themeColor": "#f5f5f7"
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
            { "value": "82%", "label": "Coverage achieved" }
          ],
          "stack": ["TypeScript", "AWS", "Terraform"]
        }
      }
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
            "I now lead infrastructure modernization and high-traffic API work in international teams. When I commit to a project, I treat it as my own."
          ]
        },
        "stat": { "value": "8+", "label": "Years building production systems" },
        "coreStack": {
          "title": "Core stack",
          "items": ["TypeScript", "Node.js", "AWS", "Terraform", "PostgreSQL", "GraphQL"]
        },
        "features": [
          {
            "icon": "cloud",
            "title": "Cloud & Infrastructure",
            "description": "AWS (Lambda, API Gateway, DynamoDB, SQS, SNS, EC2). Terraform-first. Serverless and event-driven architectures."
          },
          {
            "icon": "server",
            "title": "Backend & APIs",
            "description": "Node.js, TypeScript, GraphQL, REST. High-traffic API design, integrations, performance optimization."
          },
          {
            "icon": "database",
            "title": "Data & Observability",
            "description": "PostgreSQL, OpenSearch, Redis. Prometheus / Grafana. ETL pipelines and zero-downtime migrations."
          },
          {
            "icon": "shield-check",
            "title": "Quality & Delivery",
            "description": "TDD, CI/CD automation, legacy refactoring, technical leadership and mentoring."
          }
        ]
      }
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
            "tech": ["TypeScript", "GraphQL", "AWS", "Terraform", "PostgreSQL", "DynamoDB"]
          },
          {
            "title": "High-traffic media platform",
            "role": "Software Engineer",
            "year": "2023—2024",
            "company": "Euronews",
            "description": "Maintained backend APIs and AWS EC2 infra serving ~2M daily active users. Led a quality initiative raising platform test coverage from 5% to 65%, and TypeScript-specific coverage from 20% to 55%.",
            "tech": ["TypeScript", "AWS", "EC2", "Node.js"]
          },
          {
            "title": "SaaS for craftsmen",
            "role": "Lead Developer",
            "year": "2022—2023",
            "company": "Numer · HEI",
            "description": "Directed a web + mobile platform from concept to production. Coordinated mobile, back-office, and landing teams. Shaped core architectural decisions.",
            "tech": ["React", "TypeScript", "Cloud infrastructure"]
          }
        ],
        "footnote": "Detailed case studies available on request."
      }
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
              "Introduced caching strategies and SQS/SNS stabilization for high-visibility events."
            ],
            "tech": ["TypeScript", "GraphQL", "AWS", "Terraform", "PostgreSQL"]
          },
          {
            "company": "Euronews",
            "role": "Software Engineer",
            "period": "Mar 2023 — Mar 2024",
            "location": "Lyon, FR",
            "bullets": [
              "Maintained backend APIs / EC2 infra for ~2M daily active users.",
              "Led test coverage from 5% → 65% (TypeScript: 20% → 55%).",
              "Migrated critical legacy components from JavaScript to strict TypeScript."
            ],
            "tech": ["TypeScript", "AWS", "Node.js"]
          },
          {
            "company": "Numer · HEI",
            "role": "Lead Developer",
            "period": "Jan 2022 — Mar 2023",
            "location": "Paris, FR",
            "bullets": [
              "Directed web + mobile platform for craftsmen, concept → production.",
              "Coordinated mobile, back-office, landing teams; shaped core architecture."
            ],
            "tech": ["React", "TypeScript", "Cloud infra"]
          },
          {
            "company": "Novity",
            "role": "Software Developer",
            "period": "Sep 2021 — Mar 2023",
            "location": "Antananarivo, MG",
            "bullets": [
              "Boosted React/TypeScript frontend coverage 50% → 70%, Java/Spring 20% → 39%.",
              "Mentored three technical teams; transitioned monolith → API-driven."
            ],
            "tech": ["React", "TypeScript", "Java", "Spring"]
          },
          {
            "company": "Bocasay",
            "role": "Software Engineer",
            "period": "Feb 2020 — Aug 2021",
            "location": "Antananarivo, MG",
            "bullets": [
              "Refactored legacy monolith → SPA: +40% speed, −30% load times.",
              "Streamlined CI/CD: −25% time-to-market."
            ],
            "tech": ["JavaScript", "CI/CD"]
          },
          {
            "company": "ITRAS Group",
            "role": "Software Engineer",
            "period": "Oct 2018 — Feb 2020",
            "location": "Antananarivo, MG",
            "bullets": [
              "Migrated frontend → Angular/TypeScript, backend → Spring Boot. −40% load.",
              "Drove code coverage 0% → 82%."
            ],
            "tech": ["Angular", "TypeScript", "Spring Boot"]
          }
        ],
        "earlierLine": "Earlier: Software Developer at Allo Application (Jan 2017 — Sep 2018) — reduced API response times by 30%."
      }
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
            "tags": ["NLP", "Multilingual", "CI/CD", "VPS"]
          },
          {
            "icon": "map",
            "title": "Lalana & Lemurion",
            "subtitle": "Geospatial & transit systems",
            "description": "Geospatial nav stack from scratch: OSM ingestion pipeline, routing backend with Redis caching. Full-stack transit planning platform with editable network graph, distributed tracing, k6 load testing.",
            "tags": ["OSM", "Routing", "Redis", "k6"]
          },
          {
            "icon": "workflow",
            "title": "Cloud Platform · Maestro",
            "subtitle": "Personal cloud + Elixir orchestrator",
            "description": "Personal cloud platform: Caddy ingress, PostgreSQL, Redis, Prometheus/Grafana observability. Authored \"Maestro\", an Elixir-based orchestrator using state machines and supervision trees to automate ticket-to-PR workflows.",
            "tags": ["Elixir", "PostgreSQL", "Caddy", "Prometheus"]
          }
        ]
      }
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
            "href": "mailto:nyhasinavalonar@gmail.com"
          },
          {
            "kind": "linkedin",
            "label": "linkedin.com/in/ny-randriantsarafara",
            "href": "https://www.linkedin.com/in/ny-randriantsarafara/"
          },
          {
            "kind": "github",
            "label": "github.com/ny-randriantsarafara",
            "href": "https://github.com/ny-randriantsarafara"
          }
        ],
        "details": [
          { "label": "Location", "value": "Pontault-Combault, France" },
          { "label": "Languages", "value": "Malagasy · French (Fluent) · English (Professional)" },
          { "label": "Status", "value": "EU Blue Card · Passeport Talent" }
        ],
        "footer": {
          "copyright": "Ny Hasinavalona Randriantsarafara",
          "tagline": "Built with care."
        }
      }
    }
  ]
}
```

- [ ] **Step 2: Validate JSON shape**

```bash
node -e "JSON.parse(require('fs').readFileSync('public/data/content.json','utf8'))"
```

Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add public/data/content.json
git commit -m "feat(content): rewrite content.json for redesigned sections + resume data"
```

---

## Task 7: Update Section discriminated union

**Files:**

- Modify: `src/types/content.ts`

- [ ] **Step 1: Replace the file**

`src/types/content.ts`:

```ts
import type {
  AboutSection,
  ContactSection,
  ExperienceSection,
  HeroSection,
  HowIWorkSection,
  InitiativesSection,
  ProjectsSection,
  ProofSection,
  SkillsSection,
} from './sections';

export type SectionType =
  | 'hero'
  | 'proof'
  | 'projects'
  | 'skills'
  | 'how-i-work'
  | 'about'
  | 'contact'
  | 'experience'
  | 'initiatives';

export type Section =
  | HeroSection
  | ProofSection
  | ProjectsSection
  | SkillsSection
  | HowIWorkSection
  | AboutSection
  | ContactSection
  | ExperienceSection
  | InitiativesSection;

export interface PageMetadata {
  title: string;
  description: string;
  themeColor?: string;
}

export interface PageContent {
  sections: Section[];
  metadata: PageMetadata;
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: still red on consumers (page + old section components), but the union itself compiles.

- [ ] **Step 3: Commit**

```bash
git add src/types/content.ts
git commit -m "feat(types): extend Section union with experience and initiatives"
```

---

## Task 8: Add new content extractors + update fixture for tests

**Files:**

- Modify: `src/lib/content/helpers.ts`
- Modify: `src/lib/content/index.ts`
- Modify: `src/lib/content/__tests__/helpers.test.ts`

The existing `extractProofSection`, `extractSkillsSection`, `extractHowIWorkSection` are kept until Task 28 (they don't break anything; the old types still exist).

- [ ] **Step 1: Add experience + initiatives extractors**

Replace `src/lib/content/helpers.ts` with:

```ts
import type {
  AboutSection,
  ContactSection,
  ExperienceSection,
  HeroSection,
  HowIWorkSection,
  InitiativesSection,
  PageContent,
  ProjectsSection,
  ProofSection,
  Section,
  SectionType,
  SkillsSection,
} from '@/types';

export function isSectionType<T extends Section>(section: Section, type: T['type']): section is T {
  return section.type === type;
}

export function extractSection<T extends Section>(
  content: PageContent,
  type: SectionType
): T | undefined {
  return content.sections.find((s) => s.type === type) as T | undefined;
}

export function extractSections<T extends Section>(content: PageContent, type: SectionType): T[] {
  return content.sections.filter((s) => s.type === type) as T[];
}

export const extractHeroSection = (content: PageContent): HeroSection | undefined =>
  extractSection<HeroSection>(content, 'hero');

export const extractProofSection = (content: PageContent): ProofSection | undefined =>
  extractSection<ProofSection>(content, 'proof');

export const extractProjectsSection = (content: PageContent): ProjectsSection | undefined =>
  extractSection<ProjectsSection>(content, 'projects');

export const extractSkillsSection = (content: PageContent): SkillsSection | undefined =>
  extractSection<SkillsSection>(content, 'skills');

export const extractHowIWorkSection = (content: PageContent): HowIWorkSection | undefined =>
  extractSection<HowIWorkSection>(content, 'how-i-work');

export const extractAboutSection = (content: PageContent): AboutSection | undefined =>
  extractSection<AboutSection>(content, 'about');

export const extractContactSection = (content: PageContent): ContactSection | undefined =>
  extractSection<ContactSection>(content, 'contact');

export const extractExperienceSection = (content: PageContent): ExperienceSection | undefined =>
  extractSection<ExperienceSection>(content, 'experience');

export const extractInitiativesSection = (content: PageContent): InitiativesSection | undefined =>
  extractSection<InitiativesSection>(content, 'initiatives');
```

- [ ] **Step 2: Re-export new extractors from the content barrel**

Replace `src/lib/content/index.ts` with:

```ts
export { contentService, createContentService } from './service';
export { StaticContentProvider } from './providers';
export type { ContentConfig, ContentProvider } from './types';
export {
  extractAboutSection,
  extractContactSection,
  extractExperienceSection,
  extractHeroSection,
  extractHowIWorkSection,
  extractInitiativesSection,
  extractProjectsSection,
  extractProofSection,
  extractSection,
  extractSections,
  extractSkillsSection,
  isSectionType,
} from './helpers';
```

- [ ] **Step 3: Update `helpers.test.ts` fixture to match new shapes + cover new extractors**

Replace `src/lib/content/__tests__/helpers.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';

import {
  extractExperienceSection,
  extractHeroSection,
  extractInitiativesSection,
  extractSection,
  extractSections,
  isSectionType,
} from '@/lib/content/helpers';

import type { ExperienceSection, PageContent, Section } from '@/types';

const contentFixture: PageContent = {
  metadata: {
    title:
      'Ny Hasinavalona Randriantsarafara — Senior Backend & Cloud Engineer | Software Architect',
    description: 'Senior Backend & Cloud Engineer.',
    themeColor: '#f5f5f7',
  },
  sections: [
    {
      type: 'hero',
      id: 'hero',
      data: {
        tagline: 'Pontault-Combault, France',
        availabilityBadge: 'EU Blue Card',
        headlinePrefix: 'Crafting cloud systems',
        headlineHighlight: 'built to last',
        headlineSuffix: 'not to impress.',
        subheadline: 'Subheadline',
        primaryCta: { label: 'Explore work', href: '#projects' },
        secondaryCta: { label: 'Resume', href: '/documents/resume.pdf' },
        email: 'test@example.com',
        snapshot: {
          role: 'Senior Backend & Cloud Engineer',
          location: 'Pontault-Combault, FR',
          stats: [{ value: '8+', label: 'Years experience' }],
          stack: ['TypeScript'],
        },
      },
    },
    {
      type: 'experience',
      id: 'experience',
      data: {
        eyebrow: 'Career path',
        headlinePrefix: 'Professional',
        headlineHighlight: 'experience',
        description: 'Description',
        items: [
          {
            company: 'WBD',
            role: 'Software Engineer',
            period: 'Mar 2024 — Present',
            location: 'Issy-les-Moulineaux, FR',
            bullets: ['Migrated to Terraform'],
            tech: ['TypeScript', 'AWS'],
          },
        ],
        earlierLine: 'Earlier roles',
      },
    },
    {
      type: 'initiatives',
      id: 'initiatives',
      data: {
        eyebrow: 'R&D',
        headlinePrefix: 'Side',
        headlineHighlight: 'investments',
        description: 'Description',
        items: [
          {
            icon: 'brain-circuit',
            title: 'Visa Insight',
            subtitle: 'NLP',
            description: 'Description',
            tags: ['NLP'],
          },
        ],
      },
    },
  ],
};

describe('content helpers', () => {
  it('extracts a section by type', () => {
    const hero = extractSection(contentFixture, 'hero');
    expect(hero?.id).toBe('hero');
  });

  it('extracts the hero section with the dedicated helper', () => {
    const hero = extractHeroSection(contentFixture);
    expect(hero?.data.tagline).toBe('Pontault-Combault, France');
  });

  it('extracts the experience section with the dedicated helper', () => {
    const experience = extractExperienceSection(contentFixture);
    expect(experience?.data.items).toHaveLength(1);
    expect(experience?.data.items[0]?.company).toBe('WBD');
  });

  it('extracts the initiatives section with the dedicated helper', () => {
    const initiatives = extractInitiativesSection(contentFixture);
    expect(initiatives?.data.items[0]?.icon).toBe('brain-circuit');
  });

  it('extracts multiple sections by type', () => {
    const experiences = extractSections<ExperienceSection>(contentFixture, 'experience');
    expect(experiences).toHaveLength(1);
  });

  it('narrows section types with isSectionType', () => {
    const section = contentFixture.sections[0] as Section;
    if (isSectionType(section, 'hero')) {
      expect(section.data.headlinePrefix).toBe('Crafting cloud systems');
      return;
    }
    throw new Error('Expected hero section');
  });
});
```

- [ ] **Step 4: Run content helpers tests**

```bash
npm run test:run -- src/lib/content/__tests__/helpers.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run content service tests (unchanged but should still pass)**

```bash
npm run test:run -- src/lib/content/__tests__/service.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/content/helpers.ts src/lib/content/index.ts src/lib/content/__tests__/helpers.test.ts
git commit -m "feat(content): add experience + initiatives extractors and update fixture"
```

---

## Task 9: Rewrite globals.css with theme tokens + glass utility

**Files:**

- Modify: `app/globals.css` (full rewrite)

- [ ] **Step 1: Replace the file**

`app/globals.css`:

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

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  body {
    transition: none;
  }
}
```

(Old `.lava` and `.reveal` rules removed. Old `--color-paper`, `--color-ink`, `--color-accent`, `--color-sand` tokens removed.)

- [ ] **Step 2: Typecheck (build still red but CSS doesn't affect it)**

```bash
npm run typecheck
```

Expected: still red on `src/components/sections/*.tsx`.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(styles): replace tokens with light/dark theme + glass utility"
```

---

## Task 10: Wire ThemeProvider into the layout

**Files:**

- Create: `src/components/providers/theme-provider.tsx`
- Create: `src/components/providers/index.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create ThemeProvider wrapper**

`src/components/providers/theme-provider.tsx`:

```tsx
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
```

- [ ] **Step 2: Create barrel**

`src/components/providers/index.ts`:

```ts
export { ThemeProvider } from './theme-provider';
```

- [ ] **Step 3: Update root layout**

Replace `app/layout.tsx` with:

```tsx
import { Geist } from 'next/font/google';

import { ThemeProvider } from '@/components/providers';
import { contentService } from '@/lib/content';
import { getSiteUrl, parseTitleParts } from '@/lib/seo';

import type { Metadata } from 'next';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export async function generateMetadata(): Promise<Metadata> {
  const content = await contentService.getPageContent();
  const siteUrl = getSiteUrl();
  const { name } = parseTitleParts(content.metadata.title);

  return {
    metadataBase: siteUrl,
    title: content.metadata.title,
    description: content.metadata.description,
    themeColor: content.metadata.themeColor,
    authors: [{ name }],
    creator: name,
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      url: siteUrl,
      title: content.metadata.title,
      description: content.metadata.description,
      siteName: name,
      locale: 'en_US',
    },
    twitter: {
      card: 'summary',
      title: content.metadata.title,
      description: content.metadata.description,
    },
    robots: {
      index: true,
      follow: true,
    },
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

(Drops `Geist_Mono` — unused. Drops the `keywords` extraction that referenced removed `tagline` parsing logic — `tagline` is now a free-form sentence.)

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: still red on `src/components/sections/*.tsx` (rewrite happens later) and on `src/components/layout/header.tsx` (deleted later). Layout itself compiles.

- [ ] **Step 5: Commit**

```bash
git add src/components/providers/ app/layout.tsx
git commit -m "feat(theme): wrap layout in next-themes ThemeProvider (light default)"
```

---

## Task 11: Add AmbientBackground component

**Files:**

- Create: `src/components/layout/ambient-background.tsx`

- [ ] **Step 1: Create the component**

`src/components/layout/ambient-background.tsx`:

```tsx
'use client';

import { motion } from 'motion/react';

const noiseDataUrl =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")";

export function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      <motion.div
        animate={{ x: ['-10%', '10%', '-10%'], y: ['-10%', '20%', '-10%'], scale: [1, 1.1, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-0 top-0 h-[50vw] w-[50vw] rounded-full blur-[120px]"
        style={{ background: 'rgba(99,102,241,0.12)' }}
      />
      <motion.div
        animate={{ x: ['10%', '-20%', '10%'], y: ['10%', '-10%', '10%'], scale: [1, 1.2, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute bottom-0 right-[-10%] h-[60vw] w-[60vw] rounded-full blur-[120px]"
        style={{ background: 'rgba(244,63,94,0.10)' }}
      />
      <motion.div
        animate={{ x: ['-20%', '20%', '-20%'], y: ['20%', '-20%', '20%'], scale: [1, 1.1, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        className="absolute left-[30%] top-[30%] h-[40vw] w-[40vw] rounded-full blur-[120px]"
        style={{ background: 'rgba(20,184,166,0.10)' }}
      />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: noiseDataUrl }} />
    </div>
  );
}
```

(Theme-specific blob colors aren't needed: the same RGBA values work in both themes thanks to the subtle alpha values. Simpler than the template's `useTheme`-driven branching.)

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/ambient-background.tsx
git commit -m "feat(layout): add AmbientBackground with motion blobs and noise overlay"
```

---

## Task 12: Add useScrollSpy hook (TDD)

**Files:**

- Create: `src/hooks/use-scroll-spy.ts`
- Create: `src/hooks/__tests__/use-scroll-spy.test.ts`

The hook tracks which section id is closest to the top of the viewport using `IntersectionObserver`.

- [ ] **Step 1: Write the failing test**

`src/hooks/__tests__/use-scroll-spy.test.ts`:

```ts
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useScrollSpy } from '@/hooks/use-scroll-spy';

type ObserverCallback = (entries: IntersectionObserverEntry[]) => void;

class FakeObserver implements IntersectionObserver {
  static lastInstance: FakeObserver | null = null;

  readonly root = null;
  readonly rootMargin = '';
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

- [ ] **Step 2: Run test to verify failure**

```bash
npm run test:run -- src/hooks/__tests__/use-scroll-spy.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

`src/hooks/use-scroll-spy.ts`:

```ts
'use client';

import { useEffect, useState } from 'react';

export function useScrollSpy(sectionIds: readonly string[]): string {
  const [activeId, setActiveId] = useState<string>(sectionIds[0] ?? '');

  useEffect(() => {
    if (sectionIds.length === 0) return;

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;

        const top = visible.reduce((best, entry) =>
          entry.intersectionRatio > best.intersectionRatio ? entry : best
        );

        const id = top.target.id;
        if (id) setActiveId(id);
      },
      { threshold: [0.25, 0.5, 0.75], rootMargin: '-20% 0px -40% 0px' }
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [sectionIds]);

  return activeId;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/hooks/__tests__/use-scroll-spy.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-scroll-spy.ts src/hooks/__tests__/use-scroll-spy.test.ts
git commit -m "feat(hooks): add useScrollSpy with IntersectionObserver"
```

---

## Task 13: Swap hooks barrel — add useScrollSpy, drop useReveal

**Files:**

- Modify: `src/hooks/index.ts`
- Delete: `src/hooks/use-reveal.ts`
- Delete: `src/hooks/__tests__/use-reveal.test.ts` (if it exists)

- [ ] **Step 1: Check for existing reveal test**

```bash
ls src/hooks/__tests__/
```

Expected: list files. If `use-reveal.test.ts` exists, delete it in step 3.

- [ ] **Step 2: Replace hooks barrel**

`src/hooks/index.ts`:

```ts
export { useScrollSpy } from './use-scroll-spy';
```

- [ ] **Step 3: Delete useReveal**

```bash
rm src/hooks/use-reveal.ts
rm -f src/hooks/__tests__/use-reveal.test.ts
```

- [ ] **Step 4: Search for stale references**

```bash
rg "useReveal|use-reveal" src
```

Expected: matches in `src/components/reveal-provider.tsx` only (deleted later). No other matches.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/
git commit -m "refactor(hooks): replace useReveal with useScrollSpy"
```

---

## Task 14: Add Navbar component

**Files:**

- Create: `src/components/layout/navbar.tsx`
- Create: `src/components/layout/__tests__/navbar.test.tsx`

The navbar is fixed at the bottom, contains 5 nav items + a theme toggle. Active section is detected via `useScrollSpy`. Active item shows a shared-`layoutId` pill background.

- [ ] **Step 1: Create the component**

`src/components/layout/navbar.tsx`:

```tsx
'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { useScrollSpy } from '@/hooks';
import { iconRegistry } from '@/lib/icons';

import type { IconName } from '@/lib/icons';

interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: IconName;
}

const navItems: readonly NavItem[] = [
  { id: 'hero', href: '#hero', label: 'Home', icon: 'home' },
  { id: 'about', href: '#about', label: 'About', icon: 'user' },
  { id: 'projects', href: '#projects', label: 'Work', icon: 'layers' },
  { id: 'experience', href: '#experience', label: 'Experience', icon: 'briefcase' },
  { id: 'contact', href: '#contact', label: 'Contact', icon: 'mail' },
];

const navIds = navItems.map((item) => item.id);

export function Navbar() {
  const activeId = useScrollSpy(navIds);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = theme === 'dark';
  const SunIcon = iconRegistry.sun;
  const MoonIcon = iconRegistry.moon;

  return (
    <motion.nav
      aria-label="Primary"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full px-2 py-2"
    >
      {navItems.map((item) => {
        const Icon = iconRegistry[item.icon];
        const isActive = activeId === item.id;

        return (
          <a
            key={item.id}
            href={item.href}
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

      <button
        type="button"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
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

- [ ] **Step 2: Add navbar test**

`src/components/layout/__tests__/navbar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Navbar } from '@/components/layout/navbar';

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
  it('renders all nav items with their labels', () => {
    render(<Navbar />);
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '#hero');
    expect(screen.getByRole('link', { name: /about/i })).toHaveAttribute('href', '#about');
    expect(screen.getByRole('link', { name: /work/i })).toHaveAttribute('href', '#projects');
    expect(screen.getByRole('link', { name: /experience/i })).toHaveAttribute(
      'href',
      '#experience'
    );
    expect(screen.getByRole('link', { name: /contact/i })).toHaveAttribute('href', '#contact');
  });

  it('marks the active section with aria-current', () => {
    render(<Navbar />);
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /about/i })).not.toHaveAttribute('aria-current');
  });

  it('exposes a theme toggle button with an accessible label', async () => {
    render(<Navbar />);
    const toggle = screen.getByRole('button', { name: /switch to dark mode/i });
    await userEvent.click(toggle);
    expect(toggle).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run navbar test**

```bash
npm run test:run -- src/components/layout/__tests__/navbar.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/navbar.tsx src/components/layout/__tests__/navbar.test.tsx
git commit -m "feat(layout): add floating Navbar with scroll-spy and theme toggle"
```

---

## Task 15: Add Footer component

**Files:**

- Create: `src/components/layout/footer.tsx`
- Create: `src/components/layout/__tests__/footer.test.tsx`

- [ ] **Step 1: Create the component**

`src/components/layout/footer.tsx`:

```tsx
'use client';

import { motion } from 'motion/react';

import type { ContactFooter } from '@/types';

interface FooterProps {
  data: ContactFooter;
  location: string;
}

export function Footer({ data, location }: FooterProps) {
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
            <span>Back to top</span>
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
          <span style={{ color: 'var(--text-muted)' }}>{location}</span>
        </div>
      </div>

      <p className="mt-6 text-center text-xs" style={{ color: 'var(--text-dimmed)' }}>
        {data.tagline}
      </p>
    </footer>
  );
}
```

- [ ] **Step 2: Add the test**

`src/components/layout/__tests__/footer.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Footer } from '@/components/layout/footer';

describe('Footer', () => {
  it('renders copyright, location, tagline, and back-to-top link', () => {
    render(
      <Footer
        data={{ copyright: 'Ny Hasinavalona Randriantsarafara', tagline: 'Built with care.' }}
        location="Pontault-Combault, FR"
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

- [ ] **Step 3: Run footer test**

```bash
npm run test:run -- src/components/layout/__tests__/footer.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/footer.tsx src/components/layout/__tests__/footer.test.tsx
git commit -m "feat(layout): add Footer with copyright, back-to-top, location, tagline"
```

---

## Task 16: Simplify Section component (drop variants)

**Files:**

- Modify: `src/components/layout/section.tsx`
- Modify: `src/components/layout/__tests__/section.test.tsx`

- [ ] **Step 1: Replace `section.tsx`**

`src/components/layout/section.tsx`:

```tsx
import { cn } from '@/lib/utils';

interface SectionProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export function Section({ id, children, className }: SectionProps) {
  return (
    <section id={id} className={cn('relative w-full scroll-mt-24', className)}>
      {children}
    </section>
  );
}
```

- [ ] **Step 2: Replace its test**

`src/components/layout/__tests__/section.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Section } from '@/components/layout/section';

describe('Section', () => {
  it('renders a section with the given id and scroll offset', () => {
    const { container } = render(
      <Section id="about">
        <p>About content</p>
      </Section>
    );

    const section = container.querySelector('section');
    expect(section).toHaveAttribute('id', 'about');
    expect(section).toHaveClass('scroll-mt-24');
  });

  it('merges additional class names', () => {
    const { container } = render(
      <Section id="hero" className="custom-class">
        Content
      </Section>
    );

    expect(container.querySelector('section')).toHaveClass('custom-class');
  });
});
```

- [ ] **Step 3: Run the section test**

```bash
npm run test:run -- src/components/layout/__tests__/section.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/section.tsx src/components/layout/__tests__/section.test.tsx
git commit -m "refactor(layout): simplify Section to id + scroll-margin wrapper"
```

---

## Task 17: Update layout barrel — drop Header, expose Navbar/Footer/AmbientBackground

**Files:**

- Modify: `src/components/layout/index.ts`
- Delete: `src/components/layout/header.tsx`

- [ ] **Step 1: Replace barrel**

`src/components/layout/index.ts`:

```ts
export { AmbientBackground } from './ambient-background';
export { Footer } from './footer';
export { Navbar } from './navbar';
export { Section } from './section';
```

- [ ] **Step 2: Delete the old header**

```bash
rm src/components/layout/header.tsx
```

- [ ] **Step 3: Verify no stale references**

```bash
rg "components/layout/header|\\bHeader\\b" src app
```

Expected: matches only in `app/(site)/page.tsx` (rewritten in Task 29). No other matches.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/
git commit -m "refactor(layout): drop Header, expose Navbar/Footer/AmbientBackground"
```

---

## Task 18: Extend Card with `glass` variant

**Files:**

- Modify: `src/components/ui/card.tsx`
- Modify: `src/components/ui/__tests__/card.test.tsx`

- [ ] **Step 1: Update the component**

`src/components/ui/card.tsx`:

```tsx
import { cn } from '@/lib/utils';

type CardVariant = 'default' | 'glass';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: CardVariant;
  hover?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'border border-black/10 bg-white/70 shadow-sm',
  glass: 'glass-panel',
};

export function Card({ children, className, variant = 'default', hover = false }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-3xl p-6',
        variantStyles[variant],
        hover && 'transition hover:-translate-y-0.5',
        className
      )}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Replace the test**

`src/components/ui/__tests__/card.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Card } from '@/components/ui/card';

describe('Card', () => {
  it('renders default variant styles', () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('rounded-3xl');
    expect(card).toHaveClass('bg-white/70');
  });

  it('renders glass variant with the glass-panel class', () => {
    const { container } = render(<Card variant="glass">Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('glass-panel');
  });

  it('adds the hover lift transition when hover is true', () => {
    const { container } = render(<Card hover>Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('hover:-translate-y-0.5');
  });
});
```

- [ ] **Step 3: Run card tests**

```bash
npm run test:run -- src/components/ui/__tests__/card.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/card.tsx src/components/ui/__tests__/card.test.tsx
git commit -m "feat(ui): add glass variant to Card"
```

---

## Task 19: Rewrite Button — use theme tokens, add glass variant + external/download support

**Files:**

- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/__tests__/button.test.tsx`

- [ ] **Step 1: Replace the component**

`src/components/ui/button.tsx`:

```tsx
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'glass' | 'ghost';

interface ButtonBaseProps {
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
}

interface ButtonAsButtonProps
  extends
    ButtonBaseProps,
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> {
  href?: undefined;
}

interface ButtonAsLinkProps extends ButtonBaseProps {
  href: string;
  external?: boolean;
  download?: boolean;
}

type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

const baseStyles =
  'group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

const variantStyles: Record<ButtonVariant, string> = {
  primary: '',
  glass: 'glass-panel',
  ghost: 'hover:opacity-80',
};

function isLinkProps(props: ButtonProps): props is ButtonAsLinkProps {
  return typeof props.href === 'string';
}

export function Button(props: ButtonProps) {
  const { variant = 'primary', className, children } = props;

  const primaryInlineStyle =
    variant === 'primary'
      ? {
          background: 'var(--btn-primary-bg)',
          color: 'var(--btn-primary-text)',
          boxShadow: 'var(--btn-primary-shadow)',
        }
      : { color: 'var(--text-primary)' };

  const composed = cn(baseStyles, variantStyles[variant], 'hover:scale-[1.02]', className);

  if (isLinkProps(props)) {
    const { href, external, download } = props;
    const targetProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
    const downloadProps = download ? { download: '' } : {};
    return (
      <a
        href={href}
        className={composed}
        style={primaryInlineStyle}
        {...targetProps}
        {...downloadProps}
      >
        {children}
      </a>
    );
  }

  const { variant: _variant, className: _className, children: _children, ...rest } = props;
  return (
    <button type="button" className={composed} style={primaryInlineStyle} {...rest}>
      {children}
    </button>
  );
}
```

(Note: the underscore-prefixed destructure pattern satisfies `no-unused-vars` while removing those keys from `rest`. Underscore prefix is allowed by the ESLint config.)

- [ ] **Step 2: Replace the test**

`src/components/ui/__tests__/button.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders a button element by default with the primary variant', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveClass('rounded-full');
  });

  it('renders an anchor when href is provided', () => {
    render(<Button href="#projects">Explore</Button>);
    const link = screen.getByRole('link', { name: /explore/i });
    expect(link).toHaveAttribute('href', '#projects');
  });

  it('opens external links in a new tab with security attributes', () => {
    render(
      <Button href="https://example.com" external>
        External
      </Button>
    );
    const link = screen.getByRole('link', { name: /external/i });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('marks downloadable links with the download attribute', () => {
    render(
      <Button href="/documents/resume.pdf" download>
        Resume
      </Button>
    );
    expect(screen.getByRole('link', { name: /resume/i })).toHaveAttribute('download');
  });

  it('applies the glass-panel class for the glass variant', () => {
    render(<Button variant="glass">Glass</Button>);
    expect(screen.getByRole('button', { name: /glass/i })).toHaveClass('glass-panel');
  });
});
```

- [ ] **Step 3: Run button tests**

```bash
npm run test:run -- src/components/ui/__tests__/button.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/button.tsx src/components/ui/__tests__/button.test.tsx
git commit -m "feat(ui): rewrite Button with theme tokens, glass variant, external/download"
```

---

## Task 20: Rewrite Badge — use theme tokens, add glass + tag variants with accent dot

**Files:**

- Modify: `src/components/ui/badge.tsx`
- Modify: `src/components/ui/__tests__/badge.test.tsx`

- [ ] **Step 1: Replace the component**

`src/components/ui/badge.tsx`:

```tsx
import { cn } from '@/lib/utils';

type BadgeVariant = 'glass' | 'tag';
type BadgeAccent = 'indigo' | 'teal' | 'rose';

interface BadgeProps {
  variant?: BadgeVariant;
  accent?: BadgeAccent;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  glass: 'glass-panel',
  tag: 'rounded-full',
};

const accentDotClass: Record<BadgeAccent, string> = {
  indigo: 'bg-indigo-400',
  teal: 'bg-teal-400',
  rose: 'bg-rose-400',
};

const accentTextClass: Record<BadgeAccent, string> = {
  indigo: 'text-indigo-300',
  teal: 'text-teal-300',
  rose: 'text-rose-300',
};

export function Badge({ variant = 'glass', accent, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-3 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest',
        variantStyles[variant],
        accent && accentTextClass[accent],
        variant === 'tag' && 'border',
        className
      )}
      style={
        variant === 'tag'
          ? {
              background: 'var(--tag-bg)',
              borderColor: 'var(--tag-border)',
              color: 'var(--tag-text)',
            }
          : undefined
      }
    >
      {accent && (
        <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', accentDotClass[accent])} />
      )}
      {children}
    </span>
  );
}
```

- [ ] **Step 2: Replace the test**

`src/components/ui/__tests__/badge.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  it('renders a glass-panel badge by default', () => {
    render(<Badge>Available</Badge>);
    const badge = screen.getByText('Available');
    expect(badge).toHaveClass('glass-panel');
  });

  it('renders an accent dot when accent is provided', () => {
    render(<Badge accent="indigo">About</Badge>);
    const badge = screen.getByText(/about/i);
    expect(badge.querySelector('span[aria-hidden="true"]')).toHaveClass('bg-indigo-400');
    expect(badge).toHaveClass('text-indigo-300');
  });

  it('renders a tag variant without glass-panel', () => {
    render(<Badge variant="tag">Tech</Badge>);
    const badge = screen.getByText('Tech');
    expect(badge).not.toHaveClass('glass-panel');
    expect(badge).toHaveClass('rounded-full');
  });
});
```

- [ ] **Step 3: Run badge tests**

```bash
npm run test:run -- src/components/ui/__tests__/badge.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/badge.tsx src/components/ui/__tests__/badge.test.tsx
git commit -m "feat(ui): rewrite Badge with glass/tag variants and accent dot"
```

---

## Task 21: Rewrite Hero section

**Files:**

- Modify: `src/components/sections/hero.tsx`
- Create: `src/components/sections/__tests__/hero.test.tsx`

- [ ] **Step 1: Write the failing test first**

`src/components/sections/__tests__/hero.test.tsx`:

```tsx
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
  secondaryCta: { label: 'Resume', href: '/documents/resume.pdf' },
  email: 'nyhasinavalonar@gmail.com',
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
      '/documents/resume.pdf'
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

- [ ] **Step 2: Run the test (expect fail because Hero still has old shape)**

```bash
npm run test:run -- src/components/sections/__tests__/hero.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Replace the Hero component**

`src/components/sections/hero.tsx`:

```tsx
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

const easeOut = [0.16, 1, 0.3, 1] as const;

export function Hero({ data }: HeroProps) {
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

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.1, ease: easeOut }}
          className="text-5xl font-semibold leading-[1.1] tracking-tight drop-shadow-xl sm:text-7xl lg:text-[6rem]"
          style={{ color: 'var(--text-primary)' }}
        >
          {data.headlinePrefix} <br />
          <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 bg-clip-text pr-4 italic text-transparent">
            {data.headlineHighlight}
          </span>{' '}
          {data.headlineSuffix}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: easeOut }}
          className="max-w-lg text-lg font-light leading-relaxed sm:text-xl"
          style={{ color: 'var(--text-muted)' }}
        >
          {data.subheadline}
        </motion.p>

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
                Current focus
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

        {data.snapshot.stats[0] && (
          <motion.div
            initial={{ opacity: 0, x: -100, rotate: -15 }}
            animate={{ opacity: 1, x: 0, rotate: -6 }}
            transition={{ duration: 1, delay: 0.4, type: 'spring', stiffness: 80 }}
            className="glass-panel absolute left-[-10%] top-[20%] z-30 rounded-3xl px-6 py-5 shadow-2xl sm:left-[5%]"
          >
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-teal-500 to-indigo-500 bg-clip-text text-3xl font-bold text-transparent">
                {data.snapshot.stats[0].value}
              </div>
              <div
                className="text-xs font-medium uppercase leading-tight tracking-wide"
                style={{ color: 'var(--text-secondary)' }}
              >
                {data.snapshot.stats[0].label}
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
              Tech stack
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

- [ ] **Step 4: Run hero test**

```bash
npm run test:run -- src/components/sections/__tests__/hero.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/hero.tsx src/components/sections/__tests__/hero.test.tsx
git commit -m "feat(sections): rewrite Hero with glass cards, motion, theme tokens"
```

---

## Task 22: Rewrite About section

**Files:**

- Modify: `src/components/sections/about.tsx`
- Create: `src/components/sections/__tests__/about.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/sections/__tests__/about.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { About } from '@/components/sections/about';

import type { AboutSectionData } from '@/types';

const aboutData: AboutSectionData = {
  eyebrow: 'About',
  headlinePrefix: 'Bridging',
  headlineHighlight: 'reliability and clarity',
  headlineSuffix: 'in cloud systems.',
  journey: {
    title: 'My journey',
    paragraphs: ['I am a Senior Backend Engineer.', 'Design-then-implement.'],
  },
  stat: { value: '8+', label: 'Years building production systems' },
  coreStack: { title: 'Core stack', items: ['TypeScript', 'AWS'] },
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

- [ ] **Step 2: Run the test (expect fail)**

```bash
npm run test:run -- src/components/sections/__tests__/about.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Replace the component**

`src/components/sections/about.tsx`:

```tsx
'use client';

import { motion } from 'motion/react';

import { Badge } from '@/components/ui';
import { iconRegistry } from '@/lib/icons';

import type { AboutSectionData } from '@/types';

interface AboutProps {
  data: AboutSectionData;
}

const easeOut = [0.16, 1, 0.3, 1] as const;
const inView = { once: true, margin: '-100px' } as const;

export function About({ data }: AboutProps) {
  return (
    <section
      id="about"
      className="relative z-20 flex w-full max-w-[1400px] flex-col gap-16 px-6 py-24 sm:px-12"
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={inView}
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
          viewport={inView}
          transition={{ duration: 1, ease: easeOut }}
          className="glass-panel relative row-span-2 overflow-hidden rounded-[2.5rem] p-8 shadow-2xl sm:p-12 md:col-span-8"
        >
          <h3
            className="mb-6 text-2xl font-medium sm:text-3xl"
            style={{ color: 'var(--text-primary)' }}
          >
            {data.journey.title}
          </h3>
          <div
            className="relative z-10 space-y-6 text-lg font-light leading-relaxed sm:text-xl"
            style={{ color: 'var(--text-secondary)' }}
          >
            {data.journey.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={inView}
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

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={inView}
          transition={{ duration: 1, delay: 0.2, ease: easeOut }}
          className="glass-panel row-span-1 flex flex-col justify-between rounded-[2.5rem] p-8 shadow-2xl md:col-span-4"
        >
          <h3
            className="mb-6 text-sm font-medium uppercase tracking-widest"
            style={{ color: 'var(--text-muted)' }}
          >
            {data.coreStack.title}
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.coreStack.items.map((item) => (
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
        viewport={inView}
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

- [ ] **Step 4: Run about test**

```bash
npm run test:run -- src/components/sections/__tests__/about.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/about.tsx src/components/sections/__tests__/about.test.tsx
git commit -m "feat(sections): rewrite About with bento + features grid"
```

---

## Task 23: Rewrite Projects section

**Files:**

- Modify: `src/components/sections/projects.tsx`
- Create: `src/components/sections/__tests__/projects.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/sections/__tests__/projects.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Projects } from '@/components/sections/projects';

import type { ProjectsSectionData } from '@/types';

const projectsData: ProjectsSectionData = {
  eyebrow: 'Featured work',
  headlinePrefix: 'Selected',
  headlineHighlight: 'case studies',
  items: [
    {
      title: 'Eurosport / HBO Max API',
      role: 'Software Engineer',
      year: '2024—Present',
      company: 'WBD',
      description: 'GraphQL API.',
      tech: ['TypeScript', 'GraphQL'],
    },
    {
      title: 'Media platform',
      role: 'Software Engineer',
      year: '2023—2024',
      company: 'Euronews',
      description: '~2M DAU.',
      tech: ['TypeScript'],
    },
  ],
  footnote: 'Detailed case studies available on request.',
};

describe('Projects', () => {
  it('renders the eyebrow and headline', () => {
    render(<Projects data={projectsData} />);
    expect(screen.getByText(/featured work/i)).toBeInTheDocument();
    expect(screen.getByText(/selected/i)).toBeInTheDocument();
    expect(screen.getByText(/case studies/i)).toBeInTheDocument();
  });

  it('renders each project with title, year, role, company, description, tech', () => {
    render(<Projects data={projectsData} />);
    expect(screen.getByText('Eurosport / HBO Max API')).toBeInTheDocument();
    expect(screen.getByText('GraphQL API.')).toBeInTheDocument();
    expect(screen.getByText('GraphQL')).toBeInTheDocument();
    expect(screen.getByText('Media platform')).toBeInTheDocument();
    expect(screen.getByText('~2M DAU.')).toBeInTheDocument();
  });

  it('renders the footnote', () => {
    render(<Projects data={projectsData} />);
    expect(screen.getByText(/detailed case studies available on request/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test (expect fail)**

```bash
npm run test:run -- src/components/sections/__tests__/projects.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Replace the component**

`src/components/sections/projects.tsx`:

```tsx
'use client';

import { motion } from 'motion/react';

import { Badge } from '@/components/ui';

import type { ProjectsSectionData } from '@/types';

interface ProjectsProps {
  data: ProjectsSectionData;
}

const easeOut = [0.16, 1, 0.3, 1] as const;
const inView = { once: true, margin: '-100px' } as const;

export function Projects({ data }: ProjectsProps) {
  return (
    <section
      id="projects"
      className="relative z-20 flex w-full max-w-[1400px] flex-col gap-16 px-6 py-32 sm:px-12"
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={inView}
        transition={{ duration: 1, ease: easeOut }}
        className="flex w-full flex-col gap-6"
      >
        <Badge accent="teal">{data.eyebrow}</Badge>
        <h2
          className="text-4xl font-medium leading-tight tracking-tight md:text-6xl"
          style={{ color: 'var(--text-primary)' }}
        >
          {data.headlinePrefix}{' '}
          <span className="bg-gradient-to-r from-teal-500 to-indigo-500 bg-clip-text italic text-transparent">
            {data.headlineHighlight}
          </span>
          .
        </h2>
      </motion.div>

      <div className="mt-8 flex w-full flex-col gap-12 lg:gap-16">
        {data.items.map((project) => (
          <motion.article
            key={project.title}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={inView}
            transition={{ duration: 1, ease: easeOut, delay: 0.1 }}
            className="glass-panel relative w-full rounded-[2.5rem] p-8 shadow-2xl md:p-12"
          >
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-4">
                <div
                  className="flex w-fit items-center gap-3 rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-widest"
                  style={{
                    background: 'var(--tag-bg)',
                    borderColor: 'var(--tag-border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span>{project.year}</span>
                  <span
                    aria-hidden="true"
                    className="h-1 w-1 rounded-full"
                    style={{ background: 'var(--text-dimmed)' }}
                  />
                  <span>{project.role}</span>
                  <span
                    aria-hidden="true"
                    className="h-1 w-1 rounded-full"
                    style={{ background: 'var(--text-dimmed)' }}
                  />
                  <span>{project.company}</span>
                </div>
                <h3
                  className="text-3xl font-semibold leading-tight tracking-tight md:text-5xl"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {project.title}
                </h3>
              </div>

              <p
                className="max-w-3xl text-lg font-light leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                {project.description}
              </p>

              <div className="flex flex-wrap gap-3">
                {project.tech.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-xl px-4 py-2 text-sm font-medium shadow-sm"
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
            </div>
          </motion.article>
        ))}
      </div>

      <p className="mt-4 text-center text-sm italic" style={{ color: 'var(--text-muted)' }}>
        {data.footnote}
      </p>
    </section>
  );
}
```

- [ ] **Step 4: Run projects test**

```bash
npm run test:run -- src/components/sections/__tests__/projects.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/projects.tsx src/components/sections/__tests__/projects.test.tsx
git commit -m "feat(sections): rewrite Projects with text-only glass cards"
```

---

## Task 24: Add Experience section

**Files:**

- Create: `src/components/sections/experience.tsx`
- Create: `src/components/sections/__tests__/experience.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/sections/__tests__/experience.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Experience } from '@/components/sections/experience';

import type { ExperienceSectionData } from '@/types';

const experienceData: ExperienceSectionData = {
  eyebrow: 'Career path',
  headlinePrefix: 'Professional',
  headlineHighlight: 'experience',
  description: '8+ years.',
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
  earlierLine: 'Earlier roles available on request.',
};

describe('Experience', () => {
  it('renders the eyebrow, headline, and description', () => {
    render(<Experience data={experienceData} />);
    expect(screen.getByText(/career path/i)).toBeInTheDocument();
    expect(screen.getByText(/professional/i)).toBeInTheDocument();
    expect(screen.getByText(/experience/i)).toBeInTheDocument();
    expect(screen.getByText(/8\+ years/i)).toBeInTheDocument();
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

  it('renders the earlierLine below the timeline', () => {
    render(<Experience data={experienceData} />);
    expect(screen.getByText(/earlier roles available on request/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test (expect fail — module not found)**

```bash
npm run test:run -- src/components/sections/__tests__/experience.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Create the component**

`src/components/sections/experience.tsx`:

```tsx
'use client';

import { motion } from 'motion/react';

import { Badge } from '@/components/ui';

import type { ExperienceSectionData } from '@/types';

interface ExperienceProps {
  data: ExperienceSectionData;
}

const easeOut = [0.16, 1, 0.3, 1] as const;
const inView = { once: true, margin: '-100px' } as const;

export function Experience({ data }: ExperienceProps) {
  return (
    <section
      id="experience"
      className="relative z-20 flex w-full max-w-[1400px] flex-col gap-12 px-6 py-32 sm:px-12 lg:flex-row lg:gap-16"
    >
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={inView}
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

        <p className="mt-2 text-center text-sm italic" style={{ color: 'var(--text-muted)' }}>
          {data.earlierLine}
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run experience test**

```bash
npm run test:run -- src/components/sections/__tests__/experience.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/experience.tsx src/components/sections/__tests__/experience.test.tsx
git commit -m "feat(sections): add Experience timeline with sticky intro column"
```

---

## Task 25: Add Initiatives section

**Files:**

- Create: `src/components/sections/initiatives.tsx`
- Create: `src/components/sections/__tests__/initiatives.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/sections/__tests__/initiatives.test.tsx`:

```tsx
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
      subtitle: 'NLP & AI',
      description: 'Multilingual extraction.',
      tags: ['NLP', 'CI/CD'],
    },
    {
      icon: 'map',
      title: 'Lalana',
      subtitle: 'Geospatial',
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

  it('renders each initiative with title, subtitle, description, and tags', () => {
    render(<Initiatives data={initiativesData} />);
    expect(screen.getByText('Visa Insight')).toBeInTheDocument();
    expect(screen.getByText('NLP & AI')).toBeInTheDocument();
    expect(screen.getByText('Multilingual extraction.')).toBeInTheDocument();
    expect(screen.getByText('NLP')).toBeInTheDocument();
    expect(screen.getByText('Lalana')).toBeInTheDocument();
    expect(screen.getByText('Geospatial')).toBeInTheDocument();
    expect(screen.getByText('Routing backend.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test (expect fail)**

```bash
npm run test:run -- src/components/sections/__tests__/initiatives.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Create the component**

`src/components/sections/initiatives.tsx`:

```tsx
'use client';

import { motion } from 'motion/react';

import { Badge } from '@/components/ui';
import { iconRegistry } from '@/lib/icons';

import type { InitiativesSectionData } from '@/types';

interface InitiativesProps {
  data: InitiativesSectionData;
}

const easeOut = [0.16, 1, 0.3, 1] as const;
const inView = { once: true, margin: '-100px' } as const;

export function Initiatives({ data }: InitiativesProps) {
  return (
    <section
      id="initiatives"
      className="relative z-20 flex w-full max-w-[1400px] flex-col gap-12 px-6 py-32 sm:px-12"
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={inView}
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
              viewport={inView}
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
                <p className="mt-1 text-sm italic text-indigo-400">{item.subtitle}</p>
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

- [ ] **Step 4: Run initiatives test**

```bash
npm run test:run -- src/components/sections/__tests__/initiatives.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/initiatives.tsx src/components/sections/__tests__/initiatives.test.tsx
git commit -m "feat(sections): add Initiatives bento for R&D investments"
```

---

## Task 26: Rewrite Contact section

**Files:**

- Modify: `src/components/sections/contact.tsx`
- Create: `src/components/sections/__tests__/contact.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/sections/__tests__/contact.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Contact } from '@/components/sections/contact';

import type { ContactSectionData } from '@/types';

const contactData: ContactSectionData = {
  eyebrow: 'Next steps',
  headlinePrefix: "Let's work",
  headlineHighlight: 'together',
  description: 'Open to senior backend roles.',
  channels: [
    {
      kind: 'email',
      label: 'nyhasinavalonar@gmail.com',
      href: 'mailto:nyhasinavalonar@gmail.com',
    },
    {
      kind: 'linkedin',
      label: 'linkedin.com/in/ny-randriantsarafara',
      href: 'https://www.linkedin.com/in/ny-randriantsarafara/',
    },
  ],
  details: [
    { label: 'Location', value: 'Pontault-Combault, France' },
    { label: 'Languages', value: 'Malagasy · French · English' },
  ],
  footer: { copyright: 'Ny Hasinavalona Randriantsarafara', tagline: 'Built with care.' },
};

describe('Contact', () => {
  it('renders the eyebrow, headline, and description', () => {
    render(<Contact data={contactData} />);
    expect(screen.getByText(/next steps/i)).toBeInTheDocument();
    expect(screen.getByText(/let's work/i)).toBeInTheDocument();
    expect(screen.getByText(/together/i)).toBeInTheDocument();
    expect(screen.getByText(/open to senior backend roles/i)).toBeInTheDocument();
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

- [ ] **Step 2: Run test (expect fail)**

```bash
npm run test:run -- src/components/sections/__tests__/contact.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Replace the component**

`src/components/sections/contact.tsx`:

```tsx
'use client';

import { motion } from 'motion/react';

import { Badge } from '@/components/ui';
import { iconRegistry } from '@/lib/icons';

import type { ContactChannelKind, ContactSectionData } from '@/types';
import type { IconName } from '@/lib/icons';

interface ContactProps {
  data: ContactSectionData;
}

const channelIconByKind: Record<ContactChannelKind, IconName> = {
  email: 'mail',
  linkedin: 'arrow-up-right',
  github: 'arrow-up-right',
};

const easeOut = [0.16, 1, 0.3, 1] as const;
const inView = { once: true, margin: '-100px' } as const;

export function Contact({ data }: ContactProps) {
  return (
    <section
      id="contact"
      className="relative z-20 mb-24 flex w-full max-w-[1400px] flex-col items-center justify-center overflow-hidden px-6 py-32 sm:px-12"
    >
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={inView}
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
        viewport={inView}
        transition={{ duration: 1, delay: 0.2, ease: easeOut }}
        className="glass-panel z-10 mt-16 grid w-full max-w-3xl grid-cols-1 gap-12 rounded-[3rem] p-8 backdrop-blur-3xl md:p-12 lg:grid-cols-2"
      >
        <div className="flex flex-col gap-8">
          <h3
            className="text-2xl font-medium tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Get in touch
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
                        {channel.kind}
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

- [ ] **Step 4: Run contact test**

```bash
npm run test:run -- src/components/sections/__tests__/contact.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/contact.tsx src/components/sections/__tests__/contact.test.tsx
git commit -m "feat(sections): rewrite Contact with glass panel, channels + details"
```

---

## Task 27: Update sections barrel — drop proof/howIWork/skills, add experience/initiatives

**Files:**

- Modify: `src/components/sections/index.ts`

- [ ] **Step 1: Replace the barrel**

`src/components/sections/index.ts`:

```ts
export { About } from './about';
export { Contact } from './contact';
export { Experience } from './experience';
export { Hero } from './hero';
export { Initiatives } from './initiatives';
export { Projects } from './projects';
```

- [ ] **Step 2: Verify the project compiles via barrel**

```bash
npm run typecheck
```

Expected: still red on `app/(site)/page.tsx` and on `src/components/sections/{proof,how-i-work,skills}.tsx` (deleted in next task), plus `src/components/reveal-provider.tsx`. The new barrel itself compiles.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/index.ts
git commit -m "refactor(sections): drop Proof/HowIWork/Skills, add Experience/Initiatives"
```

---

## Task 28: Delete old section components, types, and reveal-provider

**Files:**

- Delete: `src/components/sections/proof.tsx`
- Delete: `src/components/sections/how-i-work.tsx`
- Delete: `src/components/sections/skills.tsx`
- Delete: `src/types/sections/proof.ts`
- Delete: `src/types/sections/how-i-work.ts`
- Delete: `src/types/sections/skills.ts`
- Modify: `src/types/sections/index.ts`
- Modify: `src/types/index.ts`
- Modify: `src/types/content.ts`
- Modify: `src/lib/content/helpers.ts`
- Modify: `src/lib/content/index.ts`
- Delete: `src/components/reveal-provider.tsx`

- [ ] **Step 1: Delete old section component files**

```bash
rm src/components/sections/proof.tsx
rm src/components/sections/how-i-work.tsx
rm src/components/sections/skills.tsx
```

- [ ] **Step 2: Delete reveal-provider**

```bash
rm src/components/reveal-provider.tsx
```

- [ ] **Step 3: Delete old type files**

```bash
rm src/types/sections/proof.ts
rm src/types/sections/how-i-work.ts
rm src/types/sections/skills.ts
```

- [ ] **Step 4: Update sections types barrel**

Replace `src/types/sections/index.ts` with:

```ts
export type { HeroSection, HeroSectionData, HeroSnapshot, HeroSnapshotStat } from './hero';
export type { ProjectsSection, ProjectsSectionData, Project } from './projects';
export type {
  AboutSection,
  AboutSectionData,
  AboutFeature,
  AboutCoreStack,
  AboutJourney,
  AboutStat,
} from './about';
export type {
  ContactSection,
  ContactSectionData,
  ContactChannel,
  ContactChannelKind,
  ContactDetail,
  ContactFooter,
} from './contact';
export type { ExperienceSection, ExperienceSectionData, ExperienceItem } from './experience';
export type { InitiativesSection, InitiativesSectionData, InitiativeItem } from './initiatives';
```

- [ ] **Step 5: Update top-level types barrel**

Replace `src/types/index.ts` with:

```ts
export type { Link, Image, StatItem } from './common';
export type {
  HeroSection,
  HeroSectionData,
  HeroSnapshot,
  HeroSnapshotStat,
  ProjectsSection,
  ProjectsSectionData,
  Project,
  AboutSection,
  AboutSectionData,
  AboutFeature,
  AboutCoreStack,
  AboutJourney,
  AboutStat,
  ContactSection,
  ContactSectionData,
  ContactChannel,
  ContactChannelKind,
  ContactDetail,
  ContactFooter,
  ExperienceSection,
  ExperienceSectionData,
  ExperienceItem,
  InitiativesSection,
  InitiativesSectionData,
  InitiativeItem,
} from './sections';
export type { SectionType, Section, PageMetadata, PageContent } from './content';
```

- [ ] **Step 6: Update Section discriminated union**

Replace `src/types/content.ts` with:

```ts
import type {
  AboutSection,
  ContactSection,
  ExperienceSection,
  HeroSection,
  InitiativesSection,
  ProjectsSection,
} from './sections';

export type SectionType = 'hero' | 'projects' | 'about' | 'contact' | 'experience' | 'initiatives';

export type Section =
  | HeroSection
  | ProjectsSection
  | AboutSection
  | ContactSection
  | ExperienceSection
  | InitiativesSection;

export interface PageMetadata {
  title: string;
  description: string;
  themeColor?: string;
}

export interface PageContent {
  sections: Section[];
  metadata: PageMetadata;
}
```

- [ ] **Step 7: Drop dead extractors from helpers**

Replace `src/lib/content/helpers.ts` with:

```ts
import type {
  AboutSection,
  ContactSection,
  ExperienceSection,
  HeroSection,
  InitiativesSection,
  PageContent,
  ProjectsSection,
  Section,
  SectionType,
} from '@/types';

export function isSectionType<T extends Section>(section: Section, type: T['type']): section is T {
  return section.type === type;
}

export function extractSection<T extends Section>(
  content: PageContent,
  type: SectionType
): T | undefined {
  return content.sections.find((s) => s.type === type) as T | undefined;
}

export function extractSections<T extends Section>(content: PageContent, type: SectionType): T[] {
  return content.sections.filter((s) => s.type === type) as T[];
}

export const extractHeroSection = (content: PageContent): HeroSection | undefined =>
  extractSection<HeroSection>(content, 'hero');

export const extractProjectsSection = (content: PageContent): ProjectsSection | undefined =>
  extractSection<ProjectsSection>(content, 'projects');

export const extractAboutSection = (content: PageContent): AboutSection | undefined =>
  extractSection<AboutSection>(content, 'about');

export const extractContactSection = (content: PageContent): ContactSection | undefined =>
  extractSection<ContactSection>(content, 'contact');

export const extractExperienceSection = (content: PageContent): ExperienceSection | undefined =>
  extractSection<ExperienceSection>(content, 'experience');

export const extractInitiativesSection = (content: PageContent): InitiativesSection | undefined =>
  extractSection<InitiativesSection>(content, 'initiatives');
```

- [ ] **Step 8: Update content barrel**

Replace `src/lib/content/index.ts` with:

```ts
export { contentService, createContentService } from './service';
export { StaticContentProvider } from './providers';
export type { ContentConfig, ContentProvider } from './types';
export {
  extractAboutSection,
  extractContactSection,
  extractExperienceSection,
  extractHeroSection,
  extractInitiativesSection,
  extractProjectsSection,
  extractSection,
  extractSections,
  isSectionType,
} from './helpers';
```

- [ ] **Step 9: Verify no stale references**

```bash
rg "ProofSection|SkillsSection|HowIWorkSection|extractProofSection|extractSkillsSection|extractHowIWorkSection|reveal-provider|RevealProvider" src app
```

Expected: zero matches.

- [ ] **Step 10: Run all tests**

```bash
npm run test:run
```

Expected: all PASS.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "refactor: remove Proof/HowIWork/Skills sections, types, helpers, RevealProvider"
```

---

## Task 29: Rewrite the page to use the new sections

**Files:**

- Modify: `app/(site)/page.tsx`

- [ ] **Step 1: Replace the page**

`app/(site)/page.tsx`:

```tsx
import { AmbientBackground, Footer, Navbar, Section } from '@/components/layout';
import { About, Contact, Experience, Hero, Initiatives, Projects } from '@/components/sections';
import {
  contentService,
  extractAboutSection,
  extractContactSection,
  extractExperienceSection,
  extractHeroSection,
  extractInitiativesSection,
  extractProjectsSection,
} from '@/lib/content';
import { getSiteUrl, parseTitleParts } from '@/lib/seo';

export default async function Home() {
  const content = await contentService.getPageContent();

  const hero = extractHeroSection(content);
  const about = extractAboutSection(content);
  const projects = extractProjectsSection(content);
  const experience = extractExperienceSection(content);
  const initiatives = extractInitiativesSection(content);
  const contact = extractContactSection(content);

  const { name } = parseTitleParts(content.metadata.title);
  const siteUrl = getSiteUrl().toString().replace(/\/$/, '');

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name,
      jobTitle: hero?.data.snapshot.role,
      url: siteUrl,
      email: hero?.data.email,
      description: content.metadata.description,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name,
      url: siteUrl,
      description: content.metadata.description,
    },
  ];

  return (
    <>
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:px-4 focus:py-2"
        style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
      >
        Skip to content
      </a>

      <AmbientBackground />

      <main id="main" className="relative z-10 flex w-full flex-col items-center pb-24 md:pb-32">
        {hero && <Hero data={hero.data} />}

        {about && (
          <Section id="about-wrapper">
            <About data={about.data} />
          </Section>
        )}

        {projects && (
          <Section id="projects-wrapper">
            <Projects data={projects.data} />
          </Section>
        )}

        {experience && (
          <Section id="experience-wrapper">
            <Experience data={experience.data} />
          </Section>
        )}

        {initiatives && (
          <Section id="initiatives-wrapper">
            <Initiatives data={initiatives.data} />
          </Section>
        )}

        {contact && (
          <Section id="contact-wrapper">
            <Contact data={contact.data} />
          </Section>
        )}
      </main>

      {contact && (
        <Footer data={contact.data.footer} location={contact.data.details[0]?.value ?? ''} />
      )}

      <Navbar />
    </>
  );
}
```

(JSON-LD note: in App Router, a `<script type="application/ld+json">` element with a JSON string child is rendered as inline text in SSR'd HTML; SEO crawlers see it. Our data is hardcoded — no risk of `</script>` collision. The wrapper `<Section>` ids are distinct from the inner section ids the Navbar's scroll-spy targets — the inner sections [`#hero`, `#about`, `#projects`, `#experience`, `#contact`] declare their own ids at their `<section>` root. Hash links resolve to the innermost matching id.)

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Run all tests**

```bash
npm run test:run
```

Expected: PASS.

- [ ] **Step 4: Run build**

```bash
npm run build
```

Expected: build succeeds. The `out/` directory is regenerated.

- [ ] **Step 5: Commit**

```bash
git add app/\(site\)/page.tsx
git commit -m "feat(page): wire AmbientBackground, Navbar, Footer + new section order"
```

---

## Task 30: Update SEO test for the new title shape (if needed)

**Files:**

- Modify (maybe): `src/lib/__tests__/seo.test.ts`

- [ ] **Step 1: Read the existing test**

```bash
cat src/lib/__tests__/seo.test.ts
```

- [ ] **Step 2: If the test asserts on the literal string `Senior Software Engineer`, update the fixture title to `Ny Hasinavalona Randriantsarafara — Senior Backend & Cloud Engineer | Software Architect` and update the asserted role to `Senior Backend & Cloud Engineer | Software Architect`. The signature of `parseTitleParts` is unchanged, so structural assertions on the `name` field continue to pass.**

- [ ] **Step 3: Run seo test**

```bash
npm run test:run -- src/lib/__tests__/seo.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit if changed**

```bash
git add src/lib/__tests__/seo.test.ts
git commit -m "test(seo): align fixture with new metadata title"
```

(Skip the commit if no file changed.)

---

## Task 31: Verify no stale `Geist_Mono` or `tagline` keyword extraction

**Files:** none (verification only).

- [ ] **Step 1: Verify no stale Geist_Mono usage**

```bash
rg "Geist_Mono|font-geist-mono" src app
```

Expected: zero matches.

- [ ] **Step 2: Verify no stale `tagline` keyword extraction**

```bash
rg "tagline.*split|keywords:.*tagline" src app
```

Expected: zero matches.

- [ ] **Step 3: No commit needed if both checks pass.**

---

## Task 32: Smoke test — full validate + build + dev server

**Files:** none

- [ ] **Step 1: Run full validation**

```bash
npm run validate
```

Expected: typecheck + lint + format:check all PASS.

- [ ] **Step 2: Run all tests**

```bash
npm run test:run
```

Expected: all PASS.

- [ ] **Step 3: Run static build**

```bash
npm run build
```

Expected: build completes without errors. `out/` contains the static export.

- [ ] **Step 4: Verify resume + key sections in output**

```bash
ls out/documents/resume.pdf && grep -l "EU Blue Card" out/index.html
```

Expected: resume PDF exists; `out/index.html` contains the availability badge text.

- [ ] **Step 5: Manual smoke (dev server)**

```bash
npm run dev
```

Open `http://localhost:3000` and verify in a browser:

- [ ] Light theme renders with off-white background, glass cards visible, gradient italic text in Hero/About/Projects/Experience/Initiatives/Contact
- [ ] Floating navbar at the bottom shows 5 icons + theme toggle
- [ ] Clicking the toggle switches to dark theme; tokens flip; no flash of unstyled content on hard reload
- [ ] Scrolling marks the correct nav item active (pill background slides between items)
- [ ] Resume button downloads/opens the PDF
- [ ] Mobile width (375px in DevTools): hero stacks, floating cards hidden, navbar collapses to icons, no horizontal scroll
- [ ] DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce": ambient blobs stop animating, sections still render content (not stuck at opacity 0)

Stop the dev server (`Ctrl+C`) when satisfied.

- [ ] **Step 6: No commit — validation only.**

---

## Task 33: Update architecture doc

**Files:**

- Modify: `docs/architecture.md`

- [ ] **Step 1: Update the "Sections" listing**

In `docs/architecture.md`, replace the section list:

Old:

```
- Header (sticky navigation)
- Hero (animated lava background, stats)
- Proof (metrics cards)
- Projects (timeline case studies)
- Skills (capabilities grid)
- How I Work (philosophy)
- About (personal story)
- Contact/Footer
```

New:

```
- Floating Navbar (bottom-fixed, scroll-spy, theme toggle)
- AmbientBackground (animated gradient blobs, fixed)
- Hero (gradient italic headline, glass snapshot cards)
- About (bento layout, journey + stat + core stack + 4 capability tiles)
- Projects (alternating glass cards, text-only)
- Experience (vertical timeline from resume, sticky intro)
- Initiatives (bento of R&D items)
- Contact (glass panel, channels + details, no form)
- Footer (copyright, back-to-top, location, tagline)
```

Also update the "Folder Structure" diagram to reflect:

- `src/components/providers/` (new)
- `src/components/layout/`: `ambient-background.tsx`, `navbar.tsx`, `footer.tsx`, `section.tsx` (no `header.tsx`)
- `src/components/sections/`: `hero.tsx`, `about.tsx`, `projects.tsx`, `experience.tsx`, `initiatives.tsx`, `contact.tsx`
- `src/lib/icons.ts` (new)
- `src/hooks/`: `use-scroll-spy.ts` (no `use-reveal.ts`)

Leave the rest of the document — content layer, CMS migration story — unchanged. It's still accurate.

- [ ] **Step 2: Commit**

```bash
git add docs/architecture.md
git commit -m "docs(architecture): reflect new sections and components"
```

---

## Task 34: Open the PR

**Files:** none (git only)

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/portfolio-redesign
```

- [ ] **Step 2: Create the PR**

```bash
gh pr create --title "Portfolio redesign — glass-morphism + dual theme + resume update" --body "$(cat <<'EOF'
## Summary

- Adopts the Figma `portfolio-redesign` visual language: glass-morphism panels, animated ambient gradient blobs, dual light/dark theme, gradient italic accents.
- New page structure: Hero / About / Projects / Experience / Initiatives / Contact + floating bottom navbar + footer.
- New Experience timeline and Initiatives bento sourced from the updated resume (WBD, Euronews, Numer, Novity, Bocasay, ITRAS + Visa Insight, Lalana/Lemurion, Maestro).
- Resume PDF refreshed (EU Blue Card, design-then-implement framing).
- Title aligned with the resume: "Senior Backend & Cloud Engineer | Software Architect".

## Tech changes

- Added: `motion`, `lucide-react`, `next-themes` (~80 KB gz total).
- Removed: `Proof` / `HowIWork` / `Skills` sections (folded into Hero snapshot + About bento + Experience).
- Replaced `useReveal` IntersectionObserver hook with `motion`'s `whileInView`. Added `useScrollSpy` for navbar.
- New typed icon registry (`src/lib/icons.ts`) keeps `content.json` JSON-pure.
- `app/globals.css` rewritten with light/dark CSS-variable token system + `.glass-panel` utility.
- Static export build (`output: 'export'`) preserved.

## Test plan

- [x] `npm run validate` — typecheck + lint + format:check
- [x] `npm run test:run` — all unit tests
- [x] `npm run build` — static export builds clean
- [x] Manual: light + dark themes, scroll-spy, resume download, mobile (375px), reduced-motion

EOF
)"
```

- [ ] **Step 3: Print PR URL** so the user can open it.

---

## Self-Review

### Spec coverage

| Spec section                                                                                                  | Plan task(s)                                    |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| IA: Hero / About / Projects / Experience / Initiatives / Contact + Navbar + Footer                            | Tasks 11–17, 21–26, 29                          |
| Identity update from resume (title, EU Blue Card, location)                                                   | Task 6 (content.json), Task 10 (metadata)       |
| Dropped Proof / HowIWork / Skills                                                                             | Tasks 27, 28                                    |
| Glass-morphism + ambient background + dual theme                                                              | Tasks 9, 10, 11                                 |
| Typography (Geist Sans, gradient italic)                                                                      | Tasks 9, 10, 21–26                              |
| Iconography (lucide, engineer-appropriate)                                                                    | Task 3, used in 14, 21, 22, 25, 26              |
| Motion (whileInView, parallax, layoutId, reduced-motion)                                                      | Tasks 9 (CSS reduced-motion), 11, 14, 15, 21–26 |
| Theme tokens (full --bg-base, --glass-_, --tag-_, --btn-\*)                                                   | Task 9                                          |
| `glass-panel` utility                                                                                         | Task 9                                          |
| Dependencies (motion, lucide-react, next-themes) added; rejected list documented                              | Task 1                                          |
| Server vs client boundaries (server page, client sections)                                                    | Tasks 21–26 (`'use client'`), 29                |
| Content schema with discriminated union + extractors                                                          | Tasks 4, 5, 7, 8, 28                            |
| Icon registry pattern (string keys → typed registry)                                                          | Task 3                                          |
| Floating Navbar with scroll-spy, theme toggle, hover labels                                                   | Task 14                                         |
| Hero with snapshot cards, hidden on mobile                                                                    | Task 21                                         |
| About bento (journey + stat + core stack + 4 capability tiles)                                                | Task 22                                         |
| Projects text-only alternating glass cards + footnote                                                         | Task 23                                         |
| Experience timeline, sticky intro, earlierLine                                                                | Task 24                                         |
| Initiatives bento (3 R&D items)                                                                               | Task 25                                         |
| Contact glass panel, no form, channels + details                                                              | Task 26                                         |
| Footer (copyright, back-to-top, location, tagline)                                                            | Task 15                                         |
| Resume PDF in `public/documents/`                                                                             | Task 2                                          |
| Static export compatibility                                                                                   | Task 32 (build)                                 |
| Validation gates (typecheck, lint, format, tests, build)                                                      | Task 32                                         |
| Tests: kept/updated (button, card, badge, section, helpers, service, seo)                                     | Tasks 8, 16, 18, 19, 20, 30                     |
| Tests: added (hero, about, projects, experience, initiatives, contact, navbar, footer, use-scroll-spy, icons) | Tasks 3, 12, 14, 15, 21–26                      |
| Out of scope (no form, no images, no i18n)                                                                    | Honored throughout — no tasks for these         |
| Architecture doc updated                                                                                      | Task 33                                         |

No spec gaps.

### Placeholder scan

Scanned for "TBD", "TODO", "implement later", "fill in details", "Add appropriate error handling", "Similar to Task N", "Write tests for the above" — none present. Every step that introduces code shows the full code block.

### Type / signature consistency

- `useScrollSpy(sectionIds: readonly string[]): string` — declared in Task 12, consumed in Task 14 with `useScrollSpy(navIds)` where `navIds = navItems.map((item) => item.id)` (`string[]` is assignable to `readonly string[]`). ✓
- `IconName` exported from `src/lib/icons.ts` (Task 3) — imported in Task 4 (`InitiativeItem.icon: IconName`), Task 5 (`AboutFeature.icon: IconName`), Task 14 (`NavItem.icon: IconName`), Task 26 (`channelIconByKind: Record<ContactChannelKind, IconName>`). All keys used in those records (`cloud`, `server`, `database`, `shield-check`, `brain-circuit`, `map`, `workflow`, `home`, `user`, `layers`, `briefcase`, `mail`, `arrow-up-right`, `sparkles`, `download`, `arrow-right`, `map-pin`, `languages`, `sun`, `moon`) are present in the union in Task 3. ✓
- `ContactChannelKind = 'email' | 'linkedin' | 'github'` (Task 5) — `channelIconByKind` in Task 26 covers all three keys. ✓
- `Section` discriminated union — Task 7 includes all 9 types; Task 28 narrows to 6 after deletions (`hero`, `projects`, `about`, `contact`, `experience`, `initiatives`). The intermediate state in Task 7 is required because `extractProofSection` etc. still exist in `helpers.ts` until Task 28. ✓
- `ContactSectionData.footer: ContactFooter` (Task 5) — `Footer` component (Task 15) takes `data: ContactFooter`; page (Task 29) passes `contact.data.footer`. ✓
- `HeroSnapshot.stats: HeroSnapshotStat[]` — Hero component (Task 21) reads `data.snapshot.stats[0]?.value` and `.label`. content.json (Task 6) provides 3 stats; only the first is rendered in the floating card (the other two are reserved for future use — by design, not a bug). ✓
- `ContactSectionData.details[0]?.value` — page (Task 29) passes this as `location` to `<Footer>`. content.json's first detail is `{ label: 'Location', value: 'Pontault-Combault, France' }`. ✓
- `Card` `variant: 'default' | 'glass'`, `Button` `variant: 'primary' | 'glass' | 'ghost'`, `Badge` `variant: 'glass' | 'tag'` — all consistent across Tasks 18–20 and section consumers.

No inconsistencies.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-19-portfolio-redesign.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints.

**Which approach?**
