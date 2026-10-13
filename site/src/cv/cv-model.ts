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
