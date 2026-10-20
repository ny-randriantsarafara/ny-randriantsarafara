import {
  buildPublishedVocabulary,
  containsPhrase,
  entitiesInText,
  namesUnpublishedOrganization,
  toPaddedWords,
  type BlockScope,
  type FocusEntity,
} from '@portfolio/chat';
import {
  experienceTexts,
  figureOwner,
  figuresInText,
  localeSchema,
  projectTexts,
  sameFigure,
  type Experience,
  type Figure,
  type Project,
  type PublicationContent,
} from '@portfolio/content';

import { citedScope } from './cited-scope.ts';
import type { EvidenceSource } from './evidence.ts';

export type ClaimProblem =
  | 'unsupported_figure'
  | 'misattributed_figure'
  | 'uncited_entity'
  | 'unpublished_organization'
  | 'unsupported_commitment'
  | 'unsupported_responsibility';

export type ReplyClaims = {
  text: string;
  sources: readonly EvidenceSource[];
  content: PublicationContent;
  catalog: readonly FocusEntity[];
  // A clarification may name the entities it asks the visitor to choose between.
  entitiesMustBeCited: boolean;
  // The visitor's question: a reply may repeat a figure from it to deny it.
  question: string;
};

type Segment = { text: string; entities: readonly FocusEntity[] };

// "Two approaches", "one team": smaller counts are wording far more often than published figures.
const MIN_CHECKED_COUNT = 3;

// Sentences, and clauses joined by a conjunction, which may each be about another employer.
const SEGMENT_BOUNDARY =
  /(?<=[.!?;])\s+|\n+|,\s+(?=(?:and|but|while|whereas|et|mais|tandis|alors)\s)/iu;

const PROFILE_WIDE_PHRASES = phrases([
  'across',
  'overall',
  'in total',
  'throughout',
  'career',
  'au total',
  'en tout',
  'dans l ensemble',
  'sur l ensemble',
  'carriere',
  'parcours',
]);

// "Before Eurosport, I was at Euronews" says nothing about Eurosport.
const POINT_IN_TIME_PHRASES = phrases(['before', 'after', 'avant', 'apres']);

const NEGATION_PHRASES = phrases([
  'no',
  'not',
  'never',
  'cannot',
  'can t',
  'didn t',
  'don t',
  'doesn t',
  'wasn t',
  'weren t',
  'isn t',
  'aren t',
  'haven t',
  'hasn t',
  'non',
  'pas',
  'jamais',
  'aucun',
  'aucune',
]);

const COMMITMENT_PHRASES = phrases([
  'available immediately',
  'immediately available',
  'available right away',
  'available now',
  'available from',
  'can start',
  'could start',
  'start immediately',
  'start right away',
  'willing to relocate',
  'happy to relocate',
  'can relocate',
  'open to relocation',
  'open to relocating',
  'i guarantee',
  'i promise',
  'i commit to',
  'my daily rate',
  'my hourly rate',
  'my salary',
  'my notice period',
  'disponible immediatement',
  'disponible tout de suite',
  'disponible des maintenant',
  'disponible a partir',
  'je peux commencer',
  'je pourrais commencer',
  'commencer immediatement',
  'pret a demenager',
  'je peux demenager',
  'je garantis',
  'je promets',
  'je m engage',
  'mon tjm',
  'mon taux journalier',
  'mon salaire',
  'mon preavis',
]);

// Published fields a reply may restate commitments from.
const COMMITMENT_FIELDS = new Set(['availability', 'workAuthorization']);

// "I managed to reduce latency" is no management claim, hence the explicit objects.
const RESPONSIBILITY_CLAIMS = phrases([
  'i led',
  'i lead',
  'i was leading',
  'i managed a',
  'i managed the team',
  'i managed teams',
  'i headed',
  'i supervised',
  'i directed',
  'i was responsible for',
  'i owned',
  'i mentored',
  'as tech lead',
  'as team lead',
  'as the lead',
  'as lead',
  'my team of',
  'j ai dirige',
  'j ai pilote',
  'j ai encadre',
  'j ai manage',
  'j ai supervise',
  'j ai mentore',
  'je dirigeais',
  'je pilotais',
  'j encadrais',
  'j etais responsable',
  'en tant que lead',
  'en tant que responsable',
  'mon equipe de',
]);

