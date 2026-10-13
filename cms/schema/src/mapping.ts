import { validatePublicationContent } from '@portfolio/content';
import type {
  Answer,
  Capability,
  ChatSettings,
  Experience,
  KeyFigure,
  Profile,
  Project,
  PublicationContent,
  PublicationValidation,
  SensitiveTopic,
  SiteSettings,
  Skill,
} from '@portfolio/content';

import type {
  AnswerRecord,
  CapabilityRecord,
  ChatSettingsRecord,
  ExperienceRecord,
  JsonObject,
  JsonValue,
  KeyFigureRecord,
  ProfileRecord,
  ProjectRecord,
  SiteSettingsRecord,
  SkillRecord,
} from './records.ts';

export type WorkingRecords = {
  profile: Partial<ProfileRecord>;
  capabilities: CapabilityRecord[];
  skills: SkillRecord[];
  experiences: ExperienceRecord[];
  projects: ProjectRecord[];
  keyFigures: KeyFigureRecord[];
  answers: AnswerRecord[];
  chatSettings: Partial<ChatSettingsRecord>;
  siteSettings: Partial<SiteSettingsRecord>;
};

type NewRecord<StoredRecord> = Omit<StoredRecord, 'id'>;

export type NewWorkingRecords = {
  profile: NewRecord<ProfileRecord>;
  capabilities: NewRecord<CapabilityRecord>[];
  skills: NewRecord<SkillRecord>[];
  experiences: NewRecord<ExperienceRecord>[];
  projects: NewRecord<ProjectRecord>[];
  keyFigures: NewRecord<KeyFigureRecord>[];
  answers: NewRecord<AnswerRecord>[];
  chatSettings: NewRecord<ChatSettingsRecord>;
  siteSettings: NewRecord<SiteSettingsRecord>;
};

type Blank = string | null | undefined;
type Sortable = { sort: number | null; slug: string };

export function buildPublicationContent(records: WorkingRecords): PublicationValidation {
  return validatePublicationContent({
    profile: profileCandidate(records.profile),
    capabilities: ordered(records.capabilities).map(capabilityCandidate),
    skills: ordered(records.skills).map(skillCandidate),
    experiences: ordered(records.experiences).map(experienceCandidate),
    projects: ordered(records.projects).map(projectCandidate),
    keyFigures: ordered(records.keyFigures).map(keyFigureCandidate),
    answers: ordered(records.answers).map(answerCandidate),
    chatSettings: chatSettingsCandidate(records.chatSettings),
    siteSettings: siteSettingsCandidate(records.siteSettings),
  });
}

export function toWorkingRecords(content: PublicationContent): NewWorkingRecords {
  return {
    profile: profileRecord(content.profile),
    capabilities: content.capabilities.map(capabilityRecord),
    skills: content.skills.map(skillRecord),
    experiences: content.experiences.map(experienceRecord),
    projects: content.projects.map(projectRecord),
    keyFigures: content.keyFigures.map(keyFigureRecord),
    answers: content.answers.map(answerRecord),
    chatSettings: chatSettingsRecord(content.chatSettings),
    siteSettings: siteSettingsRecord(content.siteSettings),
  };
}

function profileCandidate(record: Partial<ProfileRecord>): JsonObject {
  return {
    name: text(record.name),
    headline: localized(record.headline_en, record.headline_fr),
    introduction: localized(record.introduction_en, record.introduction_fr),
    location: localized(record.location_en, record.location_fr),
    availability: localized(record.availability_en, record.availability_fr),
    workAuthorization: localized(record.work_authorization_en, record.work_authorization_fr),
    languages: localized(record.languages_en, record.languages_fr),
    email: text(record.email),
    linkedinUrl: text(record.linkedin_url),
    githubUrl: text(record.github_url),
    photo: photoCandidate(record),
    disclosure: localized(record.disclosure_en, record.disclosure_fr),
  };
}

function photoCandidate(record: Partial<ProfileRecord>): JsonObject | null {
  const fileId = optionalText(record.photo);
  if (fileId === null) {
    return null;
  }
  return { fileId, alt: localized(record.photo_alt_en, record.photo_alt_fr) };
}

function capabilityCandidate(record: CapabilityRecord): JsonObject {
  return {
    slug: record.slug,
    icon: text(record.icon),
    title: localized(record.title_en, record.title_fr),
    description: localized(record.description_en, record.description_fr),
  };
}

function skillCandidate(record: SkillRecord): JsonObject {
  return {
    slug: record.slug,
    name: text(record.name),
    capabilitySlug: text(record.capability_slug),
    featured: record.featured,
  };
}

