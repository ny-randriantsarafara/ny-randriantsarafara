import {
  companyKey,
  skillAliases,
  type LocalizedText,
  type Project,
  type PublicationContent,
} from '@portfolio/content';

import { containsPhrase, toPaddedWords } from './phrase-match.ts';
import { englishStopWords, frenchStopWords } from './stop-words.ts';

// Name parts ("Cloud Platform" in "Cloud Platform · Maestro", "Group" in "ITRAS Group") only become
// aliases when they contain a word outside this list, so ordinary technical questions keep no focus.
const GENERIC_NAME_WORDS = new Set([
  'api',
  'apis',
  'app',
  'application',
  'applications',
  'backend',
  'cloud',
  'company',
  'data',
  'digital',
  'group',
  'groupe',
  'high',
  'media',
  'personal',
  'personnel',
  'platform',
  'plateforme',
  'project',
  'projet',
  'service',
  'services',
  'societe',
  'software',
  'system',
  'systems',
  'tech',
  'traffic',
]);
const CORPORATE_SUFFIXES = ['group', 'groupe', 'inc', 'ltd', 'llc', 'sas', 'sa', 'gmbh'];
const MIN_LEADING_WORD_LENGTH = 5;

// "at Google" / "chez Google": a capitalised organisation name after an employer preposition.
const CAPITALISED_MENTION =
  /(?:^|[^\p{L}])(?:[Aa]t|[Cc]hez)\s+([\p{Lu}][\p{L}\p{N}&.'’-]*(?:\s+[\p{Lu}][\p{L}\p{N}&.'’-]*){0,3})/gu;
// "at google" / "chez capgemini": up to three words, punctuation ends the name.
const ANY_CASE_MENTION =
  /(?:^|[^\p{L}])(?:at|chez)\s+([^\s,.;:!?()"«»]+(?:\s+[^\s,.;:!?()"«»]+){0,2})/giu;

// Words that start or continue an ordinary phrase after "at"/"chez" rather than a name.
const NOT_NAME_WORDS = new Set([
  ...englishStopWords,
  ...frenchStopWords,
  'all',
  'another',
  'any',
  'both',
  'build',
  'current',
  'different',
  'during',
  'each',
  'every',
  'first',
  'five',
  'former',
  'four',
  'her',
  'his',
  'home',
  'its',
  'large',
  'last',
  'launch',
  'least',
  'many',
  'most',
  'multiple',
  'night',
  'once',
  'other',
  'our',
  'past',
  'peak',
  'previous',
  'rest',
  'runtime',
  'scale',
  'several',
  'since',
  'small',
  'some',
  'startup',
  'that',
  'their',
  'these',
  'this',
  'those',
  'three',
  'time',
  'times',
  'two',
  'various',
  'work',
  'anciens',
  'autres',
  'ce',
  'ces',
  'cet',
  'cette',
  'd',
  'deux',
  'differentes',
  'differents',
  'elle',
  'elles',
  'en',
  'eux',
  'grandes',
  'grands',
  'l',
  'leur',
  'leurs',
  'lui',
  'moi',
  'nos',
  'notre',
  'nous',
  'petites',
  'plusieurs',
  'sa',
  'ses',
  'soi',
  'son',
  'toi',
  'trois',
]);

// What a publication names (entities, skills, capabilities, owner, location) and all its wording.
export type PublishedVocabulary = { names: readonly string[]; wording: string };

export type FocusEntity = {
  key: string;
  label: LocalizedText;
  aliases: readonly string[];
  experienceSlugs: readonly string[];
  projectSlugs: readonly string[];
};

type EntityDraft = Omit<FocusEntity, 'aliases'> & {
  names: readonly string[];
  nameParts: readonly string[];
};