const RESPONSIBILITY_EVIDENCE = phrases([
  'led',
  'lead',
  'leading',
  'leader',
  'managed',
  'managing',
  'manager',
  'mentored',
  'mentoring',
  'headed',
  'supervised',
  'directed',
  'responsible',
  'owned',
  'ownership',
  'drove',
  'coordinated',
  'dirige',
  'dirigeais',
  'pilote',
  'pilotais',
  'encadre',
  'encadrement',
  'mentore',
  'manage',
  'management',
  'supervise',
  'responsable',
  'coordonne',
  'mene',
]);

// Claims a reply makes beyond its quotes: each figure, employer, commitment and responsibility
// must come from what it cites, and each figure from the employer or project it is told about.
export function replyClaimProblems(claims: ReplyClaims): ClaimProblem[] {
  const segments = attributedSegments(claims.text, claims.catalog);
  const problems = [
    ...figureProblems(segments, claims),
    ...entityProblems(claims),
    ...commitmentProblems(claims),
    ...responsibilityProblems(segments, claims),
  ];
  return [...new Set(problems)];
}

function attributedSegments(text: string, catalog: readonly FocusEntity[]): Segment[] {
  return text
    .split(SEGMENT_BOUNDARY)
    .filter((segment) => segment.trim().length > 0)
    .reduce<Segment[]>((segments, segment) => {
      const previous = segments.at(-1)?.entities ?? [];
      return [
        ...segments,
        { text: segment, entities: segmentEntities(catalog, segment, previous) },
      ];
    }, []);
}

// A segment naming nothing continues the previous one ("At Euronews… It reached 2M users")
// unless it widens to the whole career.
function segmentEntities(
  catalog: readonly FocusEntity[],
  segment: string,
  previous: readonly FocusEntity[]
): readonly FocusEntity[] {
  const named = entitiesInText(catalog, segment);
  if (named.length > 0) {
    return named;
  }
  if (containsAnyPhrase(segment, PROFILE_WIDE_PHRASES)) {
    return [];
  }
  return previous;
}

function figureProblems(segments: readonly Segment[], claims: ReplyClaims): ClaimProblem[] {
  const cited = [
    ...claims.sources.flatMap((source) => figuresInText(source.text)),
    ...citedEntityYears(claims),
  ];
  const profileWide = profileWideFigures(claims.content);
  const questionFigures = figuresInText(claims.question);
  return segments.flatMap((segment) =>
    figuresInText(segment.text)
      .filter(isCheckedFigure)
      .filter((figure) => !deniesQuestionFigure(segment, figure, questionFigures))
      .flatMap((figure): ClaimProblem[] => {
        if (!matchesAnyFigure(figure, cited)) {
          return ['unsupported_figure'];
        }
        if (segment.entities.length === 0 || matchesAnyFigure(figure, profileWide)) {
          return [];
        }
        const entityFigures = segment.entities.flatMap((entity) =>
          figuresOfEntity(claims.content, entity)
        );
        return problemWhen(!matchesAnyFigure(figure, entityFigures), 'misattributed_figure');
      })
  );
}

function isCheckedFigure(figure: Figure): boolean {
  return figure.unit !== 'count' || figure.amount >= MIN_CHECKED_COUNT;
}

// "No, not 15 developers": a negative sentence repeating the visitor's figure claims nothing.
function deniesQuestionFigure(
  segment: Segment,
  figure: Figure,
  questionFigures: readonly Figure[]
): boolean {
  return (
    matchesAnyFigure(figure, questionFigures) && containsAnyPhrase(segment.text, NEGATION_PHRASES)
  );
}

