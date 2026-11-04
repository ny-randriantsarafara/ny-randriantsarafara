import type { PublicationContent } from '@portfolio/content';

import { initialContent } from './initial-content.ts';

const demo = { en: 'Synthetic preview content.', fr: 'Contenu synthétique de prévisualisation.' };

const previewContent: PublicationContent = {
  profile: {
    name: 'Preview Engineer',
    headline: demo,
    introduction: demo,
    location: demo,
    availability: demo,
    workAuthorization: demo,
    languages: { en: 'English, French', fr: 'Anglais, français' },
    email: 'preview@example.invalid',
    linkedinUrl: 'https://example.invalid/profile',
    githubUrl: 'https://example.invalid/code',
    photo: null,
    disclosure: demo,
    overview: demo,
    journey: demo,
    experienceSummary: demo,
    coreSkills: demo,
  },
  capabilities: [{ slug: 'backend', icon: 'server', title: demo, description: demo }],
  skills: [
    {
      slug: 'typescript',
      name: 'TypeScript',
      frenchName: null,
      capabilitySlug: 'backend',
      usage: 'backend',
      featured: true,
    },
  ],
  experiences: [
    {
      slug: 'example-company',
      company: 'Example Company',
      role: demo,
      startMonth: '2024-01',
      endMonth: null,
      location: null,
      summary: demo,
      highlights: { en: ['Example API.'], fr: ['API de démonstration.'] },
      skillSlugs: ['typescript'],
    },
  ],
  projects: [
    {
      slug: 'example-project',
      kind: 'personal',
      icon: 'server',
      title: demo,
      company: null,
      role: null,
      startYear: null,
      endYear: null,
      summary: demo,
      caseStudy: null,
      followUpQuestion: null,
      skillSlugs: ['typescript'],
    },
  ],
  keyFigures: [],
  answers: [
    {
      slug: 'about-me',
      topic: demo,
      sampleQuestions: { en: ['Tell me about yourself'], fr: ['Présente-toi'] },
      followUpQuestions: { en: [], fr: [] },
      text: demo,
      experienceSlugs: ['example-company'],
      projectSlugs: ['example-project'],
      skillSlugs: ['typescript'],
      keyFigureSlugs: [],
      blocks: [{ type: 'timeline' }],
      starter: true,
    },
  ],
  chatSettings: {
    unknownReply: demo,
    refusalReply: demo,
    sensitiveTopics: [],
    suggestedTopics: { en: ['Tell me about yourself'], fr: ['Présente-toi'] },
  },
  siteSettings: {
    title: { en: 'Portfolio preview', fr: 'Prévisualisation du portfolio' },
    description: demo,
    shareTitle: null,
    shareDescription: null,
  },
};

// Used by both the static export and CMS provisioning; production retains its original seed.
export function contentForEnvironment(
  source: Record<string, string | undefined>
): PublicationContent {
  return source.PREVIEW_CONTENT === 'true' ? previewContent : initialContent;
}
