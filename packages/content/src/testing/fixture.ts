import type { ActivePublication } from '../active-publication.ts';
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
  ownerExperienceSlug: null,
  ownerProjectSlug: null,
};

export const coverageFigure: KeyFigure = {
  slug: 'coverage-achieved',
  value: '82%',
  label: { en: 'Coverage achieved', fr: 'Couverture atteinte' },
  ownerExperienceSlug: 'itras-group',
  ownerProjectSlug: null,
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

export const activePublicationFixture: ActivePublication = {
  publicationId: '3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42',
  activatedAt: '2026-10-13T08:00:00.000Z',
  content: contentFixture,
};
