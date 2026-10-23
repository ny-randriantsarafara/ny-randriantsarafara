import type { DirectusField, NestedPartial } from '@directus/sdk';
import type { PortfolioSchema } from '@portfolio/cms-schema';

export type FieldDefinition = NestedPartial<DirectusField<PortfolioSchema>> & { field: string };

export type FieldLabel = {
  label: string;
  note?: string;
  required?: boolean;
  unique?: boolean;
  readonly?: boolean;
  hidden?: boolean;
  width?: 'half' | 'full';
};

export type Choice = { text: string; value: string };

export type RepeaterSubfield = {
  field: string;
  name: string;
  interface: 'input' | 'input-multiline';
  width: 'half' | 'full';
};

type LocalizedKind = 'string' | 'text' | 'markdown';

export function fieldMeta(options: FieldLabel) {
  return {
    translations: [{ language: 'en-US', translation: options.label }],
    note: options.note ?? null,
    required: options.required ?? false,
    readonly: options.readonly ?? false,
    hidden: options.hidden ?? false,
    width: options.width ?? 'full',
  };
}

function columnSchema(options: FieldLabel) {
  const required = options.required ?? false;
  return {
    is_nullable: !required,
    is_unique: options.unique ?? false,
  };
}

export function uuidPrimaryKey(): FieldDefinition {
  return {
    field: 'id',
    type: 'uuid',
    meta: { special: ['uuid'], interface: 'input', readonly: true, hidden: true },
    schema: { is_primary_key: true, is_nullable: false },
  };
}

export function integerPrimaryKey(): FieldDefinition {
  return {
    field: 'id',
    type: 'integer',
    meta: { interface: 'input', readonly: true, hidden: true },
    schema: { is_primary_key: true, has_auto_increment: true, is_nullable: false },
  };
}

export function sortField(): FieldDefinition {
  return {
    field: 'sort',
    type: 'integer',
    meta: { interface: 'input', hidden: true },
    schema: { is_nullable: true },
  };
}

export function slugField(): FieldDefinition {
  const options: FieldLabel = {
    label: 'Slug',
    note: 'Lowercase letters, digits and hyphens. Other items refer to this item by its slug.',
    required: true,
    unique: true,
    width: 'half',
  };
  return {
    field: 'slug',
    type: 'string',
    meta: { ...fieldMeta(options), interface: 'input', options: { slug: true, trim: true } },
    schema: columnSchema(options),
  };
}

export function stringField(field: string, options: FieldLabel): FieldDefinition {
  return {
    field,
    type: 'string',
    meta: { ...fieldMeta(options), interface: 'input' },
    schema: columnSchema(options),
  };
}

export function urlField(field: string, options: FieldLabel): FieldDefinition {
  return {
    field,
    type: 'text',
    meta: { ...fieldMeta(options), interface: 'input', options: { placeholder: 'https://' } },
    schema: columnSchema(options),
  };
}

export function textField(field: string, options: FieldLabel): FieldDefinition {
  return {
    field,
    type: 'text',
    meta: { ...fieldMeta(options), interface: 'input-multiline' },
    schema: columnSchema(options),
  };
}

export function markdownField(field: string, options: FieldLabel): FieldDefinition {
  return {
    field,
    type: 'text',
    meta: { ...fieldMeta(options), interface: 'input-rich-text-md' },
    schema: columnSchema(options),
  };
}

export function integerField(field: string, options: FieldLabel): FieldDefinition {
  return {
    field,
    type: 'integer',
    meta: { ...fieldMeta(options), interface: 'input' },
    schema: columnSchema(options),
  };
}

export function floatField(field: string, options: FieldLabel): FieldDefinition {
  return {
    field,
    type: 'float',
    meta: { ...fieldMeta(options), interface: 'input' },
    schema: columnSchema(options),
  };
}

export function booleanField(
  field: string,
  options: FieldLabel,
  defaultValue: boolean
): FieldDefinition {
  return {
    field,
    type: 'boolean',
    meta: { ...fieldMeta(options), interface: 'boolean', special: ['cast-boolean'] },
    schema: { ...columnSchema(options), is_nullable: false, default_value: defaultValue },
  };
}

