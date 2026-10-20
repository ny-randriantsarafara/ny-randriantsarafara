import { localeSchema, type Locale } from './localized.ts';
import type { Experience, KeyFigure, Project, PublicationContent } from './publication.ts';

export type FigureUnit = 'percent' | 'million' | 'thousand' | 'count';
export type Figure = { amount: number; unit: FigureUnit };
export type FigureOwner = { kind: 'experience' | 'project'; slug: string };

const COMPANY_NAME_SEPARATOR = /\s*[,·/]\s*/;
// "mission Euronews", "groupe HEI": the word that introduces a client or a parent company.
const AFFILIATION_PREFIX = /^(?:mission|groupe|group)\s+/iu;

// "one"/"un" are left out: they are articles far more often than quantities.
const NUMBER_WORDS = new Map<string, number>([
  ['two', 2],
  ['three', 3],
  ['four', 4],
  ['five', 5],
  ['six', 6],
  ['seven', 7],
  ['eight', 8],
  ['nine', 9],
  ['ten', 10],
  ['twelve', 12],
  ['twenty', 20],
  ['deux', 2],
  ['trois', 3],
  ['quatre', 4],
  ['cinq', 5],
  ['sept', 7],
  ['huit', 8],
  ['neuf', 9],
  ['dix', 10],
  ['douze', 12],
  ['vingt', 20],
]);

// Digits glued to letters or slashes are product names ("EC2", "k6", "HTTP/2"), not figures.
const FIGURE_PATTERN = new RegExp(
  String.raw`(?<![\p{L}\p{N}.,/])(\d+(?:[.,]\d+)?|(?:${[...NUMBER_WORDS.keys()].join('|')})(?!\p{L}))` +
    String.raw`(?:\s*(%|percent|pour\s+cent|millions?|m(?!\p{L})|k(?![\p{L}\p{N}])|thousand|milliers?|mille))?`,
  'gu'
);

export function figuresInText(text: string): Figure[] {
  const plain = text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  return [...plain.matchAll(FIGURE_PATTERN)].flatMap((match) => {
    const amount = parseAmount(match[1] ?? '');
    if (amount === null) {
      return [];
    }
    return [{ amount, unit: parseUnit(match[2]) }];
  });
}

export function parseFigureValue(value: string): Figure | null {
  return figuresInText(value)[0] ?? null;
}

export function sameFigure(left: Figure, right: Figure): boolean {
  return left.unit === right.unit && Math.abs(left.amount - right.amount) < 1e-9;
}

export function textMentionsFigure(text: string, figure: Figure): boolean {
  return figuresInText(text).some((candidate) => sameFigure(candidate, figure));
}

export function companyKey(company: string): string {
  return company
    .replace(/\([^)]*\)/g, '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

// "Anywr, mission Euronews", "Warner Bros. Discovery (Eurosport)": the employer, then the client,
// parent company or brand it names.
export function companyNames(company: string): string[] {
  const parenthesised = [...company.matchAll(/\(([^)]+)\)/g)].map((match) => match[1] ?? '');
  const separated = company.replace(/\([^)]*\)/g, '').split(COMPANY_NAME_SEPARATOR);
  const names = [...separated, ...parenthesised]
    .map((name) => name.replace(AFFILIATION_PREFIX, '').trim())
    .filter((name) => name.length > 0);
  return [...new Set(names)];
}

// The company key of the experience a project was run at: the one whose company it repeats,
// otherwise the only one that names it ("Euronews" for "Anywr, mission Euronews").
export function projectEmployerKey(
  project: Project,
  experiences: readonly Experience[]
): string | null {
  if (project.company === null) {
    return null;
  }
  const key = companyKey(project.company);
  const employerKeys = [
    ...new Set(experiences.map((experience) => companyKey(experience.company))),
  ];
  if (employerKeys.includes(key)) {
    return key;
  }
  const naming = new Set(
    experiences
      .filter((experience) =>
        companyNames(experience.company).some((name) => companyKey(name) === key)
      )
      .map((experience) => companyKey(experience.company))
  );
  if (naming.size !== 1) {
    return null;
  }
  return [...naming][0] ?? null;
}