// A bare number restates a published figure of any unit: "from 5 to 65%" quotes "5%" and "65%".
function matchesAnyFigure(figure: Figure, published: readonly Figure[]): boolean {
  return published.some((candidate) => {
    if (figure.unit === 'count') {
      return Math.abs(candidate.amount - figure.amount) < 1e-9;
    }
    return sameFigure(candidate, figure);
  });
}

// Figures about the whole profile: unowned key figures and profile texts, unless an experience
// or project states them too, in which case they belong to it.
function profileWideFigures(content: PublicationContent): Figure[] {
  const profileTexts = localeSchema.options.flatMap((locale) => [
    content.profile.headline[locale],
    content.profile.introduction[locale],
  ]);
  const unownedValues = content.keyFigures
    .filter((keyFigure) => figureOwner(content, keyFigure) === null)
    .map((keyFigure) => keyFigure.value);
  const entityFigures = [
    ...content.experiences.flatMap((experience) => experienceFigures(experience)),
    ...content.projects.flatMap((project) => projectFigures(project)),
  ];
  return [...profileTexts, ...unownedValues]
    .flatMap((text) => figuresInText(text))
    .filter((figure) => !matchesAnyFigure(figure, entityFigures));
}

function figuresOfEntity(content: PublicationContent, entity: FocusEntity): Figure[] {
  const experiences = content.experiences.filter((experience) =>
    entity.experienceSlugs.includes(experience.slug)
  );
  const projects = content.projects.filter((project) => entity.projectSlugs.includes(project.slug));
  const ownedValues = content.keyFigures
    .filter((keyFigure) => {
      const owner = figureOwner(content, keyFigure);
      if (owner === null) {
        return false;
      }
      if (owner.kind === 'experience') {
        return entity.experienceSlugs.includes(owner.slug);
      }
      return entity.projectSlugs.includes(owner.slug);
    })
    .map((keyFigure) => keyFigure.value);
  return [
    ...experiences.flatMap((experience) => [
      ...experienceFigures(experience),
      ...experienceYears(experience),
    ]),
    ...projects.flatMap((project) => [...projectFigures(project), ...projectYears(project)]),
    ...ownedValues.flatMap((value) => figuresInText(value)),
  ];
}

function experienceFigures(experience: Experience): Figure[] {
  return localeSchema.options
    .flatMap((locale) => experienceTexts(experience, locale))
    .flatMap((text) => figuresInText(text));
}

function projectFigures(project: Project): Figure[] {
  return localeSchema.options
    .flatMap((locale) => projectTexts(project, locale))
    .flatMap((text) => figuresInText(text));
}

function citedEntityYears(claims: ReplyClaims): Figure[] {
  const scope = citedScope(claims.content, claims.sources);
  if (scope === null) {
    return [];
  }
  return [
    ...claims.content.experiences
      .filter((experience) => scope.experienceSlugs.includes(experience.slug))
      .flatMap((experience) => experienceYears(experience)),
    ...claims.content.projects
      .filter((project) => scope.projectSlugs.includes(project.slug))
      .flatMap((project) => projectYears(project)),
  ];
}

function experienceYears(experience: Experience): Figure[] {
  const months = [experience.startMonth, experience.endMonth].flatMap((month) =>
    month === null ? [] : [month]
  );
  return months.map((month) => ({ amount: Number.parseInt(month, 10), unit: 'count' }));
}

function projectYears(project: Project): Figure[] {
  const years = [project.startYear, project.endYear].flatMap((year) =>
    year === null ? [] : [year]
  );
  return years.map((year) => ({ amount: year, unit: 'count' }));
}

function entityProblems(claims: ReplyClaims): ClaimProblem[] {
  const unpublished = namesUnpublishedOrganization(
    claims.text,
    buildPublishedVocabulary(claims.content, claims.catalog)
  );
  const uncited = claims.entitiesMustBeCited && namesUncitedEntity(claims);
  return [
    ...problemWhen(unpublished, 'unpublished_organization'),
    ...problemWhen(uncited, 'uncited_entity'),
  ];
}