function experienceCandidate(record: ExperienceRecord): JsonObject {
  return {
    slug: record.slug,
    company: text(record.company),
    role: localized(record.role_en, record.role_fr),
    startMonth: text(record.start_month),
    endMonth: optionalText(record.end_month),
    location: optionalText(record.location),
    summary: localized(record.summary_en, record.summary_fr),
    highlights: localizedLines(record.highlights_en, record.highlights_fr),
    skillSlugs: list(record.skill_slugs),
  };
}

function projectCandidate(record: ProjectRecord): JsonObject {
  return {
    slug: record.slug,
    kind: record.kind,
    icon: optionalText(record.icon),
    title: localized(record.title_en, record.title_fr),
    company: optionalText(record.company),
    role: optionalLocalized(record.role_en, record.role_fr),
    startYear: record.start_year,
    endYear: record.end_year,
    summary: localized(record.summary_en, record.summary_fr),
    caseStudy: optionalLocalized(record.case_study_en, record.case_study_fr),
    skillSlugs: list(record.skill_slugs),
  };
}

function keyFigureCandidate(record: KeyFigureRecord): JsonObject {
  return {
    slug: record.slug,
    value: text(record.value),
    label: localized(record.label_en, record.label_fr),
  };
}

function answerCandidate(record: AnswerRecord): JsonObject {
  return {
    slug: record.slug,
    topic: localized(record.topic_en, record.topic_fr),
    sampleQuestions: localizedLines(record.sample_questions_en, record.sample_questions_fr),
    text: localized(record.text_en, record.text_fr),
    experienceSlugs: list(record.experience_slugs),
    projectSlugs: list(record.project_slugs),
    skillSlugs: list(record.skill_slugs),
    keyFigureSlugs: list(record.key_figure_slugs),
    blocks: list(record.blocks),
    starter: record.starter,
  };
}

function chatSettingsCandidate(record: Partial<ChatSettingsRecord>): JsonObject {
  return {
    unknownReply: localized(record.unknown_reply_en, record.unknown_reply_fr),
    refusalReply: localized(record.refusal_reply_en, record.refusal_reply_fr),
    sensitiveTopics: sensitiveTopicsCandidate(record.sensitive_topics),
    suggestedTopics: localizedLines(record.suggested_topics_en, record.suggested_topics_fr),
  };
}

function sensitiveTopicsCandidate(value: JsonValue | undefined): JsonValue {
  if (!Array.isArray(value)) {
    return list(value);
  }
  return value.map(sensitiveTopicCandidate);
}

function sensitiveTopicCandidate(entry: JsonValue): JsonValue {
  if (!isJsonObject(entry)) {
    return entry;
  }
  return {
    slug: entry['slug'] ?? '',
    keywords: localizedLines(stringValue(entry['keywords_en']), stringValue(entry['keywords_fr'])),
    reply: localized(stringValue(entry['reply_en']), stringValue(entry['reply_fr'])),
  };
}

function siteSettingsCandidate(record: Partial<SiteSettingsRecord>): JsonObject {
  return {
    title: localized(record.title_en, record.title_fr),
    description: localized(record.description_en, record.description_fr),
  };
}

function profileRecord(profile: Profile): NewRecord<ProfileRecord> {
  return {
    name: profile.name,
    headline_en: profile.headline.en,
    headline_fr: profile.headline.fr,
    introduction_en: profile.introduction.en,
    introduction_fr: profile.introduction.fr,
    location_en: profile.location.en,
    location_fr: profile.location.fr,
    availability_en: profile.availability.en,
    availability_fr: profile.availability.fr,
    work_authorization_en: profile.workAuthorization.en,
    work_authorization_fr: profile.workAuthorization.fr,
    languages_en: profile.languages.en,
    languages_fr: profile.languages.fr,
    email: profile.email,
    linkedin_url: profile.linkedinUrl,
    github_url: profile.githubUrl,
    photo: profile.photo?.fileId ?? null,
    photo_alt_en: profile.photo?.alt.en ?? null,
    photo_alt_fr: profile.photo?.alt.fr ?? null,
    disclosure_en: profile.disclosure.en,
    disclosure_fr: profile.disclosure.fr,
  };
}

function capabilityRecord(capability: Capability, index: number): NewRecord<CapabilityRecord> {
  return {
    sort: index + 1,
    slug: capability.slug,
    icon: capability.icon,
    title_en: capability.title.en,
    title_fr: capability.title.fr,
    description_en: capability.description.en,
    description_fr: capability.description.fr,
  };
}

function skillRecord(skill: Skill, index: number): NewRecord<SkillRecord> {
  return {
    sort: index + 1,
    slug: skill.slug,
    name: skill.name,
    capability_slug: skill.capabilitySlug,
    featured: skill.featured,
  };
}