export function experienceTexts(experience: Experience, locale: Locale): string[] {
  return [experience.summary[locale], ...experience.highlights[locale]];
}

export function projectTexts(project: Project, locale: Locale): string[] {
  const caseStudy = project.caseStudy === null ? [] : [project.caseStudy[locale]];
  return [project.summary[locale], ...caseStudy];
}

export function ownerTexts(
  content: PublicationContent,
  owner: FigureOwner,
  locale: Locale
): string[] | null {
  if (owner.kind === 'experience') {
    const experience = content.experiences.find((candidate) => candidate.slug === owner.slug);
    return experience === undefined ? null : experienceTexts(experience, locale);
  }
  const project = content.projects.find((candidate) => candidate.slug === owner.slug);
  return project === undefined ? null : projectTexts(project, locale);
}

export function declaredFigureOwner(keyFigure: KeyFigure): FigureOwner | null {
  if (keyFigure.ownerExperienceSlug !== null) {
    return { kind: 'experience', slug: keyFigure.ownerExperienceSlug };
  }
  if (keyFigure.ownerProjectSlug !== null) {
    return { kind: 'project', slug: keyFigure.ownerProjectSlug };
  }
  return null;
}

// The declared owner wins. Otherwise the owner is the only experience (with its own projects)
// or personal project whose published texts contain the value; anything else stays unattributed.
export function figureOwner(content: PublicationContent, keyFigure: KeyFigure): FigureOwner | null {
  const declared = declaredFigureOwner(keyFigure);
  if (declared !== null) {
    return declared;
  }
  const figure = parseFigureValue(keyFigure.value);
  if (figure === null) {
    return null;
  }
  const experiences = content.experiences.filter((experience) =>
    mentionsInAnyLocale(figure, (locale) => experienceTexts(experience, locale))
  );
  const ownerCompanies = new Set(experiences.map((experience) => companyKey(experience.company)));
  const projects = content.projects.filter((project) => {
    const employerKey = projectEmployerKey(project, content.experiences);
    return (
      mentionsInAnyLocale(figure, (locale) => projectTexts(project, locale)) &&
      (employerKey === null || !ownerCompanies.has(employerKey))
    );
  });
  const owners = [
    ...experiences.map(
      (experience): FigureOwner => ({ kind: 'experience', slug: experience.slug })
    ),
    ...projects.map((project): FigureOwner => ({ kind: 'project', slug: project.slug })),
  ];
  if (owners.length !== 1) {
    return null;
  }
  return owners[0] ?? null;
}

// The employer or project a visitor should read next to the figure; null for a profile-wide one.
export function figureOwnerName(
  content: PublicationContent,
  keyFigure: KeyFigure,
  locale: Locale
): string | null {
  const owner = figureOwner(content, keyFigure);
  if (owner === null) {
    return null;
  }
  if (owner.kind === 'experience') {
    const experience = content.experiences.find((candidate) => candidate.slug === owner.slug);
    return experience?.company ?? null;
  }
  const project = content.projects.find((candidate) => candidate.slug === owner.slug);
  return project?.title[locale] ?? null;
}

function mentionsInAnyLocale(
  figure: Figure,
  textsFor: (locale: Locale) => readonly string[]
): boolean {
  return localeSchema.options.some((locale) =>
    textsFor(locale).some((text) => textMentionsFigure(text, figure))
  );
}

function parseAmount(raw: string): number | null {
  const word = NUMBER_WORDS.get(raw);
  if (word !== undefined) {
    return word;
  }
  const amount = Number(raw.replace(',', '.'));
  return Number.isFinite(amount) ? amount : null;
}

function parseUnit(raw: string | undefined): FigureUnit {
  if (raw === undefined) {
    return 'count';
  }
  if (raw === '%' || raw === 'percent' || raw.startsWith('pour')) {
    return 'percent';
  }
  if (raw === 'm' || raw === 'million' || raw === 'millions') {
    return 'million';
  }
  return 'thousand';
}
