import type { PortfolioSchema } from '@portfolio/cms-schema';
import { iconNames } from '@portfolio/content';

import {
  booleanField,
  choiceField,
  dateCreatedField,
  imageField,
  integerField,
  integerPrimaryKey,
  jsonCodeField,
  localizedFields,
  markdownField,
  repeaterField,
  slugField,
  slugListField,
  sortField,
  stringField,
  timestampField,
  urlField,
  userCreatedField,
  uuidPrimaryKey,
} from './fields.ts';
import type { Choice, FieldDefinition } from './fields.ts';

export type CollectionDefinition = {
  collection: keyof PortfolioSchema;
  label: { singular: string; plural: string };
  icon: string;
  note: string;
  singleton: boolean;
  hidden: boolean;
  sortField: string | null;
  displayTemplate: string | null;
  fields: FieldDefinition[];
};

const iconChoices: Choice[] = iconNames.map((name) => ({ text: name, value: name }));

const kindChoices: Choice[] = [
  { text: 'Professional', value: 'professional' },
  { text: 'Personal', value: 'personal' },
];

const statusChoices: Choice[] = [
  { text: 'Prepared', value: 'prepared' },
  { text: 'Active', value: 'active' },
  { text: 'Superseded', value: 'superseded' },
  { text: 'Discarded', value: 'discarded' },
];

const ONE_PER_LINE = 'One per line.';
const BLOCKS_NOTE =
  'JSON list of blocks shown with the answer. Types: timeline, experience, project, skills, key-figures, strengths, contact, cv. Example: [{"type":"project","slug":"visa-insight"}]';

function itemFields(): FieldDefinition[] {
  return [uuidPrimaryKey(), sortField(), slugField()];
}

function itemCollection(
  collection: keyof PortfolioSchema,
  label: { singular: string; plural: string },
  icon: string,
  note: string,
  displayTemplate: string,
  fields: FieldDefinition[]
): CollectionDefinition {
  return {
    collection,
    label,
    icon,
    note,
    singleton: false,
    hidden: false,
    sortField: 'sort',
    displayTemplate,
    fields: [...itemFields(), ...fields],
  };
}

function singletonCollection(
  collection: keyof PortfolioSchema,
  label: string,
  icon: string,
  note: string,
  fields: FieldDefinition[]
): CollectionDefinition {
  return {
    collection,
    label: { singular: label, plural: label },
    icon,
    note,
    singleton: true,
    hidden: false,
    sortField: null,
    displayTemplate: null,
    fields: [integerPrimaryKey(), ...fields],
  };
}

