import { describe, expect, it } from 'vitest';

import { portfolioCollections } from './collections.ts';
import { portfolioRelations } from './relations.ts';

const collectionNames = new Set<string>(
  portfolioCollections.map((definition) => definition.collection)
);

function fieldsOf(collection: string): string[] {
  const definition = portfolioCollections.find((candidate) => candidate.collection === collection);
  if (definition === undefined) {
    throw new Error(`Collection ${collection} is not declared`);
  }
  return definition.fields.map((field) => field.field);
}

describe('portfolio collections', () => {
  it('stays within the 25 collections allowed by Directus Core', () => {
    expect(portfolioCollections.length).toBeLessThanOrEqual(25);
  });

  it('gives every collection an id primary key', () => {
    const withoutId = portfolioCollections.filter(
      (definition) =>
        !definition.fields.some(
          (field) => field.field === 'id' && field.schema?.is_primary_key === true
        )
    );

    expect(withoutId).toEqual([]);
  });

  it('pairs every English field with a French one', () => {
    const unpaired = portfolioCollections.flatMap((definition) => {
      const fields = new Set(definition.fields.map((field) => field.field));
      return [...fields]
        .filter((field) => field.endsWith('_en') || field.endsWith('_fr'))
        .filter((field) => !fields.has(`${field.slice(0, -3)}_${otherLanguage(field)}`))
        .map((field) => `${definition.collection}.${field}`);
    });

    expect(unpaired).toEqual([]);
  });

  it('gives every slugged item collection a unique slug', () => {
    const sluggedItemCollections = portfolioCollections.filter(
      (definition) =>
        !definition.singleton &&
        definition.collection !== 'publications' &&
        definition.collection !== 'model_provider_profiles' &&
        definition.collection !== 'chat_exchanges' &&
        definition.collection !== 'model_generations' &&
        definition.collection !== 'analytics_status' &&
        definition.collection !== 'chat_reviews' &&
        definition.collection !== 'contact_messages' &&
        definition.collection !== 'events' &&
        definition.collection !== 'visitor_salts' &&
        definition.collection !== 'search_console_rows' &&
        definition.collection !== 'daily_stats' &&
        definition.collection !== 'alerts'
    );
    const withoutUniqueSlug = sluggedItemCollections.filter(
      (definition) =>
        !definition.fields.some(
          (field) => field.field === 'slug' && field.schema?.is_unique === true
        )
    );

    expect(sluggedItemCollections.length).toBe(6);
    expect(withoutUniqueSlug).toEqual([]);
  });
});

describe('portfolio relations', () => {
  it('only links declared fields to declared or system collections', () => {
    const invalid = portfolioRelations.filter((relation) => {
      const sourceIsDeclared = fieldsOf(relation.collection).includes(relation.field);
      const target = relation.related_collection ?? '';
      const targetIsKnown = collectionNames.has(target) || target.startsWith('directus_');
      return !sourceIsDeclared || !targetIsKnown;
    });

    expect(invalid).toEqual([]);
  });
});

function otherLanguage(field: string): string {
  if (field.endsWith('_en')) {
    return 'fr';
  }
  return 'en';
}

it('defines nullable operational failures, correlated events, generation accounting and collector health', () => {
  expect(fieldsOf('chat_exchanges')).toEqual(
    expect.arrayContaining([
      'request_id',
      'journey_id',
      'response_text',
      'evidence_references',
      'validation_status',
      'provider_duration_ms',
      'validation_duration_ms',
      'analytics_version',
      'analytics_excluded',
      'received_at',
      'environment',
    ])
  );
  expect(fieldsOf('events')).toEqual(
    expect.arrayContaining([
      'request_id',
      'journey_id',
      'conversation_id',
      'occurred_at',
      'received_at',
      'source',
    ])
  );
  expect(fieldsOf('events')).not.toEqual(
    expect.arrayContaining(['model', 'provider_id', 'publication_id'])
  );
  expect(fieldsOf('model_generations')).toEqual(
    expect.arrayContaining(['exchange_id', 'status', 'input_tokens', 'cost_eur', 'provider_id'])
  );
  expect(fieldsOf('analytics_status')).toEqual(
    expect.arrayContaining([
      'component',
      'last_refresh_at',
      'last_success_at',
      'last_failure_at',
      'failed',
      'dropped',
      'pending',
    ])
  );
  const exchanges = portfolioCollections.find((item) => item.collection === 'chat_exchanges');
  expect(exchanges?.fields.find((field) => field.field === 'mode')?.schema?.is_nullable).toBe(true);
  expect(exchanges?.fields.find((field) => field.field === 'outcome')?.schema?.is_nullable).toBe(
    true
  );
});
