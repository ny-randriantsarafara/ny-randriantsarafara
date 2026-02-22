import { z } from 'zod';

const linkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  external: z.boolean().optional(),
});

const statItemSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
});

export const metadataSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  themeColor: z.string().optional(),
});

export const heroDataSchema = z.object({
  tagline: z.string().min(1),
  headline: z.string().min(1),
  highlightedText: z.string().min(1),
  subheadline: z.string().min(1),
  primaryCta: linkSchema,
  secondaryCta: linkSchema,
  email: z.string().email(),
  trustedBy: z.array(z.string().min(1)),
  snapshot: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    availability: z.string().min(1),
    stats: z.array(statItemSchema),
    footer: z.string().min(1),
  }),
});

export const heroSchema = z.object({
  type: z.literal('hero'),
  id: z.string().min(1),
  data: heroDataSchema,
});

const metricSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  detail: z.string().min(1),
});

export const proofDataSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string(),
  metrics: z.array(metricSchema),
  practiceItems: z.array(z.string().min(1)),
});

export const proofSchema = z.object({
  type: z.literal('proof'),
  id: z.string().min(1),
  data: proofDataSchema,
});

const projectSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  tech: z.array(z.string().min(1)),
  note: z.string().optional(),
});

export const projectsDataSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string(),
  projects: z.array(projectSchema),
});

export const projectsSchema = z.object({
  type: z.literal('projects'),
  id: z.string().min(1),
  data: projectsDataSchema,
});

const skillSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  details: z.string().min(1),
});

export const skillsDataSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string(),
  skills: z.array(skillSchema),
});

export const skillsSchema = z.object({
  type: z.literal('skills'),
  id: z.string().min(1),
  data: skillsDataSchema,
});

export const howIWorkDataSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  principles: z.array(z.string().min(1)),
  signature: z.string(),
});

export const howIWorkSchema = z.object({
  type: z.literal('how-i-work'),
  id: z.string().min(1),
  data: howIWorkDataSchema,
});

const quickDetailSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

export const aboutDataSchema = z.object({
  title: z.string().min(1),
  paragraphs: z.array(z.string().min(1)),
  quickDetails: z.array(quickDetailSchema),
  signature: z.object({
    label: z.string(),
    text: z.string(),
  }),
});

export const aboutSchema = z.object({
  type: z.literal('about'),
  id: z.string().min(1),
  data: aboutDataSchema,
});

export const contactDataSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  links: z.array(linkSchema),
  footer: z.object({
    copyright: z.string().min(1),
    tagline: z.string().min(1),
  }),
});

export const contactSchema = z.object({
  type: z.literal('contact'),
  id: z.string().min(1),
  data: contactDataSchema,
});

export const navigationSchema = z.object({
  links: z.array(linkSchema),
});

export const siteLabelsSchema = z.object({
  trustedBy: z.string().min(1),
  quickDetails: z.string().min(1),
  scrollBreathVerify: z.string().min(1),
  practiceHeading: z.string().min(1),
  techLabel: z.string().min(1),
  philosophyLine1: z.string().min(1),
  philosophyLine2: z.string().min(1),
  skipToContent: z.string().min(1),
  locationText: z.string().min(1),
});

export const siteSettingsSchema = z.object({
  brandName: z.string().min(1),
  roleText: z.string().min(1),
  ctaText: z.string().min(1),
  labels: siteLabelsSchema,
});

const schemaMap: Record<string, z.ZodType> = {
  metadata: metadataSchema,
  hero: heroSchema,
  proof: proofSchema,
  projects: projectsSchema,
  skills: skillsSchema,
  'how-i-work': howIWorkSchema,
  about: aboutSchema,
  contact: contactSchema,
  navigation: navigationSchema,
  'site-settings': siteSettingsSchema,
};

export function getSchemaForKey(key: string): z.ZodType | undefined {
  return schemaMap[key];
}
