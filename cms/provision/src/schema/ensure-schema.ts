import {
  createCollection,
  createField,
  createRelation,
  deleteField,
  updateField,
  readCollections,
  readFieldsByCollection,
  readRelations,
} from '@directus/sdk';

import type { AdminClient, Log } from '../directus-client.ts';
import type { CollectionDefinition } from './collections.ts';
import type { FieldDefinition } from './fields.ts';
import type { RelationDefinition } from './relations.ts';

export async function ensureSchema(
  client: AdminClient,
  collections: CollectionDefinition[],
  relations: RelationDefinition[],
  log: Log
): Promise<void> {
  const existingCollections = await client.request(readCollections());
  const existingCollectionNames = new Set(
    existingCollections.map((collection) => collection.collection)
  );
  for (const definition of collections) {
    await ensureCollection(
      client,
      definition,
      existingCollectionNames.has(definition.collection),
      log
    );
  }

  const existingRelations = await client.request(readRelations());
  const existingRelationKeys = new Set(
    existingRelations.map((relation) => relationKey(relation.collection, relation.field))
  );
  for (const definition of relations) {
    await ensureRelation(
      client,
      definition,
      existingRelationKeys.has(relationKey(definition.collection, definition.field)),
      log
    );
  }
}

async function ensureCollection(
  client: AdminClient,
  definition: CollectionDefinition,
  exists: boolean,
  log: Log
): Promise<void> {
  if (!exists) {
    await client.request(createCollection(toCollectionPayload(definition)));
    log(`Collection created: ${definition.collection}`);
    return;
  }
  await ensureMissingFields(client, definition, log);
  if (definition.collection === 'events') {
    await pruneRemovedEventFilterFields(client, definition, log);
  }
}

const removedEventFilterFields = ['model', 'provider_id', 'publication_id'] as const;

async function pruneRemovedEventFilterFields(
  client: AdminClient,
  definition: CollectionDefinition,
  log: Log
): Promise<void> {
  const declared = new Set(definition.fields.map((field) => field.field));
  const existingFields = await client.request(readFieldsByCollection('events'));
  for (const fieldName of removedEventFilterFields) {
    if (declared.has(fieldName)) {
      continue;
    }
    const exists = existingFields.some((field) => field.field === fieldName);
    if (!exists) {
      continue;
    }
    await client.request(deleteField('events', fieldName));
    log(`Field removed: events.${fieldName}`);
  }
}

async function ensureMissingFields(
  client: AdminClient,
  definition: CollectionDefinition,
  log: Log
): Promise<void> {
  const existingFields = await client.request(readFieldsByCollection(definition.collection));
  const existingFieldNames = new Set(existingFields.map((field) => field.field));
  // Only telemetry metadata owned by this migration is reconciled. Content customizations stay intact.
  for (const field of definition.fields) {
    if (
      !existingFieldNames.has(field.field) ||
      !ownsTelemetryField(definition.collection, field.field)
    )
      continue;
    const previous = existingFields.find((item) => item.field === field.field);
    const nullableFailure =
      definition.collection === 'chat_exchanges' && ['mode', 'outcome'].includes(field.field);
    const sameMeta = previous !== undefined && telemetryFieldMetaMatches(field.meta, previous.meta);
    if (sameMeta && (!nullableFailure || previous?.schema?.is_nullable === true)) continue;
    await client.request(
      updateField(definition.collection, field.field, {
        meta: field.meta,
        ...(nullableFailure ? { schema: { is_nullable: true } } : {}),
      })
    );
    log(`Telemetry field updated: ${definition.collection}.${field.field}`);
  }
  const missingFields = definition.fields.filter((field) => !existingFieldNames.has(field.field));
  for (const field of missingFields) {
    await client.request(createField(definition.collection, field));
    log(`Field created: ${definition.collection}.${field.field}`);
  }
}

async function ensureRelation(
  client: AdminClient,
  definition: RelationDefinition,
  exists: boolean,
  log: Log
): Promise<void> {
  if (exists) {
    return;
  }
  await client.request(createRelation(definition));
  log(`Relation created: ${definition.collection}.${definition.field}`);
}

function relationKey(collection: string, field: string): string {
  return `${collection}.${field}`;
}

function toCollectionPayload(definition: CollectionDefinition) {
  return {
    collection: definition.collection,
    meta: {
      icon: definition.icon,
      note: definition.note,
      singleton: definition.singleton,
      hidden: definition.hidden,
      sort_field: definition.sortField,
      display_template: definition.displayTemplate,
      accountability: 'all',
      translations: [
        {
          language: 'en-US',
          translation: definition.label.plural,
          singular: definition.label.singular,
          plural: definition.label.plural,
        },
      ],
    },
    schema: {},
    fields: definition.fields,
  };
}

function metaValueAt(meta: FieldDefinition['meta'], key: string): unknown {
  if (meta === undefined) return undefined;
  const values: Record<string, unknown> = { ...meta };
  return values[key];
}

function telemetryFieldMetaMatches(
  expected: FieldDefinition['meta'],
  previous: FieldDefinition['meta']
): boolean {
  if (expected === undefined) return true;
  return Object.entries({ ...expected }).every(
    ([key, value]) => JSON.stringify(metaValueAt(previous, key)) === JSON.stringify(value)
  );
}

function ownsTelemetryField(collection: string, field: string): boolean {
  if (collection === 'model_generations' || collection === 'analytics_status')
    return field !== 'id';
  const common = ['received_at', 'analytics_version', 'environment', 'request_id', 'journey_id'];
  if (collection === 'events')
    return [...common, 'occurred_at', 'source', 'conversation_id', 'type'].includes(field);
  if (collection !== 'chat_exchanges') return false;
  return [
    ...common,
    'mode',
    'outcome',
    'response_text',
    'http_status',
    'visitor_hash',
    'device_class',
    'provider_duration_ms',
    'validation_duration_ms',
    'validation_status',
    'evidence_references',
    'analytics_excluded',
    'cache_read_tokens',
    'cache_write_tokens',
    'reasoning_tokens',
    'input_bytes',
    'context_bytes',
    'provider_id',
    'profile_id',
    'configuration_fingerprint',
    'generation_id',
    'served_model',
    'prompt_version',
    'coalesced_generation_id',
  ].includes(field);
}
