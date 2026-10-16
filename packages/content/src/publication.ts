import { z } from 'zod';

import { blockSchema } from './blocks.ts';
import { iconSchema } from './icons.ts';
import {
  filledLocalizedListSchema,
  localizedListSchema,
  localizedTextOrEmptySchema,
  localizedTextSchema,
  slugSchema,
  textSchema,
} from './localized.ts';

// A year alone when the month is not known.
const monthSchema = z
  .string()
  .regex(/^\d{4}(-(0[1-9]|1[0-2]))?$/, 'Must be a YYYY-MM month or a YYYY year');
const yearSchema = z.number().int().min(1990).max(2100);
const slugListSchema = z.array(slugSchema);

// The overview texts are optional: publications prepared before them carry none.
const overviewTextSchema = localizedTextSchema.nullable().default(null);

export const profileSchema = z.object({
  name: textSchema,
  headline: localizedTextSchema,
  introduction: localizedTextSchema,
  location: localizedTextOrEmptySchema,
  availability: localizedTextSchema,
  workAuthorization: localizedTextSchema,
  languages: localizedTextSchema,
  email: z.email(),
  linkedinUrl: z.url(),
  githubUrl: z.url(),
  photo: z.object({ fileId: z.uuid(), alt: localizedTextSchema }).nullable(),
  disclosure: localizedTextSchema,
  overview: overviewTextSchema,
  journey: overviewTextSchema,
  experienceSummary: overviewTextSchema,
  coreSkills: overviewTextSchema,
});

export const capabilitySchema = z.object({
  slug: slugSchema,
  icon: iconSchema,
  title: localizedTextSchema,
  description: localizedTextSchema,
});

// The rows of the technologies table, in their order.
export const skillUsages = ['backend', 'aws', 'data', 'delivery', 'frontend', 'tools'] as const;
export const skillUsageSchema = z.enum(skillUsages);

// A French name only when it differs. Publications prepared before either field carry neither.
export const skillSchema = z.object({
  slug: slugSchema,
  name: textSchema,
  frenchName: textSchema.nullable().default(null),
  capabilitySlug: slugSchema,
  usage: skillUsageSchema.nullable().default(null),
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
  // A sample question offered under the project. Publications prepared before it carry none.
  followUpQuestion: localizedTextSchema.nullable().default(null),
  skillSlugs: slugListSchema,
});

// At most one owner: the experience or project whose published texts the value comes from.
// Publications prepared before owners existed carry neither field.
export const keyFigureSchema = z.object({
  slug: slugSchema,
  value: textSchema,
  label: localizedTextSchema,
  ownerExperienceSlug: slugSchema.nullable().default(null),
  ownerProjectSlug: slugSchema.nullable().default(null),
});

// Follow-up questions are offered after the answer. Publications prepared before they existed
// carry none.
export const answerSchema = z.object({
  slug: slugSchema,
  topic: localizedTextSchema,
  sampleQuestions: filledLocalizedListSchema,
  followUpQuestions: localizedListSchema.default({ en: [], fr: [] }),
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

// Shared links show the share texts, or the title and description without them.
export const siteSettingsSchema = z.object({
  title: localizedTextSchema,
  description: localizedTextSchema,
  shareTitle: localizedTextSchema.nullable().default(null),
  shareDescription: localizedTextSchema.nullable().default(null),
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
export type SkillUsage = z.infer<typeof skillUsageSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Project = z.infer<typeof projectSchema>;
export type KeyFigure = z.infer<typeof keyFigureSchema>;
export type Answer = z.infer<typeof answerSchema>;
export type SensitiveTopic = z.infer<typeof sensitiveTopicSchema>;
export type ChatSettings = z.infer<typeof chatSettingsSchema>;
export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export type PublicationContent = z.infer<typeof publicationContentSchema>;