export function buildEntityCatalog(content: PublicationContent): FocusEntity[] {
  const employers = employerDrafts(content);
  const employerProjectSlugs = new Set(employers.flatMap((draft) => draft.projectSlugs));
  const standaloneProjects = content.projects
    .filter((project) => !employerProjectSlugs.has(project.slug))
    .map((project) => projectDraft(project));
  const drafts = [...employers, ...standaloneProjects];
  return drafts.map((draft) => toEntity(draft, drafts));
}

export function entitiesInText(catalog: readonly FocusEntity[], text: string): FocusEntity[] {
  const padded = toPaddedWords(text);
  return catalog
    .flatMap((entity) => {
      const position = firstAliasPosition(entity, padded);
      return position === null ? [] : [{ entity, position }];
    })
    .toSorted((left, right) => left.position - right.position)
    .map((match) => match.entity);
}

export function buildPublishedVocabulary(
  content: PublicationContent,
  catalog: readonly FocusEntity[]
): PublishedVocabulary {
  const terms = [
    ...content.skills.flatMap(skillAliases),
    ...content.capabilities.flatMap((capability) => [capability.title.en, capability.title.fr]),
    content.profile.name,
    content.profile.location.en,
    content.profile.location.fr,
  ];
  return {
    names: [...catalog.flatMap((entity) => entity.aliases), ...terms.map(toPaddedWords)],
    wording: publishedWording(content).map(toPaddedWords).join(''),
  };
}

// A capitalised name after "at"/"chez" must be a published one. Lowercase words only stand for
// a name when the publication never uses them: "at google", but not "at scale".
export function namesUnpublishedOrganization(
  text: string,
  vocabulary: PublishedVocabulary
): boolean {
  const capitalised = [...text.matchAll(CAPITALISED_MENTION)].map((match) =>
    toPaddedWords(match[1] ?? '')
  );
  const lowercase = [...text.matchAll(ANY_CASE_MENTION)].map((match) =>
    mentionedName(match[1] ?? '')
  );
  return (
    capitalised.some((name) => !isPublishedName(name, vocabulary)) ||
    lowercase.some(
      (name) => !isPublishedName(name, vocabulary) && !containsPhrase(vocabulary.wording, name)
    )
  );
}

function isPublishedName(paddedName: string, vocabulary: PublishedVocabulary): boolean {
  if (paddedName.trim().length === 0) {
    return true;
  }
  return vocabulary.names.some(
    (term) => containsPhrase(paddedName, term) || containsPhrase(term, paddedName)
  );
}

// The words of "at euronews for three years" up to the first one no name starts or goes on with.
function mentionedName(phrase: string): string {
  const words = phrase.split(/\s+/);
  const endIndex = words.findIndex((word) => !continuesName(word));
  const nameWords = endIndex === -1 ? words : words.slice(0, endIndex);
  return toPaddedWords(nameWords.join(' '));
}

function continuesName(word: string): boolean {
  const normalized = toPaddedWords(word).trim();
  if (normalized.length === 0 || /^\p{N}/u.test(normalized)) {
    return false;
  }
  return !NOT_NAME_WORDS.has(normalized);
}

function publishedWording(content: PublicationContent): string[] {
  const localized = [
    content.profile.headline,
    content.profile.introduction,
    content.profile.location,
    ...[
      content.profile.overview,
      content.profile.journey,
      content.profile.experienceSummary,
      content.profile.coreSkills,
    ].filter((text) => text !== null),
    ...content.capabilities.flatMap((capability) => [capability.title, capability.description]),
    ...content.experiences.flatMap((experience) => [experience.role, experience.summary]),
    ...content.projects.flatMap((project) => [
      project.title,
      project.summary,
      ...(project.role === null ? [] : [project.role]),
      ...(project.caseStudy === null ? [] : [project.caseStudy]),
    ]),
    ...content.keyFigures.map((keyFigure) => keyFigure.label),
    ...content.answers.flatMap((answer) => [answer.topic, answer.text]),
  ];
  return [
    ...localized.flatMap((text) => [text.en, text.fr]),
    ...content.experiences.flatMap((experience) => [
      experience.company,
      ...experience.highlights.en,
      ...experience.highlights.fr,
    ]),
    ...content.skills.flatMap(skillAliases),
  ];
}

