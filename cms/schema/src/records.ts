export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
export type JsonObject = { [key: string]: JsonValue | undefined };

export type ProfileRecord = {
  id: number;
  name: string | null;
  headline_en: string | null;
  headline_fr: string | null;
  introduction_en: string | null;
  introduction_fr: string | null;
  location_en: string | null;
  location_fr: string | null;
  availability_en: string | null;
  availability_fr: string | null;
  work_authorization_en: string | null;
  work_authorization_fr: string | null;
  languages_en: string | null;
  languages_fr: string | null;
  email: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  photo: string | null;
  photo_alt_en: string | null;
  photo_alt_fr: string | null;
  disclosure_en: string | null;
  disclosure_fr: string | null;
};

export type CapabilityRecord = {
  id: string;
  sort: number | null;
  slug: string;
  icon: string | null;
  title_en: string | null;
  title_fr: string | null;
  description_en: string | null;
  description_fr: string | null;
};

export type SkillRecord = {
  id: string;
  sort: number | null;
  slug: string;
  name: string | null;
  capability_slug: string | null;
  featured: boolean;
};

export type ExperienceRecord = {
  id: string;
  sort: number | null;
  slug: string;
  company: string | null;
  role_en: string | null;
  role_fr: string | null;
  start_month: string | null;
  end_month: string | null;
  location: string | null;
  summary_en: string | null;
  summary_fr: string | null;
  highlights_en: string | null;
  highlights_fr: string | null;
  skill_slugs: JsonValue;
};

export type ProjectRecord = {
  id: string;
  sort: number | null;
  slug: string;
  kind: string;
  icon: string | null;
  title_en: string | null;
  title_fr: string | null;
  company: string | null;
  role_en: string | null;
  role_fr: string | null;
  start_year: number | null;
  end_year: number | null;
  summary_en: string | null;
  summary_fr: string | null;
  case_study_en: string | null;
  case_study_fr: string | null;
  skill_slugs: JsonValue;
};

export type KeyFigureRecord = {
  id: string;
  sort: number | null;
  slug: string;
  value: string | null;
  label_en: string | null;
  label_fr: string | null;
};

export type AnswerRecord = {
  id: string;
  sort: number | null;
  slug: string;
  topic_en: string | null;
  topic_fr: string | null;
  sample_questions_en: string | null;
  sample_questions_fr: string | null;
  text_en: string | null;
  text_fr: string | null;
  experience_slugs: JsonValue;
  project_slugs: JsonValue;
  skill_slugs: JsonValue;
  key_figure_slugs: JsonValue;
  blocks: JsonValue;
  starter: boolean;
};

export type ChatSettingsRecord = {
  id: number;
  unknown_reply_en: string | null;
  unknown_reply_fr: string | null;
  refusal_reply_en: string | null;
  refusal_reply_fr: string | null;
  sensitive_topics: JsonValue;
  suggested_topics_en: string | null;
  suggested_topics_fr: string | null;
};

export type SiteSettingsRecord = {
  id: number;
  title_en: string | null;
  title_fr: string | null;
  description_en: string | null;
  description_fr: string | null;
};

export type PublicationStatus = 'prepared' | 'active' | 'superseded' | 'discarded';

export type PublicationRecord = {
  id: string;
  status: PublicationStatus;
  content: JsonValue;
  changes: JsonValue;
  changes_overview: string | null;
  activated_at: string | null;
  date_created: string | null;
  user_created: string | null;
};

export type ChatExchangeMode = 'model' | 'scripted';

export type ChatExchangeOutcome = 'answered' | 'unknown' | 'sensitive' | 'refused';

export type ChatExchangeRecord = {
  id: string;
  date_created: string | null;
  locale: string | null;
  conversation_id: string | null;
  question: string | null;
  mode: ChatExchangeMode | null;
  outcome: ChatExchangeOutcome | null;
  answer_slugs: JsonValue;
  blocks: JsonValue;
  latency_ms: number | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_eur: number | null;
  failure_reason: string | null;
  publication_id: string | null;
};

export type ContactMessageStatus = 'new' | 'handled';

export type ContactMessageRecord = {
  id: string;
  date_created: string | null;
  name: string | null;
  email: string | null;
  company: string | null;
  message: string | null;
  locale: string | null;
  topic: string | null;
  status: ContactMessageStatus | null;
};

export type PortfolioSchema = {
  profile: ProfileRecord;
  capabilities: CapabilityRecord[];
  skills: SkillRecord[];
  experiences: ExperienceRecord[];
  projects: ProjectRecord[];
  key_figures: KeyFigureRecord[];
  answers: AnswerRecord[];
  chat_settings: ChatSettingsRecord;
  site_settings: SiteSettingsRecord;
  publications: PublicationRecord[];
  chat_exchanges: ChatExchangeRecord[];
  contact_messages: ContactMessageRecord[];
};
