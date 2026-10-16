import type { PortfolioSchema } from '@portfolio/cms-schema';
import { iconNames } from '@portfolio/content';

import {
  booleanField,
  choiceField,
  dateCreatedField,
  dateUpdatedField,
  imageField,
  floatField,
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
  textField,
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

const localeChoices: Choice[] = [
  { text: 'English', value: 'en' },
  { text: 'French', value: 'fr' },
];

const chatModeChoices: Choice[] = [
  { text: 'Model', value: 'model' },
  { text: 'Scripted', value: 'scripted' },
];

const chatOutcomeChoices: Choice[] = [
  { text: 'Answered', value: 'answered' },
  { text: 'Unknown', value: 'unknown' },
  { text: 'Sensitive', value: 'sensitive' },
  { text: 'Refused', value: 'refused' },
  { text: 'Clarification required', value: 'clarification_required' },
  { text: 'Temporarily unavailable', value: 'temporarily_unavailable' },
];

const reasoningEffortChoices: Choice[] = [
  { text: 'None', value: 'none' },
  { text: 'Low', value: 'low' },
  { text: 'Medium', value: 'medium' },
  { text: 'High', value: 'high' },
];

const contactStatusChoices: Choice[] = [
  { text: 'New', value: 'new' },
  { text: 'Handled', value: 'handled' },
];

const eventTypeChoices: Choice[] = [
  { text: 'Page view', value: 'page_view' },
  { text: 'Quick view open', value: 'quick_view_open' },
  { text: 'Block view', value: 'block_view' },
  { text: 'Suggestion click', value: 'suggestion_click' },
  { text: 'CV download', value: 'cv_download' },
  { text: 'Contact click', value: 'contact_click' },
  { text: 'Contact submit', value: 'contact_submit' },
  { text: 'Locale switch', value: 'locale_switch' },
];

const deviceClassChoices: Choice[] = [
  { text: 'Mobile', value: 'mobile' },
  { text: 'Tablet', value: 'tablet' },
  { text: 'Desktop', value: 'desktop' },
];

const ONE_PER_LINE = 'One per line.';
const BLOCKS_NOTE =
  'JSON list of blocks shown with the answer. Types: timeline, experience, project, skills, key-figures, strengths, contact, cv. Example: [{"type":"project","slug":"visa-insight"}]';

function itemFields(): FieldDefinition[] {
  return [
    uuidPrimaryKey(),
    sortField(),
    slugField(),
    booleanField(
      'archived',
      {
        label: 'Archived',
        note: 'Retained in the CMS and excluded from future publications. Unarchive to restore.',
        width: 'half',
      },
      false
    ),
  ];
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
      stringField('start_month', {
        label: 'Start date',
        note: 'YYYY or YYYY-MM, matching the known precision',
        width: 'half',
      }),
      stringField('end_month', {
        label: 'End date',
        note: 'YYYY or YYYY-MM, empty while current',
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
      stringField('owner_experience_slug', {
        label: 'Owner experience slug',
        note: 'Experience whose summary or highlights state this value',
        width: 'half',
      }),
      stringField('owner_project_slug', {
        label: 'Owner project slug',
        note: 'Project whose summary or case study states this value',
        width: 'half',
      }),
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
  singletonCollection(
    'model_settings',
    'Chat model',
    'model_training',
    'Model behind the chat replies, applied within 30 seconds without a delivery. Leave the model empty to answer with scripted replies only.',
    [
      choiceField(
        'configuration_source',
        { label: 'Configuration actuelle' },
        [
          { text: 'Legacy', value: 'legacy' },
          { text: 'Saved profile', value: 'profile' },
          { text: 'Disabled', value: 'disabled' },
        ],
        'legacy'
      ),
      {
        field: 'active_profile',
        type: 'uuid',
        meta: {
          interface: 'select-dropdown-m2o',
          options: { template: '{{name}} · {{provider}} · {{model}}' },
        },
      },
      {
        ...integerField('max_input_bytes', { label: 'Maximum input bytes' }),
        schema: { default_value: 65536, is_nullable: false },
      },
      integerField('max_output_tokens', { label: 'Maximum output tokens' }),
      booleanField('response_cache_enabled', { label: 'Enable exact response cache' }, false),
      stringField('model', {
        label: 'Model',
        note: 'Identifier at the model provider, for example nvidia/nemotron-3-super-120b-a12b:free.',
      }),
      floatField('input_price_eur_per_million', {
        label: 'Input price (EUR per million tokens)',
        note: '0 for a free model.',
        width: 'half',
      }),
      floatField('output_price_eur_per_million', {
        label: 'Output price (EUR per million tokens)',
        note: '0 for a free model.',
        width: 'half',
      }),
      floatField('cache_read_price_eur_per_million', {
        label: 'Cache read price (EUR per million tokens)',
        note: 'Input tokens read from the prompt cache. Empty: the input price.',
        width: 'half',
      }),
      floatField('cache_write_price_eur_per_million', {
        label: 'Cache write price (EUR per million tokens)',
        note: 'Input tokens written to the prompt cache. Empty: the input price.',
        width: 'half',
      }),
      choiceField(
        'reasoning_effort',
        {
          label: 'Reasoning effort',
          note: "Hidden reasoning before each reply, billed as output. Empty: the model's default. An effort the model rejects makes replies scripted.",
          width: 'half',
        },
        reasoningEffortChoices,
        null
      ),
      integerField('timeout_ms', {
        label: 'Reply timeout (ms)',
        note: 'From 1000 to 10000: the site stops waiting after 12 seconds.',
        width: 'half',
      }),
    ]
  ),
  {
    collection: 'model_provider_profiles',
    label: { singular: 'Model provider profile', plural: 'Model provider profiles' },
    icon: 'model_training',
    note: 'Private saved configurations. Credentials remain on the server.',
    singleton: false,
    hidden: false,
    sortField: null,
    displayTemplate: '{{name}} · {{provider}} · {{model}}',
    fields: [
      uuidPrimaryKey(),
      stringField('name', { label: 'Name', required: true }),
      choiceField(
        'provider',
        { label: 'Provider', required: true },
        [
          { text: 'OpenRouter', value: 'openrouter' },
          { text: 'Google AI Studio', value: 'google-ai-studio' },
          { text: 'OpenAI', value: 'openai' },
        ],
        'openrouter'
      ),
      {
        ...integerField('max_input_bytes', { label: 'Maximum input bytes' }),
        schema: { default_value: 65536, is_nullable: false },
      },
      integerField('max_output_tokens', { label: 'Maximum output tokens' }),
      booleanField('response_cache_enabled', { label: 'Enable exact response cache' }, false),
      stringField('model', {
        label: 'Model',
        note: 'Identifier at the model provider, for example nvidia/nemotron-3-super-120b-a12b:free.',
      }),
      floatField('input_price_eur_per_million', {
        label: 'Input price (EUR per million tokens)',
        note: '0 for a free model.',
        width: 'half',
      }),
      floatField('output_price_eur_per_million', {
        label: 'Output price (EUR per million tokens)',
        note: '0 for a free model.',
        width: 'half',
      }),
      floatField('cache_read_price_eur_per_million', {
        label: 'Cache read price (EUR per million tokens)',
        note: 'Input tokens read from the prompt cache. Empty: the input price.',
        width: 'half',
      }),
      floatField('cache_write_price_eur_per_million', {
        label: 'Cache write price (EUR per million tokens)',
        note: 'Input tokens written to the prompt cache. Empty: the input price.',
        width: 'half',
      }),
      choiceField(
        'reasoning_effort',
        {
          label: 'Reasoning effort',
          note: "Hidden reasoning before each reply, billed as output. Empty: the model's default. An effort the model rejects makes replies scripted.",
          width: 'half',
        },
        reasoningEffortChoices,
        null
      ),
      integerField('timeout_ms', {
        label: 'Reply timeout (ms)',
        note: 'From 1000 to 10000: the site stops waiting after 12 seconds.',
        width: 'half',
      }),
    ],
  },
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
  {
    collection: 'chat_exchanges',
    label: { singular: 'Chat exchange', plural: 'Chat exchanges' },
    icon: 'forum',
    note: 'One row per answered visitor message, written by the API.',
    singleton: false,
    hidden: false,
    sortField: null,
    displayTemplate: '{{date_created}} · {{mode}} · {{outcome}}',
    fields: [
      uuidPrimaryKey(),
      dateCreatedField(),
      choiceField('locale', { label: 'Locale', width: 'half' }, localeChoices, null),
      stringField('conversation_id', { label: 'Conversation id', width: 'half' }),
      textField('question', { label: 'Question' }),
      choiceField(
        'mode',
        { label: 'Mode', required: true, width: 'half' },
        chatModeChoices,
        'scripted'
      ),
      choiceField(
        'outcome',
        { label: 'Outcome', required: true, width: 'half' },
        chatOutcomeChoices,
        'unknown'
      ),
      jsonCodeField('answer_slugs', { label: 'Answer slugs' }),
      jsonCodeField('blocks', { label: 'Blocks' }),
      integerField('latency_ms', { label: 'Latency (ms)', width: 'half' }),
      stringField('model', { label: 'Model', width: 'half' }),
      integerField('input_tokens', { label: 'Input tokens', width: 'half' }),
      integerField('output_tokens', { label: 'Output tokens', width: 'half' }),
      integerField('cache_read_tokens', { label: 'cache_read_tokens' }),
      integerField('cache_write_tokens', { label: 'cache_write_tokens' }),
      integerField('reasoning_tokens', { label: 'reasoning_tokens' }),
      integerField('input_bytes', { label: 'input_bytes' }),
      integerField('context_bytes', { label: 'context_bytes' }),
      stringField('provider_id', { label: 'provider_id' }),
      stringField('profile_id', { label: 'profile_id' }),
      stringField('configuration_fingerprint', { label: 'configuration_fingerprint' }),
      stringField('generation_id', { label: 'generation_id' }),
      stringField('served_model', { label: 'served_model' }),
      stringField('prompt_version', { label: 'prompt_version' }),
      choiceField(
        'delivery_source',
        { label: 'Delivery source' },
        [
          { text: 'Provider', value: 'provider' },
          { text: 'Cache', value: 'cache' },
          { text: 'Shared', value: 'shared' },
          { text: 'Scripted', value: 'scripted' },
        ],
        null
      ),
      stringField('coalesced_generation_id', { label: 'coalesced_generation_id' }),
      floatField('provider_cost_usd', { label: 'Provider cost (USD)' }),
      floatField('cost_eur', { label: 'Cost (EUR)', width: 'half' }),
      stringField('failure_reason', { label: 'Failure reason', width: 'half' }),
      stringField('publication_id', { label: 'Publication id', width: 'half' }),
    ],
  },
  {
    collection: 'contact_messages',
    label: { singular: 'Contact message', plural: 'Contact messages' },
    icon: 'mail',
    note: 'Visitor contact form submissions, written by the API.',
    singleton: false,
    hidden: false,
    sortField: null,
    displayTemplate: '{{date_created}} · {{name}} · {{status}}',
    fields: [
      uuidPrimaryKey(),
      dateCreatedField(),
      dateUpdatedField(),
      stringField('name', { label: 'Name', required: true, width: 'half' }),
      stringField('email', { label: 'Email', required: true, width: 'half' }),
      stringField('company', { label: 'Company', width: 'half' }),
      textField('message', { label: 'Message', required: true }),
      choiceField(
        'locale',
        { label: 'Locale', required: true, width: 'half' },
        localeChoices,
        'en'
      ),
      stringField('topic', { label: 'Topic', width: 'half' }),
      choiceField(
        'status',
        { label: 'Status', required: true, width: 'half' },
        contactStatusChoices,
        'new'
      ),
    ],
  },
  {
    collection: 'events',
    label: { singular: 'Event', plural: 'Events' },
    icon: 'analytics',
    note: 'Anonymous audience events from the site tracker, written by the API.',
    singleton: false,
    hidden: false,
    sortField: null,
    displayTemplate: '{{date_created}} · {{type}} · {{path}}',
    fields: [
      uuidPrimaryKey(),
      dateCreatedField(),
      choiceField('type', { label: 'Type', required: true, width: 'half' }, eventTypeChoices, null),
      stringField('path', { label: 'Path', required: true, width: 'half' }),
      choiceField('locale', { label: 'Locale', width: 'half' }, localeChoices, null),
      stringField('referrer_host', { label: 'Referrer host', width: 'half' }),
      stringField('utm_source', { label: 'UTM source', width: 'half' }),
      stringField('utm_medium', { label: 'UTM medium', width: 'half' }),
      stringField('utm_campaign', { label: 'UTM campaign', width: 'half' }),
      choiceField(
        'device_class',
        { label: 'Device class', required: true, width: 'half' },
        deviceClassChoices,
        'desktop'
      ),
      stringField('visitor_hash', { label: 'Visitor hash', required: true, width: 'half' }),
      jsonCodeField('payload', { label: 'Payload' }),
    ],
  },
  {
    collection: 'visitor_salts',
    label: { singular: 'Visitor salt', plural: 'Visitor salts' },
    icon: 'key',
    note: 'Daily random salt for visitor hashing (Europe/Paris day). Deleted after retention.',
    singleton: false,
    hidden: true,
    sortField: null,
    displayTemplate: '{{day}}',
    fields: [
      uuidPrimaryKey(),
      stringField('day', {
        label: 'Day',
        note: 'Europe/Paris calendar date (YYYY-MM-DD).',
        required: true,
        unique: true,
        width: 'half',
      }),
      stringField('salt', {
        label: 'Salt',
        note: '64 hex characters (32 random bytes).',
        required: true,
        width: 'half',
      }),
    ],
  },
  {
    collection: 'search_console_rows',
    label: { singular: 'Search Console row', plural: 'Search Console rows' },
    icon: 'search',
    note: 'Imported Search Console metrics, upserted by row_key.',
    singleton: false,
    hidden: false,
    sortField: null,
    displayTemplate: '{{date}} · {{query}}',
    fields: [
      uuidPrimaryKey(),
      stringField('row_key', { label: 'Row key', required: true, unique: true, hidden: true }),
      stringField('date', { label: 'Date', note: 'YYYY-MM-DD', width: 'half' }),
      stringField('query', { label: 'Query' }),
      stringField('page', { label: 'Page' }),
      stringField('country', { label: 'Country', width: 'half' }),
      stringField('device', { label: 'Device', width: 'half' }),
      integerField('clicks', { label: 'Clicks', width: 'half' }),
      integerField('impressions', { label: 'Impressions', width: 'half' }),
      floatField('ctr', { label: 'CTR', width: 'half' }),
      floatField('position', { label: 'Position', width: 'half' }),
    ],
  },
  {
    collection: 'daily_stats',
    label: { singular: 'Daily stats', plural: 'Daily stats' },
    icon: 'insights',
    note: 'One row per day of retained aggregates after raw event expiry.',
    singleton: false,
    hidden: false,
    sortField: null,
    displayTemplate: '{{day}}',
    fields: [
      uuidPrimaryKey(),
      stringField('day', { label: 'Day', required: true, unique: true, width: 'half' }),
      integerField('visitors', { label: 'Visitors', width: 'half' }),
      integerField('page_views', { label: 'Page views', width: 'half' }),
      integerField('conversations', { label: 'Conversations', width: 'half' }),
      integerField('model_exchanges', { label: 'Model exchanges', width: 'half' }),
      integerField('scripted_exchanges', { label: 'Scripted exchanges', width: 'half' }),
      integerField('outcome_answered', { label: 'Outcome: answered', width: 'half' }),
      integerField('outcome_unknown', { label: 'Outcome: unknown', width: 'half' }),
      integerField('outcome_sensitive', { label: 'Outcome: sensitive', width: 'half' }),
      integerField('outcome_refused', { label: 'Outcome: refused', width: 'half' }),
      integerField('contact_messages', { label: 'Contact messages', width: 'half' }),
      integerField('cv_downloads', { label: 'CV downloads', width: 'half' }),
      integerField('impressions', { label: 'Impressions', width: 'half' }),
      integerField('clicks', { label: 'Clicks', width: 'half' }),
      floatField('ctr', { label: 'CTR', width: 'half' }),
      floatField('average_position', { label: 'Average position', width: 'half' }),
      floatField('model_cost_eur', { label: 'Model cost (EUR)', width: 'half' }),
    ],
  },
  {
    collection: 'alerts',
    label: { singular: 'Alert', plural: 'Alerts' },
    icon: 'notifications',
    note: 'Sent operational alerts for deduplication (no personal data).',
    singleton: false,
    hidden: false,
    sortField: null,
    displayTemplate: '{{date_created}} · {{kind}}',
    fields: [
      uuidPrimaryKey(),
      dateCreatedField(),
      stringField('kind', { label: 'Kind', required: true, width: 'half' }),
      stringField('dedup_key', { label: 'Dedup key', required: true, unique: true, width: 'half' }),
      jsonCodeField('details', { label: 'Details' }),
    ],
  },
];
