import { figureOwnerName } from '@portfolio/content';

import { cvPath } from '../i18n/locales.ts';

import type { PageSections } from '../../types/page-sections.ts';
import type { Dictionary } from '../i18n/dictionary.ts';
import type {
  Capability,
  Experience,
  IconName,
  KeyFigure,
  Locale,
  LocalizedList,
  LocalizedText,
  Project,
  PublicationContent,
  Skill,
} from '@portfolio/content';

function localized(text: LocalizedText, locale: Locale): string {
  return text[locale];
}

function localizedBullets(list: LocalizedList, locale: Locale): readonly string[] {
  if (locale === 'fr') {
    return list.fr;
  }
  return list.en;
}

type PeriodLabels = Dictionary['periods'];

function monthDate(month: string): Date {
  return new Date(`${month}-01T00:00:00.000Z`);
}

// A year alone stays a year: no month is invented.
function formatKnownDate(date: string, locale: Locale): string {
  if (date.length === 4) {
    return date;
  }
  const formatter = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return formatter.format(monthDate(date));
}

function formatPeriod(
  start: string,
  end: string | null,
  locale: Locale,
  labels: PeriodLabels
): string {
  if (end === null) {
    return capitalized(`${labels.since} ${start}`, locale);
  }
  if (start === end) {
    return capitalized(start, locale);
  }
  return capitalized(`${start} ${labels.until} ${end}`, locale);
}

function capitalized(text: string, locale: Locale): string {
  return `${text.charAt(0).toLocaleUpperCase(locale)}${text.slice(1)}`;
}

export function formatMonthPeriod(
  startMonth: string,
  endMonth: string | null,
  locale: Locale,
  labels: PeriodLabels
): string {
  const start = formatKnownDate(startMonth, locale);
  if (endMonth === null) {
    return formatPeriod(start, null, locale, labels);
  }
  return formatPeriod(start, formatKnownDate(endMonth, locale), locale, labels);
}

export function formatYearPeriod(
  startYear: number | null,
  endYear: number | null,
  locale: Locale,
  labels: PeriodLabels
): string {
  if (startYear !== null && endYear !== null) {
    return formatPeriod(String(startYear), String(endYear), locale, labels);
  }
  if (startYear !== null) {
    return formatPeriod(String(startYear), null, locale, labels);
  }
  if (endYear !== null) {
    return String(endYear);
  }
  return '';
}

export function skillNames(slugs: readonly string[], skills: readonly Skill[]): string[] {
  const bySlug = new Map(skills.map((skill) => [skill.slug, skill.name]));
  return slugs.flatMap((slug) => {
    const name = bySlug.get(slug);
    if (name === undefined) {
      return [];
    }
    return [name];
  });
}

export function featuredSkillNames(skills: readonly Skill[], limit: number): string[] {
  return skills
    .filter((skill) => skill.featured)
    .slice(0, limit)
    .map((skill) => skill.name);
}

export function channelLabel(url: string): string {
  const parsed = new URL(url);
  const host = parsed.hostname.replace(/^www\./, '');
  const path = parsed.pathname.replace(/\/$/, '');
  if (path.length === 0) {
    return host;
  }
  return `${host}${path}`;
}

// A figure shown outside its experience must still say whose it is, unless its label already does.
export function figureCaption(
  content: PublicationContent,
  figure: KeyFigure,
  locale: Locale
): string {
  const label = localized(figure.label, locale);
  const owner = figureOwnerName(content, figure, locale);
  if (owner === null || label.toLowerCase().includes(owner.toLowerCase())) {
    return label;
  }
  return `${label} — ${owner}`;
}

function resolveIcon(icon: IconName | null): IconName {
  if (icon === null) {
    return 'sparkles';
  }
  return icon;
}

function buildHero(
  content: PublicationContent,
  locale: Locale,
  dictionary: Dictionary
): PageSections['hero'] {
  const { profile, skills, keyFigures } = content;
  const featured = featuredSkillNames(skills, 3);
  const taglineParts = [localized(profile.location, locale), ...featured].filter(
    (part) => part.length > 0
  );
  const headline = localized(profile.headline, locale);
  const introduction = localized(profile.introduction, locale);
  return {
    tagline: taglineParts.join(' · '),
    availabilityBadge: localized(profile.availability, locale),
    headlinePrefix: dictionary.hero.headlinePrefix,
    headlineHighlight: dictionary.hero.headlineHighlight,
    headlineSuffix: dictionary.hero.headlineSuffix,
    subheadline: `${headline}. ${introduction}`,
    primaryCta: { label: dictionary.hero.primaryCta, href: '#projects' },
    secondaryCta: { label: dictionary.hero.secondaryCta, href: cvPath(locale) },
    email: profile.email,
    focusLabel: dictionary.hero.focusLabel,
    stackLabel: dictionary.hero.stackLabel,
    snapshot: {
      role: headline,
      location: localized(profile.location, locale),
      stats: keyFigures.map((figure) => ({
        value: figure.value,
        label: figureCaption(content, figure, locale),
      })),
      stack: featuredSkillNames(skills, 3),
    },
  };
}

function firstKeyFigure(
  content: PublicationContent,
  locale: Locale
): PageSections['about']['stat'] {
  const [first] = content.keyFigures;
  if (first === undefined) {
    return null;
  }
  return {
    value: first.value,
    label: figureCaption(content, first, locale),
  };
}

