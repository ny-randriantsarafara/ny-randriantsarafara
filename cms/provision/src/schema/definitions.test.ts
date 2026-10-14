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
        definition.collection !== 'chat_exchanges' &&
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
