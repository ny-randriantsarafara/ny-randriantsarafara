import { localePath } from '../i18n/locales.ts';
import { featuredSkillNames } from '../publication/sections.ts';

import type { ActivePublication, Locale } from '@portfolio/content';

type JsonLdValue = string | number | boolean | null | JsonLdObject | JsonLdValue[];

type JsonLdObject = {
  [key: string]: JsonLdValue;
};

function localizedText(
  publication: ActivePublication,
  locale: Locale,
  field: { en: string; fr: string }
): string {
  if (locale === 'fr') {
    return field.fr;
  }
  return field.en;
}

function currentEmployer(publication: ActivePublication): JsonLdObject | null {
  const experience = publication.content.experiences.find((item) => item.endMonth === null);
  if (experience === undefined) {
    return null;
  }
  return {
    '@type': 'Organization',
    name: experience.company,
  };
}

export function buildProfilePageJsonLd(
  publication: ActivePublication,
  locale: Locale,
  siteUrl: URL
): JsonLdObject {
  const { profile, skills } = publication.content;
  const pageUrl = new URL(localePath(locale), siteUrl).toString();
  const employer = currentEmployer(publication);
  const person: JsonLdObject = {
    '@type': 'Person',
    name: profile.name,
    jobTitle: localizedText(publication, locale, profile.headline),
    description: localizedText(publication, locale, profile.introduction),
    email: `mailto:${profile.email}`,
    url: pageUrl,
    sameAs: [profile.linkedinUrl, profile.githubUrl],
    knowsAbout: featuredSkillNames(skills, skills.length),
    knowsLanguage: localizedText(publication, locale, profile.languages),
    homeLocation: {
      '@type': 'Place',
      name: localizedText(publication, locale, profile.location),
    },
  };
  if (employer !== null) {
    person.worksFor = employer;
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: person,
    inLanguage: locale,
    url: pageUrl,
    dateModified: publication.activatedAt,
  };
}

export function serializeJsonLd(value: JsonLdObject): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function buildPageJsonLdScript(
  publication: ActivePublication,
  locale: Locale,
  siteUrl: URL
): string {
  const payload = buildProfilePageJsonLd(publication, locale, siteUrl);
  return serializeJsonLd(payload);
}