export const portfolioCollections: CollectionDefinition[] = [
  singletonCollection(
    'profile',
    'Profile',
    'person',
    'Identity shown on the welcome screen and used by the chat.',
    [
      stringField('name', { label: 'Name' }),
      ...localizedFields('headline', { label: 'Headline' }, 'string'),
      ...localizedFields('introduction', { label: 'Introduction' }, 'text'),
      ...localizedFields('location', { label: 'Location' }, 'string'),
      ...localizedFields('availability', { label: 'Availability' }, 'string'),
      ...localizedFields('work_authorization', { label: 'Work authorization' }, 'string'),
      ...localizedFields('languages', { label: 'Languages' }, 'string'),
      stringField('email', { label: 'Email', width: 'half' }),
      urlField('linkedin_url', { label: 'LinkedIn', width: 'half' }),
      urlField('github_url', { label: 'GitHub', width: 'half' }),
      imageField('photo', { label: 'Photo' }),
      ...localizedFields('photo_alt', { label: 'Photo alt text' }, 'string'),
      ...localizedFields('disclosure', { label: 'AI disclosure' }, 'text'),
    ]
  ),
  itemCollection(
    'capabilities',
    { singular: 'Capability', plural: 'Capabilities' },
    'category',
    'Skill areas shown on the skills map.',
    '{{title_en}}',
    [
      choiceField('icon', { label: 'Icon', required: true, width: 'half' }, iconChoices, 'cloud'),
      ...localizedFields('title', { label: 'Title' }, 'string'),
      ...localizedFields('description', { label: 'Description' }, 'text'),
    ]
  ),
  itemCollection(
    'skills',
    { singular: 'Skill', plural: 'Skills' },
    'psychology',
    'Technologies and practices, grouped by capability.',
    '{{name}}',
    [
      stringField('name', { label: 'Name', required: true, width: 'half' }),
      stringField('capability_slug', { label: 'Capability slug', width: 'half' }),
      booleanField('featured', { label: 'Featured', width: 'half' }, false),
    ]
  ),
  itemCollection(
    'experiences',
    { singular: 'Experience', plural: 'Experiences' },
    'work',
    'Professional experience, most recent first.',
    '{{company}}',
    [
      stringField('company', { label: 'Company', width: 'half' }),
      ...localizedFields('role', { label: 'Role' }, 'string'),
      stringField('start_month', { label: 'Start month', note: 'YYYY-MM', width: 'half' }),
      stringField('end_month', {
        label: 'End month',
        note: 'YYYY-MM, empty while current',
        width: 'half',
      }),
      stringField('location', { label: 'Location', width: 'half' }),
      ...localizedFields('summary', { label: 'Summary' }, 'text'),
      ...localizedFields('highlights', { label: 'Highlights', note: ONE_PER_LINE }, 'text'),
      slugListField('skill_slugs', { label: 'Skill slugs' }),
    ]
  ),
  itemCollection(
    'projects',
    { singular: 'Project', plural: 'Projects' },
    'rocket_launch',
    'Professional case studies and personal projects.',
    '{{title_en}}',
    [
      choiceField(
        'kind',
        { label: 'Kind', required: true, width: 'half' },
        kindChoices,
        'professional'
      ),
      choiceField('icon', { label: 'Icon', width: 'half' }, iconChoices, null),
      ...localizedFields('title', { label: 'Title' }, 'string'),
      stringField('company', { label: 'Company', width: 'half' }),
      ...localizedFields('role', { label: 'Role' }, 'string'),
      integerField('start_year', { label: 'Start year', width: 'half' }),
      integerField('end_year', { label: 'End year', note: 'Empty while ongoing', width: 'half' }),
      ...localizedFields('summary', { label: 'Summary' }, 'text'),
      ...localizedFields('case_study', { label: 'Case study' }, 'markdown'),
      slugListField('skill_slugs', { label: 'Skill slugs' }),
    ]
  ),
  itemCollection(
    'key_figures',
    { singular: 'Key figure', plural: 'Key figures' },
    'monitoring',
    'Figures highlighted on the stage.',
    '{{value}} {{label_en}}',
    [
      stringField('value', { label: 'Value', width: 'half' }),
      ...localizedFields('label', { label: 'Label' }, 'string'),
    ]
  ),
  itemCollection(
    'answers',
    { singular: 'Answer', plural: 'Answers' },
    'forum',
    'Interview answers used by the chat, with the facts and blocks that support them.',
    '{{topic_en}}',
    [
      ...localizedFields('topic', { label: 'Topic' }, 'string'),
      ...localizedFields(
        'sample_questions',
        { label: 'Sample questions', note: ONE_PER_LINE },
        'text'
      ),
      ...localizedFields('text', { label: 'Answer' }, 'text'),
      slugListField('experience_slugs', { label: 'Experience slugs', width: 'half' }),
      slugListField('project_slugs', { label: 'Project slugs', width: 'half' }),
      slugListField('skill_slugs', { label: 'Skill slugs', width: 'half' }),
      slugListField('key_figure_slugs', { label: 'Key figure slugs', width: 'half' }),
      jsonCodeField('blocks', { label: 'Blocks', note: BLOCKS_NOTE }),
      booleanField('starter', { label: 'Starter question', width: 'half' }, false),
    ]
  ),
  singletonCollection(
    'chat_settings',
    'Chat settings',
    'smart_toy',
    'Fallback replies, sensitive topics and suggested topics of the chat.',
    [
      ...localizedFields('unknown_reply', { label: 'Unknown question reply' }, 'text'),
      ...localizedFields('refusal_reply', { label: 'Refusal reply' }, 'text'),
      repeaterField('sensitive_topics', { label: 'Sensitive topics' }, '{{slug}}', [
        { field: 'slug', name: 'Slug', interface: 'input', width: 'full' },
        {
          field: 'keywords_en',
          name: 'Keywords (EN), one per line',
          interface: 'input-multiline',
          width: 'half',
        },
        {
          field: 'keywords_fr',
          name: 'Keywords (FR), one per line',
          interface: 'input-multiline',
          width: 'half',
        },
        { field: 'reply_en', name: 'Reply (EN)', interface: 'input-multiline', width: 'half' },
        { field: 'reply_fr', name: 'Reply (FR)', interface: 'input-multiline', width: 'half' },
      ]),
      ...localizedFields(
        'suggested_topics',
        { label: 'Suggested topics', note: ONE_PER_LINE },
        'text'
      ),
    ]
  ),
  singletonCollection(
    'site_settings',
    'Site settings',
    'tune',
    'Search engine title and description.',
    [
      ...localizedFields('title', { label: 'Title' }, 'string'),
      ...localizedFields('description', { label: 'Description' }, 'text'),
    ]
  ),
  {
    collection: 'publications',
    label: { singular: 'Publication', plural: 'Publications' },
    icon: 'history',
    note: 'Snapshots of the content. Prepare one from this list, review its changes, then Publish it. Publishing a superseded one rolls back.',
    singleton: false,
    hidden: false,
    sortField: null,
    displayTemplate: '{{status}} · {{date_created}}',
    fields: [
      uuidPrimaryKey(),
      choiceField(
        'status',
        { label: 'Status', required: true, readonly: true, width: 'half' },
        statusChoices,
        'prepared'
      ),
      timestampField('activated_at', { label: 'Activated on', readonly: true, width: 'half' }),
      markdownField('changes_overview', { label: 'Changes', readonly: true }),
      jsonCodeField('content', { label: 'Content', readonly: true }),
      jsonCodeField('changes', { label: 'Change details', readonly: true, hidden: true }),
      dateCreatedField(),
      userCreatedField(),
    ],
  },
];