function buildAbout(
  content: PublicationContent,
  locale: Locale,
  dictionary: Dictionary
): PageSections['about'] {
  const { profile, capabilities, skills } = content;
  const journeyParagraphs = [
    localized(profile.introduction, locale),
    localized(profile.availability, locale),
    localized(profile.workAuthorization, locale),
  ];
  return {
    eyebrow: dictionary.about.eyebrow,
    headlinePrefix: dictionary.about.headlinePrefix,
    headlineHighlight: dictionary.about.headlineHighlight,
    headlineSuffix: dictionary.about.headlineSuffix,
    journeyTitle: dictionary.about.journeyTitle,
    journeyParagraphs,
    stat: firstKeyFigure(content, locale),
    coreStackTitle: dictionary.about.coreStackTitle,
    coreStack: skills.filter((skill) => skill.featured).map((skill) => skill.name),
    features: capabilities.map((capability: Capability) => ({
      icon: capability.icon,
      title: localized(capability.title, locale),
      description: localized(capability.description, locale),
    })),
  };
}

function buildProjects(
  content: PublicationContent,
  locale: Locale,
  dictionary: Dictionary
): PageSections['projects'] {
  const professional = content.projects.filter((project) => project.kind === 'professional');
  return {
    eyebrow: dictionary.projects.eyebrow,
    headlinePrefix: dictionary.projects.headlinePrefix,
    headlineHighlight: dictionary.projects.headlineHighlight,
    footnote: dictionary.projects.footnote,
    items: professional.map((project: Project) => ({
      title: localized(project.title, locale),
      role: project.role === null ? '' : localized(project.role, locale),
      year: formatYearPeriod(project.startYear, project.endYear, locale, dictionary.periods),
      company: project.company ?? '',
      description: localized(project.summary, locale),
      tech: skillNames(project.skillSlugs, content.skills),
    })),
  };
}

function buildExperience(
  content: PublicationContent,
  locale: Locale,
  dictionary: Dictionary
): PageSections['experience'] {
  return {
    eyebrow: dictionary.experience.eyebrow,
    headlinePrefix: dictionary.experience.headlinePrefix,
    headlineHighlight: dictionary.experience.headlineHighlight,
    description: dictionary.experience.description,
    items: content.experiences.map((experience: Experience) => ({
      company: experience.company,
      role: localized(experience.role, locale),
      period: formatMonthPeriod(
        experience.startMonth,
        experience.endMonth,
        locale,
        dictionary.periods
      ),
      location: experience.location ?? '',
      bullets: [...localizedBullets(experience.highlights, locale)],
      tech: skillNames(experience.skillSlugs, content.skills),
    })),
  };
}

function buildInitiatives(
  content: PublicationContent,
  locale: Locale,
  dictionary: Dictionary
): PageSections['initiatives'] {
  const personal = content.projects.filter((project) => project.kind === 'personal');
  return {
    eyebrow: dictionary.initiatives.eyebrow,
    headlinePrefix: dictionary.initiatives.headlinePrefix,
    headlineHighlight: dictionary.initiatives.headlineHighlight,
    description: dictionary.initiatives.description,
    items: personal.map((project: Project) => ({
      icon: resolveIcon(project.icon),
      title: localized(project.title, locale),
      description: localized(project.summary, locale),
      tags: skillNames(project.skillSlugs, content.skills),
    })),
  };
}

function channelKindLabel(kind: 'email' | 'linkedin' | 'github', dictionary: Dictionary): string {
  if (kind === 'email') {
    return dictionary.contact.channelEmail;
  }
  if (kind === 'linkedin') {
    return dictionary.contact.channelLinkedin;
  }
  return dictionary.contact.channelGithub;
}

function channelKind(url: string): 'email' | 'linkedin' | 'github' {
  if (url.startsWith('mailto:')) {
    return 'email';
  }
  if (url.includes('linkedin.com')) {
    return 'linkedin';
  }
  return 'github';
}

function buildContact(
  content: PublicationContent,
  locale: Locale,
  dictionary: Dictionary
): PageSections['contact'] {
  const { profile } = content;
  const channelUrls = [
    { href: `mailto:${profile.email}` },
    { href: profile.linkedinUrl },
    { href: profile.githubUrl },
  ];
  const channels = channelUrls.map(({ href }) => {
    const kind = channelKind(href);
    const kindLabel = channelKindLabel(kind, dictionary);
    const label = kind === 'email' ? profile.email : channelLabel(href);
    return {
      kind,
      kindLabel,
      label,
      href,
    };
  });
  return {
    eyebrow: dictionary.contact.eyebrow,
    headlinePrefix: dictionary.contact.headlinePrefix,
    headlineHighlight: dictionary.contact.headlineHighlight,
    description: localized(profile.availability, locale),
    ctaLabel: dictionary.contact.cta,
    channels,
    details: [
      {
        label: dictionary.contact.locationLabel,
        value: localized(profile.location, locale),
      },
      {
        label: dictionary.contact.languagesLabel,
        value: localized(profile.languages, locale),
      },
      {
        label: dictionary.contact.statusLabel,
        value: localized(profile.workAuthorization, locale),
      },
    ].filter((detail) => detail.value.length > 0),
  };
}

function buildFooter(
  content: PublicationContent,
  locale: Locale,
  dictionary: Dictionary
): PageSections['footer'] {
  return {
    copyright: content.profile.name,
    tagline: dictionary.footer.tagline,
    location: localized(content.profile.location, locale),
    backToTop: dictionary.footer.backToTop,
  };
}

export function buildPageSections(
  content: PublicationContent,
  locale: Locale,
  dictionary: Dictionary
): PageSections {
  return {
    hero: buildHero(content, locale, dictionary),
    about: buildAbout(content, locale, dictionary),
    projects: buildProjects(content, locale, dictionary),
    experience: buildExperience(content, locale, dictionary),
    initiatives: buildInitiatives(content, locale, dictionary),
    contact: buildContact(content, locale, dictionary),
    footer: buildFooter(content, locale, dictionary),
  };
}