export function choiceField(
  field: string,
  options: FieldLabel,
  choices: Choice[],
  defaultValue: string | null
): FieldDefinition {
  return {
    field,
    type: 'string',
    meta: {
      ...fieldMeta(options),
      interface: 'select-dropdown',
      options: { choices },
      display: 'labels',
      display_options: { choices },
    },
    schema: { ...columnSchema(options), default_value: defaultValue },
  };
}

export function imageField(field: string, options: FieldLabel): FieldDefinition {
  return {
    field,
    type: 'uuid',
    meta: { ...fieldMeta(options), special: ['file'], interface: 'file-image', display: 'image' },
    schema: columnSchema(options),
  };
}

export function timestampField(field: string, options: FieldLabel): FieldDefinition {
  return {
    field,
    type: 'timestamp',
    meta: { ...fieldMeta(options), interface: 'datetime', display: 'datetime' },
    schema: columnSchema(options),
  };
}

export function dateField(field: string, options: FieldLabel): FieldDefinition {
  return {
    field,
    type: 'date',
    meta: { ...fieldMeta(options), interface: 'datetime', display: 'datetime' },
    schema: columnSchema(options),
  };
}

export function slugListField(field: string, options: FieldLabel): FieldDefinition {
  return {
    field,
    type: 'json',
    meta: {
      ...fieldMeta(options),
      special: ['cast-json'],
      interface: 'tags',
      options: { whitespace: '-', capitalization: 'lowercase', alphabetize: false },
      display: 'labels',
    },
    schema: { is_nullable: true },
  };
}

export function jsonCodeField(field: string, options: FieldLabel): FieldDefinition {
  return {
    field,
    type: 'json',
    meta: {
      ...fieldMeta(options),
      special: ['cast-json'],
      interface: 'input-code',
      options: { language: 'JSON', lineNumber: true },
    },
    schema: { is_nullable: true },
  };
}

export function repeaterField(
  field: string,
  options: FieldLabel,
  template: string,
  subfields: RepeaterSubfield[]
): FieldDefinition {
  return {
    field,
    type: 'json',
    meta: {
      ...fieldMeta(options),
      special: ['cast-json'],
      interface: 'list',
      options: {
        template,
        fields: subfields.map((subfield) => ({
          field: subfield.field,
          name: subfield.name,
          type: 'text',
          meta: {
            field: subfield.field,
            type: 'text',
            interface: subfield.interface,
            width: subfield.width,
          },
        })),
      },
    },
    schema: { is_nullable: true },
  };
}

export function localizedFields(
  field: string,
  options: FieldLabel,
  kind: LocalizedKind
): FieldDefinition[] {
  const build = localizedBuilders[kind];
  return [
    build(`${field}_en`, { ...options, label: `${options.label} (EN)`, width: 'half' }),
    build(`${field}_fr`, { ...options, label: `${options.label} (FR)`, width: 'half' }),
  ];
}

const localizedBuilders: Record<
  LocalizedKind,
  (field: string, options: FieldLabel) => FieldDefinition
> = {
  string: stringField,
  text: textField,
  markdown: markdownField,
};

export function dateCreatedField(): FieldDefinition {
  return {
    field: 'date_created',
    type: 'timestamp',
    meta: {
      ...fieldMeta({ label: 'Created on', readonly: true, width: 'half' }),
      special: ['date-created'],
      interface: 'datetime',
      display: 'datetime',
    },
    schema: { is_nullable: true },
  };
}

export function dateUpdatedField(): FieldDefinition {
  return {
    field: 'date_updated',
    type: 'timestamp',
    meta: {
      ...fieldMeta({ label: 'Updated on', readonly: true, width: 'half' }),
      special: ['date-updated'],
      interface: 'datetime',
      display: 'datetime',
    },
    schema: { is_nullable: true },
  };
}

export function userCreatedField(): FieldDefinition {
  return {
    field: 'user_created',
    type: 'uuid',
    meta: {
      ...fieldMeta({ label: 'Created by', readonly: true, width: 'half' }),
      special: ['user-created'],
      interface: 'select-dropdown-m2o',
      options: { template: '{{first_name}}' },
      display: 'user',
    },
    schema: { is_nullable: true },
  };
}