function experienceRecord(experience: Experience, index: number): NewRecord<ExperienceRecord> {
  return {
    sort: index + 1,
    slug: experience.slug,
    company: experience.company,
    role_en: experience.role.en,
    role_fr: experience.role.fr,
    start_month: experience.startMonth,
    end_month: experience.endMonth,
    location: experience.location,
    summary_en: experience.summary.en,
    summary_fr: experience.summary.fr,
    highlights_en: experience.highlights.en.join('\n'),
    highlights_fr: experience.highlights.fr.join('\n'),
    skill_slugs: experience.skillSlugs,
  };
}

function projectRecord(project: Project, index: number): NewRecord<ProjectRecord> {
  return {
    sort: index + 1,
    slug: project.slug,
    kind: project.kind,
    icon: project.icon,
    title_en: project.title.en,
    title_fr: project.title.fr,
    company: project.company,
    role_en: project.role?.en ?? null,
    role_fr: project.role?.fr ?? null,
    start_year: project.startYear,
    end_year: project.endYear,
    summary_en: project.summary.en,
    summary_fr: project.summary.fr,
    case_study_en: project.caseStudy?.en ?? null,
    case_study_fr: project.caseStudy?.fr ?? null,
    skill_slugs: project.skillSlugs,
  };
}

function keyFigureRecord(keyFigure: KeyFigure, index: number): NewRecord<KeyFigureRecord> {
  return {
    sort: index + 1,
    slug: keyFigure.slug,
    value: keyFigure.value,
    label_en: keyFigure.label.en,
    label_fr: keyFigure.label.fr,
  };
}

function answerRecord(answer: Answer, index: number): NewRecord<AnswerRecord> {
  return {
    sort: index + 1,
    slug: answer.slug,
    topic_en: answer.topic.en,
    topic_fr: answer.topic.fr,
    sample_questions_en: answer.sampleQuestions.en.join('\n'),
    sample_questions_fr: answer.sampleQuestions.fr.join('\n'),
    text_en: answer.text.en,
    text_fr: answer.text.fr,
    experience_slugs: answer.experienceSlugs,
    project_slugs: answer.projectSlugs,
    skill_slugs: answer.skillSlugs,
    key_figure_slugs: answer.keyFigureSlugs,
    blocks: answer.blocks,
    starter: answer.starter,
  };
}

function chatSettingsRecord(settings: ChatSettings): NewRecord<ChatSettingsRecord> {
  return {
    unknown_reply_en: settings.unknownReply.en,
    unknown_reply_fr: settings.unknownReply.fr,
    refusal_reply_en: settings.refusalReply.en,
    refusal_reply_fr: settings.refusalReply.fr,
    sensitive_topics: settings.sensitiveTopics.map(sensitiveTopicRecord),
    suggested_topics_en: settings.suggestedTopics.en.join('\n'),
    suggested_topics_fr: settings.suggestedTopics.fr.join('\n'),
  };
}

function sensitiveTopicRecord(topic: SensitiveTopic): JsonObject {
  return {
    slug: topic.slug,
    keywords_en: topic.keywords.en.join('\n'),
    keywords_fr: topic.keywords.fr.join('\n'),
    reply_en: topic.reply.en,
    reply_fr: topic.reply.fr,
  };
}

function siteSettingsRecord(settings: SiteSettings): NewRecord<SiteSettingsRecord> {
  return {
    title_en: settings.title.en,
    title_fr: settings.title.fr,
    description_en: settings.description.en,
    description_fr: settings.description.fr,
  };
}

function ordered<Item extends Sortable>(items: readonly Item[]): Item[] {
  return items.toSorted(compareBySortThenSlug);
}

function compareBySortThenSlug(first: Sortable, second: Sortable): number {
  const bySort = sortValue(first) - sortValue(second);
  if (bySort !== 0) {
    return bySort;
  }
  return first.slug.localeCompare(second.slug);
}

function sortValue(item: Sortable): number {
  return item.sort ?? Number.MAX_SAFE_INTEGER;
}

function text(value: Blank): string {
  return value ?? '';
}

function optionalText(value: Blank): string | null {
  if (value === null || value === undefined || value.trim() === '') {
    return null;
  }
  return value;
}

function localized(english: Blank, french: Blank): JsonObject {
  return { en: text(english), fr: text(french) };
}

function optionalLocalized(english: Blank, french: Blank): JsonObject | null {
  if (optionalText(english) === null && optionalText(french) === null) {
    return null;
  }
  return localized(english, french);
}

function lines(value: Blank): string[] {
  return text(value)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

function localizedLines(english: Blank, french: Blank): JsonObject {
  return { en: lines(english), fr: lines(french) };
}

function list(value: JsonValue | undefined): JsonValue {
  return value ?? [];
}

function stringValue(value: JsonValue | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  return value;
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