// An employer or project the reply describes must be one a cited source is about or names itself.
function namesUncitedEntity(claims: ReplyClaims): boolean {
  const scope = citedScope(claims.content, claims.sources);
  const namedBySources = new Set(
    claims.sources.flatMap((source) => entitiesInText(claims.catalog, source.text))
  );
  const described = withoutPointsInTime(claims.text, claims.catalog);
  return entitiesInText(claims.catalog, described).some(
    (entity) => !namedBySources.has(entity) && !entityInScope(entity, scope)
  );
}

// Longest names first: "before Warner Bros. Discovery" must not leave "Discovery" behind.
function withoutPointsInTime(text: string, catalog: readonly FocusEntity[]): string {
  const mentions = catalog
    .flatMap((entity) =>
      entity.aliases.flatMap((alias) =>
        POINT_IN_TIME_PHRASES.map((phrase) => `${phrase}${alias.trimStart()}`)
      )
    )
    .toSorted((left, right) => right.length - left.length);
  return mentions.reduce((padded, mention) => padded.replaceAll(mention, ' '), toPaddedWords(text));
}

function entityInScope(entity: FocusEntity, scope: BlockScope | null): boolean {
  if (scope === null) {
    return false;
  }
  return (
    entity.experienceSlugs.some((slug) => scope.experienceSlugs.includes(slug)) ||
    entity.projectSlugs.some((slug) => scope.projectSlugs.includes(slug))
  );
}

function commitmentProblems(claims: ReplyClaims): ClaimProblem[] {
  const citesCommitments = claims.sources.some(
    (source) => source.collection === 'profile' && COMMITMENT_FIELDS.has(source.field)
  );
  if (citesCommitments) {
    return [];
  }
  const reply = toPaddedWords(claims.text);
  const citedTexts = claims.sources.map((source) => toPaddedWords(source.text));
  const unsupported = COMMITMENT_PHRASES.some(
    (phrase) =>
      containsPhrase(reply, phrase) && !citedTexts.some((text) => containsPhrase(text, phrase))
  );
  return problemWhen(unsupported, 'unsupported_commitment');
}

function responsibilityProblems(segments: readonly Segment[], claims: ReplyClaims): ClaimProblem[] {
  const unsupported = segments.some(
    (segment) =>
      containsAnyPhrase(segment.text, RESPONSIBILITY_CLAIMS) &&
      !responsibilityEvidenced(segment, claims)
  );
  return problemWhen(unsupported, 'unsupported_responsibility');
}

function responsibilityEvidenced(segment: Segment, claims: ReplyClaims): boolean {
  const texts = responsibilityTexts(segment, claims);
  return texts.some((text) => containsAnyPhrase(text, RESPONSIBILITY_EVIDENCE));
}

function responsibilityTexts(segment: Segment, claims: ReplyClaims): string[] {
  if (segment.entities.length === 0) {
    return claims.sources.map((source) => source.text);
  }
  const { content } = claims;
  return segment.entities.flatMap((entity) =>
    localeSchema.options.flatMap((locale) => [
      ...content.experiences
        .filter((experience) => entity.experienceSlugs.includes(experience.slug))
        .flatMap((experience) => [experience.role[locale], ...experienceTexts(experience, locale)]),
      ...content.projects
        .filter((project) => entity.projectSlugs.includes(project.slug))
        .flatMap((project) => [project.role?.[locale] ?? '', ...projectTexts(project, locale)]),
    ])
  );
}

function containsAnyPhrase(text: string, paddedPhrases: readonly string[]): boolean {
  const padded = toPaddedWords(text);
  return paddedPhrases.some((phrase) => containsPhrase(padded, phrase));
}

function phrases(words: readonly string[]): string[] {
  return words.map(toPaddedWords);
}

function problemWhen(condition: boolean, problem: ClaimProblem): ClaimProblem[] {
  return condition ? [problem] : [];
}