function employerDrafts(content: PublicationContent): EntityDraft[] {
  const companyKeys = [
    ...new Set(content.experiences.map((experience) => companyKey(experience.company))),
  ];
  return companyKeys.flatMap((key) => {
    const experiences = content.experiences.filter(
      (experience) => companyKey(experience.company) === key
    );
    const first = experiences[0];
    if (first === undefined) {
      return [];
    }
    const projects = content.projects.filter(
      (project) => project.company !== null && companyKey(project.company) === key
    );
    return [
      {
        key: `experience:${first.slug}`,
        label: { en: first.company, fr: first.company },
        names: [
          companyBaseName(first.company),
          ...projects.flatMap((project) => [project.title.en, project.title.fr]),
        ],
        nameParts: companyNameParts(first.company),
        experienceSlugs: experiences.map((experience) => experience.slug),
        projectSlugs: projects.map((project) => project.slug),
      },
    ];
  });
}

function projectDraft(project: Project): EntityDraft {
  return {
    key: `project:${project.slug}`,
    label: project.title,
    names: [project.title.en, project.title.fr],
    nameParts: [...titleParts(project.title.en), ...titleParts(project.title.fr)],
    experienceSlugs: [],
    projectSlugs: [project.slug],
  };
}

function toEntity(draft: EntityDraft, drafts: readonly EntityDraft[]): FocusEntity {
  const otherPhrases = drafts
    .filter((other) => other.key !== draft.key)
    .flatMap((other) => [...other.names, ...other.nameParts].map(toPaddedWords));
  const distinctiveParts = draft.nameParts
    .map(toPaddedWords)
    .filter((part) => isDistinctive(part) && !otherPhrases.includes(part));
  const aliases = [...new Set([...draft.names.map(toPaddedWords), ...distinctiveParts])].filter(
    (alias) => alias.trim().length > 0
  );
  return {
    key: draft.key,
    label: draft.label,
    aliases,
    experienceSlugs: draft.experienceSlugs,
    projectSlugs: draft.projectSlugs,
  };
}

function firstAliasPosition(entity: FocusEntity, paddedText: string): number | null {
  const positions = entity.aliases
    .map((alias) => paddedText.indexOf(alias))
    .filter((position) => position >= 0);
  if (positions.length === 0) {
    return null;
  }
  return Math.min(...positions);
}

function companyBaseName(company: string): string {
  return company.replace(/\([^)]*\)/g, '').trim();
}

function companyNameParts(company: string): string[] {
  const base = companyBaseName(company);
  const parenthesised = [...company.matchAll(/\(([^)]+)\)/g)].map((match) => match[1] ?? '');
  const separated = base.split(/\s*[·/]\s*/);
  const words = base.split(/\s+/);
  const withoutSuffix = words.filter(
    (word, index) => index === 0 || !CORPORATE_SUFFIXES.includes(word.toLowerCase())
  );
  const leadingWord = words.length > 1 ? [words[0] ?? ''] : [];
  return [
    ...parenthesised,
    ...(separated.length > 1 ? separated : []),
    ...(withoutSuffix.length < words.length ? [withoutSuffix.join(' ')] : []),
    ...leadingWord.filter(
      (word) => word.replace(/[^\p{L}]/gu, '').length >= MIN_LEADING_WORD_LENGTH
    ),
  ];
}

function titleParts(title: string): string[] {
  const parts = title.split(/\s+(?:&|\+|and|et)\s+|\s*·\s*/i);
  return parts.length > 1 ? parts : [];
}

function isDistinctive(paddedPhrase: string): boolean {
  return paddedPhrase
    .trim()
    .split(' ')
    .some((word) => word.length >= 3 && !GENERIC_NAME_WORDS.has(word));
}
